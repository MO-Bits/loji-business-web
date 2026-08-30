import { GuestEditScreen } from "@/components/guests/guest-edit-screen";

export default async function EditGuestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GuestEditScreen guestId={id} />;
}
