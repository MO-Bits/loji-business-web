"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  requestPasswordReset,
  signInWithEmail,
  signInWithFacebook,
  signInWithGoogle,
  signInWithPassword,
  signOut,
} from "../services/auth-service";

type AsyncAction = () => Promise<void>;
export type AuthAction =
  | "google"
  | "facebook"
  | "email"
  | "password"
  | "passwordReset"
  | "signOut";

export function useAuthController() {
  const supabase = useMemo(() => createClient(), []);
  const [activeAction, setActiveAction] = useState<AuthAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(
    actionName: AuthAction,
    action: AsyncAction,
  ): Promise<string | null> {
    setActiveAction(actionName);
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
      setActiveAction(null);
    }
  }

  return {
    activeAction,
    loading: activeAction !== null,
    error,
    clearError: () => setError(null),
    signInWithGoogle: () => run("google", () => signInWithGoogle(supabase)),
    signInWithFacebook: () =>
      run("facebook", () => signInWithFacebook(supabase)),
    signInWithEmail: (email: string) =>
      run("email", () => signInWithEmail(supabase, email)),
    signInWithPassword: (email: string, password: string) =>
      run("password", () => signInWithPassword(supabase, email, password)),
    requestPasswordReset: (email: string) =>
      run("passwordReset", () => requestPasswordReset(supabase, email)),
    signOut: () => run("signOut", () => signOut(supabase)),
  };
}
