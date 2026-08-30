"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CallOutlinedIcon from "@mui/icons-material/CallOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DirectionsRoundedIcon from "@mui/icons-material/DirectionsRounded";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import EmergencyOutlinedIcon from "@mui/icons-material/EmergencyOutlined";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import NightsStayRoundedIcon from "@mui/icons-material/NightsStayRounded";
import NotesRoundedIcon from "@mui/icons-material/NotesRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";

import { useLanguage } from "@/components/providers/language-provider";
import {
  EmptyState,
  MetricCell,
  SectionHeading,
  StickyMobileActionBar,
  Surface,
  WorkspacePage,
} from "@/components/shared/workspace-ui";
import { useGuestWorkspace } from "@/features/guests/hooks/use-guest-workspace";
import type {
  GuestActivity,
  GuestCommercial,
  GuestProfile,
  GuestStay,
  GuestWorkspace,
} from "@/features/guests/models/guest";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { formatLocalDate, formatLocalDateTime } from "@/lib/date-time";

import { GuestAvatar, GuestStatusChip, StayStatusChip } from "./guest-shared";

const money = new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
});

export function GuestDetailsScreen({ guestId }: { guestId: string }) {
  const router = useRouter();
  const { t } = useLanguage();
  const {
    session,
    loading: sessionLoading,
    error: sessionError,
  } = useAppSession();
  const propertyId = session?.activePropertyId;
  const {
    workspace: loadedWorkspace,
    loading,
    error,
    refresh,
  } = useGuestWorkspace(
    propertyId,
    guestId,
  );
  const workspace =
    loadedWorkspace &&
    loadedWorkspace.propertyId === propertyId &&
    loadedWorkspace.guest.id === guestId
      ? loadedWorkspace
      : null;

  if (sessionLoading || (!workspace && loading)) return <GuestDetailsLoading />;

  if (sessionError || !propertyId) {
    return (
      <GuestDetailsError
        message={
          sessionError?.message ??
          t(
            "Select an active property to open this guest.",
            "Chagua mali inayotumika ili kufungua mgeni huyu.",
          )
        }
        onBack={() => router.push("/guests")}
      />
    );
  }

  if (!workspace) {
    return (
      <GuestDetailsError
        message={
          error?.message ??
          t("This guest could not be found.", "Mgeni huyu hakupatikana.")
        }
        onBack={() => router.push("/guests")}
        onRetry={() => void refresh()}
      />
    );
  }

  const bookingHref = `/bookings/new?guest=${encodeURIComponent(workspace.guest.id)}`;
  const canCreateBooking = workspace.capabilities.createBooking;

  return (
    <Box sx={{ minHeight: "100dvh", pb: { xs: canCreateBooking ? 12 : 3, md: 0 } }}>
      <WorkspacePage>
        <Stack spacing={{ xs: 2, lg: 2.5 }}>
          <GuestHeader
            bookingHref={bookingHref}
            onBack={() => router.push("/guests")}
            workspace={workspace}
          />

          {error ? (
            <Alert
              severity="warning"
              action={
                <Button color="inherit" onClick={() => void refresh()}>
                  {t("Retry", "Jaribu tena")}
                </Button>
              }
            >
              {error.message}
            </Alert>
          ) : null}

          <GuestMetrics workspace={workspace} />

          <Box
            sx={{
              alignItems: "start",
              display: "grid",
              gap: { xs: 2, lg: 2.5 },
              gridTemplateColumns: {
                xs: "minmax(0,1fr)",
                lg: "minmax(0,1.55fr) minmax(310px,.75fr)",
              },
            }}
          >
            <Stack spacing={{ xs: 2, lg: 2.5 }} sx={{ minWidth: 0 }}>
              <CurrentStaySection stays={workspace.stays.current} />
              <StaySection
                description={t(
                  "Confirmed stays scheduled after today.",
                  "Ukaaji uliothibitishwa uliopangwa baada ya leo.",
                )}
                emptyDescription={t(
                  "There are no upcoming stays on this profile.",
                  "Hakuna ukaaji ujao kwenye wasifu huu.",
                )}
                emptyTitle={t("No upcoming stays", "Hakuna ukaaji ujao")}
                icon={<EventAvailableRoundedIcon />}
                stays={workspace.stays.upcoming}
                title={t("Upcoming stays", "Ukaaji ujao")}
              />
              <StaySection
                description={t(
                  `The latest ${workspace.stays.pastLimit} completed or closed stays.`,
                  `Ukaaji ${workspace.stays.pastLimit} wa hivi karibuni uliokamilika au kufungwa.`,
                )}
                emptyDescription={t(
                  "Completed stays will appear here.",
                  "Ukaaji uliokamilika utaonekana hapa.",
                )}
                emptyTitle={t("No stay history yet", "Bado hakuna historia ya ukaaji")}
                icon={<HistoryRoundedIcon />}
                stays={workspace.stays.past}
                title={t("Stay history", "Historia ya ukaaji")}
              />
              <GuestActivitySection activity={workspace.activity} />
            </Stack>

            <Stack
              spacing={{ xs: 2, lg: 2.5 }}
              sx={{ minWidth: 0, position: { lg: "sticky" }, top: { lg: 24 } }}
            >
              <GuestProfilePanel guest={workspace.guest} />
              {workspace.capabilities.viewFinance ? (
                <CommercialPanel commercial={workspace.commercial} />
              ) : null}
              <TravelIdentityPanel guest={workspace.guest} />
              {workspace.guest.notes ? <GuestNotes notes={workspace.guest.notes} /> : null}
            </Stack>
          </Box>
        </Stack>
      </WorkspacePage>

      {canCreateBooking ? (
        <StickyMobileActionBar>
          <Button
            component={Link}
            fullWidth
            href={bookingHref}
            startIcon={<AddRoundedIcon />}
            variant="contained"
          >
            {t("New booking for guest", "Uhifadhi mpya kwa mgeni")}
          </Button>
        </StickyMobileActionBar>
      ) : null}
    </Box>
  );
}

function GuestHeader({
  bookingHref,
  onBack,
  workspace,
}: {
  bookingHref: string;
  onBack: () => void;
  workspace: GuestWorkspace;
}) {
  const { t } = useLanguage();
  const { guest, summary } = workspace;
  const relationshipStatus = summary.isInHouse
    ? "in_house"
    : summary.nextStayDate
      ? "upcoming"
      : summary.totalStays > 1
        ? "returning"
        : "past";

  return (
    <Surface sx={{ p: { xs: 2, sm: 2.5, lg: 3 } }}>
      <Stack spacing={{ xs: 2, sm: 2.5 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 2, md: 3 }}
          sx={{ alignItems: { md: "flex-start" }, justifyContent: "space-between" }}
        >
          <Stack direction="row" spacing={{ xs: 1.25, sm: 1.75 }} sx={{ minWidth: 0 }}>
            <IconButton
              aria-label={t("Back to guests", "Rudi kwa wageni")}
              onClick={onBack}
              sx={{ alignSelf: "flex-start", border: "1px solid", borderColor: "divider" }}
            >
              <ArrowBackRoundedIcon fontSize="small" />
            </IconButton>
            <GuestAvatar name={guest.name} size={64} />
            <Box sx={{ minWidth: 0 }}>
              <Typography color="primary.main" variant="overline">
                {t("Guest profile", "Wasifu wa mgeni")}
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.75 }}
              >
                <Typography
                  component="h1"
                  sx={{
                    fontSize: { xs: "1.35rem", sm: "1.75rem" },
                    fontWeight: 700,
                    letterSpacing: "-.035em",
                    lineHeight: 1.15,
                  }}
                >
                  {guest.name}
                </Typography>
                <GuestStatusChip status={relationshipStatus} />
              </Stack>
              <Typography color="text.secondary" sx={{ mt: 0.6 }} variant="body2">
                {guest.nationality || t("Nationality not recorded", "Uraia haujaandikwa")}
                {guest.occupation ? ` · ${guest.occupation}` : ""}
              </Typography>
            </Box>
          </Stack>

          <Stack
            direction={{ xs: "row", sm: "row" }}
            spacing={1}
            sx={{ flexWrap: "wrap", width: { xs: "100%", md: "auto" } }}
          >
            {guest.phone ? (
              <Tooltip title={t("Call guest", "Mpigie mgeni")}>
                <IconButton
                  aria-label={t("Call guest", "Mpigie mgeni")}
                  component="a"
                  href={`tel:${guest.phone}`}
                  sx={{ border: "1px solid", borderColor: "divider" }}
                >
                  <CallOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null}
            {guest.email ? (
              <Tooltip title={t("Email guest", "Mtumie mgeni barua pepe")}>
                <IconButton
                  aria-label={t("Email guest", "Mtumie mgeni barua pepe")}
                  component="a"
                  href={`mailto:${guest.email}`}
                  sx={{ border: "1px solid", borderColor: "divider" }}
                >
                  <EmailOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null}
            {workspace.capabilities.updateGuest ? (
              <Button
                component={Link}
                href={`/guests/${encodeURIComponent(guest.id)}/edit`}
                startIcon={<EditRoundedIcon />}
                variant="outlined"
              >
                {t("Edit", "Hariri")}
              </Button>
            ) : null}
            {workspace.capabilities.createBooking ? (
              <Button
                component={Link}
                href={bookingHref}
                startIcon={<AddRoundedIcon />}
                variant="contained"
                sx={{ display: { xs: "none", md: "inline-flex" } }}
              >
                {t("New booking", "Uhifadhi mpya")}
              </Button>
            ) : null}
          </Stack>
        </Stack>

        <Divider />
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 0.75, sm: 2 }}
          sx={{ color: "text.secondary" }}
        >
          <HeaderContact icon={<CallOutlinedIcon />} value={guest.phone} fallback={t("No phone recorded", "Hakuna simu iliyohifadhiwa")} />
          <HeaderContact icon={<EmailOutlinedIcon />} value={guest.email} fallback={t("No email recorded", "Hakuna barua pepe iliyohifadhiwa")} />
          <Typography sx={{ fontSize: ".75rem", textTransform: "capitalize" }}>
            {t("Access", "Ufikiaji")}: {workspace.role}
          </Typography>
        </Stack>
      </Stack>
    </Surface>
  );
}

function HeaderContact({ icon, value, fallback }: { icon: ReactNode; value: string; fallback: string }) {
  return (
    <Stack direction="row" spacing={0.6} sx={{ alignItems: "center", minWidth: 0 }}>
      <Box sx={{ display: "inline-flex", "& .MuiSvgIcon-root": { fontSize: 15 } }}>{icon}</Box>
      <Typography noWrap sx={{ fontSize: ".75rem" }}>{value || fallback}</Typography>
    </Stack>
  );
}

function GuestMetrics({ workspace }: { workspace: GuestWorkspace }) {
  const { t } = useLanguage();
  return (
    <Box
      sx={{
        display: "grid",
        gap: { xs: 1.25, sm: 1.5 },
        gridTemplateColumns: {
          xs: "repeat(2,minmax(0,1fr))",
          lg: "repeat(4,minmax(0,1fr))",
        },
      }}
    >
      <MetricCell
        caption={t("Across this property", "Katika mali hii")}
        icon={<HotelRoundedIcon />}
        label={t("Total stays", "Jumla ya ukaaji")}
        tone="info"
        value={workspace.summary.totalStays}
      />
      <MetricCell
        caption={t("Recorded room nights", "Usiku wa vyumba uliorekodiwa")}
        icon={<NightsStayRoundedIcon />}
        label={t("Total nights", "Jumla ya usiku")}
        tone="neutral"
        value={workspace.summary.totalNights}
      />
      <MetricCell
        caption={workspace.summary.lastStayDate ? t("Most recent departure", "Kuondoka kwa hivi karibuni") : t("No completed stay", "Hakuna ukaaji uliokamilika")}
        icon={<HistoryRoundedIcon />}
        label={t("Last stay", "Ukaaji uliopita")}
        tone="neutral"
        value={formatLocalDate(workspace.summary.lastStayDate, { day: "numeric", month: "short", year: "numeric" })}
      />
      <MetricCell
        caption={workspace.summary.isInHouse ? t("Guest is currently in house", "Mgeni yupo ndani sasa") : t("Next scheduled arrival", "Kuwasili kunakofuata")}
        icon={<CalendarMonthRoundedIcon />}
        label={workspace.summary.isInHouse ? t("Current status", "Hali ya sasa") : t("Next stay", "Ukaaji ujao")}
        tone={workspace.summary.isInHouse ? "success" : "info"}
        value={workspace.summary.isInHouse ? t("In house", "Yupo ndani") : formatLocalDate(workspace.summary.nextStayDate, { day: "numeric", month: "short", year: "numeric" })}
      />
    </Box>
  );
}

function CurrentStaySection({ stays }: { stays: GuestStay[] }) {
  const { t } = useLanguage();
  return (
    <Surface padding={false}>
      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
        <SectionHeading
          description={t("Live room and departure context for front-desk work.", "Taarifa za chumba na kuondoka kwa kazi za mapokezi.")}
          eyebrow={t("Now", "Sasa")}
          title={t("Current stay", "Ukaaji wa sasa")}
        />
      </Box>
      <Divider />
      {stays.length ? (
        <Stack divider={<Divider flexItem />}>
          {stays.map((stay) => <CurrentStayCard key={stay.id} stay={stay} />)}
        </Stack>
      ) : (
        <CompactEmpty
          description={t("This guest is not currently checked in.", "Mgeni huyu hajaingia kwa sasa.")}
          icon={<BedRoundedIcon />}
          title={t("No active stay", "Hakuna ukaaji unaoendelea")}
        />
      )}
    </Surface>
  );
}

function CurrentStayCard({ stay }: { stay: GuestStay }) {
  const { t } = useLanguage();
  return (
    <Box
      component={Link}
      href={`/bookings/${stay.id}`}
      sx={{
        bgcolor: "color-mix(in srgb, var(--mui-palette-primary-main) 5%, transparent)",
        color: "inherit",
        display: "block",
        p: { xs: 2, sm: 2.5 },
        textDecoration: "none",
        transition: "background-color 160ms ease",
        "&:hover": { bgcolor: "color-mix(in srgb, var(--mui-palette-primary-main) 9%, transparent)" },
        "&:focus-visible": { outline: "3px solid", outlineColor: "primary.main", outlineOffset: -3 },
      }}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "space-between" }}>
        <Stack direction="row" spacing={1.25} sx={{ minWidth: 0 }}>
          <Box sx={{ bgcolor: "primary.main", borderRadius: 2, color: "primary.contrastText", display: "grid", flexShrink: 0, height: 42, placeItems: "center", width: 42 }}>
            <HotelRoundedIcon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.75 }}>
              <Typography sx={{ fontWeight: 700 }}>{stay.roomName}</Typography>
              <StayStatusChip status={stay.status} />
            </Stack>
            <Typography color="text.secondary" sx={{ mt: 0.4 }} variant="body2">
              {[stay.roomType, stay.bookingNumber].filter(Boolean).join(" · ")}
            </Typography>
          </Box>
        </Stack>
        <Box sx={{ flexShrink: 0, textAlign: { sm: "right" } }}>
          <Typography sx={{ fontWeight: 700 }} variant="body2">
            {formatLocalDate(stay.checkIn)} – {formatLocalDate(stay.checkOut)}
          </Typography>
          <Typography color="text.secondary" variant="caption">
            {t("Departure", "Kuondoka")} {formatLocalDate(stay.checkOut, { weekday: "short", day: "numeric", month: "short" })}
          </Typography>
        </Box>
      </Stack>
      {stay.settlement ? (
        <Stack direction="row" spacing={2} sx={{ borderTop: "1px solid", borderColor: "divider", flexWrap: "wrap", mt: 2, pt: 1.5 }}>
          <InlineValue label={t("Stay total", "Jumla ya ukaaji")} value={money.format(stay.settlement.total)} />
          <InlineValue label={t("Collected", "Iliyokusanywa")} value={money.format(stay.settlement.paid)} />
          <InlineValue label={t("Balance", "Salio")} value={money.format(stay.settlement.balance)} warning={stay.settlement.balance > 0} />
        </Stack>
      ) : null}
    </Box>
  );
}

function StaySection({
  description,
  emptyDescription,
  emptyTitle,
  icon,
  stays,
  title,
}: {
  description: string;
  emptyDescription: string;
  emptyTitle: string;
  icon: ReactNode;
  stays: GuestStay[];
  title: string;
}) {
  const showFinance = stays.some((stay) => Boolean(stay.settlement));
  return (
    <Surface padding={false}>
      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
        <SectionHeading description={description} title={title} />
      </Box>
      <Divider />
      {stays.length ? (
        <>
          <StayTableHeader showFinance={showFinance} />
          <Stack divider={<Divider flexItem />}>
            {stays.map((stay) => (
              <StayRow key={stay.id} showFinance={showFinance} stay={stay} />
            ))}
          </Stack>
        </>
      ) : (
        <CompactEmpty description={emptyDescription} icon={icon} title={emptyTitle} />
      )}
    </Surface>
  );
}

function StayTableHeader({ showFinance }: { showFinance: boolean }) {
  const { t } = useLanguage();
  return (
    <Box
      aria-hidden
      sx={{
        bgcolor: "background.default",
        display: { xs: "none", md: "grid" },
        gap: 1.5,
        gridTemplateColumns: showFinance
          ? "minmax(180px,1.1fr) minmax(190px,1fr) minmax(120px,.65fr) 36px"
          : "minmax(200px,1.2fr) minmax(210px,1fr) 36px",
        px: 2.5,
        py: 1.1,
      }}
    >
      <TableLabel>{t("Reservation", "Uhifadhi")}</TableLabel>
      <TableLabel>{t("Stay", "Ukaaji")}</TableLabel>
      {showFinance ? <TableLabel>{t("Settlement", "Malipo")}</TableLabel> : null}
      <span />
    </Box>
  );
}

function TableLabel({ children }: { children: ReactNode }) {
  return <Typography color="text.secondary" sx={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".065em", textTransform: "uppercase" }}>{children}</Typography>;
}

function StayRow({ stay, showFinance }: { stay: GuestStay; showFinance: boolean }) {
  const { t } = useLanguage();
  return (
    <Box
      component={Link}
      href={`/bookings/${stay.id}`}
      sx={{
        alignItems: { md: "center" },
        color: "inherit",
        display: { xs: "flex", md: "grid" },
        flexDirection: "column",
        gap: { xs: 1.25, md: 1.5 },
        gridTemplateColumns: showFinance
          ? "minmax(180px,1.1fr) minmax(190px,1fr) minmax(120px,.65fr) 36px"
          : "minmax(200px,1.2fr) minmax(210px,1fr) 36px",
        p: { xs: 2, md: 2.5 },
        textDecoration: "none",
        "&:hover": { bgcolor: "action.hover" },
        "&:focus-visible": { outline: "3px solid", outlineColor: "primary.main", outlineOffset: -3 },
      }}
    >
      <Box sx={{ minWidth: 0, width: "100%" }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.75 }}>
          <Typography noWrap sx={{ fontWeight: 700 }}>{stay.bookingNumber || t("Reservation", "Uhifadhi")}</Typography>
          <StayStatusChip status={stay.status} />
        </Stack>
        <Typography color="text.secondary" noWrap sx={{ mt: 0.35 }} variant="caption">
          {[stay.roomName, stay.roomType].filter(Boolean).join(" · ")}
        </Typography>
      </Box>
      <Box sx={{ minWidth: 0, width: "100%" }}>
        <Typography sx={{ fontWeight: 500 }} variant="body2">
          {formatLocalDate(stay.checkIn)} – {formatLocalDate(stay.checkOut)}
        </Typography>
        <Typography color="text.secondary" variant="caption">
          {[stay.guests ? t(`${stay.guests} guest${stay.guests === 1 ? "" : "s"}`, `Wageni ${stay.guests}`) : "", stay.source].filter(Boolean).join(" · ")}
        </Typography>
      </Box>
      {showFinance ? (
        <Box sx={{ minWidth: 0, width: "100%" }}>
          <Typography sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }} variant="body2">
            {stay.settlement ? money.format(stay.settlement.total) : "—"}
          </Typography>
          {stay.settlement ? (
            <Typography color={stay.settlement.balance > 0 ? "warning.main" : "text.secondary"} variant="caption">
              {stay.settlement.balance > 0
                ? `${t("Balance", "Salio")} ${money.format(stay.settlement.balance)}`
                : t("Settled", "Imelipwa")}
            </Typography>
          ) : null}
        </Box>
      ) : null}
      <ArrowForwardRoundedIcon color="action" fontSize="small" sx={{ alignSelf: { xs: "flex-end", md: "center" }, display: { xs: "none", md: "block" } }} />
    </Box>
  );
}

function GuestActivitySection({ activity }: { activity: GuestActivity[] }) {
  const { t } = useLanguage();
  return (
    <Surface padding={false}>
      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
        <SectionHeading
          description={t("A chronological record of the guest relationship.", "Rekodi ya matukio ya uhusiano na mgeni.")}
          title={t("Activity", "Shughuli")}
        />
      </Box>
      <Divider />
      {activity.length ? (
        <Stack component="ol" divider={<Divider flexItem />} sx={{ listStyle: "none", m: 0, p: 0 }}>
          {activity.map((event) => <ActivityItem event={event} key={event.id} />)}
        </Stack>
      ) : (
        <CompactEmpty
          description={t("Guest and stay events will be recorded here.", "Matukio ya mgeni na ukaaji yatarekodiwa hapa.")}
          icon={<TimelineRoundedIcon />}
          title={t("No activity recorded", "Hakuna shughuli iliyorekodiwa")}
        />
      )}
    </Surface>
  );
}

function ActivityItem({ event }: { event: GuestActivity }) {
  const { t } = useLanguage();
  return (
    <Stack component="li" direction="row" spacing={1.5} sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Box sx={{ bgcolor: activityTone(event.type), borderRadius: 2, color: activityColor(event.type), display: "grid", flexShrink: 0, height: 36, placeItems: "center", width: 36 }}>
        {activityIcon(event.type)}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700 }} variant="body2">
          {event.summary || humanize(event.type) || t("Guest activity", "Shughuli ya mgeni")}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.3 }} variant="caption">
          {[formatLocalDateTime(event.at), event.actorName ? `${t("by", "na")} ${event.actorName}` : ""].filter(Boolean).join(" · ")}
        </Typography>
      </Box>
    </Stack>
  );
}

function activityIcon(type: string): ReactNode {
  const value = type.toLowerCase();
  if (value.includes("check_in")) return <HotelRoundedIcon fontSize="small" />;
  if (value.includes("check_out")) return <CheckCircleRoundedIcon fontSize="small" />;
  if (value.includes("payment")) return <AccountBalanceWalletRoundedIcon fontSize="small" />;
  if (value.includes("book")) return <CalendarMonthRoundedIcon fontSize="small" />;
  return <TimelineRoundedIcon fontSize="small" />;
}

function activityTone(type: string): string {
  const value = type.toLowerCase();
  if (value.includes("check_in") || value.includes("check_out")) return "color-mix(in srgb, var(--mui-palette-success-main) 12%, transparent)";
  if (value.includes("payment")) return "color-mix(in srgb, var(--mui-palette-warning-main) 14%, transparent)";
  return "color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent)";
}

function activityColor(type: string): string {
  const value = type.toLowerCase();
  if (value.includes("check_in") || value.includes("check_out")) return "success.main";
  if (value.includes("payment")) return "warning.main";
  return "primary.main";
}

function GuestProfilePanel({ guest }: { guest: GuestProfile }) {
  const { t } = useLanguage();
  return (
    <Surface>
      <SectionHeading
        description={t("Contact and personal information.", "Mawasiliano na taarifa binafsi.")}
        title={t("Guest details", "Taarifa za mgeni")}
      />
      <Stack divider={<Divider flexItem />} sx={{ mt: 2 }}>
        <DetailRow icon={<CallOutlinedIcon />} label={t("Phone", "Simu")} value={guest.phone} href={guest.phone ? `tel:${guest.phone}` : undefined} />
        <DetailRow icon={<EmailOutlinedIcon />} label={t("Email", "Barua pepe")} value={guest.email} href={guest.email ? `mailto:${guest.email}` : undefined} />
        <DetailRow icon={<PublicRoundedIcon />} label={t("Nationality", "Uraia")} value={guest.nationality} />
        <DetailRow icon={<PersonOutlineRoundedIcon />} label={t("Gender", "Jinsia")} value={humanize(guest.gender)} />
        <DetailRow label={t("Date of birth", "Tarehe ya kuzaliwa")} value={guest.dateOfBirth ? formatLocalDate(guest.dateOfBirth) : ""} />
        <DetailRow label={t("Occupation", "Kazi")} value={guest.occupation} />
        <DetailRow label={t("Address", "Anwani")} value={guest.address} multiline />
      </Stack>
      {guest.createdAt ? (
        <Typography color="text.secondary" sx={{ display: "block", mt: 1.5 }} variant="caption">
          {t("Profile created", "Wasifu uliundwa")} {formatLocalDateTime(guest.createdAt)}
        </Typography>
      ) : null}
    </Surface>
  );
}

function TravelIdentityPanel({ guest }: { guest: GuestProfile }) {
  const { t } = useLanguage();
  const hasEmergency = Boolean(guest.emergencyContactName || guest.emergencyContactPhone);
  return (
    <Surface>
      <SectionHeading title={t("Travel & identity", "Safari na utambulisho")} />
      <Stack divider={<Divider flexItem />} sx={{ mt: 2 }}>
        <DetailRow icon={<DirectionsRoundedIcon />} label={t("Coming from", "Anakotoka")} value={guest.whereFrom} />
        <DetailRow icon={<DirectionsRoundedIcon />} label={t("Going to", "Anakoenda")} value={guest.whereTo} />
        <DetailRow icon={<BadgeOutlinedIcon />} label={t("ID type", "Aina ya kitambulisho")} value={humanize(guest.idType)} />
        <DetailRow label={t("ID number", "Namba ya kitambulisho")} value={guest.idNumber} />
      </Stack>
      {hasEmergency ? (
        <Box sx={{ bgcolor: "color-mix(in srgb, var(--mui-palette-error-main) 6%, transparent)", borderRadius: 2, mt: 2, p: 1.5 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
            <EmergencyOutlinedIcon color="error" fontSize="small" />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700 }} variant="caption">{t("Emergency contact", "Mawasiliano ya dharura")}</Typography>
              <Typography sx={{ overflowWrap: "anywhere" }} variant="body2">
                {[guest.emergencyContactName, guest.emergencyContactPhone].filter(Boolean).join(" · ")}
              </Typography>
            </Box>
          </Stack>
        </Box>
      ) : null}
    </Surface>
  );
}

function DetailRow({
  href,
  icon,
  label,
  multiline = false,
  value,
}: {
  href?: string;
  icon?: ReactNode;
  label: string;
  multiline?: boolean;
  value: string;
}) {
  const { t } = useLanguage();
  const displayed = value || t("Not recorded", "Haijaandikwa");
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start", py: 1.2 }}>
      <Box sx={{ color: value ? "primary.main" : "text.disabled", display: "grid", flexShrink: 0, height: 22, placeItems: "center", width: 22, "& .MuiSvgIcon-root": { fontSize: 18 } }}>
        {icon ?? <Box sx={{ bgcolor: "divider", borderRadius: "50%", height: 5, width: 5 }} />}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography color="text.secondary" sx={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".045em", textTransform: "uppercase" }}>{label}</Typography>
        {href && value ? (
          <Typography component="a" href={href} sx={{ color: "primary.main", display: "block", fontSize: ".8125rem", fontWeight: 500, mt: 0.2, overflowWrap: "anywhere", textDecoration: "none" }}>
            {displayed}
          </Typography>
        ) : (
          <Typography color={value ? "text.primary" : "text.disabled"} noWrap={!multiline} sx={{ fontSize: ".8125rem", fontWeight: 500, mt: 0.2, overflowWrap: "anywhere", whiteSpace: multiline ? "pre-wrap" : undefined }}>
            {displayed}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

function CommercialPanel({ commercial }: { commercial: GuestCommercial | null }) {
  const { t } = useLanguage();
  return (
    <Surface>
      <SectionHeading
        description={t("Visible only to finance-authorized roles.", "Inaonekana kwa majukumu yaliyoruhusiwa tu.")}
        title={t("Commercial relationship", "Uhusiano wa kifedha")}
      />
      {commercial ? (
        <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(2,minmax(0,1fr))", mt: 2 }}>
          <CommercialValue label={t("Booked", "Iliyohifadhiwa")} value={commercial.lifetimeBooked} />
          <CommercialValue label={t("Collected", "Iliyokusanywa")} value={commercial.totalCollected} />
          <CommercialValue label={t("Outstanding", "Inayodaiwa")} value={commercial.outstandingBalance} warning={commercial.outstandingBalance > 0} />
          <CommercialValue label={t("Avg. stay", "Wastani wa ukaaji")} value={commercial.averageStayValue} />
        </Box>
      ) : (
        <Typography color="text.secondary" sx={{ mt: 2 }} variant="body2">
          {t("No commercial history is available yet.", "Bado hakuna historia ya kifedha.")}
        </Typography>
      )}
    </Surface>
  );
}

function CommercialValue({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return (
    <Box sx={{ bgcolor: "action.hover", borderRadius: 2, minWidth: 0, p: 1.25 }}>
      <Typography color="text.secondary" sx={{ fontSize: ".68rem", fontWeight: 700, textTransform: "uppercase" }}>{label}</Typography>
      <Typography color={warning ? "warning.main" : "text.primary"} noWrap sx={{ fontSize: ".8125rem", fontVariantNumeric: "tabular-nums", fontWeight: 700, mt: 0.35 }}>
        {money.format(value)}
      </Typography>
    </Box>
  );
}

function GuestNotes({ notes }: { notes: string }) {
  const { t } = useLanguage();
  return (
    <Surface>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <NotesRoundedIcon color="primary" fontSize="small" />
        <Typography sx={{ fontWeight: 700 }}>{t("Guest notes", "Maelezo ya mgeni")}</Typography>
      </Stack>
      <Typography color="text.secondary" sx={{ mt: 1.25, overflowWrap: "anywhere", whiteSpace: "pre-wrap" }} variant="body2">
        {notes}
      </Typography>
    </Surface>
  );
}

function CompactEmpty({ description, icon, title }: { description: string; icon: ReactNode; title: string }) {
  return (
    <Box sx={{ "& > .MuiStack-root": { py: { xs: 3.5, sm: 4.5 } } }}>
      <EmptyState description={description} icon={icon} title={title} />
    </Box>
  );
}

function InlineValue({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return (
    <Box>
      <Typography color="text.secondary" sx={{ fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase" }}>{label}</Typography>
      <Typography color={warning ? "warning.main" : "text.primary"} sx={{ fontSize: ".8125rem", fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{value}</Typography>
    </Box>
  );
}

function humanize(value: string): string {
  return value
    .trim()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function GuestDetailsLoading() {
  return (
    <WorkspacePage>
      <Stack spacing={2}>
        <Surface>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Skeleton height={44} variant="rounded" width={44} />
            <Skeleton height={64} variant="circular" width={64} />
            <Box sx={{ flex: 1 }}><Skeleton width="36%" /><Skeleton width="24%" /></Box>
          </Stack>
        </Surface>
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", lg: "repeat(4,minmax(0,1fr))" } }}>
          {[0, 1, 2, 3].map((item) => <Skeleton height={132} key={item} variant="rounded" />)}
        </Box>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "1.55fr .75fr" } }}>
          <Skeleton height={420} variant="rounded" />
          <Skeleton height={360} variant="rounded" />
        </Box>
      </Stack>
    </WorkspacePage>
  );
}

function GuestDetailsError({
  message,
  onBack,
  onRetry,
}: {
  message: string;
  onBack: () => void;
  onRetry?: () => void;
}) {
  const { t } = useLanguage();
  return (
    <WorkspacePage maxWidth={720}>
      <Surface>
        <Stack spacing={2} sx={{ alignItems: "center", py: { xs: 2, sm: 4 }, textAlign: "center" }}>
          <Box sx={{ bgcolor: "color-mix(in srgb, var(--mui-palette-error-main) 10%, transparent)", borderRadius: "50%", color: "error.main", display: "grid", height: 52, placeItems: "center", width: 52 }}>
            <PersonOutlineRoundedIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{t("Guest unavailable", "Mgeni hapatikani")}</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>{message}</Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button onClick={onBack} startIcon={<ArrowBackRoundedIcon />} variant="outlined">{t("Back to guests", "Rudi kwa wageni")}</Button>
            {onRetry ? <Button onClick={onRetry} startIcon={<RefreshRoundedIcon />} variant="contained">{t("Try again", "Jaribu tena")}</Button> : null}
          </Stack>
        </Stack>
      </Surface>
    </WorkspacePage>
  );
}
