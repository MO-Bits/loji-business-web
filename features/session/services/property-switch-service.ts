import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";
import type { Membership } from "../models/app-session";

export const ACTIVE_PROPERTY_STORAGE_KEY = "loji.activePropertyId";

export function readPreferredPropertyId() {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem(ACTIVE_PROPERTY_STORAGE_KEY) ?? undefined;
}

export function savePreferredPropertyId(propertyId: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ACTIVE_PROPERTY_STORAGE_KEY, propertyId);
  }
}

export async function loadPropertyForMembership(
  supabase: SupabaseClient<Database>,
  membership: Membership,
) {
  const propertyId = membership.property_id;
  if (!propertyId) return null;

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}
