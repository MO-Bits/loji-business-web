import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

import { parsePropertyReport } from "../models/report";

export async function getPropertyReport(
  supabase: SupabaseClient<Database>,
  propertyId: string,
  from: string,
  to: string,
) {
  const { data, error } = await supabase.rpc("get_property_reports", {
    p_property_id: propertyId,
    p_from: from,
    p_to: to,
  });

  if (error) throw new Error(error.message);
  return parsePropertyReport(data);
}
