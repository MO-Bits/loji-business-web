"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  Fab,
  IconButton,
  InputAdornment,
  LinearProgress,
  Pagination,
  Paper,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";

import { PageHeader } from "@/components/shared/page-header";
import { useLanguage } from "@/components/providers/language-provider";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { getWorkspaceCapabilities } from "@/features/session/permissions";
import {
  guestDirectoryStatus,
  type GuestDirectory,
  type GuestDirectoryItem,
  type GuestStayFilter,
} from "@/features/guests/models/guest";
import { usePropertyGuests } from "@/features/guests/hooks/use-property-guests";
import { formatLocalDate } from "@/lib/date-time";

import { GuestAvatar, GuestStatusChip } from "./guest-shared";

const PAGE_SIZE = 25;
const money = new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
});

export function GuestsScreen() {
  const { t } = useLanguage();
  const {
    session,
    loading: sessionLoading,
    error: sessionError,
    refresh: refreshSession,
  } = useAppSession();
  const [query, setQuery] = useState("");
  const [committedQuery, setCommittedQuery] = useState("");
  const [stayFilter, setStayFilter] = useState<GuestStayFilter>("all");
  const [page, setPage] = useState(1);
  const propertyId = session?.activePropertyId;
  const fallbackCapabilities = getWorkspaceCapabilities(session?.activeRole);
  const { directory, loading, error, refresh } = usePropertyGuests({
    propertyId,
    query: committedQuery,
    page,
    pageSize: PAGE_SIZE,
    stayFilter,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCommittedQuery(query.trim());
      setPage(1);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [query]);

  const canCreateBooking =
    directory?.capabilities.createBooking ??
    fallbackCapabilities.canCreateBooking;

  const changeFilter = (nextFilter: GuestStayFilter) => {
    setStayFilter(nextFilter);
    setPage(1);
  };

  const clearFilters = () => {
    setQuery("");
    setCommittedQuery("");
    setStayFilter("all");
    setPage(1);
  };

  if (sessionLoading || (!directory && loading)) return <GuestsLoading />;

  if (sessionError || !propertyId) {
    return (
      <GuestsError
        message={
          sessionError?.message ??
          t(
            "Select an active property to view guests.",
            "Chagua mali inayotumika ili kuona wageni.",
          )
        }
        onRetry={() => void refreshSession()}
      />
    );
  }

  if (!directory && error) {
    return <GuestsError message={error.message} onRetry={() => void refresh()} />;
  }

  if (!directory) {
    return (
      <GuestsError
        message={t(
          "The guest directory is unavailable for this workspace.",
          "Orodha ya wageni haipatikani kwa eneo hili la kazi.",
        )}
        onRetry={() => void refresh()}
      />
    );
  }

  if (!directory.capabilities.viewGuests) {
    return <GuestsAccessLimited />;
  }

  const totalPages = Math.max(1, Math.ceil(directory.total / directory.pageSize));
  const filtered = Boolean(committedQuery) || stayFilter !== "all";
  const showMobileBookingAction =
    canCreateBooking && (directory.guests.length > 0 || filtered);

  return (
    <Box sx={{ minHeight: "100dvh", pb: { xs: 10, md: 5 } }}>
      <Container maxWidth="xl" sx={{ py: { xs: 1.75, sm: 2.5, lg: 3 } }}>
        <Stack spacing={{ xs: 1.5, md: 2 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <PageHeader
                eyebrow={t("Guest intelligence", "Taarifa za wageni")}
                title={t("Guests", "Wageni")}
                description={t(
                  "A single, trusted view of every guest relationship and stay.",
                  "Muonekano mmoja wa kuaminika wa kila mgeni na historia ya ukaaji.",
                )}
              />
            </Box>
            {canCreateBooking ? (
              <Button
                component={Link}
                href="/bookings/new"
                startIcon={<AddRoundedIcon />}
                sx={{ display: { xs: "none", sm: "inline-flex" }, flexShrink: 0, minHeight: 44 }}
                variant="contained"
              >
                {t("New booking", "Uhifadhi mpya")}
              </Button>
            ) : null}
          </Stack>

          <GuestSummary directory={directory} onFilter={changeFilter} />

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

          <Paper variant="outlined" sx={{ overflow: "hidden" }}>
            {loading ? <LinearProgress aria-label={t("Loading guests", "Inapakia wageni")} /> : null}
            <Stack spacing={1.25} sx={{ p: { xs: 1.25, sm: 1.75 } }}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1}
                sx={{ alignItems: { md: "center" }, justifyContent: "space-between" }}
              >
                <TextField
                  aria-label={t("Search guests", "Tafuta wageni")}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t(
                    "Search name, phone or email",
                    "Tafuta jina, simu au barua pepe",
                  )}
                  size="small"
                  value={query}
                  sx={{ maxWidth: 480, width: "100%" }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchRoundedIcon color="action" fontSize="small" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                  <Typography color="text.secondary" sx={{ fontSize: ".75rem", fontWeight: 500 }}>
                    {t(
                      `${directory.total} guest${directory.total === 1 ? "" : "s"}`,
                      `Wageni ${directory.total}`,
                    )}
                  </Typography>
                  <Tooltip title={t("Refresh directory", "Sasisha orodha")}>
                    <IconButton
                      aria-label={t("Refresh directory", "Sasisha orodha")}
                      onClick={() => void refresh()}
                      size="small"
                      sx={{ border: "1px solid", borderColor: "divider" }}
                    >
                      <RefreshRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>

              <Box sx={{ overflowX: "auto", pb: 0.15 }}>
                <ToggleButtonGroup
                  aria-label={t("Filter guests by stay", "Chuja wageni kwa ukaaji")}
                  exclusive
                  onChange={(_, value: GuestStayFilter | null) => {
                    if (value) changeFilter(value);
                  }}
                  size="small"
                  value={stayFilter}
                  sx={{ minWidth: "max-content" }}
                >
                  <ToggleButton value="all">{t("All guests", "Wageni wote")}</ToggleButton>
                  <ToggleButton value="in_house">{t("In house", "Waliopo")}</ToggleButton>
                  <ToggleButton value="arriving">{t("Arriving today", "Wanaofika leo")}</ToggleButton>
                  <ToggleButton value="upcoming">{t("Upcoming", "Wanaotarajiwa")}</ToggleButton>
                  <ToggleButton value="past">{t("Past guests", "Wageni wa zamani")}</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Stack>
          </Paper>

          {directory.guests.length ? (
            <>
              <Box sx={{ display: { xs: "none", md: "block" } }}>
                <GuestTable directory={directory} />
              </Box>
              <Box
                sx={{
                  display: { xs: "grid", md: "none" },
                  gap: 1,
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" },
                }}
              >
                {directory.guests.map((guest) => (
                  <GuestContactCard
                    guest={guest}
                    key={guest.id}
                    showFinance={directory.capabilities.viewFinance}
                  />
                ))}
              </Box>
            </>
          ) : (
            <GuestEmptyState
              canCreateBooking={canCreateBooking}
              filtered={filtered}
              onClear={clearFilters}
            />
          )}

          {directory.total > directory.pageSize ? (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              sx={{ alignItems: { sm: "center" }, justifyContent: "space-between", pt: 0.5 }}
            >
              <Typography color="text.secondary" variant="caption">
                {t(
                  `Showing ${(directory.page - 1) * directory.pageSize + 1}–${Math.min(directory.page * directory.pageSize, directory.total)} of ${directory.total}`,
                  `Inaonyesha ${(directory.page - 1) * directory.pageSize + 1}–${Math.min(directory.page * directory.pageSize, directory.total)} kati ya ${directory.total}`,
                )}
              </Typography>
              <Pagination
                aria-label={t("Guest directory pages", "Kurasa za orodha ya wageni")}
                count={totalPages}
                onChange={(_, nextPage) => setPage(nextPage)}
                page={page}
                showFirstButton
                showLastButton
                size="small"
              />
            </Stack>
          ) : null}
        </Stack>
      </Container>

      {showMobileBookingAction ? (
        <Fab
          aria-label={t("New booking", "Uhifadhi mpya")}
          color="primary"
          component={Link}
          href="/bookings/new"
          variant="extended"
          sx={{
            bottom: "calc(76px + env(safe-area-inset-bottom))",
            display: { xs: "inline-flex", sm: "none" },
            minHeight: 48,
            position: "fixed",
            right: "max(18px, env(safe-area-inset-right))",
            zIndex: (theme) => theme.zIndex.speedDial,
          }}
        >
          <AddRoundedIcon sx={{ mr: 0.75 }} />
          {t("New booking", "Uhifadhi mpya")}
        </Fab>
      ) : null}
    </Box>
  );
}

function GuestSummary({
  directory,
  onFilter,
}: {
  directory: GuestDirectory;
  onFilter: (filter: GuestStayFilter) => void;
}) {
  const { t } = useLanguage();
  const items: Array<{
    color: string;
    filter?: GuestStayFilter;
    icon: ReactNode;
    label: string;
    value: number;
  }> = [
    {
      color: "text.primary",
      filter: "all",
      icon: <GroupsRoundedIcon fontSize="small" />,
      label: t("Guest profiles", "Wasifu wa wageni"),
      value: directory.summary.totalGuests,
    },
    {
      color: "success.main",
      filter: "in_house",
      icon: <HotelRoundedIcon fontSize="small" />,
      label: t("In house", "Waliopo"),
      value: directory.summary.inHouse,
    },
    {
      color: "info.main",
      filter: "arriving",
      icon: <EventAvailableRoundedIcon fontSize="small" />,
      label: t("Arriving today", "Wanaofika leo"),
      value: directory.summary.arrivingToday,
    },
    {
      color: "primary.main",
      icon: <ReplayRoundedIcon fontSize="small" />,
      label: t("Returning guests", "Wageni wanaorudi"),
      value: directory.summary.returning,
    },
  ];

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        display: "grid",
        gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", lg: "repeat(4,minmax(0,1fr))" },
        overflow: "hidden",
      }}
    >
      {items.map((item) => (
        <Box
          component={item.filter ? "button" : "div"}
          key={item.label}
          onClick={item.filter ? () => onFilter(item.filter as GuestStayFilter) : undefined}
          sx={{
            appearance: "none",
            bgcolor: "background.paper",
            border: 0,
            borderBottom: { xs: "1px solid", lg: 0 },
            borderColor: "divider",
            borderRight: "1px solid",
            color: "inherit",
            cursor: item.filter ? "pointer" : "default",
            font: "inherit",
            minWidth: 0,
            p: { xs: 1.25, sm: 1.6 },
            textAlign: "left",
            "&:nth-of-type(2n)": { borderRight: { xs: 0, lg: "1px solid" } },
            "&:nth-last-of-type(-n + 2)": { borderBottom: 0 },
            "&:last-of-type": { borderRight: 0 },
            "&:hover": item.filter ? { bgcolor: "action.hover" } : undefined,
            "&:focus-visible": item.filter
              ? { outline: "3px solid", outlineColor: "primary.main", outlineOffset: -3 }
              : undefined,
          }}
        >
          <Stack direction="row" spacing={0.65} sx={{ alignItems: "center", color: item.color }}>
            {item.icon}
            <Typography color="text.secondary" sx={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".055em", textTransform: "uppercase" }}>
              {item.label}
            </Typography>
          </Stack>
          <Typography sx={{ color: item.color, fontSize: { xs: "1.15rem", sm: "1.45rem" }, fontVariantNumeric: "tabular-nums", fontWeight: 700, letterSpacing: "-.025em", mt: 0.65 }}>
            {item.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function GuestTable({ directory }: { directory: GuestDirectory }) {
  const { t } = useLanguage();
  const showFinance = directory.capabilities.viewFinance;
  const columns = showFinance
    ? "minmax(250px,1.35fr) minmax(190px,1fr) minmax(180px,.9fr) 110px minmax(140px,.7fr) 44px"
    : "minmax(270px,1.45fr) minmax(210px,1fr) minmax(190px,.9fr) 110px 44px";

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Box sx={{ bgcolor: "background.default", borderBottom: "1px solid", borderColor: "divider", display: "grid", gap: 1.5, gridTemplateColumns: columns, px: 2, py: 1.15 }}>
        <TableLabel>{t("Guest", "Mgeni")}</TableLabel>
        <TableLabel>{t("Stay position", "Hali ya ukaaji")}</TableLabel>
        <TableLabel>{t("Contact", "Mawasiliano")}</TableLabel>
        <TableLabel>{t("Visits", "Ziara")}</TableLabel>
        {showFinance ? <TableLabel>{t("Lifetime value", "Thamani ya jumla")}</TableLabel> : null}
        <span aria-hidden />
      </Box>
      <Stack divider={<Divider flexItem />}>
        {directory.guests.map((guest) => (
          <GuestTableRow
            columns={columns}
            guest={guest}
            key={guest.id}
            showFinance={showFinance}
          />
        ))}
      </Stack>
    </Paper>
  );
}

function TableLabel({ children }: { children: ReactNode }) {
  return (
    <Typography color="text.secondary" sx={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".065em", textTransform: "uppercase" }}>
      {children}
    </Typography>
  );
}

function GuestTableRow({
  columns,
  guest,
  showFinance,
}: {
  columns: string;
  guest: GuestDirectoryItem;
  showFinance: boolean;
}) {
  const { t } = useLanguage();
  const status = guestDirectoryStatus(guest);
  return (
    <Box
      sx={{
        alignItems: "center",
        display: "grid",
        gap: 1.5,
        gridTemplateColumns: columns,
        minWidth: 0,
        px: 2,
        py: 1.25,
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Stack component={Link} direction="row" href={`/guests/${guest.id}`} spacing={1.15} sx={{ alignItems: "center", color: "inherit", minWidth: 0, textDecoration: "none" }}>
        <GuestAvatar name={guest.name} />
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: ".875rem", fontWeight: 700 }}>
            {guest.name}
          </Typography>
          <Stack direction="row" spacing={0.6} sx={{ alignItems: "center", mt: 0.35 }}>
            <GuestStatusChip status={status} />
            {guest.nationality ? (
              <Typography color="text.secondary" noWrap variant="caption">
                {guest.nationality}
              </Typography>
            ) : null}
          </Stack>
        </Box>
      </Stack>
      <GuestStayPosition guest={guest} />
      <Box sx={{ minWidth: 0 }}>
        <Typography noWrap variant="body2" sx={{ fontWeight: 500 }}>
          {guest.phone || t("No phone", "Hakuna simu")}
        </Typography>
        <Typography color="text.secondary" noWrap variant="caption">
          {guest.email || t("No email address", "Hakuna barua pepe")}
        </Typography>
      </Box>
      <Box>
        <Typography sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
          {guest.totalStays}
        </Typography>
        <Typography color="text.secondary" variant="caption">
          {t("stays", "ukaa")}
        </Typography>
      </Box>
      {showFinance ? (
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
            {guest.commercial ? money.format(guest.commercial.lifetimeBooked) : "—"}
          </Typography>
          {guest.commercial?.outstandingBalance ? (
            <Typography color="warning.main" noWrap variant="caption">
              {t("Balance", "Salio")} {money.format(guest.commercial.outstandingBalance)}
            </Typography>
          ) : null}
        </Box>
      ) : null}
      <IconButton
        aria-label={t(`Open ${guest.name}`, `Fungua ${guest.name}`)}
        component={Link}
        href={`/guests/${guest.id}`}
        size="small"
      >
        <ArrowForwardRoundedIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

function GuestStayPosition({ guest }: { guest: GuestDirectoryItem }) {
  const { t } = useLanguage();
  if (guest.currentStay) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Typography noWrap variant="body2" sx={{ color: "success.main", fontWeight: 700 }}>
          {guest.currentStay.roomName}
        </Typography>
        <Typography color="text.secondary" noWrap variant="caption">
          {t("Until", "Hadi")} {formatLocalDate(guest.currentStay.checkOut)}
        </Typography>
      </Box>
    );
  }
  if (guest.nextStayDate) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Typography noWrap variant="body2" sx={{ color: "info.main", fontWeight: 700 }}>
          {formatLocalDate(guest.nextStayDate)}
        </Typography>
        <Typography color="text.secondary" noWrap variant="caption">
          {t("Next arrival", "Kuwasili ijayo")}
        </Typography>
      </Box>
    );
  }
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography noWrap variant="body2" sx={{ fontWeight: 500 }}>
        {guest.lastStayDate ? formatLocalDate(guest.lastStayDate) : "—"}
      </Typography>
      <Typography color="text.secondary" noWrap variant="caption">
        {guest.lastStayDate
          ? t("Last departure", "Kuondoka mwisho")
          : t("No completed stay", "Hakuna ukaaji uliokamilika")}
      </Typography>
    </Box>
  );
}

function GuestContactCard({
  guest,
  showFinance,
}: {
  guest: GuestDirectoryItem;
  showFinance: boolean;
}) {
  const { t } = useLanguage();
  const status = guestDirectoryStatus(guest);
  return (
    <Paper
      variant="outlined"
      sx={{
        contentVisibility: "auto",
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <Stack spacing={1.25} sx={{ p: 1.5 }}>
        <Stack direction="row" spacing={1.1} sx={{ alignItems: "flex-start" }}>
          <GuestAvatar name={guest.name} size={44} />
          <Box component={Link} href={`/guests/${guest.id}`} sx={{ color: "inherit", flex: 1, minWidth: 0, textDecoration: "none" }}>
            <Typography noWrap sx={{ fontWeight: 700 }}>
              {guest.name}
            </Typography>
            <Typography color="text.secondary" noWrap variant="caption">
              {guest.nationality || t("Nationality not recorded", "Uraia haujaandikwa")}
            </Typography>
          </Box>
          <GuestStatusChip status={status} />
        </Stack>

        <Divider />
        <GuestStayPosition guest={guest} />

        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          {guest.phone ? (
            <Tooltip title={t("Call guest", "Mpigie mgeni")}>
              <IconButton aria-label={t("Call guest", "Mpigie mgeni")} component="a" href={`tel:${guest.phone}`} size="small" sx={{ border: "1px solid", borderColor: "divider" }}>
                <PhoneOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
          {guest.email ? (
            <Tooltip title={t("Email guest", "Mtumie barua pepe")}>
              <IconButton aria-label={t("Email guest", "Mtumie barua pepe")} component="a" href={`mailto:${guest.email}`} size="small" sx={{ border: "1px solid", borderColor: "divider" }}>
                <EmailOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
          <Typography color="text.secondary" sx={{ flex: 1, fontSize: ".75rem", textAlign: "right" }}>
            {t(`${guest.totalStays} stay${guest.totalStays === 1 ? "" : "s"}`, `Ukaaji ${guest.totalStays}`)}
          </Typography>
        </Stack>

        {showFinance && guest.commercial ? (
          <Box sx={{ bgcolor: "action.hover", borderRadius: 0.75, display: "flex", justifyContent: "space-between", px: 1, py: 0.75 }}>
            <Typography color="text.secondary" variant="caption">
              {t("Lifetime value", "Thamani ya jumla")}
            </Typography>
            <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
              {money.format(guest.commercial.lifetimeBooked)}
            </Typography>
          </Box>
        ) : null}

        <Button component={Link} href={`/guests/${guest.id}`} endIcon={<ArrowForwardRoundedIcon />} fullWidth variant="text">
          {t("Open guest profile", "Fungua wasifu wa mgeni")}
        </Button>
      </Stack>
    </Paper>
  );
}

function GuestEmptyState({
  canCreateBooking,
  filtered,
  onClear,
}: {
  canCreateBooking: boolean;
  filtered: boolean;
  onClear: () => void;
}) {
  const { t } = useLanguage();
  return (
    <Paper variant="outlined" sx={{ p: { xs: 3, sm: 5 }, textAlign: "center" }}>
      <Box sx={{ bgcolor: "action.hover", borderRadius: "50%", color: "primary.main", display: "grid", height: 48, mx: "auto", placeItems: "center", width: 48 }}>
        <GroupsRoundedIcon />
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mt: 1.5 }}>
        {filtered
          ? t("No guests match this view", "Hakuna wageni wanaolingana")
          : t("Your guest directory starts here", "Orodha yako ya wageni inaanzia hapa")}
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 440, mx: "auto", mt: 0.5 }} variant="body2">
        {filtered
          ? t("Try a different name or stay filter.", "Jaribu jina au kichujio kingine cha ukaaji.")
          : t("Guest profiles appear automatically when the first booking is created.", "Wasifu wa wageni utaonekana baada ya uhifadhi wa kwanza kutengenezwa.")}
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "center", mt: 2 }}>
        {filtered ? (
          <Button onClick={onClear} variant="outlined">
            {t("Clear filters", "Ondoa vichujio")}
          </Button>
        ) : null}
        {!filtered && canCreateBooking ? (
          <Button component={Link} href="/bookings/new" startIcon={<AddRoundedIcon />} variant="contained">
            {t("Create first booking", "Tengeneza uhifadhi wa kwanza")}
          </Button>
        ) : null}
      </Stack>
    </Paper>
  );
}

function GuestsLoading() {
  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>
      <Stack spacing={2}>
        <Box><Skeleton width={116} /><Skeleton height={42} width="32%" /><Skeleton width="52%" /></Box>
        <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "repeat(2,1fr)", md: "repeat(4,1fr)" } }}>
          {[0, 1, 2, 3].map((item) => <Skeleton height={94} key={item} variant="rounded" />)}
        </Box>
        <Skeleton height={102} variant="rounded" />
        <Stack spacing={1}>
          {[0, 1, 2, 3, 4].map((item) => <Skeleton height={72} key={item} variant="rounded" />)}
        </Stack>
      </Stack>
    </Container>
  );
}

function GuestsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useLanguage();
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 5, sm: 8 } }}>
      <Alert
        severity="error"
        action={
          <Button color="inherit" onClick={onRetry} startIcon={<RefreshRoundedIcon />}>
            {t("Retry", "Jaribu tena")}
          </Button>
        }
      >
        {message}
      </Alert>
    </Container>
  );
}

function GuestsAccessLimited() {
  const { t } = useLanguage();
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 5, sm: 8 } }}>
      <Alert severity="info">
        {t(
          "Your workspace role does not include access to the guest directory.",
          "Jukumu lako halina ruhusa ya kuona orodha ya wageni.",
        )}
      </Alert>
    </Container>
  );
}
