"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
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
  const { session } = useAppSession();
  const client = useMemo(() => createClient(), []);
  const propertyId = session?.activePropertyId;
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

  return (
    <>
      <Container maxWidth="xl" sx={{ py: { xs: 1.75, sm: 2.5, lg: 3 } }}>
        <Stack spacing={{ xs: 1.5, sm: 2 }}>
          <Typography component="h1" variant="h4">
            Bookings
          </Typography>

          <Paper
            variant="outlined"
            sx={{ borderRadius: 1, p: { xs: 1.75, sm: 2.5 } }}
          >
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              <TextField
                placeholder="Search guest, booking number or phone"
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
                      ? "All booking statuses"
                      : bookingStatusLabel(item)}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            {todayView && (
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: "center", mt: 1.5 }}
              >
                <Chip
                  color="primary"
                  label={
                    todayView === "checkins"
                      ? "Check-ins today"
                      : "Check-outs today"
                  }
                  onDelete={() => {
                    setTodayView(null);
                    window.history.replaceState({}, "", "/bookings");
                  }}
                />
                <Typography color="text.secondary" variant="caption">
                  Showing today’s{" "}
                  {todayView === "checkins" ? "arrivals" : "departures"}.
                </Typography>
              </Stack>
            )}
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
            <BookingTable bookings={visible} />
          )}
        </Stack>
      </Container>
      <Fab
        component={Link}
        href="/bookings/new"
        color="primary"
        variant="extended"
        sx={{
          bottom: { xs: 20, sm: 28 },
          position: "fixed",
          right: { xs: 18, sm: 28 },
          zIndex: (theme) => theme.zIndex.speedDial,
        }}
      >
        <AddRoundedIcon sx={{ mr: 1 }} />
        New booking
      </Fab>
    </>
  );
}

function BookingTable({ bookings }: { bookings: Booking[] }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 1, overflow: "hidden" }}>
      <Box
        sx={{
          bgcolor: "#F7F9FB",
          borderBottom: "1px solid",
          borderColor: "divider",
          display: { xs: "none", lg: "grid" },
          gap: 2,
          gridTemplateColumns:
            "minmax(210px,1.3fr) minmax(140px,.8fr) minmax(180px,1fr) 120px 140px",
          px: 2.5,
          py: 1.4,
        }}
      >
        <TableLabel>Guest</TableLabel>
        <TableLabel>Room</TableLabel>
        <TableLabel>Stay</TableLabel>
        <TableLabel>Status</TableLabel>
        <TableLabel align="right">Total</TableLabel>
      </Box>
      {bookings.map((booking, index) => (
        <BookingRow
          key={booking.id}
          booking={booking}
          last={index === bookings.length - 1}
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

function BookingRow({ booking, last }: { booking: Booking; last: boolean }) {
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
          lg: "minmax(210px,1.3fr) minmax(140px,.8fr) minmax(180px,1fr) 120px 140px",
        },
        px: { xs: 1.5, sm: 2, lg: 2.5 },
        py: { xs: 1.75, lg: 1.6 },
        textDecoration: "none",
        transition: "background 150ms ease",
        "&:hover": { bgcolor: "#F8FAFC" },
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Avatar
          sx={{
            bgcolor: "#EAF3FF",
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
        <Typography variant="body2" sx={{ fontWeight: 650 }}>
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
          <Typography sx={{ fontWeight: 700 }}>
            {money.format(booking.totalPrice)}
          </Typography>
          {booking.balanceDue > 0 && (
            <Typography color="warning.main" variant="caption">
              {money.format(booking.balanceDue)} due
            </Typography>
          )}
        </Box>
      </Box>
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
          bgcolor: "#EAF3FF",
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
