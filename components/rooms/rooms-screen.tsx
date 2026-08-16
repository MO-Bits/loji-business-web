"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { Alert, Box, Button, Chip, Container, Paper, Skeleton, Stack, Typography } from "@mui/material";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { createClient } from "@/lib/supabase/client";
import { getRooms } from "@/features/rooms/services/room-service";
import type { Room } from "@/features/rooms/models/room";
import { PageHeader } from "@/components/shared/page-header";

const money = new Intl.NumberFormat("en-TZ", { style: "currency", currency: "TZS", maximumFractionDigits: 0 });

export function RoomsScreen() {
  const { session } = useAppSession();
  const client = useMemo(() => createClient(), []);
  const [rooms, setRooms] = useState<Room[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const propertyId = session?.activePropertyId;
  const canManage = ["owner", "manager"].includes(session?.activeRole?.toLowerCase() ?? "");
  const refresh = useCallback(async () => { if (!propertyId) return; setLoading(true); setError(null); try { setRooms(await getRooms(client, propertyId)); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load rooms."); } finally { setLoading(false); } }, [client, propertyId]);
  useEffect(() => { const timer = window.setTimeout(() => void refresh(), 0); return () => window.clearTimeout(timer); }, [refresh]);

  return <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}><Stack spacing={{ xs: 2.5, md: 3.5 }}>
    <PageHeader eyebrow="Inventory" title="Rooms" description="Manage room inventory, prices and availability." action={canManage ? <Button component={Link} href="/rooms/new" variant="contained" startIcon={<AddRoundedIcon />}>Add room</Button> : undefined} />
    {loading ? <Stack spacing={2}>{[0,1,2].map((item) => <Skeleton key={item} height={150} variant="rounded" />)}</Stack> : error ? <Alert severity="error" action={<Button color="inherit" startIcon={<RefreshRoundedIcon />} onClick={() => void refresh()}>Retry</Button>}>{error}</Alert> : rooms.length === 0 ? <Paper variant="outlined" sx={{ py: 8, textAlign: "center" }}><BedRoundedIcon color="disabled" sx={{ fontSize: 56 }} /><Typography variant="h6" sx={{ mt: 2 }}>No rooms available</Typography><Typography color="text.secondary" sx={{ mb: 2 }}>Rooms belonging to this property will appear here.</Typography>{canManage && <Button component={Link} href="/rooms/new" variant="contained">Add your first room</Button>}</Paper> : <Stack spacing={2}>{rooms.map((room) => <RoomCard key={room.id} room={room} />)}</Stack>}
  </Stack></Container>;
}

function RoomCard({ room }: { room: Room }) {
  return <Paper component={Link} href={`/rooms/${room.id}`} variant="outlined" sx={{ color: "inherit", display: "grid", gridTemplateColumns: { xs: "110px 1fr", sm: "180px 1fr" }, overflow: "hidden", textDecoration: "none", transition: "border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease", "&:hover": { borderColor: "primary.main", boxShadow: "0 12px 32px rgba(16,24,40,.08)", transform: "translateY(-2px)" } }}>
    {room.images[0] ? <Box component="img" src={room.images[0]} alt={room.name} sx={{ height: "100%", minHeight: 145, objectFit: "cover", width: "100%" }} /> : <Box sx={{ bgcolor: "action.hover", display: "grid", placeItems: "center" }}><BedRoundedIcon color="disabled" /></Box>}
    <Stack spacing={1.2} sx={{ minWidth: 0, p: { xs: 2, sm: 2.5 } }}><Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}><Box sx={{ minWidth: 0 }}><Typography noWrap variant="h6">{room.name}</Typography><Typography color="text.secondary" sx={{ textTransform: "capitalize" }}>{room.roomType}</Typography></Box><Chip label={room.isActive ? "Active" : "Inactive"} color={room.isActive ? "success" : "default"} size="small" /></Stack><Stack direction="row" spacing={2}><Typography color="text.secondary" variant="body2"><GroupRoundedIcon sx={{ fontSize: 16, mr: .5, verticalAlign: "text-bottom" }} />{room.capacity} guests</Typography><Typography color="text.secondary" variant="body2"><BedRoundedIcon sx={{ fontSize: 16, mr: .5, verticalAlign: "text-bottom" }} />{room.bedCount} beds</Typography></Stack><Typography color="primary" sx={{ fontWeight: 850 }}>{money.format(room.pricePerNight)} <Typography component="span" color="text.secondary" variant="caption">/ night</Typography></Typography></Stack>
  </Paper>;
}
