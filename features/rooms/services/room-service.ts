import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { parseRoom, type Room } from "../models/room";

export type RoomInput = { name: string; roomType: string; capacity: number; bedCount: number; pricePerNight: number; amenities: string[]; images: string[]; isActive?: boolean };

export async function getRooms(client: SupabaseClient<Database>, propertyId: string): Promise<Room[]> {
  const { data, error } = await client.from("rooms").select("*").eq("property_id", propertyId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => parseRoom(row));
}

export async function getRoom(client: SupabaseClient<Database>, propertyId: string, roomId: string): Promise<Room | null> {
  const { data, error } = await client.from("rooms").select("*").eq("property_id", propertyId).eq("id", roomId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? parseRoom(data) : null;
}

export async function uploadRoomImages(client: SupabaseClient<Database>, propertyId: string, roomId: string, files: File[]) {
  if (!files.length || files.length > 3) throw new Error("Select between 1 and 3 images.");
  if (files.some((file) => file.size > 5 * 1024 * 1024)) throw new Error("Each image must be under 5 MB.");
  const paths: string[] = [];
  try {
    const urls = await Promise.all(files.map(async (file, index) => {
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
  const calls = [
    client.rpc("update_room_basic_info", { p_room_id: roomId, p_property_id: propertyId, p_room_name: input.name.trim(), p_room_type: input.roomType, p_is_active: input.isActive ?? true }),
    client.rpc("update_room_pricing", { p_room_id: roomId, p_property_id: propertyId, p_price_per_night: input.pricePerNight }),
    client.rpc("update_room_capacity", { p_room_id: roomId, p_property_id: propertyId, p_capacity: input.capacity, p_bed_count: input.bedCount }),
    client.rpc("update_room_amenities", { p_room_id: roomId, p_property_id: propertyId, p_amenities: input.amenities }),
    client.rpc("update_room_images", { p_room_id: roomId, p_property_id: propertyId, p_images: input.images }),
  ];
  const results = await Promise.all(calls);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message);
}

export async function getRoomBookings(client: SupabaseClient<Database>, roomId: string) {
  const { data, error } = await client.from("bookings").select("check_in,check_out,checked_out_at,status").eq("room_id", roomId);
  if (error) throw new Error(error.message);
  return data ?? [];
}
