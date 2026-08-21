"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import {
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
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { useAppSession } from "@/features/session/hooks/use-app-session";
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

export function BookingDetailsScreen({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const { session } = useAppSession();
  const client = useMemo(() => createClient(), []);
  const propertyId = session?.activePropertyId;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<"checkin" | "checkout" | null>(null);
  const [working, setWorking] = useState(false);
  const [allowBalance, setAllowBalance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
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
  const confirm = async () => {
    if (!booking || !action) return;
    setWorking(true);
    setError(null);
    try {
      if (action === "checkin") await checkInBooking(client, booking.id);
      else await checkoutBooking(client, booking.id, allowBalance);
      setMessage(
        action === "checkin"
          ? "Guest checked in successfully."
          : "Guest checked out successfully.",
      );
      setAction(null);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action failed.");
    } finally {
      setWorking(false);
    }
  };
  if (loading)
    return (
      <Box sx={{ display: "grid", minHeight: "70dvh", placeItems: "center" }}>
        <CircularProgress size={30} />
      </Box>
    );
  if (!booking)
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="error">{error ?? "Booking not found."}</Alert>
      </Container>
    );
  const initials = booking.guestName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <Box sx={{ pb: { xs: 11, lg: 5 } }}>
      <Container maxWidth="lg" sx={{ py: { xs: 2.5, sm: 3.5, lg: 5 } }}>
        <Stack spacing={{ xs: 2.25, sm: 3 }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
            <IconButton aria-label="Back" onClick={() => router.back()}>
              <ArrowBackRoundedIcon />
            </IconButton>
            <Box>
              <Typography variant="h4">Booking details</Typography>
              <Typography color="text.secondary">
                {booking.bookingNumber}
              </Typography>
            </Box>
          </Stack>
          <Paper variant="outlined" sx={{ overflow: "hidden" }}>
            <Box
              sx={{
                bgcolor: "#14345B",
                color: "white",
                p: { xs: 2.25, sm: 3.25, lg: 4 },
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{ alignItems: { sm: "center" } }}
              >
                <Avatar
                  sx={{
                    bgcolor: "primary.main",
                    height: { xs: 56, sm: 64 },
                    width: { xs: 56, sm: 64 },
                  }}
                >
                  {initials || "G"}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h4">{booking.guestName}</Typography>
                  <Typography sx={{ opacity: 0.8, overflowWrap: "anywhere" }}>
                    {booking.phone || booking.email}
                  </Typography>
                </Box>
                <Chip
                  label={bookingStatusLabel(booking.status)}
                  color={
                    booking.status === "checked_in"
                      ? "success"
                      : booking.status === "confirmed"
                        ? "info"
                        : "default"
                  }
                  sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
                />
              </Stack>
            </Box>
            <Box
              sx={{
                display: "grid",
                gap: 0.5,
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(min(100%,140px),1fr))",
                p: { xs: 1.25, sm: 2 },
              }}
            >
              <Summary
                label="Check-in"
                value={formatLocalDate(booking.checkIn)}
              />
              <Summary
                label="Check-out"
                value={formatLocalDate(booking.checkOut)}
              />
              <Summary
                label="Guests"
                value={`${booking.adults} adults · ${booking.children} children`}
              />
              <Summary label="Total" value={money.format(booking.totalPrice)} />
            </Box>
          </Paper>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            }}
          >
            <Section title="Guest information">
              <Info
                icon={<PhoneRoundedIcon />}
                label="Phone"
                value={booking.phone}
              />
              <Info
                icon={<EmailRoundedIcon />}
                label="Email"
                value={booking.email}
              />
              <Info label="Gender" value={booking.gender} />
              <Info label="Nationality" value={booking.nationality} />
              <Info label="Occupation" value={booking.occupation} />
              {booking.emergencyName && (
                <Info
                  label="Emergency contact"
                  value={`${booking.emergencyName} · ${booking.emergencyPhone}`}
                />
              )}
            </Section>
            <Section title="Booking information">
              <Info
                icon={<CalendarMonthRoundedIcon />}
                label="Stay"
                value={`${formatLocalDate(booking.checkIn)} – ${formatLocalDate(booking.checkOut)}`}
              />
              <Info
                icon={<BedRoundedIcon />}
                label="Room"
                value={`${booking.roomName} · ${booking.roomType}`}
              />
              <Info
                label="Booked"
                value={formatLocalDateTime(booking.createdAt)}
              />
              {booking.checkedInAt && (
                <Info
                  label="Checked in"
                  value={formatLocalDateTime(booking.checkedInAt)}
                />
              )}
              {booking.checkedOutAt && (
                <Info
                  label="Checked out"
                  value={formatLocalDateTime(booking.checkedOutAt)}
                />
              )}
              <Info label="Source" value={booking.bookingSource} />
              <Info
                label="Special requests"
                value={booking.specialRequests || "None"}
              />
            </Section>
            <Section title="Payment details">
              <Info
                icon={<PaymentsRoundedIcon />}
                label="Total price"
                value={money.format(booking.totalPrice)}
              />
              <Info
                label="Amount paid"
                value={money.format(booking.amountPaid)}
              />
              <Info
                label="Balance due"
                value={money.format(booking.balanceDue)}
              />
              <Info
                label="Payment status"
                value={bookingStatusLabel(booking.paymentStatus)}
              />
              <Info
                label="Last method"
                value={booking.lastPaymentMethod || "-"}
              />
            </Section>
            <Section title="Travel & identification">
              <Info label="Coming from" value={booking.whereFrom || "-"} />
              <Info label="Going to" value={booking.whereTo || "-"} />
              <Info label="ID type" value={booking.idType || "-"} />
              <Info label="ID number" value={booking.idNumber || "-"} />
            </Section>
          </Box>
          {booking.status === "confirmed" && (
            <Button
              size="large"
              variant="contained"
              startIcon={<LoginRoundedIcon />}
              onClick={() => setAction("checkin")}
              sx={{
                alignSelf: { sm: "flex-end" },
                minWidth: { sm: 220 },
                width: { xs: "100%", sm: "auto" },
              }}
            >
              Check in guest
            </Button>
          )}
          {booking.status === "checked_in" && (
            <Button
              size="large"
              variant="contained"
              startIcon={<LogoutRoundedIcon />}
              onClick={() => setAction("checkout")}
              sx={{
                alignSelf: { sm: "flex-end" },
                minWidth: { sm: 220 },
                width: { xs: "100%", sm: "auto" },
              }}
            >
              Check out guest
            </Button>
          )}
        </Stack>
      </Container>
      <ResponsiveModal
        open={Boolean(action)}
        onClose={() => !working && setAction(null)}
        maxWidth="xs"
      >
        <DialogTitle>
          {action === "checkin" ? "Check in guest?" : "Check out guest?"}
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Confirm {booking.guestName}&apos;s{" "}
            {action === "checkin" ? "arrival" : "departure"}.
          </Typography>
          {action === "checkout" && booking.balanceDue > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Outstanding balance: {money.format(booking.balanceDue)}.
            </Alert>
          )}
          {action === "checkout" && booking.balanceDue > 0 && (
            <Button
              color={allowBalance ? "warning" : "inherit"}
              onClick={() => setAllowBalance((value) => !value)}
              sx={{ mt: 1 }}
            >
              {allowBalance
                ? "Balance checkout allowed"
                : "Allow checkout with balance"}
            </Button>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAction(null)} disabled={working}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void confirm()}
            disabled={working}
          >
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
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ p: 1.5 }}>
      <Typography color="text.secondary" variant="caption">
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 700 }}>{value}</Typography>
    </Box>
  );
}
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Typography variant="h6" sx={{ mb: 1.5 }}>
        {title}
      </Typography>
      <Stack divider={<Divider flexItem />} spacing={0}>
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
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={{ xs: 0.35, sm: 1.2 }}
      sx={{ alignItems: { sm: "center" }, py: 1.2 }}
    >
      {icon && (
        <Box
          sx={{ color: "primary.main", display: { xs: "none", sm: "block" } }}
        >
          {icon}
        </Box>
      )}
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
      <Typography
        sx={{
          fontWeight: 700,
          ml: { sm: "auto!important" },
          overflowWrap: "anywhere",
          textAlign: { sm: "right" },
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}
