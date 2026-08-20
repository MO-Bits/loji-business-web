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
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const propertyId = session?.activePropertyId;
  const canManage = ["owner", "manager"].includes(session?.activeRole?.toLowerCase() ?? "");
  const refresh = useCallback(async () => { if (!propertyId) return; setLoading(true); setError(null); try { setRooms(await getRooms(client, propertyId)); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load rooms."); } finally { setLoading(false); } }, [client, propertyId]);
  useEffect(() => { const timer = window.setTimeout(() => void refresh(), 0); return () => window.clearTimeout(timer); }, [refresh]);
  const active = rooms.filter((room) => room.isActive).length;

  return <Container maxWidth="xl" sx={{ py: { xs: 2.5, sm: 3.25, lg: 4.5 } }}><Stack spacing={{ xs: 2.25, sm: 3, lg: 3.5 }}>
    <PageHeader eyebrow="Inventory" title="Rooms" description="Present, price and manage every room in your property." action={canManage ? <Button component={Link} href="/rooms/new" variant="contained" startIcon={<AddRoundedIcon />}>Add room</Button> : undefined} />
    {!loading && rooms.length > 0 && <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}><Chip label={`${rooms.length} total rooms`} variant="outlined" /><Chip label={`${active} active`} color="success" variant="outlined" />{rooms.length - active > 0 && <Chip label={`${rooms.length - active} inactive`} variant="outlined" />}</Stack>}
    {loading ? <Box sx={{ display: "grid", gap: { xs: 1.5, sm: 2.25 }, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)", lg: "repeat(3,1fr)", xl: "repeat(4,1fr)" } }}>{[0,1,2,3,4,5].map((item) => <Skeleton key={item} height={350} variant="rounded" />)}</Box> : error ? <Alert severity="error" action={<Button color="inherit" startIcon={<RefreshRoundedIcon />} onClick={() => void refresh()}>Retry</Button>}>{error}</Alert> : rooms.length === 0 ? <EmptyRooms canManage={canManage} /> : <Box sx={{ display: "grid", gap: { xs: 1.5, sm: 2.25 }, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))", lg: "repeat(3,minmax(0,1fr))", xl: "repeat(4,minmax(0,1fr))" } }}>{rooms.map((room) => <RoomCard key={room.id} room={room} />)}</Box>}
  </Stack></Container>;
}

function RoomCard({ room }: { room: Room }) {
  return <Paper component={Link} href={`/rooms/${room.id}`} variant="outlined" className="surface-hover" sx={{ borderRadius: 3.5, color: "inherit", display: "block", overflow: "hidden", textDecoration: "none" }}>
    <Box sx={{ aspectRatio: "16/10", bgcolor: "#EEF2F6", overflow: "hidden", position: "relative" }}>
      {room.images[0] ? <Box component="img" src={room.images[0]} alt={room.name} sx={{ height: "100%", objectFit: "cover", transition: "transform 300ms ease", width: "100%", ".surface-hover:hover &": { transform: "scale(1.035)" } }} /> : <Box sx={{ display: "grid", height: "100%", placeItems: "center" }}><BedRoundedIcon sx={{ color: "#A8B3BF", fontSize: 46 }} /></Box>}
      <Chip label={room.isActive ? "Available to sell" : "Inactive"} color={room.isActive ? "success" : "default"} size="small" sx={{ bgcolor: room.isActive ? "#EAF8F2" : "rgba(255,255,255,.92)", color: room.isActive ? "#087A54" : "text.primary", left: 14, position: "absolute", top: 14 }} />
      {room.images.length > 1 && <Chip label={`${room.images.length} photos`} size="small" sx={{ bgcolor: "rgba(17,24,39,.72)", color: "white", position: "absolute", right: 14, top: 14 }} />}
    </Box>
    <Stack spacing={1.1} sx={{ p: { xs: 2, sm: 2.25 } }}>
      <Box><Typography variant="h6" noWrap>{room.name}</Typography><Typography color="text.secondary" variant="body2" sx={{ textTransform: "capitalize" }}>{room.roomType}</Typography></Box>
      <Stack direction="row" spacing={2}><Typography color="text.secondary" variant="body2"><GroupRoundedIcon sx={{ fontSize: 17, mr: .5, verticalAlign: "text-bottom" }} />{room.capacity} guests</Typography><Typography color="text.secondary" variant="body2"><BedRoundedIcon sx={{ fontSize: 17, mr: .5, verticalAlign: "text-bottom" }} />{room.bedCount} beds</Typography></Stack>
      {room.amenities.length > 0 && <Typography color="text.secondary" noWrap variant="caption">{room.amenities.slice(0, 3).join(" · ")}{room.amenities.length > 3 ? ` · +${room.amenities.length - 3}` : ""}</Typography>}
      <Box sx={{ pt: .75 }}><Typography color="primary.dark" sx={{ fontSize: "1.12rem", fontWeight: 850 }}>{money.format(room.pricePerNight)} <Typography component="span" color="text.secondary" variant="caption">/ night</Typography></Typography></Box>
    </Stack>
  </Paper>;
}

function EmptyRooms({ canManage }: { canManage: boolean }) { return <Paper variant="outlined" sx={{ borderRadius: 3.5, py: 9, textAlign: "center" }}><Box sx={{ bgcolor: "#EAF3FF", borderRadius: "50%", color: "primary.main", display: "grid", height: 72, mx: "auto", placeItems: "center", width: 72 }}><BedRoundedIcon sx={{ fontSize: 34 }} /></Box><Typography variant="h6" sx={{ mt: 2 }}>Start building your room inventory</Typography><Typography color="text.secondary" sx={{ mb: 2, mt: .5 }}>Rooms, prices, photos and amenities will appear here.</Typography>{canManage && <Button component={Link} href="/rooms/new" variant="contained">Add your first room</Button>}</Paper>; }
