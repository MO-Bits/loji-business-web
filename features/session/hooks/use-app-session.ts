"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import type { AppSession } from "../models/app-session";
import { evaluateAppSession } from "../services/app-session-service";
import {
  loadPropertyForMembership,
  readPreferredPropertyId,
  savePreferredPropertyId,
} from "../services/property-switch-service";

type AppSessionState = {
  session: AppSession | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  switchProperty: (propertyId: string) => Promise<void>;
};

export function useAppSession(): AppSessionState {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<AppSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const applyPreferredProperty = useCallback(async (nextSession: AppSession) => {
    const preferredId = readPreferredPropertyId();
    if (!preferredId || preferredId === nextSession.activePropertyId) return nextSession;

    const membership = nextSession.memberships.find(
      (item) => item.property_id === preferredId,
    );
    if (!membership) return nextSession;

    const property = await loadPropertyForMembership(supabase, membership);
    return {
      ...nextSession,
      activePropertyId: preferredId,
      activeRole: membership.role ?? nextSession.activeRole,
      property,
    };
  }, [supabase]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const evaluated = await evaluateAppSession(supabase);
      const nextSession = await applyPreferredProperty(evaluated);
      setSession(nextSession);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError
          : new Error("Unable to load the application session."),
      );
    } finally {
      setLoading(false);
    }
  }, [applyPreferredProperty, supabase]);

  const switchProperty = useCallback(async (propertyId: string) => {
    if (!session || propertyId === session.activePropertyId) return;
    const membership = session.memberships.find(
      (item) => item.property_id === propertyId,
    );
    if (!membership) throw new Error("You do not have access to this property.");

    setLoading(true);
    setError(null);
    try {
      const property = await loadPropertyForMembership(supabase, membership);
      savePreferredPropertyId(propertyId);
      setSession({
        ...session,
        activePropertyId: propertyId,
        activeRole: membership.role ?? session.activeRole,
        property,
      });
    } catch (caughtError) {
      const nextError = caughtError instanceof Error
        ? caughtError
        : new Error("Unable to switch property.");
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, [session, supabase]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => {
      void refresh();
    }, 0);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => {
        void refresh();
      }, 0);
    });

    const handlePropertyChange = () => void refresh();
    window.addEventListener("loji:property-change", handlePropertyChange);

    return () => {
      window.removeEventListener("loji:property-change", handlePropertyChange);
      window.clearTimeout(initialRefresh);
      subscription.unsubscribe();
    };
  }, [refresh, supabase]);

  return { session, loading, error, refresh, switchProperty };
}
