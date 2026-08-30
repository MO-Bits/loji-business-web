import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";
import { parseAvailableRoom, parseBooking, type AvailableRoom, type Booking } from "../models/booking";

const dateOnly = (value: Date | string) => (typeof value === "string" ? value : value.toISOString()).slice(0, 10);
const object = (value: Json): Record<string, Json | undefined> => value && typeof value === "object" && !Array.isArray(value) ? value : {};

export async function getBookings(client: SupabaseClient<Database>, propertyId: string): Promise<Booking[]> {
  const { data, error } = await client.from("bookings_with_details").select("*").eq("property_id", propertyId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message); return (data ?? []).map(parseBooking);
}
export async function getBooking(client: SupabaseClient<Database>, propertyId: string, id: string): Promise<Booking | null> {
  const { data, error } = await client.from("bookings_with_details").select("*").eq("property_id", propertyId).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message); return data ? parseBooking(data) : null;
}
export async function getAvailableRooms(client: SupabaseClient<Database>, propertyId: string, checkIn: string, checkOut: string, guests: number): Promise<AvailableRoom[]> {
  const { data, error } = await client.rpc("get_walkin_available_rooms", { p_property_id: propertyId, p_check_in: checkIn, p_check_out: checkOut, p_guests: guests });
  if (error) throw new Error(error.message); return Array.isArray(data) ? data.map((item) => parseAvailableRoom(object(item))) : [];
}
export type CreateBookingInput = { roomId: string; firstName: string; lastName: string; gender: string; nationality: string; occupation: string; email: string; phone: string; whereFrom?: string; whereTo?: string; idType?: string; idNumber?: string; emergencyContactName?: string; emergencyContactPhone?: string; checkIn: string; checkOut: string; totalPrice: number; adults: number; children: number; specialRequests?: string; paymentMethod: string; transactionRef?: string };
export async function createWalkInBooking(client: SupabaseClient<Database>, propertyId: string, input: CreateBookingInput) {
  const { data, error } = await client.rpc("create_walkin_booking", { p_property_id: propertyId, p_room_id: input.roomId, p_first_name: input.firstName, p_last_name: input.lastName, p_gender: input.gender, p_nationality: input.nationality, p_occupation: input.occupation, p_email: input.email, p_phone: input.phone, p_where_from: input.whereFrom || null, p_where_to: input.whereTo || null, p_id_type: input.idType || null, p_id_number: input.idNumber || null, p_emergency_contact_name: input.emergencyContactName || null, p_emergency_contact_phone: input.emergencyContactPhone || null, p_check_in: dateOnly(input.checkIn), p_check_out: dateOnly(input.checkOut), p_adults: input.adults, p_children: input.children, p_total_price: input.totalPrice, p_special_requests: input.specialRequests || null, p_payment_method: input.paymentMethod, p_transaction_ref: input.transactionRef || null });
  if (error) throw new Error(error.message); const result = object(data); if (result.success !== true) throw new Error(String(result.message ?? "Booking failed.")); return result;
}
export async function checkInBooking(client: SupabaseClient<Database>, id: string) { const { data, error } = await client.rpc("check_in_booking", { p_booking_id: id }); if (error) throw new Error(error.message); const result = object(data); if (result.success !== true) throw new Error(String(result.message ?? "Unable to check in guest.")); return result; }
export async function checkoutBooking(client: SupabaseClient<Database>, id: string, allowBalance = false) {
  const { data, error } = await client.rpc("checkout_booking", { p_booking_id: id, p_allow_balance: allowBalance });
  if (error) throw new Error(error.message);
  const result = object(data);
  if (result.success !== true) throw new Error(String(result.message ?? "Unable to check out guest."));
  return result;
}
