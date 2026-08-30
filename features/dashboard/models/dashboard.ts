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
  amountPaid: number | null;
  balanceDue: number | null;
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
  propertyId: string;
  businessDate: Date;
  timezone: string;
  role: string;
  capabilities: DashboardCapabilities;
  summary: DashboardSummary;
  arrivals: DashboardBooking[];
  departures: DashboardBooking[];
  housekeeping: DashboardHousekeepingRoom[];
  queueLimit: number;
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

function optionalNumber(raw: Raw, ...keys: string[]) {
  for (const key of keys) {
    const value = raw[key];
    if (value === null || value === undefined || value === "") continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
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
  return Number.isNaN(parsed.getTime()) ? new Date(Number.NaN) : parsed;
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
    amountPaid: optionalNumber(raw, "amount_paid", "amountPaid"),
    balanceDue: optionalNumber(raw, "balance_due", "balanceDue"),
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
    notes: text(raw, "housekeeping_notes", "notes"),
    updatedAt: optionalDate(
      raw,
      "housekeeping_updated_at",
      "updated_at",
      "updatedAt",
    ),
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
  const role = text(raw, "role").trim().toLowerCase() || "member";
  const viewFinance =
    role === "owner" &&
    boolean(capabilityRaw, "view_finance", "viewFinance");
  const capabilities: DashboardCapabilities = {
    createBooking: boolean(capabilityRaw, "create_booking", "createBooking"),
    manageRooms: boolean(capabilityRaw, "manage_rooms", "manageRooms"),
    recordPayment:
      viewFinance &&
      boolean(capabilityRaw, "record_payment", "recordPayment"),
    checkOut: boolean(capabilityRaw, "check_out", "checkOut"),
    updateBooking: boolean(capabilityRaw, "update_booking", "updateBooking"),
    viewFinance,
  };
  const redactBookingFinance = (booking: DashboardBooking): DashboardBooking =>
    capabilities.viewFinance
      ? booking
      : {
          ...booking,
          amountPaid: null,
          balanceDue: null,
          paymentStatus: "",
        };

  return {
    propertyId: text(property, "id", "property_id", "propertyId"),
    businessDate: date(property, "business_date", "businessDate"),
    timezone: text(property, "timezone") || "UTC",
    role,
    capabilities,
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
    arrivals: list(queues.arrivals)
      .map(parseDashboardBooking)
      .filter((booking) => Boolean(booking.id))
      .map(redactBookingFinance),
    departures: list(queues.departures)
      .map(parseDashboardBooking)
      .filter((booking) => Boolean(booking.id))
      .map(redactBookingFinance),
    housekeeping: list(queues.housekeeping)
      .map(parseHousekeepingRoom)
      .filter((room) => {
        if (!room.id) return false;
        const housekeeping = room.housekeepingStatus.toLowerCase();
        const operational = room.operationalStatus.toLowerCase();
        return (
          housekeeping === "needs_cleaning" ||
          housekeeping === "cleaning" ||
          housekeeping === "out_of_service" ||
          operational === "maintenance" ||
          operational === "out_of_order" ||
          operational === "out_of_service"
        );
      }),
    queueLimit: number(queues, "limit") || 20,
    finance: capabilities.viewFinance && financeRaw
      ? {
          todayCollected: number(financeRaw, "today_collected", "todayCollected"),
          todayPaymentCount: number(financeRaw, "today_payment_count", "todayPaymentCount"),
          outstandingBalance: number(financeRaw, "outstanding_balance", "outstandingBalance"),
          openBalanceCount: number(financeRaw, "open_balance_count", "openBalanceCount"),
        }
      : null,
  };
}
