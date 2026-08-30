import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { parseFinanceDashboard, parsePaymentLedger } from "../models/finance";

export async function getOwnerFinanceDashboard(
  supabase: SupabaseClient<Database>,
  propertyId: string,
  from: string,
  to: string,
) {
  const { data, error } = await supabase.rpc("get_owner_finance_dashboard", {
    p_property_id: propertyId,
    p_from: from,
    p_to: to,
  });
  if (error) throw new Error(error.message);
  return parseFinanceDashboard(data);
}

export async function listPropertyPayments(
  supabase: SupabaseClient<Database>,
  args: {
    propertyId: string;
    from: string;
    to: string;
    query?: string;
    method?: string;
    status?: string;
    limit?: number;
    offset?: number;
  },
) {
  const { data, error } = await supabase.rpc("list_property_payments", {
    p_property_id: args.propertyId,
    p_from: args.from,
    p_to: args.to,
    p_status: args.status || null,
    p_search: args.query || null,
    p_method: args.method || null,
    p_limit: args.limit ?? 50,
    p_offset: args.offset ?? 0,
  });
  if (error) throw new Error(error.message);
  return parsePaymentLedger(data);
}
