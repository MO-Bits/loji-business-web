import type { Json } from "@/types/database.types";

export type Room = {
  id: string;
  propertyId: string;
  name: string;
  roomType: string;
  capacity: number;
  bedCount: number;
  pricePerNight: number;
  amenities: string[];
  images: string[];
  description: string;
  isActive: boolean;
  housekeepingStatus: HousekeepingStatus;
  housekeepingNotes: string;
  housekeepingUpdatedAt: string | null;
};

export type HousekeepingStatus =
  | "ready"
  | "needs_cleaning"
  | "cleaning"
  | "out_of_service";

function housekeepingStatus(value: Json | undefined): HousekeepingStatus {
  return ["ready", "needs_cleaning", "cleaning", "out_of_service"].includes(String(value))
    ? value as HousekeepingStatus
    : "ready";
}

function strings(value: Json | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => typeof item === "string" ? item : item && typeof item === "object" && !Array.isArray(item) && typeof item.url === "string" ? item.url : "").filter(Boolean);
}

export function parseRoom(row: Record<string, Json | undefined>): Room {
  return {
    id: String(row.id ?? ""), propertyId: String(row.property_id ?? ""), name: String(row.name ?? "Room"),
    roomType: String(row.room_type ?? "master"), capacity: Number(row.capacity ?? 1), bedCount: Number(row.bed_count ?? 1),
    pricePerNight: Number(row.price_per_night ?? row.base_price ?? 0), amenities: strings(row.amenities),
    images: strings(row.room_images ?? row.images), description: String(row.description ?? ""), isActive: row.is_active !== false,
    housekeepingStatus: housekeepingStatus(row.housekeeping_status),
    housekeepingNotes: String(row.housekeeping_notes ?? ""),
    housekeepingUpdatedAt: row.housekeeping_updated_at ? String(row.housekeeping_updated_at) : null,
  };
}

export const roomAmenities = ["WiFi", "TV", "Air Conditioning", "Hot Water", "Balcony", "Mini Bar", "Workspace / Desk", "Kitchen Access", "Breakfast Included", "Wardrobe", "Room Service", "Safe Box", "Towels", "Toiletries"];
