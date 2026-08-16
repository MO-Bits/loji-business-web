import type { Json } from "@/types/database.types";

export type Booking = {
  id: string; bookingNumber: string; propertyId: string; roomId: string; guestId: string;
  checkIn: Date; checkOut: Date; checkedInAt: Date | null; checkedOutAt: Date | null;
  adults: number; children: number; totalGuests: number; totalPrice: number; status: string; paymentStatus: string; bookingSource: string; specialRequests: string;
  createdAt: Date; roomName: string; roomType: string; pricePerNight: number; guestName: string; gender: string; nationality: string; occupation: string; phone: string; email: string; whereFrom: string; whereTo: string; idType: string; idNumber: string; emergencyName: string; emergencyPhone: string; amountPaid: number; balanceDue: number; paymentCount: number; lastPaymentMethod: string;
};

const text = (value: Json | undefined) => value == null ? "" : String(value);
const number = (value: Json | undefined) => Number(value ?? 0);
const date = (value: Json | undefined) => new Date(String(value));
const optionalDate = (value: Json | undefined) => value ? new Date(String(value)) : null;

export function parseBooking(row: Record<string, Json | undefined>): Booking {
  return { id: text(row.id), bookingNumber: text(row.booking_number), propertyId: text(row.property_id), roomId: text(row.room_id), guestId: text(row.guest_id), checkIn: date(row.check_in), checkOut: date(row.check_out), checkedInAt: optionalDate(row.checked_in_at), checkedOutAt: optionalDate(row.checked_out_at), adults: number(row.adults), children: number(row.children), totalGuests: number(row.total_guests), totalPrice: number(row.total_price), status: text(row.status) || "pending", paymentStatus: text(row.payment_status) || "unpaid", bookingSource: text(row.booking_source), specialRequests: text(row.special_requests), createdAt: date(row.created_at), roomName: text(row.room_name), roomType: text(row.room_type), pricePerNight: number(row.price_per_night), guestName: text(row.guest_name), gender: text(row.gender), nationality: text(row.nationality), occupation: text(row.occupation), phone: text(row.guest_phone), email: text(row.guest_email), whereFrom: text(row.where_from), whereTo: text(row.where_to), idType: text(row.id_type), idNumber: text(row.id_number), emergencyName: text(row.emergency_contact_name), emergencyPhone: text(row.emergency_contact_phone), amountPaid: number(row.amount_paid), balanceDue: number(row.balance_due), paymentCount: number(row.payment_count), lastPaymentMethod: text(row.last_payment_method) };
}

export type AvailableRoom = { id: string; name: string; roomType: string; capacity: number; bedCount: number; pricePerNight: number; totalPrice: number; nights: number; operationalStatus: string; amenities: string[]; images: string[] };
export function parseAvailableRoom(row: Record<string, Json | undefined>): AvailableRoom {
  const images = Array.isArray(row.images) ? row.images.map((item) => typeof item === "string" ? item : item && typeof item === "object" && !Array.isArray(item) ? String(item.url ?? "") : "").filter(Boolean) : [];
  return { id: text(row.room_id), name: text(row.room_name), roomType: text(row.room_type), capacity: number(row.capacity), bedCount: number(row.bed_count), pricePerNight: number(row.price_per_night), totalPrice: number(row.total_price), nights: number(row.nights), operationalStatus: text(row.operational_status), amenities: Array.isArray(row.amenities) ? row.amenities.map(String) : [], images };
}

export const bookingStatusLabel = (status: string) => status.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
