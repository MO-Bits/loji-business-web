import { parseDatabaseDate } from "@/lib/date-time";

export type DashboardBooking = {
  id: string;
  guestName: string;
  roomId: string;
  roomName: string;
  roomType: string;
  checkIn: Date;
  checkOut: Date;
  status: string;
  amountPaid: number;
  balanceDue: number;
};

export type DashboardRoom = {
  id: string;
  name: string;
  roomType: string;
  capacity: number;
  bedCount: number;
  pricePerNight: number;
  isActive: boolean;
  images: string[];
};

export type HomeDashboard = {
  arrivals: number;
  departures: number;
  stayingGuests: number;
  totalRooms: number;
  availableRooms: number;
  todayArrivals: DashboardBooking[];
  todayDepartures: DashboardBooking[];
  currentGuests: DashboardBooking[];
  availableRoomsList: DashboardRoom[];
  occupiedRoomsList: DashboardRoom[];
  todayRevenue: number;
  pendingPayments: number;
  totalOutstanding: number;
};

type Raw = Record<string, unknown>;

function text(raw: Raw, ...keys: string[]) {
  for (const key of keys) {
    const value = raw[key];
    if (value !== null && value !== undefined) return String(value);
  }
  return "";
}

function number(raw: Raw, ...keys: string[]) {
  const value = Number(text(raw, ...keys));
  return Number.isFinite(value) ? value : 0;
}

function date(raw: Raw, ...keys: string[]) {
  const parsed = parseDatabaseDate(text(raw, ...keys));
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

export function parseBooking(raw: Raw): DashboardBooking {
  return {
    id: text(raw, "id", "booking_id"),
    guestName: text(raw, "guest_name", "guestName", "full_name") || "Guest",
    roomId: text(raw, "room_id", "roomId"),
    roomName: text(raw, "room_name", "roomName") || "Room",
    roomType: text(raw, "room_type", "roomType"),
    checkIn: date(raw, "check_in", "checkIn", "check_in_date"),
    checkOut: date(raw, "check_out", "checkOut", "check_out_date"),
    status: text(raw, "status").toLowerCase(),
    amountPaid: number(raw, "amount_paid", "amountPaid"),
    balanceDue: number(raw, "balance_due", "balanceDue"),
  };
}

export function parseRoom(raw: Raw): DashboardRoom {
  const rawImages = Array.isArray(raw.images) ? raw.images : [];
  const images = rawImages
    .map((image) => typeof image === "string" ? image : image && typeof image === "object" ? text(image as Raw, "url", "image_url") : "")
    .filter(Boolean);
  const active = raw.is_active ?? raw.isActive ?? raw.status;
  return {
    id: text(raw, "id", "room_id"),
    name: text(raw, "name", "room_name") || "Room",
    roomType: text(raw, "room_type", "roomType", "type"),
    capacity: number(raw, "capacity"),
    bedCount: number(raw, "bed_count", "bedCount", "beds"),
    pricePerNight: number(raw, "price_per_night", "pricePerNight", "price"),
    isActive: active === true || active === "true" || active === "active",
    images,
  };
}
