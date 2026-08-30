"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import EditCalendarRoundedIcon from "@mui/icons-material/EditCalendarRounded";
import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Container,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { StatusPill, StickyMobileActionBar, type StatusTone } from "@/components/shared/workspace-ui";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { getWorkspaceCapabilities } from "@/features/session/permissions";
import { createClient } from "@/lib/supabase/client";
import {
  getBookingWorkspace,
  getAvailableRooms,
  recordBookingPayment,
  updateBookingLifecycle,
  updatePropertyBooking,
  type BookingLifecycleAction,
} from "@/features/bookings/services/booking-service";
import {
  bookingStatusLabel,
  type Booking,
  type BookingActivity,
  type BookingWorkspace,
  type AvailableRoom,
} from "@/features/bookings/models/booking";
import { formatLocalDate, formatLocalDateTime, localDateKey } from "@/lib/date-time";
import { useAppFeedback } from "@/components/providers/feedback-provider";

const money = new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
});

type ActionDefinition = {
  action: BookingLifecycleAction;
  label: string;
  title: string;
  description: string;
  dangerous?: boolean;
  reasonRequired?: boolean;
};

const actionDefinitions: Record<BookingLifecycleAction, ActionDefinition> = {
  confirm: { action: "confirm", label: "Confirm booking", title: "Confirm this reservation?", description: "The reservation will become confirmed and ready for arrival processing." },
  check_in: { action: "check_in", label: "Check in guest", title: "Check in this guest?", description: "This confirms the guest has arrived and places the assigned room in occupied state." },
  check_out: { action: "check_out", label: "Check out guest", title: "Check out this guest?", description: "This ends the stay and sends the room to housekeeping." },
  cancel: { action: "cancel", label: "Cancel booking", title: "Cancel this reservation?", description: "The room will be released. Add a reason for the operational record.", dangerous: true, reasonRequired: true },
  mark_no_show: { action: "mark_no_show", label: "Mark as no-show", title: "Mark guest as a no-show?", description: "The reservation will close without check-in. Add a reason for the record.", dangerous: true, reasonRequired: true },
  reinstate: { action: "reinstate", label: "Reinstate booking", title: "Reinstate this reservation?", description: "The server will revalidate the room and restore the reservation when possible." },
};

function statusTone(status: string): StatusTone {
  if (status === "checked_in") return "success";
  if (status === "confirmed" || status === "reserved") return "info";
  if (status === "pending") return "warning";
  if (status === "cancelled" || status === "no_show") return "danger";
  return "neutral";
}

export function BookingDetailsScreen({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const { session, loading: sessionLoading, error: sessionError } = useAppSession();
  const client = useMemo(() => createClient(), []);
  const feedback = useAppFeedback();
  const propertyId = session?.activePropertyId;
  const localCapabilities = getWorkspaceCapabilities(session?.activeRole);
  const [workspaceState, setWorkspaceState] = useState<BookingWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<{ propertyId: string; message: string } | null>(null);
  const [selectedAction, setSelectedAction] = useState<BookingLifecycleAction | null>(null);
  const [working, setWorking] = useState(false);
  const [reason, setReason] = useState("");
  const [allowBalance, setAllowBalance] = useState(false);
  const [amendOpen, setAmendOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const requestId = useRef(0);
  const activePropertyId = useRef<string | undefined>(undefined);
  const workspace = workspaceState && workspaceState.propertyId === propertyId ? workspaceState : null;
  const error = errorState && errorState.propertyId === propertyId ? errorState.message : null;
  const dataLoading = loading || Boolean(workspaceState && workspaceState.propertyId !== propertyId);

  useEffect(() => {
    activePropertyId.current = propertyId;
    return () => {
      activePropertyId.current = undefined;
    };
  }, [propertyId]);

  const refresh = useCallback(async () => {
    if (!propertyId) {
      requestId.current += 1;
      setWorkspaceState(null);
      setLoading(false);
      return;
    }
    const requestPropertyId = propertyId;
    const currentRequest = ++requestId.current;
    setLoading(true);
    setErrorState(null);
    setWorkspaceState((current) => current?.propertyId === requestPropertyId ? current : null);
    try {
      const nextWorkspace = await getBookingWorkspace(client, requestPropertyId, bookingId);
      if (currentRequest !== requestId.current || activePropertyId.current !== requestPropertyId) return;
      setWorkspaceState(nextWorkspace);
    } catch (cause) {
      if (currentRequest !== requestId.current || activePropertyId.current !== requestPropertyId) return;
      setErrorState({
        propertyId: requestPropertyId,
        message: cause instanceof Error ? cause.message : "Unable to load booking.",
      });
    } finally {
      if (currentRequest !== requestId.current || activePropertyId.current !== requestPropertyId) return;
      setLoading(false);
    }
  }, [bookingId, client, propertyId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSelectedAction(null);
      setReason("");
      setAllowBalance(false);
      setAmendOpen(false);
      setPaymentOpen(false);
      setWorking(false);
      void refresh();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      requestId.current += 1;
    };
  }, [refresh]);

  if (sessionLoading) return <BookingDetailsSkeleton />;
  if (sessionError || !propertyId) {
    return <ErrorState actionLabel="Back" message={sessionError?.message ?? "Select an active property to view this booking."} onRetry={() => router.back()} />;
  }
  if (dataLoading) return <BookingDetailsSkeleton />;
  if (!workspace) return <ErrorState message={error ?? "Booking not found or you no longer have access."} onRetry={() => void refresh()} />;

  const booking = workspace.booking;
  const primaryAction = workspace.allowedActions.confirm
    ? actionDefinitions.confirm
    : workspace.allowedActions.checkIn
      ? actionDefinitions.check_in
      : workspace.allowedActions.checkOut
        ? actionDefinitions.check_out
        : workspace.allowedActions.reinstate
          ? actionDefinitions.reinstate
          : null;
  const secondaryActions = [
    workspace.allowedActions.cancel ? actionDefinitions.cancel : null,
    workspace.allowedActions.noShow ? actionDefinitions.mark_no_show : null,
  ].filter(Boolean) as ActionDefinition[];
  const canRecordPayment =
    localCapabilities.canRecordPayment &&
    workspace.allowedActions.recordPayment &&
    !["cancelled", "no_show"].includes(booking.status);
  const hasSettlement = booking.hasFinancials;

  const openAction = (action: BookingLifecycleAction) => {
    setErrorState(null);
    setReason("");
    setAllowBalance(false);
    setSelectedAction(action);
  };

  const closeAction = () => {
    if (working) return;
    setSelectedAction(null);
    setReason("");
    setAllowBalance(false);
  };

  const confirmAction = async () => {
    if (!selectedAction) return;
    const definition = actionDefinitions[selectedAction];
    const needsBalanceReason = selectedAction === "check_out" && workspace.requiresSettlement && allowBalance;
    if ((definition.reasonRequired || needsBalanceReason) && !reason.trim()) {
      setErrorState({ propertyId, message: "Add a reason before continuing." });
      return;
    }
    if (selectedAction === "check_out" && workspace.requiresSettlement && !allowBalance) {
      setErrorState({ propertyId, message: "Resolve the balance or explicitly approve checkout with an outstanding balance." });
      return;
    }

    const actionPropertyId = propertyId;
    const action = selectedAction;
    setWorking(true);
    setErrorState(null);
    try {
      await updateBookingLifecycle(client, actionPropertyId, booking.id, action, {
        reason,
        allowBalance,
      });
      if (activePropertyId.current !== actionPropertyId) return;
      feedback.success(`${definition.label} completed.`);
      setSelectedAction(null);
      setReason("");
      setAllowBalance(false);
      await refresh();
    } catch (cause) {
      if (activePropertyId.current === actionPropertyId) {
        setErrorState({
          propertyId: actionPropertyId,
          message: cause instanceof Error ? cause.message : "Unable to update booking.",
        });
      }
    } finally {
      if (activePropertyId.current === actionPropertyId) setWorking(false);
    }
  };

  return (
    <Box sx={{ pb: { xs: primaryAction ? 14 : 4, md: 5 } }}>
      <Container maxWidth="xl" sx={{ py: { xs: 1.5, sm: 2.5, lg: 3 } }}>
        <Stack spacing={{ xs: 1.5, md: 2.25 }}>
          <BookingHeader
            booking={booking}
            primaryAction={primaryAction}
            secondaryActions={secondaryActions}
            canAmend={workspace.allowedActions.edit}
            onBack={() => router.back()}
            onAction={openAction}
            onAmend={() => setAmendOpen(true)}
          />

          {error ? <Alert severity="error" onClose={() => setErrorState(null)}>{error}</Alert> : null}
          {workspace.blockedReason ? <Alert severity="info">{workspace.blockedReason}</Alert> : null}

          <LifecycleStrip booking={booking} />

          <Box sx={{ alignItems: "start", display: "grid", gap: { xs: 1.5, lg: 2 }, gridTemplateColumns: { xs: "1fr", lg: "minmax(0,1.35fr) minmax(320px,.75fr)" } }}>
            <Stack spacing={{ xs: 1.5, md: 2 }}>
              <DetailsSection icon={<CalendarMonthRoundedIcon />} title="Stay and room">
                <DetailRow label="Dates" value={`${formatLocalDate(booking.checkIn)} → ${formatLocalDate(booking.checkOut)}`} />
                <DetailRow label="Room" value={<LinkValue href={`/rooms/${booking.roomId}`}>{booking.roomName} · {booking.roomType}</LinkValue>} />
                <DetailRow label="Guests" value={`${booking.adults} adult${booking.adults === 1 ? "" : "s"} · ${booking.children} child${booking.children === 1 ? "" : "ren"}`} />
                <DetailRow label="Source" value={booking.bookingSource} />
                <DetailRow label="Special requests" value={booking.specialRequests || "None recorded"} />
              </DetailsSection>

              <DetailsSection
                icon={<PersonRoundedIcon />}
                title="Guest profile"
                action={
                  <Stack direction="row" spacing={0.5}>
                    {booking.phone ? <IconButton component="a" href={`tel:${booking.phone}`} aria-label="Call guest" size="small"><PhoneRoundedIcon fontSize="small" /></IconButton> : null}
                    {booking.email ? <IconButton component="a" href={`mailto:${booking.email}`} aria-label="Email guest" size="small"><EmailRoundedIcon fontSize="small" /></IconButton> : null}
                  </Stack>
                }
              >
                <DetailRow label="Name" value={booking.guestName} />
                <DetailRow label="Phone" value={booking.phone || "Not recorded"} />
                <DetailRow label="Email" value={booking.email || "Not recorded"} />
                <DetailRow label="Nationality" value={booking.nationality || "Not recorded"} />
                <DetailRow label="Occupation" value={booking.occupation || "Not recorded"} />
                <DetailRow label="ID" value={booking.idNumber ? `${bookingStatusLabel(booking.idType)} · ${booking.idNumber}` : "Not recorded"} />
                <DetailRow label="Travel" value={booking.whereFrom || booking.whereTo ? `${booking.whereFrom || "—"} → ${booking.whereTo || "—"}` : "Not recorded"} />
                <DetailRow label="Emergency contact" value={booking.emergencyName ? `${booking.emergencyName}${booking.emergencyPhone ? ` · ${booking.emergencyPhone}` : ""}` : "Not recorded"} />
              </DetailsSection>

              <ActivityPanel activity={workspace.activity} />
            </Stack>

            <Stack spacing={{ xs: 1.5, md: 2 }} sx={{ position: { lg: "sticky" }, top: { lg: 84 } }}>
              {hasSettlement ? (
                <SettlementPanel booking={booking} payments={workspace.payments} canRecordPayment={canRecordPayment} onRecordPayment={() => setPaymentOpen(true)} />
              ) : (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}><LockRoundedIcon color="action" fontSize="small" /><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Payment access restricted</Typography></Stack>
                  <Typography color="text.secondary" variant="body2" sx={{ mt: 0.75 }}>This role can manage the stay without receiving property financial amounts.</Typography>
                </Paper>
              )}
              <ReservationFacts booking={booking} />
            </Stack>
          </Box>
        </Stack>
      </Container>

      {primaryAction ? (
        <StickyMobileActionBar>
          <Button fullWidth startIcon={primaryAction.action === "check_out" ? <LogoutRoundedIcon /> : <LoginRoundedIcon />} variant="contained" onClick={() => openAction(primaryAction.action)}>{primaryAction.label}</Button>
        </StickyMobileActionBar>
      ) : null}

      <LifecycleModal
        action={selectedAction}
        allowBalance={allowBalance}
        error={error}
        reason={reason}
        requiresSettlement={workspace.requiresSettlement}
        working={working}
        onAllowBalance={setAllowBalance}
        onClose={closeAction}
        onConfirm={() => void confirmAction()}
        onReason={setReason}
      />
      <PaymentModal
        booking={booking}
        open={paymentOpen}
        propertyId={propertyId}
        onClose={() => setPaymentOpen(false)}
        onSaved={async () => {
          if (activePropertyId.current !== propertyId) return;
          setPaymentOpen(false);
          feedback.success("Payment recorded successfully.");
          await refresh();
        }}
      />
      {amendOpen ? (
        <AmendBookingModal
          booking={booking}
          businessDate={workspace.businessDate}
          propertyId={propertyId}
          onClose={() => setAmendOpen(false)}
          onSaved={async () => {
            if (activePropertyId.current !== propertyId) return;
            setAmendOpen(false);
            feedback.success("Reservation amended successfully.");
            await refresh();
          }}
        />
      ) : null}
    </Box>
  );
}

function BookingHeader({ booking, primaryAction, secondaryActions, canAmend, onBack, onAction, onAmend }: { booking: Booking; primaryAction: ActionDefinition | null; secondaryActions: ActionDefinition[]; canAmend: boolean; onBack: () => void; onAction: (action: BookingLifecycleAction) => void; onAmend: () => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const openMenu = (event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget);
  const initials = booking.guestName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return (
    <Stack component="header" direction="row" spacing={1} sx={{ alignItems: { xs: "flex-start", md: "center" }, justifyContent: "space-between", minWidth: 0 }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", flex: 1, minWidth: 0 }}>
        <IconButton aria-label="Back to bookings" onClick={onBack} sx={{ border: "1px solid", borderColor: "divider" }}><ArrowBackRoundedIcon /></IconButton>
        <Avatar sx={{ bgcolor: "action.selected", color: "primary.main", display: { xs: "none", sm: "grid" }, fontWeight: 700 }}>{initials || "G"}</Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", flexWrap: "wrap" }}><Typography color="text.secondary" variant="overline">{booking.bookingNumber}</Typography><StatusPill label={bookingStatusLabel(booking.status)} tone={statusTone(booking.status)} /></Stack>
          <Typography component="h1" variant="h3" noWrap>{booking.guestName}</Typography>
          <Typography color="text.secondary" variant="body2" noWrap>{booking.roomName} · {formatLocalDate(booking.checkIn)} → {formatLocalDate(booking.checkOut)}</Typography>
        </Box>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
        {primaryAction ? <Button variant="contained" onClick={() => onAction(primaryAction.action)} sx={{ display: { xs: "none", md: "inline-flex" } }}>{primaryAction.label}</Button> : null}
        {canAmend || secondaryActions.length ? <><IconButton aria-label="More booking actions" onClick={openMenu} sx={{ border: "1px solid", borderColor: "divider" }}><MoreHorizRoundedIcon /></IconButton><Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>{canAmend ? <MenuItem onClick={() => { setAnchor(null); onAmend(); }}><EditCalendarRoundedIcon fontSize="small" sx={{ mr: 1 }} />Amend reservation</MenuItem> : null}{secondaryActions.map((action) => <MenuItem key={action.action} onClick={() => { setAnchor(null); onAction(action.action); }} sx={{ color: action.dangerous ? "error.main" : undefined }}>{action.label}</MenuItem>)}</Menu></> : null}
      </Stack>
    </Stack>
  );
}

function LifecycleStrip({ booking }: { booking: Booking }) {
  const order = ["pending", "confirmed", "checked_in", "checked_out"];
  const current = booking.status === "reserved" ? 0 : order.indexOf(booking.status);
  const closed = ["cancelled", "no_show"].includes(booking.status);
  return (
    <Paper variant="outlined" sx={{ overflowX: "auto", p: { xs: 1.25, sm: 1.5 } }}>
      <Stack direction="row" sx={{ minWidth: 540 }}>
        {["Created", "Confirmed", "Checked in", "Checked out"].map((label, index) => {
          const done = !closed && index <= current;
          const active = !closed && index === current;
          return <Stack key={label} direction="row" sx={{ alignItems: "center", flex: index < 3 ? 1 : "initial" }}><Box sx={{ bgcolor: done ? "primary.main" : "background.paper", border: "2px solid", borderColor: done ? "primary.main" : "divider", borderRadius: "50%", height: 14, width: 14 }} /><Typography color={active ? "text.primary" : "text.secondary"} variant="caption" sx={{ fontWeight: active ? 700 : 500, ml: 0.75 }}>{label}</Typography>{index < 3 ? <Box sx={{ bgcolor: done && index < current ? "primary.main" : "divider", height: 2, flex: 1, mx: 1 }} /> : null}</Stack>;
        })}
      </Stack>
      {closed ? <Alert severity="warning" sx={{ mt: 1.25 }}>This reservation is {bookingStatusLabel(booking.status).toLowerCase()}.</Alert> : null}
    </Paper>
  );
}

function DetailsSection({ icon, title, action, children }: { icon: ReactNode; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", borderBottom: "1px solid", borderColor: "divider", p: { xs: 1.5, sm: 2 } }}><Box sx={{ color: "primary.main", display: "flex" }}>{icon}</Box><Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 700 }}>{title}</Typography>{action}</Stack>
      <Stack divider={<Divider flexItem />} spacing={0} sx={{ px: { xs: 1.5, sm: 2 } }}>{children}</Stack>
    </Paper>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 0.3, sm: 2 }} sx={{ alignItems: { sm: "baseline" }, justifyContent: "space-between", py: 1.2 }}><Typography color="text.secondary" variant="body2">{label}</Typography><Box sx={{ fontSize: ".8125rem", fontWeight: 500, maxWidth: { sm: "65%" }, overflowWrap: "anywhere", textAlign: { sm: "right" } }}>{value}</Box></Stack>;
}

function LinkValue({ href, children }: { href: string; children: ReactNode }) {
  return <Box component={Link} href={href} sx={{ color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>{children}</Box>;
}

function ActivityPanel({ activity }: { activity: BookingActivity[] }) {
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", borderBottom: "1px solid", borderColor: "divider", p: { xs: 1.5, sm: 2 } }}><EventNoteRoundedIcon color="primary" /><Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Activity</Typography><Typography color="text.secondary" variant="caption">Audited reservation events</Typography></Box></Stack>
      {!activity.length ? <Box sx={{ p: 2 }}><Typography color="text.secondary" variant="body2">No audited events are available for this reservation yet.</Typography></Box> : <Stack component="ol" divider={<Divider flexItem />} spacing={0} sx={{ listStyle: "none", m: 0, p: 0 }}>{activity.map((event) => <Stack component="li" direction="row" key={event.id} spacing={1.25} sx={{ alignItems: "flex-start", px: { xs: 1.5, sm: 2 }, py: 1.4 }}><Box sx={{ bgcolor: "primary.main", borderRadius: "50%", flexShrink: 0, height: 8, mt: 0.8, width: 8 }} /><Box sx={{ flex: 1 }}><Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 0.2, sm: 1 }} sx={{ justifyContent: "space-between" }}><Typography variant="body2" sx={{ fontWeight: 700 }}>{event.title || bookingStatusLabel(event.type)}</Typography><Typography color="text.secondary" variant="caption">{formatLocalDateTime(event.createdAt)}</Typography></Stack>{event.detail ? <Typography color="text.secondary" variant="body2" sx={{ mt: 0.25 }}>{event.detail}</Typography> : null}{event.actorName ? <Typography color="text.secondary" variant="caption">By {event.actorName}</Typography> : null}</Box></Stack>)}</Stack>}
    </Paper>
  );
}

function SettlementPanel({ booking, payments, canRecordPayment, onRecordPayment }: { booking: Booking; payments: BookingWorkspace["payments"]; canRecordPayment: boolean; onRecordPayment: () => void }) {
  const total = booking.totalPrice ?? 0;
  const paid = booking.amountPaid ?? 0;
  const ratio = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", borderBottom: "1px solid", borderColor: "divider", p: 2 }}><PaymentsRoundedIcon color="primary" /><Box sx={{ flex: 1 }}><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Settlement</Typography><Typography color="text.secondary" variant="caption">Payment position for this stay</Typography></Box><Chip label={bookingStatusLabel(booking.paymentStatus)} size="small" color={booking.balanceDue === 0 ? "success" : "warning"} /></Stack>
      <Box sx={{ p: 2 }}><Stack direction="row" sx={{ alignItems: "end", justifyContent: "space-between" }}><Box sx={{ minWidth: 0 }}><Typography color="text.secondary" variant="caption">Collected</Typography><Typography color="primary.main" variant="h4" sx={{ overflowWrap: "anywhere" }}>{money.format(paid)}</Typography></Box><Typography color="text.secondary" variant="caption">{ratio}%</Typography></Stack><LinearProgress aria-label="Payment collection progress" value={ratio} variant="determinate" color={booking.balanceDue && booking.balanceDue > 0 ? "warning" : "success"} sx={{ height: 6, mt: 1 }} /></Box>
      <Box sx={{ borderBlock: "1px solid", borderColor: "divider", display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}><SettlementMetric label="Booking total" value={money.format(total)} /><SettlementMetric label="Outstanding" value={money.format(booking.balanceDue ?? 0)} warning={Boolean(booking.balanceDue)} /></Box>
      {payments.length ? <Stack divider={<Divider flexItem />} spacing={0} sx={{ px: 2 }}>{payments.map((payment) => <Stack key={payment.id} direction="row" spacing={1} sx={{ justifyContent: "space-between", py: 1.1 }}><Box sx={{ minWidth: 0 }}><Typography variant="body2" sx={{ fontWeight: 500 }}>{payment.method ? bookingStatusLabel(payment.method) : "Payment"}</Typography><Typography color="text.secondary" variant="caption" sx={{ overflowWrap: "anywhere" }}>{formatLocalDateTime(payment.paidAt)}{payment.reference ? ` · ${payment.reference}` : ""}</Typography></Box><Typography variant="body2" sx={{ flexShrink: 0, fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{money.format(payment.amount)}</Typography></Stack>)}</Stack> : <Typography color="text.secondary" variant="body2" sx={{ px: 2, pb: 1.5 }}>No itemised payment records were returned.</Typography>}
      {canRecordPayment && (booking.balanceDue ?? 0) > 0 ? <Box sx={{ borderTop: "1px solid", borderColor: "divider", p: 1.5 }}><Button fullWidth onClick={onRecordPayment} startIcon={<PaymentsRoundedIcon />} variant="contained">Record payment</Button></Box> : null}
    </Paper>
  );
}

function SettlementMetric({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return <Box sx={{ minWidth: 0, p: 1.5, "& + &": { borderLeft: "1px solid", borderColor: "divider" } }}><Typography color="text.secondary" variant="caption">{label}</Typography><Typography color={warning ? "warning.main" : "text.primary"} variant="body2" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, mt: 0.25, overflowWrap: "anywhere" }}>{value}</Typography></Box>;
}

function ReservationFacts({ booking }: { booking: Booking }) {
  return <Paper variant="outlined" sx={{ p: 2 }}><Stack direction="row" spacing={1} sx={{ alignItems: "center" }}><ReceiptLongRoundedIcon color="primary" /><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Reservation record</Typography></Stack><Stack divider={<Divider flexItem />} spacing={0} sx={{ mt: 1 }}><DetailRow label="Created" value={formatLocalDateTime(booking.createdAt)} /><DetailRow label="Checked in" value={booking.checkedInAt ? formatLocalDateTime(booking.checkedInAt) : "Not yet"} /><DetailRow label="Checked out" value={booking.checkedOutAt ? formatLocalDateTime(booking.checkedOutAt) : "Not yet"} /></Stack></Paper>;
}

function LifecycleModal(props: { action: BookingLifecycleAction | null; allowBalance: boolean; error: string | null; reason: string; requiresSettlement: boolean; working: boolean; onAllowBalance: (value: boolean) => void; onClose: () => void; onConfirm: () => void; onReason: (value: string) => void }) {
  if (!props.action) return null;
  const definition = actionDefinitions[props.action];
  const balanceAction = props.action === "check_out" && props.requiresSettlement;
  const needsReason = definition.reasonRequired || (balanceAction && props.allowBalance);
  return (
    <ResponsiveModal open onClose={props.onClose} maxWidth="xs">
      <DialogTitle>{definition.title}</DialogTitle>
      <Box aria-busy={props.working} component="form" onSubmit={(event: FormEvent) => { event.preventDefault(); props.onConfirm(); }} sx={{ display: "flex", flex: 1, flexDirection: "column", minHeight: 0 }}>
        <DialogContent><Typography color="text.secondary">{definition.description}</Typography>{balanceAction ? <Alert severity="warning" sx={{ mt: 2 }}>This stay has an outstanding balance. Resolve it first or explicitly approve checkout with a balance.</Alert> : null}{balanceAction ? <FormControlLabel control={<Checkbox checked={props.allowBalance} onChange={(event) => props.onAllowBalance(event.target.checked)} />} label="Approve checkout with outstanding balance" sx={{ alignItems: "flex-start", mt: 1 }} /> : null}{needsReason ? <TextField autoFocus fullWidth label="Reason" multiline minRows={3} value={props.reason} onChange={(event) => props.onReason(event.target.value)} sx={{ mt: 1.5 }} /> : null}{props.error ? <Alert severity="error" sx={{ mt: 1.5 }}>{props.error}</Alert> : null}</DialogContent>
        <DialogActions><Button disabled={props.working} onClick={props.onClose}>Back</Button><Button color={definition.dangerous ? "error" : "primary"} disabled={props.working || (needsReason && !props.reason.trim()) || (balanceAction && !props.allowBalance)} type="submit" variant="contained">{props.working ? "Please wait…" : definition.label}</Button></DialogActions>
      </Box>
    </ResponsiveModal>
  );
}

function AmendBookingModal({ booking, businessDate, propertyId, onClose, onSaved }: { booking: Booking; businessDate: string; propertyId: string; onClose: () => void; onSaved: () => Promise<void> }) {
  const client = useMemo(() => createClient(), []);
  const originalCheckIn = localDateKey(booking.checkIn);
  const originalCheckOut = localDateKey(booking.checkOut);
  const [checkIn, setCheckIn] = useState(originalCheckIn);
  const [checkOut, setCheckOut] = useState(originalCheckOut);
  const [adults, setAdults] = useState(booking.adults);
  const [children, setChildren] = useState(booking.children);
  const [roomId, setRoomId] = useState(booking.roomId);
  const [source, setSource] = useState(booking.bookingSource);
  const [specialRequests, setSpecialRequests] = useState(booking.specialRequests);
  const [rooms, setRooms] = useState<AvailableRoom[]>([]);
  const [checkingRooms, setCheckingRooms] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const guests = adults + children;
  const changed =
    checkIn !== originalCheckIn ||
    checkOut !== originalCheckOut ||
    adults !== booking.adults ||
    children !== booking.children ||
    roomId !== booking.roomId ||
    source !== booking.bookingSource ||
    specialRequests.trim() !== booking.specialRequests.trim();

  const invalidateRoomSearch = () => {
    setRooms([]);
    setRoomId(booking.roomId);
  };

  const validate = () => {
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setError("Check-out must be after check-in.");
      return false;
    }
    if (businessDate && checkIn < businessDate) {
      setError("Check-in cannot be before the property business date.");
      return false;
    }
    if (adults < 1 || children < 0 || guests > 40) {
      setError("Enter a valid guest count.");
      return false;
    }
    return true;
  };

  const checkOtherRooms = async () => {
    if (!validate()) return;
    setCheckingRooms(true);
    setError(null);
    try {
      const available = await getAvailableRooms(client, propertyId, checkIn, checkOut, guests);
      setRooms(available.filter((room) => room.id !== booking.roomId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to check room availability.");
    } finally {
      setCheckingRooms(false);
    }
  };

  const save = async () => {
    if (!validate() || !changed) return;
    setWorking(true);
    setError(null);
    try {
      await updatePropertyBooking(client, propertyId, booking.id, {
        roomId,
        checkIn,
        checkOut,
        adults,
        children,
        source,
        specialRequests,
      });
      await onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to amend booking.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <ResponsiveModal open onClose={working ? undefined : onClose} maxWidth="md">
      <DialogTitle>Amend reservation</DialogTitle>
      <Box aria-busy={working} component="form" onSubmit={(event: FormEvent) => { event.preventDefault(); void save(); }} sx={{ display: "flex", flex: 1, flexDirection: "column", minHeight: 0 }}>
        <DialogContent dividers>
          <Stack spacing={2}>
          <Alert severity="info">Availability, room capacity and the stay total are revalidated by the server when you save.</Alert>
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" } }}>
            <TextField required label="Check-in" type="date" value={checkIn} onChange={(event) => { setCheckIn(event.target.value); invalidateRoomSearch(); }} slotProps={{ htmlInput: { min: businessDate || undefined }, inputLabel: { shrink: true } }} />
            <TextField required label="Check-out" type="date" value={checkOut} onChange={(event) => { setCheckOut(event.target.value); invalidateRoomSearch(); }} slotProps={{ htmlInput: { min: checkIn || businessDate || undefined }, inputLabel: { shrink: true } }} />
            <TextField label="Adults" type="number" value={adults} onChange={(event) => { setAdults(Math.min(20, Math.max(1, Math.floor(Number(event.target.value) || 1)))); invalidateRoomSearch(); }} slotProps={{ htmlInput: { min: 1, max: 20 } }} />
            <TextField label="Children" type="number" value={children} onChange={(event) => { setChildren(Math.min(20, Math.max(0, Math.floor(Number(event.target.value) || 0)))); invalidateRoomSearch(); }} slotProps={{ htmlInput: { min: 0, max: 20 } }} />
          </Box>
          <Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between", mb: 1 }}>
              <Box><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Room assignment</Typography><Typography color="text.secondary" variant="caption">Keep the current room or check live alternatives.</Typography></Box>
              <Button disabled={checkingRooms} onClick={() => void checkOtherRooms()} startIcon={<SearchRoundedIcon />} variant="outlined">{checkingRooms ? "Checking…" : "Check other rooms"}</Button>
            </Stack>
            <TextField fullWidth select label="Room" value={roomId} onChange={(event) => setRoomId(event.target.value)}>
              <MenuItem value={booking.roomId}>{booking.roomName} · {booking.roomType} (current)</MenuItem>
              {rooms.map((room) => <MenuItem key={room.id} value={room.id}>{room.name} · {room.roomType} · {money.format(room.totalPrice)}</MenuItem>)}
            </TextField>
            {rooms.length === 0 && !checkingRooms ? <Typography color="text.secondary" variant="caption" sx={{ display: "block", mt: 0.75 }}>No alternative rooms loaded. The current room will still be revalidated on save.</Typography> : null}
          </Box>
          <TextField select label="Booking source" value={source} onChange={(event) => setSource(event.target.value)}><MenuItem value="front_desk">Front desk / walk-in</MenuItem><MenuItem value="phone">Phone</MenuItem><MenuItem value="direct">Direct</MenuItem><MenuItem value="agent">Agent</MenuItem><MenuItem value="other">Other</MenuItem></TextField>
          <TextField label="Special requests" multiline minRows={3} value={specialRequests} onChange={(event) => setSpecialRequests(event.target.value)} />
          {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions><Button disabled={working} onClick={onClose}>Cancel</Button><Button disabled={working || !changed} startIcon={<EditCalendarRoundedIcon />} type="submit" variant="contained">{working ? "Saving…" : "Save changes"}</Button></DialogActions>
      </Box>
    </ResponsiveModal>
  );
}

function PaymentModal({ booking, open, propertyId, onClose, onSaved }: { booking: Booking; open: boolean; propertyId: string; onClose: () => void; onSaved: () => Promise<void> }) {
  const client = useMemo(() => createClient(), []);
  const idempotencyKey = useRef(crypto.randomUUID());
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const balance = booking.balanceDue ?? 0;
  const numericAmount = Number(amount);
  const validAmount = numericAmount > 0 && numericAmount <= balance;

  const changeAttempt = (change: () => void) => {
    change();
    idempotencyKey.current = crypto.randomUUID();
    setError(null);
  };

  const save = async () => {
    if (!validAmount) {
      setError(`Enter an amount between TZS 1 and ${money.format(balance)}.`);
      return;
    }
    setWorking(true);
    setError(null);
    try {
      await recordBookingPayment(client, propertyId, booking.id, {
        amount: numericAmount,
        idempotencyKey: idempotencyKey.current,
        method,
        reference,
        notes,
      });
      idempotencyKey.current = crypto.randomUUID();
      setAmount("");
      setReference("");
      setNotes("");
      await onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to record payment.");
    } finally {
      setWorking(false);
    }
  };

  return <ResponsiveModal open={open} onClose={working ? undefined : onClose} maxWidth="xs"><DialogTitle>Record payment</DialogTitle><Box aria-busy={working} component="form" onSubmit={(event: FormEvent) => { event.preventDefault(); void save(); }} sx={{ display: "flex", flex: 1, flexDirection: "column", minHeight: 0 }}><DialogContent><Alert severity="info" sx={{ mb: 2 }}>Outstanding balance: {money.format(balance)}</Alert><Stack spacing={1.5}><TextField autoFocus disabled={working} label="Amount" type="number" value={amount} onChange={(event) => changeAttempt(() => setAmount(event.target.value))} slotProps={{ input: { startAdornment: <Typography color="text.secondary" sx={{ mr: 1 }}>TZS</Typography> }, htmlInput: { min: 1, max: balance } }} /><TextField disabled={working} select label="Method" value={method} onChange={(event) => changeAttempt(() => setMethod(event.target.value))}><MenuItem value="cash">Cash</MenuItem><MenuItem value="mobile_money">Mobile money</MenuItem><MenuItem value="card">Card</MenuItem><MenuItem value="bank_transfer">Bank transfer</MenuItem><MenuItem value="cheque">Cheque</MenuItem><MenuItem value="other">Other</MenuItem></TextField><TextField disabled={working} label="Reference (optional)" value={reference} onChange={(event) => changeAttempt(() => setReference(event.target.value))} /><TextField disabled={working} label="Notes (optional)" multiline minRows={2} value={notes} onChange={(event) => changeAttempt(() => setNotes(event.target.value))} />{error ? <Alert severity="error">{error}</Alert> : null}</Stack></DialogContent><DialogActions><Button disabled={working} onClick={onClose}>Cancel</Button><Button disabled={working || !validAmount} type="submit" variant="contained">{working ? "Recording…" : "Record payment"}</Button></DialogActions></Box></ResponsiveModal>;
}

function BookingDetailsSkeleton() {
  return <Container maxWidth="xl" sx={{ py: 3 }}><Stack spacing={2}><Stack direction="row" spacing={1.5}><Skeleton variant="rounded" width={44} height={44} /><Box sx={{ flex: 1 }}><Skeleton width={180} /><Skeleton width={260} height={36} /></Box></Stack><Skeleton height={72} variant="rounded" /><Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "1.35fr .75fr" } }}><Stack spacing={2}><Skeleton height={250} variant="rounded" /><Skeleton height={280} variant="rounded" /></Stack><Skeleton height={360} variant="rounded" /></Box></Stack></Container>;
}

function ErrorState({ actionLabel = "Try again", message, onRetry }: { actionLabel?: string; message: string; onRetry: () => void }) {
  return <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 } }}><Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 } }}><Alert severity="error">{message}</Alert><Button onClick={onRetry} startIcon={actionLabel === "Try again" ? <RefreshRoundedIcon /> : <ArrowBackRoundedIcon />} sx={{ mt: 2 }} variant="contained">{actionLabel}</Button></Paper></Container>;
}
