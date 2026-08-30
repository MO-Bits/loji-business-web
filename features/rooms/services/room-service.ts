import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { localDateKey } from "@/lib/date-time";
import { parseRoom, type HousekeepingStatus, type Room } from "../models/room";

export type RoomInput = { name: string; roomType: string; capacity: number; bedCount: number; pricePerNight: number; amenities: string[]; images: string[]; isActive?: boolean };
export type RoomOperationalStatus =
  | HousekeepingStatus
  | "occupied"
  | "checking_out_today"
  | "inactive";

export async function getRooms(client: SupabaseClient<Database>, propertyId: string): Promise<Room[]> {
  const { data, error } = await client.from("rooms").select("*").eq("property_id", propertyId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => parseRoom(row));
}

export async function getRoomOperationalStatuses(
  client: SupabaseClient<Database>,
  rooms: Room[],
): Promise<Record<string, RoomOperationalStatus>> {
  const statuses: Record<string, RoomOperationalStatus> = {};
  for (const room of rooms) {
    statuses[room.id] = room.isActive ? room.housekeepingStatus : "inactive";
  }

  const activeRoomIds = rooms.filter((room) => room.isActive).map((room) => room.id);
  if (!activeRoomIds.length) return statuses;

  const today = localDateKey();
  const { data, error } = await client
    .from("bookings")
    .select("room_id,check_in,check_out,checked_out_at,status")
    .in("room_id", activeRoomIds)
    .lte("check_in", today)
    .gte("check_out", today);

  if (error) throw new Error(error.message);

  for (const booking of data ?? []) {
    if (booking.checked_out_at) continue;
    const state = String(booking.status ?? "").toLowerCase();
    if (["cancelled", "canceled", "checked_out"].includes(state)) continue;
    statuses[booking.room_id] = booking.check_out === today
      ? "checking_out_today"
      : "occupied";
  }

  return statuses;
}

export async function setRoomActive(
  client: SupabaseClient<Database>,
  propertyId: string,
  room: Room,
  isActive: boolean,
) {
  const { error } = await client.rpc("update_room_basic_info", {
    p_room_id: room.id,
    p_property_id: propertyId,
    p_room_name: room.name.trim(),
    p_room_type: room.roomType,
    p_is_active: isActive,
  });
  if (error) throw new Error(error.message);
}

export async function setRoomHousekeepingStatus(
  client: SupabaseClient<Database>,
  propertyId: string,
  roomId: string,
  status: HousekeepingStatus,
  notes?: string,
) {
  const { data, error } = await client.rpc("update_room_housekeeping_status", {
    p_property_id: propertyId,
    p_room_id: roomId,
    p_status: status,
    p_notes: notes?.trim() || null,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function getRoom(client: SupabaseClient<Database>, propertyId: string, roomId: string): Promise<Room | null> {
  const { data, error } = await client.from("rooms").select("*").eq("property_id", propertyId).eq("id", roomId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? parseRoom(data) : null;
}

async function optimizeRoomImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;

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

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.82),
  );
  if (!blob || blob.size >= file.size) return file;

  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, {
    type: "image/webp",
    lastModified: file.lastModified,
  });
}

export async function uploadRoomImages(client: SupabaseClient<Database>, propertyId: string, roomId: string, files: File[]) {
  if (!files.length || files.length > 3) throw new Error("Select between 1 and 3 images.");
  if (files.some((file) => file.size > 5 * 1024 * 1024)) throw new Error("Each image must be under 5 MB.");
  const paths: string[] = [];
  try {
    const optimizedFiles = await Promise.all(files.map(optimizeRoomImage));
    const urls = await Promise.all(optimizedFiles.map(async (file, index) => {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${propertyId}/${roomId}/${index === 0 ? "cover_" : `${index}_`}${Date.now()}_${crypto.randomUUID()}.${extension}`;
      const { error } = await client.storage.from("room-images").upload(path, file, { upsert: false });
      if (error) throw error; paths.push(path);
      return client.storage.from("room-images").getPublicUrl(path).data.publicUrl;
    }));
    return urls;
  } catch (cause) {
    if (paths.length) await client.storage.from("room-images").remove(paths);
    throw cause;
  }
}

export async function createRoom(client: SupabaseClient<Database>, propertyId: string, input: RoomInput, requestedRoomId?: string) {
  const roomId = requestedRoomId ?? crypto.randomUUID();
  const { data, error } = await client.rpc("create_room_with_images", { p_room_id: roomId, p_property_id: propertyId, p_room_name: input.name.trim(), p_room_type: input.roomType, p_capacity: input.capacity, p_base_price: input.pricePerNight, p_bed_count: input.bedCount, p_amenities: input.amenities, p_images: input.images });
  if (error) throw new Error(error.message);
  return String(data ?? roomId);
}

export async function updateRoom(client: SupabaseClient<Database>, propertyId: string, roomId: string, input: RoomInput) {
  const { error } = await client.rpc("update_room", {
    p_room_id: roomId,
    p_property_id: propertyId,
    p_room_name: input.name.trim(),
    p_room_type: input.roomType,
    p_is_active: input.isActive ?? true,
    p_price_per_night: input.pricePerNight,
    p_capacity: input.capacity,
    p_bed_count: input.bedCount,
    p_amenities: input.amenities,
    p_images: input.images,
  });
  if (error) throw new Error(error.message);
}

export async function getRoomBookings(client: SupabaseClient<Database>, roomId: string) {
  const { data, error } = await client.from("bookings").select("check_in,check_out,checked_out_at,status").eq("room_id", roomId);
  if (error) throw new Error(error.message);
  return data ?? [];
}
