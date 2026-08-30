"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Fab,
  InputAdornment,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { createClient } from "@/lib/supabase/client";
import { getBookings } from "@/features/bookings/services/booking-service";
import {
  bookingStatusLabel,
  type Booking,
} from "@/features/bookings/models/booking";
import { formatLocalDate, localDateKey } from "@/lib/date-time";
import { useLanguage } from "@/components/providers/language-provider";
import { PageHeader } from "@/components/shared/page-header";
import { getWorkspaceCapabilities } from "@/features/session/permissions";

const money = new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
});
const statusColor = (
  status: string,
): "success" | "info" | "warning" | "default" =>
  status === "checked_in"
    ? "success"
    : status === "confirmed"
      ? "info"
      : status === "reserved"
        ? "warning"
        : "default";

export function BookingsScreen() {
  const { t } = useLanguage();
  const { session } = useAppSession();
  const client = useMemo(() => createClient(), []);
  const propertyId = session?.activePropertyId;
  const capabilities = getWorkspaceCapabilities(session?.activeRole);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [todayView, setTodayView] = useState<"checkins" | "checkouts" | null>(
    null,
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const view = params.get("view");
      const date = params.get("date");
      setTodayView(
        date === "today" && (view === "checkins" || view === "checkouts")
          ? view
          : null,
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const refresh = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    setError(null);
    try {
      setBookings(await getBookings(client, propertyId));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load bookings.",
      );
    } finally {
      setLoading(false);
    }
  }, [client, propertyId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const today = localDateKey();
  const visible = bookings.filter((item) => {
    const matchesFilter = filter === "all" || item.status === filter;
    const matchesTodayView =
      !todayView ||
      (todayView === "checkins"
        ? localDateKey(item.checkIn) === today
        : localDateKey(item.checkOut) === today);
    const needle = query.toLowerCase();
    return (
      matchesFilter &&
      matchesTodayView &&
      (!needle ||
        item.guestName.toLowerCase().includes(needle) ||
        item.bookingNumber.toLowerCase().includes(needle) ||
        item.phone.includes(query))
    );
  });
  const activeBookings = visible.filter((booking) =>
    ["confirmed", "reserved", "checked_in"].includes(booking.status),
  );
  const arrivalsToday = visible.filter(
    (booking) => localDateKey(booking.checkIn) === today,
  ).length;
  const outstanding = visible.reduce(
    (sum, booking) => sum + booking.balanceDue,
    0,
  );

  return (
    <>
      <Container maxWidth="xl" sx={{ py: { xs: 1.75, sm: 2.5, lg: 3 } }}>
        <Stack spacing={{ xs: 1.5, sm: 2 }}>
          <PageHeader
            eyebrow={t("Guest operations", "Uendeshaji wa wageni")}
            title={t("Bookings", "Uhifadhi")}
            description={t(
              "A clear live register for arrivals, in-house guests, and planned departures.",
              "Orodha ya moja kwa moja ya wanaoingia, waliopo, na wanaotarajiwa kuondoka.",
            )}
            action={
              capabilities.canCreateBooking ? (
                <Button
                  component={Link}
                  href="/bookings/new"
                  startIcon={<AddRoundedIcon />}
                  variant="contained"
                >
                  {t("New booking", "Uhifadhi mpya")}
                </Button>
              ) : undefined
            }
          />

          <BookingSummary
            active={activeBookings.length}
            arrivals={arrivalsToday}
            outstanding={outstanding}
            showFinance={capabilities.canViewFinance}
            total={visible.length}
          />

          <Paper
            variant="outlined"
            sx={{ overflow: "hidden" }}
          >
            <Box sx={{ p: { xs: 1.25, sm: 1.75 } }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
                <TextField
                  placeholder={t(
                    "Search guest, booking number or phone",
                    "Tafuta mgeni, namba ya uhifadhi au simu",
                  )}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchRoundedIcon color="action" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <TextField
                  select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  sx={{ minWidth: { md: 220 }, maxWidth: { md: 280 } }}
                >
                  {[
                    "all",
                    "confirmed",
                    "reserved",
                    "checked_in",
                    "checked_out",
                    "cancelled",
                  ].map((item) => (
                    <MenuItem key={item} value={item}>
                      {item === "all"
                        ? t("All booking statuses", "Hali zote za uhifadhi")
                        : bookingStatusLabel(item)}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
              {todayView && (
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={0.75}
                  sx={{ alignItems: { sm: "center" }, mt: 1.25 }}
                >
                  <Chip
                    color="primary"
                    label={
                      todayView === "checkins"
                        ? t("Check-ins today", "Wanaoingia leo")
                        : t("Check-outs today", "Wanaotoka leo")
                    }
                    onDelete={() => {
                      setTodayView(null);
                      window.history.replaceState({}, "", "/bookings");
                    }}
                  />
                  <Typography color="text.secondary" variant="caption">
                    {todayView === "checkins"
                      ? t(
                          "Showing today’s arrivals.",
                          "Inaonyesha wanaoingia leo.",
                        )
                      : t(
                          "Showing today’s departures.",
                          "Inaonyesha wanaotoka leo.",
                        )}
                  </Typography>
                </Stack>
              )}
            </Box>
          </Paper>

          {loading ? (
            <Stack spacing={1.25}>
              {[0, 1, 2, 3, 4].map((item) => (
                <Skeleton key={item} height={84} variant="rounded" />
              ))}
            </Stack>
          ) : error ? (
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  startIcon={<RefreshRoundedIcon />}
                  onClick={() => void refresh()}
                >
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          ) : visible.length === 0 ? (
            <EmptyBookings />
          ) : (
            <BookingTable bookings={visible} showFinance={capabilities.canViewFinance} />
          )}
        </Stack>
      </Container>
      {capabilities.canCreateBooking ? (
        <Fab
          component={Link}
          href="/bookings/new"
          color="primary"
          sx={{
            bottom: { xs: 20, sm: 28 },
            display: { xs: "inline-flex", sm: "none" },
            position: "fixed",
            right: { xs: 18, sm: 28 },
            zIndex: (theme) => theme.zIndex.speedDial,
          }}
        >
          <AddRoundedIcon />
        </Fab>
      ) : null}
    </>
  );
}

function BookingSummary({
  active,
  arrivals,
  outstanding,
  showFinance,
  total,
}: {
  active: number;
  arrivals: number;
  outstanding: number;
  showFinance: boolean;
  total: number;
}) {
  const { t } = useLanguage();
  const cards = showFinance
    ? [
        { icon: <EventAvailableRoundedIcon fontSize="small" />, label: t("Bookings in view", "Uhifadhi unaoonekana"), value: String(total) },
        { icon: <GroupsRoundedIcon fontSize="small" />, label: t("Active stays", "Ukaaji unaoendelea"), value: String(active) },
        { icon: <EventAvailableRoundedIcon fontSize="small" />, label: t("Arriving today", "Wanaowasili leo"), value: String(arrivals) },
        { icon: <PaymentsRoundedIcon fontSize="small" />, label: t("Open balances", "Madeni yaliyobaki"), value: money.format(outstanding) },
      ]
    : [
        { icon: <EventAvailableRoundedIcon fontSize="small" />, label: t("Bookings in view", "Uhifadhi unaoonekana"), value: String(total) },
        { icon: <GroupsRoundedIcon fontSize="small" />, label: t("Active stays", "Ukaaji unaoendelea"), value: String(active) },
        { icon: <EventAvailableRoundedIcon fontSize="small" />, label: t("Arriving today", "Wanaowasili leo"), value: String(arrivals) },
      ];

  return (
    <Box
      sx={{
        display: "grid",
        gap: 1,
        gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", md: `repeat(${cards.length},minmax(0,1fr))` },
      }}
    >
      {cards.map((card) => (
        <Paper key={card.label} variant="outlined" sx={{ minWidth: 0, p: { xs: 1.25, sm: 1.5 } }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", color: "primary.main" }}>
            {card.icon}
            <Typography color="text.secondary" sx={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>
              {card.label}
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: { xs: "1.1rem", sm: "1.35rem" }, fontVariantNumeric: "tabular-nums", fontWeight: 700, letterSpacing: "-.025em", mt: 0.7, overflowWrap: "anywhere" }}>
            {card.value}
          </Typography>
        </Paper>
      ))}
    </Box>
  );
}

function BookingTable({
  bookings,
  showFinance,
}: {
  bookings: Booking[];
  showFinance: boolean;
}) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 1, overflow: "hidden" }}>
      <Box
        sx={{
          bgcolor: "background.default",
          borderBottom: "1px solid",
          borderColor: "divider",
          display: { xs: "none", lg: "grid" },
          gap: 2,
          gridTemplateColumns: showFinance
            ? "minmax(220px,1.35fr) minmax(140px,.8fr) minmax(180px,1fr) 120px 148px"
            : "minmax(240px,1.5fr) minmax(160px,.9fr) minmax(190px,1fr) 130px",
          px: 2.5,
          py: 1.4,
        }}
      >
        <TableLabel>Guest</TableLabel>
        <TableLabel>Room</TableLabel>
        <TableLabel>Stay</TableLabel>
        <TableLabel>Status</TableLabel>
        {showFinance ? <TableLabel align="right">Payment</TableLabel> : null}
      </Box>
      {bookings.map((booking, index) => (
        <BookingRow
          key={booking.id}
          booking={booking}
          last={index === bookings.length - 1}
          showFinance={showFinance}
        />
      ))}
    </Paper>
  );
}

function TableLabel({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <Typography
      color="text.secondary"
      sx={{
        fontSize: ".7rem",
        fontWeight: 700,
        letterSpacing: ".08em",
        textAlign: align,
      }}
    >
      {children}
    </Typography>
  );
}

function BookingRow({
  booking,
  last,
  showFinance,
}: {
  booking: Booking;
  last: boolean;
  showFinance: boolean;
}) {
  const initials = booking.guestName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <Box
      component={Link}
      href={`/bookings/${booking.id}`}
      sx={{
        borderBottom: last ? 0 : "1px solid",
        borderColor: "divider",
        color: "inherit",
        display: { xs: "block", lg: "grid" },
        gap: 2,
        gridTemplateColumns: {
          lg: showFinance
            ? "minmax(220px,1.35fr) minmax(140px,.8fr) minmax(180px,1fr) 120px 148px"
            : "minmax(240px,1.5fr) minmax(160px,.9fr) minmax(190px,1fr) 130px",
        },
        px: { xs: 1.5, sm: 2, lg: 2.5 },
        py: { xs: 1.75, lg: 1.6 },
        textDecoration: "none",
        transition: "background 150ms ease",
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
        <Avatar
          sx={{
            bgcolor: "color-mix(in srgb, var(--mui-palette-primary-main) 12%, var(--mui-palette-background-paper))",
            color: "primary.dark",
            flexShrink: 0,
            fontSize: ".78rem",
            height: 40,
            width: 40,
          }}
        >
          {initials || "G"}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 700 }}>
            {booking.guestName}
          </Typography>
          <Typography color="text.secondary" noWrap variant="caption">
            {booking.bookingNumber} · {booking.phone || "No phone"}
          </Typography>
        </Box>
        <Chip
          label={bookingStatusLabel(booking.status)}
          color={statusColor(booking.status)}
          size="small"
          sx={{
            display: { xs: "inline-flex", lg: "none" },
            ml: "auto!important",
            maxWidth: 110,
          }}
        />
      </Stack>
      <Box
        sx={{
          display: { xs: "flex", lg: "block" },
          justifyContent: "space-between",
          mt: { xs: 1.4, lg: 0 },
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {booking.roomName}
        </Typography>
        <Typography
          color="text.secondary"
          variant="caption"
          sx={{ textTransform: "capitalize" }}
        >
          {booking.roomType}
        </Typography>
      </Box>
      <Box sx={{ mt: { xs: 0.7, lg: 0 } }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {formatLocalDate(booking.checkIn, { day: "numeric", month: "short" })}{" "}
          →{" "}
          {formatLocalDate(booking.checkOut, {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </Typography>
        <Typography color="text.secondary" variant="caption">
          {booking.totalGuests} {booking.totalGuests === 1 ? "guest" : "guests"}
        </Typography>
      </Box>
      <Box sx={{ display: { xs: "none", lg: "flex" }, alignItems: "center" }}>
        <Chip
          label={bookingStatusLabel(booking.status)}
          color={statusColor(booking.status)}
          size="small"
        />
      </Box>
      {showFinance ? (
        <Box
          sx={{
            alignSelf: "center",
            borderTop: { xs: "1px solid", lg: 0 },
            borderColor: "divider",
            display: { xs: "flex", lg: "block" },
            justifyContent: "space-between",
            mt: { xs: 1.2, lg: 0 },
            pt: { xs: 1.1, lg: 0 },
            textAlign: { lg: "right" },
          }}
        >
          <Typography
            color="text.secondary"
            variant="caption"
            sx={{ display: { lg: "none" } }}
          >
            Booking total
          </Typography>
          <Box>
            <Typography sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
              {money.format(booking.totalPrice)}
            </Typography>
            {booking.balanceDue > 0 ? (
              <Typography color="warning.main" variant="caption">
                {money.format(booking.balanceDue)} due
              </Typography>
            ) : (
              <Typography color="success.main" variant="caption">Paid</Typography>
            )}
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}

function EmptyBookings() {
  return (
    <Paper
      variant="outlined"
      sx={{ borderRadius: 1, py: 9, textAlign: "center" }}
    >
      <Box
        sx={{
          bgcolor: "color-mix(in srgb, var(--mui-palette-primary-main) 12%, var(--mui-palette-background-paper))",
          borderRadius: "50%",
          color: "primary.main",
          display: "grid",
          height: 72,
          mx: "auto",
          placeItems: "center",
          width: 72,
        }}
      >
        <EventAvailableRoundedIcon sx={{ fontSize: 34 }} />
      </Box>
      <Typography variant="h6" sx={{ mt: 2 }}>
        No bookings found
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5 }}>
        Try changing your filters or create a new reservation.
      </Typography>
    </Paper>
  );
}
