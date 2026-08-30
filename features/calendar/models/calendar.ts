import type { Json } from "@/types/database.types";

type JsonObject = Record<string, Json | undefined>;

const object = (value: Json | undefined): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};
const text = (value: Json | undefined) =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";
const number = (value: Json | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export type CalendarRoom = {
  id: string;
  name: string;
  roomType: string;
  isActive: boolean;
  housekeepingStatus: string;
};

export type CalendarBooking = {
  id: string;
  bookingNumber: string;
  roomId: string;
  roomName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalGuests: number;
};

export type PropertyCalendar = {
  businessDate: string;
  timezone: string;
  from: string;
  to: string;
  rooms: CalendarRoom[];
  bookings: CalendarBooking[];
};

export function parsePropertyCalendar(value: Json): PropertyCalendar {
  const root = object(value);
  const property = object(root.property);
  const range = object(root.range);

  const rooms = Array.isArray(root.rooms)
    ? root.rooms.map((item) => object(item)).map((room) => ({
        id: text(room.id ?? room.room_id),
        name: text(room.name ?? room.room_name) || "Room",
        roomType: text(room.room_type),
        isActive: room.is_active === true || room.is_active === "true",
        housekeepingStatus: text(room.housekeeping_status) || "ready",
      }))
    : [];

  const bookings = Array.isArray(root.bookings)
    ? root.bookings.map((item) => object(item)).map((booking) => ({
        id: text(booking.id ?? booking.booking_id),
        bookingNumber: text(booking.booking_number),
        roomId: text(booking.room_id),
        roomName: text(booking.room_name),
        guestName: text(booking.guest_name) || "Guest",
        checkIn: text(booking.check_in),
        checkOut: text(booking.check_out),
        status: text(booking.status).toLowerCase(),
        totalGuests: number(booking.total_guests),
      }))
    : [];

  return {
    businessDate: text(property.business_date ?? root.business_date),
    timezone: text(property.timezone ?? root.timezone),
    from: text(range.from ?? root.from),
    to: text(range.to ?? root.to),
    rooms,
    bookings,
  };
}
