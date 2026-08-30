"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Snackbar,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import {
  getWorkspaceCapabilities,
  normalizeWorkspaceRole,
} from "@/features/session/permissions";
import { createClient } from "@/lib/supabase/client";
import {
  checkInBooking,
  checkoutBooking,
  getBooking,
} from "@/features/bookings/services/booking-service";
import {
  bookingStatusLabel,
  type Booking,
} from "@/features/bookings/models/booking";
import { formatLocalDate, formatLocalDateTime } from "@/lib/date-time";

const money = new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
});

type BookingAction = "checkin" | "checkout";
type ChipTone = "success" | "info" | "warning" | "error" | "default";

function bookingStatusTone(status: string): ChipTone {
  const normalized = status.toLowerCase();
  if (normalized === "checked_in" || normalized === "checked_out") return "success";
  if (normalized === "confirmed") return "info";
  if (normalized === "reserved" || normalized === "pending") return "warning";
  if (normalized === "cancelled" || normalized === "canceled") return "error";
  return "default";
}

function paymentTone(status: string, balanceDue: number): ChipTone {
  if (balanceDue <= 0) return "success";
  if (status.toLowerCase() === "partially_paid") return "warning";
  if (status.toLowerCase() === "unpaid") return "error";
  return "warning";
}

function stayNights(booking: Booking) {
  const difference = booking.checkOut.getTime() - booking.checkIn.getTime();
  return Math.max(0, Math.round(difference / 86_400_000));
}

export function BookingDetailsScreen({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const {
    session,
    loading: sessionLoading,
    error: sessionError,
  } = useAppSession();
  const client = useMemo(() => createClient(), []);
  const propertyId = session?.activePropertyId;
  const role = normalizeWorkspaceRole(session?.activeRole);
  const capabilities = getWorkspaceCapabilities(role);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<BookingAction | null>(null);
  const [working, setWorking] = useState(false);
  const [allowBalance, setAllowBalance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    setError(null);
    try {
      setBooking(await getBooking(client, propertyId, bookingId));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load booking.",
      );
    } finally {
      setLoading(false);
    }
  }, [bookingId, client, propertyId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const openAction = (nextAction: BookingAction) => {
    setAllowBalance(false);
    setAction(nextAction);
  };

  const closeAction = () => {
    if (working) return;
    setAllowBalance(false);
    setAction(null);
  };

  const confirm = async () => {
    if (!booking || !action) return;
    if (action === "checkin" && !capabilities.canCheckIn) {
      setError("Your role cannot check in guests.");
      closeAction();
      return;
    }
    if (action === "checkout" && !capabilities.canCheckout) {
      setError("Your role cannot check out guests.");
      closeAction();
      return;
    }

    setWorking(true);
    setError(null);
    try {
      if (action === "checkin") {
        await checkInBooking(client, booking.id);
      } else {
        await checkoutBooking(client, booking.id, allowBalance);
      }
      setMessage(
        action === "checkin"
          ? "Guest checked in successfully."
          : "Guest checked out successfully.",
      );
      setAction(null);
      setAllowBalance(false);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action failed.");
    } finally {
      setWorking(false);
    }
  };

  if (sessionLoading) return <BookingDetailsLoading />;

  if (sessionError || !propertyId) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 5, sm: 8 } }}>
        <Alert severity="error">
          {sessionError?.message ?? "Select an active property to view this booking."}
        </Alert>
      </Container>
    );
  }

  if (loading) return <BookingDetailsLoading />;

  if (!booking) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 5, sm: 8 } }}>
        <Stack spacing={1.5}>
          <Alert severity="error">{error ?? "Booking not found."}</Alert>
          <Button onClick={() => void refresh()} variant="outlined">
            Try again
          </Button>
        </Stack>
      </Container>
    );
  }

  const canCheckIn =
    capabilities.canCheckIn &&
    ["confirmed", "reserved"].includes(booking.status);
  const canCheckout = capabilities.canCheckout && booking.status === "checked_in";
  const canSeeSettlement = capabilities.canViewFinance || capabilities.canCheckout;
  const pendingAction: BookingAction | null = canCheckIn
    ? "checkin"
    : canCheckout
      ? "checkout"
      : null;

  return (
    <Box sx={{ minHeight: "100dvh", pb: { xs: pendingAction ? 16 : 10, md: 5 } }}>
      <Container maxWidth="xl" sx={{ py: { xs: 1.75, sm: 2.5, lg: 3 } }}>
        <Stack spacing={{ xs: 1.5, md: 2 }}>
          <BookingNavigation
            bookingNumber={booking.bookingNumber}
            onBack={() => router.back()}
          />

          <BookingHero
            booking={booking}
            role={role}
          />

          {pendingAction ? (
            <Box sx={{ display: { xs: "none", sm: "block" } }}>
              <StayActionButton action={pendingAction} onAction={openAction} />
            </Box>
          ) : null}

          {["confirmed", "checked_in"].includes(booking.status) && !pendingAction ? (
            <Alert severity="info">
              Your current role is view-only for this stage of the stay.
            </Alert>
          ) : null}

          <Box
            sx={{
              alignItems: "start",
              display: "grid",
              gap: { xs: 1.5, lg: 2 },
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                lg: "minmax(0, 1.35fr) minmax(320px, .8fr)",
              },
            }}
          >
            <Stack spacing={{ xs: 1.5, md: 2 }}>
              <ActivityTimeline
                booking={booking}
                canSeeSettlement={canSeeSettlement}
              />
              <BookingDetailsSection
                defaultExpanded
                icon={<PersonRoundedIcon fontSize="small" />}
                title="Guest profile"
              >
                <Info icon={<PhoneRoundedIcon />} label="Phone" value={booking.phone} />
                <Info icon={<EmailRoundedIcon />} label="Email" value={booking.email} />
                <Info label="Gender" value={booking.gender} />
                <Info label="Nationality" value={booking.nationality} />
                <Info label="Occupation" value={booking.occupation} />
                {booking.emergencyName ? (
                  <Info
                    label="Emergency contact"
                    value={booking.emergencyName + (booking.emergencyPhone ? " · " + booking.emergencyPhone : "")}
                  />
                ) : null}
              </BookingDetailsSection>

              <BookingDetailsSection
                defaultExpanded
                icon={<EventAvailableRoundedIcon fontSize="small" />}
                title="Stay & room"
              >
                <Info
                  icon={<CalendarMonthRoundedIcon />}
                  label="Stay"
                  value={formatLocalDate(booking.checkIn) + " – " + formatLocalDate(booking.checkOut)}
                />
                <Info
                  icon={<BedRoundedIcon />}
                  label="Room"
                  value={booking.roomName + " · " + booking.roomType}
                />
                <Info
                  label="Guests"
                  value={booking.adults + " adults · " + booking.children + " children"}
                />
                <Info label="Source" value={booking.bookingSource} />
                <Info label="Booked" value={formatLocalDateTime(booking.createdAt)} />
                {booking.checkedInAt ? (
                  <Info label="Checked in" value={formatLocalDateTime(booking.checkedInAt)} />
                ) : null}
                {booking.checkedOutAt ? (
                  <Info label="Checked out" value={formatLocalDateTime(booking.checkedOutAt)} />
                ) : null}
                <Info
                  label="Special requests"
                  value={booking.specialRequests || "None recorded"}
                />
              </BookingDetailsSection>

              <BookingDetailsSection
                icon={<ReceiptLongRoundedIcon fontSize="small" />}
                title="Travel & identification"
              >
                <Info label="Coming from" value={booking.whereFrom || "Not recorded"} />
                <Info label="Going to" value={booking.whereTo || "Not recorded"} />
                <Info label="ID type" value={booking.idType || "Not recorded"} />
                <Info label="ID number" value={booking.idNumber || "Not recorded"} />
              </BookingDetailsSection>
            </Stack>

            <Stack spacing={{ xs: 1.5, md: 2 }} sx={{ position: { lg: "sticky" }, top: { lg: 20 } }}>
              <SettlementPanel booking={booking} canSeeSettlement={canSeeSettlement} />
              <StaySnapshot booking={booking} />
            </Stack>
          </Box>
        </Stack>
      </Container>

      {pendingAction ? (
        <Paper
          elevation={4}
          sx={{
            bottom: "calc(env(safe-area-inset-bottom) + 70px)",
            display: { xs: "block", sm: "none" },
            left: 12,
            p: 1,
            position: "fixed",
            right: 12,
            zIndex: (theme) => theme.zIndex.appBar,
          }}
        >
          <StayActionButton action={pendingAction} onAction={openAction} />
        </Paper>
      ) : null}

      <ResponsiveModal open={Boolean(action)} onClose={closeAction} maxWidth="xs">
        <DialogTitle>
          {action === "checkin" ? "Check in guest?" : "Check out guest?"}
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Confirm {booking.guestName}&apos;s{" "}
            {action === "checkin" ? "arrival" : "departure"}.
          </Typography>
          {action === "checkout" && booking.balanceDue > 0 ? (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Outstanding balance: {money.format(booking.balanceDue)}. A checkout
              with a balance needs an explicit approval.
            </Alert>
          ) : null}
          {action === "checkout" && booking.balanceDue > 0 ? (
            <Button
              aria-pressed={allowBalance}
              color={allowBalance ? "warning" : "inherit"}
              onClick={() => setAllowBalance((value) => !value)}
              variant={allowBalance ? "contained" : "outlined"}
              sx={{ mt: 1.5 }}
            >
              {allowBalance
                ? "Checkout with balance approved"
                : "Allow checkout with balance"}
            </Button>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAction} disabled={working}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void confirm()} disabled={working}>
            {working ? "Please wait…" : "Confirm"}
          </Button>
        </DialogActions>
      </ResponsiveModal>

      <Snackbar
        open={Boolean(message || error)}
        autoHideDuration={5000}
        onClose={() => {
          setMessage(null);
          setError(null);
        }}
      >
        <Alert severity={error ? "error" : "success"} variant="filled">
          {error || message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function BookingDetailsLoading() {
  return (
    <Box sx={{ display: "grid", minHeight: "70dvh", placeItems: "center" }}>
      <Stack spacing={1.25} sx={{ alignItems: "center" }}>
        <CircularProgress size={30} />
        <Typography color="text.secondary" variant="caption">
          Loading reservation workspace
        </Typography>
      </Stack>
    </Box>
  );
}

function BookingNavigation({
  bookingNumber,
  onBack,
}: {
  bookingNumber: string;
  onBack: () => void;
}) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
      <IconButton aria-label="Back to bookings" onClick={onBack}>
        <ArrowBackRoundedIcon />
      </IconButton>
      <Box sx={{ minWidth: 0 }}>
        <Typography color="text.secondary" variant="overline">
          RESERVATIONS · DETAIL
        </Typography>
        <Typography variant="h4">Booking detail</Typography>
        <Typography color="text.secondary" noWrap variant="body2">
          {bookingNumber}
        </Typography>
      </Box>
    </Stack>
  );
}

function BookingHero({
  booking,
  role,
}: {
  booking: Booking;
  role: string;
}) {
  const initials = booking.guestName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const status = booking.status.toLowerCase();
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Box
        sx={{
          bgcolor: "primary.dark",
          color: "primary.contrastText",
          p: { xs: 1.75, sm: 2.5, lg: 3 },
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 1.5, sm: 2 }}
          sx={{ alignItems: { sm: "center" } }}
        >
          <Avatar
            sx={{
              bgcolor: "rgba(255,255,255,.15)",
              color: "inherit",
              fontWeight: 700,
              height: { xs: 52, sm: 62 },
              width: { xs: 52, sm: 62 },
            }}
          >
            {initials || "G"}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: ".75rem", fontWeight: 700, letterSpacing: ".08em", opacity: 0.72 }}>
              GUEST RESERVATION
            </Typography>
            <Typography variant="h3">{booking.guestName}</Typography>
            <Typography sx={{ fontSize: ".8125rem", mt: 0.35, opacity: 0.78, overflowWrap: "anywhere" }}>
              {booking.phone || booking.email || "Contact details not recorded"}
            </Typography>
          </Box>
          <Stack
            direction={{ xs: "row", sm: "column" }}
            spacing={0.75}
            sx={{ alignItems: { sm: "flex-end" }, flexWrap: "wrap" }}
          >
            <Chip
              color={bookingStatusTone(status)}
              label={bookingStatusLabel(booking.status)}
              size="small"
              sx={{ bgcolor: "rgba(255,255,255,.12)", color: "inherit" }}
            />
            <Typography sx={{ fontSize: ".75rem", opacity: 0.68 }}>
              {role + " workspace"}
            </Typography>
          </Stack>
        </Stack>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={0.75}
          sx={{ alignItems: { sm: "center" }, mt: { xs: 1.75, sm: 2.5 } }}
        >
          <Chip
            icon={<BedRoundedIcon />}
            label={booking.roomName + " · " + booking.roomType}
            size="small"
            sx={{
              bgcolor: "rgba(255,255,255,.1)",
              color: "inherit",
              "& .MuiChip-icon": { color: "inherit" },
            }}
          />
          <Chip
            icon={<CalendarMonthRoundedIcon />}
            label={formatLocalDate(booking.checkIn) + " → " + formatLocalDate(booking.checkOut)}
            size="small"
            sx={{
              bgcolor: "rgba(255,255,255,.1)",
              color: "inherit",
              "& .MuiChip-icon": { color: "inherit" },
            }}
          />
        </Stack>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            sm: "repeat(4, minmax(0, 1fr))",
          },
        }}
      >
        <HeroMetric label="Arrival" value={formatLocalDate(booking.checkIn)} />
        <HeroMetric label="Departure" value={formatLocalDate(booking.checkOut)} />
        <HeroMetric label="Guests" value={String(booking.totalGuests)} />
        <HeroMetric label="Room" value={booking.roomName} />
      </Box>
    </Paper>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        borderRight: { sm: "1px solid" },
        borderBottom: { xs: "1px solid", sm: 0 },
        borderColor: "divider",
        minWidth: 0,
        p: { xs: 1.25, sm: 1.75 },
        "&:nth-of-type(2)": { borderRight: { xs: 0, sm: "1px solid" } },
        "&:nth-of-type(4)": { borderRight: 0 },
        "&:nth-of-type(-n+2)": { borderBottom: { sm: 0 } },
      }}
    >
      <Typography color="text.secondary" variant="caption">
        {label}
      </Typography>
      <Typography noWrap sx={{ fontSize: ".875rem", fontWeight: 700, mt: 0.3 }}>
        {value}
      </Typography>
    </Box>
  );
}

function StayActionButton({
  action,
  onAction,
}: {
  action: BookingAction;
  onAction: (action: BookingAction) => void;
}) {
  const checkout = action === "checkout";
  return (
    <Button
      fullWidth
      size="large"
      startIcon={checkout ? <LogoutRoundedIcon /> : <LoginRoundedIcon />}
      onClick={() => onAction(action)}
      variant="contained"
      sx={{ minWidth: { sm: 220 } }}
    >
      {checkout ? "Check out guest" : "Check in guest"}
    </Button>
  );
}

function SettlementPanel({
  booking,
  canSeeSettlement,
}: {
  booking: Booking;
  canSeeSettlement: boolean;
}) {
  const total = Math.max(booking.totalPrice, 0);
  const paid = Math.max(booking.amountPaid, 0);
  const ratio = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Box
        sx={{
          alignItems: "center",
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          gap: 1,
          p: { xs: 1.5, sm: 2 },
        }}
      >
        <Box
          sx={{
            alignItems: "center",
            bgcolor: "action.hover",
            borderRadius: 1.5,
            color: "primary.main",
            display: "inline-flex",
            height: 34,
            justifyContent: "center",
            width: 34,
          }}
        >
          <AccountBalanceWalletRoundedIcon fontSize="small" />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Settlement
          </Typography>
          <Typography color="text.secondary" variant="caption">
            Booking payment position
          </Typography>
        </Box>
        <Chip
          color={paymentTone(booking.paymentStatus, booking.balanceDue)}
          label={bookingStatusLabel(booking.paymentStatus)}
          size="small"
        />
      </Box>

      {canSeeSettlement ? (
        <>
          <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Stack direction="row" sx={{ alignItems: "end", justifyContent: "space-between" }}>
              <Box>
                <Typography color="text.secondary" variant="caption">
                  Collected
                </Typography>
                <Typography color="primary.main" variant="h4">
                  {money.format(booking.amountPaid)}
                </Typography>
              </Box>
              <Typography color="text.secondary" variant="caption">
                {ratio}% of total
              </Typography>
            </Stack>
            <LinearProgress
              color={booking.balanceDue > 0 ? "warning" : "success"}
              value={ratio}
              variant="determinate"
              sx={{ borderRadius: 99, height: 7, mt: 1.25 }}
            />
          </Box>
          <Box
            sx={{
              borderTop: "1px solid",
              borderColor: "divider",
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            }}
          >
            <SettlementMetric label="Total" value={money.format(booking.totalPrice)} />
            <SettlementMetric
              accent={booking.balanceDue > 0 ? "warning.main" : "success.main"}
              label={booking.balanceDue > 0 ? "Outstanding" : "Settled"}
              value={money.format(booking.balanceDue)}
            />
          </Box>
          <Stack divider={<Divider flexItem />} spacing={0} sx={{ px: { xs: 1.5, sm: 2 } }}>
            <CompactInfo label="Payment records" value={String(booking.paymentCount)} />
            <CompactInfo label="Latest method" value={booking.lastPaymentMethod || "Not recorded"} />
          </Stack>
        </>
      ) : (
        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Alert severity="info">
            Payment status is visible, while settlement amounts are restricted for your role.
          </Alert>
        </Box>
      )}
    </Paper>
  );
}

function SettlementMetric({
  accent,
  label,
  value,
}: {
  accent?: string;
  label: string;
  value: string;
}) {
  return (
    <Box sx={{ minWidth: 0, p: { xs: 1.25, sm: 1.5 }, "& + &": { borderLeft: "1px solid", borderColor: "divider" } }}>
      <Typography color="text.secondary" variant="caption">
        {label}
      </Typography>
      <Typography sx={{ color: accent, fontSize: ".9375rem", fontWeight: 800, mt: 0.25 }} noWrap>
        {value}
      </Typography>
    </Box>
  );
}

function CompactInfo({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", py: 1.15 }}>
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
      <Typography sx={{ fontSize: ".8125rem", fontWeight: 700, textAlign: "right" }}>
        {value}
      </Typography>
    </Stack>
  );
}

function StaySnapshot({ booking }: { booking: Booking }) {
  const nights = stayNights(booking);
  const checkedIn = Boolean(booking.checkedInAt) || ["checked_in", "checked_out"].includes(booking.status);
  const checkedOut = Boolean(booking.checkedOutAt) || booking.status === "checked_out";

  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
      <Stack spacing={1.25}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <CheckCircleRoundedIcon color={checkedOut ? "success" : "action"} fontSize="small" />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Stay control
            </Typography>
            <Typography color="text.secondary" variant="caption">
              Operational snapshot
            </Typography>
          </Box>
        </Stack>
        <Box
          sx={{
            display: "grid",
            gap: 1,
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          }}
        >
          <SnapshotMetric label="Nights" value={String(nights)} />
          <SnapshotMetric label="Arrival" value={checkedIn ? "Done" : "Due"} />
          <SnapshotMetric label="Departure" value={checkedOut ? "Done" : "Open"} />
        </Box>
      </Stack>
    </Paper>
  );
}

function SnapshotMetric({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ bgcolor: "action.hover", borderRadius: 1.5, minWidth: 0, p: 1 }}>
      <Typography color="text.secondary" variant="caption">
        {label}
      </Typography>
      <Typography noWrap sx={{ fontSize: ".8125rem", fontWeight: 800 }}>
        {value}
      </Typography>
    </Box>
  );
}

function ActivityTimeline({
  booking,
  canSeeSettlement,
}: {
  booking: Booking;
  canSeeSettlement: boolean;
}) {
  const normalized = booking.status.toLowerCase();
  const checkedIn = Boolean(booking.checkedInAt) || ["checked_in", "checked_out"].includes(normalized);
  const checkedOut = Boolean(booking.checkedOutAt) || normalized === "checked_out";
  const confirmed = !["pending", "cancelled", "canceled"].includes(normalized);
  const paid = booking.amountPaid > 0;
  const events = [
    {
      label: "Created",
      done: true,
      value: formatLocalDateTime(booking.createdAt),
    },
    {
      label: "Confirmed",
      done: confirmed,
      value: confirmed ? bookingStatusLabel(booking.status) : "Awaiting confirmation",
    },
    {
      label: "Payment",
      done: paid,
      value: paid
        ? canSeeSettlement
          ? money.format(booking.amountPaid) + " received"
          : bookingStatusLabel(booking.paymentStatus)
        : "No payment recorded",
    },
    {
      label: "Checked in",
      done: checkedIn,
      value: booking.checkedInAt ? formatLocalDateTime(booking.checkedInAt) : "Not yet",
    },
    {
      label: "Checked out",
      done: checkedOut,
      value: booking.checkedOutAt ? formatLocalDateTime(booking.checkedOutAt) : "Not yet",
    },
  ];

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Box
        sx={{
          alignItems: "center",
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          gap: 1,
          p: { xs: 1.5, sm: 2 },
        }}
      >
        <ReceiptLongRoundedIcon color="primary" fontSize="small" />
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Activity timeline
          </Typography>
          <Typography color="text.secondary" variant="caption">
            What has happened to this reservation
          </Typography>
        </Box>
      </Box>
      <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Box
          component="ol"
          aria-label="Booking activity timeline"
          sx={{
            display: "grid",
            gap: { xs: 1.25, md: 0 },
            gridTemplateColumns: { xs: "1fr", md: "repeat(5, minmax(0, 1fr))" },
            listStyle: "none",
            m: 0,
            p: 0,
          }}
        >
          {events.map((event, index) => (
            <Box
              component="li"
              key={event.label}
              sx={{
                minWidth: 0,
                pl: { xs: 3.25, md: 0 },
                position: "relative",
                pt: { md: 3.25 },
                textAlign: { md: "center" },
              }}
            >
              {index < events.length - 1 ? (
                <Box
                  sx={{
                    bgcolor: event.done ? "primary.main" : "divider",
                    height: { xs: "calc(100% + 10px)", md: 2 },
                    left: { xs: 7, md: "50%" },
                    position: "absolute",
                    top: { xs: 14, md: 7 },
                    width: { xs: 2, md: "100%" },
                  }}
                />
              ) : null}
              <Box
                sx={{
                  bgcolor: event.done ? "primary.main" : "background.paper",
                  border: "2px solid",
                  borderColor: event.done ? "primary.main" : "divider",
                  borderRadius: "50%",
                  height: 16,
                  left: { xs: 0, md: "calc(50% - 8px)" },
                  position: "absolute",
                  top: { xs: 3, md: 0 },
                  width: 16,
                  zIndex: 1,
                }}
              />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {event.label}
              </Typography>
              <Typography
                color="text.secondary"
                variant="caption"
                sx={{ display: "block", mt: 0.25, overflowWrap: "anywhere" }}
              >
                {event.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Paper>
  );
}

function BookingDetailsSection({
  children,
  defaultExpanded = false,
  icon,
  title,
}: {
  children: ReactNode;
  defaultExpanded?: boolean;
  icon: ReactNode;
  title: string;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const sectionId = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  if (isMobile) {
    return (
      <Accordion
        defaultExpanded={defaultExpanded}
        disableGutters
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreRoundedIcon />}
          aria-controls={sectionId + "-content"}
          id={sectionId + "-header"}
          sx={{
            minHeight: 58,
            px: 1.5,
            "& .MuiAccordionSummary-content": { alignItems: "center", gap: 1, my: 1.25 },
          }}
        >
          <Box sx={{ color: "primary.main", display: "inline-flex" }}>{icon}</Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
        </AccordionSummary>
        <AccordionDetails
          id={sectionId + "-content"}
          sx={{ borderTop: "1px solid", borderColor: "divider", px: 1.5, py: 0.5 }}
        >
          <Stack divider={<Divider flexItem />} spacing={0}>
            {children}
          </Stack>
        </AccordionDetails>
      </Accordion>
    );
  }

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", borderBottom: "1px solid", borderColor: "divider", p: { sm: 2 } }}
      >
        <Box sx={{ color: "primary.main", display: "inline-flex" }}>{icon}</Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
      </Stack>
      <Stack divider={<Divider flexItem />} spacing={0} sx={{ px: 2 }}>
        {children}
      </Stack>
    </Paper>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={{ xs: 0.35, sm: 1 }}
      sx={{ alignItems: { sm: "center" }, py: 1.1 }}
    >
      {icon ? (
        <Box sx={{ color: "primary.main", display: { xs: "none", sm: "inline-flex" } }}>
          {icon}
        </Box>
      ) : null}
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: ".8125rem",
          fontWeight: 700,
          ml: { sm: "auto" },
          overflowWrap: "anywhere",
          textAlign: { sm: "right" },
        }}
      >
        {value || "Not recorded"}
      </Typography>
    </Stack>
  );
}
