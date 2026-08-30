import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";
import type { PropertyAddress, PropertyType } from "../models/property";

const BUCKET = "property-images";
const PENDING_SETUP_KEY = "loji-property-setup:v1";
export const MAX_PROPERTY_IMAGES = 3;
export const MAX_PROPERTY_IMAGE_BYTES = 5 * 1024 * 1024;
export const PROPERTY_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type PendingPropertySetup = {
  ownerId: string;
  propertyId: string | null;
  requestKey: string;
};

export type PropertyBasicInput = {
  name: string;
  type: PropertyType;
  phone: string;
  email: string;
  amenities: string[];
};

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function createRequestKey() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

export function getPendingPropertySetup(ownerId: string): PendingPropertySetup {
  const fresh: PendingPropertySetup = {
    ownerId,
    propertyId: null,
    requestKey: createRequestKey(),
  };

  if (typeof window === "undefined") return fresh;

  try {
    const saved = JSON.parse(
      window.localStorage.getItem(PENDING_SETUP_KEY) ?? "null",
    ) as Partial<PendingPropertySetup> | null;

    if (
      saved?.ownerId === ownerId &&
      typeof saved.requestKey === "string" &&
      saved.requestKey.length >= 8
    ) {
      return {
        ownerId,
        propertyId: isUuid(saved.propertyId) ? saved.propertyId : null,
        requestKey: saved.requestKey,
      };
    }
  } catch {
    // A malformed browser value should never block property creation.
  }

  try {
    window.localStorage.setItem(PENDING_SETUP_KEY, JSON.stringify(fresh));
  } catch {
    // Database-side owner locking still prevents duplicate setup without storage.
  }
  return fresh;
}

export function savePendingPropertySetup(setup: PendingPropertySetup) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PENDING_SETUP_KEY, JSON.stringify(setup));
  } catch {
    // The RPC request key and database resume guard remain the fallback.
  }
}

export function clearPendingPropertySetup(ownerId: string) {
  if (typeof window === "undefined") return;

  try {
    const saved = JSON.parse(
      window.localStorage.getItem(PENDING_SETUP_KEY) ?? "null",
    ) as Partial<PendingPropertySetup> | null;
    if (!saved || saved.ownerId === ownerId) {
      window.localStorage.removeItem(PENDING_SETUP_KEY);
    }
  } catch {
    try {
      window.localStorage.removeItem(PENDING_SETUP_KEY);
    } catch {
      // Storage may be unavailable in private browsing.
    }
  }
}

export async function createPropertyBasicInfo(
  supabase: SupabaseClient<Database>,
  input: PropertyBasicInput,
  requestKey: string,
) {
  const { data, error } = await supabase.rpc(
    "create_property_basic_info" as never,
    {
      p_name: input.name.trim(),
      p_type: input.type,
      p_phone: input.phone.trim(),
      p_email: input.email.trim() || null,
      p_amenities: input.amenities,
      p_request_key: requestKey,
    } as never,
  );
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The property could not be created.");
  return String(data);
}

export async function uploadPropertyImages(
  supabase: SupabaseClient<Database>,
  propertyId: string,
  files: File[],
) {
  if (!files.length || files.length > MAX_PROPERTY_IMAGES) {
    throw new Error("Choose between 1 and 3 property photos.");
  }

  const paths: string[] = [];
  const urls: string[] = [];
  try {
    for (const [index, file] of files.entries()) {
      if (!file.size) throw new Error(`${file.name} is empty.`);
      if (file.size > MAX_PROPERTY_IMAGE_BYTES) {
        throw new Error(`${file.name} is larger than 5 MB.`);
      }
      if (!PROPERTY_IMAGE_TYPES.includes(file.type as (typeof PROPERTY_IMAGE_TYPES)[number])) {
        throw new Error(`${file.name} must be a JPG, PNG or WebP image.`);
      }
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const label = index === 0 ? "cover" : String(index);
      const path = `${propertyId}/${label}_${Date.now()}_${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        contentType: file.type || undefined,
        upsert: false,
      });
      if (error) throw new Error(error.message);
      paths.push(path);
      urls.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
    }
    return { paths, urls };
  } catch (error) {
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    throw error;
  }
}

export async function removePropertyImages(
  supabase: SupabaseClient<Database>,
  paths: string[],
) {
  if (!paths.length) return;
  await supabase.storage.from(BUCKET).remove(paths);
}

export async function savePropertyImages(
  supabase: SupabaseClient<Database>,
  propertyId: string,
  urls: string[],
) {
  const { error } = await supabase.rpc("save_property_images", {
    p_property_id: propertyId,
    p_images: urls,
  });
  if (error) throw new Error(error.message);
}

export async function updatePropertyAddress(
  supabase: SupabaseClient<Database>,
  propertyId: string,
  address: PropertyAddress,
) {
  const { error } = await supabase.rpc("complete_property_onboarding_location", {
    p_property_id: propertyId,
    p_country: address.country,
    p_region: address.region,
    p_district: address.district,
    p_ward: address.ward,
    p_street: address.street,
    p_formatted_address: address.formattedAddress,
    p_latitude: address.latitude,
    p_longitude: address.longitude,
    p_place_id: address.placeId || null,
  });
  if (error) throw new Error(error.message);
}
