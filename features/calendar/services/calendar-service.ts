import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { parsePropertyCalendar } from "../models/calendar";

export async function getPropertyCalendar(
  supabase: SupabaseClient<Database>,
  propertyId: string,
  from: string,
  to: string,
) {
  const { data, error } = await supabase.rpc("get_property_calendar", {
    p_property_id: propertyId,
    p_from: from,
    p_to: to,
  });

  if (error) throw new Error(error.message);
  return parsePropertyCalendar(data);
}
