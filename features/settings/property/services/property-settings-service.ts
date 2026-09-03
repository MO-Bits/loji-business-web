import type { SupabaseClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";
import type { Database, Json } from "@/types/database.types";
import {
  parsePropertySettingsWorkspace,
  type PropertyLocationInput,
  type PropertyOperationsInput,
  type PropertyProfileInput,
  type PropertySettingsWorkspace,
} from "../models/property-settings";

const PROPERTY_IMAGES_BUCKET = "property-images";
const PROPERTY_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const MAX_PROPERTY_PHOTOS = 10;
export const MAX_PROPERTY_PHOTO_BYTES = 5 * 1024 * 1024;

export function notifyPropertySettingsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("loji:property-change"));
  }
}

type JsonRpc = (
  name: string,
  args?: Record<string, unknown>,
) => PromiseLike<{
  data: Json;
  error: { code?: string; details?: string; hint?: string; message: string } | null;
}>;

export class PropertySettingsRpcError extends Error {
  readonly code: string;

  constructor(message: string, code = "") {
    super(message);
    this.name = "PropertySettingsRpcError";
    this.code = code;
  }
}

export function isPropertySettingsRpcError(
  cause: unknown,
): cause is PropertySettingsRpcError {
  return cause instanceof PropertySettingsRpcError && Boolean(cause.code);
}

async function settingsRpc(
  client: SupabaseClient<Database>,
  name: string,
  args: Record<string, unknown>,
): Promise<PropertySettingsWorkspace> {
  const call = client.rpc.bind(client) as unknown as JsonRpc;
  const { data, error } = await call(name, args);
  if (error) throw new PropertySettingsRpcError(error.message, error.code);
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

export async function updatePropertyGallery(
  client: SupabaseClient<Database>,
  propertyId: string,
  images: string[],
  expectedUpdatedAt: string | null,
): Promise<PropertySettingsWorkspace> {
  if (images.length > MAX_PROPERTY_PHOTOS) {
    throw new Error(`A property can have at most ${MAX_PROPERTY_PHOTOS} photos.`);
  }

  return settingsRpc(client, "update_property_gallery_versioned", {
    p_property_id: propertyId,
    p_images: images,
    p_expected_updated_at: expectedUpdatedAt,
  });
}

function validatePropertyPhoto(file: File) {
  if (!file.size) throw new Error(`${file.name} is empty.`);
  if (file.size > MAX_PROPERTY_PHOTO_BYTES) {
    throw new Error(`${file.name} is larger than 5 MB.`);
  }
  if (!PROPERTY_IMAGE_TYPES.has(file.type)) {
    throw new Error(`${file.name} must be a JPG, PNG, or WebP image.`);
  }
}

async function hasExpectedPropertyPhotoSignature(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (file.type === "image/png") {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return png.every((byte, index) => bytes[index] === byte);
  }
  if (file.type === "image/webp") {
    return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
      && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

async function optimizePropertyPhoto(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(`${file.name} could not be decoded as an image.`);
  }

  try {
    const maxDimension = 2200;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", 0.84);
    });
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, {
      lastModified: file.lastModified,
      type: "image/webp",
    });
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}

function extensionForPropertyPhoto(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

async function removePropertyPhotoPaths(
  client: SupabaseClient<Database>,
  paths: string[],
) {
  if (!paths.length) return;
  const { error } = await client.storage.from(PROPERTY_IMAGES_BUCKET).remove(paths);
  if (error) throw new Error(error.message);
}

export async function uploadPropertySettingsPhotos(
  client: SupabaseClient<Database>,
  propertyId: string,
  files: File[],
): Promise<string[]> {
  if (!files.length || files.length > MAX_PROPERTY_PHOTOS) {
    throw new Error(`Choose between 1 and ${MAX_PROPERTY_PHOTOS} property photos.`);
  }
  files.forEach(validatePropertyPhoto);
  for (const file of files) {
    if (!await hasExpectedPropertyPhotoSignature(file)) {
      throw new Error(`${file.name} does not contain a valid image.`);
    }
  }

  const uploadedPaths: string[] = [];
  const publicUrls: string[] = [];
  try {
    // Upload one at a time to keep memory and network use predictable on phones.
    for (const original of files) {
      const file = await optimizePropertyPhoto(original);
      const path = `${propertyId}/${crypto.randomUUID()}.${extensionForPropertyPhoto(file)}`;
      // Record the path before awaiting Storage. If the upload commits but its
      // response is lost, cleanup still knows which object may exist.
      uploadedPaths.push(path);
      const { error } = await client.storage.from(PROPERTY_IMAGES_BUCKET).upload(path, file, {
        cacheControl: "31536000",
        contentType: file.type,
        upsert: false,
      });
      if (error) throw new Error(error.message);

      publicUrls.push(
        client.storage.from(PROPERTY_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl,
      );
    }
    return publicUrls;
  } catch (cause) {
    await removePropertyPhotoPaths(client, uploadedPaths).catch((cleanupCause) => {
      Sentry.captureException(cleanupCause, {
        tags: { area: "property-photos", operation: "partial-upload-cleanup" },
        extra: { propertyId, uploadedCount: uploadedPaths.length },
      });
    });
    throw cause;
  }
}

function propertyPhotoPath(propertyId: string, storageOrigin: string, url: string): string {
  const marker = `/storage/v1/object/public/${PROPERTY_IMAGES_BUCKET}/`;
  let path: string;
  try {
    const parsed = new URL(url);
    if (parsed.origin !== storageOrigin) throw new Error("Invalid property photo URL.");
    const { pathname } = parsed;
    if (!pathname.startsWith(marker)) throw new Error("Invalid property photo URL.");
    path = decodeURIComponent(pathname.slice(marker.length));
  } catch {
    throw new Error("Invalid property photo URL.");
  }

  const pathSegments = path.split("/");
  if (
    !path.startsWith(`${propertyId}/`)
    || pathSegments.some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error("A photo does not belong to this property.");
  }
  return path;
}

export async function removePropertySettingsPhotos(
  client: SupabaseClient<Database>,
  propertyId: string,
  urls: string[],
): Promise<void> {
  const probeUrl = client.storage
    .from(PROPERTY_IMAGES_BUCKET)
    .getPublicUrl("__origin_check__")
    .data.publicUrl;
  const storageOrigin = new URL(probeUrl).origin;
  const paths = [...new Set(
    urls.map((url) => propertyPhotoPath(propertyId, storageOrigin, url)),
  )];
  await removePropertyPhotoPaths(client, paths);
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
