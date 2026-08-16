"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import type { AppSession } from "../models/app-session";
import { evaluateAppSession } from "../services/app-session-service";

type AppSessionState = {
  session: AppSession | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
};

export function useAppSession(): AppSessionState {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<AppSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextSession = await evaluateAppSession(supabase);
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
  }, [supabase]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => {
      void refresh();
    }, 0);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      // Run after the auth callback finishes to avoid making another Supabase
      // request while the auth client is still processing the event.
      window.setTimeout(() => {
        void refresh();
      }, 0);
    });

    return () => {
      window.clearTimeout(initialRefresh);
      subscription.unsubscribe();
    };
  }, [refresh, supabase]);

  return { session, loading, error, refresh };
}
