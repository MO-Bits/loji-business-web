"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CleaningServicesRoundedIcon from "@mui/icons-material/CleaningServicesRounded";
import FlightLandRoundedIcon from "@mui/icons-material/FlightLandRounded";
import FlightTakeoffRoundedIcon from "@mui/icons-material/FlightTakeoffRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  Alert,
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";

import { useAppFeedback } from "@/components/providers/feedback-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { CashierClosePanel } from "@/components/finance/cashier-close-panel";
import { housekeepingOptions, RoomStatusPill } from "@/components/rooms/room-status";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import {
  EmptyState,
  LoadingRows,
  MetricCell,
  SectionHeading,
  StatusPill,
  Surface,
  WorkspacePage,
} from "@/components/shared/workspace-ui";
import type { OperationBooking, OperationsBoard } from "@/features/operations/models/operations";
import { checkInOperation, getPropertyOperationsBoard } from "@/features/operations/services/operations-service";
import { getPropertyTypeDefinition } from "@/features/property/property-type";
import type { HousekeepingStatus, RoomBoardItem } from "@/features/rooms/models/room";
import { setRoomHousekeepingStatus } from "@/features/rooms/services/room-service";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { getWorkspaceCapabilities } from "@/features/session/permissions";
import { formatLocalDate } from "@/lib/date-time";
import { createClient } from "@/lib/supabase/client";

type Lane = "arrivals" | "departures" | "in_house" | "balances" | "housekeeping" | "cashier";
type HousekeepingFilter = "attention" | "all" | HousekeepingStatus;

const money = new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
});

export function OperationsScreen() {
  const { t } = useLanguage();
  const feedback = useAppFeedback();
  const { session, loading: sessionLoading } = useAppSession();
  const client = useMemo(() => createClient(), []);
  const requestId = useRef(0);
  const activePropertyId = useRef<string | undefined>(undefined);
  const [boardState, setBoardState] = useState<OperationsBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<{ propertyId: string; message: string } | null>(null);
  const [lane, setLane] = useState<Lane>("arrivals");
  const [housekeepingFilter, setHousekeepingFilter] = useState<HousekeepingFilter>("attention");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [checkInTarget, setCheckInTarget] = useState<OperationBooking | null>(null);
  const propertyId = session?.activePropertyId;
  const board = boardState && boardState.property.id === propertyId ? boardState : null;
  const error = errorState && errorState.propertyId === propertyId ? errorState.message : null;
  const dataLoading = loading || Boolean(boardState && boardState.property.id !== propertyId);
  const localCapabilities = getWorkspaceCapabilities(session?.activeRole);
  const propertyDefinition = getPropertyTypeDefinition(session?.property?.type);
  const inventorySingular = t(propertyDefinition.inventorySingular[0], propertyDefinition.inventorySingular[1]);
  const inventoryPlural = t(propertyDefinition.inventoryPlural[0], propertyDefinition.inventoryPlural[1]);

  useEffect(() => {
    activePropertyId.current = propertyId;
    return () => { activePropertyId.current = undefined; };
  }, [propertyId]);

  const refresh = useCallback(async (silent = false) => {
    if (!propertyId) {
      requestId.current += 1;
      setBoardState(null);
      setLoading(false);
      return;
    }
    const requestPropertyId = propertyId;
    const current = ++requestId.current;
    if (!silent) setLoading(true);
    setErrorState(null);
    setBoardState((existing) => existing?.property.id === requestPropertyId ? existing : null);
    try {
      const next = await getPropertyOperationsBoard(client, requestPropertyId);
      if (current === requestId.current && activePropertyId.current === requestPropertyId) setBoardState(next);
    } catch (cause) {
      if (current === requestId.current && activePropertyId.current === requestPropertyId) {
        setErrorState({
          propertyId: requestPropertyId,
          message: cause instanceof Error ? cause.message : t("Unable to load Front Desk.", "Imeshindikana kupakia Mapokezi."),
        });
      }
    } finally {
      if (current === requestId.current && activePropertyId.current === requestPropertyId) setLoading(false);
    }
  }, [client, propertyId, t]);

  useEffect(() => {
    if (sessionLoading) return;
    const timer = window.setTimeout(() => {
      setCheckInTarget(null);
      setPendingId(null);
      if (!propertyId || !localCapabilities.canViewOperations) {
        requestId.current += 1;
        setBoardState(null);
        setLoading(false);
        return;
      }
      void refresh();
    }, 0);
    return () => { window.clearTimeout(timer); requestId.current += 1; };
  }, [localCapabilities.canViewOperations, propertyId, refresh, sessionLoading]);

  useEffect(() => {
    if (!propertyId || !localCapabilities.canViewOperations) return;
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh(true);
    };
    const interval = window.setInterval(refreshWhenVisible, 60_000);
    window.addEventListener("focus", refreshWhenVisible);
    window.addEventListener("online", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      window.removeEventListener("online", refreshWhenVisible);
    };
  }, [localCapabilities.canViewOperations, propertyId, refresh]);

  const canManageHousekeeping = board
    ? board.capabilities.manageHousekeeping
    : localCapabilities.canManageRooms;
  const canCreateBooking = board ? board.capabilities.createBooking : localCapabilities.canCreateBooking;
  const canCloseCashier = board ? board.capabilities.recordPayment : localCapabilities.canRecordPayment;

  const confirmCheckIn = async () => {
    if (!checkInTarget || !propertyId || pendingId || !board) return;
    const actionPropertyId = propertyId;
    const booking = checkInTarget;
    setCheckInTarget(null);
    setPendingId(booking.id);
    try {
      await checkInOperation(client, booking.id);
      if (activePropertyId.current === actionPropertyId) {
        feedback.success(t(`${booking.guestName} checked in successfully.`, `${booking.guestName} ameingia kikamilifu.`));
        await refresh(true);
      }
    } catch (cause) {
      if (activePropertyId.current === actionPropertyId) {
        feedback.error(cause instanceof Error ? cause.message : t("Unable to check in guest.", "Imeshindikana kumwingiza mgeni."));
      }
    } finally {
      if (activePropertyId.current === actionPropertyId) setPendingId(null);
    }
  };

  const updateHousekeeping = async (room: RoomBoardItem, status: HousekeepingStatus) => {
    if (!propertyId || pendingId) return;
    const actionPropertyId = propertyId;
    setPendingId(room.id);
    try {
      await setRoomHousekeepingStatus(client, actionPropertyId, room.id, status);
      if (activePropertyId.current === actionPropertyId) {
        feedback.success(t(`${room.name} updated.`, `${room.name} kimesasishwa.`));
        await refresh(true);
      }
    } catch (cause) {
      if (activePropertyId.current === actionPropertyId) {
        feedback.error(cause instanceof Error ? cause.message : t(`Unable to update ${inventorySingular}.`, `Imeshindikana kubadili ${inventorySingular}.`));
      }
    } finally {
      if (activePropertyId.current === actionPropertyId) setPendingId(null);
    }
  };

  if (sessionLoading) return <WorkspacePage><Surface padding={false}><LoadingRows rows={6} /></Surface></WorkspacePage>;
  if (!localCapabilities.canViewOperations) {
    return <WorkspacePage maxWidth={760}><Surface padding={false}><EmptyState description={t("Ask a property owner to assign you a front-desk role.", "Mwombe mmiliki wa biashara akupe jukumu la mapokezi.")} icon={<HotelRoundedIcon />} title={t("Front Desk access is restricted", "Ufikiaji wa Mapokezi umezuiwa")} /></Surface></WorkspacePage>;
  }

  const summary = board?.summary;
  const housekeeping = board?.housekeeping.filter((room) => {
    if (housekeepingFilter === "all") return true;
    if (housekeepingFilter === "attention") return room.operationalStatus !== "ready";
    return room.housekeepingStatus === housekeepingFilter;
  }) ?? [];
  const attention = summary?.roomsNeedingAttention ?? 0;

  return (
    <WorkspacePage>
      <Stack spacing={{ xs: 2.25, sm: 3 }}>
        <PageHeader
          action={canCreateBooking ? <Button component={Link} href="/bookings/new" startIcon={<AddRoundedIcon />} variant="contained">{t("New booking", "Uhifadhi mpya")}</Button> : undefined}
          description={board?.property.businessDate
            ? t(`Arrivals, departures, current stays, balances and room readiness for ${formatLocalDate(board.property.businessDate, { weekday: "long", day: "numeric", month: "long" })}.`, `Wanaowasili, wanaotoka, waliopo, salio na utayari wa vyumba kwa ${formatLocalDate(board.property.businessDate, { weekday: "long", day: "numeric", month: "long" })}.`)
            : t("Run the whole guest day from one workspace.", "Endesha siku nzima ya wageni kutoka sehemu moja.")}
          eyebrow={t("Daily workspace", "Eneo la kazi la kila siku")}
          title={t("Front Desk", "Mapokezi")}
        />

        <Box
          sx={{
            display: "grid",
            gap: { xs: 1.25, sm: 1.5 },
            gridTemplateColumns: {
              xs: "repeat(6,minmax(180px,72vw))",
              sm: "repeat(3,minmax(0,1fr))",
              lg: "repeat(6,minmax(0,1fr))",
            },
            overflowX: { xs: "auto", sm: "visible" },
            pb: { xs: 0.5, sm: 0 },
            scrollSnapType: { xs: "x proximity", sm: "none" },
            "& > *": { scrollSnapAlign: "start" },
          }}
        >
          <MetricCell caption={summary?.overdueArrivals ? t(`${summary.overdueArrivals} overdue`, `${summary.overdueArrivals} wamechelewa`) : t("Expected today", "Wanatarajiwa leo")} icon={<FlightLandRoundedIcon />} label={t("Arrivals", "Wanaowasili")} tone={summary?.overdueArrivals ? "warning" : "info"} value={summary?.arrivalsDue ?? 0} />
          <MetricCell caption={summary?.overdueDepartures ? t(`${summary.overdueDepartures} overdue`, `${summary.overdueDepartures} wamechelewa`) : t("Expected today", "Wanatarajiwa leo")} icon={<FlightTakeoffRoundedIcon />} label={t("Departures", "Wanaotoka")} tone={summary?.overdueDepartures ? "warning" : "neutral"} value={summary?.departuresDue ?? 0} />
          <MetricCell caption={t(`${summary?.inHouseGuests ?? 0} guests`, `Wageni ${summary?.inHouseGuests ?? 0}`)} icon={<PeopleRoundedIcon />} label={t("In house", "Waliopo")} tone="info" value={summary?.inHouse ?? 0} />
          <MetricCell caption={t(`${summary?.openBalances ?? 0} bookings need payment`, `Uhifadhi ${summary?.openBalances ?? 0} unahitaji malipo`)} icon={<PaymentsRoundedIcon />} label={t("Outstanding", "Deni")} tone={summary?.outstandingBalance ? "warning" : "success"} value={money.format(summary?.outstandingBalance ?? 0)} />
          <MetricCell caption={t("Cleared for arrival", "Viko tayari kwa kuwasili")} icon={<CheckCircleRoundedIcon />} label={t("Rooms ready", "Vyumba tayari")} tone="success" value={summary?.readyRooms ?? 0} />
          <MetricCell caption={t("Dirty, cleaning or in maintenance", "Vichafu, vinasafishwa au kwenye matengenezo")} icon={<CleaningServicesRoundedIcon />} label={t("Room attention", "Uangalizi wa vyumba")} tone={attention ? "warning" : "success"} value={attention} />
        </Box>

        <Surface padding={false}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", p: 1.25 }}>
            <Box sx={{ flex: 1, minWidth: 0, overflowX: "auto" }}>
              <ToggleButtonGroup exclusive onChange={(_, value: Lane | null) => value && setLane(value)} size="small" sx={{ minWidth: "max-content" }} value={lane}>
                <ToggleButton value="arrivals">{t("Arrivals", "Wanaowasili")} · {board?.arrivals.length ?? 0}</ToggleButton>
                <ToggleButton value="departures">{t("Departures", "Wanaotoka")} · {board?.departures.length ?? 0}</ToggleButton>
                <ToggleButton value="in_house">{t("In house", "Waliopo")} · {board?.inHouse.length ?? 0}</ToggleButton>
                <ToggleButton value="balances">{t("Balances", "Salio")} · {board?.balances.length ?? 0}</ToggleButton>
                <ToggleButton value="housekeeping">{t("Rooms", "Vyumba")} · {board?.housekeeping.length ?? 0}</ToggleButton>
                {canCloseCashier ? <ToggleButton value="cashier">{t("Cashier close", "Funga kaunta")}</ToggleButton> : null}
              </ToggleButtonGroup>
            </Box>
            <Button
              aria-label={t("Refresh Front Desk", "Pakua upya Mapokezi")}
              disabled={loading}
              onClick={() => void refresh()}
              startIcon={<RefreshRoundedIcon />}
              sx={{
                flexShrink: 0,
                minWidth: { xs: 44, sm: "auto" },
                px: { xs: 0, sm: 2 },
                "& .MuiButton-startIcon": { mr: { xs: 0, sm: 1 } },
              }}
              variant="text"
            >
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                {t("Refresh", "Pakua upya")}
              </Box>
            </Button>
          </Stack>
        </Surface>

        {error ? <Alert action={<Button color="inherit" onClick={() => void refresh()}>{t("Retry", "Jaribu tena")}</Button>} severity="error">{error}</Alert> : null}

        {dataLoading && !board ? <Surface padding={false}><LoadingRows rows={8} /></Surface> : (
          <Box sx={{ minWidth: 0 }}>
            {lane === "arrivals" ? <BookingLane action={(booking) => booking.canCheckIn ? <Button disabled={Boolean(pendingId)} onClick={() => setCheckInTarget(booking)} size="small" variant="contained">{t("Check in", "Ingiza")}</Button> : <Button component={Link} href={`/bookings/${booking.id}`} size="small">{booking.status === "pending" ? t("Confirm first", "Thibitisha kwanza") : t("Open", "Fungua")}</Button>} bookings={board?.arrivals ?? []} emptyDescription={t("Arrivals due today and overdue arrivals appear here.", "Wanaowasili leo na waliochelewa wataonekana hapa.")} emptyTitle={t("No arrivals due", "Hakuna wanaowasili")} icon={<FlightLandRoundedIcon />} title={t("Today's arrivals", "Wanaowasili leo")} /> : null}
            {lane === "departures" ? <BookingLane action={(booking) => <BookingAction booking={booking} mode="checkout" />} bookings={board?.departures ?? []} emptyDescription={t("Checked-in stays due to leave today appear here.", "Wageni wanaotarajiwa kutoka leo wataonekana hapa.")} emptyTitle={t("No departures due", "Hakuna wanaotoka")} icon={<FlightTakeoffRoundedIcon />} title={t("Today's departures", "Wanaotoka leo")} /> : null}
            {lane === "in_house" ? <BookingLane action={(booking) => <BookingAction booking={booking} mode="stay" />} bookings={board?.inHouse ?? []} emptyDescription={t("Checked-in guests appear here until checkout.", "Wageni walioingia huonekana hapa hadi watakapotoka.")} emptyTitle={t("No guests currently staying", "Hakuna wageni waliopo")} icon={<PeopleRoundedIcon />} title={t("Guests currently staying", "Wageni waliopo sasa")} /> : null}
            {lane === "balances" ? <BookingLane action={(booking) => <BookingAction booking={booking} mode="payment" />} bookings={board?.balances ?? []} emptyDescription={t("Bookings with an unpaid balance appear here.", "Uhifadhi wenye salio huonekana hapa.")} emptyTitle={t("No outstanding balances", "Hakuna salio linalodaiwa")} icon={<PaymentsRoundedIcon />} title={t("Outstanding balances", "Salio linalodaiwa")} /> : null}
            {lane === "housekeeping" ? <HousekeepingLane canManage={canManageHousekeeping} filter={housekeepingFilter} inventoryPlural={inventoryPlural} inventorySingular={inventorySingular} onFilter={setHousekeepingFilter} onUpdate={updateHousekeeping} pendingId={pendingId} rooms={housekeeping} total={board?.housekeeping.length ?? 0} /> : null}
            {lane === "cashier" && propertyId && canCloseCashier ? <CashierClosePanel propertyId={propertyId} /> : null}
          </Box>
        )}
      </Stack>

      <ResponsiveModal maxWidth="xs" onClose={() => setCheckInTarget(null)} open={Boolean(checkInTarget && board)}>
        <DialogTitle>{t("Confirm guest check-in", "Thibitisha kuingia kwa mgeni")}</DialogTitle>
        <DialogContent><Typography color="text.secondary" variant="body2">{t(`Check in ${checkInTarget?.guestName ?? "this guest"} to ${checkInTarget?.roomName ?? `the assigned ${inventorySingular}`}?`, `Mwingize ${checkInTarget?.guestName ?? "mgeni huyu"} kwenye ${checkInTarget?.roomName ?? inventorySingular} aliyopangiwa?`)}</Typography></DialogContent>
        <DialogActions><Button onClick={() => setCheckInTarget(null)}>{t("Cancel", "Ghairi")}</Button><Button onClick={() => void confirmCheckIn()} variant="contained">{t("Confirm check-in", "Thibitisha kuingia")}</Button></DialogActions>
      </ResponsiveModal>
    </WorkspacePage>
  );
}

export const FrontDeskScreen = OperationsScreen;

function BookingAction({ booking, mode }: { booking: OperationBooking; mode: "checkout" | "stay" | "payment" }) {
  const { t } = useLanguage();
  if (booking.canRecordPayment && (mode === "payment" || booking.balanceDue > 0)) {
    return <Button component={Link} href={`/bookings/${booking.id}?action=payment`} size="small" variant="contained">{t("Record payment", "Rekodi malipo")}</Button>;
  }
  if ((mode === "checkout" || mode === "stay") && booking.canCheckOut) {
    return <Button component={Link} href={`/bookings/${booking.id}?action=checkout`} size="small" variant="contained">{t("Check out", "Mtoe mgeni")}</Button>;
  }
  return <Button component={Link} endIcon={<ArrowForwardRoundedIcon />} href={`/bookings/${booking.id}`} size="small">{t("Open", "Fungua")}</Button>;
}

function BookingLane({ action, bookings, emptyDescription, emptyTitle, icon, title }: { action: (booking: OperationBooking) => ReactNode; bookings: OperationBooking[]; emptyDescription: string; emptyTitle: string; icon: ReactNode; title: string }) {
  const { t } = useLanguage();
  return (
    <Surface padding={false}>
      <Box sx={{ p: 2 }}><SectionHeading action={<StatusPill label={`${bookings.length}`} tone="neutral" />} eyebrow={t("Front Desk", "Mapokezi")} title={title} /></Box>
      <Divider />
      {bookings.length ? <Stack divider={<Divider flexItem />}>{bookings.map((booking) => (
        <Box key={booking.id} sx={{ p: 2 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { sm: "center" } }}>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start", flex: 1, minWidth: 0 }}>
              <Box sx={{ bgcolor: "action.hover", borderRadius: 2, color: booking.isOverdue ? "warning.main" : "primary.main", display: "grid", flexShrink: 0, height: 40, placeItems: "center", width: 40, "& .MuiSvgIcon-root": { fontSize: 20 } }}>{icon}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", flexWrap: "wrap" }}><Typography sx={{ fontWeight: 700 }} variant="body1">{booking.guestName}</Typography>{booking.isOverdue ? <StatusPill label={t("Overdue", "Amechelewa")} tone="warning" /> : null}{booking.roomReadiness && booking.roomReadiness !== "ready" ? <StatusPill label={t("Room not ready", "Chumba hakiko tayari")} tone="warning" /> : null}</Stack>
                <Typography color="text.secondary" variant="body2">{booking.roomName} · {booking.totalGuests} {t("guests", "wageni")} · {formatLocalDate(booking.checkIn)} – {formatLocalDate(booking.checkOut)}</Typography>
                {booking.blockedReason ? <Typography color="warning.main" sx={{ display: "block", mt: 0.35 }} variant="caption">{t(booking.blockedReason)}</Typography> : null}
              </Box>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { xs: "stretch", sm: "center" }, justifyContent: { sm: "flex-end" }, minWidth: { sm: 250 }, width: { xs: "100%", sm: "auto" } }}>
              <Box sx={{ textAlign: { sm: "right" } }}>{booking.balanceDue > 0 ? <Typography color="warning.main" sx={{ fontWeight: 700 }} variant="body2">{money.format(booking.balanceDue)}</Typography> : <Typography color="success.main" sx={{ fontWeight: 700 }} variant="body2">{t("Paid", "Imelipwa")}</Typography>}<Button component={Link} href={`/bookings/${booking.id}`} size="small" variant="text">{booking.bookingNumber || t("Booking", "Uhifadhi")}</Button></Box>
              <Box sx={{ "& > .MuiButton-root": { width: { xs: "100%", sm: "auto" } } }}>
                {action(booking)}
              </Box>
            </Stack>
          </Stack>
        </Box>
      ))}</Stack> : <EmptyState description={emptyDescription} icon={icon} title={emptyTitle} />}
    </Surface>
  );
}

function HousekeepingLane({ canManage, filter, inventoryPlural, inventorySingular, onFilter, onUpdate, pendingId, rooms, total }: { canManage: boolean; filter: HousekeepingFilter; inventoryPlural: string; inventorySingular: string; onFilter: (filter: HousekeepingFilter) => void; onUpdate: (room: RoomBoardItem, status: HousekeepingStatus) => Promise<void>; pendingId: string | null; rooms: RoomBoardItem[]; total: number }) {
  const { t } = useLanguage();
  return (
    <Surface padding={false}>
      <Box sx={{ p: 2 }}><SectionHeading action={<StatusPill label={`${total}`} tone="neutral" />} eyebrow={t(`${inventorySingular} readiness`, `Utayari wa ${inventoryPlural}`)} title={t("Room and housekeeping board", "Ubao wa vyumba na usafi")} /></Box>
      <Divider />
      <Box sx={{ overflowX: "auto", p: 1.25 }}><ToggleButtonGroup exclusive onChange={(_, value: HousekeepingFilter | null) => value && onFilter(value)} size="small" sx={{ minWidth: "max-content" }} value={filter}><ToggleButton value="attention">{t("Attention", "Uangalizi")}</ToggleButton><ToggleButton value="needs_cleaning">{t("Dirty", "Vichafu")}</ToggleButton><ToggleButton value="cleaning">{t("Cleaning", "Usafi")}</ToggleButton><ToggleButton value="ready">{t("Ready", "Tayari")}</ToggleButton><ToggleButton value="all">{t("All", "Vyote")}</ToggleButton></ToggleButtonGroup></Box>
      <Divider />
      {rooms.length ? <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,minmax(0,1fr))" } }}>{rooms.map((room) => (
        <Stack direction="row" key={room.id} spacing={1.25} sx={{ alignItems: "center", borderBottom: "1px solid", borderColor: "divider", opacity: pendingId === room.id ? 0.55 : 1, p: 2 }}>
          <Box sx={{ bgcolor: "action.hover", borderRadius: 2, color: room.operationalStatus === "ready" ? "success.main" : "warning.main", display: "grid", flexShrink: 0, height: 40, placeItems: "center", width: 40 }}>{room.operationalStatus === "ready" ? <CheckCircleRoundedIcon fontSize="small" /> : <CleaningServicesRoundedIcon fontSize="small" />}</Box>
          <Box component={Link} href={`/rooms/${room.id}`} sx={{ color: "inherit", flex: 1, minWidth: 0, textDecoration: "none" }}><Typography noWrap sx={{ fontWeight: 700 }} variant="body2">{room.name}</Typography><Box sx={{ mt: 0.35 }}><RoomStatusPill status={room.operationalStatus} t={t} /></Box>{room.nextStay ? <Typography color="text.secondary" noWrap sx={{ display: "block", mt: 0.5 }} variant="caption">{t("Next", "Anayefuata")}: {room.nextStay.guestName} · {formatLocalDate(room.nextStay.checkIn, { day: "numeric", month: "short" })}</Typography> : null}</Box>
          {canManage ? <HousekeepingMenu disabled={Boolean(pendingId)} onUpdate={onUpdate} room={room} /> : null}
        </Stack>
      ))}</Box> : <EmptyState description={t(`Try another filter, or enjoy a fully ready ${inventoryPlural} board.`, `Jaribu kichujio kingine, au furahia ${inventoryPlural} zote kuwa tayari.`)} icon={<CheckCircleRoundedIcon />} title={t(`No ${inventoryPlural} in this queue`, `Hakuna ${inventoryPlural} kwenye foleni hii`)} />}
    </Surface>
  );
}

function HousekeepingMenu({ disabled, onUpdate, room }: { disabled: boolean; onUpdate: (room: RoomBoardItem, status: HousekeepingStatus) => Promise<void>; room: RoomBoardItem }) {
  const { t } = useLanguage();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return <><Tooltip title={t("Update housekeeping", "Badili hali ya usafi")}><span><IconButton aria-label={t(`Update ${room.name}`, `Badili ${room.name}`)} disabled={disabled} onClick={(event) => setAnchor(event.currentTarget)} size="small"><MoreHorizRoundedIcon /></IconButton></span></Tooltip><Menu anchorEl={anchor} onClose={() => setAnchor(null)} open={Boolean(anchor)}>{housekeepingOptions.map((option) => <MenuItem disabled={option.value === room.housekeepingStatus} key={option.value} onClick={() => { setAnchor(null); void onUpdate(room, option.value); }}>{t(option.label, option.swahili)}</MenuItem>)}</Menu></>;
}
