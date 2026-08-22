"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useHomeDashboard } from "@/features/dashboard/hooks/use-home-dashboard";
import type {
  DashboardBooking,
  DashboardRoom,
} from "@/features/dashboard/models/dashboard";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { useLanguage } from "@/components/providers/language-provider";

const money = new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
});
const dashboardReferenceTime = new Date().getTime();

export function DashboardScreen() {
  const { t } = useLanguage();
  const sessionState = useAppSession();
  const { dashboard, loading, error, refresh } = useHomeDashboard(
    sessionState.session?.activePropertyId,
  );
  if (sessionState.loading || loading) return <DashboardSkeleton />;
  if (sessionState.error || error || !dashboard) {
    return (
      <DashboardError
        message={(sessionState.error || error)?.message}
        onRetry={() => {
          void sessionState.refresh();
          void refresh();
        }}
      />
    );
  }

  const occupancy = dashboard.totalRooms
    ? Math.round(
        ((dashboard.totalRooms - dashboard.availableRooms) /
          dashboard.totalRooms) *
          100,
      )
    : 0;

  return (
    <Box sx={{ minHeight: "100dvh", pb: { xs: 10, md: 5 } }}>
      <Container
        maxWidth="lg"
        sx={{ px: { xs: 1, sm: 2.5 }, py: { xs: 1, sm: 2.5, lg: 3 } }}
      >
        <Paper
          variant="outlined"
          sx={{ bgcolor: "background.paper", overflow: "hidden" }}
        >
          <DashboardHeader onRefresh={() => void refresh()} />
          <Divider />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2,minmax(0,1fr))",
                md: "repeat(4,minmax(0,1fr))",
              },
            }}
          >
            <Metric
              label={t("Occupancy rate", "Kiwango cha matumizi")}
              value={`${occupancy}%`}
            />
            <Metric
              label={t("Check-ins today", "Wanaoingia leo")}
              value={String(dashboard.arrivals)}
              suffix={dashboard.arrivals === 1 ? "room" : "rooms"}
              href="/bookings?view=checkins&date=today"
            />
            <Metric
              label={t("Check-outs today", "Wanaotoka leo")}
              value={String(dashboard.departures)}
              suffix={dashboard.departures === 1 ? "room" : "rooms"}
              href="/bookings?view=checkouts&date=today"
            />
            <Metric
              label={t("Today’s revenue", "Mapato ya leo")}
              value={money.format(dashboard.todayRevenue)}
              positive
            />
          </Box>
          <Divider />
          <RoomBoard
            occupiedRooms={dashboard.occupiedRoomsList}
            readyRooms={dashboard.availableRoomsList}
            currentGuests={dashboard.currentGuests}
            arrivals={dashboard.todayArrivals}
          />
          <TodayCheckouts bookings={dashboard.todayDepartures} />
        </Paper>
      </Container>
      <Fab
        component={Link}
        href="/bookings/new"
        color="primary"
        variant="extended"
        sx={{
          bottom: { xs: 20, sm: 28 },
          boxShadow: 4,
          position: "fixed",
          right: { xs: 18, sm: 28 },
          zIndex: (theme) => theme.zIndex.speedDial,
        }}
      >
        <AddRoundedIcon sx={{ mr: 1 }} />
        {t("New booking", "Uhifadhi mpya")}
      </Fab>
    </Box>
  );
}

function DashboardHeader({ onRefresh }: { onRefresh: () => void }) {
  const { t, language } = useLanguage();
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      sx={{
        alignItems: { sm: "center" },
        justifyContent: "space-between",
        p: { xs: 1.5, sm: 2 },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="h1"
          variant="h4"
          sx={{ overflowWrap: "anywhere" }}
        >
          {t("Home", "Nyumbani")}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.45 }}>
          {new Date().toLocaleDateString(
            language === "sw" ? "sw-TZ" : "en-TZ",
            {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            },
          )}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1}>
        <Tooltip title="Refresh dashboard">
          <IconButton aria-label="Refresh dashboard" onClick={onRefresh}>
            <RefreshRoundedIcon />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}

function Metric({
  label,
  value,
  suffix,
  positive = false,
  href,
}: {
  label: string;
  value: string;
  suffix?: string;
  positive?: boolean;
  href?: string;
}) {
  return (
    <Box
      component={href ? Link : "div"}
      href={href}
      sx={{
        borderBottom: "1px solid",
        borderRight: "1px solid",
        borderColor: "divider",
        color: "inherit",
        minWidth: 0,
        px: { xs: 0.75, sm: 2 },
        py: { xs: 1.35, sm: 1.8 },
        textAlign: "center",
        textDecoration: "none",
        transition: "background-color 150ms ease",
        ...(href && {
          cursor: "pointer",
          "&:hover": { bgcolor: "action.hover" },
        }),
      }}
    >
      <Typography
        color="text.secondary"
        sx={{
          fontSize: { xs: ".7rem", sm: ".88rem" },
          fontWeight: 600,
          lineHeight: 1.25,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          color: positive ? "success.main" : "text.primary",
          fontSize: { xs: ".98rem", sm: "1.45rem" },
          fontWeight: 700,
          letterSpacing: "-.025em",
          lineHeight: 1.2,
          mt: 0.65,
          overflowWrap: "anywhere",
        }}
      >
        {value}
        {suffix && (
          <Typography
            component="span"
            sx={{
              display: { xs: "block", sm: "inline" },
              fontSize: { xs: ".68rem", sm: ".9rem" },
              fontWeight: 500,
              ml: { sm: 0.5 },
            }}
          >
            {suffix}
          </Typography>
        )}
      </Typography>
    </Box>
  );
}

function RoomBoard({
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
  const { t } = useLanguage();
  const [showAll, setShowAll] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<DashboardRoom | null>(null);
  const rooms = useMemo(
    () => [
      ...occupiedRooms.map((room) => ({ room, state: "occupied" as const })),
      ...readyRooms.map((room) => ({ room, state: "ready" as const })),
    ],
    [occupiedRooms, readyRooms],
  );
  const bookingsByRoom = useMemo(() => {
    const values = new Map<string, DashboardBooking>();
    for (const booking of [...arrivals, ...currentGuests])
      values.set(booking.roomId, booking);
    return values;
  }, [arrivals, currentGuests]);
  const visible = showAll ? rooms : rooms.slice(0, 16);

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{
          alignItems: { sm: "center" },
          justifyContent: "space-between",
          px: { xs: 1.5, sm: 2 },
          py: 1.25,
        }}
      >
        <Stack
          direction="row"
          spacing={{ xs: 2, sm: 3 }}
          sx={{ flexWrap: "wrap", rowGap: 1 }}
        >
          <Legend
            color="#3977F6"
            count={occupiedRooms.length}
            label={t("Occupied", "Vimetumika")}
          />
          <Legend
            color="#35A95F"
            count={readyRooms.length}
            label={t("Ready", "Tayari")}
          />
        </Stack>
        <Button
          component={Link}
          href="/rooms"
          color="inherit"
          endIcon={<ArrowForwardRoundedIcon />}
          sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
        >
          {t("Manage rooms", "Simamia vyumba")}
        </Button>
      </Stack>
      <Divider />
      {rooms.length === 0 ? (
        <Stack spacing={1.5} sx={{ alignItems: "center", p: 6 }}>
          <HotelRoundedIcon color="disabled" sx={{ fontSize: 42 }} />
          <Typography color="text.secondary">
            {t("No active rooms found.", "Hakuna vyumba vinavyotumika.")}
          </Typography>
          <Button component={Link} href="/rooms/new" variant="contained">
            {t("Add a room", "Ongeza chumba")}
          </Button>
        </Stack>
      ) : (
        <>
          <Box
            sx={{
              bgcolor: "action.hover",
              display: "grid",
              gap: { xs: 0.8, sm: 1.1 },
              gridTemplateColumns: {
                xs: "repeat(2,minmax(0,1fr))",
                md: "repeat(3,minmax(0,1fr))",
                lg: "repeat(4,minmax(0,1fr))",
              },
              p: { xs: 1, sm: 1.75, lg: 2 },
            }}
          >
            {visible.map(({ room, state }) => (
              <RoomTile
                key={room.id}
                room={room}
                state={state}
                booking={bookingsByRoom.get(room.id)}
                onSelect={() => setSelectedRoom(room)}
              />
            ))}
          </Box>
          {rooms.length > 16 && (
            <Box sx={{ bgcolor: "action.hover", px: 3, pb: 3 }}>
              <Button onClick={() => setShowAll((value) => !value)}>
                {showAll ? "Show fewer" : `Show all ${rooms.length} rooms`}
              </Button>
            </Box>
          )}
        </>
      )}
      <ResponsiveModal
        open={Boolean(selectedRoom)}
        onClose={() => setSelectedRoom(null)}
        maxWidth="xs"
      >
        <DialogTitle>{selectedRoom?.name}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            {t(
              "What would you like to do with this room?",
              "Ungependa kufanya nini na chumba hiki?",
            )}
          </Typography>
          {selectedRoom && (
            <Stack spacing={0.5} sx={{ mt: 2 }}>
              <Typography sx={{ fontWeight: 700 }}>
                {selectedRoom.roomType}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {selectedRoom.capacity} guests ·{" "}
                {money.format(selectedRoom.pricePerNight)} per night
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
          <Button onClick={() => setSelectedRoom(null)} color="inherit">
            {t("Cancel", "Ghairi")}
          </Button>
          <Button
            component={Link}
            href={selectedRoom ? `/rooms/${selectedRoom.id}` : "/rooms"}
            variant="outlined"
          >
            {t("Room details", "Maelezo ya chumba")}
          </Button>
          <Button
            component={Link}
            href={
              selectedRoom
                ? `/bookings/new?room=${selectedRoom.id}`
                : "/bookings/new"
            }
            variant="contained"
          >
            {t("Create booking", "Tengeneza uhifadhi")}
          </Button>
        </DialogActions>
      </ResponsiveModal>
    </Box>
  );
}

function Legend({
  color,
  count,
  label,
}: {
  color: string;
  count: number;
  label: string;
}) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
      <Box
        sx={{ bgcolor: color, borderRadius: "50%", height: 10, width: 10 }}
      />
      <Typography color="text.secondary" variant="body2">
        {label} ({count})
      </Typography>
    </Stack>
  );
}

function RoomTile({
  room,
  state,
  booking,
  onSelect,
}: {
  room: DashboardRoom;
  state: "occupied" | "ready";
  booking?: DashboardBooking;
  onSelect: () => void;
}) {
  const { t } = useLanguage();
  const occupied = state === "occupied";
  const tone = occupied ? "#3977F6" : "#35A95F";
  const daysLeft = booking
    ? Math.max(
        0,
        Math.ceil(
          (booking.checkOut.getTime() - dashboardReferenceTime) / 86400000,
        ),
      )
    : null;
  return (
    <Box
      component="button"
      type="button"
      onClick={onSelect}
      sx={{
        bgcolor: occupied ? "rgba(57,119,246,.11)" : "rgba(53,169,95,.11)",
        border: "1.5px solid",
        borderColor: tone,
        borderRadius: 1,
        color: "text.primary",
        display: "flex",
        flexDirection: "column",
        minHeight: { xs: 124, sm: 136 },
        p: { xs: 1, sm: 1.35 },
        textDecoration: "none",
        textAlign: "left",
        font: "inherit",
        transition: "transform 150ms ease, box-shadow 150ms ease",
        "&:hover": {
          boxShadow: `0 8px 24px ${tone}24`,
          transform: "translateY(-1px)",
        },
      }}
    >
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "flex-start" }}>
        <Typography
          sx={{
            flex: 1,
            fontSize: { xs: ".95rem", sm: "1.05rem" },
            fontWeight: 700,
            lineHeight: 1.25,
            overflowWrap: "anywhere",
          }}
        >
          {room.name}
        </Typography>
        <Chip
          label={occupied ? t("Occupied", "Kimetumika") : t("Ready", "Tayari")}
          size="small"
          sx={{
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            color: "text.primary",
            flexShrink: 0,
            fontSize: { xs: ".64rem", sm: ".7rem" },
            height: 24,
          }}
        />
      </Stack>
      <Typography
        color="text.secondary"
        variant="caption"
        sx={{ mt: 0.65, textTransform: "capitalize" }}
      >
        {room.roomType} · {room.capacity} {t("guests", "wageni")}
      </Typography>
      <Typography
        sx={{ color: tone, fontSize: ".78rem", fontWeight: 700, mt: 0.25 }}
      >
        {money.format(room.pricePerNight)} / {t("night", "usiku")}
      </Typography>
      <Box sx={{ flex: 1 }} />
      {occupied ? (
        <Stack spacing={0.25}>
          <Stack direction="row" spacing={0.55} sx={{ alignItems: "center" }}>
            <PersonRoundedIcon sx={{ color: tone, fontSize: 18 }} />
            <Typography noWrap variant="body2" sx={{ fontWeight: 600 }}>
              {booking?.guestName || t("Reserved guest", "Mgeni aliyehifadhi")}
            </Typography>
          </Stack>
          <Typography color="text.secondary" variant="caption">
            {daysLeft === null
              ? t("Current stay", "Anaendelea kukaa")
              : daysLeft === 0
                ? t("Checking out today", "Anaondoka leo")
                : `${daysLeft} ${t(daysLeft === 1 ? "day left" : "days left", daysLeft === 1 ? "siku imebaki" : "siku zimebaki")}`}
          </Typography>
        </Stack>
      ) : (
        <Stack direction="row" spacing={0.55} sx={{ alignItems: "center" }}>
          <CheckCircleRoundedIcon sx={{ color: tone, fontSize: 18 }} />
          <Typography variant="body2" sx={{ color: tone, fontWeight: 700 }}>
            {t("Available now", "Kinapatikana sasa")}
          </Typography>
        </Stack>
      )}
    </Box>
  );
}

function TodayCheckouts({ bookings }: { bookings: DashboardBooking[] }) {
  const { t } = useLanguage();
  return (
    <Box
      sx={{
        borderTop: "1px solid",
        borderColor: "divider",
        p: { xs: 2, sm: 3 },
      }}
    >
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", mb: 1.5 }}
      >
        <Box>
          <Typography variant="h6">
            {t("Today’s check-outs", "Wanaotoka leo")}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {t(
              "Guests expected to depart today.",
              "Wageni wanaotarajiwa kuondoka leo.",
            )}
          </Typography>
        </Box>
        <Button
          component={Link}
          href="/bookings?view=checkouts&date=today"
          endIcon={<ArrowForwardRoundedIcon />}
          sx={{ display: { xs: "none", sm: "inline-flex" } }}
        >
          {t("View all", "Tazama wote")}
        </Button>
      </Stack>
      {bookings.length === 0 ? (
        <Typography color="text.secondary" variant="body2" sx={{ py: 1 }}>
          {t(
            "No check-outs scheduled today.",
            "Hakuna wanaotarajiwa kuondoka leo.",
          )}
        </Typography>
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 1,
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2,minmax(0,1fr))",
              lg: "repeat(3,minmax(0,1fr))",
            },
          }}
        >
          {bookings.slice(0, 6).map((booking) => (
            <Box
              key={booking.id}
              component={Link}
              href={`/bookings/${booking.id}`}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                color: "inherit",
                p: 1.5,
                textDecoration: "none",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <Typography noWrap sx={{ fontWeight: 700 }}>
                {booking.guestName}
              </Typography>
              <Typography color="text.secondary" noWrap variant="caption">
                {booking.roomName} · {money.format(booking.balanceDue)} due
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

function DashboardSkeleton() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Box sx={{ p: 3 }}>
          <Skeleton height={38} width="45%" />
          <Skeleton height={24} width="30%" />
        </Box>
        <Divider />
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)" }}>
          {[0, 1, 2].map((value) => (
            <Skeleton key={value} height={110} variant="rectangular" />
          ))}
        </Box>
        <Divider />
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: { xs: "repeat(2,1fr)", md: "repeat(4,1fr)" },
            p: 3,
          }}
        >
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} height={154} variant="rounded" />
          ))}
        </Box>
      </Paper>
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
          <Button color="inherit" onClick={onRetry}>
            Retry
          </Button>
        }
      >
        <Typography sx={{ fontWeight: 700 }}>
          Unable to load dashboard
        </Typography>
        {message && <Typography variant="caption">{message}</Typography>}
      </Alert>
    </Container>
  );
}
