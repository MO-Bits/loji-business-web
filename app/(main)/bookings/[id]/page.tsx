import { BookingDetailsScreen } from "@/components/bookings/booking-details-screen";

export default async function BookingDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BookingDetailsScreen bookingId={id} />;
}
