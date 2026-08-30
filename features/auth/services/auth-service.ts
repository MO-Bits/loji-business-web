import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

function callbackUrl(): string {
  return `${window.location.origin}/auth/callback`;
}

function passwordRecoveryUrl(): string {
  const callback = new URL(callbackUrl());
  callback.searchParams.set("next", "/auth/reset-password");
  return callback.toString();
}

export async function signInWithGoogle(
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl(),
    },
  });

  if (error) {
    throw error;
  }
}

export async function signInWithFacebook(
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "facebook",
    options: {
      redirectTo: callbackUrl(),
      scopes: "email,public_profile",
    },
  });

  if (error) {
    throw error;
  }
}

export async function signInWithEmail(
  supabase: SupabaseClient<Database>,
  email: string,
): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: callbackUrl(),
    },
  });

  if (error) {
    throw error;
  }
}

export async function signInWithPassword(
  supabase: SupabaseClient<Database>,
  email: string,
  password: string,
): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    throw error;
  }
}

export async function requestPasswordReset(
  supabase: SupabaseClient<Database>,
  email: string,
): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo: passwordRecoveryUrl() },
  );

  if (error) {
    throw error;
  }
}

export async function signOut(
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
