"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Avatar, Box, Button, Chip, Container, InputAdornment, MenuItem, Paper, Skeleton, Stack, TextField, Typography } from "@mui/material";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { createClient } from "@/lib/supabase/client";
import { getBookings } from "@/features/bookings/services/booking-service";
import { bookingStatusLabel, type Booking } from "@/features/bookings/models/booking";
import { PageHeader } from "@/components/shared/page-header";

const date = new Intl.DateTimeFormat("en-TZ", { day: "numeric", month: "short", year: "numeric" });
const statusColor = (status: string): "success" | "info" | "warning" | "default" => status === "checked_in" ? "success" : status === "confirmed" ? "info" : status === "reserved" ? "warning" : "default";

export function BookingsScreen() {
  const { session } = useAppSession(); const client = useMemo(() => createClient(), []); const propertyId = session?.activePropertyId;
  const [bookings, setBookings] = useState<Booking[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [query, setQuery] = useState(""); const [filter, setFilter] = useState("all");
  const refresh = useCallback(async () => { if (!propertyId) return; setLoading(true); setError(null); try { setBookings(await getBookings(client, propertyId)); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load bookings."); } finally { setLoading(false); } }, [client, propertyId]);
  useEffect(() => { const timer = window.setTimeout(() => void refresh(), 0); return () => window.clearTimeout(timer); }, [refresh]);
  const today = new Date().toISOString().slice(0, 10); const arrivals = bookings.filter((item) => item.checkIn.toISOString().slice(0, 10) === today && item.status !== "cancelled").length; const departures = bookings.filter((item) => item.checkOut.toISOString().slice(0, 10) === today && item.status !== "cancelled").length; const staying = bookings.filter((item) => item.status === "checked_in").reduce((sum, item) => sum + item.totalGuests, 0);
  const visible = bookings.filter((item) => { const matchesFilter = filter === "all" || item.status === filter; const needle = query.toLowerCase(); return matchesFilter && (!needle || item.guestName.toLowerCase().includes(needle) || item.bookingNumber.toLowerCase().includes(needle) || item.phone.includes(query)); });
  return <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}><Stack spacing={{ xs: 2.5, md: 3.5 }}><PageHeader eyebrow="Reservations" title="Bookings" description="Reservations, arrivals, guests and departures." action={<Button component={Link} href="/bookings/new" variant="contained" startIcon={<AddRoundedIcon />}>New booking</Button>} />
    <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "repeat(3, 1fr)", md: "repeat(3, minmax(160px, 220px))" } }}><Stat icon={<LoginRoundedIcon />} label="Arrivals" value={arrivals} /><Stat icon={<LogoutRoundedIcon />} label="Departures" value={departures} /><Stat icon={<PeopleRoundedIcon />} label="Staying" value={staying} /></Box>
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}><TextField fullWidth placeholder="Guest, booking number or phone" value={query} onChange={(e) => setQuery(e.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon /></InputAdornment> } }} /><TextField select value={filter} onChange={(e) => setFilter(e.target.value)} sx={{ minWidth: 180 }}>{["all","confirmed","reserved","checked_in","checked_out","cancelled"].map((item) => <MenuItem key={item} value={item}>{item === "all" ? "All statuses" : bookingStatusLabel(item)}</MenuItem>)}</TextField></Stack>
    {loading ? <Stack spacing={1.5}>{[0,1,2,3].map((item) => <Skeleton key={item} height={105} variant="rounded" />)}</Stack> : error ? <Alert severity="error" action={<Button color="inherit" startIcon={<RefreshRoundedIcon />} onClick={() => void refresh()}>Retry</Button>}>{error}</Alert> : visible.length === 0 ? <Paper variant="outlined" sx={{ py: 8, textAlign: "center" }}><EventAvailableRoundedIcon color="disabled" sx={{ fontSize: 52 }} /><Typography variant="h6" sx={{ mt: 1 }}>No bookings found</Typography><Typography color="text.secondary">Try changing the search or create a booking.</Typography></Paper> : <Stack spacing={1.5}>{visible.map((booking) => <BookingRow key={booking.id} booking={booking} />)}</Stack>}
  </Stack></Container>;
}
function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <Paper variant="outlined" sx={{ background: "linear-gradient(145deg, var(--mui-palette-background-paper), color-mix(in srgb, var(--mui-palette-primary-main) 3%, var(--mui-palette-background-paper)))", p: { xs: 1.5, sm: 2.25 } }}><Stack direction="row" spacing={1.2} sx={{ alignItems: "center" }}><Box sx={{ color: "primary.main", display: { xs: "none", sm: "block" } }}>{icon}</Box><Box><Typography sx={{ fontSize: "1.35rem", fontWeight: 850 }}>{value}</Typography><Typography color="text.secondary" variant="caption">{label}</Typography></Box></Stack></Paper>; }
function BookingRow({ booking }: { booking: Booking }) { const initials = booking.guestName.split(/\s+/).slice(0,2).map((part) => part[0]).join("").toUpperCase(); return <Paper component={Link} href={`/bookings/${booking.id}`} variant="outlined" sx={{ color: "inherit", display: "block", p: { xs: 1.75, sm: 2.25 }, textDecoration: "none", transition: "border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease", "&:hover": { borderColor: "primary.main", boxShadow: "0 10px 30px rgba(16,24,40,.07)", transform: "translateY(-1px)" } }}><Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}><Avatar sx={{ bgcolor: "primary.main" }}>{initials || "G"}</Avatar><Box sx={{ flex: 1, minWidth: 0 }}><Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}><Typography noWrap sx={{ fontWeight: 800 }}>{booking.guestName}</Typography><Chip label={bookingStatusLabel(booking.status)} color={statusColor(booking.status)} size="small" /></Stack><Typography color="text.secondary" noWrap variant="body2">{booking.bookingNumber} · {booking.roomName}</Typography><Typography color="text.secondary" variant="caption">{date.format(booking.checkIn)} → {date.format(booking.checkOut)} · {booking.totalGuests} guests</Typography></Box></Stack></Paper>; }
