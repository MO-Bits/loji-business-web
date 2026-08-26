import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

function callbackUrl(): string {
  return `${window.location.origin}/auth/callback`;
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

export async function signOut(
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
