import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";
import type { PropertyAddress, PropertyType } from "../models/property";

const BUCKET = "property-images";
export const MAX_PROPERTY_IMAGES = 3;
export const MAX_PROPERTY_IMAGE_BYTES = 5 * 1024 * 1024;

export type PropertyBasicInput = {
  name: string;
  type: PropertyType;
  phone: string;
  email: string;
  amenities: string[];
};

export async function createPropertyBasicInfo(
  supabase: SupabaseClient<Database>,
  input: PropertyBasicInput,
) {
  const { data, error } = await supabase.rpc("create_property_basic_info", {
    p_name: input.name.trim(),
    p_type: input.type,
    p_phone: input.phone.trim(),
    p_email: input.email.trim() || null,
    p_amenities: input.amenities,
  });
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
    return urls;
  } catch (error) {
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    throw error;
  }
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
  ownerId: string,
  address: PropertyAddress,
) {
  const { error } = await supabase.rpc("update_property_address", {
    p_owner_id: ownerId,
    p_country: address.country,
    p_region: address.region,
    p_district: address.district,
    p_ward: address.ward,
    p_street: address.street,
    p_formatted_address: address.formattedAddress,
    p_latitude: address.latitude,
    p_longitude: address.longitude,
    p_place_id: address.placeId,
  });
  if (error) throw new Error(error.message);
}
