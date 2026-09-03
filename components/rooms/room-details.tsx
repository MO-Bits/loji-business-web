"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CleaningServicesRoundedIcon from "@mui/icons-material/CleaningServicesRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SellRoundedIcon from "@mui/icons-material/SellRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, InlineLoading, SectionHeading, Surface, WorkspacePage } from "@/components/shared/workspace-ui";
import type { HousekeepingStatus, RoomStay, RoomWorkspace } from "@/features/rooms/models/room";
import { getRoomWorkspace, setRoomHousekeepingStatus } from "@/features/rooms/services/room-service";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { formatLocalDate, formatLocalDateTime } from "@/lib/date-time";
import { createClient } from "@/lib/supabase/client";
import { housekeepingOptions, RoomStatusPill } from "./room-status";
import { getInventoryDefinition } from "@/features/property/property-type";

const money = new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
});

export function RoomDetails({ roomId }: { roomId: string }) {
  const router = useRouter();
  const { t } = useLanguage();
  const feedback = useAppFeedback();
  const { session } = useAppSession();
  const client = useMemo(() => createClient(), []);
  const requestId = useRef(0);
  const activePropertyId = useRef<string | undefined>(undefined);
  const [workspaceState, setWorkspaceState] = useState<RoomWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorState, setErrorState] = useState<{ propertyId: string; message: string } | null>(null);
  const propertyId = session?.activePropertyId;
  const workspace = workspaceState && workspaceState.property.id === propertyId ? workspaceState : null;
  const error = errorState && errorState.propertyId === propertyId ? errorState.message : null;
  const dataLoading = loading || Boolean(workspaceState && workspaceState.property.id !== propertyId);

  useEffect(() => {
    activePropertyId.current = propertyId;
    return () => {
      activePropertyId.current = undefined;
    };
  }, [propertyId]);

  const refresh = useCallback(async (silent = false) => {
    if (!propertyId) {
      requestId.current += 1;
      setWorkspaceState(null);
      setLoading(false);
      return;
    }
    const requestPropertyId = propertyId;
    const current = ++requestId.current;
    if (!silent) setLoading(true);
    setErrorState(null);
    setWorkspaceState((existing) => existing?.property.id === requestPropertyId ? existing : null);
    try {
      const next = await getRoomWorkspace(client, requestPropertyId, roomId);
      if (current === requestId.current && activePropertyId.current === requestPropertyId) {
        setWorkspaceState(next);
      }
    } catch (cause) {
      if (current === requestId.current && activePropertyId.current === requestPropertyId) {
        setErrorState({
          propertyId: requestPropertyId,
          message: cause instanceof Error ? cause.message : t("Unable to load room.", "Imeshindikana kupakia chumba."),
        });
      }
    } finally {
      if (current === requestId.current && activePropertyId.current === requestPropertyId) setLoading(false);
    }
  }, [client, propertyId, roomId, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSaving(false);
      void refresh();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      requestId.current += 1;
    };
  }, [refresh]);

  if (dataLoading && !workspace) {
    return (
      <WorkspacePage sx={{ display: "grid", minHeight: "65dvh", placeItems: "center" }}>
        <InlineLoading label={t("Loading room workspace…", "Inapakia eneo la chumba…")} />
      </WorkspacePage>
    );
  }

  if (error || !workspace) {
    return (
      <WorkspacePage maxWidth={720}>
        <Stack spacing={2}>
          <Alert severity="error">{error ?? t("Room not found.", "Chumba hakijapatikana.")}</Alert>
          <Button onClick={() => router.push("/rooms")} startIcon={<ArrowBackRoundedIcon />} variant="outlined">{t("Back to rooms", "Rudi kwenye vyumba")}</Button>
        </Stack>
      </WorkspacePage>
    );
  }

  const room = workspace.room;
  const definition = getInventoryDefinition(room.inventoryType);
  const singular = t(definition.inventorySingular[0], definition.inventorySingular[1]);
  const plural = t(definition.inventoryPlural[0], definition.inventoryPlural[1]);
  // Once the workspace has loaded, the server projection is authoritative.
  // A stale client session must never re-enable an action the RPC denied.
  const canManageHousekeeping = workspace.capabilities.manageHousekeeping;
  const canManageInventory = workspace.capabilities.manageRooms;
  const canCreateBooking = workspace.capabilities.createBooking;

  const updateHousekeeping = async (status: HousekeepingStatus) => {
    if (!propertyId || saving) return;
    const actionPropertyId = propertyId;
    setSaving(true);
    try {
      await setRoomHousekeepingStatus(client, actionPropertyId, room.id, status);
      if (activePropertyId.current === actionPropertyId) {
        feedback.success(t("Housekeeping status updated.", "Hali ya usafi imebadilishwa."));
        await refresh(true);
      }
    } catch (cause) {
      if (activePropertyId.current === actionPropertyId) {
        feedback.error(cause instanceof Error ? cause.message : t("Unable to update room.", "Imeshindikana kubadili chumba."));
      }
    } finally {
      if (activePropertyId.current === actionPropertyId) setSaving(false);
    }
  };

  return (
    <WorkspacePage>
      <Stack spacing={{ xs: 2.25, sm: 3 }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
          <IconButton aria-label={t(`Back to ${plural}`, `Rudi kwenye ${plural}`)} onClick={() => router.push("/rooms")} sx={{ border: 1, borderColor: "divider", mt: 0.2 }}><ArrowBackRoundedIcon fontSize="small" /></IconButton>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <PageHeader
              eyebrow={t(definition.inventoryBoard[0], definition.inventoryBoard[1])}
              title={room.name}
              description={t(
                `${room.roomType} · ${room.capacity} guests · ${room.bedCount} ${room.bedCount === 1 ? "bed" : "beds"}`,
                `${room.roomType} · wageni ${room.capacity} · vitanda ${room.bedCount}`,
              )}
              action={(
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  {canCreateBooking && room.isActive ? <Button component={Link} href={`/bookings/new?room=${room.id}`} startIcon={<CalendarMonthRoundedIcon />} variant="contained" sx={{ display: { xs: "none", md: "inline-flex" } }}>{t("New booking", "Uhifadhi mpya")}</Button> : null}
                  {canManageInventory ? <Button component={Link} href={`/rooms/${room.id}/edit`} startIcon={<EditRoundedIcon />} variant="outlined">{t(`Edit ${singular}`, `Hariri ${singular}`)}</Button> : null}
                </Stack>
              )}
            />
          </Box>
        </Stack>

        <Box sx={{ alignItems: "start", display: "grid", gap: { xs: 2, lg: 3 }, gridTemplateColumns: { xs: "minmax(0,1fr)", lg: "minmax(0,1.45fr) minmax(300px,.75fr)" } }}>
          <Stack spacing={{ xs: 2, sm: 2.5 }}>
            <Surface>
              <SectionHeading
                eyebrow={t("Live operations", "Uendeshaji wa sasa")}
                title={t(`Today in this ${singular}`, `Leo katika ${singular} hii`)}
                description={t(`Property business date: ${formatLocalDate(workspace.property.businessDate)}`, `Tarehe ya biashara: ${formatLocalDate(workspace.property.businessDate)}`)}
                action={<RoomStatusPill status={room.operationalStatus} t={t} />}
              />
              <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" }, mt: 2.5 }}>
                <StayPanel label={t("Current stay", "Mgeni wa sasa")} stay={room.currentStay} empty={t("No guest currently checked in.", "Hakuna mgeni aliyeingia sasa.")} />
                <StayPanel label={t("Next confirmed stay", "Ukaaji unaofuata uliothibitishwa")} stay={room.nextStay} empty={t("No upcoming arrival assigned.", "Hakuna mgeni anayewasili aliyepangiwa.")} />
              </Box>
            </Surface>

            <Surface>
              <SectionHeading eyebrow={t("Reservation pipeline", "Mpangilio wa uhifadhi")} title={t("Upcoming stays", "Ukaaji ujao")} description={t(`The next confirmed stays assigned to this ${singular}.`, `Ukaaji ujao uliothibitishwa na kupangiwa ${singular} hii.`)} />
              <Stack divider={<Divider flexItem />} sx={{ mt: 1.5 }}>
                {workspace.upcomingStays.length ? workspace.upcomingStays.map((stay) => <UpcomingStay key={stay.id} stay={stay} />) : (
                  <EmptyState description={t("Future bookings assigned here will appear in date order.", "Uhifadhi ujao uliopangiwa hapa utaonekana kwa mpangilio wa tarehe.")} icon={<CalendarMonthRoundedIcon />} title={t("No upcoming stays", "Hakuna ukaaji ujao")} />
                )}
              </Stack>
            </Surface>

            <Surface>
              <SectionHeading eyebrow={t("Guest experience", "Uzoefu wa mgeni")} title={t("Amenities and description", "Huduma na maelezo")} />
              {room.description ? <Typography color="text.secondary" sx={{ lineHeight: 1.7, mt: 2, overflowWrap: "anywhere" }} variant="body2">{room.description}</Typography> : null}
              {room.amenities.length ? (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
                  {room.amenities.map((amenity) => <Chip key={amenity} label={amenity} variant="outlined" sx={{ maxWidth: "100%", "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" } }} />)}
                </Box>
              ) : <Typography color="text.secondary" sx={{ mt: 2 }} variant="body2">{t("No amenities listed.", "Hakuna huduma zilizoorodheshwa.")}</Typography>}
            </Surface>
          </Stack>

          <Stack spacing={{ xs: 2, sm: 2.5 }} sx={{ position: { lg: "sticky" }, top: { lg: 88 } }}>
            <Surface>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                <Box>
                  <Typography color="text.secondary" variant="overline">{t("Housekeeping", "Usafi")}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{t(`${singular} readiness`, `Utayari wa ${singular}`)}</Typography>
                </Box>
                <CleaningServicesRoundedIcon color="primary" />
              </Stack>
              <Box sx={{ bgcolor: "action.hover", borderRadius: 2.5, mt: 2, p: 2 }}>
                <RoomStatusPill status={room.operationalStatus} t={t} />
                <Typography color="text.secondary" sx={{ lineHeight: 1.55, mt: 1 }} variant="body2">{housekeepingDescription(room.housekeepingStatus, singular, t)}</Typography>
                {room.housekeepingNotes ? <Typography sx={{ mt: 1.25, overflowWrap: "anywhere" }} variant="body2">“{room.housekeepingNotes}”</Typography> : null}
                {room.housekeepingUpdatedAt ? <Typography color="text.secondary" sx={{ display: "block", mt: 1.25 }} variant="caption">{t("Updated", "Imesasishwa")} {formatLocalDateTime(room.housekeepingUpdatedAt)}</Typography> : null}
              </Box>
              {canManageHousekeeping && room.isActive && !room.currentStay ? <HousekeepingAction disabled={saving} onChange={updateHousekeeping} status={room.housekeepingStatus} /> : null}
            </Surface>

            <Surface>
              <SectionHeading title={t(`${singular} configuration`, `Mpangilio wa ${singular}`)} />
              <Stack divider={<Divider flexItem />} sx={{ mt: 1.25 }}>
                <InfoRow icon={<SellRoundedIcon />} label={t(`${singular} type`, `Aina ya ${singular}`)} value={room.roomType} />
                <InfoRow icon={<GroupRoundedIcon />} label={t("Guest capacity", "Uwezo wa wageni")} value={`${room.capacity}`} />
                <InfoRow icon={<BedRoundedIcon />} label={t("Beds", "Vitanda")} value={`${room.bedCount}`} />
                <InfoRow icon={<PaymentsRoundedIcon />} label={t("Nightly rate", "Bei kwa usiku")} value={money.format(room.pricePerNight)} />
                <InfoRow icon={<CheckCircleRoundedIcon />} label={t("Inventory", "Orodha")} value={room.isActive ? t("Active", "Kinatumika") : t("Inactive", "Kimezimwa")} />
              </Stack>
            </Surface>

            <Button onClick={() => void refresh()} startIcon={<RefreshRoundedIcon />} variant="text">{t(`Refresh ${singular} data`, `Pakua upya taarifa za ${singular}`)}</Button>
          </Stack>
        </Box>
      </Stack>
    </WorkspacePage>
  );
}

function StayPanel({ empty, label, stay }: { empty: string; label: string; stay: RoomStay | null }) {
  const { t } = useLanguage();

  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2.5, minHeight: 142, p: 2 }}>
      <Typography color="text.secondary" variant="caption" sx={{ fontWeight: 500 }}>{label}</Typography>
      {stay ? <Stack component={Link} href={`/bookings/${stay.id}`} spacing={0.5} sx={{ color: "inherit", minWidth: 0, mt: 1, textDecoration: "none" }}><Typography variant="subtitle1" sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>{stay.guestName}</Typography><Typography color="text.secondary" variant="body2" sx={{ overflowWrap: "anywhere" }}>{formatLocalDate(stay.checkIn)} – {formatLocalDate(stay.checkOut)}</Typography><Typography color="primary.main" variant="caption" sx={{ overflowWrap: "anywhere" }}>{t(`${stay.totalGuests} guests`)} · {stay.bookingNumber || t("Booking", "Uhifadhi")}</Typography></Stack> : <Typography color="text.secondary" sx={{ mt: 1 }} variant="body2">{empty}</Typography>}
    </Box>
  );
}

function UpcomingStay({ stay }: { stay: RoomStay }) {
  const { t } = useLanguage();

  return <Stack component={Link} href={`/bookings/${stay.id}`} direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" }, color: "inherit", justifyContent: "space-between", minWidth: 0, py: 1.5, textDecoration: "none" }}><Box sx={{ minWidth: 0 }}><Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>{stay.guestName}</Typography><Typography color="text.secondary" variant="caption" sx={{ overflowWrap: "anywhere" }}>{stay.bookingNumber || t("Booking", "Uhifadhi")} · {t(`${stay.totalGuests} guests`)}</Typography></Box><Typography variant="body2" sx={{ flexShrink: 0, fontVariantNumeric: "tabular-nums", fontWeight: 500, textAlign: { sm: "right" } }}>{formatLocalDate(stay.checkIn)} – {formatLocalDate(stay.checkOut)}</Typography></Stack>;
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0, py: 1.4 }}><Box sx={{ color: "primary.main", display: "grid", flexShrink: 0, placeItems: "center", "& .MuiSvgIcon-root": { fontSize: 19 } }}>{icon}</Box><Typography color="text.secondary" sx={{ flex: 1, minWidth: 0 }} variant="body2">{label}</Typography><Typography sx={{ fontWeight: 700, maxWidth: "52%", overflowWrap: "anywhere", textAlign: "right", textTransform: label.toLowerCase().includes("type") ? "capitalize" : "none" }} variant="body2">{value}</Typography></Stack>;
}

function HousekeepingAction({ disabled, onChange, status }: { disabled: boolean; onChange: (status: HousekeepingStatus) => Promise<void>; status: HousekeepingStatus }) {
  const { t } = useLanguage();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return <><Button disabled={disabled} fullWidth onClick={(event) => setAnchor(event.currentTarget)} sx={{ mt: 1.5 }} variant="outlined">{disabled ? t("Updating…", "Inabadilisha…") : t("Update housekeeping", "Badili hali ya usafi")}</Button><Menu anchorEl={anchor} onClose={() => setAnchor(null)} open={Boolean(anchor)}>{housekeepingOptions.map((option) => <MenuItem disabled={option.value === status} key={option.value} onClick={() => { setAnchor(null); void onChange(option.value); }}>{t(option.label, option.swahili)}</MenuItem>)}</Menu></>;
}

function housekeepingDescription(status: HousekeepingStatus, singular: string, t: (english: string, swahili: string) => string): string {
  if (status === "ready") return t(`Housekeeping has cleared this ${singular} for the next guest.`, `Usafi umethibitisha ${singular} hii kwa mgeni anayefuata.`);
  if (status === "needs_cleaning") return t(`This ${singular} is waiting to enter the cleaning queue.`, `${singular} hii inasubiri kuingia kwenye foleni ya usafi.`);
  if (status === "cleaning") return t(`Housekeeping is currently preparing this ${singular}.`, `Wahudumu wa usafi wanaandaa ${singular} hii sasa.`);
  return t(`The ${singular} is blocked from sale until service is restored.`, `${singular} imezuiwa kuuzwa hadi itakapotengenezwa.`);
}
