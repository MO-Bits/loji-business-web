import { parseDatabaseDate } from "@/lib/date-time";

export type DashboardCapabilities = {
  createBooking: boolean;
  manageRooms: boolean;
  recordPayment: boolean;
  checkOut: boolean;
  updateBooking: boolean;
  viewFinance: boolean;
};

export type DashboardSummary = {
  arrivalsDue: number;
  attentionRooms: number;
  departuresDue: number;
  occupiedRooms: number;
  overdueArrivals: number;
  overdueDepartures: number;
  readyRooms: number;
  totalActiveRooms: number;
};

export type DashboardBooking = {
  id: string;
  bookingNumber: string;
  guestName: string;
  guests: number;
  roomId: string;
  roomName: string;
  roomType: string;
  checkIn: Date;
  checkOut: Date;
  status: string;
  isOverdue: boolean;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: string;
};

export type DashboardHousekeepingRoom = {
  id: string;
  name: string;
  roomType: string;
  operationalStatus: string;
  housekeepingStatus: string;
  notes: string;
  updatedAt: Date | null;
};

export type DashboardFinance = {
  todayCollected: number;
  todayPaymentCount: number;
  outstandingBalance: number;
  openBalanceCount: number;
};

export type HomeDashboard = {
  businessDate: Date;
  timezone: string;
  role: string;
  capabilities: DashboardCapabilities;
  summary: DashboardSummary;
  arrivals: DashboardBooking[];
  departures: DashboardBooking[];
  housekeeping: DashboardHousekeepingRoom[];
  finance: DashboardFinance | null;
};

type Raw = Record<string, unknown>;

function object(value: unknown): Raw {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Raw)
    : {};
}

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

function boolean(raw: Raw, ...keys: string[]) {
  for (const key of keys) {
    const value = raw[key];
    if (value === true || value === "true") return true;
  }
  return false;
}

function date(raw: Raw, ...keys: string[]) {
  const parsed = parseDatabaseDate(text(raw, ...keys));
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

function optionalDate(raw: Raw, ...keys: string[]) {
  const value = text(raw, ...keys);
  if (!value) return null;
  const parsed = parseDatabaseDate(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseDashboardBooking(value: unknown): DashboardBooking {
  const raw = object(value);
  return {
    id: text(raw, "booking_id", "id"),
    bookingNumber: text(raw, "booking_number", "bookingNumber"),
    guestName: text(raw, "guest_name", "guestName") || "Guest",
    guests: number(raw, "guests", "total_guests"),
    roomId: text(raw, "room_id", "roomId"),
    roomName: text(raw, "room_name", "roomName") || "Room",
    roomType: text(raw, "room_type", "roomType"),
    checkIn: date(raw, "check_in", "checkIn"),
    checkOut: date(raw, "check_out", "checkOut"),
    status: text(raw, "status").toLowerCase(),
    isOverdue: boolean(raw, "is_overdue", "isOverdue"),
    amountPaid: number(raw, "amount_paid", "amountPaid"),
    balanceDue: number(raw, "balance_due", "balanceDue"),
    paymentStatus: text(raw, "payment_status", "paymentStatus").toLowerCase(),
  };
}

export function parseHousekeepingRoom(
  value: unknown,
): DashboardHousekeepingRoom {
  const raw = object(value);
  return {
    id: text(raw, "room_id", "id"),
    name: text(raw, "room_name", "name") || "Room",
    roomType: text(raw, "room_type", "roomType"),
    operationalStatus: text(raw, "operational_status", "operationalStatus"),
    housekeepingStatus: text(raw, "housekeeping_status", "housekeepingStatus"),
    notes: text(raw, "notes"),
    updatedAt: optionalDate(raw, "updated_at", "updatedAt"),
  };
}

export function parseHomeDashboard(value: unknown): HomeDashboard {
  const raw = object(value);
  const property = object(raw.property);
  const capabilityRaw = object(raw.capabilities);
  const summaryRaw = object(raw.summary);
  const queues = object(raw.queues);
  const financeRaw = raw.finance === null || raw.finance === undefined
    ? null
    : object(raw.finance);
  const list = (candidate: unknown) =>
    Array.isArray(candidate) ? candidate : [];

  return {
    businessDate: date(property, "business_date", "businessDate"),
    timezone: text(property, "timezone") || "UTC",
    role: text(raw, "role") || "member",
    capabilities: {
      createBooking: boolean(capabilityRaw, "create_booking", "createBooking"),
      manageRooms: boolean(capabilityRaw, "manage_rooms", "manageRooms"),
      recordPayment: boolean(capabilityRaw, "record_payment", "recordPayment"),
      checkOut: boolean(capabilityRaw, "check_out", "checkOut"),
      updateBooking: boolean(capabilityRaw, "update_booking", "updateBooking"),
      viewFinance: boolean(capabilityRaw, "view_finance", "viewFinance"),
    },
    summary: {
      arrivalsDue: number(summaryRaw, "arrivals_due", "arrivalsDue"),
      attentionRooms: number(summaryRaw, "attention_rooms", "attentionRooms"),
      departuresDue: number(summaryRaw, "departures_due", "departuresDue"),
      occupiedRooms: number(summaryRaw, "occupied_rooms", "occupiedRooms"),
      overdueArrivals: number(summaryRaw, "overdue_arrivals", "overdueArrivals"),
      overdueDepartures: number(summaryRaw, "overdue_departures", "overdueDepartures"),
      readyRooms: number(summaryRaw, "ready_rooms", "readyRooms"),
      totalActiveRooms: number(summaryRaw, "total_active_rooms", "totalActiveRooms"),
    },
    arrivals: list(queues.arrivals).map(parseDashboardBooking),
    departures: list(queues.departures).map(parseDashboardBooking),
    housekeeping: list(queues.housekeeping).map(parseHousekeepingRoom),
    finance: financeRaw
      ? {
          todayCollected: number(financeRaw, "today_collected", "todayCollected"),
          todayPaymentCount: number(financeRaw, "today_payment_count", "todayPaymentCount"),
          outstandingBalance: number(financeRaw, "outstanding_balance", "outstandingBalance"),
          openBalanceCount: number(financeRaw, "open_balance_count", "openBalanceCount"),
        }
      : null,
  };
}
