import type { Json } from "@/types/database.types";

export type HousekeepingStatus =
  | "ready"
  | "needs_cleaning"
  | "cleaning"
  | "out_of_service";

export type RoomOperationalStatus =
  | HousekeepingStatus
  | "occupied"
  | "checking_out_today"
  | "inactive";

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

export type RoomStay = {
  id: string;
  bookingNumber: string;
  guestName: string;
  guestPhone: string;
  status: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  totalGuests: number;
};

export type RoomBoardItem = Room & {
  operationalStatus: RoomOperationalStatus;
  currentStay: RoomStay | null;
  nextStay: RoomStay | null;
};

export type RoomBoardSummary = {
  totalRooms: number;
  activeRooms: number;
  readyRooms: number;
  occupiedRooms: number;
  checkingOutTodayRooms: number;
  needsCleaningRooms: number;
  cleaningRooms: number;
  outOfServiceRooms: number;
  inactiveRooms: number;
};

export type RoomBoard = {
  property: { id: string; timezone: string; businessDate: string };
  capabilities: { manageRooms: boolean; createBooking: boolean };
  summary: RoomBoardSummary;
  rooms: RoomBoardItem[];
};

export type RoomWorkspace = {
  property: RoomBoard["property"];
  capabilities: RoomBoard["capabilities"];
  room: RoomBoardItem;
  upcomingStays: RoomStay[];
};

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function value(row: UnknownRecord, snake: string, camel = snake): unknown {
  return row[snake] ?? row[camel];
}

function stringValue(row: UnknownRecord, snake: string, camel = snake, fallback = ""): string {
  const next = value(row, snake, camel);
  return next === null || next === undefined ? fallback : String(next);
}

function numberValue(row: UnknownRecord, snake: string, camel = snake, fallback = 0): number {
  const next = Number(value(row, snake, camel));
  return Number.isFinite(next) ? next : fallback;
}

function booleanValue(row: UnknownRecord, snake: string, camel = snake, fallback = false): boolean {
  const next = value(row, snake, camel);
  return typeof next === "boolean" ? next : fallback;
}

function housekeepingStatus(input: unknown): HousekeepingStatus {
  const normalized = String(input ?? "").toLowerCase();
  return normalized === "needs_cleaning" || normalized === "cleaning" || normalized === "out_of_service"
    ? normalized
    : "ready";
}

function operationalStatus(input: unknown, room: Room): RoomOperationalStatus {
  const normalized = String(input ?? "").toLowerCase();
  if (
    normalized === "occupied" || normalized === "checking_out_today" ||
    normalized === "inactive" || normalized === "needs_cleaning" ||
    normalized === "cleaning" || normalized === "out_of_service" ||
    normalized === "ready"
  ) return normalized;
  return room.isActive ? room.housekeepingStatus : "inactive";
}

function strings(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => typeof item === "string" ? item : stringValue(record(item), "url"))
    .filter(Boolean);
}

export function parseRoom(row: Record<string, Json | undefined> | UnknownRecord): Room {
  const source = record(row);
  return {
    id: stringValue(source, "id"),
    propertyId: stringValue(source, "property_id", "propertyId"),
    name: stringValue(source, "name", "name", "Room"),
    roomType: stringValue(source, "room_type", "roomType", "master"),
    capacity: numberValue(source, "capacity", "capacity", 1),
    bedCount: numberValue(source, "bed_count", "bedCount", 1),
    pricePerNight: numberValue(source, "price_per_night", "pricePerNight", numberValue(source, "base_price", "basePrice")),
    amenities: strings(value(source, "amenities")),
    images: strings(value(source, "room_images", "roomImages") ?? value(source, "images")),
    description: stringValue(source, "description"),
    isActive: booleanValue(source, "is_active", "isActive", true),
    housekeepingStatus: housekeepingStatus(value(source, "housekeeping_status", "housekeepingStatus")),
    housekeepingNotes: stringValue(source, "housekeeping_notes", "housekeepingNotes"),
    housekeepingUpdatedAt: value(source, "housekeeping_updated_at", "housekeepingUpdatedAt")
      ? stringValue(source, "housekeeping_updated_at", "housekeepingUpdatedAt")
      : null,
  };
}

export function parseRoomStay(input: unknown): RoomStay | null {
  if (!input) return null;
  const row = record(input);
  const id = stringValue(row, "id");
  if (!id) return null;
  const adults = numberValue(row, "adults", "adults", 1);
  const children = numberValue(row, "children");
  return {
    id,
    bookingNumber: stringValue(row, "booking_number", "bookingNumber"),
    guestName: stringValue(row, "guest_name", "guestName", "Guest"),
    guestPhone: stringValue(row, "guest_phone", "guestPhone"),
    status: stringValue(row, "status"),
    checkIn: stringValue(row, "check_in", "checkIn"),
    checkOut: stringValue(row, "check_out", "checkOut"),
    adults,
    children,
    totalGuests: numberValue(row, "total_guests", "totalGuests", adults + children),
  };
}

export function parseRoomBoardItem(input: unknown): RoomBoardItem {
  const row = record(input);
  const room = parseRoom(row);
  return {
    ...room,
    operationalStatus: operationalStatus(value(row, "operational_status", "operationalStatus"), room),
    currentStay: parseRoomStay(value(row, "current_stay", "currentStay")),
    nextStay: parseRoomStay(value(row, "next_stay", "nextStay")),
  };
}

function deriveSummary(rooms: RoomBoardItem[]): RoomBoardSummary {
  const count = (status: RoomOperationalStatus) => rooms.filter((room) => room.operationalStatus === status).length;
  return {
    totalRooms: rooms.length,
    activeRooms: rooms.filter((room) => room.isActive).length,
    readyRooms: count("ready"),
    occupiedRooms: count("occupied"),
    checkingOutTodayRooms: count("checking_out_today"),
    needsCleaningRooms: count("needs_cleaning"),
    cleaningRooms: count("cleaning"),
    outOfServiceRooms: count("out_of_service"),
    inactiveRooms: count("inactive"),
  };
}

function parseProperty(input: unknown, fallbackId = ""): RoomBoard["property"] {
  const row = record(input);
  return {
    id: stringValue(row, "id", "id", fallbackId),
    timezone: stringValue(row, "timezone", "timezone", "Africa/Dar_es_Salaam"),
    businessDate: stringValue(row, "business_date", "businessDate"),
  };
}

function parseCapabilities(input: unknown): RoomBoard["capabilities"] {
  const row = record(input);
  return {
    manageRooms: booleanValue(row, "manage_rooms", "manageRooms"),
    createBooking: booleanValue(row, "create_booking", "createBooking"),
  };
}

export function parseRoomBoard(input: unknown, propertyId = ""): RoomBoard {
  const root = record(input);
  if (root.success === false) throw new Error(stringValue(root, "message", "message", "Unable to load room board."));
  const rooms = Array.isArray(root.rooms) ? root.rooms.map(parseRoomBoardItem) : [];
  const raw = record(root.summary);
  const derived = deriveSummary(rooms);
  return {
    property: parseProperty(root.property, propertyId),
    capabilities: parseCapabilities(root.capabilities),
    summary: {
      totalRooms: numberValue(raw, "total_rooms", "totalRooms", derived.totalRooms),
      activeRooms: numberValue(raw, "active_rooms", "activeRooms", derived.activeRooms),
      readyRooms: numberValue(raw, "ready_rooms", "readyRooms", derived.readyRooms),
      occupiedRooms: numberValue(raw, "occupied_rooms", "occupiedRooms", derived.occupiedRooms),
      checkingOutTodayRooms: numberValue(raw, "checking_out_today_rooms", "checkingOutTodayRooms", derived.checkingOutTodayRooms),
      needsCleaningRooms: numberValue(raw, "needs_cleaning_rooms", "needsCleaningRooms", derived.needsCleaningRooms),
      cleaningRooms: numberValue(raw, "cleaning_rooms", "cleaningRooms", derived.cleaningRooms),
      outOfServiceRooms: numberValue(raw, "out_of_service_rooms", "outOfServiceRooms", derived.outOfServiceRooms),
      inactiveRooms: numberValue(raw, "inactive_rooms", "inactiveRooms", derived.inactiveRooms),
    },
    rooms,
  };
}

export function parseRoomWorkspace(input: unknown, propertyId = ""): RoomWorkspace {
  const root = record(input);
  if (root.success === false) throw new Error(stringValue(root, "message", "message", "Unable to load room workspace."));
  if (!root.room) throw new Error("Room not found.");
  const upcoming = root.upcoming_stays ?? root.upcomingStays;
  return {
    property: parseProperty(root.property, propertyId),
    capabilities: parseCapabilities(root.capabilities),
    room: parseRoomBoardItem(root.room),
    upcomingStays: Array.isArray(upcoming)
      ? upcoming.map(parseRoomStay).filter((stay): stay is RoomStay => Boolean(stay))
      : [],
  };
}

export const roomAmenities = [
  "WiFi", "TV", "Air Conditioning", "Hot Water", "Balcony", "Mini Bar",
  "Workspace / Desk", "Kitchen Access", "Breakfast Included", "Wardrobe",
  "Room Service", "Safe Box", "Towels", "Toiletries",
];
