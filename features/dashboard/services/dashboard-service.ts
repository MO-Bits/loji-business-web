import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { parseBooking, parseRoom, type DashboardBooking, type HomeDashboard } from "../models/dashboard";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dateOnly(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function sameDay(first: Date, second: Date) {
  const a = dateOnly(first);
  const b = dateOnly(second);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export async function getHomeDashboard(
  supabase: SupabaseClient<Database>,
  propertyId: string,
): Promise<HomeDashboard> {
  const { data, error } = await supabase.rpc("get_home_dashboard", { p_property_id: propertyId });
  if (error) throw new Error(error.message);
  if (!isObject(data)) throw new Error("The dashboard returned an invalid response.");

  const rawBookings: unknown[] = Array.isArray(data.bookings) ? data.bookings : [];
  const rawRooms: unknown[] = Array.isArray(data.rooms) ? data.rooms : [];
  const bookings = rawBookings
    .filter(isObject)
    .map((booking) => parseBooking(booking));
  const rooms = rawRooms
    .filter(isObject)
    .map((room) => parseRoom(room));
  const today = dateOnly(new Date());
  const arrivals = bookings.filter((booking) => sameDay(booking.checkIn, today) && ["confirmed", "reserved", "checked_in"].includes(booking.status));
  const departures = bookings.filter((booking) => sameDay(booking.checkOut, today) && ["checked_in", "checked_out"].includes(booking.status));
  const currentGuests = bookings.filter((booking) => booking.status === "checked_in");
  const activeRooms = rooms.filter((room) => room.isActive);
  const unavailableRoomIds = new Set(
    bookings.filter((booking) => {
      if (!["confirmed", "reserved", "checked_in"].includes(booking.status)) return false;
      const checkIn = dateOnly(booking.checkIn);
      const checkOut = dateOnly(booking.checkOut);
      return today >= checkIn && today < checkOut;
    }).map((booking) => booking.roomId),
  );
  const availableRooms = activeRooms.filter((room) =>
    !unavailableRoomIds.has(room.id) && room.housekeepingStatus === "ready"
  );
  const occupiedRooms = activeRooms.filter((room) => unavailableRoomIds.has(room.id));
  const unavailableRooms = activeRooms.filter((room) =>
    !unavailableRoomIds.has(room.id) && room.housekeepingStatus !== "ready"
  );
  const sum = (list: DashboardBooking[], key: "amountPaid" | "balanceDue") => list.reduce((total, booking) => total + booking[key], 0);
  const outstanding = sum(currentGuests, "balanceDue");

  return {
    arrivals: arrivals.length,
    departures: departures.length,
    stayingGuests: currentGuests.length,
    totalRooms: activeRooms.length,
    availableRooms: availableRooms.length,
    todayArrivals: arrivals,
    todayDepartures: departures,
    currentGuests,
    availableRoomsList: availableRooms,
    occupiedRoomsList: occupiedRooms,
    unavailableRoomsList: unavailableRooms,
    todayRevenue: Number(data.today_revenue ?? 0),
    pendingPayments: outstanding,
    totalOutstanding: outstanding,
  };
}
