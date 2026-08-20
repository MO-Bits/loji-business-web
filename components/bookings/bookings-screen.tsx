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
import { formatLocalDate, localDateKey } from "@/lib/date-time";

const money = new Intl.NumberFormat("en-TZ", { style: "currency", currency: "TZS", maximumFractionDigits: 0 });
const statusColor = (status: string): "success" | "info" | "warning" | "default" => status === "checked_in" ? "success" : status === "confirmed" ? "info" : status === "reserved" ? "warning" : "default";

export function BookingsScreen() {
  const { session } = useAppSession();
  const client = useMemo(() => createClient(), []);
  const propertyId = session?.activePropertyId;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const refresh = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true); setError(null);
    try { setBookings(await getBookings(client, propertyId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load bookings."); }
    finally { setLoading(false); }
  }, [client, propertyId]);

  useEffect(() => { const timer = window.setTimeout(() => void refresh(), 0); return () => window.clearTimeout(timer); }, [refresh]);

  const today = localDateKey();
  const arrivals = bookings.filter((item) => localDateKey(item.checkIn) === today && item.status !== "cancelled").length;
  const departures = bookings.filter((item) => localDateKey(item.checkOut) === today && item.status !== "cancelled").length;
  const staying = bookings.filter((item) => item.status === "checked_in").reduce((sum, item) => sum + item.totalGuests, 0);
  const visible = bookings.filter((item) => {
    const matchesFilter = filter === "all" || item.status === filter;
    const needle = query.toLowerCase();
    return matchesFilter && (!needle || item.guestName.toLowerCase().includes(needle) || item.bookingNumber.toLowerCase().includes(needle) || item.phone.includes(query));
  });

  return <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4.5 } }}><Stack spacing={{ xs: 2.5, md: 3.5 }}>
    <PageHeader eyebrow="Reservations" title="Bookings" description="See every stay, arrival and guest in one organized workspace." action={<Button component={Link} href="/bookings/new" variant="contained" startIcon={<AddRoundedIcon />}>New booking</Button>} />

    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "repeat(3,minmax(0,1fr))", md: "repeat(3,minmax(190px,240px))" } }}>
      <Stat icon={<LoginRoundedIcon />} label="Arrivals today" value={arrivals} tone="#0B66D4" />
      <Stat icon={<LogoutRoundedIcon />} label="Departures today" value={departures} tone="#D35454" />
      <Stat icon={<PeopleRoundedIcon />} label="Guests staying" value={staying} tone="#0E9F6E" />
    </Box>

    <Paper variant="outlined" sx={{ borderRadius: 3.5, p: { xs: 2, sm: 2.5 } }}><Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
      <TextField placeholder="Search guest, booking number or phone" value={query} onChange={(event) => setQuery(event.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon color="action" /></InputAdornment> } }} />
      <TextField select value={filter} onChange={(event) => setFilter(event.target.value)} sx={{ minWidth: { sm: 210 } }}>{["all","confirmed","reserved","checked_in","checked_out","cancelled"].map((item) => <MenuItem key={item} value={item}>{item === "all" ? "All booking statuses" : bookingStatusLabel(item)}</MenuItem>)}</TextField>
    </Stack></Paper>

    {loading ? <Stack spacing={1.25}>{[0,1,2,3,4].map((item) => <Skeleton key={item} height={84} variant="rounded" />)}</Stack> : error ? <Alert severity="error" action={<Button color="inherit" startIcon={<RefreshRoundedIcon />} onClick={() => void refresh()}>Retry</Button>}>{error}</Alert> : visible.length === 0 ? <EmptyBookings /> : <BookingTable bookings={visible} />}
  </Stack></Container>;
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) {
  return <Paper variant="outlined" sx={{ borderRadius: 3.5, p: { xs: 1.5, sm: 2.25 } }}><Stack direction={{ xs: "column", sm: "row" }} spacing={1.3} alignItems={{ sm: "center" }}><Box sx={{ bgcolor: `${tone}14`, borderRadius: 2.25, color: tone, display: "grid", height: 42, placeItems: "center", width: 42 }}>{icon}</Box><Box><Typography sx={{ fontSize: "1.5rem", fontWeight: 820, letterSpacing: "-.04em", lineHeight: 1 }}>{value}</Typography><Typography color="text.secondary" variant="caption">{label}</Typography></Box></Stack></Paper>;
}

function BookingTable({ bookings }: { bookings: Booking[] }) {
  return <Paper variant="outlined" sx={{ borderRadius: 3.5, overflow: "hidden" }}>
    <Box sx={{ bgcolor: "#F7F9FB", borderBottom: "1px solid", borderColor: "divider", display: { xs: "none", md: "grid" }, gap: 2, gridTemplateColumns: "minmax(220px,1.3fr) minmax(160px,.8fr) minmax(190px,1fr) 120px 140px", px: 2.5, py: 1.4 }}><TableLabel>Guest</TableLabel><TableLabel>Room</TableLabel><TableLabel>Stay</TableLabel><TableLabel>Status</TableLabel><TableLabel align="right">Total</TableLabel></Box>
    {bookings.map((booking, index) => <BookingRow key={booking.id} booking={booking} last={index === bookings.length - 1} />)}
  </Paper>;
}

function TableLabel({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) { return <Typography color="text.secondary" sx={{ fontSize: ".7rem", fontWeight: 800, letterSpacing: ".08em", textAlign: align }}>{children}</Typography>; }

function BookingRow({ booking, last }: { booking: Booking; last: boolean }) {
  const initials = booking.guestName.split(/\s+/).slice(0,2).map((part) => part[0]).join("").toUpperCase();
  return <Box component={Link} href={`/bookings/${booking.id}`} sx={{ borderBottom: last ? 0 : "1px solid", borderColor: "divider", color: "inherit", display: { xs: "block", md: "grid" }, gap: 2, gridTemplateColumns: { md: "minmax(220px,1.3fr) minmax(160px,.8fr) minmax(190px,1fr) 120px 140px" }, px: { xs: 2, md: 2.5 }, py: { xs: 2, md: 1.6 }, textDecoration: "none", transition: "background 150ms ease", "&:hover": { bgcolor: "#F8FAFC" } }}>
    <Stack direction="row" spacing={1.4} alignItems="center"><Avatar sx={{ bgcolor: "#EAF3FF", color: "primary.dark", fontSize: ".78rem", height: 42, width: 42 }}>{initials || "G"}</Avatar><Box sx={{ minWidth: 0 }}><Typography noWrap sx={{ fontWeight: 780 }}>{booking.guestName}</Typography><Typography color="text.secondary" noWrap variant="caption">{booking.bookingNumber} · {booking.phone || "No phone"}</Typography></Box><Chip label={bookingStatusLabel(booking.status)} color={statusColor(booking.status)} size="small" sx={{ display: { xs: "inline-flex", md: "none" }, ml: "auto!important" }} /></Stack>
    <Box sx={{ display: { xs: "flex", md: "block" }, justifyContent: "space-between", mt: { xs: 1.5, md: 0 } }}><Typography variant="body2" sx={{ fontWeight: 700 }}>{booking.roomName}</Typography><Typography color="text.secondary" variant="caption" sx={{ textTransform: "capitalize" }}>{booking.roomType}</Typography></Box>
    <Box sx={{ mt: { xs: .8, md: 0 } }}><Typography variant="body2" sx={{ fontWeight: 650 }}>{formatLocalDate(booking.checkIn, { day: "numeric", month: "short" })} → {formatLocalDate(booking.checkOut, { day: "numeric", month: "short", year: "numeric" })}</Typography><Typography color="text.secondary" variant="caption">{booking.totalGuests} {booking.totalGuests === 1 ? "guest" : "guests"}</Typography></Box>
    <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center" }}><Chip label={bookingStatusLabel(booking.status)} color={statusColor(booking.status)} size="small" /></Box>
    <Box sx={{ alignSelf: "center", mt: { xs: 1.2, md: 0 }, textAlign: { md: "right" } }}><Typography sx={{ fontWeight: 800 }}>{money.format(booking.totalPrice)}</Typography>{booking.balanceDue > 0 && <Typography color="warning.main" variant="caption">{money.format(booking.balanceDue)} due</Typography>}</Box>
  </Box>;
}

function EmptyBookings() { return <Paper variant="outlined" sx={{ borderRadius: 3.5, py: 9, textAlign: "center" }}><Box sx={{ bgcolor: "#EAF3FF", borderRadius: "50%", color: "primary.main", display: "grid", height: 72, mx: "auto", placeItems: "center", width: 72 }}><EventAvailableRoundedIcon sx={{ fontSize: 34 }} /></Box><Typography variant="h6" sx={{ mt: 2 }}>No bookings found</Typography><Typography color="text.secondary" sx={{ mt: .5 }}>Try changing your filters or create a new reservation.</Typography></Paper>; }
