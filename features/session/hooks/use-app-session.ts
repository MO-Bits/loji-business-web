"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

import type { AppSession } from "../models/app-session";
import { AppStatus } from "../models/app-status";
import { evaluateAppSession } from "../services/app-session-service";
import {
  loadPropertyForMembership,
  readPreferredPropertyId,
  savePreferredPropertyId,
} from "../services/property-switch-service";

export type AppSessionState = {
  session: AppSession | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  switchProperty: (propertyId: string) => Promise<void>;
};

export const AppSessionContext = createContext<AppSessionState | null>(null);

export function useAppSessionProviderValue(): AppSessionState {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<AppSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const requestId = useRef(0);

  const applyPreferredProperty = useCallback((nextSession: AppSession) => {
    if (nextSession.status !== AppStatus.Ready) return nextSession;
    const preferredId = readPreferredPropertyId();
    if (!preferredId || preferredId === nextSession.activePropertyId) return nextSession;

    const membership = nextSession.memberships.find(
      (item) => item.property_id === preferredId,
    );
    if (!membership) return nextSession;

    const property = loadPropertyForMembership(membership);
    return {
      ...nextSession,
      activePropertyId: preferredId,
      activeRole: membership.role ?? nextSession.activeRole,
      property,
    };
  }, []);

  const refreshSession = useCallback(async (silent: boolean) => {
    const currentRequest = ++requestId.current;
    if (!silent) setLoading(true);
    setError(null);

    try {
      const evaluated = await evaluateAppSession(supabase);
      const nextSession = applyPreferredProperty(evaluated);
      if (currentRequest === requestId.current) setSession(nextSession);
    } catch (caughtError) {
      if (currentRequest !== requestId.current) return;
      setError(
        caughtError instanceof Error
          ? caughtError
          : new Error("Unable to load the application session."),
      );
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [applyPreferredProperty, supabase]);

  const refresh = useCallback(
    () => refreshSession(false),
    [refreshSession],
  );

  const switchProperty = useCallback(async (propertyId: string) => {
    if (!session || propertyId === session.activePropertyId) return;
    const membership = session.memberships.find(
      (item) => item.property_id === propertyId,
    );
    if (!membership) throw new Error("You do not have access to this property.");

    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const property = loadPropertyForMembership(membership);
      if (currentRequest !== requestId.current) return;
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
      if (currentRequest === requestId.current) setError(nextError);
      throw nextError;
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    let queuedRefresh: number | null = null;
    const scheduleRefresh = (silent: boolean) => {
      if (queuedRefresh !== null) window.clearTimeout(queuedRefresh);
      queuedRefresh = window.setTimeout(() => {
        queuedRefresh = null;
        void refreshSession(silent);
      }, 0);
    };

    scheduleRefresh(false);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "INITIAL_SESSION") scheduleRefresh(false);
    });

    const handlePropertyChange = () => scheduleRefresh(true);
    const handleFocus = () => scheduleRefresh(true);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") scheduleRefresh(true);
    };

    window.addEventListener("loji:property-change", handlePropertyChange);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      requestId.current += 1;
      if (queuedRefresh !== null) window.clearTimeout(queuedRefresh);
      window.removeEventListener("loji:property-change", handlePropertyChange);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      subscription.unsubscribe();
    };
  }, [refreshSession, supabase]);

  const value = useMemo<AppSessionState>(
    () => ({ session, loading, error, refresh, switchProperty }),
    [error, loading, refresh, session, switchProperty],
  );

  return value;
}

export function useAppSession(): AppSessionState {
  const value = useContext(AppSessionContext);
  if (!value) {
    throw new Error("useAppSession must be used inside AppSessionProvider.");
  }
  return value;
}
