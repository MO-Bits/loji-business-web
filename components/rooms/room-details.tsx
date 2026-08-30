"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CleaningServicesRoundedIcon from "@mui/icons-material/CleaningServicesRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
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
  const [activeImage, setActiveImage] = useState(0);
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
  // Once the workspace has loaded, the server projection is authoritative.
  // A stale client session must never re-enable an action the RPC denied.
  const canManage = workspace.capabilities.manageRooms;
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
          <IconButton aria-label={t("Back to rooms", "Rudi kwenye vyumba")} onClick={() => router.push("/rooms")} sx={{ border: 1, borderColor: "divider", mt: 0.2 }}><ArrowBackRoundedIcon fontSize="small" /></IconButton>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <PageHeader
              eyebrow={t("Room workspace", "Eneo la chumba")}
              title={room.name}
              description={t(
                `${room.roomType} · ${room.capacity} guests · ${room.bedCount} ${room.bedCount === 1 ? "bed" : "beds"}`,
                `${room.roomType} · wageni ${room.capacity} · vitanda ${room.bedCount}`,
              )}
              action={(
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  {canCreateBooking && room.isActive ? <Button component={Link} href={`/bookings/new?room=${room.id}`} startIcon={<CalendarMonthRoundedIcon />} variant="contained">{t("New booking", "Nafasi mpya")}</Button> : null}
                  {canManage ? <Button component={Link} href={`/rooms/${room.id}/edit`} startIcon={<EditRoundedIcon />} variant="outlined">{t("Edit room", "Hariri chumba")}</Button> : null}
                </Stack>
              )}
            />
          </Box>
        </Stack>

        <RoomGallery activeImage={activeImage} images={room.images} name={room.name} onSelect={setActiveImage} />

        <Box sx={{ alignItems: "start", display: "grid", gap: { xs: 2, lg: 3 }, gridTemplateColumns: { xs: "minmax(0,1fr)", lg: "minmax(0,1.45fr) minmax(300px,.75fr)" } }}>
          <Stack spacing={{ xs: 2, sm: 2.5 }}>
            <Surface>
              <SectionHeading
                eyebrow={t("Live operations", "Uendeshaji wa sasa")}
                title={t("Today in this room", "Leo katika chumba hiki")}
                description={t(`Property business date: ${formatLocalDate(workspace.property.businessDate)}`, `Tarehe ya jengo: ${formatLocalDate(workspace.property.businessDate)}`)}
                action={<RoomStatusPill status={room.operationalStatus} t={t} />}
              />
              <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" }, mt: 2.5 }}>
                <StayPanel label={t("Current stay", "Mgeni wa sasa")} stay={room.currentStay} empty={t("No guest currently checked in.", "Hakuna mgeni aliyeingia sasa.")} />
                <StayPanel label={t("Next confirmed stay", "Nafasi inayofuata")} stay={room.nextStay} empty={t("No upcoming arrival assigned.", "Hakuna mgeni anayewasili aliyepangiwa.")} />
              </Box>
            </Surface>

            <Surface>
              <SectionHeading eyebrow={t("Reservation pipeline", "Mpangilio wa nafasi")} title={t("Upcoming stays", "Nafasi zijazo")} description={t("The next confirmed stays assigned to this room.", "Nafasi zinazofuata zilizothibitishwa kwa chumba hiki.")} />
              <Stack divider={<Divider flexItem />} sx={{ mt: 1.5 }}>
                {workspace.upcomingStays.length ? workspace.upcomingStays.map((stay) => <UpcomingStay key={stay.id} stay={stay} />) : (
                  <EmptyState description={t("Future bookings assigned here will appear in date order.", "Nafasi zijazo zitaonekana hapa kwa mpangilio wa tarehe.")} icon={<CalendarMonthRoundedIcon />} title={t("No upcoming stays", "Hakuna nafasi zijazo")} />
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
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{t("Room readiness", "Utayari wa chumba")}</Typography>
                </Box>
                <CleaningServicesRoundedIcon color="primary" />
              </Stack>
              <Box sx={{ bgcolor: "action.hover", borderRadius: 2.5, mt: 2, p: 2 }}>
                <RoomStatusPill status={room.operationalStatus} t={t} />
                <Typography color="text.secondary" sx={{ lineHeight: 1.55, mt: 1 }} variant="body2">{housekeepingDescription(room.housekeepingStatus, t)}</Typography>
                {room.housekeepingNotes ? <Typography sx={{ mt: 1.25, overflowWrap: "anywhere" }} variant="body2">“{room.housekeepingNotes}”</Typography> : null}
                {room.housekeepingUpdatedAt ? <Typography color="text.secondary" sx={{ display: "block", mt: 1.25 }} variant="caption">{t("Updated", "Imesasishwa")} {formatLocalDateTime(room.housekeepingUpdatedAt)}</Typography> : null}
              </Box>
              {canManage && room.isActive && !room.currentStay ? <HousekeepingAction disabled={saving} onChange={updateHousekeeping} status={room.housekeepingStatus} /> : null}
            </Surface>

            <Surface>
              <SectionHeading title={t("Room configuration", "Mpangilio wa chumba")} />
              <Stack divider={<Divider flexItem />} sx={{ mt: 1.25 }}>
                <InfoRow icon={<SellRoundedIcon />} label={t("Room type", "Aina ya chumba")} value={room.roomType} />
                <InfoRow icon={<GroupRoundedIcon />} label={t("Guest capacity", "Uwezo wa wageni")} value={`${room.capacity}`} />
                <InfoRow icon={<BedRoundedIcon />} label={t("Beds", "Vitanda")} value={`${room.bedCount}`} />
                <InfoRow icon={<PaymentsRoundedIcon />} label={t("Nightly rate", "Bei kwa usiku")} value={money.format(room.pricePerNight)} />
                <InfoRow icon={<CheckCircleRoundedIcon />} label={t("Inventory", "Orodha")} value={room.isActive ? t("Active", "Kinatumika") : t("Inactive", "Kimezimwa")} />
              </Stack>
            </Surface>

            <Button onClick={() => void refresh()} startIcon={<RefreshRoundedIcon />} variant="text">{t("Refresh room data", "Pakua upya taarifa za chumba")}</Button>
          </Stack>
        </Box>
      </Stack>
    </WorkspacePage>
  );
}

function RoomGallery({ activeImage, images, name, onSelect }: { activeImage: number; images: string[]; name: string; onSelect: (index: number) => void }) {
  const { t } = useLanguage();
  if (!images.length) return (
    <Surface sx={{ bgcolor: "action.hover", display: "grid", minHeight: { xs: 240, sm: 360 }, placeItems: "center" }}>
      <Stack spacing={1} sx={{ alignItems: "center", color: "text.secondary" }}><ImageRoundedIcon sx={{ fontSize: 42 }} /><Typography variant="body2">{t("No room photos yet", "Hakuna picha za chumba bado")}</Typography></Stack>
    </Surface>
  );
  const selected = Math.min(activeImage, images.length - 1);
  const desktopImages = [
    { index: selected, url: images[selected] },
    ...images.map((url, index) => ({ index, url })).filter((item) => item.index !== selected),
  ].slice(0, 5);
  return (
    <>
      <Box sx={{ display: { xs: "none", md: "grid" }, gap: 1, gridTemplateColumns: "2fr 1fr 1fr", gridTemplateRows: "repeat(2, minmax(150px, 220px))", overflow: "hidden", borderRadius: 3 }}>
        {desktopImages.map((item, position) => (
          <Box aria-label={t(`Show photo ${item.index + 1} as cover`, `Onyesha picha ${item.index + 1} kama kubwa`)} component="button" key={`${item.index}:${item.url}`} onClick={() => onSelect(item.index)} sx={{ appearance: "none", bgcolor: "action.hover", border: 0, cursor: "pointer", gridColumn: position === 0 ? "1" : "auto", gridRow: position === 0 ? "1 / span 2" : "auto", minHeight: 0, p: 0, position: "relative", "&:focus-visible": { outline: "3px solid", outlineColor: "primary.main", outlineOffset: -3 } }} type="button">
            <Image alt={position === 0 ? name : `${name} ${item.index + 1}`} fill priority={position === 0} sizes={position === 0 ? "60vw" : "25vw"} src={item.url} style={{ objectFit: "cover" }} />
            {position === 4 && images.length > 5 ? <Box sx={{ alignItems: "center", bgcolor: "rgba(0,0,0,.48)", color: "white", display: "flex", inset: 0, justifyContent: "center", position: "absolute" }}><Typography sx={{ fontWeight: 700 }}>+{images.length - 5} {t("photos", "picha")}</Typography></Box> : null}
          </Box>
        ))}
      </Box>
      <Surface padding={false} sx={{ display: { xs: "block", md: "none" } }}>
        <Box sx={{ aspectRatio: "16/10", position: "relative" }}><Image alt={name} fill priority sizes="100vw" src={images[selected]} style={{ objectFit: "cover" }} /></Box>
        {images.length > 1 ? <Stack direction="row" spacing={1} sx={{ overflowX: "auto", p: 1.25 }}>{images.map((url, index) => <Box aria-label={t(`View photo ${index + 1}`, `Tazama picha ${index + 1}`)} aria-pressed={selected === index} component="button" key={`${index}:${url}`} onClick={() => onSelect(index)} sx={{ appearance: "none", border: 2, borderColor: selected === index ? "primary.main" : "transparent", borderRadius: 1.5, flex: "0 0 70px", height: 52, overflow: "hidden", p: 0, position: "relative", "&:focus-visible": { outline: "3px solid", outlineColor: "primary.main", outlineOffset: 1 } }} type="button"><Image alt="" fill sizes="70px" src={url} style={{ objectFit: "cover" }} /></Box>)}</Stack> : null}
      </Surface>
    </>
  );
}

function StayPanel({ empty, label, stay }: { empty: string; label: string; stay: RoomStay | null }) {
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2.5, minHeight: 142, p: 2 }}>
      <Typography color="text.secondary" variant="caption" sx={{ fontWeight: 500 }}>{label}</Typography>
      {stay ? <Stack component={Link} href={`/bookings/${stay.id}`} spacing={0.5} sx={{ color: "inherit", minWidth: 0, mt: 1, textDecoration: "none" }}><Typography variant="subtitle1" sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>{stay.guestName}</Typography><Typography color="text.secondary" variant="body2" sx={{ overflowWrap: "anywhere" }}>{formatLocalDate(stay.checkIn)} – {formatLocalDate(stay.checkOut)}</Typography><Typography color="primary.main" variant="caption" sx={{ overflowWrap: "anywhere" }}>{stay.totalGuests} guests · {stay.bookingNumber || "Booking"}</Typography></Stack> : <Typography color="text.secondary" sx={{ mt: 1 }} variant="body2">{empty}</Typography>}
    </Box>
  );
}

function UpcomingStay({ stay }: { stay: RoomStay }) {
  return <Stack component={Link} href={`/bookings/${stay.id}`} direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" }, color: "inherit", justifyContent: "space-between", minWidth: 0, py: 1.5, textDecoration: "none" }}><Box sx={{ minWidth: 0 }}><Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>{stay.guestName}</Typography><Typography color="text.secondary" variant="caption" sx={{ overflowWrap: "anywhere" }}>{stay.bookingNumber || "Booking"} · {stay.totalGuests} guests</Typography></Box><Typography variant="body2" sx={{ flexShrink: 0, fontVariantNumeric: "tabular-nums", fontWeight: 500, textAlign: { sm: "right" } }}>{formatLocalDate(stay.checkIn)} – {formatLocalDate(stay.checkOut)}</Typography></Stack>;
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0, py: 1.4 }}><Box sx={{ color: "primary.main", display: "grid", flexShrink: 0, placeItems: "center", "& .MuiSvgIcon-root": { fontSize: 19 } }}>{icon}</Box><Typography color="text.secondary" sx={{ flex: 1, minWidth: 0 }} variant="body2">{label}</Typography><Typography sx={{ fontWeight: 700, maxWidth: "52%", overflowWrap: "anywhere", textAlign: "right", textTransform: label.toLowerCase().includes("type") ? "capitalize" : "none" }} variant="body2">{value}</Typography></Stack>;
}

function HousekeepingAction({ disabled, onChange, status }: { disabled: boolean; onChange: (status: HousekeepingStatus) => Promise<void>; status: HousekeepingStatus }) {
  const { t } = useLanguage();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return <><Button disabled={disabled} fullWidth onClick={(event) => setAnchor(event.currentTarget)} sx={{ mt: 1.5 }} variant="outlined">{disabled ? t("Updating…", "Inabadilisha…") : t("Update housekeeping", "Badili hali ya usafi")}</Button><Menu anchorEl={anchor} onClose={() => setAnchor(null)} open={Boolean(anchor)}>{housekeepingOptions.map((option) => <MenuItem disabled={option.value === status} key={option.value} onClick={() => { setAnchor(null); void onChange(option.value); }}>{t(option.label, option.swahili)}</MenuItem>)}</Menu></>;
}

function housekeepingDescription(status: HousekeepingStatus, t: (english: string, swahili: string) => string): string {
  if (status === "ready") return t("Housekeeping has cleared this room for the next guest.", "Usafi umethibitisha chumba hiki kwa mgeni anayefuata.");
  if (status === "needs_cleaning") return t("This room is waiting to enter the cleaning queue.", "Chumba hiki kinasubiri kuingia kwenye foleni ya usafi.");
  if (status === "cleaning") return t("Housekeeping is currently preparing this room.", "Wahudumu wa usafi wanaandaa chumba hiki sasa.");
  return t("The room is blocked from sale until service is restored.", "Chumba kimezuiwa kuuzwa hadi kitakapotengenezwa.");
}
