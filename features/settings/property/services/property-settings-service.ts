import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";
import {
  parsePropertySettingsWorkspace,
  type PropertyLocationInput,
  type PropertyOperationsInput,
  type PropertyProfileInput,
  type PropertySettingsWorkspace,
} from "../models/property-settings";

export function notifyPropertySettingsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("loji:property-change"));
  }
}

type JsonRpc = (
  name: string,
  args?: Record<string, unknown>,
) => PromiseLike<{ data: Json; error: { message: string } | null }>;

async function settingsRpc(
  client: SupabaseClient<Database>,
  name: string,
  args: Record<string, unknown>,
): Promise<PropertySettingsWorkspace> {
  const call = client.rpc.bind(client) as unknown as JsonRpc;
  const { data, error } = await call(name, args);
  if (error) throw new Error(error.message);
  return parsePropertySettingsWorkspace(data);
}

export async function getPropertySettings(
  client: SupabaseClient<Database>,
  propertyId: string,
): Promise<PropertySettingsWorkspace> {
  return settingsRpc(client, "get_property_settings", { p_property_id: propertyId });
}

export async function updatePropertyProfile(
  client: SupabaseClient<Database>,
  propertyId: string,
  input: PropertyProfileInput,
): Promise<PropertySettingsWorkspace> {
  return settingsRpc(client, "update_property_profile", {
    p_property_id: propertyId,
    p_name: input.name.trim(),
    p_description: input.description.trim() || null,
    p_property_type: input.propertyType,
    p_phone: input.phone.trim(),
    p_email: input.email.trim().toLowerCase() || null,
  });
}

export async function updatePropertyOperationalSettings(
  client: SupabaseClient<Database>,
  propertyId: string,
  input: PropertyOperationsInput,
): Promise<PropertySettingsWorkspace> {
  return settingsRpc(client, "update_property_operations_and_payments", {
    p_property_id: propertyId,
    p_timezone: input.timezone,
    p_checkin_time: input.checkinTime,
    p_checkout_time: input.checkoutTime,
    p_payment_methods: input.paymentMethods,
  });
}

export async function updatePropertyLocation(
  client: SupabaseClient<Database>,
  propertyId: string,
  input: PropertyLocationInput,
): Promise<PropertySettingsWorkspace> {
  return settingsRpc(client, "update_property_location", {
    p_property_id: propertyId,
    p_country: input.country.trim() || null,
    p_region: input.region.trim() || null,
    p_district: input.district.trim() || null,
    p_ward: input.ward.trim() || null,
    p_street: input.street.trim() || null,
    p_formatted_address: input.formattedAddress.trim() || null,
    p_place_id: input.placeId.trim() || null,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
  });
}

export async function updatePropertyAmenities(
  client: SupabaseClient<Database>,
  propertyId: string,
  amenities: string[],
): Promise<PropertySettingsWorkspace> {
  return settingsRpc(client, "update_property_amenities", {
    p_property_id: propertyId,
    p_amenities: amenities,
  });
}

export async function updatePropertyVisibility(
  client: SupabaseClient<Database>,
  propertyId: string,
  isActive: boolean,
): Promise<PropertySettingsWorkspace> {
  return settingsRpc(client, "update_property_visibility", {
    p_property_id: propertyId,
    p_is_active: isActive,
  });
}
