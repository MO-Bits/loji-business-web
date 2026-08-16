"use client";

import { useState } from "react";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Avatar, Box, Button, Chip, Container, Divider, IconButton, Paper, Skeleton, Stack, Typography } from "@mui/material";
import { useHomeDashboard } from "@/features/dashboard/hooks/use-home-dashboard";
import type { DashboardBooking, DashboardRoom } from "@/features/dashboard/models/dashboard";
import { useAppSession } from "@/features/session/hooks/use-app-session";

const money = new Intl.NumberFormat("en-TZ", { style: "currency", currency: "TZS", maximumFractionDigits: 0 });

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "G";
}

function statusLabel(status: string) {
  return status.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function propertyImage(property: Record<string, unknown> | null | undefined) {
  if (!property || !Array.isArray(property.images) || !property.images.length) return undefined;
  const first = property.images[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && "url" in first) return String((first as { url?: unknown }).url ?? "") || undefined;
  return undefined;
}

export function DashboardScreen() {
  const sessionState = useAppSession();
  const { dashboard, loading, error, refresh } = useHomeDashboard(sessionState.session?.activePropertyId);
  const property = sessionState.session?.property as Record<string, unknown> | null | undefined;
  const propertyName = typeof property?.name === "string" ? property.name : "Dashboard";

  if (sessionState.loading || loading) return <DashboardSkeleton />;
  if (sessionState.error || error || !dashboard) return <DashboardError message={(sessionState.error || error)?.message} onRetry={() => { void sessionState.refresh(); void refresh(); }} />;

  const now = new Date();
  return (
    <Box sx={{ minHeight: "100dvh", pb: 5 }}>
      <Box sx={{ bgcolor: "#14345B", color: "white", py: { xs: 1.5, md: 2 } }}>
        <Container maxWidth="xl"><Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0 }}><Avatar src={propertyImage(property)} sx={{ bgcolor: "rgba(255,255,255,.16)", border: "1px solid rgba(255,255,255,.25)" }}><HotelRoundedIcon /></Avatar><Typography variant="h6" noWrap>{propertyName}</Typography></Stack>
          <IconButton aria-label="More" onClick={() => window.location.assign("/rooms")} sx={{ color: "white" }}><MoreHorizRoundedIcon /></IconButton>
        </Stack></Container>
      </Box>

      <Container maxWidth="xl" sx={{ pt: { xs: 3, md: 4 } }}>
        <Stack spacing={3}>
          <Box><Typography color="primary" sx={{ fontSize: ".78rem", fontWeight: 800, letterSpacing: ".12em" }}>{now.toLocaleDateString("en-TZ", { weekday: "long" }).toUpperCase()}</Typography><Typography variant="h4" sx={{ mt: .4 }}>{now.toLocaleDateString("en-TZ", { day: "numeric", month: "long", year: "numeric" })}</Typography></Box>

          <StatGrid arrivals={dashboard.arrivals} departures={dashboard.departures} guests={dashboard.stayingGuests} rooms={dashboard.availableRooms} />

          <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.25fr) minmax(320px, .75fr)" } }}>
            <Stack spacing={3}>
              <QuickActions />
              <BookingSection title="Current Guests" color="#2E7D32" icon={<GroupsRoundedIcon />} bookings={dashboard.currentGuests} empty="No guests currently staying" />
              <BookingSection title="Today's Arrivals" color="#1976D2" icon={<LoginRoundedIcon />} bookings={dashboard.todayArrivals} empty="No arrivals scheduled today" />
              <BookingSection title="Today's Departures" color="#D32F2F" icon={<LogoutRoundedIcon />} bookings={dashboard.todayDepartures} empty="No departures scheduled today" />
            </Stack>
            <Stack spacing={3}>
              <FinanceCard revenue={dashboard.todayRevenue} outstanding={dashboard.totalOutstanding} />
              <RoomSection rooms={dashboard.availableRoomsList} />
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

function StatGrid({ arrivals, departures, guests, rooms }: { arrivals: number; departures: number; guests: number; rooms: number }) {
  const items = [
    [ArrowForwardRoundedIcon, "Arrivals", arrivals, "#1976D2"], [ArrowBackRoundedIcon, "Departures", departures, "#D32F2F"],
    [GroupsRoundedIcon, "Staying Guests", guests, "#2E7D32"], [BedRoundedIcon, "Available Rooms", rooms, "#ED6C02"],
  ] as const;
  return <Paper variant="outlined" sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, overflow: "hidden" }}>{items.map(([Icon, title, value, color], index) => <Stack key={title} direction="row" spacing={1.5} sx={{ alignItems: "center", borderBottom: { xs: index < 2 ? 1 : 0, md: 0 }, borderColor: "divider", borderRight: { xs: index % 2 === 0 ? 1 : 0, md: index < 3 ? 1 : 0 }, p: { xs: 2, md: 2.5 } }}><Box sx={{ bgcolor: `${color}18`, borderRadius: 2.5, color, display: "grid", flexShrink: 0, height: 42, placeItems: "center", width: 42 }}><Icon fontSize="small" /></Box><Box sx={{ minWidth: 0 }}><Typography sx={{ fontSize: "1.35rem", fontWeight: 800, lineHeight: 1.1 }}>{value}</Typography><Typography color="text.secondary" noWrap variant="caption">{title}</Typography></Box></Stack>)}</Paper>;
}

function SectionHeader({ title, count, color, icon }: { title: string; count?: number; color: string; icon: React.ReactNode }) {
  return <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}><Stack direction="row" spacing={1.2} sx={{ alignItems: "center" }}><Box sx={{ bgcolor: `${color}18`, borderRadius: 2, color, display: "grid", height: 36, placeItems: "center", width: 36 }}>{icon}</Box><Typography variant="h6" sx={{ fontSize: "1rem" }}>{title}</Typography></Stack>{count !== undefined && <Chip label={count} size="small" sx={{ bgcolor: `${color}18`, color, fontWeight: 800 }} />}</Stack>;
}

function QuickActions() {
  return <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 } }}><SectionHeader title="Quick Actions" color="#1E88E5" icon={<BoltRoundedIcon fontSize="small" />} /><Divider sx={{ my: 2 }} /><Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}><Button fullWidth variant="contained" startIcon={<AddCircleOutlineRoundedIcon />} onClick={() => window.location.assign("/bookings/new")}>New Booking</Button><Button fullWidth variant="outlined" startIcon={<SearchRoundedIcon />} onClick={() => window.location.assign("/bookings")}>Search Booking</Button></Stack></Paper>;
}

function FinanceCard({ revenue, outstanding }: { revenue: number; outstanding: number }) {
  return <Paper variant="outlined" sx={{ p: 3 }}><SectionHeader title="Financial Overview" color="#2E7D32" icon={<PaymentsRoundedIcon fontSize="small" />} /><Divider sx={{ my: 2 }} /><Stack spacing={2}><FinanceItem label="Collected Today" value={revenue} color="#2E7D32" /><FinanceItem label="Outstanding" value={outstanding} color="#ED6C02" /></Stack></Paper>;
}

function FinanceItem({ label, value, color }: { label: string; value: number; color: string }) {
  return <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}><Avatar sx={{ bgcolor: `${color}18`, color }}><PaymentsRoundedIcon fontSize="small" /></Avatar><Box><Typography sx={{ fontSize: "1.12rem", fontWeight: 800 }}>{money.format(value)}</Typography><Typography color="text.secondary" variant="caption">{label}</Typography></Box></Stack>;
}

function BookingSection({ title, color, icon, bookings, empty }: { title: string; color: string; icon: React.ReactNode; bookings: DashboardBooking[]; empty: string }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? bookings : bookings.slice(0, 5);
  return <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 } }}><SectionHeader title={title} count={bookings.length} color={color} icon={icon} /><Divider sx={{ my: 2 }} />{bookings.length === 0 ? <EmptyState text={empty} /> : <Stack spacing={1}>{visible.map((booking) => <BookingTile key={booking.id} booking={booking} color={color} />)}{bookings.length > 5 && <Button onClick={() => setShowAll((value) => !value)}>{showAll ? "Show less" : "See all"}</Button>}</Stack>}</Paper>;
}

function BookingTile({ booking, color }: { booking: DashboardBooking; color: string }) {
  return <Button color="inherit" onClick={() => window.location.assign("/bookings")} sx={{ borderRadius: 2.5, justifyContent: "flex-start", p: 1.25, textAlign: "left" }}><Avatar sx={{ bgcolor: `${color}18`, color, fontSize: ".82rem", fontWeight: 800, mr: 1.5 }}>{initials(booking.guestName)}</Avatar><Box sx={{ flex: 1, minWidth: 0 }}><Typography noWrap sx={{ fontWeight: 750 }}>{booking.guestName}</Typography><Typography color="text.secondary" noWrap variant="caption">{booking.roomName}{booking.roomType ? ` · ${booking.roomType}` : ""}</Typography></Box><Chip label={statusLabel(booking.status)} size="small" sx={{ ml: 1 }} /></Button>;
}

function RoomSection({ rooms }: { rooms: DashboardRoom[] }) {
  return <Paper variant="outlined" sx={{ p: 3 }}><SectionHeader title="Available Rooms" count={rooms.length} color="#1E88E5" icon={<HotelRoundedIcon fontSize="small" />} /><Divider sx={{ my: 2 }} />{rooms.length === 0 ? <EmptyState text="No available rooms" /> : <Stack spacing={1.5}>{rooms.map((room) => <RoomCard key={room.id} room={room} />)}</Stack>}</Paper>;
}

function RoomCard({ room }: { room: DashboardRoom }) {
  return <Paper variant="outlined" sx={{ cursor: "pointer", overflow: "hidden" }} onClick={() => window.location.assign("/rooms")}><Box sx={{ display: "grid", gridTemplateColumns: room.images[0] ? "96px 1fr" : "1fr" }}>{room.images[0] && <Box component="img" src={room.images[0]} alt={room.name} sx={{ height: "100%", minHeight: 105, objectFit: "cover", width: 96 }} />}<Stack spacing={.8} sx={{ minWidth: 0, p: 1.5 }}><Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}><Typography noWrap sx={{ fontWeight: 750 }}>{room.name}</Typography><Chip label="Active" color="success" size="small" /></Stack><Typography color="text.secondary" variant="caption">{room.roomType} · {room.capacity} guests · {room.bedCount} beds</Typography><Typography color="primary" sx={{ fontWeight: 800 }}>{money.format(room.pricePerNight)} <Typography component="span" color="text.secondary" variant="caption">/ night</Typography></Typography></Stack></Box></Paper>;
}

function EmptyState({ text }: { text: string }) {
  return <Box sx={{ bgcolor: "action.hover", borderRadius: 2.5, p: 3, textAlign: "center" }}><Typography color="text.secondary">{text}</Typography></Box>;
}

function DashboardSkeleton() {
  return <Container maxWidth="xl" sx={{ py: 4 }}><Stack spacing={3}><Skeleton height={72} variant="rounded" /><Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" } }}>{[0, 1, 2, 3].map((item) => <Skeleton key={item} height={100} variant="rounded" />)}</Box><Skeleton height={180} variant="rounded" /><Skeleton height={300} variant="rounded" /></Stack></Container>;
}

function DashboardError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return <Container maxWidth="sm" sx={{ py: 10 }}><Alert severity="error" action={<Button color="inherit" startIcon={<RefreshRoundedIcon />} onClick={onRetry}>Retry</Button>}><Typography sx={{ fontWeight: 700 }}>Unable to load dashboard data</Typography>{message && <Typography variant="caption">{message}</Typography>}</Alert></Container>;
}
