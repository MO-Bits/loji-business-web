"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import {
  Alert,
  Box,
  Button,
  IconButton,
  Stack,
  TablePagination,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { PageHeader } from "@/components/shared/page-header";
import {
  EmptyState,
  LoadingRows,
  StatusPill,
  Surface,
  WorkspacePage,
} from "@/components/shared/workspace-ui";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { getWorkspaceCapabilities } from "@/features/session/permissions";
import type { CalendarBooking } from "@/features/calendar/models/calendar";
import { getPropertyCalendar } from "@/features/calendar/services/calendar-service";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/providers/language-provider";

const DAY = 86_400_000;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const CALENDAR_PAGE_SIZE_OPTIONS = [20, 40, 80];

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_KEY.test(value)) return false;
  const parsed = parseDate(value);
  return !Number.isNaN(parsed.getTime()) && isoDate(parsed) === value;
}

function addDays(value: string, days: number) {
  return isoDate(new Date(parseDate(value).getTime() + days * DAY));
}

function formatDate(
  value: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(
    parseDate(value),
  );
}

function daysBetween(from: string, to: string) {
  return Math.max(1, Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / DAY));
}

function calendarDays(from: string, to: string) {
  const count = Math.min(daysBetween(from, to) + 1, 31);
  return Array.from({ length: count }, (_, index) => addDays(from, index));
}

function statusTone(status: string): "danger" | "info" | "neutral" | "success" | "warning" {
  if (status === "checked_in") return "success";
  if (status === "confirmed" || status === "reserved") return "info";
  if (status === "pending") return "warning";
  if (status === "cancelled" || status === "no_show") return "danger";
  return "neutral";
}

export function CalendarScreen() {
  const { loading: sessionLoading, session } = useAppSession();
  const { language, t } = useLanguage();
  const theme = useTheme();
  const isDesktopLayout = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: false,
  });
  const supabase = useMemo(() => createClient(), []);
  const bootstrapDate = useMemo(() => isoDate(new Date()), []);
  const propertyId = session?.activePropertyId;
  const sessionBusinessDate = isDateKey(session?.property?.business_date)
    ? session.property.business_date
    : isDateKey(session?.property?.businessDate)
      ? session.property.businessDate
      : null;
  const rangeAnchor = sessionBusinessDate ?? bootstrapDate;
  const [rangeState, setRangeState] = useState<{
    propertyId: string;
    from: string;
    to: string;
  } | null>(null);
  const activeRange = rangeState && propertyId && rangeState.propertyId === propertyId
    ? rangeState
    : { from: rangeAnchor, to: addDays(rangeAnchor, 13) };
  const { from, to } = activeRange;
  const [calendarState, setCalendarState] = useState<{
    propertyId: string;
    value: Awaited<ReturnType<typeof getPropertyCalendar>>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [errorState, setErrorState] = useState<{ propertyId: string; message: string } | null>(null);
  const requestId = useRef(0);
  const initializedBusinessContext = useRef<string | null>(null);
  const customizedPropertyId = useRef<string | null>(null);
  const calendar = calendarState && calendarState.propertyId === propertyId
    ? calendarState.value
    : null;
  const error = errorState && errorState.propertyId === propertyId
    ? errorState.message
    : null;
  const propertyIsChanging = Boolean(calendarState && calendarState.propertyId !== propertyId);
  const capabilities = getWorkspaceCapabilities(session?.activeRole);
  const canView = capabilities.canViewCalendar;
  const canCreateBooking = capabilities.canCreateBooking;
  const invalidRange = !from || !to || to < from;
  const bookingsByRoom = useMemo(() => {
    const grouped = new Map<string, CalendarBooking[]>();
    for (const booking of calendar?.bookings ?? []) {
      const existing = grouped.get(booking.roomId);
      if (existing) existing.push(booking);
      else grouped.set(booking.roomId, [booking]);
    }
    return grouped;
  }, [calendar?.bookings]);
  const sortedBookings = useMemo(
    () => [...(calendar?.bookings ?? [])].sort((a, b) => a.checkIn.localeCompare(b.checkIn)),
    [calendar?.bookings],
  );
  const collectionCount = isDesktopLayout
    ? calendar?.rooms.length ?? 0
    : sortedBookings.length;
  const safePage = Math.min(
    page,
    Math.max(0, Math.ceil(collectionCount / rowsPerPage) - 1),
  );
  const pagedRooms = useMemo(
    () => (calendar?.rooms ?? []).slice(
      safePage * rowsPerPage,
      (safePage + 1) * rowsPerPage,
    ),
    [calendar?.rooms, rowsPerPage, safePage],
  );
  const pagedBookings = useMemo(
    () => sortedBookings.slice(
      safePage * rowsPerPage,
      (safePage + 1) * rowsPerPage,
    ),
    [rowsPerPage, safePage, sortedBookings],
  );

  const load = useCallback(async () => {
    if (!propertyId || !canView || invalidRange) {
      requestId.current += 1;
      setCalendarState(null);
      setLoading(false);
      return;
    }
    const currentRequest = ++requestId.current;
    const requestPropertyId = propertyId;
    setLoading(true);
    setErrorState(null);
    setCalendarState((current) => current?.propertyId === requestPropertyId ? current : null);
    let awaitingAlignedReload = false;
    try {
      const value = await getPropertyCalendar(supabase, requestPropertyId, from, to);
      if (requestId.current === currentRequest) {
        const businessDate = isDateKey(value.businessDate) ? value.businessDate : null;
        const businessContext = businessDate
          ? `${requestPropertyId}:${businessDate}`
          : null;
        if (businessDate && initializedBusinessContext.current !== businessContext) {
          initializedBusinessContext.current = businessContext;
          if (customizedPropertyId.current !== requestPropertyId) {
            const alignedTo = addDays(businessDate, 13);
            if (from !== businessDate || to !== alignedTo) {
              awaitingAlignedReload = true;
              setRangeState({
                propertyId: requestPropertyId,
                from: businessDate,
                to: alignedTo,
              });
              return;
            }
          }
        }
        setCalendarState({ propertyId: requestPropertyId, value });
      }
    } catch (caught) {
      if (requestId.current === currentRequest) {
        setErrorState({
          propertyId: requestPropertyId,
          message: caught instanceof Error ? caught.message : t("Unable to load the calendar.", "Imeshindikana kupakia kalenda."),
        });
      }
    } finally {
      if (requestId.current === currentRequest && !awaitingAlignedReload) {
        setLoading(false);
      }
    }
  }, [canView, from, invalidRange, propertyId, supabase, t, to]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(0);
      void load();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      requestId.current += 1;
    };
  }, [load]);

  const shift = (days: number) => {
    if (!propertyId) return;
    setPage(0);
    customizedPropertyId.current = propertyId;
    setRangeState({
      propertyId,
      from: addDays(from, days),
      to: addDays(to, days),
    });
  };

  const resetToday = () => {
    if (!propertyId) return;
    setPage(0);
    const businessDate = isDateKey(calendar?.businessDate)
      ? calendar.businessDate
      : rangeAnchor;
    customizedPropertyId.current = propertyId;
    setRangeState({
      propertyId,
      from: businessDate,
      to: addDays(businessDate, 13),
    });
  };

  if (!sessionLoading && !canView) {
    return (
      <WorkspacePage>
        <Alert severity="warning">{t("Your role cannot open the booking calendar.", "Jukumu lako haliruhusu kufungua kalenda ya uhifadhi.")}</Alert>
      </WorkspacePage>
    );
  }

  if (!sessionLoading && !propertyId) {
    return (
      <WorkspacePage>
        <Alert severity="info">
          {t("Choose or create a property to open its booking calendar.", "Chagua au unda biashara ili kufungua kalenda yake ya uhifadhi.")}
        </Alert>
      </WorkspacePage>
    );
  }

  const days = calendarDays(from, to);
  const locale = language === "sw" ? "sw-TZ" : "en-TZ";

  return (
    <WorkspacePage>
      <Stack spacing={{ xs: 2.5, sm: 3 }}>
        <PageHeader
          title={t("Calendar", "Kalenda")}
          description={t("See room availability, arrivals and in-house stays by date.", "Angalia upatikanaji wa vyumba, wanaowasili na waliopo kwa tarehe.")}
          action={canCreateBooking ? (
            <Button component={Link} href="/bookings/new" startIcon={<AddRoundedIcon />} variant="contained">
              {t("New booking", "Uhifadhi mpya")}
            </Button>
          ) : undefined}
        />

        <Surface sx={{ p: { xs: 1.25, sm: 1.5 } }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
              <IconButton aria-label={t("Previous dates", "Tarehe zilizopita")} onClick={() => shift(-14)}><ChevronLeftRoundedIcon /></IconButton>
              <Button onClick={resetToday} variant="outlined">{t("Today", "Leo")}</Button>
              <IconButton aria-label={t("Next dates", "Tarehe zinazofuata")} onClick={() => shift(14)}><ChevronRightRoundedIcon /></IconButton>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography color="text.secondary" variant="body2">
                {formatDate(from, locale, { day: "numeric", month: "short" })}
                {" – "}
                {formatDate(to, locale, { day: "numeric", month: "short", year: "numeric" })}
              </Typography>
              {calendar?.timezone ? <StatusPill label={calendar.timezone} tone="neutral" /> : null}
            </Stack>
          </Stack>
        </Surface>

        {invalidRange ? (
          <Alert severity="warning">
            {t("Choose an end date on or after the start date.", "Chagua tarehe ya mwisho iliyo sawa au baada ya tarehe ya kuanza.")}
          </Alert>
        ) : null}

        {error ? <Alert action={<Button onClick={() => void load()}>{t("Retry", "Jaribu tena")}</Button>} severity="error">{error}</Alert> : null}

        <Surface padding={false}>
          {loading || propertyIsChanging ? (
            <LoadingRows rows={7} />
          ) : !calendar?.rooms.length ? (
            <EmptyState
              actionHref={capabilities.canManageRooms ? "/rooms/new" : undefined}
              actionLabel={capabilities.canManageRooms ? t("Add a room", "Ongeza chumba") : undefined}
              description={capabilities.canManageRooms
                ? t("Add rooms before building your availability calendar.", "Ongeza vyumba kabla ya kutengeneza kalenda ya upatikanaji.")
                : t("A manager needs to add rooms before the availability calendar can be used.", "Meneja anahitaji kuongeza vyumba kabla ya kalenda ya upatikanaji kutumika.")}
              icon={<HotelRoundedIcon />}
              title={t("No rooms yet", "Hakuna vyumba bado")}
            />
          ) : (
            <>
              {isDesktopLayout ? (
                <Box sx={{ overflowX: "auto" }}>
                <Box sx={{ display: "grid", gridTemplateColumns: `180px repeat(${days.length}, minmax(92px, 1fr))`, minWidth: 180 + days.length * 92 }}>
                  <Box sx={{ bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", left: 0, p: 1.5, position: "sticky", zIndex: 3 }}>
                    <Typography color="text.secondary" variant="caption" sx={{ fontWeight: 700 }}>{t("Room", "Chumba")}</Typography>
                  </Box>
                  {days.map((day) => {
                    const date = parseDate(day);
                    const isToday = day === (
                      (isDateKey(calendar.businessDate) && calendar.businessDate)
                      || sessionBusinessDate
                      || bootstrapDate
                    );
                    return (
                      <Box key={day} sx={{ bgcolor: isToday ? "color-mix(in srgb, var(--mui-palette-primary-main) 7%, transparent)" : "background.paper", borderBottom: 1, borderLeft: 1, borderColor: "divider", p: 1, textAlign: "center" }}>
                        <Typography color={isToday ? "primary.main" : "text.secondary"} variant="caption" sx={{ display: "block", fontWeight: 700, textTransform: "uppercase" }}>
                          {new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "short" }).format(date)}
                        </Typography>
                        <Typography sx={{ fontVariantNumeric: "tabular-nums", fontWeight: isToday ? 700 : 500 }}>{date.getUTCDate()}</Typography>
                      </Box>
                    );
                  })}
                  {pagedRooms.map((room) => {
                    const roomBookings = bookingsByRoom.get(room.id) ?? [];
                    return (
                      <Box key={room.id} sx={{ display: "contents" }}>
                        <Box sx={{ bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", left: 0, minWidth: 0, p: 1.5, position: "sticky", zIndex: 2 }}>
                          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                            <Typography noWrap variant="body2" sx={{ fontWeight: 700 }}>{room.name}</Typography>
                            {!room.isActive ? <StatusPill label={t("Inactive", "Hakitumiki")} tone="neutral" /> : null}
                          </Stack>
                          <Typography color="text.secondary" noWrap variant="caption">
                            {(room.roomType || room.housekeepingStatus).replaceAll("_", " ")}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "grid", gridColumn: `2 / span ${days.length}`, gridTemplateColumns: `repeat(${days.length}, minmax(92px, 1fr))`, minHeight: 72, position: "relative" }}>
                          {days.map((day) => <Box key={day} sx={{ borderBottom: 1, borderLeft: 1, borderColor: "divider" }} />)}
                          {roomBookings.map((booking) => (
                            <TimelineBooking booking={booking} days={days} key={booking.id} />
                          ))}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
                </Box>
              ) : (
                <Box>
                {sortedBookings.length ? (
                  <Stack divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}>
                    {pagedBookings.map((booking) => (
                        <Box component={Link} href={`/bookings/${booking.id}`} key={booking.id} sx={{ color: "inherit", display: "block", p: 2, textDecoration: "none", "&:active": { bgcolor: "action.hover" } }}>
                          <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography noWrap sx={{ fontWeight: 700 }}>{booking.guestName}</Typography>
                              <Typography color="text.secondary" variant="body2">{booking.roomName} · {booking.checkIn} → {booking.checkOut}</Typography>
                            </Box>
                            <StatusPill label={booking.status.replaceAll("_", " ")} tone={statusTone(booking.status)} />
                          </Stack>
                        </Box>
                      ))}
                  </Stack>
                ) : (
                  <EmptyState description={t("No stays fall inside this date range.", "Hakuna ukaaji ndani ya tarehe hizi.")} icon={<CalendarMonthRoundedIcon />} title={t("Calendar is clear", "Kalenda iko wazi")} />
                )}
                </Box>
              )}
              {collectionCount > CALENDAR_PAGE_SIZE_OPTIONS[0] ? (
                <Box sx={{ borderTop: 1, borderColor: "divider" }}>
                  <TablePagination
                    component="div"
                    count={collectionCount}
                    labelDisplayedRows={({ from: first, to: last, count }) =>
                      isDesktopLayout
                        ? t(`${first}–${last} of ${count} rooms`, `${first}–${last} kati ya vyumba ${count}`)
                        : t(`${first}–${last} of ${count} stays`, `${first}–${last} kati ya ukaaji ${count}`)
                    }
                    labelRowsPerPage={isDesktopLayout
                      ? t("Rooms per page", "Vyumba kwa ukurasa")
                      : t("Stays per page", "Ukaaji kwa ukurasa")}
                    onPageChange={(_, nextPage) => setPage(nextPage)}
                    onRowsPerPageChange={(event) => {
                      setRowsPerPage(Number(event.target.value));
                      setPage(0);
                    }}
                    page={safePage}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={CALENDAR_PAGE_SIZE_OPTIONS}
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
                </Box>
              ) : null}
            </>
          )}
        </Surface>
      </Stack>
    </WorkspacePage>
  );
}

function TimelineBooking({ booking, days }: { booking: CalendarBooking; days: string[] }) {
  const { t } = useLanguage();
  const rangeStart = parseDate(days[0]);
  const start = Math.max(0, Math.floor((parseDate(booking.checkIn).getTime() - rangeStart.getTime()) / DAY));
  const end = Math.min(days.length, Math.max(start + 1, Math.ceil((parseDate(booking.checkOut).getTime() - rangeStart.getTime()) / DAY)));
  if (start >= days.length || end <= 0) return null;

  return (
    <Box
      component={Link}
      href={`/bookings/${booking.id}`}
      aria-label={t(
        `${booking.guestName}, ${booking.bookingNumber}, ${booking.checkIn} to ${booking.checkOut}`,
        `${booking.guestName}, ${booking.bookingNumber}, ${booking.checkIn} hadi ${booking.checkOut}`,
      )}
      sx={{
        alignSelf: "center",
        bgcolor: "color-mix(in srgb, var(--mui-palette-primary-main) 12%, var(--mui-palette-background-paper))",
        border: 1,
        borderColor: "color-mix(in srgb, var(--mui-palette-primary-main) 38%, var(--mui-palette-divider))",
        borderRadius: 2,
        color: "text.primary",
        gridColumn: `${start + 1} / span ${Math.max(1, end - start)}`,
        gridRow: 1,
        m: 0.75,
        minWidth: 0,
        overflow: "hidden",
        px: 1.25,
        py: 0.8,
        textDecoration: "none",
        zIndex: 1,
        "&:hover": { borderColor: "primary.main", boxShadow: "0 5px 18px rgba(0,122,255,.12)" },
      }}
    >
      <Typography noWrap variant="body2" sx={{ fontWeight: 700 }}>{booking.guestName}</Typography>
      <Typography color="text.secondary" noWrap variant="caption">{booking.bookingNumber}</Typography>
    </Box>
  );
}
