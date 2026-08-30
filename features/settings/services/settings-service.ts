import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

import {
  parseUserProfile,
  type ProfileUpdateInput,
  type UserProfile,
} from "../models/user-profile";

type RpcError = { message: string } | null;
type RpcResult = { data: unknown; error: RpcError };
type SettingsRpc = (
  name: "get_my_profile" | "update_my_profile",
  args?: Record<string, string | null>,
) => Promise<RpcResult>;

function settingsRpc(supabase: SupabaseClient<Database>) {
  return supabase.rpc.bind(supabase) as unknown as SettingsRpc;
}

export async function getMyProfile(
  supabase: SupabaseClient<Database>,
): Promise<UserProfile> {
  const { data, error } = await settingsRpc(supabase)("get_my_profile");
  if (error) throw new Error(error.message);
  return parseUserProfile(data);
}

export async function updateMyProfile(
  supabase: SupabaseClient<Database>,
  input: ProfileUpdateInput,
): Promise<UserProfile> {
  const { data, error } = await settingsRpc(supabase)("update_my_profile", {
    p_display_name: input.displayName.trim(),
    p_phone: input.phone.trim() || null,
    p_bio: input.bio.trim() || null,
  });
  if (error) throw new Error(error.message);
  return parseUserProfile(data);
}
