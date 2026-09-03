"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CleaningServicesRoundedIcon from "@mui/icons-material/CleaningServicesRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { PageHeader } from "@/components/shared/page-header";
import {
  EmptyState,
  LoadingRows,
  MetricCell,
  Surface,
  WorkspacePage,
} from "@/components/shared/workspace-ui";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import type {
  HousekeepingStatus,
  RoomBoard,
  RoomBoardItem,
  RoomOperationalStatus,
  RoomStay,
} from "@/features/rooms/models/room";
import {
  getRoomBoard,
  setRoomActive,
  setRoomHousekeepingStatus,
} from "@/features/rooms/services/room-service";
import { formatLocalDate } from "@/lib/date-time";
import { trackEvent } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/client";
import { housekeepingOptions, RoomStatusPill } from "./room-status";
import {
  getInventoryDefinition,
  getPropertyTypeDefinition,
} from "@/features/property/property-type";

const money = new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
});

type RoomFilter = "all" | RoomOperationalStatus;

const filterValues: RoomFilter[] = [
  "all",
  "ready",
  "occupied",
  "checking_out_today",
  "needs_cleaning",
  "cleaning",
  "out_of_service",
  "inactive",
];

const ROOM_PAGE_SIZE_OPTIONS = [12, 24, 48];

export function RoomsScreen() {
  const { t } = useLanguage();
  const theme = useTheme();
  const isDesktopLayout = useMediaQuery(theme.breakpoints.up("lg"), {
    defaultMatches: false,
  });
  const feedback = useAppFeedback();
  const { session } = useAppSession();
  const client = useMemo(() => createClient(), []);
  const requestId = useRef(0);
  const activePropertyId = useRef<string | undefined>(undefined);
  const [boardState, setBoardState] = useState<RoomBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<{ propertyId: string; message: string } | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RoomFilter>("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [pendingRoom, setPendingRoom] = useState<string | null>(null);
  const propertyId = session?.activePropertyId;
  const board = boardState && boardState.property.id === propertyId ? boardState : null;
  const error = errorState && errorState.propertyId === propertyId ? errorState.message : null;
  const dataLoading = loading || Boolean(boardState && boardState.property.id !== propertyId);
  const canManageHousekeeping = Boolean(board?.capabilities.manageHousekeeping);
  const canManageInventory = Boolean(board?.capabilities.manageRooms);
  const canCreateBooking = Boolean(board?.capabilities.createBooking);
  const propertyDefinition = getPropertyTypeDefinition(
    board?.property.propertyType ?? session?.property?.type,
  );
  const singular = t(
    propertyDefinition.inventorySingular[0],
    propertyDefinition.inventorySingular[1],
  );
  const plural = t(
    propertyDefinition.inventoryPlural[0],
    propertyDefinition.inventoryPlural[1],
  );

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
    const currentRequest = ++requestId.current;
    if (!silent) setLoading(true);
    setErrorState(null);
    setBoardState((existing) => existing?.property.id === requestPropertyId ? existing : null);
    try {
      const next = await getRoomBoard(client, requestPropertyId);
      if (currentRequest === requestId.current && activePropertyId.current === requestPropertyId) {
        setBoardState(next);
      }
    } catch (cause) {
      if (currentRequest === requestId.current && activePropertyId.current === requestPropertyId) {
        setErrorState({
          propertyId: requestPropertyId,
          message: cause instanceof Error ? cause.message : t("Unable to load bookable inventory.", "Imeshindikana kupakia sehemu za kuhifadhi."),
        });
      }
    } finally {
      if (currentRequest === requestId.current && activePropertyId.current === requestPropertyId) setLoading(false);
    }
  }, [client, propertyId, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPendingRoom(null);
      setPage(0);
      void refresh();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      requestId.current += 1;
    };
  }, [refresh]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const requested = new URLSearchParams(window.location.search).get("status") as RoomFilter | null;
      if (requested && filterValues.includes(requested)) setFilter(requested);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const rooms = useMemo(() => board?.rooms ?? [], [board]);
  const canAddInventory =
    canManageInventory &&
    board?.property.inventoryType === "room" &&
    (propertyDefinition.allowsMultipleInventory || rooms.length === 0);
  const visibleRooms = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return rooms.filter((room) => {
      if (filter !== "all" && room.operationalStatus !== filter) return false;
      if (!normalized) return true;
      return [
        room.name,
        room.roomType,
        room.currentStay?.guestName,
        room.nextStay?.guestName,
        ...room.amenities,
      ].some((item) => item?.toLocaleLowerCase().includes(normalized));
    });
  }, [filter, query, rooms]);
  const filterCounts = useMemo(() => {
    const counts = new Map<RoomFilter, number>([["all", rooms.length]]);
    for (const room of rooms) {
      counts.set(
        room.operationalStatus,
        (counts.get(room.operationalStatus) ?? 0) + 1,
      );
    }
    return counts;
  }, [rooms]);
  const safePage = Math.min(
    page,
    Math.max(0, Math.ceil(visibleRooms.length / rowsPerPage) - 1),
  );
  const pagedRooms = useMemo(
    () => visibleRooms.slice(safePage * rowsPerPage, (safePage + 1) * rowsPerPage),
    [rowsPerPage, safePage, visibleRooms],
  );

  const updateQuery = (value: string) => {
    setQuery(value);
    setPage(0);
  };

  const updateFilter = (value: RoomFilter) => {
    setFilter(value);
    setPage(0);
  };

  const updateHousekeeping = async (room: RoomBoardItem, status: HousekeepingStatus) => {
    if (!propertyId || pendingRoom) return;
    const actionPropertyId = propertyId;
    setPendingRoom(room.id);
    try {
      await setRoomHousekeepingStatus(client, actionPropertyId, room.id, status);
      if (activePropertyId.current === actionPropertyId) {
        trackEvent("room_housekeeping_updated", { room_id: room.id, status });
        feedback.success(t("Housekeeping status updated.", "Hali ya usafi imebadilishwa."));
        await refresh(true);
      }
    } catch (cause) {
      if (activePropertyId.current === actionPropertyId) {
        feedback.error(cause instanceof Error ? cause.message : t(`Unable to update ${singular}.`, `Imeshindikana kubadili ${singular}.`));
      }
    } finally {
      if (activePropertyId.current === actionPropertyId) setPendingRoom(null);
    }
  };

  const updateActive = async (room: RoomBoardItem, active: boolean) => {
    if (!propertyId || pendingRoom) return;
    const actionPropertyId = propertyId;
    setPendingRoom(room.id);
    try {
      await setRoomActive(client, actionPropertyId, room, active);
      if (activePropertyId.current === actionPropertyId) {
        trackEvent("room_status_updated", { room_id: room.id, active });
        feedback.success(active
          ? t(`${singular} activated.`, `${singular} imewashwa.`)
          : t(`${singular} deactivated.`, `${singular} imezimwa.`));
        await refresh(true);
      }
    } catch (cause) {
      if (activePropertyId.current === actionPropertyId) {
        feedback.error(cause instanceof Error ? cause.message : t(`Unable to update ${singular}.`, `Imeshindikana kubadili ${singular}.`));
      }
    } finally {
      if (activePropertyId.current === actionPropertyId) setPendingRoom(null);
    }
  };

  const businessDate = board?.property.businessDate;
  const summary = board?.summary;
  const attention = (summary?.needsCleaningRooms ?? 0) +
    (summary?.cleaningRooms ?? 0) +
    (summary?.outOfServiceRooms ?? 0);
  const expectedInventoryCount = board?.property.expectedInventoryCount ?? 1;
  const remainingSetupCount = Math.max(0, expectedInventoryCount - rooms.length);

  return (
    <WorkspacePage>
      <Stack spacing={{ xs: 2.25, sm: 3 }}>
        <PageHeader
          eyebrow={t("Property operations", "Uendeshaji wa biashara")}
          description={businessDate
            ? t(
                `Live occupancy and readiness for every ${singular} on ${formatLocalDate(businessDate, { weekday: "long", day: "numeric", month: "long" })}.`,
                `Hali ya wageni na utayari wa kila ${singular} tarehe ${formatLocalDate(businessDate, { weekday: "long", day: "numeric", month: "long" })}.`,
              )
            : t(`Live occupancy, arrivals and readiness across your ${plural}.`, `Hali ya wageni, wanaowasili na utayari wa ${plural} zako.`)}
          action={canAddInventory && rooms.length > 0 ? (
            <Button component={Link} href="/rooms/new" startIcon={<AddRoundedIcon />} variant="contained">
              {t(`Add ${singular}`, `Ongeza ${singular}`)}
            </Button>
          ) : undefined}
          title={t(
            propertyDefinition.inventoryBoard[0],
            propertyDefinition.inventoryBoard[1],
          )}
        />

        {canAddInventory && rooms.length > 0 && propertyDefinition.allowsMultipleInventory && remainingSetupCount > 0 ? (
          <Alert
            action={<Button component={Link} href="/rooms/new" color="inherit" size="small">{t(`Add ${singular}`, `Ongeza ${singular}`)}</Button>}
            severity="info"
          >
            {t(
              `Setup progress: ${rooms.length} of ${expectedInventoryCount} ${plural} added. Add ${remainingSetupCount} more to match the number you gave during registration.`,
              `Maandalizi: ${rooms.length} kati ya ${expectedInventoryCount} ${plural} zimeongezwa. Ongeza ${remainingSetupCount} ili kufikia idadi uliyoweka wakati wa usajili.`,
            )}
          </Alert>
        ) : null}

        <Box sx={{ display: "grid", gap: { xs: 1.25, sm: 1.5 }, gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", lg: "repeat(4,minmax(0,1fr))" } }}>
          <MetricCell icon={<BedRoundedIcon />} label={t(`Total ${plural}`, `${plural} zote`)} value={summary?.totalRooms ?? 0} caption={t(`${summary?.activeRooms ?? 0} active`, `${summary?.activeRooms ?? 0} zinatumika`)} />
          <MetricCell icon={<CheckCircleRoundedIcon />} label={t("Ready to sell", "Tayari kuuzwa")} value={summary?.readyRooms ?? 0} tone="success" caption={t("Clean and available now", "Visafi na vinapatikana sasa")} />
          <MetricCell icon={<HotelRoundedIcon />} label={t("Occupied", "Zinatumika")} value={(summary?.occupiedRooms ?? 0) + (summary?.checkingOutTodayRooms ?? 0)} tone="info" caption={t(`${summary?.checkingOutTodayRooms ?? 0} due out today`, `${summary?.checkingOutTodayRooms ?? 0} wanatoka leo`)} />
          <MetricCell icon={<CleaningServicesRoundedIcon />} label={t("Needs attention", "Vinahitaji uangalizi")} value={attention} tone={attention ? "warning" : "success"} caption={t("Cleaning or service queue", "Foleni ya usafi au matengenezo")} />
        </Box>

        <Surface padding={false}>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={1.5}
            sx={{ alignItems: { lg: "center" }, justifyContent: "space-between", p: { xs: 1.5, sm: 2 } }}
          >
            <TextField
              aria-label={t(`Search ${plural}`, `Tafuta ${plural}`)}
              onChange={(event) => updateQuery(event.target.value)}
              placeholder={t(`Search ${singular}, guest, type or amenity`, `Tafuta ${singular}, mgeni, aina au huduma`)}
              size="small"
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> } }}
              sx={{ maxWidth: 420, width: "100%" }}
              value={query}
            />
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "flex-end", width: { xs: "100%", lg: "auto" } }}>
              {businessDate ? (
                <Typography color="text.secondary" sx={{ display: { xs: "none", sm: "block" }, whiteSpace: "nowrap" }} variant="caption">
                  {t("Property date", "Tarehe ya biashara")}: {formatLocalDate(businessDate)}
                </Typography>
              ) : null}
              <Tooltip title={t(`Refresh ${plural} board`, `Pakua upya ubao wa ${plural}`)}>
                <span>
                  <IconButton aria-label={t(`Refresh ${plural} board`, `Pakua upya ubao wa ${plural}`)} disabled={loading} onClick={() => void refresh()} size="small">
                    <RefreshRoundedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Stack>
          <Divider />
          <Box sx={{ overflowX: "auto", px: { xs: 1.5, sm: 2 }, py: 1.25 }}>
            <ToggleButtonGroup
              aria-label={t(`Filter ${plural} board`, `Chuja ubao wa ${plural}`)}
              exclusive
              onChange={(_, value: RoomFilter | null) => value && updateFilter(value)}
              size="small"
              sx={{ minWidth: "max-content" }}
              value={filter}
            >
              <ToggleButton value="all">{t("All", "Vyote")} · {filterCounts.get("all") ?? 0}</ToggleButton>
              <ToggleButton value="ready">{t("Ready", "Tayari")} · {filterCounts.get("ready") ?? 0}</ToggleButton>
              <ToggleButton value="occupied">{t("Occupied", "Vimekaliwa")} · {filterCounts.get("occupied") ?? 0}</ToggleButton>
              <ToggleButton value="checking_out_today">{t("Due out", "Wanatoka")} · {filterCounts.get("checking_out_today") ?? 0}</ToggleButton>
              <ToggleButton value="needs_cleaning">{t("Dirty", "Vichafu")} · {filterCounts.get("needs_cleaning") ?? 0}</ToggleButton>
              <ToggleButton value="cleaning">{t("Cleaning", "Usafi")} · {filterCounts.get("cleaning") ?? 0}</ToggleButton>
              <ToggleButton value="out_of_service">{t("Maintenance", "Matengenezo")} · {filterCounts.get("out_of_service") ?? 0}</ToggleButton>
              <ToggleButton value="inactive">{t("Inactive", "Vimezimwa")} · {filterCounts.get("inactive") ?? 0}</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Surface>

        {error ? (
          <Alert action={<Button color="inherit" onClick={() => void refresh()}>{t("Retry", "Jaribu tena")}</Button>} severity="error">{error}</Alert>
        ) : null}

        {dataLoading && !board ? (
          <Surface padding={false}><LoadingRows rows={7} /></Surface>
        ) : !rooms.length ? (
          <Surface padding={false}>
            <EmptyState
              actionHref={canAddInventory ? "/rooms/new" : undefined}
              actionLabel={canAddInventory ? t(`Add your first ${singular}`, `Ongeza ${singular} yako ya kwanza`) : undefined}
              description={t(`Add the rate, capacity and amenities for each bookable ${singular}.`, `Ongeza bei, uwezo na huduma za kila ${singular} inayoweza kuhifadhiwa.`)}
              icon={<BedRoundedIcon />}
              title={t(`Your ${singular} inventory is empty`, `Orodha ya ${plural} haina kitu`)}
            />
          </Surface>
        ) : !visibleRooms.length ? (
          <Surface padding={false}>
            <EmptyState description={t("Change the search or choose another operational status.", "Badili utafutaji au chagua hali nyingine ya uendeshaji.")} icon={<SearchRoundedIcon />} title={t(`No ${plural} match this view`, `Hakuna ${plural} zinazolingana`)} />
          </Surface>
        ) : (
          <Stack spacing={1.5}>
            {isDesktopLayout ? (
              <RoomTable
                canCreateBooking={canCreateBooking}
                canManageHousekeeping={canManageHousekeeping}
                canManageInventory={canManageInventory}
                onActive={updateActive}
                onHousekeeping={updateHousekeeping}
                pendingRoom={pendingRoom}
                rooms={pagedRooms}
              />
            ) : (
              <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" } }}>
              {pagedRooms.map((room) => (
                <RoomCard
                  canCreateBooking={canCreateBooking}
                  canManageHousekeeping={canManageHousekeeping}
                  canManageInventory={canManageInventory}
                  key={room.id}
                  onActive={updateActive}
                  onHousekeeping={updateHousekeeping}
                  pending={pendingRoom === room.id}
                  room={room}
                />
              ))}
              </Box>
            )}
            {visibleRooms.length > ROOM_PAGE_SIZE_OPTIONS[0] ? (
              <Surface padding={false}>
                <TablePagination
                  component="div"
                  count={visibleRooms.length}
                  labelDisplayedRows={({ from: first, to: last, count }) =>
                    t(`${first}–${last} of ${count} ${plural}`, `${first}–${last} kati ya ${plural} ${count}`)
                  }
                  labelRowsPerPage={t(`${plural} per page`, `${plural} kwa ukurasa`)}
                  onPageChange={(_, nextPage) => setPage(nextPage)}
                  onRowsPerPageChange={(event) => {
                    setRowsPerPage(Number(event.target.value));
                    setPage(0);
                  }}
                  page={safePage}
                  rowsPerPage={rowsPerPage}
                  rowsPerPageOptions={ROOM_PAGE_SIZE_OPTIONS}
                  sx={{
                    "& .MuiTablePagination-selectLabel": {
                      display: { xs: "none", sm: "block" },
                    },
                    "& .MuiTablePagination-spacer": {
                      display: { xs: "none", sm: "block" },
                    },
                    "& .MuiTablePagination-toolbar": {
                      px: { xs: 1, sm: 2 },
                    },
                  }}
                />
              </Surface>
            ) : null}
          </Stack>
        )}
      </Stack>
    </WorkspacePage>
  );
}

function RoomTable({
  canCreateBooking,
  canManageHousekeeping,
  canManageInventory,
  onActive,
  onHousekeeping,
  pendingRoom,
  rooms,
}: {
  canCreateBooking: boolean;
  canManageHousekeeping: boolean;
  canManageInventory: boolean;
  onActive: (room: RoomBoardItem, active: boolean) => Promise<void>;
  onHousekeeping: (room: RoomBoardItem, status: HousekeepingStatus) => Promise<void>;
  pendingRoom: string | null;
  rooms: RoomBoardItem[];
}) {
  const { t } = useLanguage();
  const definition = getInventoryDefinition(rooms[0]?.inventoryType);
  const singular = t(definition.inventorySingular[0], definition.inventorySingular[1]);
  const plural = t(definition.inventoryPlural[0], definition.inventoryPlural[1]);
  return (
    <Surface padding={false}>
      <Box sx={{ px: 2.5, py: 2 }}>
        <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>{t(`Today’s ${singular} plan`, `Mpango wa ${plural} wa leo`)}</Typography>
        <Typography color="text.secondary" variant="body2">{t(`Current stay, next arrival and readiness for every ${singular}.`, `Mgeni wa sasa, anayefuata na utayari wa kila ${singular}.`)}</Typography>
      </Box>
      <Table sx={{ tableLayout: "fixed" }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: "23%" }}>{t(definition.inventorySingular[0], definition.inventorySingular[1])}</TableCell>
            <TableCell sx={{ width: "21%" }}>{t("Today", "Leo")}</TableCell>
            <TableCell sx={{ width: "21%" }}>{t("Next arrival", "Anayewasili")}</TableCell>
            <TableCell sx={{ width: "16%" }}>{t("Status", "Hali")}</TableCell>
            <TableCell align="right" sx={{ width: "11%" }}>{t("Rate", "Bei")}</TableCell>
            <TableCell align="right" sx={{ width: 56 }}>
              <Box component="span" sx={{ clip: "rect(0 0 0 0)", clipPath: "inset(50%)", height: 1, overflow: "hidden", position: "absolute", whiteSpace: "nowrap", width: 1 }}>
                {t("Actions", "Vitendo")}
              </Box>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rooms.map((room) => (
            <TableRow hover key={room.id} sx={{ opacity: pendingRoom === room.id ? 0.55 : 1 }}>
              <TableCell>
                <Stack component={Link} href={`/rooms/${room.id}`} direction="row" spacing={1.25} sx={{ alignItems: "center", color: "inherit", minWidth: 0, textDecoration: "none" }}>
                  <RoomThumb />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap variant="body2" sx={{ fontWeight: 700 }}>{room.name}</Typography>
                    <Typography color="text.secondary" noWrap variant="caption" sx={{ textTransform: "capitalize" }}>{room.roomType} · {room.capacity} {t("guests", "wageni")} · {room.bedCount} {t("beds", "vitanda")}</Typography>
                  </Box>
                </Stack>
              </TableCell>
              <TableCell><StayCell stay={room.currentStay} empty={t("No guest in house", "Hakuna mgeni")} /></TableCell>
              <TableCell><StayCell stay={room.nextStay} empty={t("No upcoming stay", "Hakuna ukaaji ujao")} /></TableCell>
              <TableCell><RoomStatusPill status={room.operationalStatus} t={t} /></TableCell>
              <TableCell align="right">
                <Typography noWrap variant="body2" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{money.format(room.pricePerNight)}</Typography>
                <Typography color="text.secondary" variant="caption">/{t("night", "usiku")}</Typography>
              </TableCell>
              <TableCell align="right">
                <RoomActions canCreateBooking={canCreateBooking} canManageHousekeeping={canManageHousekeeping} canManageInventory={canManageInventory} disabled={Boolean(pendingRoom)} onActive={onActive} onHousekeeping={onHousekeeping} room={room} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Surface>
  );
}

function RoomCard({
  canCreateBooking,
  canManageHousekeeping,
  canManageInventory,
  onActive,
  onHousekeeping,
  pending,
  room,
}: {
  canCreateBooking: boolean;
  canManageHousekeeping: boolean;
  canManageInventory: boolean;
  onActive: (room: RoomBoardItem, active: boolean) => Promise<void>;
  onHousekeeping: (room: RoomBoardItem, status: HousekeepingStatus) => Promise<void>;
  pending: boolean;
  room: RoomBoardItem;
}) {
  const { t } = useLanguage();
  const definition = getInventoryDefinition(room.inventoryType);
  const singular = t(definition.inventorySingular[0], definition.inventorySingular[1]);
  const hasInlineBookingAction = canCreateBooking && room.operationalStatus === "ready";
  return (
    <Paper variant="outlined" sx={{ borderRadius: 1, minWidth: 0, opacity: pending ? 0.55 : 1, overflow: "hidden" }}>
      <Box component={Link} href={`/rooms/${room.id}`} sx={{ color: "inherit", display: "block", textDecoration: "none" }}>
        <Stack spacing={1.5} sx={{ p: 2 }}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <RoomStatusPill status={room.operationalStatus} t={t} />
            <Typography noWrap sx={{ fontSize: ".875rem", fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{money.format(room.pricePerNight)}</Typography>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography noWrap variant="subtitle1" sx={{ fontWeight: 700 }}>{room.name}</Typography>
              <Typography color="text.secondary" noWrap variant="caption" sx={{ textTransform: "capitalize" }}>{room.roomType} · {room.capacity} {t("guests", "wageni")} · {room.bedCount} {t("beds", "vitanda")}</Typography>
            </Box>
          </Stack>
          <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
            <StayMini label={t("In house", "Aliyepo")} stay={room.currentStay} />
            <StayMini label={t("Next", "Anayefuata")} stay={room.nextStay} />
          </Box>
        </Stack>
      </Box>
      <Divider />
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", px: 1.5, py: 1 }}>
        {hasInlineBookingAction ? (
          <Button component={Link} href={`/bookings/new?room=${room.id}`} size="small" startIcon={<CalendarMonthRoundedIcon />}>{t(`Book ${singular}`, `Hifadhi ${singular}`)}</Button>
        ) : <Box />}
        <RoomActions canCreateBooking={canCreateBooking} canManageHousekeeping={canManageHousekeeping} canManageInventory={canManageInventory} disabled={pending} hideCreateBooking={hasInlineBookingAction} onActive={onActive} onHousekeeping={onHousekeeping} room={room} />
      </Stack>
    </Paper>
  );
}

function RoomThumb() {
  return (
    <Box aria-hidden sx={{ bgcolor: "action.hover", borderRadius: 1.5, display: "grid", flexShrink: 0, height: 44, placeItems: "center", width: 52 }}>
      <BedRoundedIcon color="disabled" fontSize="small" />
    </Box>
  );
}

function StayCell({ stay, empty }: { stay: RoomStay | null; empty: string }) {
  if (!stay) return <Typography color="text.secondary" variant="caption">{empty}</Typography>;
  return (
    <Box component={Link} href={`/bookings/${stay.id}`} sx={{ color: "inherit", display: "block", minWidth: 0, textDecoration: "none" }}>
      <Typography noWrap variant="body2" sx={{ fontWeight: 500 }}>{stay.guestName}</Typography>
      <Typography color="text.secondary" noWrap variant="caption">{formatLocalDate(stay.checkIn, { day: "numeric", month: "short" })} – {formatLocalDate(stay.checkOut, { day: "numeric", month: "short" })}</Typography>
    </Box>
  );
}

function StayMini({ label, stay }: { label: string; stay: RoomStay | null }) {
  return (
    <Box sx={{ bgcolor: "action.hover", borderRadius: 2, minWidth: 0, p: 1.25 }}>
      <Typography color="text.secondary" variant="caption">{label}</Typography>
      <Typography noWrap variant="body2" sx={{ fontWeight: 500, mt: 0.25 }}>{stay?.guestName ?? "—"}</Typography>
      {stay ? <Typography color="text.secondary" noWrap variant="caption">{formatLocalDate(stay.checkOut, { day: "numeric", month: "short" })}</Typography> : null}
    </Box>
  );
}

function RoomActions({
  canCreateBooking,
  canManageHousekeeping,
  canManageInventory,
  disabled,
  hideCreateBooking = false,
  onActive,
  onHousekeeping,
  room,
}: {
  canCreateBooking: boolean;
  canManageHousekeeping: boolean;
  canManageInventory: boolean;
  disabled: boolean;
  hideCreateBooking?: boolean;
  onActive: (room: RoomBoardItem, active: boolean) => Promise<void>;
  onHousekeeping: (room: RoomBoardItem, status: HousekeepingStatus) => Promise<void>;
  room: RoomBoardItem;
}) {
  const { t } = useLanguage();
  const definition = getInventoryDefinition(room.inventoryType);
  const singular = t(definition.inventorySingular[0], definition.inventorySingular[1]);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <Tooltip title={t(`${singular} actions`, `Vitendo vya ${singular}`)}>
        <span><IconButton aria-label={t(`Actions for ${room.name}`, `Vitendo vya ${room.name}`)} disabled={disabled} onClick={(event) => setAnchor(event.currentTarget)} size="small"><MoreHorizRoundedIcon /></IconButton></span>
      </Tooltip>
      <Menu anchorEl={anchor} onClose={() => setAnchor(null)} open={Boolean(anchor)}>
        <MenuItem component={Link} href={`/rooms/${room.id}`} onClick={() => setAnchor(null)}>{t(`Open ${singular} workspace`, `Fungua eneo la ${singular}`)}</MenuItem>
        {canCreateBooking && room.isActive && !hideCreateBooking ? <MenuItem component={Link} href={`/bookings/new?room=${room.id}`} onClick={() => setAnchor(null)}>{t("Create booking", "Tengeneza uhifadhi")}</MenuItem> : null}
        {canManageInventory ? <MenuItem component={Link} href={`/rooms/${room.id}/edit`} onClick={() => setAnchor(null)}>{t(`Edit ${singular}`, `Hariri ${singular}`)}</MenuItem> : null}
        {canManageHousekeeping && room.isActive && !["occupied", "checking_out_today"].includes(room.operationalStatus)
          ? housekeepingOptions.map((option) => (
              <MenuItem
                disabled={room.housekeepingStatus === option.value}
                key={option.value}
                onClick={() => { setAnchor(null); void onHousekeeping(room, option.value); }}
              >
                {t(option.label, option.swahili)}
              </MenuItem>
            ))
          : null}
        {canManageInventory ? <Divider /> : null}
        {canManageInventory ? (
          <MenuItem onClick={() => { setAnchor(null); void onActive(room, !room.isActive); }}>
            {room.isActive ? t(`Deactivate ${singular}`, `Zima ${singular}`) : t(`Activate ${singular}`, `Washa ${singular}`)}
          </MenuItem>
        ) : null}
      </Menu>
    </>
  );
}
