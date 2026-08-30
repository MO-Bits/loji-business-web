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
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  Alert,
  Box,
  Button,
  Dialog,
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
import { PageHeader } from "@/components/shared/page-header";
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
import type { HousekeepingStatus, RoomBoardItem } from "@/features/rooms/models/room";
import { setRoomHousekeepingStatus } from "@/features/rooms/services/room-service";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { getWorkspaceCapabilities } from "@/features/session/permissions";
import { formatLocalDate } from "@/lib/date-time";
import { createClient } from "@/lib/supabase/client";
import { housekeepingOptions, RoomStatusPill } from "@/components/rooms/room-status";

type Lane = "arrivals" | "departures" | "housekeeping";
type HousekeepingFilter = "attention" | "all" | HousekeepingStatus;

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

  useEffect(() => {
    activePropertyId.current = propertyId;
    return () => {
      activePropertyId.current = undefined;
    };
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
      if (current === requestId.current && activePropertyId.current === requestPropertyId) {
        setBoardState(next);
      }
    } catch (cause) {
      if (current === requestId.current && activePropertyId.current === requestPropertyId) {
        setErrorState({
          propertyId: requestPropertyId,
          message: cause instanceof Error ? cause.message : t("Unable to load operations.", "Imeshindikana kupakia uendeshaji."),
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
    return () => {
      window.clearTimeout(timer);
      requestId.current += 1;
    };
  }, [localCapabilities.canViewOperations, propertyId, refresh, sessionLoading]);

  const canCheckIn = board ? board.capabilities.checkIn : localCapabilities.canCheckIn;
  const canCheckout = board ? board.capabilities.checkOut : localCapabilities.canCheckout;
  const canManageRooms = board ? board.capabilities.manageRooms : localCapabilities.canManageRooms;
  const canCreateBooking = board ? board.capabilities.createBooking : localCapabilities.canCreateBooking;

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
        feedback.error(cause instanceof Error ? cause.message : t("Unable to update room.", "Imeshindikana kubadili chumba."));
      }
    } finally {
      if (activePropertyId.current === actionPropertyId) setPendingId(null);
    }
  };

  if (sessionLoading) {
    return <WorkspacePage><Surface padding={false}><LoadingRows rows={6} /></Surface></WorkspacePage>;
  }

  if (!localCapabilities.canViewOperations) {
    return (
      <WorkspacePage maxWidth={760}>
        <Surface padding={false}>
          <EmptyState description={t("Ask a property owner to assign you an operations role.", "Mwombe mmiliki wa jengo akupe jukumu la uendeshaji.")} icon={<HotelRoundedIcon />} title={t("Operations access is restricted", "Ufikiaji wa uendeshaji umezuiwa")} />
        </Surface>
      </WorkspacePage>
    );
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
          eyebrow={t("Daily control center", "Kituo cha udhibiti wa siku")}
          title={t("Operations", "Uendeshaji")}
          description={board?.property.businessDate
            ? t(`Arrivals, departures, and room readiness for ${formatLocalDate(board.property.businessDate, { weekday: "long", day: "numeric", month: "long" })}.`, `Wanaowasili, wanaotoka na utayari wa vyumba kwa ${formatLocalDate(board.property.businessDate, { weekday: "long", day: "numeric", month: "long" })}.`)
            : t("Run the front desk and housekeeping handoff from one live board.", "Endesha mapokezi na usafi kutoka kwenye ubao mmoja.")}
          action={canCreateBooking ? <Button component={Link} href="/bookings/new" startIcon={<AddRoundedIcon />} variant="contained">{t("New booking", "Nafasi mpya")}</Button> : undefined}
        />

        <Box sx={{ display: "grid", gap: { xs: 1.25, sm: 1.5 }, gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", lg: "repeat(4,minmax(0,1fr))" } }}>
          <MetricCell caption={summary?.overdueArrivals ? t(`${summary.overdueArrivals} overdue`, `${summary.overdueArrivals} wamechelewa`) : t("Expected today", "Wanatarajiwa leo")} icon={<FlightLandRoundedIcon />} label={t("Arrivals due", "Wanaowasili")} tone={summary?.overdueArrivals ? "warning" : "info"} value={summary?.arrivalsDue ?? 0} />
          <MetricCell caption={summary?.overdueDepartures ? t(`${summary.overdueDepartures} overdue`, `${summary.overdueDepartures} wamechelewa`) : t("Expected today", "Wanatarajiwa leo")} icon={<FlightTakeoffRoundedIcon />} label={t("Departures due", "Wanaotoka")} tone={summary?.overdueDepartures ? "warning" : "neutral"} value={summary?.departuresDue ?? 0} />
          <MetricCell caption={t("Guests currently checked in", "Wageni waliopo sasa")} icon={<HotelRoundedIcon />} label={t("In house", "Waliopo hotelini")} tone="info" value={summary?.inHouse ?? 0} />
          <MetricCell caption={t(`${summary?.readyRooms ?? 0} rooms ready`, `Vyumba ${summary?.readyRooms ?? 0} tayari`)} icon={<CleaningServicesRoundedIcon />} label={t("Room attention", "Uangalizi wa vyumba")} tone={attention ? "warning" : "success"} value={attention} />
        </Box>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
          <Box sx={{ display: { xs: "block", lg: "none" }, overflowX: "auto" }}>
            <ToggleButtonGroup exclusive onChange={(_, value: Lane | null) => value && setLane(value)} size="small" sx={{ minWidth: "max-content" }} value={lane}>
              <ToggleButton value="arrivals">{t("Arrivals", "Wanaowasili")} · {board?.arrivals.length ?? 0}</ToggleButton>
              <ToggleButton value="departures">{t("Departures", "Wanaotoka")} · {board?.departures.length ?? 0}</ToggleButton>
              <ToggleButton value="housekeeping">{t("Housekeeping", "Usafi")} · {board?.housekeeping.length ?? 0}</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Button disabled={loading} onClick={() => void refresh()} startIcon={<RefreshRoundedIcon />} sx={{ alignSelf: { xs: "flex-start", sm: "center" } }} variant="text">{t("Refresh board", "Pakua upya ubao")}</Button>
        </Stack>

        {error ? <Alert action={<Button color="inherit" onClick={() => void refresh()}>{t("Retry", "Jaribu tena")}</Button>} severity="error">{error}</Alert> : null}

        {dataLoading && !board ? (
          <Surface padding={false}><LoadingRows rows={8} /></Surface>
        ) : (
          <Box sx={{ alignItems: "start", display: "grid", gap: { xs: 2, lg: 1.5 }, gridTemplateColumns: { xs: "minmax(0,1fr)", lg: "repeat(3,minmax(0,1fr))" } }}>
            <Box sx={{ display: { xs: lane === "arrivals" ? "block" : "none", lg: "block" }, minWidth: 0 }}>
              <BookingLane
                action={(booking) => canCheckIn ? <Button disabled={Boolean(pendingId)} onClick={() => setCheckInTarget(booking)} size="small" variant="contained">{t("Check in", "Ingiza")}</Button> : <Button component={Link} endIcon={<ArrowForwardRoundedIcon />} href={`/bookings/${booking.id}`} size="small">{t("Open", "Fungua")}</Button>}
                bookings={board?.arrivals ?? []}
                emptyDescription={t("Confirmed arrivals due today and overdue arrivals appear here.", "Wanaowasili leo na waliochelewa wataonekana hapa.")}
                emptyTitle={t("No arrivals due", "Hakuna wanaowasili")}
                icon={<FlightLandRoundedIcon />}
                title={t("Arrivals", "Wanaowasili")}
              />
            </Box>
            <Box sx={{ display: { xs: lane === "departures" ? "block" : "none", lg: "block" }, minWidth: 0 }}>
              <BookingLane
                action={(booking) => <Button component={Link} endIcon={<ArrowForwardRoundedIcon />} href={`/bookings/${booking.id}`} size="small" variant={canCheckout ? "contained" : "text"}>{canCheckout ? t("Review checkout", "Kagua kutoka") : t("Open", "Fungua")}</Button>}
                bookings={board?.departures ?? []}
                emptyDescription={t("Checked-in stays due to leave today appear here.", "Wageni wanaotarajiwa kutoka leo wataonekana hapa.")}
                emptyTitle={t("No departures due", "Hakuna wanaotoka")}
                icon={<FlightTakeoffRoundedIcon />}
                title={t("Departures", "Wanaotoka")}
              />
            </Box>
            <Box sx={{ display: { xs: lane === "housekeeping" ? "block" : "none", lg: "block" }, minWidth: 0 }}>
              <HousekeepingLane
                canManage={canManageRooms}
                filter={housekeepingFilter}
                onFilter={setHousekeepingFilter}
                onUpdate={updateHousekeeping}
                pendingId={pendingId}
                rooms={housekeeping}
                total={board?.housekeeping.length ?? 0}
              />
            </Box>
          </Box>
        )}
      </Stack>

      <Dialog fullWidth maxWidth="xs" onClose={() => setCheckInTarget(null)} open={Boolean(checkInTarget && board)}>
        <DialogTitle>{t("Confirm guest check-in", "Thibitisha kuingia kwa mgeni")}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" variant="body2">{t(`Check in ${checkInTarget?.guestName ?? "this guest"} to ${checkInTarget?.roomName ?? "the assigned room"}? This will move the booking into the in-house list.`, `Mwingize ${checkInTarget?.guestName ?? "mgeni huyu"} kwenye ${checkInTarget?.roomName ?? "chumba alichopangiwa"}? Nafasi itahamia kwenye orodha ya waliopo.`)}</Typography>
        </DialogContent>
        <DialogActions><Button onClick={() => setCheckInTarget(null)}>{t("Cancel", "Ghairi")}</Button><Button onClick={() => void confirmCheckIn()} variant="contained">{t("Confirm check-in", "Thibitisha kuingia")}</Button></DialogActions>
      </Dialog>
    </WorkspacePage>
  );
}

function BookingLane({ action, bookings, emptyDescription, emptyTitle, icon, title }: { action: (booking: OperationBooking) => ReactNode; bookings: OperationBooking[]; emptyDescription: string; emptyTitle: string; icon: ReactNode; title: string }) {
  const { t } = useLanguage();
  return (
    <Surface padding={false}>
      <Box sx={{ p: 2 }}><SectionHeading action={<StatusPill label={`${bookings.length}`} tone="neutral" />} eyebrow={t("Front desk", "Mapokezi")} title={title} /></Box>
      <Divider />
      {bookings.length ? <Stack divider={<Divider flexItem />}>{bookings.map((booking) => (
        <Box key={booking.id} sx={{ p: 2 }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
            <Box sx={{ bgcolor: "action.hover", borderRadius: 2, color: booking.isOverdue ? "warning.main" : "primary.main", display: "grid", flexShrink: 0, height: 38, placeItems: "center", width: 38, "& .MuiSvgIcon-root": { fontSize: 19 } }}>{icon}</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", flexWrap: "wrap" }}><Typography noWrap variant="body2" sx={{ fontWeight: 700 }}>{booking.guestName}</Typography>{booking.isOverdue ? <StatusPill label={t("Overdue", "Amechelewa")} tone="warning" /> : null}</Stack>
              <Typography color="text.secondary" noWrap variant="caption">{booking.roomName} · {booking.totalGuests} {t("guests", "wageni")}</Typography>
              <Typography color="text.secondary" sx={{ display: "block", mt: 0.25 }} variant="caption">{formatLocalDate(booking.checkIn)} – {formatLocalDate(booking.checkOut)}</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", mt: 1.5 }}>
            <Button component={Link} href={`/bookings/${booking.id}`} size="small" variant="text">{booking.bookingNumber || t("Booking details", "Maelezo ya nafasi")}</Button>
            {action(booking)}
          </Stack>
        </Box>
      ))}</Stack> : <EmptyState description={emptyDescription} icon={icon} title={emptyTitle} />}
    </Surface>
  );
}

function HousekeepingLane({ canManage, filter, onFilter, onUpdate, pendingId, rooms, total }: { canManage: boolean; filter: HousekeepingFilter; onFilter: (filter: HousekeepingFilter) => void; onUpdate: (room: RoomBoardItem, status: HousekeepingStatus) => Promise<void>; pendingId: string | null; rooms: RoomBoardItem[]; total: number }) {
  const { t } = useLanguage();
  return (
    <Surface padding={false}>
      <Box sx={{ p: 2 }}><SectionHeading action={<StatusPill label={`${total}`} tone="neutral" />} eyebrow={t("Room readiness", "Utayari wa vyumba")} title={t("Housekeeping", "Usafi")} /></Box>
      <Divider />
      <Box sx={{ overflowX: "auto", p: 1.25 }}><ToggleButtonGroup exclusive onChange={(_, value: HousekeepingFilter | null) => value && onFilter(value)} size="small" sx={{ minWidth: "max-content" }} value={filter}><ToggleButton value="attention">{t("Attention", "Uangalizi")}</ToggleButton><ToggleButton value="needs_cleaning">{t("Dirty", "Vichafu")}</ToggleButton><ToggleButton value="cleaning">{t("Cleaning", "Usafi")}</ToggleButton><ToggleButton value="ready">{t("Ready", "Tayari")}</ToggleButton><ToggleButton value="all">{t("All", "Vyote")}</ToggleButton></ToggleButtonGroup></Box>
      <Divider />
      {rooms.length ? <Stack divider={<Divider flexItem />}>{rooms.map((room) => (
        <Stack direction="row" key={room.id} spacing={1.25} sx={{ alignItems: "center", opacity: pendingId === room.id ? 0.55 : 1, p: 2 }}>
          <Box sx={{ bgcolor: "action.hover", borderRadius: 2, color: room.operationalStatus === "ready" ? "success.main" : "warning.main", display: "grid", flexShrink: 0, height: 38, placeItems: "center", width: 38 }}>{room.operationalStatus === "ready" ? <CheckCircleRoundedIcon fontSize="small" /> : <CleaningServicesRoundedIcon fontSize="small" />}</Box>
          <Box component={Link} href={`/rooms/${room.id}`} sx={{ color: "inherit", flex: 1, minWidth: 0, textDecoration: "none" }}><Typography noWrap variant="body2" sx={{ fontWeight: 700 }}>{room.name}</Typography><Box sx={{ mt: 0.35 }}><RoomStatusPill status={room.operationalStatus} t={t} /></Box>{room.nextStay ? <Typography color="text.secondary" noWrap sx={{ display: "block", mt: 0.5 }} variant="caption">{t("Next", "Anayefuata")}: {room.nextStay.guestName} · {formatLocalDate(room.nextStay.checkIn, { day: "numeric", month: "short" })}</Typography> : null}</Box>
          {canManage ? <HousekeepingMenu disabled={Boolean(pendingId)} onUpdate={onUpdate} room={room} /> : null}
        </Stack>
      ))}</Stack> : <EmptyState description={t("Try another filter, or enjoy a fully ready room board.", "Jaribu kichujio kingine, au furahia vyumba vyote kuwa tayari.")} icon={<CheckCircleRoundedIcon />} title={t("No rooms in this queue", "Hakuna vyumba kwenye foleni hii")} />}
    </Surface>
  );
}

function HousekeepingMenu({ disabled, onUpdate, room }: { disabled: boolean; onUpdate: (room: RoomBoardItem, status: HousekeepingStatus) => Promise<void>; room: RoomBoardItem }) {
  const { t } = useLanguage();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return <><Tooltip title={t("Update housekeeping", "Badili hali ya usafi")}><span><IconButton aria-label={t(`Update ${room.name}`, `Badili ${room.name}`)} disabled={disabled} onClick={(event) => setAnchor(event.currentTarget)} size="small"><MoreHorizRoundedIcon /></IconButton></span></Tooltip><Menu anchorEl={anchor} onClose={() => setAnchor(null)} open={Boolean(anchor)}>{housekeepingOptions.map((option) => <MenuItem disabled={option.value === room.housekeepingStatus} key={option.value} onClick={() => { setAnchor(null); void onUpdate(room, option.value); }}>{t(option.label, option.swahili)}</MenuItem>)}</Menu></>;
}
