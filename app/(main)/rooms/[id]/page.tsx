import { RoomDetails } from "@/components/rooms/room-details";

export default async function RoomDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RoomDetails roomId={id} />;
}
