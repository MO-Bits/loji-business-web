"use client";

import { useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import {
  signInWithEmail,
  signInWithGoogle,
  signOut,
} from "../services/auth-service";

type AsyncAction = () => Promise<void>;

export function useAuthController() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: AsyncAction): Promise<string | null> {
    setLoading(true);
    setError(null);

    try {
      await action();
      return null;
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong.";

      setError(message);
      return message;
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    error,
    clearError: () => setError(null),
    signInWithGoogle: () => run(() => signInWithGoogle(supabase)),
    signInWithEmail: (email: string) =>
      run(() => signInWithEmail(supabase, email)),
    signOut: () => run(() => signOut(supabase)),
  };
}
