"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CleaningServicesRoundedIcon from "@mui/icons-material/CleaningServicesRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Fab,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useHomeDashboard } from "@/features/dashboard/hooks/use-home-dashboard";
import type {
  DashboardBooking,
  DashboardHousekeepingRoom,
  DashboardSummary,
} from "@/features/dashboard/models/dashboard";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { normalizeWorkspaceRole } from "@/features/session/permissions";
import { useLanguage } from "@/components/providers/language-provider";

const money = new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
});

export function DashboardScreen() {
  const { t } = useLanguage();
  const sessionState = useAppSession();
  const { dashboard, loading, error, refresh } = useHomeDashboard(
    sessionState.session?.activePropertyId,
  );

  if (sessionState.loading || loading) return <DashboardSkeleton />;
  if (sessionState.error || error || !dashboard) {
    return (
      <DashboardError
        message={(sessionState.error || error)?.message}
        onRetry={() => {
          void sessionState.refresh();
          void refresh();
        }}
      />
    );
  }

  const role = normalizeWorkspaceRole(dashboard.role);
  const { capabilities, finance, summary } = dashboard;
  const showFinance = capabilities.viewFinance && Boolean(finance);
  const occupancy = summary.totalActiveRooms
    ? Math.round((summary.occupiedRooms / summary.totalActiveRooms) * 100)
    : 0;
  const attentionCount =
    summary.attentionRooms +
    summary.arrivalsDue +
    summary.departuresDue +
    (showFinance && (finance?.openBalanceCount ?? 0) > 0 ? 1 : 0);

  return (
    <Box sx={{ minHeight: "100dvh", pb: { xs: 10, md: 5 } }}>
      <Container maxWidth="xl" sx={{ py: { xs: 1.75, sm: 2.5, lg: 3 } }}>
        <Stack spacing={{ xs: 1.5, md: 2 }}>
          <DashboardHeader
            businessDate={dashboard.businessDate}
            canCreateBooking={capabilities.createBooking}
            canManageRooms={capabilities.manageRooms}
            onRefresh={() => void refresh()}
            role={role}
          />

          {attentionCount > 0 ? (
            <AttentionStrip
              arrivals={summary.arrivalsDue}
              departures={summary.departuresDue}
              financeVisible={showFinance}
              openBalances={finance?.openBalanceCount ?? 0}
              roomsNeedingAttention={summary.attentionRooms}
            />
          ) : null}

          <DashboardMetrics
            attentionRooms={summary.attentionRooms}
            arrivals={summary.arrivalsDue}
            canSeeFinance={showFinance}
            collected={finance?.todayCollected ?? 0}
            departures={summary.departuresDue}
            occupancy={occupancy}
            readyRooms={summary.readyRooms}
            totalRooms={summary.totalActiveRooms}
          />

          <Box
            sx={{
              display: "grid",
              gap: { xs: 1.5, md: 2 },
              gridTemplateColumns: {
                xs: "1fr",
                lg: "minmax(0, 1.35fr) minmax(320px, .85fr)",
              },
            }}
          >
            {showFinance && finance ? (
              <FinanceSnapshot
                collected={finance.todayCollected}
                openBalanceCount={finance.openBalanceCount}
                outstanding={finance.outstandingBalance}
                paymentCount={finance.todayPaymentCount}
                summary={summary}
              />
            ) : (
              <ServicePulse occupancy={occupancy} summary={summary} />
            )}
            <OperationalQueue
              arrivals={dashboard.arrivals}
              departures={dashboard.departures}
              showBalances={showFinance}
            />
          </Box>

          <Box
            sx={{
              display: "grid",
              gap: { xs: 1.5, md: 2 },
              gridTemplateColumns: {
                xs: "1fr",
                xl: "minmax(0, 1.35fr) minmax(320px, .85fr)",
              },
            }}
          >
            <RoomStatusBoard
              housekeeping={dashboard.housekeeping}
              summary={summary}
            />
            <TodayDepartures bookings={dashboard.departures} />
          </Box>
        </Stack>
      </Container>

      {capabilities.createBooking ? (
        <Fab
          aria-label={t("New booking", "Uhifadhi mpya")}
          color="primary"
          component={Link}
          href="/bookings/new"
          sx={{
            bottom: { xs: 20, sm: 28 },
            display: { xs: "inline-flex", sm: "none" },
            position: "fixed",
            right: { xs: 18, sm: 28 },
            zIndex: (theme) => theme.zIndex.speedDial,
          }}
        >
          <AddRoundedIcon />
        </Fab>
      ) : null}
    </Box>
  );
}

function DashboardHeader({
  businessDate,
  canCreateBooking,
  canManageRooms,
  onRefresh,
  role,
}: {
  businessDate: Date;
  canCreateBooking: boolean;
  canManageRooms: boolean;
  onRefresh: () => void;
  role: string;
}) {
  const { language, t } = useLanguage();
  const date = businessDate.toLocaleDateString(language === "sw" ? "sw-TZ" : "en-TZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Stack
      component="header"
      direction={{ xs: "column", sm: "row" }}
      spacing={{ xs: 1.25, sm: 2 }}
      sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", minWidth: 0 }}>
        <Box
          sx={{
            alignItems: "center",
            bgcolor: "primary.main",
            borderRadius: 1,
            color: "primary.contrastText",
            display: "grid",
            flexShrink: 0,
            height: 34,
            placeItems: "center",
            width: 34,
          }}
        >
          <AssessmentRoundedIcon fontSize="small" />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            color="text.secondary"
            sx={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}
          >
            {t("Home", "Nyumbani")}
          </Typography>
          <Typography
            component="h1"
            sx={{ fontSize: { xs: "1.45rem", sm: "1.65rem" }, fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1.15 }}
          >
            {t("Operations overview", "Muhtasari wa uendeshaji")}
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: ".8125rem", mt: 0.55 }}>
            {date}
          </Typography>
        </Box>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
        <Chip label={role} size="small" sx={{ textTransform: "capitalize" }} />
        {canManageRooms ? (
          <Button component={Link} href="/rooms/new" size="small" sx={{ display: { xs: "none", sm: "inline-flex" } }}>
            {t("Add room", "Ongeza chumba")}
          </Button>
        ) : null}
        {canCreateBooking ? (
          <Button
            component={Link}
            href="/bookings/new"
            size="small"
            startIcon={<AddRoundedIcon />}
            sx={{ display: { xs: "none", sm: "inline-flex" } }}
            variant="contained"
          >
            {t("New booking", "Uhifadhi mpya")}
          </Button>
        ) : null}
        <Tooltip title={t("Refresh dashboard", "Sasisha dashibodi")}>
          <IconButton
            aria-label={t("Refresh dashboard", "Sasisha dashibodi")}
            onClick={onRefresh}
            size="small"
            sx={{ border: "1px solid", borderColor: "divider" }}
          >
            <RefreshRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}

function AttentionStrip({
  arrivals,
  departures,
  financeVisible,
  openBalances,
  roomsNeedingAttention,
}: {
  arrivals: number;
  departures: number;
  financeVisible: boolean;
  openBalances: number;
  roomsNeedingAttention: number;
}) {
  const { t } = useLanguage();
  const items = [
    roomsNeedingAttention > 0
      ? {
          href: "/rooms?status=needs_cleaning",
          label: t(
            `${roomsNeedingAttention} room${roomsNeedingAttention === 1 ? "" : "s"} need attention`,
            `Vyumba ${roomsNeedingAttention} vinahitaji uangalizi`,
          ),
        }
      : null,
    arrivals > 0
      ? {
          href: "/bookings?view=checkins&date=today",
          label: t(
            `${arrivals} arrival${arrivals === 1 ? "" : "s"} due`,
            `Wanaowasili ${arrivals} wanatarajiwa`,
          ),
        }
      : null,
    departures > 0
      ? {
          href: "/bookings?view=checkouts&date=today",
          label: t(
            `${departures} departure${departures === 1 ? "" : "s"} due`,
            `Wanaondoka ${departures} wanatarajiwa`,
          ),
        }
      : null,
    financeVisible && openBalances > 0
      ? {
          href: "/bookings",
          label: t(
            `${openBalances} balance${openBalances === 1 ? "" : "s"} to follow up`,
            `Madeni ${openBalances} ya kufuatilia`,
          ),
        }
      : null,
  ].filter((item): item is { href: string; label: string } => Boolean(item));

  return (
    <Paper
      variant="outlined"
      sx={{
        bgcolor: "color-mix(in srgb, var(--mui-palette-warning-main) 8%, var(--mui-palette-background-paper))",
        borderColor: "color-mix(in srgb, var(--mui-palette-warning-main) 28%, var(--mui-palette-divider))",
        overflow: "hidden",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 0.85, sm: 1.4 }}
        sx={{ alignItems: { sm: "center" }, p: { xs: 1.15, sm: 1.3 } }}
      >
        <Typography sx={{ color: "warning.dark", flexShrink: 0, fontSize: ".78rem", fontWeight: 700 }}>
          {t("Needs attention", "Inahitaji uangalizi")}
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", rowGap: 0.5 }}>
          {items.map((item) => (
            <Box
              component={Link}
              href={item.href}
              key={item.href}
              sx={{
                borderRadius: 0.75,
                color: "text.primary",
                fontSize: ".78rem",
                fontWeight: 500,
                px: 0.75,
                py: 0.35,
                textDecoration: "none",
                "&:hover": { bgcolor: "rgba(174,111,19,.10)", textDecoration: "underline" },
              }}
            >
              {item.label}
            </Box>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}

function DashboardMetrics({
  attentionRooms,
  arrivals,
  canSeeFinance,
  collected,
  departures,
  occupancy,
  readyRooms,
  totalRooms,
}: {
  attentionRooms: number;
  arrivals: number;
  canSeeFinance: boolean;
  collected: number;
  departures: number;
  occupancy: number;
  readyRooms: number;
  totalRooms: number;
}) {
  const { t } = useLanguage();
  const metrics = canSeeFinance
    ? [
        { icon: <HotelRoundedIcon fontSize="small" />, label: t("Occupancy", "Matumizi"), value: `${occupancy}%` },
        { href: "/bookings?view=checkins&date=today", icon: <LoginRoundedIcon fontSize="small" />, label: t("Arrivals due", "Wanaowasili"), value: String(arrivals) },
        { href: "/bookings?view=checkouts&date=today", icon: <LogoutRoundedIcon fontSize="small" />, label: t("Departures due", "Wanaondoka"), value: String(departures) },
        { icon: <PaymentsRoundedIcon fontSize="small" />, label: t("Collected today", "Makusanyo leo"), value: money.format(collected) },
      ]
    : [
        { href: "/bookings?view=checkins&date=today", icon: <LoginRoundedIcon fontSize="small" />, label: t("Arrivals due", "Wanaowasili"), value: String(arrivals) },
        { href: "/bookings?view=checkouts&date=today", icon: <LogoutRoundedIcon fontSize="small" />, label: t("Departures due", "Wanaondoka"), value: String(departures) },
        { href: "/rooms?status=ready", icon: <CheckCircleRoundedIcon fontSize="small" />, label: t("Rooms ready", "Vyumba tayari"), suffix: totalRooms ? t(`of ${totalRooms}`, `kati ya ${totalRooms}`) : undefined, value: String(readyRooms) },
        { href: "/rooms?status=needs_cleaning", icon: <CleaningServicesRoundedIcon fontSize="small" />, label: t("Need attention", "Vinahitaji uangalizi"), value: String(attentionRooms) },
      ];

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1.25,
        display: "grid",
        gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", md: "repeat(4,minmax(0,1fr))" },
        overflow: "hidden",
      }}
    >
      {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
    </Box>
  );
}

function MetricCard({
  href,
  icon,
  label,
  suffix,
  value,
}: {
  href?: string;
  icon: ReactNode;
  label: string;
  suffix?: string;
  value: string;
}) {
  const content = (
    <>
      <Box
        sx={{
          alignItems: "center",
          bgcolor: "color-mix(in srgb, var(--mui-palette-primary-main) 10%, var(--mui-palette-background-paper))",
          borderRadius: 0.8,
          color: "primary.main",
          display: "grid",
          height: 31,
          placeItems: "center",
          width: 31,
        }}
      >
        {icon}
      </Box>
      <Typography color="text.secondary" sx={{ fontSize: ".7rem", fontWeight: 700, lineHeight: 1.25, mt: 1.05 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: { xs: "1rem", sm: "1.4rem" }, fontVariantNumeric: "tabular-nums", fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1.2, mt: 0.45, overflowWrap: "anywhere" }}>
        {value}
        {suffix ? (
          <Typography component="span" sx={{ color: "text.secondary", display: { xs: "block", sm: "inline" }, fontSize: { xs: ".65rem", sm: ".8rem" }, fontWeight: 500, ml: { sm: 0.45 } }}>
            {suffix}
          </Typography>
        ) : null}
      </Typography>
    </>
  );

  const styles = {
    borderColor: "divider",
    borderRight: "1px solid",
    borderBottom: { xs: "1px solid", md: 0 },
    color: "inherit",
    minWidth: 0,
    p: { xs: 1.25, sm: 1.75 },
    textDecoration: "none",
    "&:nth-of-type(2n)": { borderRight: 0 },
    "@media (min-width: 960px)": {
      "&:nth-of-type(2n)": { borderRight: "1px solid" },
      "&:last-of-type": { borderRight: 0 },
    },
    "&:nth-last-of-type(-n + 2)": { borderBottom: 0 },
    ...(href ? { cursor: "pointer", "&:hover": { bgcolor: "action.hover" } } : {}),
  };

  return href ? (
    <Box component={Link} href={href} sx={styles}>{content}</Box>
  ) : (
    <Box sx={styles}>{content}</Box>
  );
}

function FinanceSnapshot({
  collected,
  openBalanceCount,
  outstanding,
  paymentCount,
  summary,
}: {
  collected: number;
  openBalanceCount: number;
  outstanding: number;
  paymentCount: number;
  summary: DashboardSummary;
}) {
  const { t } = useLanguage();
  const readyRate = summary.totalActiveRooms
    ? Math.round((summary.readyRooms / summary.totalActiveRooms) * 100)
    : 0;
  const occupiedRate = summary.totalActiveRooms
    ? Math.round((summary.occupiedRooms / summary.totalActiveRooms) * 100)
    : 0;

  return (
    <Paper variant="outlined" sx={{ minWidth: 0, overflow: "hidden" }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between", p: { xs: 1.5, sm: 2 } }}>
        <Box>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
            <AccountBalanceWalletRoundedIcon color="primary" fontSize="small" />
            <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("Today’s financial position", "Hali ya fedha leo")}
            </Typography>
          </Stack>
          <Typography color="text.secondary" variant="body2" sx={{ mt: 0.25 }}>
            {t("Cash received and balances that still need action.", "Fedha zilizopokelewa na salio linalohitaji hatua.")}
          </Typography>
        </Box>
        <Chip
          color={openBalanceCount > 0 ? "warning" : "success"}
          label={openBalanceCount > 0 ? t(`${openBalanceCount} open balance${openBalanceCount === 1 ? "" : "s"}`, `Madeni ${openBalanceCount} yaliyo wazi`) : t("Balances settled", "Madeni yamelipwa")}
          size="small"
          sx={{ alignSelf: { xs: "flex-start", sm: "center" }, flexShrink: 0 }}
        />
      </Stack>
      <Divider />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" } }}>
        <FinanceMetric icon={<TrendingUpRoundedIcon fontSize="small" />} label={t("Collected today", "Makusanyo leo")} tone="success.main" value={money.format(collected)} helper={t(`${paymentCount} payment${paymentCount === 1 ? "" : "s"} recorded`, `Malipo ${paymentCount} yameandikwa`)} />
        <FinanceMetric icon={<PaymentsRoundedIcon fontSize="small" />} label={t("Outstanding balances", "Madeni yaliyobaki")} tone={outstanding > 0 ? "warning.main" : "success.main"} value={money.format(outstanding)} helper={t(`${openBalanceCount} booking${openBalanceCount === 1 ? "" : "s"} need follow-up`, `Uhifadhi ${openBalanceCount} unahitaji ufuatiliaji`)} />
      </Box>
      <Divider />
      <Stack spacing={1.15} sx={{ p: { xs: 1.5, sm: 2 } }}>
        <SnapshotBar caption={t("Rooms ready to sell", "Vyumba tayari kuuzwa") } tone="primary.main" trailing={t(`${summary.readyRooms} of ${summary.totalActiveRooms} ready`, `${summary.readyRooms} kati ya ${summary.totalActiveRooms} tayari`)} value={readyRate} />
        <SnapshotBar caption={t("Active rooms occupied", "Vyumba hai vilivyokaliwa") } tone="info.main" value={occupiedRate} />
      </Stack>
    </Paper>
  );
}

function FinanceMetric({
  helper,
  icon,
  label,
  tone,
  value,
}: {
  helper: string;
  icon: ReactNode;
  label: string;
  tone: string;
  value: string;
}) {
  return (
    <Stack spacing={0.55} sx={{ borderRight: { sm: "1px solid" }, borderColor: "divider", minWidth: 0, p: { xs: 1.5, sm: 2 }, "&:last-of-type": { borderRight: 0 } }}>
      <Stack direction="row" spacing={0.65} sx={{ alignItems: "center", color: tone }}>
        {icon}
        <Typography color="text.secondary" sx={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".055em", textTransform: "uppercase" }}>
          {label}
        </Typography>
      </Stack>
      <Typography sx={{ color: tone, fontSize: { xs: "1.15rem", sm: "1.45rem" }, fontVariantNumeric: "tabular-nums", fontWeight: 700, letterSpacing: "-.03em", overflowWrap: "anywhere" }}>
        {value}
      </Typography>
      <Typography color="text.secondary" variant="caption">{helper}</Typography>
    </Stack>
  );
}

function ServicePulse({ occupancy, summary }: { occupancy: number; summary: DashboardSummary }) {
  const { t } = useLanguage();
  const readyRate = summary.totalActiveRooms
    ? Math.round((summary.readyRooms / summary.totalActiveRooms) * 100)
    : 0;
  return (
    <Paper variant="outlined" sx={{ minWidth: 0, overflow: "hidden" }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between", p: { xs: 1.5, sm: 2 } }}>
        <Box>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
            <PeopleAltRoundedIcon color="primary" fontSize="small" />
            <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("Service pulse", "Muhtasari wa huduma")}
            </Typography>
          </Stack>
          <Typography color="text.secondary" variant="body2" sx={{ mt: 0.25 }}>
            {t("The operational facts your team needs for this shift.", "Taarifa za uendeshaji ambazo timu yako inahitaji kwa zamu hii.")}
          </Typography>
        </Box>
        <Chip color={summary.readyRooms > 0 ? "success" : "warning"} label={summary.readyRooms > 0 ? t(`${summary.readyRooms} rooms ready`, `Vyumba ${summary.readyRooms} tayari`) : t("No rooms ready", "Hakuna chumba tayari")} size="small" sx={{ alignSelf: { xs: "flex-start", sm: "center" } }} />
      </Stack>
      <Divider />
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
        <PulseValue label={t("Occupied", "Vimekaliwa")} value={summary.occupiedRooms} />
        <PulseValue label={t("Ready", "Tayari")} value={summary.readyRooms} />
        <PulseValue label={t("Attention", "Uangalizi")} value={summary.attentionRooms} />
      </Box>
      <Divider />
      <Stack spacing={1.15} sx={{ p: { xs: 1.5, sm: 2 } }}>
        <SnapshotBar caption={t("Rooms ready to assign", "Vyumba tayari kugawiwa") } tone="success.main" trailing={t(`${summary.readyRooms} of ${summary.totalActiveRooms} ready`, `${summary.readyRooms} kati ya ${summary.totalActiveRooms} tayari`)} value={readyRate} />
        <SnapshotBar caption={t("Occupied rooms", "Vyumba vilivyokaliwa") } tone="info.main" value={occupancy} />
      </Stack>
    </Paper>
  );
}

function PulseValue({ label, value }: { label: string; value: number }) {
  return (
    <Stack spacing={0.45} sx={{ borderRight: "1px solid", borderColor: "divider", minWidth: 0, p: { xs: 1.35, sm: 1.75 }, "&:last-of-type": { borderRight: 0 } }}>
      <Typography color="text.secondary" sx={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase" }}>{label}</Typography>
      <Typography sx={{ fontSize: { xs: "1.1rem", sm: "1.35rem" }, fontVariantNumeric: "tabular-nums", fontWeight: 700, letterSpacing: "-.025em" }}>{value}</Typography>
    </Stack>
  );
}

function SnapshotBar({ caption, tone, trailing, value }: { caption: string; tone: string; trailing?: string; value: number }) {
  const safeValue = Math.max(0, Math.min(value, 100));
  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", justifyContent: "space-between", mb: 0.65 }}>
        <Typography color="text.secondary" sx={{ fontSize: ".78rem", fontWeight: 500, minWidth: 0 }}>{caption}</Typography>
        <Typography sx={{ color: tone, flexShrink: 0, fontSize: ".78rem", fontWeight: 700 }}>{trailing ?? `${safeValue}%`}</Typography>
      </Stack>
      <Box sx={{ bgcolor: "action.hover", borderRadius: 99, height: 6, overflow: "hidden" }}>
        <Box sx={{ bgcolor: tone, borderRadius: "inherit", height: "100%", transition: "width 240ms ease", width: `${safeValue}%` }} />
      </Box>
    </Box>
  );
}

function OperationalQueue({ arrivals, departures, showBalances }: { arrivals: DashboardBooking[]; departures: DashboardBooking[]; showBalances: boolean }) {
  const { t } = useLanguage();
  const queue = [
    ...arrivals.map((booking) => ({ booking, type: "arrival" as const })),
    ...departures.map((booking) => ({ booking, type: "departure" as const })),
  ].sort((a, b) => Number(b.booking.isOverdue) - Number(a.booking.isOverdue));
  return (
    <Paper variant="outlined" sx={{ minWidth: 0, overflow: "hidden" }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", p: { xs: 1.5, sm: 2 } }}>
        <Box>
          <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>{t("Front desk queue", "Foleni ya mapokezi")}</Typography>
          <Typography color="text.secondary" variant="body2">{t("Arrivals and departures requiring a decision.", "Wanaowasili na wanaoondoka wanaohitaji uamuzi.")}</Typography>
        </Box>
        <Button component={Link} endIcon={<ArrowForwardRoundedIcon />} href="/bookings" size="small" sx={{ flexShrink: 0 }}>{t("Bookings", "Uhifadhi")}</Button>
      </Stack>
      <Divider />
      {queue.length === 0 ? (
        <Stack spacing={0.75} sx={{ alignItems: "flex-start", p: { xs: 1.5, sm: 2 } }}>
          <CheckCircleRoundedIcon color="success" />
          <Typography sx={{ fontWeight: 700 }}>{t("No arrivals or departures are due.", "Hakuna wanaoingia au wanaotoka wanaotarajiwa.")}</Typography>
          <Typography color="text.secondary" variant="body2">{t("Use the time to confirm room readiness and upcoming stays.", "Tumia muda huu kuthibitisha utayari wa vyumba na ukaaji unaokuja.")}</Typography>
        </Stack>
      ) : (
        <Stack divider={<Divider flexItem />}>
          {queue.slice(0, 6).map(({ booking, type }) => <QueueRow booking={booking} key={`${type}-${booking.id}`} showBalances={showBalances} type={type} />)}
        </Stack>
      )}
    </Paper>
  );
}

function QueueRow({ booking, showBalances, type }: { booking: DashboardBooking; showBalances: boolean; type: "arrival" | "departure" }) {
  const { t } = useLanguage();
  const departure = type === "departure";
  return (
    <Box component={Link} href={`/bookings/${booking.id}`} sx={{ color: "inherit", display: "block", p: { xs: 1.35, sm: 1.6 }, textDecoration: "none", "&:hover": { bgcolor: "action.hover" } }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.65} sx={{ alignItems: "center", minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: ".9rem", fontWeight: 700 }}>{booking.guestName}</Typography>
            <Chip color={departure ? "warning" : "info"} label={departure ? t("Departure", "Anaondoka") : t("Arrival", "Anaingia")} size="small" sx={{ height: 21, ".MuiChip-label": { px: 0.75 } }} />
            {booking.isOverdue ? <Chip color="error" label={t("Overdue", "Imechelewa")} size="small" sx={{ height: 21, ".MuiChip-label": { px: 0.75 } }} /> : null}
          </Stack>
          <Typography color="text.secondary" noWrap variant="caption">{booking.roomName} · {booking.roomType || t("Room", "Chumba")}</Typography>
        </Stack>
        {showBalances && booking.balanceDue > 0 ? (
          <Stack spacing={0.1} sx={{ alignItems: "flex-end", flexShrink: 0 }}>
            <Typography color="warning.main" sx={{ fontSize: ".8rem", fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{money.format(booking.balanceDue)}</Typography>
            <Typography color="text.secondary" sx={{ fontSize: ".65rem" }}>{t("to settle", "kulipa")}</Typography>
          </Stack>
        ) : <ArrowForwardRoundedIcon color="action" fontSize="small" />}
      </Stack>
    </Box>
  );
}

function RoomStatusBoard({ housekeeping, summary }: { housekeeping: DashboardHousekeepingRoom[]; summary: DashboardSummary }) {
  const { t } = useLanguage();
  const statusCells = [
    { color: "info.main", label: t("Occupied", "Vimekaliwa"), value: summary.occupiedRooms },
    { color: "success.main", label: t("Ready", "Tayari"), value: summary.readyRooms },
    { color: "warning.main", label: t("Attention", "Uangalizi"), value: summary.attentionRooms },
    { color: "text.primary", label: t("Active rooms", "Vyumba hai"), value: summary.totalActiveRooms },
  ];
  return (
    <Paper variant="outlined" sx={{ minWidth: 0, overflow: "hidden" }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between", p: { xs: 1.5, sm: 2 } }}>
        <Box>
          <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>{t("Room status", "Hali ya vyumba")}</Typography>
          <Typography color="text.secondary" variant="body2">{t("Availability and housekeeping at a glance.", "Upatikanaji na usafi kwa mtazamo mmoja.")}</Typography>
        </Box>
        <Button component={Link} endIcon={<ArrowForwardRoundedIcon />} href="/rooms" size="small" sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}>{t("View rooms", "Tazama vyumba")}</Button>
      </Stack>
      <Divider />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", sm: "repeat(4,minmax(0,1fr))" } }}>
        {statusCells.map((item) => (
          <Stack key={item.label} spacing={0.4} sx={{ borderBottom: { xs: "1px solid", sm: 0 }, borderRight: "1px solid", borderColor: "divider", minWidth: 0, p: { xs: 1.25, sm: 1.5 }, "&:nth-of-type(2n)": { borderRight: { xs: 0, sm: "1px solid" } }, "&:last-of-type": { borderRight: 0 } }}>
            <Typography color="text.secondary" sx={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase" }}>{item.label}</Typography>
            <Typography sx={{ color: item.color, fontSize: "1.2rem", fontVariantNumeric: "tabular-nums", fontWeight: 700, letterSpacing: "-.025em" }}>{item.value}</Typography>
          </Stack>
        ))}
      </Box>
      <Divider />
      {housekeeping.length ? (
        <Stack divider={<Divider flexItem />}>
          {housekeeping.slice(0, 5).map((room) => (
            <Box component={Link} href={`/rooms/${room.id}`} key={room.id} sx={{ color: "inherit", display: "block", p: { xs: 1.3, sm: 1.5 }, textDecoration: "none", "&:hover": { bgcolor: "action.hover" } }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Stack spacing={0.2} sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: ".88rem", fontWeight: 700 }}>{room.name}</Typography>
                  <Typography color="text.secondary" noWrap variant="caption">{room.notes || room.roomType || t("Housekeeping follow-up", "Ufuatiliaji wa usafi")}</Typography>
                </Stack>
                <Chip color={room.housekeepingStatus === "out_of_service" ? "default" : "warning"} label={room.housekeepingStatus.replaceAll("_", " ")} size="small" sx={{ flexShrink: 0, textTransform: "capitalize" }} />
              </Stack>
            </Box>
          ))}
        </Stack>
      ) : (
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", p: { xs: 1.5, sm: 2 } }}>
          <CheckCircleRoundedIcon color="success" fontSize="small" />
          <Typography color="text.secondary" variant="body2">{t("No rooms currently need housekeeping follow-up.", "Hakuna chumba kinachohitaji ufuatiliaji wa usafi sasa.")}</Typography>
        </Stack>
      )}
    </Paper>
  );
}

function TodayDepartures({ bookings }: { bookings: DashboardBooking[] }) {
  const { t } = useLanguage();
  return (
    <Paper variant="outlined" sx={{ minWidth: 0, overflow: "hidden" }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", p: { xs: 1.5, sm: 2 } }}>
        <Box>
          <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>{t("Departure handover", "Makabidhiano ya wanaoondoka")}</Typography>
          <Typography color="text.secondary" variant="body2">{t("Guests due to leave and room turnover to plan.", "Wageni wanaotarajiwa kuondoka na maandalizi ya vyumba.")}</Typography>
        </Box>
        <Button component={Link} href="/bookings?view=checkouts&date=today" size="small" sx={{ flexShrink: 0 }}>{t("All", "Wote")}</Button>
      </Stack>
      <Divider />
      {bookings.length ? (
        <Stack divider={<Divider flexItem />}>
          {bookings.slice(0, 5).map((booking) => (
            <Box component={Link} href={`/bookings/${booking.id}`} key={booking.id} sx={{ color: "inherit", display: "block", p: { xs: 1.35, sm: 1.6 }, textDecoration: "none", "&:hover": { bgcolor: "action.hover" } }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: ".9rem", fontWeight: 700 }}>{booking.guestName}</Typography>
                  <Typography color="text.secondary" noWrap variant="caption">{booking.roomName} · {booking.guests || 1} {t("guest", "mgeni")}{booking.guests === 1 ? "" : "s"}</Typography>
                </Box>
                {booking.isOverdue ? <Chip color="error" label={t("Overdue", "Imechelewa")} size="small" /> : <ArrowForwardRoundedIcon color="action" fontSize="small" />}
              </Stack>
            </Box>
          ))}
        </Stack>
      ) : (
        <Stack spacing={0.75} sx={{ alignItems: "flex-start", p: { xs: 1.5, sm: 2 } }}>
          <CheckCircleRoundedIcon color="success" fontSize="small" />
          <Typography sx={{ fontWeight: 700 }}>{t("No departures are due.", "Hakuna wanaoondoka wanaotarajiwa.")}</Typography>
          <Typography color="text.secondary" variant="body2">{t("Room turnover will appear here as guests check out.", "Mabadiliko ya vyumba yataonekana hapa wageni wanapoondoka.")}</Typography>
        </Stack>
      )}
    </Paper>
  );
}

function DashboardSkeleton() {
  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>
      <Stack spacing={2}>
        <Box><Skeleton height={18} width={70} /><Skeleton height={38} width="32%" /></Box>
        <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "repeat(2,1fr)", md: "repeat(4,1fr)" } }}>
          {[0, 1, 2, 3].map((item) => <Skeleton key={item} height={130} variant="rounded" />)}
        </Box>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "1.35fr .85fr" } }}>
          {[0, 1].map((item) => <Skeleton key={item} height={310} variant="rounded" />)}
        </Box>
      </Stack>
    </Container>
  );
}

function DashboardError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  const { t } = useLanguage();
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, sm: 10 } }}>
      <Alert severity="error" action={<Button color="inherit" onClick={onRetry}>{t("Retry", "Jaribu tena")}</Button>}>
        <Typography sx={{ fontWeight: 700 }}>{t("Unable to load dashboard", "Imeshindikana kupakia dashibodi")}</Typography>
        {message ? <Typography variant="caption">{message}</Typography> : null}
      </Alert>
    </Container>
  );
}
