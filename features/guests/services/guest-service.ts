import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

import {
  parseGuestDirectory,
  parseGuestWorkspace,
  type GuestDirectory,
  type GuestStayFilter,
  type GuestUpdateInput,
  type GuestWorkspace,
} from "../models/guest";

type RpcError = { message: string } | null;
type RpcResponse = PromiseLike<{ data: unknown; error: RpcError }>;

type GuestRpcClient = {
  rpc(
    name: "list_property_guests",
    args: {
      p_property_id: string;
      p_query: string | null;
      p_page: number;
      p_page_size: number;
      p_stay_filter: GuestStayFilter;
    },
  ): RpcResponse;
  rpc(
    name: "get_guest_workspace",
    args: { p_property_id: string; p_guest_id: string },
  ): RpcResponse;
  rpc(
    name: "update_property_guest",
    args: {
      p_property_id: string;
      p_guest_id: string;
      p_guest: GuestUpdatePayload;
    },
  ): RpcResponse;
};

type GuestUpdatePayload = {
  first_name: string;
  last_name: string;
  gender: string;
  phone: string;
  email: string;
  nationality: string;
  occupation: string;
  address: string;
  where_from: string;
  where_to: string;
  id_type?: string;
  id_number?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
};

function guestRpcClient(client: SupabaseClient<Database>): GuestRpcClient {
  // The guest RPCs are introduced by the companion database migration. This
  // narrow adapter keeps this feature buildable while generated types land.
  return client as unknown as GuestRpcClient;
}

function assertObject(value: unknown, message: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(message);
  }
}

export type ListPropertyGuestsInput = {
  propertyId: string;
  query?: string;
  page?: number;
  pageSize?: number;
  stayFilter?: GuestStayFilter;
};

export async function listPropertyGuests(
  client: SupabaseClient<Database>,
  input: ListPropertyGuestsInput,
): Promise<GuestDirectory> {
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(input.pageSize ?? 25)));
  const query = input.query?.trim() || null;
  const { data, error } = await guestRpcClient(client).rpc(
    "list_property_guests",
    {
      p_property_id: input.propertyId,
      p_query: query,
      p_page: page,
      p_page_size: pageSize,
      p_stay_filter: input.stayFilter ?? "all",
    },
  );

  if (error) throw new Error(error.message);
  assertObject(data, "The guest directory returned an invalid response.");
  return parseGuestDirectory(data);
}

export async function getGuestWorkspace(
  client: SupabaseClient<Database>,
  propertyId: string,
  guestId: string,
): Promise<GuestWorkspace> {
  const { data, error } = await guestRpcClient(client).rpc(
    "get_guest_workspace",
    {
      p_property_id: propertyId,
      p_guest_id: guestId,
    },
  );

  if (error) throw new Error(error.message);
  assertObject(data, "The guest workspace returned an invalid response.");
  return parseGuestWorkspace(data);
}

export async function updatePropertyGuest(
  client: SupabaseClient<Database>,
  propertyId: string,
  guestId: string,
  guest: GuestUpdateInput,
): Promise<void> {
  const payload: GuestUpdatePayload = {
    first_name: guest.firstName,
    last_name: guest.lastName,
    gender: guest.gender,
    phone: guest.phone,
    email: guest.email,
    nationality: guest.nationality,
    occupation: guest.occupation,
    address: guest.address,
    where_from: guest.whereFrom,
    where_to: guest.whereTo,
  };

  if (guest.idType !== undefined) payload.id_type = guest.idType;
  if (guest.idNumber !== undefined) payload.id_number = guest.idNumber;
  if (guest.emergencyContactName !== undefined) {
    payload.emergency_contact_name = guest.emergencyContactName;
  }
  if (guest.emergencyContactPhone !== undefined) {
    payload.emergency_contact_phone = guest.emergencyContactPhone;
  }
  if (guest.notes !== undefined) payload.notes = guest.notes;

  const { data, error } = await guestRpcClient(client).rpc(
    "update_property_guest",
    {
      p_property_id: propertyId,
      p_guest_id: guestId,
      p_guest: payload,
    },
  );

  if (error) throw new Error(error.message);
  if (data !== null && data !== undefined) {
    assertObject(data, "The guest update returned an invalid response.");
  }
}
