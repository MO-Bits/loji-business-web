"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { createClient } from "@/lib/supabase/client";
import type { PropertySettingsWorkspace } from "../models/property-settings";
import { getPropertySettings } from "../services/property-settings-service";

export function usePropertySettings() {
  const { t } = useLanguage();
  const { session, loading: sessionLoading } = useAppSession();
  const client = useMemo(() => createClient(), []);
  const requestId = useRef(0);
  const [workspaceState, setWorkspace] = useState<PropertySettingsWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<{ propertyId?: string; message: string } | null>(null);
  const propertyId = session?.activePropertyId;
  const workspace = workspaceState && workspaceState.property.id === propertyId ? workspaceState : null;
  const error = errorState && errorState.propertyId === propertyId ? errorState.message : null;
  const propertyIsChanging = Boolean(workspaceState && workspaceState.property.id !== propertyId);

  const refresh = useCallback(async (silent = false) => {
    if (!propertyId) {
      requestId.current += 1;
      setWorkspace(null);
      setErrorState({ message: t("No active property was found.", "Hakuna biashara iliyochaguliwa.") });
      setLoading(false);
      return;
    }
    const requestPropertyId = propertyId;
    const current = ++requestId.current;
    if (!silent) setLoading(true);
    setErrorState(null);
    setWorkspace((existing) => existing?.property.id === requestPropertyId ? existing : null);
    try {
      const next = await getPropertySettings(client, requestPropertyId);
      if (current === requestId.current) setWorkspace(next);
    } catch (cause) {
      if (current === requestId.current) {
        setErrorState({
          propertyId: requestPropertyId,
          message: cause instanceof Error ? cause.message : t("Unable to load property settings.", "Imeshindikana kupakia mipangilio ya biashara."),
        });
      }
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [client, propertyId, t]);

  useEffect(() => {
    if (sessionLoading) return;
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => {
      window.clearTimeout(timer);
      requestId.current += 1;
    };
  }, [refresh, sessionLoading]);

  return {
    client,
    error,
    loading: loading || sessionLoading || propertyIsChanging,
    propertyId,
    refresh,
    setWorkspace,
    workspace,
  };
}
