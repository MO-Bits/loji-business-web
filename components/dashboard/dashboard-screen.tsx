"use client";

import { useState } from "react";
import Link from "next/link";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { useHomeDashboard } from "@/features/dashboard/hooks/use-home-dashboard";
import type {
  DashboardBooking,
  DashboardRoom,
} from "@/features/dashboard/models/dashboard";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { formatLocalDate } from "@/lib/date-time";

const money = new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
});

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "G"
  );
}
function statusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
function propertyImage(property: Record<string, unknown> | null | undefined) {
  if (!property || !Array.isArray(property.images) || !property.images.length)
    return undefined;
  const first = property.images[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && "url" in first)
    return String((first as { url?: unknown }).url ?? "") || undefined;
  return undefined;
}

export function DashboardScreen() {
  const sessionState = useAppSession();
  const { dashboard, loading, error, refresh } = useHomeDashboard(
    sessionState.session?.activePropertyId,
  );
  const property = sessionState.session?.property as
    | Record<string, unknown>
    | null
    | undefined;
  const propertyName =
    typeof property?.name === "string" ? property.name : "Your property";
  const cover = propertyImage(property);

  if (sessionState.loading || loading) return <DashboardSkeleton />;
  if (sessionState.error || error || !dashboard)
    return (
      <DashboardError
        message={(sessionState.error || error)?.message}
        onRetry={() => {
          void sessionState.refresh();
          void refresh();
        }}
      />
    );

  const now = new Date();
  const occupancy =
    dashboard.totalRooms > 0
      ? Math.round(
          ((dashboard.totalRooms - dashboard.availableRooms) /
            dashboard.totalRooms) *
            100,
        )
      : 0;

  return (
    <Box sx={{ minHeight: "100dvh", pb: 6 }}>
      <Container maxWidth="xl" sx={{ pt: { xs: 2.25, sm: 3, lg: 4 } }}>
        <Stack spacing={{ xs: 2.25, sm: 3, lg: 3.5 }}>
          <Paper
            sx={{
              borderRadius: 1,
              color: "white",
              minHeight: { xs: 210, md: 230 },
              overflow: "hidden",
              position: "relative",
              background: cover
                ? `linear-gradient(90deg, rgba(5,36,78,.94), rgba(5,36,78,.72)), url(${cover}) center/cover`
                : "linear-gradient(135deg, #073E86 0%, #0B66D4 62%, #2D8BE8 100%)",
            }}
          >
            <Box
              sx={{
                height: "100%",
                p: { xs: 2.25, sm: 3.25, lg: 4.5 },
                position: "relative",
              }}
            >
              <Stack
                direction={{ xs: "column", lg: "row" }}
                spacing={{ xs: 2.5, lg: 3 }}
                sx={{
                  alignItems: { lg: "flex-end" },
                  justifyContent: "space-between",
                  minHeight: { lg: 140 },
                }}
              >
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CalendarTodayRoundedIcon
                      sx={{ fontSize: 17, opacity: 0.8 }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        letterSpacing: ".08em",
                        opacity: 0.84,
                      }}
                    >
                      {now
                        .toLocaleDateString("en-TZ", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })
                        .toUpperCase()}
                    </Typography>
                  </Stack>
                  <Typography
                    variant="h3"
                    sx={{ color: "white", mt: 2, maxWidth: 680 }}
                  >
                    Good day at {propertyName}
                  </Typography>
                  <Typography sx={{ mt: 1, opacity: 0.78 }}>
                    Everything your team needs for today’s stays, rooms and
                    payments.
                  </Typography>
                </Box>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.25}
                  sx={{
                    width: { xs: "100%", lg: "auto" },
                    "& .MuiButton-root": { flex: 1, whiteSpace: "nowrap" },
                  }}
                >
                  <Button
                    component={Link}
                    href="/bookings"
                    variant="outlined"
                    startIcon={<SearchRoundedIcon />}
                    sx={{
                      bgcolor: "rgba(255,255,255,.08)",
                      borderColor: "rgba(255,255,255,.45)",
                      color: "white",
                      "&:hover": {
                        bgcolor: "rgba(255,255,255,.14)",
                        borderColor: "white",
                      },
                    }}
                  >
                    Find booking
                  </Button>
                  <Button
                    component={Link}
                    href="/bookings/new"
                    variant="contained"
                    startIcon={<AddRoundedIcon />}
                    sx={{
                      bgcolor: "white",
                      color: "#074A9E",
                      "&:hover": { bgcolor: "#F2F7FF" },
                    }}
                  >
                    New booking
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Paper>

          <Box
            sx={{
              display: "grid",
              gap: { xs: 1.5, sm: 2 },
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0,1fr))",
                xl: "repeat(4, minmax(0,1fr))",
              },
            }}
          >
            <MetricCard
              icon={<LoginRoundedIcon />}
              label="Arrivals today"
              value={dashboard.arrivals}
              tone="#0B66D4"
              detail="Expected check-ins"
            />
            <MetricCard
              icon={<LogoutRoundedIcon />}
              label="Departures today"
              value={dashboard.departures}
              tone="#D35454"
              detail="Expected check-outs"
            />
            <MetricCard
              icon={<GroupsRoundedIcon />}
              label="Guests staying"
              value={dashboard.stayingGuests}
              tone="#0E9F6E"
              detail="Currently in-house"
            />
            <MetricCard
              icon={<BedRoundedIcon />}
              label="Occupancy"
              value={`${occupancy}%`}
              tone="#8B5CF6"
              detail={`${dashboard.availableRooms} rooms available`}
            />
          </Box>

          <RoomStatusBoard
            occupiedRooms={dashboard.occupiedRoomsList}
            readyRooms={dashboard.availableRoomsList}
            currentGuests={dashboard.currentGuests}
            arrivals={dashboard.todayArrivals}
          />

          <Box
            sx={{
              display: "grid",
              gap: { xs: 2, sm: 3 },
              gridTemplateColumns: {
                xs: "1fr",
                xl: "minmax(0,1.55fr) minmax(320px,.75fr)",
              },
            }}
          >
            <Stack spacing={3}>
              <StaySection
                title="Currently staying"
                subtitle="Guests your front desk is serving now"
                icon={<GroupsRoundedIcon />}
                tone="#0E9F6E"
                bookings={dashboard.currentGuests}
                empty="No guests currently staying"
              />
              <Box
                sx={{
                  display: "grid",
                  gap: { xs: 2, sm: 3 },
                  gridTemplateColumns: {
                    xs: "1fr",
                    lg: "repeat(2,minmax(0,1fr))",
                  },
                }}
              >
                <StaySection
                  title="Arriving today"
                  subtitle="Prepare rooms and welcome guests"
                  icon={<LoginRoundedIcon />}
                  tone="#0B66D4"
                  bookings={dashboard.todayArrivals}
                  empty="No arrivals scheduled today"
                  compact
                />
                <StaySection
                  title="Departing today"
                  subtitle="Check balances before checkout"
                  icon={<LogoutRoundedIcon />}
                  tone="#D35454"
                  bookings={dashboard.todayDepartures}
                  empty="No departures scheduled today"
                  compact
                />
              </Box>
            </Stack>
            <Stack spacing={3}>
              <FinanceCard
                revenue={dashboard.todayRevenue}
                outstanding={dashboard.totalOutstanding}
              />
              <AvailableRooms rooms={dashboard.availableRoomsList} />
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

function RoomStatusBoard({
  occupiedRooms,
  readyRooms,
  currentGuests,
  arrivals,
}: {
  occupiedRooms: DashboardRoom[];
  readyRooms: DashboardRoom[];
  currentGuests: DashboardBooking[];
  arrivals: DashboardBooking[];
}) {
  const [showAll, setShowAll] = useState(false);
  const rooms = [
    ...occupiedRooms.map((room) => ({ room, state: "occupied" as const })),
    ...readyRooms.map((room) => ({ room, state: "ready" as const })),
  ];
  const visible = showAll ? rooms : rooms.slice(0, 12);
  const bookingsByRoom = new Map<string, DashboardBooking>();

  for (const booking of [...arrivals, ...currentGuests]) {
    bookingsByRoom.set(booking.roomId, booking);
  }

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{
          alignItems: { sm: "center" },
          justifyContent: "space-between",
          p: { xs: 2, sm: 2.75 },
        }}
      >
        <Box>
          <Typography variant="h5">Room overview</Typography>
          <Typography color="text.secondary" variant="body2" sx={{ mt: 0.4 }}>
            Live room availability and current guest stays.
          </Typography>
        </Box>
        <Button
          component={Link}
          href="/rooms"
          endIcon={<ArrowForwardRoundedIcon />}
        >
          Manage rooms
        </Button>
      </Stack>

      <Divider />

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: { xs: 2, sm: 3 },
          px: { xs: 2, sm: 2.75 },
          py: 2,
        }}
      >
        <StatusLegend
          color="#3977F6"
          label="Occupied"
          count={occupiedRooms.length}
        />
        <StatusLegend color="#2EAD64" label="Ready" count={readyRooms.length} />
      </Box>

      <Divider />

      {rooms.length === 0 ? (
        <Box sx={{ p: { xs: 2, sm: 2.75 } }}>
          <EmptyState text="No active rooms found" />
        </Box>
      ) : (
        <>
          <Box
            sx={{
              display: "grid",
              gap: { xs: 1.25, sm: 1.5 },
              gridTemplateColumns: {
                xs: "repeat(2,minmax(0,1fr))",
                md: "repeat(3,minmax(0,1fr))",
                xl: "repeat(4,minmax(0,1fr))",
              },
              p: { xs: 1.5, sm: 2.75 },
              pt: { xs: 1.5, sm: 2 },
            }}
          >
            {visible.map(({ room, state }) => (
              <OperationalRoomCard
                key={room.id}
                room={room}
                state={state}
                booking={bookingsByRoom.get(room.id)}
              />
            ))}
          </Box>
          {rooms.length > 12 && (
            <Box sx={{ px: { xs: 1.5, sm: 2.75 }, pb: 2.5 }}>
              <Button onClick={() => setShowAll((current) => !current)}>
                {showAll
                  ? "Show fewer rooms"
                  : `Show all ${rooms.length} rooms`}
              </Button>
            </Box>
          )}
        </>
      )}
    </Paper>
  );
}

function StatusLegend({
  color,
  label,
  count,
}: {
  color: string;
  label: string;
  count: number;
}) {
  return (
    <Stack direction="row" spacing={0.8} sx={{ alignItems: "center" }}>
      <Box
        sx={{ bgcolor: color, borderRadius: "50%", height: 10, width: 10 }}
      />
      <Typography color="text.secondary" variant="body2">
        {label} ({count})
      </Typography>
    </Stack>
  );
}

function OperationalRoomCard({
  room,
  state,
  booking,
}: {
  room: DashboardRoom;
  state: "occupied" | "ready";
  booking?: DashboardBooking;
}) {
  const occupied = state === "occupied";
  const daysLeft = booking
    ? Math.max(
        0,
        Math.ceil(
          (booking.checkOut.getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : null;
  const tone = occupied ? "#3977F6" : "#2EAD64";

  return (
    <Box
      component={Link}
      href={`/rooms/${room.id}`}
      sx={{
        bgcolor: occupied ? "rgba(57,119,246,.10)" : "rgba(46,173,100,.10)",
        border: "1px solid",
        borderColor: tone,
        borderRadius: 1,
        color: "text.primary",
        display: "flex",
        flexDirection: "column",
        minHeight: { xs: 142, sm: 150 },
        p: { xs: 1.4, sm: 1.75 },
        textDecoration: "none",
        transition: "transform 160ms ease, box-shadow 160ms ease",
        "&:hover": {
          boxShadow: `0 8px 24px ${tone}20`,
          transform: "translateY(-1px)",
        },
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
        <Typography
          sx={{
            flex: 1,
            fontSize: { xs: ".95rem", sm: "1rem" },
            fontWeight: 700,
            lineHeight: 1.25,
          }}
        >
          {room.name}
        </Typography>
        <Chip
          label={occupied ? "Occupied" : "Ready"}
          size="small"
          sx={{
            bgcolor: "rgba(255,255,255,.72)",
            color: "text.primary",
            fontSize: { xs: ".66rem", sm: ".72rem" },
            height: 24,
          }}
        />
      </Stack>

      <Box sx={{ flex: 1 }} />

      {occupied ? (
        <Stack spacing={0.25}>
          <Stack
            direction="row"
            spacing={0.65}
            sx={{ alignItems: "center", minWidth: 0 }}
          >
            <PersonRoundedIcon sx={{ color: tone, fontSize: 18 }} />
            <Typography noWrap variant="body2" sx={{ fontWeight: 600 }}>
              {booking?.guestName || "Reserved guest"}
            </Typography>
          </Stack>
          <Typography color="text.secondary" variant="caption">
            {daysLeft === null
              ? "Current stay"
              : daysLeft === 0
                ? "Checking out today"
                : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`}
          </Typography>
        </Stack>
      ) : (
        <Stack direction="row" spacing={0.65} sx={{ alignItems: "center" }}>
          <CheckCircleRoundedIcon sx={{ color: tone, fontSize: 18 }} />
          <Typography variant="body2" sx={{ color: tone, fontWeight: 700 }}>
            Available now
          </Typography>
        </Stack>
      )}
    </Box>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  detail: string;
  tone: string;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{ borderRadius: 1, p: { xs: 1.75, sm: 2.25, lg: 2.5 } }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box
          sx={{
            bgcolor: `${tone}14`,
            borderRadius: 1,
            color: tone,
            display: "grid",
            height: { xs: 40, sm: 44 },
            placeItems: "center",
            width: { xs: 40, sm: 44 },
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: { xs: "1.35rem", md: "1.7rem" },
              fontWeight: 700,
              letterSpacing: "-.04em",
              lineHeight: 1,
            }}
          >
            {value}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.55 }}>
            {label}
          </Typography>
          <Typography color="text.secondary" variant="caption">
            {detail}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

function SectionHeading({
  title,
  subtitle,
  icon,
  tone,
  count,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  tone: string;
  count: number;
}) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box
        sx={{
          bgcolor: `${tone}14`,
          borderRadius: 1,
          color: tone,
          display: "grid",
          height: 42,
          placeItems: "center",
          width: 42,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="h6" sx={{ fontSize: "1rem" }}>
          {title}
        </Typography>
        <Typography color="text.secondary" variant="caption">
          {subtitle}
        </Typography>
      </Box>
      <Chip
        label={count}
        size="small"
        sx={{ bgcolor: `${tone}12`, color: tone }}
      />
    </Stack>
  );
}

function StaySection({
  title,
  subtitle,
  icon,
  tone,
  bookings,
  empty,
  compact = false,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  tone: string;
  bookings: DashboardBooking[];
  empty: string;
  compact?: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const limit = compact ? 3 : 5;
  const visible = showAll ? bookings : bookings.slice(0, limit);
  return (
    <Paper variant="outlined" sx={{ borderRadius: 1, p: { xs: 2.25, sm: 3 } }}>
      <SectionHeading
        title={title}
        subtitle={subtitle}
        icon={icon}
        tone={tone}
        count={bookings.length}
      />
      <Divider sx={{ my: 2.25 }} />
      {bookings.length === 0 ? (
        <EmptyState text={empty} />
      ) : (
        <Stack spacing={0.75}>
          {visible.map((booking) => (
            <BookingTile key={booking.id} booking={booking} tone={tone} />
          ))}
          {bookings.length > limit && (
            <Button
              onClick={() => setShowAll((value) => !value)}
              endIcon={<ArrowForwardRoundedIcon />}
              sx={{ alignSelf: "flex-start" }}
            >
              {showAll ? "Show fewer" : `View all ${bookings.length}`}
            </Button>
          )}
        </Stack>
      )}
    </Paper>
  );
}

function BookingTile({
  booking,
  tone,
}: {
  booking: DashboardBooking;
  tone: string;
}) {
  return (
    <Box
      component={Link}
      href={`/bookings/${booking.id}`}
      sx={{
        borderRadius: 1,
        color: "inherit",
        display: "block",
        p: 1.25,
        textDecoration: "none",
        transition: "background 160ms ease",
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Stack direction="row" spacing={1.4} alignItems="center">
        <Avatar
          sx={{
            bgcolor: `${tone}16`,
            color: tone,
            fontSize: ".8rem",
            height: 40,
            width: 40,
          }}
        >
          {initials(booking.guestName)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 700 }}>
            {booking.guestName}
          </Typography>
          <Typography color="text.secondary" noWrap variant="caption">
            {booking.roomName}
            {booking.roomType ? ` · ${booking.roomType}` : ""}
          </Typography>
        </Box>
        <Box sx={{ textAlign: "right" }}>
          <Typography
            variant="caption"
            sx={{ display: "block", fontWeight: 700 }}
          >
            {formatLocalDate(booking.checkOut, {
              day: "numeric",
              month: "short",
            })}
          </Typography>
          <Chip
            label={statusLabel(booking.status)}
            size="small"
            sx={{ mt: 0.35, height: 22, fontSize: ".66rem" }}
          />
        </Box>
      </Stack>
    </Box>
  );
}

function FinanceCard({
  revenue,
  outstanding,
}: {
  revenue: number;
  outstanding: number;
}) {
  return (
    <Paper
      sx={{
        background: "linear-gradient(145deg,#102A43,#173E65)",
        borderRadius: 1,
        color: "white",
        p: 3,
      }}
    >
      <Stack direction="row" justifyContent="space-between">
        <Box>
          <Typography
            variant="overline"
            sx={{ color: "rgba(255,255,255,.66)", letterSpacing: ".12em" }}
          >
            TODAY’S REVENUE
          </Typography>
          <Typography variant="h4" sx={{ color: "white", mt: 0.7 }}>
            {money.format(revenue)}
          </Typography>
        </Box>
        <Box
          sx={{
            bgcolor: "rgba(255,255,255,.1)",
            borderRadius: 1,
            display: "grid",
            height: 44,
            placeItems: "center",
            width: 44,
          }}
        >
          <PaymentsRoundedIcon />
        </Box>
      </Stack>
      <Divider sx={{ borderColor: "rgba(255,255,255,.14)", my: 2.5 }} />
      <Stack direction="row" justifyContent="space-between">
        <Typography sx={{ color: "rgba(255,255,255,.72)" }}>
          Outstanding balance
        </Typography>
        <Typography sx={{ fontWeight: 700 }}>
          {money.format(outstanding)}
        </Typography>
      </Stack>
    </Paper>
  );
}

function AvailableRooms({ rooms }: { rooms: DashboardRoom[] }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 1, p: { xs: 2.25, sm: 3 } }}>
      <SectionHeading
        title="Available rooms"
        subtitle="Ready to sell tonight"
        icon={<HotelRoundedIcon />}
        tone="#0B66D4"
        count={rooms.length}
      />
      <Divider sx={{ my: 2.25 }} />
      {rooms.length === 0 ? (
        <EmptyState text="No available rooms" />
      ) : (
        <Stack spacing={1.25}>
          {rooms.slice(0, 5).map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
          {rooms.length > 5 && (
            <Button component={Link} href="/rooms">
              View all rooms
            </Button>
          )}
        </Stack>
      )}
    </Paper>
  );
}

function RoomCard({ room }: { room: DashboardRoom }) {
  return (
    <Box
      component={Link}
      href={`/rooms/${room.id}`}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        color: "inherit",
        display: "grid",
        gridTemplateColumns: room.images[0] ? "76px 1fr" : "1fr",
        overflow: "hidden",
        textDecoration: "none",
        transition: "border-color 160ms ease",
        "&:hover": { borderColor: "primary.main" },
      }}
    >
      {room.images[0] && (
        <Box
          component="img"
          src={room.images[0]}
          alt={room.name}
          sx={{ height: "100%", minHeight: 86, objectFit: "cover", width: 76 }}
        />
      )}
      <Stack spacing={0.35} sx={{ minWidth: 0, p: 1.25 }}>
        <Typography noWrap sx={{ fontWeight: 700 }}>
          {room.name}
        </Typography>
        <Typography
          color="text.secondary"
          variant="caption"
          sx={{ textTransform: "capitalize" }}
        >
          {room.roomType} · {room.capacity} guests
        </Typography>
        <Typography color="primary" variant="body2" sx={{ fontWeight: 700 }}>
          {money.format(room.pricePerNight)}{" "}
          <Typography component="span" color="text.secondary" variant="caption">
            / night
          </Typography>
        </Typography>
      </Stack>
    </Box>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Box
      sx={{
        bgcolor: "#F7F9FB",
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 1,
        p: 3,
        textAlign: "center",
      }}
    >
      <Typography color="text.secondary" variant="body2">
        {text}
      </Typography>
    </Box>
  );
}
function DashboardSkeleton() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Skeleton height={230} variant="rounded" />
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "repeat(2,1fr)", md: "repeat(4,1fr)" },
          }}
        >
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} height={106} variant="rounded" />
          ))}
        </Box>
        <Skeleton height={380} variant="rounded" />
      </Stack>
    </Container>
  );
}
function DashboardError({
  message,
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <Container maxWidth="sm" sx={{ py: 10 }}>
      <Alert
        severity="error"
        action={
          <Button
            color="inherit"
            startIcon={<RefreshRoundedIcon />}
            onClick={onRetry}
          >
            Retry
          </Button>
        }
      >
        <Typography sx={{ fontWeight: 700 }}>
          Unable to load dashboard data
        </Typography>
        {message && <Typography variant="caption">{message}</Typography>}
      </Alert>
    </Container>
  );
}
