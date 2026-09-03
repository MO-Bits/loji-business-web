import { parseDatabaseDate } from "@/lib/date-time";

export type GuestStayFilter =
  | "all"
  | "in_house"
  | "arriving"
  | "upcoming"
  | "past";

export type GuestCapabilities = {
  createBooking: boolean;
  updateGuest: boolean;
  viewFinance: boolean;
  viewGuests: boolean;
  viewSettlement: boolean;
};

export type GuestCommercial = {
  lifetimeBooked: number;
  totalCollected: number;
  outstandingBalance: number;
  averageStayValue: number;
};

export type GuestCurrentStay = {
  bookingId: string;
  bookingNumber: string;
  roomId: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  status: string;
};

export type GuestDirectoryItem = {
  id: string;
  name: string;
  phone: string;
  email: string;
  nationality: string;
  totalStays: number;
  completedStays: number;
  upcomingStays: number;
  lastStayDate: string | null;
  nextStayDate: string | null;
  currentStay: GuestCurrentStay | null;
  commercial: GuestCommercial | null;
};

export type GuestDirectorySummary = {
  totalGuests: number;
  inHouse: number;
  arrivingToday: number;
  upcoming: number;
  returning: number;
};

export type GuestDirectory = {
  propertyId: string;
  role: string;
  businessDate: string;
  capabilities: GuestCapabilities;
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  summary: GuestDirectorySummary;
  guests: GuestDirectoryItem[];
};

export type GuestProfile = {
  id: string;
  title: string;
  firstName: string;
  middleName: string;
  lastName: string;
  name: string;
  gender: string;
  dateOfBirth: string | null;
  phone: string;
  email: string;
  nationality: string;
  occupation: string;
  address: string;
  whereFrom: string;
  whereTo: string;
  idType: string;
  idNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes: string;
  propertyNotes: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type GuestUpdateInput = {
  firstName: string;
  lastName: string;
  gender: string;
  phone: string;
  email: string;
  nationality: string;
  occupation: string;
  address: string;
  whereFrom: string;
  whereTo: string;
  idType?: string;
  idNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  propertyNotes?: string;
  expectedUpdatedAt?: string;
};

export type GuestStaySettlement = {
  total: number;
  paid: number;
  balance: number;
  status: string;
};

export type GuestStay = {
  id: string;
  bookingNumber: string;
  roomId: string;
  roomName: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  status: string;
  guests: number;
  source: string;
  createdAt: string | null;
  settlement: GuestStaySettlement | null;
};

export type GuestActivity = {
  id: string;
  type: string;
  at: string | null;
  actorId: string;
  actorName: string;
  summary: string;
  metadata: Record<string, unknown>;
};

export type GuestWorkspaceSummary = {
  totalStays: number;
  totalNights: number;
  lastStayDate: string | null;
  nextStayDate: string | null;
  isInHouse: boolean;
};

export type GuestWorkspace = {
  propertyId: string;
  role: string;
  businessDate: string;
  capabilities: Omit<GuestCapabilities, "viewGuests">;
  guest: GuestProfile;
  summary: GuestWorkspaceSummary;
  stays: {
    current: GuestStay[];
    upcoming: GuestStay[];
    past: GuestStay[];
    pastLimit: number;
  };
  activity: GuestActivity[];
  commercial: GuestCommercial | null;
};

type Raw = Record<string, unknown>;

function object(value: unknown): Raw {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Raw)
    : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(raw: Raw, ...keys: string[]): string {
  for (const key of keys) {
    const value = raw[key];
    if (value !== null && value !== undefined) return String(value);
  }
  return "";
}

function number(raw: Raw, ...keys: string[]): number {
  for (const key of keys) {
    if (raw[key] === null || raw[key] === undefined) continue;
    const parsed = Number(raw[key]);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function boolean(raw: Raw, ...keys: string[]): boolean {
  for (const key of keys) {
    const value = raw[key];
    if (value === true || value === "true" || value === 1) return true;
    if (value === false || value === "false" || value === 0) return false;
  }
  return false;
}

function nullableDate(raw: Raw, ...keys: string[]): string | null {
  const value = text(raw, ...keys);
  if (!value) return null;
  const parsed = parseDatabaseDate(value);
  return Number.isNaN(parsed.getTime()) ? null : value;
}

function parseCapabilities(value: unknown): GuestCapabilities {
  const raw = object(value);
  const viewFinance = boolean(raw, "view_finance", "viewFinance");
  const viewSettlement =
    raw.view_settlement === undefined && raw.viewSettlement === undefined
      ? viewFinance
      : boolean(raw, "view_settlement", "viewSettlement");
  return {
    createBooking: boolean(raw, "create_booking", "createBooking"),
    updateGuest: boolean(raw, "update_guest", "updateGuest"),
    viewFinance,
    viewGuests:
      raw.view_guests === undefined && raw.viewGuests === undefined
        ? true
        : boolean(raw, "view_guests", "viewGuests"),
    viewSettlement,
  };
}

function parseCommercial(value: unknown): GuestCommercial | null {
  if (value === null || value === undefined) return null;
  const raw = object(value);
  if (!Object.keys(raw).length) return null;
  return {
    lifetimeBooked: number(raw, "lifetime_booked", "lifetimeBooked"),
    totalCollected: number(raw, "total_collected", "totalCollected"),
    outstandingBalance: number(
      raw,
      "outstanding_balance",
      "outstandingBalance",
    ),
    averageStayValue: number(raw, "average_stay_value", "averageStayValue"),
  };
}

function parseCurrentStay(value: unknown): GuestCurrentStay | null {
  if (value === null || value === undefined) return null;
  const raw = object(value);
  const bookingId = text(raw, "booking_id", "bookingId", "id");
  if (!bookingId) return null;
  return {
    bookingId,
    bookingNumber: text(raw, "booking_number", "bookingNumber"),
    roomId: text(raw, "room_id", "roomId"),
    roomName: text(raw, "room_name", "roomName") || "Room",
    checkIn: text(raw, "check_in", "checkIn"),
    checkOut: text(raw, "check_out", "checkOut"),
    status: text(raw, "status").toLowerCase(),
  };
}

function parseDirectoryGuest(value: unknown): GuestDirectoryItem {
  const raw = object(value);
  return {
    id: text(raw, "id", "guest_id", "guestId"),
    name: text(raw, "name", "guest_name", "guestName") || "Guest",
    phone: text(raw, "phone"),
    email: text(raw, "email"),
    nationality: text(raw, "nationality"),
    totalStays: number(raw, "total_stays", "totalStays"),
    completedStays: number(raw, "completed_stays", "completedStays"),
    upcomingStays: number(raw, "upcoming_stays", "upcomingStays"),
    lastStayDate: nullableDate(raw, "last_stay_date", "lastStayDate"),
    nextStayDate: nullableDate(raw, "next_stay_date", "nextStayDate"),
    currentStay: parseCurrentStay(raw.current_stay ?? raw.currentStay),
    commercial: parseCommercial(raw.commercial),
  };
}

export function parseGuestDirectory(value: unknown): GuestDirectory {
  const raw = object(value);
  const property = object(raw.property);
  const summary = object(raw.summary);
  const capabilities = parseCapabilities(raw.capabilities);
  const guests = list(raw.guests).map(parseDirectoryGuest);
  const pageSize = Math.max(1, number(raw, "page_size", "pageSize") || 25);
  const page = Math.max(1, number(raw, "page") || 1);
  const total = Math.max(0, number(raw, "total"));

  return {
    propertyId:
      text(raw, "property_id", "propertyId") || text(property, "id"),
    role: text(raw, "role") || "member",
    businessDate:
      text(raw, "business_date", "businessDate") ||
      text(property, "business_date", "businessDate"),
    capabilities,
    total,
    page,
    pageSize,
    hasMore:
      raw.has_more === undefined && raw.hasMore === undefined
        ? page * pageSize < total
        : boolean(raw, "has_more", "hasMore"),
    summary: {
      totalGuests: number(summary, "total_guests", "totalGuests"),
      inHouse: number(summary, "in_house", "inHouse"),
      arrivingToday: number(
        summary,
        "arriving_today",
        "arrivingToday",
      ),
      upcoming: number(summary, "upcoming"),
      returning: number(summary, "returning"),
    },
    guests: capabilities.viewFinance
      ? guests
      : guests.map((guest) => ({ ...guest, commercial: null })),
  };
}

function parseGuestProfile(value: unknown): GuestProfile {
  const raw = object(value);
  const firstName = text(raw, "first_name", "firstName");
  const middleName = text(raw, "middle_name", "middleName");
  const lastName = text(raw, "last_name", "lastName");
  return {
    id: text(raw, "id", "guest_id", "guestId"),
    title: text(raw, "title"),
    firstName,
    middleName,
    lastName,
    name:
      text(raw, "name", "guest_name", "guestName") ||
      [firstName, middleName, lastName].filter(Boolean).join(" ") ||
      "Guest",
    gender: text(raw, "gender"),
    dateOfBirth: nullableDate(raw, "date_of_birth", "dateOfBirth"),
    phone: text(raw, "phone"),
    email: text(raw, "email"),
    nationality: text(raw, "nationality"),
    occupation: text(raw, "occupation"),
    address: text(raw, "address"),
    whereFrom: text(raw, "where_from", "whereFrom"),
    whereTo: text(raw, "where_to", "whereTo"),
    idType: text(raw, "id_type", "idType"),
    idNumber: text(raw, "id_number", "idNumber"),
    emergencyContactName: text(
      raw,
      "emergency_contact_name",
      "emergencyContactName",
    ),
    emergencyContactPhone: text(
      raw,
      "emergency_contact_phone",
      "emergencyContactPhone",
    ),
    notes: text(raw, "notes"),
    propertyNotes: text(raw, "property_notes", "propertyNotes"),
    createdAt: nullableDate(raw, "created_at", "createdAt"),
    updatedAt: nullableDate(raw, "updated_at", "updatedAt"),
  };
}

function parseStay(value: unknown): GuestStay {
  const raw = object(value);
  const room = object(raw.room);
  const settlement = raw.settlement === null || raw.settlement === undefined
    ? null
    : object(raw.settlement);
  return {
    id: text(raw, "id", "booking_id", "bookingId"),
    bookingNumber: text(raw, "booking_number", "bookingNumber"),
    roomId: text(room, "id") || text(raw, "room_id", "roomId"),
    roomName:
      text(room, "name") || text(raw, "room_name", "roomName") || "Room",
    roomType: text(room, "type") || text(raw, "room_type", "roomType"),
    checkIn: text(raw, "check_in", "checkIn"),
    checkOut: text(raw, "check_out", "checkOut"),
    status: text(raw, "status").toLowerCase(),
    guests: number(raw, "guests", "total_guests", "totalGuests"),
    source: text(raw, "source", "booking_source", "bookingSource"),
    createdAt: nullableDate(raw, "created_at", "createdAt"),
    settlement: settlement
      ? {
          total: number(settlement, "total", "total_price", "totalPrice"),
          paid: number(settlement, "paid", "amount_paid", "amountPaid"),
          balance: number(
            settlement,
            "balance",
            "balance_due",
            "balanceDue",
          ),
          status: text(settlement, "status", "payment_status", "paymentStatus"),
        }
      : null,
  };
}

function parseActivity(value: unknown, index: number): GuestActivity {
  const raw = object(value);
  const actor = object(raw.actor);
  return {
    id: text(raw, "id") || `activity-${index}`,
    type: text(raw, "type", "event_type", "eventType"),
    at: nullableDate(raw, "at", "created_at", "createdAt"),
    actorId: text(actor, "id"),
    actorName: text(actor, "name"),
    summary: text(raw, "summary", "description"),
    metadata: object(raw.metadata),
  };
}

export function parseGuestWorkspace(value: unknown): GuestWorkspace {
  const raw = object(value);
  const property = object(raw.property);
  const summary = object(raw.summary);
  const stays = object(raw.stays);
  const capabilities = parseCapabilities(raw.capabilities);
  const commercial = capabilities.viewFinance
    ? parseCommercial(raw.commercial)
    : null;
  const currentStays = list(stays.current).map(parseStay);
  const upcomingStays = list(stays.upcoming).map(parseStay);
  const pastStays = list(stays.past).map(parseStay);
  const redactSettlement = (items: GuestStay[]) =>
    capabilities.viewSettlement
      ? items
      : items.map((stay) => ({ ...stay, settlement: null }));

  return {
    propertyId:
      text(raw, "property_id", "propertyId") || text(property, "id"),
    role: text(raw, "role") || "member",
    businessDate:
      text(raw, "business_date", "businessDate") ||
      text(property, "business_date", "businessDate"),
    capabilities: {
      createBooking: capabilities.createBooking,
      updateGuest: capabilities.updateGuest,
      viewFinance: capabilities.viewFinance,
      viewSettlement: capabilities.viewSettlement,
    },
    guest: parseGuestProfile(raw.guest),
    summary: {
      totalStays: number(summary, "total_stays", "totalStays"),
      totalNights: number(summary, "total_nights", "totalNights"),
      lastStayDate: nullableDate(summary, "last_stay_date", "lastStayDate"),
      nextStayDate: nullableDate(summary, "next_stay_date", "nextStayDate"),
      isInHouse: boolean(summary, "is_in_house", "isInHouse"),
    },
    stays: {
      current: redactSettlement(currentStays),
      upcoming: redactSettlement(upcomingStays),
      past: redactSettlement(pastStays),
      pastLimit: number(stays, "past_limit", "pastLimit") || 20,
    },
    activity: list(raw.activity).map(parseActivity),
    commercial,
  };
}

export function guestInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "G";
}

export function guestDirectoryStatus(
  guest: GuestDirectoryItem,
): "in_house" | "upcoming" | "returning" | "past" {
  if (guest.currentStay) return "in_house";
  if (guest.upcomingStays > 0 || guest.nextStayDate) return "upcoming";
  if (guest.completedStays > 1 || guest.totalStays > 1) return "returning";
  return "past";
}
