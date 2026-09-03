import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/types/database.types";
import {
  materializeRooms,
  type BusinessSetupDraft,
} from "../models/business-setup";

type RegistrationResult = {
  propertyId: string;
  roomCount: number;
  activeStaffCount: number;
  pendingStaffCount: number;
  replayed: boolean;
};

function object(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}
function number(value: Json | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function completeBusinessRegistration(
  client: SupabaseClient<Database>,
  draft: BusinessSetupDraft,
): Promise<RegistrationResult> {
  const { data, error } = await client.rpc(
    "complete_hospitality_registration",
    {
      p_request_key: draft.requestKey,
      p_business: {
        type: draft.businessType,
        name: draft.businessName.trim(),
        phone: draft.businessPhone.trim(),
        email: draft.businessEmail.trim() || null,
        description: draft.description.trim() || null,
        region: draft.region.trim(),
        district: draft.district.trim(),
        ward: draft.ward.trim() || null,
        street: draft.street.trim() || null,
        amenities: draft.amenities,
        payment_methods: draft.paymentMethods,
        checkin_time: draft.checkinTime,
        checkout_time: draft.checkoutTime,
      },
      p_rooms: materializeRooms(draft),
      p_staff: draft.staff.map((staff) => ({
        email: staff.email.trim().toLowerCase(),
        role: staff.role,
      })),
    },
  );
  if (error) throw new Error(error.message);

  const result = object(data);
  if (result.success !== true || typeof result.property_id !== "string") {
    throw new Error("The business registration returned an invalid response.");
  }
  return {
    propertyId: result.property_id,
    roomCount: number(result.room_count),
    activeStaffCount: number(result.active_staff_count),
    pendingStaffCount: number(result.pending_staff_count),
    replayed: result.replayed === true,
  };
}
