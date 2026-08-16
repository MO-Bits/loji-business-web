import { RoomForm } from "@/components/rooms/room-form";

export default async function EditRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RoomForm roomId={id} />;
}
