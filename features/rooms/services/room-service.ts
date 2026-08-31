import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";
import type { InventoryType } from "@/features/property/models/property";
import {
  parseRoomBoard,
  parseRoomWorkspace,
  type HousekeepingStatus,
  type Room,
  type RoomBoard,
  type RoomWorkspace,
} from "../models/room";

type RpcResponse = { data: Json; error: { message: string } | null };
type JsonRpc = (
  name: string,
  args?: Record<string, unknown>,
) => PromiseLike<RpcResponse>;

export type RoomInput = {
  name: string;
  roomType: string;
  inventoryType: InventoryType;
  capacity: number;
  bedCount: number;
  bedroomCount: number;
  bathroomCount: number;
  pricePerNight: number;
  amenities: string[];
  images: string[];
  description: string;
  isActive?: boolean;
};

export type PropertyInventorySetup = {
  inventoryType: InventoryType;
  expectedInventoryCount: number;
  defaultBedroomCount: number | null;
  defaultBathroomCount: number | null;
};

async function callJsonRpc(
  client: SupabaseClient<Database>,
  name: string,
  args: Record<string, unknown>,
): Promise<Json> {
  const call = client.rpc.bind(client) as unknown as JsonRpc;
  const { data, error } = await call(name, args);
  if (error) throw new Error(error.message);
  return data;
}

function resultRecord(data: Json): Record<string, Json | undefined> {
  return data && typeof data === "object" && !Array.isArray(data) ? data : {};
}

function ensureSuccess(data: Json, fallback: string): Record<string, Json | undefined> {
  const result = resultRecord(data);
  if (result.success === false) throw new Error(String(result.message ?? fallback));
  return result;
}

export async function getRoomBoard(
  client: SupabaseClient<Database>,
  propertyId: string,
): Promise<RoomBoard> {
  const data = await callJsonRpc(client, "get_room_board", {
    p_property_id: propertyId,
  });
  return parseRoomBoard(data, propertyId);
}

export async function getRoomWorkspace(
  client: SupabaseClient<Database>,
  propertyId: string,
  roomId: string,
): Promise<RoomWorkspace> {
  const data = await callJsonRpc(client, "get_room_workspace", {
    p_property_id: propertyId,
    p_room_id: roomId,
  });
  return parseRoomWorkspace(data, propertyId);
}

export async function getPropertyInventorySetup(
  client: SupabaseClient<Database>,
  propertyId: string,
): Promise<PropertyInventorySetup> {
  const data = await callJsonRpc(client, "get_property_inventory_setup", {
    p_property_id: propertyId,
  });
  const result = resultRecord(data);
  const inventoryType = String(result.inventory_type ?? "room");
  const bedroomCount = result.default_bedroom_count;
  const bathroomCount = result.default_bathroom_count;
  return {
    inventoryType: inventoryType === "apartment" || inventoryType === "house"
      ? inventoryType
      : "room",
    expectedInventoryCount: Math.max(1, Number(result.expected_inventory_count ?? 1)),
    defaultBedroomCount: bedroomCount == null ? null : Number(bedroomCount),
    defaultBathroomCount: bathroomCount == null ? null : Number(bathroomCount),
  };
}

export async function setRoomHousekeepingStatus(
  client: SupabaseClient<Database>,
  propertyId: string,
  roomId: string,
  status: HousekeepingStatus,
  notes?: string,
) {
  const data = await callJsonRpc(client, "update_room_housekeeping_status", {
    p_property_id: propertyId,
    p_room_id: roomId,
    p_status: status,
    p_notes: notes?.trim() || null,
  });
  return ensureSuccess(data, "Unable to update housekeeping status.");
}

function mutationArgs(propertyId: string, roomId: string, input: RoomInput) {
  return {
    p_property_id: propertyId,
    p_unit_id: roomId,
    p_name: input.name.trim(),
    p_space_type: input.roomType,
    p_inventory_type: input.inventoryType,
    p_is_active: input.isActive ?? true,
    p_price_per_night: input.pricePerNight,
    p_capacity: input.capacity,
    p_bed_count: input.bedCount,
    p_bedroom_count: input.bedroomCount,
    p_bathroom_count: input.bathroomCount,
    p_description: input.description.trim() || null,
    p_amenities: input.amenities,
    p_images: input.images,
  };
}

export async function createRoom(
  client: SupabaseClient<Database>,
  propertyId: string,
  input: RoomInput,
  requestedRoomId = crypto.randomUUID(),
): Promise<string> {
  const data = await callJsonRpc(client, "create_inventory_unit", mutationArgs(propertyId, requestedRoomId, input));
  const result = ensureSuccess(data, "Unable to create room.");
  return String(result.room_id ?? requestedRoomId);
}

export async function updateRoom(
  client: SupabaseClient<Database>,
  propertyId: string,
  roomId: string,
  input: RoomInput,
): Promise<string> {
  const data = await callJsonRpc(client, "update_inventory_unit", mutationArgs(propertyId, roomId, input));
  const result = ensureSuccess(data, "Unable to update room.");
  return String(result.room_id ?? roomId);
}

export async function setRoomActive(
  client: SupabaseClient<Database>,
  propertyId: string,
  room: Room,
  isActive: boolean,
) {
  return updateRoom(client, propertyId, room.id, {
    name: room.name,
    roomType: room.roomType,
    inventoryType: room.inventoryType,
    capacity: room.capacity,
    bedCount: room.bedCount,
    bedroomCount: room.bedroomCount,
    bathroomCount: room.bathroomCount,
    pricePerNight: room.pricePerNight,
    amenities: room.amenities,
    images: room.images,
    description: room.description,
    isActive,
  });
}

async function optimizeRoomImage(file: File): Promise<File> {
  if (
    !file.type.startsWith("image/") ||
    file.type === "image/svg+xml" ||
    typeof createImageBitmap !== "function"
  ) return file;

  const bitmap = await createImageBitmap(file);
  const maxDimension = 1920;
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
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, {
    type: "image/webp",
    lastModified: file.lastModified,
  });
}

export async function uploadRoomImages(
  client: SupabaseClient<Database>,
  propertyId: string,
  roomId: string,
  files: File[],
): Promise<string[]> {
  if (!files.length || files.length > 5) throw new Error("Select between 1 and 5 images.");
  if (files.some((file) => file.size > 6 * 1024 * 1024)) throw new Error("Each image must be under 6 MB.");
  const paths: string[] = [];
  try {
    const optimizedFiles = await Promise.all(files.map(optimizeRoomImage));
    return await Promise.all(optimizedFiles.map(async (file, index) => {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${propertyId}/${roomId}/${Date.now()}_${index}_${crypto.randomUUID()}.${extension}`;
      const { error } = await client.storage.from("room-images").upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
      });
      if (error) throw error;
      paths.push(path);
      return client.storage.from("room-images").getPublicUrl(path).data.publicUrl;
    }));
  } catch (cause) {
    if (paths.length) await client.storage.from("room-images").remove(paths);
    throw cause;
  }
}

function storagePath(url: string): string | null {
  try {
    const marker = "/storage/v1/object/public/room-images/";
    const pathname = new URL(url).pathname;
    const index = pathname.indexOf(marker);
    return index >= 0 ? decodeURIComponent(pathname.slice(index + marker.length)) : null;
  } catch {
    return null;
  }
}

export async function removeRoomImages(
  client: SupabaseClient<Database>,
  urls: string[],
): Promise<void> {
  const paths = urls.map(storagePath).filter((path): path is string => Boolean(path));
  if (!paths.length) return;
  const { error } = await client.storage.from("room-images").remove(paths);
  if (error) throw new Error(error.message);
}
