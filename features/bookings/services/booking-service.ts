import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";
import {
  parseAvailableRoom,
  parseBookingList,
  parseBookingWorkspace,
  type AvailableRoom,
  type BookingListResult,
  type BookingWorkspace,
} from "../models/booking";

type RpcError = { message: string } | null;
type RpcResponse = { data: Json; error: RpcError };
type JsonRpc = (
  name: string,
  args?: Record<string, unknown>,
) => PromiseLike<RpcResponse>;

const object = (value: Json | undefined): Record<string, Json | undefined> =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

async function callJsonRpc(
  client: SupabaseClient<Database>,
  name: string,
  args: Record<string, unknown>,
) {
  const call = client.rpc.bind(client) as unknown as JsonRpc;
  const { data, error } = await call(name, args);
  if (error) throw new Error(error.message);
  return data;
}

export type BookingListFilters = {
  status?: string;
  view?: "all" | "arrivals" | "departures" | "in_house" | "attention" | "upcoming" | "past";
  query?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

export async function listPropertyBookings(
  client: SupabaseClient<Database>,
  propertyId: string,
  filters: BookingListFilters = {},
): Promise<BookingListResult> {
  const data = await callJsonRpc(client, "list_property_bookings", {
    p_property_id: propertyId,
    p_query: filters.query?.trim() || null,
    p_view: filters.view ?? "all",
    p_status: filters.status?.trim() || null,
    p_from: filters.from || null,
    p_to: filters.to || null,
    p_limit: filters.limit ?? 50,
    p_offset: filters.offset ?? 0,
  });
  return parseBookingList(data);
}

export async function getBookingWorkspace(
  client: SupabaseClient<Database>,
  propertyId: string,
  bookingId: string,
): Promise<BookingWorkspace | null> {
  const args = {
    p_property_id: propertyId,
    p_booking_id: bookingId,
  };
  const [workspaceData, settlementData] = await Promise.all([
    callJsonRpc(client, "get_booking_workspace", args),
    callJsonRpc(client, "get_booking_settlement", args),
  ]);
  const workspace = object(workspaceData);
  const settlement = object(settlementData);
  const booking = object(workspace.booking);
  const capabilities = object(workspace.capabilities);
  const settlementCapabilities = object(settlement.capabilities);
  return parseBookingWorkspace({
    ...workspace,
    booking: {
      ...booking,
      settlement: settlement.settlement,
    },
    capabilities: {
      ...capabilities,
      ...settlementCapabilities,
    },
    payments: settlement.payments,
  });
}

export async function getAvailableRooms(
  client: SupabaseClient<Database>,
  propertyId: string,
  checkIn: string,
  checkOut: string,
  guests: number,
): Promise<AvailableRoom[]> {
  const data = await callJsonRpc(client, "get_available_inventory", {
    p_property_id: propertyId,
    p_check_in: checkIn,
    p_check_out: checkOut,
    p_guests: guests,
  });
  return Array.isArray(data)
    ? data.map((item) => parseAvailableRoom(object(item)))
    : [];
}

export type GuestInput = {
  firstName: string;
  lastName: string;
  gender: string;
  nationality?: string;
  occupation?: string;
  email?: string;
  phone: string;
  whereFrom?: string;
  whereTo?: string;
  idType?: string;
  idNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
};

export type InitialPaymentInput = {
  amount: number;
  idempotencyKey: string;
  method: string;
  reference?: string;
  notes?: string;
};

export type CreateBookingInput = {
  roomId: string;
  guest: GuestInput;
  existingGuestId?: string | null;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  source: string;
  specialRequests?: string;
  initialPayment?: Omit<InitialPaymentInput, "idempotencyKey"> | null;
  idempotencyKey: string;
};

export async function createPropertyBooking(
  client: SupabaseClient<Database>,
  propertyId: string,
  input: CreateBookingInput,
) {
  const data = await callJsonRpc(client, "create_property_booking", {
    p_property_id: propertyId,
    p_idempotency_key: input.idempotencyKey,
    p_room_id: input.roomId,
    p_guest: input.existingGuestId
      ? {}
      : {
          first_name: input.guest.firstName.trim(),
          last_name: input.guest.lastName.trim(),
          gender: input.guest.gender,
          nationality: input.guest.nationality?.trim() || null,
          occupation: input.guest.occupation?.trim() || null,
          email: input.guest.email?.trim() || null,
          phone: input.guest.phone.trim(),
          where_from: input.guest.whereFrom?.trim() || null,
          where_to: input.guest.whereTo?.trim() || null,
          id_type: input.guest.idType || null,
          id_number: input.guest.idNumber?.trim() || null,
          emergency_contact_name: input.guest.emergencyContactName?.trim() || null,
          emergency_contact_phone: input.guest.emergencyContactPhone?.trim() || null,
        },
    p_existing_guest_id: input.existingGuestId || null,
    p_check_in: input.checkIn,
    p_check_out: input.checkOut,
    p_adults: input.adults,
    p_children: input.children,
    p_special_requests: input.specialRequests?.trim() || null,
    p_source: input.source,
    p_initial_payment_amount: input.initialPayment?.amount ?? null,
    p_initial_payment_method: input.initialPayment?.method ?? null,
    p_initial_payment_reference: input.initialPayment?.reference?.trim() || null,
  });
  const result = object(data);
  if (result.success !== true) {
    throw new Error(String(result.message ?? "Unable to create booking."));
  }
  const booking = object(result.booking);
  return {
    bookingId: String(result.booking_id ?? booking.id ?? ""),
    bookingNumber: String(result.booking_number ?? booking.booking_number ?? ""),
    status: String(result.status ?? booking.status ?? ""),
  };
}

export async function sendBookingSms(
  client: SupabaseClient<Database>,
  propertyId: string,
  bookingId: string,
) {
  const { data, error } = await client.functions.invoke("send-booking-sms", {
    body: {
      propertyId,
      bookingId,
    },
  });

  if (error) throw new Error(error.message || "Unable to send booking SMS.");
  if (!data || data.success !== true) {
    throw new Error(String(data?.error ?? "Unable to send booking SMS."));
  }

  return data as { success: true; alreadySent?: boolean; phone?: string };
}

export type BookingLifecycleAction =
  | "confirm"
  | "check_in"
  | "check_out"
  | "cancel"
  | "mark_no_show"
  | "reinstate";

export async function updateBookingLifecycle(
  client: SupabaseClient<Database>,
  propertyId: string,
  bookingId: string,
  action: BookingLifecycleAction,
  options: { reason?: string; allowBalance?: boolean } = {},
) {
  const data = await callJsonRpc(client, "update_booking_lifecycle", {
    p_property_id: propertyId,
    p_booking_id: bookingId,
    p_action: action,
    p_reason: options.reason?.trim() || null,
    p_allow_balance: options.allowBalance ?? false,
  });
  const result = object(data);
  if (result.success !== true) {
    throw new Error(String(result.message ?? "Unable to update booking."));
  }
  return result;
}

export type UpdateBookingInput = {
  roomId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  source: string;
  specialRequests?: string;
};

export async function updatePropertyBooking(
  client: SupabaseClient<Database>,
  propertyId: string,
  bookingId: string,
  input: UpdateBookingInput,
) {
  const data = await callJsonRpc(client, "update_property_booking", {
    p_property_id: propertyId,
    p_booking_id: bookingId,
    p_room_id: input.roomId,
    p_check_in: input.checkIn,
    p_check_out: input.checkOut,
    p_adults: input.adults,
    p_children: input.children,
    p_source: input.source,
    p_special_requests: input.specialRequests?.trim() || null,
  });
  const result = object(data);
  if (result.success !== true) {
    throw new Error(String(result.message ?? "Unable to amend booking."));
  }
  return result;
}

export async function recordBookingPayment(
  client: SupabaseClient<Database>,
  propertyId: string,
  bookingId: string,
  input: InitialPaymentInput,
) {
  const data = await callJsonRpc(client, "record_booking_payment", {
    p_property_id: propertyId,
    p_booking_id: bookingId,
    p_idempotency_key: input.idempotencyKey,
    p_amount: input.amount,
    p_method: input.method,
    p_reference: input.reference?.trim() || null,
    p_notes: input.notes?.trim() || null,
  });
  const result = object(data);
  if (result.success !== true) {
    throw new Error(String(result.message ?? "Unable to record payment."));
  }
  return result;
}

// Kept for callers that still use the dedicated operations functions. The
// canonical lifecycle RPC remains the source of allowed transitions.
export async function checkInBooking(client: SupabaseClient<Database>, id: string) {
  const { data, error } = await client.rpc("check_in_booking", { p_booking_id: id });
  if (error) throw new Error(error.message);
  const result = object(data);
  if (result.success !== true) throw new Error(String(result.message ?? "Unable to check in guest."));
  return result;
}

export async function checkoutBooking(
  client: SupabaseClient<Database>,
  id: string,
  allowBalance = false,
) {
  const { data, error } = await client.rpc("checkout_booking", {
    p_booking_id: id,
    p_allow_balance: allowBalance,
  });
  if (error) throw new Error(error.message);
  const result = object(data);
  if (result.success !== true) throw new Error(String(result.message ?? "Unable to check out guest."));
  return result;
}
