import type { Json } from "@/types/database.types";

type JsonObject = Record<string, Json | undefined>;

const asObject = (value: Json | undefined): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};
const asText = (value: Json | undefined) =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";
const asNumber = (value: Json | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export type ReportSummary = {
  roomRevenue: number;
  collected: number;
  occupancyRate: number;
  averageDailyRate: number;
  revenuePerAvailableRoom: number;
  roomNights: number;
  bookings: number;
  cancellations: number;
};

export type ReportDay = {
  date: string;
  roomRevenue: number;
  collected: number;
  occupancyRate: number;
  roomNights: number;
};

export type RoomPerformance = {
  roomId: string;
  roomName: string;
  roomType: string;
  roomRevenue: number;
  roomNights: number;
  occupancyRate: number;
};

export type BookingSourcePerformance = {
  source: string;
  bookings: number;
  revenue: number;
};

export type PropertyReport = {
  businessDate: string;
  timezone: string;
  summary: ReportSummary;
  daily: ReportDay[];
  rooms: RoomPerformance[];
  sources: BookingSourcePerformance[];
};

export function parsePropertyReport(value: Json): PropertyReport {
  const root = asObject(value);
  const property = asObject(root.property);
  const summary = asObject(root.summary);

  return {
    businessDate: asText(property.business_date ?? root.business_date),
    timezone: asText(property.timezone ?? root.timezone),
    summary: {
      roomRevenue: asNumber(summary.room_revenue ?? summary.revenue),
      collected: asNumber(summary.collected),
      occupancyRate: asNumber(summary.occupancy_rate),
      averageDailyRate: asNumber(summary.average_daily_rate ?? summary.adr),
      revenuePerAvailableRoom: asNumber(
        summary.revenue_per_available_room ?? summary.revpar,
      ),
      roomNights: asNumber(summary.room_nights),
      bookings: asNumber(summary.bookings),
      cancellations: asNumber(summary.cancellations),
    },
    daily: Array.isArray(root.daily)
      ? root.daily.map(asObject).map((item) => ({
          date: asText(item.date),
          roomRevenue: asNumber(item.room_revenue ?? item.revenue),
          collected: asNumber(item.collected),
          occupancyRate: asNumber(item.occupancy_rate),
          roomNights: asNumber(item.room_nights),
        }))
      : [],
    rooms: Array.isArray(root.rooms)
      ? root.rooms.map(asObject).map((item) => ({
          roomId: asText(item.room_id ?? item.id),
          roomName: asText(item.room_name ?? item.name) || "Room",
          roomType: asText(item.room_type),
          roomRevenue: asNumber(item.room_revenue ?? item.revenue),
          roomNights: asNumber(item.room_nights),
          occupancyRate: asNumber(item.occupancy_rate),
        }))
      : [],
    sources: Array.isArray(root.sources)
      ? root.sources.map(asObject).map((item) => ({
          source: asText(item.source) || "direct",
          bookings: asNumber(item.bookings),
          revenue: asNumber(item.revenue),
        }))
      : [],
  };
}
