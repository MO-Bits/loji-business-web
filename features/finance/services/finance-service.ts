import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { parseFinanceDashboard, parsePaymentLedger } from "../models/finance";

export async function getPropertyFinanceDashboard(
  supabase: SupabaseClient<Database>,
  propertyId: string,
  from: string,
  to: string,
) {
  const { data, error } = await supabase.rpc("get_property_finance_dashboard", {
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
  const { data, error } = await supabase.rpc("list_property_finance_entries", {
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

export type PaymentReversalAction = "refund" | "void";

export async function reverseBookingPayment(
  supabase: SupabaseClient<Database>,
  args: {
    propertyId: string;
    paymentId: string;
    action: PaymentReversalAction;
    reason: string;
    idempotencyKey: string;
  },
) {
  const { data, error } = await supabase.rpc("reverse_booking_payment", {
    p_property_id: args.propertyId,
    p_payment_id: args.paymentId,
    p_action: args.action,
    p_reason: args.reason.trim(),
    p_idempotency_key: args.idempotencyKey,
  });
  if (error) throw new Error(error.message);
  return data;
}
