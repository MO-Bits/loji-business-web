import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";
import { checkInBooking } from "@/features/bookings/services/booking-service";
import { parseOperationsBoard, type OperationsBoard } from "../models/operations";

type JsonRpc = (
  name: string,
  args?: Record<string, unknown>,
) => PromiseLike<{ data: Json; error: { message: string } | null }>;

export async function getPropertyOperationsBoard(
  client: SupabaseClient<Database>,
  propertyId: string,
): Promise<OperationsBoard> {
  const call = client.rpc.bind(client) as unknown as JsonRpc;
  const { data, error } = await call("get_front_desk_workspace", {
    p_property_id: propertyId,
  });
  if (error) throw new Error(error.message);
  return parseOperationsBoard(data, propertyId);
}

export async function checkInOperation(
  client: SupabaseClient<Database>,
  bookingId: string,
) {
  return checkInBooking(client, bookingId);
}
