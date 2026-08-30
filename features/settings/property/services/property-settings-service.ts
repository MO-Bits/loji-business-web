import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";
import {
  parsePropertySettingsWorkspace,
  type PropertyLocationInput,
  type PropertyOperationsInput,
  type PropertyProfileInput,
  type PropertySettingsWorkspace,
} from "../models/property-settings";

const BUCKET = "property-images";
export const MAX_PROPERTY_GALLERY_IMAGES = 8;
export const MAX_PROPERTY_IMAGE_BYTES = 5 * 1024 * 1024;

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
  return settingsRpc(client, "update_property_operational_settings", {
    p_property_id: propertyId,
    p_timezone: input.timezone,
    p_checkin_time: input.checkinTime,
    p_checkout_time: input.checkoutTime,
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

export async function updatePropertyGallery(
  client: SupabaseClient<Database>,
  propertyId: string,
  images: string[],
): Promise<PropertySettingsWorkspace> {
  return settingsRpc(client, "update_property_gallery", {
    p_property_id: propertyId,
    p_images: images,
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

async function optimizePropertyImage(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function") return file;
  const bitmap = await createImageBitmap(file);
  const maxDimension = 2200;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.84));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, {
    type: "image/webp",
    lastModified: file.lastModified,
  });
}

export async function uploadPropertySettingsImages(
  client: SupabaseClient<Database>,
  propertyId: string,
  files: File[],
): Promise<string[]> {
  if (!files.length || files.length > MAX_PROPERTY_GALLERY_IMAGES) {
    throw new Error("Choose between 1 and 8 property photos.");
  }
  for (const file of files) {
    if (!file.size) throw new Error(`${file.name} is empty.`);
    if (file.size > MAX_PROPERTY_IMAGE_BYTES) throw new Error(`${file.name} is larger than 5 MB.`);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      throw new Error(`${file.name} must be a JPG, PNG, or WebP image.`);
    }
  }

  const paths: string[] = [];
  try {
    const optimized = await Promise.all(files.map(optimizePropertyImage));
    return await Promise.all(optimized.map(async (file, index) => {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${propertyId}/${Date.now()}_${index}_${crypto.randomUUID()}.${extension}`;
      const { error } = await client.storage.from(BUCKET).upload(path, file, {
        cacheControl: "31536000",
        contentType: file.type,
        upsert: false,
      });
      if (error) throw new Error(error.message);
      paths.push(path);
      return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    }));
  } catch (cause) {
    if (paths.length) await client.storage.from(BUCKET).remove(paths);
    throw cause;
  }
}

function propertyStoragePath(url: string): string | null {
  try {
    const marker = "/storage/v1/object/public/property-images/";
    const pathname = new URL(url).pathname;
    const index = pathname.indexOf(marker);
    return index >= 0 ? decodeURIComponent(pathname.slice(index + marker.length)) : null;
  } catch {
    return null;
  }
}

export async function removePropertySettingsImages(
  client: SupabaseClient<Database>,
  urls: string[],
): Promise<void> {
  const paths = urls.map(propertyStoragePath).filter((path): path is string => Boolean(path));
  if (!paths.length) return;
  const { error } = await client.storage.from(BUCKET).remove(paths);
  if (error) throw new Error(error.message);
}
