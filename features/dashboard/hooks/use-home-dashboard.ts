"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { HomeDashboard } from "../models/dashboard";
import { getHomeDashboard } from "../services/dashboard-service";

export function useHomeDashboard(propertyId?: string) {
  const supabase = useMemo(() => createClient(), []);
  const requestId = useRef(0);
  const [dashboard, setDashboard] = useState<HomeDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!propertyId) {
      setDashboard(null);
      setError(new Error("No property is selected."));
      setLoading(false);
      return;
    }
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setLoading(true);
    setError(null);
    try {
      const result = await getHomeDashboard(supabase, propertyId);
      if (requestId.current === currentRequest) setDashboard(result);
    } catch (cause) {
      if (requestId.current !== currentRequest) return;
      setError(cause instanceof Error ? cause : new Error("Unable to load dashboard data."));
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  }, [propertyId, supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => {
      window.clearTimeout(timer);
      requestId.current += 1;
    };
  }, [refresh]);

  const propertyMismatch = Boolean(
    dashboard && propertyId && dashboard.propertyId !== propertyId,
  );

  return {
    dashboard: propertyMismatch ? null : dashboard,
    loading: loading || propertyMismatch,
    error: propertyMismatch ? null : error,
    refresh,
  };
}
