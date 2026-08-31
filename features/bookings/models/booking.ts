import type { Json } from "@/types/database.types";
import { parseDatabaseDate } from "@/lib/date-time";

export type BookingStatus =
  | "pending"
  | "reserved"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "no_show";
export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";

export type Booking = {
  id: string;
  bookingNumber: string;
  propertyId: string;
  roomId: string;
  guestId: string;
  checkIn: Date;
  checkOut: Date;
  checkedInAt: Date | null;
  checkedOutAt: Date | null;
  adults: number;
  children: number;
  totalGuests: number;
  totalPrice: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  bookingSource: string;
  specialRequests: string;
  createdAt: Date;
  updatedAt: Date | null;
  roomName: string;
  roomType: string;
  pricePerNight: number;
  guestName: string;
  gender: string;
  nationality: string;
  occupation: string;
  phone: string;
  email: string;
  whereFrom: string;
  whereTo: string;
  idType: string;
  idNumber: string;
  emergencyName: string;
  emergencyPhone: string;
  amountPaid: number;
  balanceDue: number;
  paymentCount: number;
  lastPaymentMethod: string;
  hasFinancials: boolean;
  isOverdue: boolean;
};

export type BookingSummary = {
  total: number;
  arrivals: number;
  inHouse: number;
  departures: number;
  attention: number;
};

export type BookingListResult = {
  bookings: Booking[];
  businessDate: string;
  capabilities: {
    createBooking: boolean;
    recordPayment: boolean;
    viewFinance: boolean;
  };
  hasMore: boolean;
  nextOffset: number | null;
  summary: BookingSummary;
};

export type BookingPayment = {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  entryType: "payment" | "refund" | "void";
  reference: string;
  notes: string;
  receivedBy: string;
  paidAt: Date;
  reversesPaymentId: string;
  reversalReason: string;
  approvedBy: string;
  canRefund: boolean;
  canVoid: boolean;
};

export type BookingActivity = {
  id: string;
  type: string;
  title: string;
  detail: string;
  actorName: string;
  createdAt: Date;
};

export type BookingAllowedActions = {
  confirm: boolean;
  checkIn: boolean;
  checkOut: boolean;
  cancel: boolean;
  noShow: boolean;
  reinstate: boolean;
  recordPayment: boolean;
  edit: boolean;
};

export type BookingWorkspace = {
  propertyId: string;
  businessDate: string;
  booking: Booking;
  canViewSettlement: boolean;
  payments: BookingPayment[];
  activity: BookingActivity[];
  allowedActions: BookingAllowedActions;
  requiresSettlement: boolean;
  blockedReason: string;
};

export type AvailableRoom = {
  id: string;
  name: string;
  roomType: string;
  capacity: number;
  bedCount: number;
  pricePerNight: number;
  totalPrice: number;
  nights: number;
  operationalStatus: string;
  amenities: string[];
  images: string[];
};

type Row = Record<string, Json | undefined>;
const asRow = (value: Json | undefined): Row =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};
const text = (value: Json | undefined) => (value == null ? "" : String(value));
const number = (value: Json | undefined) => Number(value ?? 0);
const nullableNumber = (value: Json | undefined) =>
  value == null || value === "" ? null : Number(value);
const boolean = (value: Json | undefined) => value === true;
const date = (value: Json | undefined) =>
  parseDatabaseDate(value == null ? null : String(value));
const optionalDate = (value: Json | undefined) =>
  value ? parseDatabaseDate(String(value)) : null;
const rows = (value: Json | undefined) =>
  Array.isArray(value) ? value.map((item) => asRow(item)) : [];

function bookingStatus(value: Json | undefined): BookingStatus {
  const status = text(value).toLowerCase();
  return ["pending", "reserved", "confirmed", "checked_in", "checked_out", "cancelled", "no_show"].includes(status)
    ? (status as BookingStatus)
    : "pending";
}

function paymentStatus(value: Json | undefined): PaymentStatus {
  const status = text(value).toLowerCase();
  return ["unpaid", "partial", "paid", "refunded"].includes(status)
    ? (status as PaymentStatus)
    : "unpaid";
}

export function parseBooking(row: Row): Booking {
  const guest = asRow(row.guest);
  const room = asRow(row.room);
  const guestCounts = asRow(row.guests);
  const settlement = asRow(row.settlement ?? row.finance ?? row.payment);
  const adults = number(row.adults ?? guestCounts.adults);
  const children = number(row.children ?? guestCounts.children);
  return {
    id: text(row.id ?? row.booking_id),
    bookingNumber: text(row.booking_number),
    propertyId: text(row.property_id),
    roomId: text(row.room_id ?? room.id),
    guestId: text(row.guest_id ?? guest.id),
    checkIn: date(row.check_in),
    checkOut: date(row.check_out),
    checkedInAt: optionalDate(row.checked_in_at),
    checkedOutAt: optionalDate(row.checked_out_at),
    adults,
    children,
    totalGuests:
      number(row.total_guests ?? guestCounts.total) || adults + children,
    totalPrice: nullableNumber(row.total_price ?? settlement.total) ?? 0,
    status: bookingStatus(row.status),
    paymentStatus: paymentStatus(row.payment_status ?? settlement.status),
    bookingSource: text(row.booking_source ?? row.source) || "Direct",
    specialRequests: text(row.special_requests),
    createdAt: date(row.created_at),
    updatedAt: optionalDate(row.updated_at),
    roomName: text(row.room_name ?? room.name),
    roomType: text(row.room_type ?? room.type ?? room.room_type),
    pricePerNight: nullableNumber(row.price_per_night ?? room.rate ?? room.price_per_night) ?? 0,
    guestName: text(row.guest_name ?? guest.name) || "Guest",
    gender: text(row.gender ?? guest.gender),
    nationality: text(row.nationality ?? guest.nationality),
    occupation: text(row.occupation ?? guest.occupation),
    phone: text(row.guest_phone ?? row.phone ?? guest.phone),
    email: text(row.guest_email ?? row.email ?? guest.email),
    whereFrom: text(row.where_from ?? guest.where_from),
    whereTo: text(row.where_to ?? guest.where_to),
    idType: text(row.id_type ?? guest.id_type),
    idNumber: text(row.id_number ?? guest.id_number),
    emergencyName: text(row.emergency_contact_name ?? guest.emergency_name ?? guest.emergency_contact_name),
    emergencyPhone: text(row.emergency_contact_phone ?? guest.emergency_phone ?? guest.emergency_contact_phone),
    amountPaid: nullableNumber(row.amount_paid ?? settlement.paid ?? settlement.amount_paid) ?? 0,
    balanceDue: nullableNumber(row.balance_due ?? settlement.balance ?? settlement.balance_due) ?? 0,
    paymentCount: nullableNumber(row.payment_count ?? settlement.payment_count) ?? 0,
    lastPaymentMethod: text(row.last_payment_method ?? settlement.last_payment_method),
    hasFinancials:
      row.total_price !== undefined ||
      row.amount_paid !== undefined ||
      row.balance_due !== undefined ||
      Object.keys(settlement).length > 0,
    isOverdue: boolean(row.is_overdue),
  };
}

export function parseBookingList(value: Json): BookingListResult {
  const root = asRow(value);
  const property = asRow(root.property);
  const capabilities = asRow(root.capabilities);
  const summary = asRow(root.summary);
  const page = asRow(root.page);
  const bookings = rows(root.items ?? root.bookings ?? root.data).map(parseBooking);
  const nextOffset = nullableNumber(page.next_offset ?? root.next_offset);
  return {
    bookings,
    businessDate: text(root.business_date ?? property.business_date),
    capabilities: {
      createBooking: boolean(capabilities.create_booking),
      recordPayment: boolean(capabilities.record_payment),
      viewFinance: boolean(capabilities.view_finance),
    },
    hasMore: boolean(page.has_more ?? root.has_more),
    nextOffset,
    summary: {
      total: number(summary.total ?? root.total_count) || bookings.length,
      arrivals: number(summary.arrivals_today ?? summary.arrivals),
      inHouse: number(summary.in_house ?? summary.checked_in),
      departures: number(summary.departures_today ?? summary.departures),
      attention:
        number(summary.attention ?? summary.needs_attention) ||
        number(summary.overdue_arrivals) + number(summary.overdue_departures),
    },
  };
}

export function parseBookingWorkspace(value: Json): BookingWorkspace | null {
  const root = asRow(value);
  const property = asRow(root.property);
  const bookingRow = asRow(root.booking ?? root.data);
  const guest = asRow(root.guest);
  const room = asRow(root.room);
  const settlement = asRow(root.settlement ?? bookingRow.settlement);
  const booking = parseBooking({
    ...bookingRow,
    property_id: property.id,
    guest,
    room,
    settlement,
  });
  if (!booking.id) return null;
  const lifecycle = asRow(root.lifecycle);
  const capabilities = asRow(root.capabilities);
  const allowedValue = root.allowed_actions ?? lifecycle.allowed_actions;
  const allowed = Array.isArray(allowedValue)
    ? allowedValue.map(String)
    : [];
  return {
    propertyId: text(property.id),
    businessDate: text(property.business_date ?? root.business_date),
    booking,
    canViewSettlement:
      boolean(capabilities.view_settlement) || booking.hasFinancials,
    payments: rows(root.payments).map((item) => ({
      id: text(item.id),
      amount: number(item.amount),
      currency: text(item.currency) || "TZS",
      method: text(item.method ?? item.payment_method),
      status: text(item.status ?? item.payment_status) || "completed",
      entryType: (["refund", "void"].includes(text(item.entry_type))
        ? text(item.entry_type)
        : "payment") as BookingPayment["entryType"],
      reference: text(item.reference ?? item.transaction_reference),
      notes: text(item.notes),
      receivedBy: text(item.received_by_name ?? item.received_by),
      paidAt: date(item.paid_at ?? item.created_at),
      reversesPaymentId: text(item.reverses_payment_id),
      reversalReason: text(item.reversal_reason),
      approvedBy: text(item.approved_by_name ?? item.approved_by),
      canRefund: boolean(item.can_refund),
      canVoid: boolean(item.can_void),
    })),
    activity: rows(root.activity ?? root.events).map((item, index) => {
      const actor = asRow(item.actor);
      const details = asRow(item.details ?? item.metadata);
      const eventType = text(item.event ?? item.type ?? item.event_type);
      return {
        id: text(item.id) || String(index),
        type: eventType,
        title: text(item.summary ?? item.title) || bookingStatusLabel(eventType),
        detail: text(item.detail ?? item.description ?? details.reason ?? details.action),
        actorName: text(item.actor_name ?? actor.name),
        createdAt: date(item.at ?? item.created_at),
      };
    }),
    allowedActions: {
      confirm: allowed.includes("confirm"),
      checkIn: allowed.includes("check_in"),
      checkOut: allowed.includes("check_out"),
      cancel: allowed.includes("cancel"),
      noShow: allowed.includes("mark_no_show"),
      reinstate: allowed.includes("reinstate"),
      recordPayment:
        allowed.includes("record_payment") || boolean(capabilities.record_payment),
      edit: allowed.includes("edit") || allowed.includes("update"),
    },
    requiresSettlement:
      boolean(lifecycle.requires_settlement) || (booking.balanceDue ?? 0) > 0,
    blockedReason: text(lifecycle.blocked_reason ?? root.blocked_reason),
  };
}

export function parseAvailableRoom(row: Row): AvailableRoom {
  const images = Array.isArray(row.images)
    ? row.images
        .map((item) =>
          typeof item === "string"
            ? item
            : item && typeof item === "object" && !Array.isArray(item)
              ? String(item.url ?? "")
              : "",
        )
        .filter(Boolean)
    : [];
  return {
    id: text(row.room_id ?? row.id),
    name: text(row.room_name ?? row.name),
    roomType: text(row.room_type),
    capacity: number(row.capacity),
    bedCount: number(row.bed_count),
    pricePerNight: number(row.price_per_night),
    totalPrice: number(row.total_price),
    nights: number(row.nights),
    operationalStatus: text(row.operational_status),
    amenities: Array.isArray(row.amenities) ? row.amenities.map(String) : [],
    images,
  };
}

export const bookingStatusLabel = (status: string) =>
  status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
