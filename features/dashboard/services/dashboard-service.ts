import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { parseHomeDashboard, type HomeDashboard } from "../models/dashboard";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function getHomeDashboard(
  supabase: SupabaseClient<Database>,
  propertyId: string,
): Promise<HomeDashboard> {
  const { data, error } = await supabase.rpc("get_property_dashboard", {
    p_property_id: propertyId,
  });
  if (error) throw new Error(error.message);
  if (!isObject(data)) {
    throw new Error("The dashboard returned an invalid response.");
  }
  const dashboard = parseHomeDashboard(data);
  if (!dashboard.propertyId || dashboard.propertyId !== propertyId) {
    throw new Error("The dashboard returned the wrong property context.");
  }
  if (Number.isNaN(dashboard.businessDate.getTime())) {
    throw new Error("The dashboard returned an invalid business date.");
  }
  return dashboard;
}
