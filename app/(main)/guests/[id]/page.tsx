import { GuestDetailsScreen } from "@/components/guests/guest-details-screen";

export default async function GuestDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GuestDetailsScreen guestId={id} />;
}
