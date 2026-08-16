"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { HomeDashboard } from "../models/dashboard";
import { getHomeDashboard } from "../services/dashboard-service";

export function useHomeDashboard(propertyId?: string) {
  const supabase = useMemo(() => createClient(), []);
  const [dashboard, setDashboard] = useState<HomeDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!propertyId) {
      setError(new Error("No property is selected."));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setDashboard(await getHomeDashboard(supabase, propertyId));
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error("Unable to load dashboard data."));
    } finally {
      setLoading(false);
    }
  }, [propertyId, supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  return { dashboard, loading, error, refresh };
}
