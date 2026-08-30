"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import type { GuestDirectory, GuestStayFilter } from "../models/guest";
import { listPropertyGuests } from "../services/guest-service";

type PropertyGuestsOptions = {
  propertyId?: string;
  query: string;
  page: number;
  pageSize: number;
  stayFilter: GuestStayFilter;
};

export function usePropertyGuests({
  propertyId,
  query,
  page,
  pageSize,
  stayFilter,
}: PropertyGuestsOptions) {
  const client = useMemo(() => createClient(), []);
  const requestId = useRef(0);
  const [directory, setDirectory] = useState<GuestDirectory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!propertyId) {
      setDirectory(null);
      setError(new Error("Select an active property to view guests."));
      setLoading(false);
      return;
    }

    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setLoading(true);
    setError(null);
    setDirectory((current) => current?.propertyId === propertyId ? current : null);

    try {
      const result = await listPropertyGuests(client, {
        propertyId,
        query,
        page,
        pageSize,
        stayFilter,
      });
      if (requestId.current === currentRequest) setDirectory(result);
    } catch (cause) {
      if (requestId.current !== currentRequest) return;
      setError(
        cause instanceof Error
          ? cause
          : new Error("Unable to load the guest directory."),
      );
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  }, [client, page, pageSize, propertyId, query, stayFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => {
      window.clearTimeout(timer);
      requestId.current += 1;
    };
  }, [refresh]);

  const propertyMismatch = Boolean(
    directory && directory.propertyId !== propertyId,
  );

  return {
    directory: propertyMismatch ? null : directory,
    loading: loading || propertyMismatch,
    error: propertyMismatch ? null : error,
    refresh,
  };
}
