"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { useLanguage } from "@/components/providers/language-provider";
import { getPropertyTypeDefinition } from "@/features/property/property-type";
import {
  acceptedPaymentMethods,
  normalizeAcceptedPaymentMethods,
  type AcceptedPaymentMethod,
} from "@/features/property/property-catalog";

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
  const searchParams = useSearchParams();
  const { session, loading: sessionLoading, error: sessionError } = useAppSession();
  const client = useMemo(() => createClient(), []);
  const feedback = useAppFeedback();
  const { t } = useLanguage();
  const propertyId = session?.activePropertyId;
  const propertyPaymentMethods = normalizeAcceptedPaymentMethods(
    session?.property?.payment_methods ?? session?.property?.paymentMethods,
  );
  const propertyDefinition = getPropertyTypeDefinition(session?.property?.type);
  const inventorySingular = t(
    propertyDefinition.inventorySingular[0],
    propertyDefinition.inventorySingular[1],
  );
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
  const handledRequestedAction = useRef<string | null>(null);
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
        message: cause instanceof Error ? cause.message : t("Unable to load booking.", "Imeshindikana kupakia uhifadhi."),
      });
    } finally {
      if (currentRequest !== requestId.current || activePropertyId.current !== requestPropertyId) return;
      setLoading(false);
    }
  }, [bookingId, client, propertyId, t]);

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

  useEffect(() => {
    const requestedAction = searchParams.get("action");
    if (!workspace || !requestedAction || handledRequestedAction.current === requestedAction) return;
    handledRequestedAction.current = requestedAction;
    const timer = window.setTimeout(() => {
      if (requestedAction === "payment" && workspace.allowedActions.recordPayment) {
        setPaymentOpen(true);
      } else if (requestedAction === "checkout" && workspace.allowedActions.checkOut) {
        if (workspace.requiresSettlement && !localCapabilities.canCheckoutWithBalance) {
          if (workspace.allowedActions.recordPayment) setPaymentOpen(true);
        } else {
          setSelectedAction("check_out");
        }
      } else if (requestedAction === "checkin" && workspace.allowedActions.checkIn) {
        setSelectedAction("check_in");
      }
    }, 0);
    router.replace(`/bookings/${bookingId}`, { scroll: false });
    return () => window.clearTimeout(timer);
  }, [bookingId, localCapabilities.canCheckoutWithBalance, router, searchParams, workspace]);

  if (sessionLoading) return <BookingDetailsSkeleton />;
  if (sessionError || !propertyId) {
    return <ErrorState actionLabel={t("Back")} message={sessionError?.message ?? t("Select an active property to view this booking.", "Chagua biashara inayotumika ili kuona uhifadhi huu.")} onRetry={() => router.back()} />;
  }
  if (dataLoading) return <BookingDetailsSkeleton />;
  if (!workspace) return <ErrorState message={error ?? t("Booking not found or you no longer have access.", "Uhifadhi haujapatikana au huna tena ruhusa ya kuuona.")} onRetry={() => void refresh()} />;

  const booking = workspace.booking;
  const primaryAction = workspace.allowedActions.confirm
    ? actionDefinitions.confirm
    : workspace.allowedActions.checkIn
      ? actionDefinitions.check_in
      : workspace.allowedActions.checkOut && (!workspace.requiresSettlement || localCapabilities.canCheckoutWithBalance)
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
  const hasSettlement = workspace.canViewSettlement;

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
      setErrorState({ propertyId, message: t("Add a reason before continuing.", "Weka sababu kabla ya kuendelea.") });
      return;
    }
    if (selectedAction === "check_out" && workspace.requiresSettlement && !allowBalance) {
      setErrorState({ propertyId, message: localCapabilities.canCheckoutWithBalance
        ? t("Resolve the balance or explicitly approve checkout with an outstanding balance.", "Lipa salio au thibitisha wazi kumtoa mgeni akiwa na salio.")
        : t("Record the outstanding balance before checkout.", "Rekodi salio linalodaiwa kabla ya kumtoa mgeni.") });
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
      feedback.success(t(`${definition.label} completed.`, `${t(definition.label)} imekamilika.`));
      setSelectedAction(null);
      setReason("");
      setAllowBalance(false);
      await refresh();
    } catch (cause) {
      if (activePropertyId.current === actionPropertyId) {
        setErrorState({
          propertyId: actionPropertyId,
          message: cause instanceof Error ? cause.message : t("Unable to update booking.", "Imeshindikana kusasisha uhifadhi."),
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
          {workspace.blockedReason ? <Alert severity="info">{t(workspace.blockedReason)}</Alert> : null}

          <LifecycleStrip booking={booking} />

          <Box sx={{ alignItems: "start", display: "grid", gap: { xs: 1.5, lg: 2 }, gridTemplateColumns: { xs: "1fr", lg: "minmax(0,1.35fr) minmax(320px,.75fr)" } }}>
            <Stack spacing={{ xs: 1.5, md: 2 }}>
              <DetailsSection icon={<CalendarMonthRoundedIcon />} title={t(`Stay and ${inventorySingular}`, `Ukaaji na ${inventorySingular}`)}>
                <DetailRow label={t("Dates")} value={`${formatLocalDate(booking.checkIn)} → ${formatLocalDate(booking.checkOut)}`} />
                <DetailRow label={inventorySingular} value={<LinkValue href={`/rooms/${booking.roomId}`}>{booking.roomName} · {booking.roomType}</LinkValue>} />
                <DetailRow label={t("Guests")} value={`${t(`${booking.adults} adult${booking.adults === 1 ? "" : "s"}`)} · ${t(`${booking.children} child${booking.children === 1 ? "" : "ren"}`)}`} />
                <DetailRow label={t("Source")} value={t(bookingStatusLabel(booking.bookingSource))} />
                <DetailRow label={t("Special requests")} value={booking.specialRequests || t("None recorded")} />
              </DetailsSection>

              <DetailsSection
                icon={<PersonRoundedIcon />}
                title={t("Guest profile")}
                action={
                  <Stack direction="row" spacing={0.5}>
                    {booking.phone ? <IconButton component="a" href={`tel:${booking.phone}`} aria-label={t("Call guest")} size="small"><PhoneRoundedIcon fontSize="small" /></IconButton> : null}
                    {booking.email ? <IconButton component="a" href={`mailto:${booking.email}`} aria-label={t("Email guest")} size="small"><EmailRoundedIcon fontSize="small" /></IconButton> : null}
                  </Stack>
                }
              >
                <DetailRow label={t("Name")} value={booking.guestName} />
                <DetailRow label={t("Phone")} value={booking.phone || t("Not recorded")} />
                <DetailRow label={t("Email")} value={booking.email || t("Not recorded")} />
                <DetailRow label={t("Nationality")} value={booking.nationality || t("Not recorded")} />
                <DetailRow label={t("Occupation")} value={booking.occupation || t("Not recorded")} />
                <DetailRow label={t("ID")} value={booking.idNumber ? `${t(bookingStatusLabel(booking.idType))} · ${booking.idNumber}` : t("Not recorded")} />
                <DetailRow label={t("Travel")} value={booking.whereFrom || booking.whereTo ? `${booking.whereFrom || "—"} → ${booking.whereTo || "—"}` : t("Not recorded")} />
                <DetailRow label={t("Emergency contact")} value={booking.emergencyName ? `${booking.emergencyName}${booking.emergencyPhone ? ` · ${booking.emergencyPhone}` : ""}` : t("Not recorded")} />
              </DetailsSection>

              <ActivityPanel activity={workspace.activity} />
            </Stack>

            <Stack spacing={{ xs: 1.5, md: 2 }} sx={{ position: { lg: "sticky" }, top: { lg: 84 } }}>
              {hasSettlement ? (
                <SettlementPanel booking={booking} payments={workspace.payments} canRecordPayment={canRecordPayment} onRecordPayment={() => setPaymentOpen(true)} />
              ) : (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}><LockRoundedIcon color="action" fontSize="small" /><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t("Payment access restricted", "Ruhusa ya malipo imezuiwa")}</Typography></Stack>
                  <Typography color="text.secondary" variant="body2" sx={{ mt: 0.75 }}>{t("This role can manage the stay but cannot inspect its payment position.", "Jukumu hili linaweza kusimamia ukaaji lakini haliwezi kuona hali ya malipo.")}</Typography>
                </Paper>
              )}
              <ReservationFacts booking={booking} />
            </Stack>
          </Box>
        </Stack>
      </Container>

      {primaryAction ? (
        <StickyMobileActionBar>
          <Button fullWidth startIcon={primaryAction.action === "check_out" ? <LogoutRoundedIcon /> : <LoginRoundedIcon />} variant="contained" onClick={() => openAction(primaryAction.action)}>{t(primaryAction.label)}</Button>
        </StickyMobileActionBar>
      ) : null}

      <LifecycleModal
        action={selectedAction}
        allowBalance={allowBalance}
        canCheckoutWithBalance={localCapabilities.canCheckoutWithBalance}
        error={error}
        reason={reason}
        requiresSettlement={workspace.requiresSettlement}
        inventorySingular={inventorySingular}
        working={working}
        onAllowBalance={setAllowBalance}
        onClose={closeAction}
        onConfirm={() => void confirmAction()}
        onReason={setReason}
      />
      <PaymentModal
        booking={booking}
        open={paymentOpen}
        paymentMethods={propertyPaymentMethods}
        propertyId={propertyId}
        onClose={() => setPaymentOpen(false)}
        onSaved={async () => {
          if (activePropertyId.current !== propertyId) return;
          setPaymentOpen(false);
          feedback.success(t("Payment recorded successfully.", "Malipo yamerekodiwa kikamilifu."));
          await refresh();
        }}
      />
      {amendOpen ? (
        <AmendBookingModal
          booking={booking}
          businessDate={workspace.businessDate}
          inventorySingular={inventorySingular}
          propertyId={propertyId}
          onClose={() => setAmendOpen(false)}
          onSaved={async () => {
            if (activePropertyId.current !== propertyId) return;
            setAmendOpen(false);
            feedback.success(t("Reservation amended successfully.", "Uhifadhi umebadilishwa kikamilifu."));
            await refresh();
          }}
        />
      ) : null}
    </Box>
  );
}

function BookingHeader({ booking, primaryAction, secondaryActions, canAmend, onBack, onAction, onAmend }: { booking: Booking; primaryAction: ActionDefinition | null; secondaryActions: ActionDefinition[]; canAmend: boolean; onBack: () => void; onAction: (action: BookingLifecycleAction) => void; onAmend: () => void }) {
  const { t } = useLanguage();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const openMenu = (event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget);
  const initials = booking.guestName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return (
    <Stack component="header" direction="row" spacing={1} sx={{ alignItems: { xs: "flex-start", md: "center" }, justifyContent: "space-between", minWidth: 0 }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", flex: 1, minWidth: 0 }}>
        <IconButton aria-label={t("Back to bookings")} onClick={onBack} sx={{ border: "1px solid", borderColor: "divider" }}><ArrowBackRoundedIcon /></IconButton>
        <Avatar sx={{ bgcolor: "action.selected", color: "primary.main", display: { xs: "none", sm: "grid" }, fontWeight: 700 }}>{initials || "G"}</Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", flexWrap: "wrap" }}><Typography color="text.secondary" variant="overline">{booking.bookingNumber}</Typography><StatusPill label={bookingStatusLabel(booking.status)} tone={statusTone(booking.status)} /></Stack>
          <Typography component="h1" variant="h3" noWrap>{booking.guestName}</Typography>
          <Typography color="text.secondary" variant="body2" noWrap>{booking.roomName} · {formatLocalDate(booking.checkIn)} → {formatLocalDate(booking.checkOut)}</Typography>
        </Box>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
        {primaryAction ? <Button variant="contained" onClick={() => onAction(primaryAction.action)} sx={{ display: { xs: "none", md: "inline-flex" } }}>{t(primaryAction.label)}</Button> : null}
        {canAmend || secondaryActions.length ? <><IconButton aria-label={t("More booking actions")} onClick={openMenu} sx={{ border: "1px solid", borderColor: "divider" }}><MoreHorizRoundedIcon /></IconButton><Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>{canAmend ? <MenuItem onClick={() => { setAnchor(null); onAmend(); }}><EditCalendarRoundedIcon fontSize="small" sx={{ mr: 1 }} />{t("Amend reservation", "Badili uhifadhi")}</MenuItem> : null}{secondaryActions.map((action) => <MenuItem key={action.action} onClick={() => { setAnchor(null); onAction(action.action); }} sx={{ color: action.dangerous ? "error.main" : undefined }}>{t(action.label)}</MenuItem>)}</Menu></> : null}
      </Stack>
    </Stack>
  );
}

function LifecycleStrip({ booking }: { booking: Booking }) {
  const { t } = useLanguage();
  const closed = ["cancelled", "no_show"].includes(booking.status);
  const current = booking.status === "pending" || booking.status === "reserved" || booking.status === "confirmed"
    ? 0
    : booking.status === "checked_in"
      ? 1
      : booking.status === "checked_out" || closed
        ? 2
        : 0;
  const finalStage = booking.status === "cancelled"
    ? { label: "Cancelled", swahili: "Imeghairiwa" }
    : booking.status === "no_show"
      ? { label: "No-show", swahili: "Hakufika" }
      : { label: "Completed", swahili: "Imekamilika" };
  const stages = [
    { label: "Booked", swahili: "Imehifadhiwa" },
    { label: "In house", swahili: "Waliopo" },
    finalStage,
  ];
  return (
    <Paper variant="outlined" sx={{ overflowX: "auto", p: { xs: 1.25, sm: 1.5 } }}>
      <Stack direction="row" sx={{ minWidth: 0 }}>
        {stages.map((stage, index) => {
          const done = closed ? index === 0 || index === stages.length - 1 : index <= current;
          const active = index === current;
          return <Stack key={stage.label} direction="row" sx={{ alignItems: "center", flex: index < stages.length - 1 ? 1 : "initial", minWidth: 0 }}><Box sx={{ bgcolor: done ? "primary.main" : "background.paper", border: "2px solid", borderColor: done ? "primary.main" : "divider", borderRadius: "50%", flexShrink: 0, height: 14, width: 14 }} /><Typography color={active ? "text.primary" : "text.secondary"} variant="caption" sx={{ fontWeight: active ? 700 : 500, ml: 0.75, whiteSpace: "nowrap" }}>{t(stage.label, stage.swahili)}</Typography>{index < stages.length - 1 ? <Box sx={{ bgcolor: !closed && index < current ? "primary.main" : "divider", height: 2, flex: 1, minWidth: { xs: 8, sm: 24 }, mx: { xs: 0.75, sm: 1 } }} /> : null}</Stack>;
        })}
      </Stack>
      {closed ? <Alert severity="warning" sx={{ mt: 1.25 }}>{t("This reservation is", "Uhifadhi huu")} {t(bookingStatusLabel(booking.status)).toLowerCase()}.</Alert> : null}
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
  const { t } = useLanguage();
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", borderBottom: "1px solid", borderColor: "divider", p: { xs: 1.5, sm: 2 } }}><EventNoteRoundedIcon color="primary" /><Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t("Activity")}</Typography><Typography color="text.secondary" variant="caption">{t("Audited reservation events", "Matukio ya uhifadhi yaliyokaguliwa")}</Typography></Box></Stack>
      {!activity.length ? <Box sx={{ p: 2 }}><Typography color="text.secondary" variant="body2">{t("No audited events are available for this reservation yet.", "Bado hakuna matukio yaliyokaguliwa kwa uhifadhi huu.")}</Typography></Box> : <Stack component="ol" divider={<Divider flexItem />} spacing={0} sx={{ listStyle: "none", m: 0, p: 0 }}>{activity.map((event) => <Stack component="li" direction="row" key={event.id} spacing={1.25} sx={{ alignItems: "flex-start", px: { xs: 1.5, sm: 2 }, py: 1.4 }}><Box sx={{ bgcolor: "primary.main", borderRadius: "50%", flexShrink: 0, height: 8, mt: 0.8, width: 8 }} /><Box sx={{ flex: 1 }}><Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 0.2, sm: 1 }} sx={{ justifyContent: "space-between" }}><Typography variant="body2" sx={{ fontWeight: 700 }}>{t(event.title || bookingStatusLabel(event.type))}</Typography><Typography color="text.secondary" variant="caption">{formatLocalDateTime(event.createdAt)}</Typography></Stack>{event.detail ? <Typography color="text.secondary" variant="body2" sx={{ mt: 0.25 }}>{t(event.detail)}</Typography> : null}{event.actorName ? <Typography color="text.secondary" variant="caption">{t("By", "Na")} {event.actorName}</Typography> : null}</Box></Stack>)}</Stack>}
    </Paper>
  );
}

function SettlementPanel({ booking, payments, canRecordPayment, onRecordPayment }: { booking: Booking; payments: BookingWorkspace["payments"]; canRecordPayment: boolean; onRecordPayment: () => void }) {
  const { t } = useLanguage();
  const total = booking.totalPrice ?? 0;
  const paid = booking.amountPaid ?? 0;
  const ratio = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", borderBottom: "1px solid", borderColor: "divider", p: 2 }}><PaymentsRoundedIcon color="primary" /><Box sx={{ flex: 1 }}><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t("Settlement", "Malipo")}</Typography><Typography color="text.secondary" variant="caption">{t("Payment position for this stay")}</Typography></Box><Chip label={t(bookingStatusLabel(booking.paymentStatus))} size="small" color={booking.balanceDue === 0 ? "success" : "warning"} /></Stack>
      <Box sx={{ p: 2 }}><Stack direction="row" sx={{ alignItems: "end", justifyContent: "space-between" }}><Box sx={{ minWidth: 0 }}><Typography color="text.secondary" variant="caption">{t("Collected")}</Typography><Typography color="primary.main" variant="h4" sx={{ overflowWrap: "anywhere" }}>{money.format(paid)}</Typography></Box><Typography color="text.secondary" variant="caption">{ratio}%</Typography></Stack><LinearProgress aria-label={t("Payment collection progress")} value={ratio} variant="determinate" color={booking.balanceDue && booking.balanceDue > 0 ? "warning" : "success"} sx={{ height: 6, mt: 1 }} /></Box>
      <Box sx={{ borderBlock: "1px solid", borderColor: "divider", display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}><SettlementMetric label={t("Booking total")} value={money.format(total)} /><SettlementMetric label={t("Outstanding")} value={money.format(booking.balanceDue ?? 0)} warning={Boolean(booking.balanceDue)} /></Box>
      {payments.length ? <Stack divider={<Divider flexItem />} spacing={0} sx={{ px: 2 }}>{payments.map((payment) => <Stack key={payment.id} direction="row" spacing={1} sx={{ justifyContent: "space-between", py: 1.1 }}><Box sx={{ minWidth: 0 }}><Stack direction="row" spacing={0.75} sx={{ alignItems: "center", flexWrap: "wrap" }}><Typography variant="body2" sx={{ fontWeight: 500 }}>{t(payment.entryType === "payment" ? (payment.method ? bookingStatusLabel(payment.method) : "Payment") : bookingStatusLabel(payment.entryType))}</Typography>{payment.status !== "completed" ? <StatusPill label={t(bookingStatusLabel(payment.status))} tone={payment.entryType === "payment" ? "neutral" : "danger"} /> : null}</Stack><Typography color="text.secondary" variant="caption" sx={{ overflowWrap: "anywhere" }}>{formatLocalDateTime(payment.paidAt)}{payment.reference ? ` · ${payment.reference}` : ""}</Typography>{payment.reversalReason ? <Typography color="text.secondary" variant="caption" sx={{ display: "block" }}>{payment.reversalReason}</Typography> : null}</Box><Typography color={payment.amount < 0 ? "error.main" : "text.primary"} variant="body2" sx={{ flexShrink: 0, fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{money.format(payment.amount)}</Typography></Stack>)}</Stack> : <Typography color="text.secondary" variant="body2" sx={{ px: 2, pb: 1.5 }}>{t("No itemised payment records were returned.", "Hakuna kumbukumbu za malipo zilizoletwa.")}</Typography>}
      {canRecordPayment && (booking.balanceDue ?? 0) > 0 ? <Box sx={{ borderTop: "1px solid", borderColor: "divider", p: 1.5 }}><Button fullWidth onClick={onRecordPayment} startIcon={<PaymentsRoundedIcon />} variant="contained">{t("Record payment")}</Button></Box> : null}
    </Paper>
  );
}

function SettlementMetric({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return <Box sx={{ minWidth: 0, p: 1.5, "& + &": { borderLeft: "1px solid", borderColor: "divider" } }}><Typography color="text.secondary" variant="caption">{label}</Typography><Typography color={warning ? "warning.main" : "text.primary"} variant="body2" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, mt: 0.25, overflowWrap: "anywhere" }}>{value}</Typography></Box>;
}

function ReservationFacts({ booking }: { booking: Booking }) {
  const { t } = useLanguage();
  return <Paper variant="outlined" sx={{ p: 2 }}><Stack direction="row" spacing={1} sx={{ alignItems: "center" }}><ReceiptLongRoundedIcon color="primary" /><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t("Reservation record", "Kumbukumbu ya uhifadhi")}</Typography></Stack><Stack divider={<Divider flexItem />} spacing={0} sx={{ mt: 1 }}><DetailRow label={t("Created")} value={formatLocalDateTime(booking.createdAt)} /><DetailRow label={t("Checked in", "Aliingia")} value={booking.checkedInAt ? formatLocalDateTime(booking.checkedInAt) : t("Not yet")} /><DetailRow label={t("Checked out", "Alitoka")} value={booking.checkedOutAt ? formatLocalDateTime(booking.checkedOutAt) : t("Not yet")} /></Stack></Paper>;
}

function LifecycleModal(props: { action: BookingLifecycleAction | null; allowBalance: boolean; canCheckoutWithBalance: boolean; error: string | null; inventorySingular: string; reason: string; requiresSettlement: boolean; working: boolean; onAllowBalance: (value: boolean) => void; onClose: () => void; onConfirm: () => void; onReason: (value: string) => void }) {
  const { t } = useLanguage();
  if (!props.action) return null;
  const definition = actionDefinitions[props.action];
  const balanceAction = props.action === "check_out" && props.requiresSettlement;
  const needsReason = definition.reasonRequired || (balanceAction && props.allowBalance);
  const actionDescription = props.action === "check_in"
    ? t(`This confirms the guest has arrived and marks the assigned ${props.inventorySingular} as occupied.`, `Hii inathibitisha mgeni amewasili na inaweka ${props.inventorySingular} aliyopangiwa kuwa inatumika.`)
    : props.action === "check_out"
      ? t(`This ends the stay and sends the assigned ${props.inventorySingular} to housekeeping.`, `Hii inamaliza ukaaji na kupeleka ${props.inventorySingular} aliyopangiwa kwenye usafi.`)
      : props.action === "cancel"
        ? t(`The ${props.inventorySingular} will become available again. Add a reason for the operational record.`, `${props.inventorySingular} itapatikana tena. Weka sababu kwa kumbukumbu ya uendeshaji.`)
        : props.action === "reinstate"
          ? t(`The server will revalidate the ${props.inventorySingular} and restore the reservation when possible.`, `Seva itakagua tena ${props.inventorySingular} na kurudisha uhifadhi inapowezekana.`)
          : t(definition.description);
  return (
    <ResponsiveModal open onClose={props.onClose} maxWidth="xs">
      <DialogTitle>{t(definition.title)}</DialogTitle>
      <Box aria-busy={props.working} component="form" onSubmit={(event: FormEvent) => { event.preventDefault(); props.onConfirm(); }} sx={{ display: "flex", flex: 1, flexDirection: "column", minHeight: 0 }}>
        <DialogContent><Typography color="text.secondary">{actionDescription}</Typography>{balanceAction ? <Alert severity={props.canCheckoutWithBalance ? "warning" : "info"} sx={{ mt: 2 }}>{props.canCheckoutWithBalance ? t("This stay has an outstanding balance. Resolve it first or explicitly approve checkout with a balance.", "Ukaaji huu una salio. Lipa kwanza au thibitisha wazi kumtoa mgeni akiwa na salio.") : t("Record the outstanding balance before checkout.", "Rekodi salio linalodaiwa kabla ya kumtoa mgeni.")}</Alert> : null}{balanceAction && props.canCheckoutWithBalance ? <FormControlLabel control={<Checkbox checked={props.allowBalance} onChange={(event) => props.onAllowBalance(event.target.checked)} />} label={t("Approve checkout with outstanding balance", "Thibitisha kutoka akiwa na salio")} sx={{ alignItems: "flex-start", mt: 1 }} /> : null}{needsReason ? <TextField autoFocus fullWidth label={t("Reason", "Sababu")} multiline minRows={3} value={props.reason} onChange={(event) => props.onReason(event.target.value)} sx={{ mt: 1.5 }} /> : null}{props.error ? <Alert severity="error" sx={{ mt: 1.5 }}>{props.error}</Alert> : null}</DialogContent>
        <DialogActions><Button disabled={props.working} onClick={props.onClose}>{t("Back")}</Button><Button color={definition.dangerous ? "error" : "primary"} disabled={props.working || (needsReason && !props.reason.trim()) || (balanceAction && (!props.canCheckoutWithBalance || !props.allowBalance))} type="submit" variant="contained">{props.working ? t("Please wait…") : t(definition.label)}</Button></DialogActions>
      </Box>
    </ResponsiveModal>
  );
}

function AmendBookingModal({ booking, businessDate, inventorySingular, propertyId, onClose, onSaved }: { booking: Booking; businessDate: string; inventorySingular: string; propertyId: string; onClose: () => void; onSaved: () => Promise<void> }) {
  const client = useMemo(() => createClient(), []);
  const { t } = useLanguage();
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
      setError(t("Check-out must be after check-in.", "Tarehe ya kutoka lazima iwe baada ya tarehe ya kuingia."));
      return false;
    }
    if (businessDate && checkIn < businessDate) {
      setError(t("Check-in cannot be before the property business date.", "Tarehe ya kuingia haiwezi kuwa kabla ya tarehe ya biashara."));
      return false;
    }
    if (adults < 1 || children < 0 || guests > 40) {
      setError(t("Enter a valid guest count.", "Weka idadi sahihi ya wageni."));
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
      setError(cause instanceof Error ? cause.message : t(`Unable to check ${inventorySingular} availability.`, `Imeshindikana kukagua upatikanaji wa ${inventorySingular}.`));
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
      setError(cause instanceof Error ? cause.message : t("Unable to amend booking.", "Imeshindikana kubadili uhifadhi."));
    } finally {
      setWorking(false);
    }
  };

  return (
    <ResponsiveModal open onClose={working ? undefined : onClose} maxWidth="md">
      <DialogTitle>{t("Amend reservation", "Badili uhifadhi")}</DialogTitle>
      <Box aria-busy={working} component="form" onSubmit={(event: FormEvent) => { event.preventDefault(); void save(); }} sx={{ display: "flex", flex: 1, flexDirection: "column", minHeight: 0 }}>
        <DialogContent dividers>
          <Stack spacing={2}>
          <Alert severity="info">{t(`Availability, ${inventorySingular} capacity and the stay total are revalidated by the server when you save.`, `Seva itakagua tena upatikanaji, uwezo wa ${inventorySingular} na jumla ya ukaaji unapohifadhi.`)}</Alert>
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" } }}>
            <TextField required label={t("Check-in")} type="date" value={checkIn} onChange={(event) => { setCheckIn(event.target.value); invalidateRoomSearch(); }} slotProps={{ htmlInput: { min: businessDate || undefined }, inputLabel: { shrink: true } }} />
            <TextField required label={t("Check-out")} type="date" value={checkOut} onChange={(event) => { setCheckOut(event.target.value); invalidateRoomSearch(); }} slotProps={{ htmlInput: { min: checkIn || businessDate || undefined }, inputLabel: { shrink: true } }} />
            <TextField label={t("Adults")} type="number" value={adults} onChange={(event) => { setAdults(Math.min(20, Math.max(1, Math.floor(Number(event.target.value) || 1)))); invalidateRoomSearch(); }} slotProps={{ htmlInput: { min: 1, max: 20 } }} />
            <TextField label={t("Children")} type="number" value={children} onChange={(event) => { setChildren(Math.min(20, Math.max(0, Math.floor(Number(event.target.value) || 0)))); invalidateRoomSearch(); }} slotProps={{ htmlInput: { min: 0, max: 20 } }} />
          </Box>
          <Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between", mb: 1 }}>
              <Box><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{t(`${inventorySingular} assignment`, `Ugawaji wa ${inventorySingular}`)}</Typography><Typography color="text.secondary" variant="caption">{t(`Keep the current ${inventorySingular} or check live alternatives.`, `Acha ${inventorySingular} ya sasa au kagua nyingine zinazopatikana.`)}</Typography></Box>
              <Button disabled={checkingRooms} onClick={() => void checkOtherRooms()} startIcon={<SearchRoundedIcon />} variant="outlined">{checkingRooms ? t("Checking…", "Inakagua…") : t(`Check other ${inventorySingular}`, `Kagua ${inventorySingular} nyingine`)}</Button>
            </Stack>
            <TextField fullWidth select label={inventorySingular} value={roomId} onChange={(event) => setRoomId(event.target.value)}>
              <MenuItem value={booking.roomId}>{booking.roomName} · {booking.roomType} ({t("current", "sasa")})</MenuItem>
              {rooms.map((room) => <MenuItem key={room.id} value={room.id}>{room.name} · {room.roomType} · {money.format(room.totalPrice)}</MenuItem>)}
            </TextField>
            {rooms.length === 0 && !checkingRooms ? <Typography color="text.secondary" variant="caption" sx={{ display: "block", mt: 0.75 }}>{t(`No alternative ${inventorySingular} loaded. The current one will still be revalidated on save.`, `Hakuna ${inventorySingular} mbadala iliyopakiwa. Iliyopo sasa bado itakaguliwa unapohifadhi.`)}</Typography> : null}
          </Box>
          <TextField select label={t("Booking source")} value={source} onChange={(event) => setSource(event.target.value)}><MenuItem value="front_desk">{t("Front desk / walk-in")}</MenuItem><MenuItem value="phone">{t("Phone")}</MenuItem><MenuItem value="direct">{t("Direct")}</MenuItem><MenuItem value="agent">{t("Agent")}</MenuItem><MenuItem value="other">{t("Other")}</MenuItem></TextField>
          <TextField label={t("Special requests")} multiline minRows={3} value={specialRequests} onChange={(event) => setSpecialRequests(event.target.value)} />
          {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions><Button disabled={working} onClick={onClose}>{t("Cancel")}</Button><Button disabled={working || !changed} startIcon={<EditCalendarRoundedIcon />} type="submit" variant="contained">{working ? t("Saving…") : t("Save changes")}</Button></DialogActions>
      </Box>
    </ResponsiveModal>
  );
}

function PaymentModal({ booking, open, paymentMethods, propertyId, onClose, onSaved }: { booking: Booking; open: boolean; paymentMethods: AcceptedPaymentMethod[]; propertyId: string; onClose: () => void; onSaved: () => Promise<void> }) {
  const client = useMemo(() => createClient(), []);
  const { t } = useLanguage();
  const idempotencyKey = useRef(crypto.randomUUID());
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<AcceptedPaymentMethod>(paymentMethods[0] ?? "cash");
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
      setError(t(`Enter an amount between TZS 1 and ${money.format(balance)}.`, `Weka kiasi kati ya TZS 1 na ${money.format(balance)}.`));
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
      setError(cause instanceof Error ? cause.message : t("Unable to record payment.", "Imeshindikana kurekodi malipo."));
    } finally {
      setWorking(false);
    }
  };

  return <ResponsiveModal open={open} onClose={working ? undefined : onClose} maxWidth="xs"><DialogTitle>{t("Record payment")}</DialogTitle><Box aria-busy={working} component="form" onSubmit={(event: FormEvent) => { event.preventDefault(); void save(); }} sx={{ display: "flex", flex: 1, flexDirection: "column", minHeight: 0 }}><DialogContent><Alert severity="info" sx={{ mb: 2 }}>{t("Outstanding balance", "Salio")}: {money.format(balance)}</Alert><Stack spacing={1.5}><TextField autoFocus disabled={working} label={t("Amount")} type="number" value={amount} onChange={(event) => changeAttempt(() => setAmount(event.target.value))} slotProps={{ input: { startAdornment: <Typography color="text.secondary" sx={{ mr: 1 }}>TZS</Typography> }, htmlInput: { min: 1, max: balance } }} /><TextField disabled={working} select label={t("Method")} value={method} onChange={(event) => changeAttempt(() => setMethod(event.target.value as AcceptedPaymentMethod))}>{paymentMethods.map((value) => { const option = acceptedPaymentMethods.find((item) => item.value === value); return option ? <MenuItem key={value} value={value}>{t(option.label[0], option.label[1])}</MenuItem> : null; })}</TextField><TextField disabled={working} label={t("Reference (optional)", "Kumbukumbu (hiari)")} value={reference} onChange={(event) => changeAttempt(() => setReference(event.target.value))} /><TextField disabled={working} label={t("Notes (optional)", "Maelezo (hiari)")} multiline minRows={2} value={notes} onChange={(event) => changeAttempt(() => setNotes(event.target.value))} />{error ? <Alert severity="error">{error}</Alert> : null}</Stack></DialogContent><DialogActions><Button disabled={working} onClick={onClose}>{t("Cancel")}</Button><Button disabled={working || !validAmount} type="submit" variant="contained">{working ? t("Recording…") : t("Record payment")}</Button></DialogActions></Box></ResponsiveModal>;
}

function BookingDetailsSkeleton() {
  return <Container maxWidth="xl" sx={{ py: 3 }}><Stack spacing={2}><Stack direction="row" spacing={1.5}><Skeleton variant="rounded" width={44} height={44} /><Box sx={{ flex: 1 }}><Skeleton width={180} /><Skeleton width={260} height={36} /></Box></Stack><Skeleton height={72} variant="rounded" /><Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "1.35fr .75fr" } }}><Stack spacing={2}><Skeleton height={250} variant="rounded" /><Skeleton height={280} variant="rounded" /></Stack><Skeleton height={360} variant="rounded" /></Box></Stack></Container>;
}

function ErrorState({ actionLabel = "Try again", message, onRetry }: { actionLabel?: string; message: string; onRetry: () => void }) {
  const { t } = useLanguage();
  return <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 } }}><Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 } }}><Alert severity="error">{message}</Alert><Button onClick={onRetry} startIcon={actionLabel === "Try again" ? <RefreshRoundedIcon /> : <ArrowBackRoundedIcon />} sx={{ mt: 2 }} variant="contained">{t(actionLabel)}</Button></Paper></Container>;
}
