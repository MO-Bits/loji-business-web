"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import type { GuestWorkspace } from "../models/guest";
import { getGuestWorkspace } from "../services/guest-service";

type GuestWorkspaceState = {
  key: string;
  workspace: GuestWorkspace | null;
  loading: boolean;
  error: Error | null;
};

export function useGuestWorkspace(propertyId?: string, guestId?: string) {
  const client = useMemo(() => createClient(), []);
  const requestId = useRef(0);
  const requestKey = propertyId && guestId ? `${propertyId}:${guestId}` : "";
  const [state, setState] = useState<GuestWorkspaceState>({
    key: "",
    workspace: null,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    if (!propertyId || !guestId) {
      requestId.current += 1;
      setState({
        key: "",
        workspace: null,
        error: new Error("The requested guest could not be opened."),
        loading: false,
      });
      return;
    }

    const key = `${propertyId}:${guestId}`;
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setState((current) => ({
      key,
      workspace:
        current.key === key &&
        current.workspace?.propertyId === propertyId &&
        current.workspace.guest.id === guestId
          ? current.workspace
          : null,
      error: null,
      loading: true,
    }));

    try {
      const result = await getGuestWorkspace(client, propertyId, guestId);
      if (requestId.current !== currentRequest) return;
      setState({ key, workspace: result, error: null, loading: false });
    } catch (cause) {
      if (requestId.current !== currentRequest) return;
      setState({
        key,
        workspace: null,
        error:
          cause instanceof Error
            ? cause
            : new Error("Unable to load this guest workspace."),
        loading: false,
      });
    }
  }, [client, guestId, propertyId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => {
      window.clearTimeout(timer);
      requestId.current += 1;
    };
  }, [refresh]);

  const currentState = state.key === requestKey
    ? state
    : { key: requestKey, workspace: null, error: null, loading: true };
  const currentWorkspace =
    currentState.workspace &&
    currentState.workspace.propertyId === propertyId &&
    currentState.workspace.guest.id === guestId
      ? currentState.workspace
      : null;

  return {
    workspace: currentWorkspace,
    loading: currentState.loading,
    error: currentState.error,
    refresh,
  };
}
