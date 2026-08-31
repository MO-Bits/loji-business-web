"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import BedtimeRoundedIcon from "@mui/icons-material/BedtimeRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import QueryStatsRoundedIcon from "@mui/icons-material/QueryStatsRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import {
  Alert,
  Box,
  Button,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

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
import type { PropertyReport, RoomPerformance } from "@/features/reports/models/report";
import { getPropertyReport } from "@/features/reports/services/report-service";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { getWorkspaceCapabilities } from "@/features/session/permissions";
import { createClient } from "@/lib/supabase/client";

const DAY = 86_400_000;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const iso = (date: Date) => date.toISOString().slice(0, 10);
const parseDateKey = (value: string) => new Date(`${value}T00:00:00Z`);
const isDateKey = (value: unknown): value is string => {
  if (typeof value !== "string" || !DATE_KEY.test(value)) return false;
  const parsed = parseDateKey(value);
  return !Number.isNaN(parsed.getTime()) && iso(parsed) === value;
};
const addDays = (value: string, days: number) =>
  iso(new Date(parseDateKey(value).getTime() + days * DAY));
const formatDateKey = (
  value: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
) => new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(
  parseDateKey(value),
);
const rangeIsInvalid = (from: string, to: string) => {
  if (!from || !to || to < from) return true;
  return (Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / DAY > 366;
};
const money = (amount: number) =>
  new Intl.NumberFormat("en-TZ", {
    style: "currency",
    currency: "TZS",
    maximumFractionDigits: 0,
  }).format(amount);
const percent = (value: number) => `${Math.round(value)}%`;
const csvCell = (value: string | number) => {
  const raw = String(value);
  const protectedValue = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${protectedValue.replaceAll('"', '""')}"`;
};

type Period = "7" | "30" | "90" | "custom";

export function ReportsScreen() {
  const { language, t } = useLanguage();
  const { loading: sessionLoading, session } = useAppSession();
  const supabase = useMemo(() => createClient(), []);
  const bootstrapDate = useMemo(() => iso(new Date()), []);
  const propertyId = session?.activePropertyId;
  const sessionBusinessDate = isDateKey(session?.property?.business_date)
    ? session.property.business_date
    : isDateKey(session?.property?.businessDate)
      ? session.property.businessDate
      : null;
  const rangeAnchor = sessionBusinessDate ?? bootstrapDate;
  const [rangeState, setRangeState] = useState<{
    propertyId: string;
    period: Period;
    from: string;
    to: string;
  } | null>(null);
  const activeRange = rangeState && propertyId && rangeState.propertyId === propertyId
    ? rangeState
    : {
        period: "30" as Period,
        from: addDays(rangeAnchor, -29),
        to: rangeAnchor,
      };
  const { period, from, to } = activeRange;
  const [reportState, setReportState] = useState<{
    propertyId: string;
    value: PropertyReport;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<{ propertyId: string; message: string } | null>(null);
  const requestId = useRef(0);
  const initializedBusinessContext = useRef<string | null>(null);
  const report = reportState && reportState.propertyId === propertyId
    ? reportState.value
    : null;
  const error = errorState && errorState.propertyId === propertyId
    ? errorState.message
    : null;
  const propertyIsChanging = Boolean(reportState && reportState.propertyId !== propertyId);
  const dataLoading = loading || propertyIsChanging;
  const canView = getWorkspaceCapabilities(session?.activeRole).canViewReports;
  const invalidRange = rangeIsInvalid(from, to);

  const load = useCallback(async () => {
    if (!propertyId || !canView || invalidRange) {
      requestId.current += 1;
      setReportState(null);
      setLoading(false);
      return;
    }
    const currentRequest = ++requestId.current;
    const requestPropertyId = propertyId;
    setLoading(true);
    setErrorState(null);
    setReportState((current) => current?.propertyId === requestPropertyId ? current : null);
    let awaitingAlignedReload = false;
    try {
      const value = await getPropertyReport(supabase, requestPropertyId, from, to);
      if (requestId.current === currentRequest) {
        const businessDate = isDateKey(value.businessDate) ? value.businessDate : null;
        const businessContext = businessDate
          ? `${requestPropertyId}:${businessDate}`
          : null;
        if (
          businessDate
          && period !== "custom"
          && initializedBusinessContext.current !== businessContext
        ) {
          initializedBusinessContext.current = businessContext;
          const alignedFrom = addDays(businessDate, -(Number(period) - 1));
          if (from !== alignedFrom || to !== businessDate) {
            awaitingAlignedReload = true;
            setRangeState({
              propertyId: requestPropertyId,
              period,
              from: alignedFrom,
              to: businessDate,
            });
            return;
          }
        }
        setReportState({ propertyId: requestPropertyId, value });
      }
    } catch (caught) {
      if (requestId.current === currentRequest) {
        setErrorState({
          propertyId: requestPropertyId,
          message: caught instanceof Error ? caught.message : t("Unable to load reports.", "Imeshindikana kupakia ripoti."),
        });
      }
    } finally {
      if (requestId.current === currentRequest && !awaitingAlignedReload) {
        setLoading(false);
      }
    }
  }, [canView, from, invalidRange, period, propertyId, supabase, t, to]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(timer);
      requestId.current += 1;
    };
  }, [load]);

  const selectPeriod = (next: Period) => {
    if (!propertyId) return;
    if (next === "custom") return;
    const businessDate = isDateKey(report?.businessDate)
      ? report.businessDate
      : rangeAnchor;
    setRangeState({
      propertyId,
      period: next,
      from: addDays(businessDate, -(Number(next) - 1)),
      to: businessDate,
    });
  };

  const exportCsv = () => {
    if (!report) return;
    const rows: (string | number)[][] = [
      [t("Loji property performance report", "Ripoti ya utendaji wa biashara ya Loji")],
      [t("From", "Kuanzia"), from, t("To", "Hadi"), to],
      [],
      [t("Summary", "Muhtasari")],
      [t("Room revenue", "Mapato ya vyumba"), report.summary.roomRevenue],
      [t("Collected", "Iliyokusanywa"), report.summary.collected],
      [t("Occupancy rate", "Kiwango cha matumizi ya vyumba"), report.summary.occupancyRate],
      [t("Average daily rate", "Wastani wa bei kwa siku"), report.summary.averageDailyRate],
      [t("Revenue per available room", "Mapato kwa kila chumba kinachopatikana"), report.summary.revenuePerAvailableRoom],
      [t("Room nights", "Usiku wa vyumba"), report.summary.roomNights],
      [t("Bookings", "Uhifadhi"), report.summary.bookings],
      [t("Cancellations", "Uhifadhi ulioghairiwa"), report.summary.cancellations],
      [],
      [t("Daily performance", "Utendaji wa kila siku")],
      [
        t("Date", "Tarehe"),
        t("Room revenue", "Mapato ya vyumba"),
        t("Collected", "Iliyokusanywa"),
        t("Occupancy rate", "Kiwango cha matumizi ya vyumba"),
        t("Room nights", "Usiku wa vyumba"),
      ],
      ...report.daily.map((item) => [
        item.date,
        item.roomRevenue,
        item.collected,
        item.occupancyRate,
        item.roomNights,
      ]),
      [],
      [t("Room performance", "Utendaji wa vyumba")],
      [
        t("Room", "Chumba"),
        t("Type", "Aina"),
        t("Room revenue", "Mapato ya vyumba"),
        t("Room nights", "Usiku wa vyumba"),
        t("Occupancy rate", "Kiwango cha matumizi ya vyumba"),
      ],
      ...report.rooms.map((room) => [
        room.roomName,
        room.roomType,
        room.roomRevenue,
        room.roomNights,
        room.occupancyRate,
      ]),
      [],
      [t("Booking sources", "Vyanzo vya uhifadhi")],
      [t("Source", "Chanzo"), t("Bookings", "Uhifadhi"), t("Revenue", "Mapato")],
      ...report.sources.map((source) => [source.source, source.bookings, source.revenue]),
    ];
    const csv = rows
      .map((row) => row.map(csvCell).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `loji-performance-${from}-${to}.csv`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  if (!sessionLoading && !canView) {
    return (
      <WorkspacePage>
        <Alert severity="warning">
          {t(
            "Performance reports are available to property owners only.",
            "Ripoti za utendaji zinapatikana kwa wamiliki wa biashara pekee.",
          )}
        </Alert>
      </WorkspacePage>
    );
  }

  if (!sessionLoading && !propertyId) {
    return (
      <WorkspacePage>
        <Alert severity="info">
          {t("Choose or create a property to open reports.", "Chagua au unda biashara ili kufungua ripoti.")}
        </Alert>
      </WorkspacePage>
    );
  }

  const summary = report?.summary;
  const maxRevenue = Math.max(1, ...(report?.daily.map((item) => item.roomRevenue) ?? [0]));
  const totalSourceBookings = report?.sources.reduce(
    (total, source) => total + source.bookings,
    0,
  ) ?? 0;
  const locale = language === "sw" ? "sw-TZ" : "en-TZ";

  return (
    <WorkspacePage>
      <Stack spacing={{ xs: 2.5, sm: 3 }}>
        <PageHeader
          title={t("Reports", "Ripoti")}
          description={t(
            "Understand occupancy, room revenue and the performance behind every stay.",
            "Elewa ukaaji, mapato ya vyumba na utendaji wa kila ukaaji.",
          )}
          action={
            <Button
              disabled={!report?.daily.length}
              onClick={exportCsv}
              startIcon={<DownloadRoundedIcon />}
              variant="outlined"
            >
              {t("Export CSV", "Pakua CSV")}
            </Button>
          }
        />

        <Surface sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            sx={{ alignItems: { md: "center" }, justifyContent: "space-between" }}
          >
            <Box
              aria-label={t("Report period", "Kipindi cha ripoti")}
              role="group"
              sx={{ display: "grid", gap: 0.75, gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(4, auto)" } }}
            >
              {(["7", "30", "90"] as const).map((value) => (
                <Button
                  aria-pressed={period === value}
                  key={value}
                  onClick={() => selectPeriod(value)}
                  variant={period === value ? "contained" : "outlined"}
                >
                  {value} {t("days", "siku")}
                </Button>
              ))}
              <Button
                aria-pressed={period === "custom"}
                onClick={() => {
                  if (!propertyId) return;
                  setRangeState({ propertyId, period: "custom", from, to });
                }}
                variant={period === "custom" ? "contained" : "outlined"}
              >
                {t("Custom", "Chagua")}
              </Button>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: { xs: "100%", md: "auto" } }}>
              <TextField
                fullWidth
                label={t("From", "Kuanzia")}
                onChange={(event) => {
                  if (!propertyId) return;
                  setRangeState({ propertyId, period: "custom", from: event.target.value, to });
                }}
                slotProps={{ htmlInput: { max: to }, inputLabel: { shrink: true } }}
                type="date"
                value={from}
              />
              <TextField
                fullWidth
                label={t("To", "Hadi")}
                onChange={(event) => {
                  if (!propertyId) return;
                  setRangeState({ propertyId, period: "custom", from, to: event.target.value });
                }}
                slotProps={{ htmlInput: { min: from }, inputLabel: { shrink: true } }}
                type="date"
                value={to}
              />
            </Stack>
          </Stack>
        </Surface>

        {invalidRange ? (
          <Alert severity="warning">
            {t("Choose a valid report range of one year or less.", "Chagua kipindi sahihi cha ripoti cha mwaka mmoja au chini.")}
          </Alert>
        ) : null}

        {dataLoading ? <LinearProgress sx={{ borderRadius: 99 }} /> : null}
        {error ? (
          <Alert action={<Button onClick={() => void load()}>{t("Retry", "Jaribu tena")}</Button>} severity="error">
            {error}
          </Alert>
        ) : null}

        <Box
          sx={{
            display: "grid",
            gap: { xs: 1.5, sm: 2 },
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" },
          }}
        >
          <MetricCell
            caption={t("Value of occupied room nights", "Thamani ya usiku wa vyumba vilivyotumika")}
            icon={<PaymentsRoundedIcon />}
            label={t("Room revenue", "Mapato ya vyumba")}
            tone="success"
            value={dataLoading && !report ? "—" : money(summary?.roomRevenue ?? 0)}
          />
          <MetricCell
            caption={`${summary?.roomNights ?? 0} ${t("room nights sold", "usiku wa vyumba uliouzwa")}`}
            icon={<HotelRoundedIcon />}
            label={t("Occupancy", "Ukaaji")}
            tone="info"
            value={dataLoading && !report ? "—" : percent(summary?.occupancyRate ?? 0)}
          />
          <MetricCell
            caption={t("Revenue per occupied room night", "Mapato kwa usiku wa chumba kilichotumika")}
            icon={<TrendingUpRoundedIcon />}
            label={t("Average daily rate", "Wastani wa bei kwa siku")}
            value={dataLoading && !report ? "—" : money(summary?.averageDailyRate ?? 0)}
          />
          <MetricCell
            caption={t("Revenue per available room night", "Mapato kwa usiku wa chumba kilichopatikana")}
            icon={<QueryStatsRoundedIcon />}
            label="RevPAR"
            value={dataLoading && !report ? "—" : money(summary?.revenuePerAvailableRoom ?? 0)}
          />
        </Box>

        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.5fr) minmax(280px, .5fr)" },
          }}
        >
          <Surface>
            <SectionHeading
              description={t(
                "Room revenue by business date for the selected period.",
                "Mapato ya vyumba kwa tarehe ya biashara katika kipindi kilichochaguliwa.",
              )}
              title={t("Revenue performance", "Utendaji wa mapato")}
            />
            {!report?.daily.length && !dataLoading ? (
              <EmptyState
                description={t("Choose another period or create a booking to begin reporting.", "Chagua kipindi kingine au unda uhifadhi kuanza ripoti.")}
                icon={<AssessmentRoundedIcon />}
                title={t("No report data yet", "Bado hakuna data ya ripoti")}
              />
            ) : (
              <Stack
                direction="row"
                spacing={0.75}
                sx={{ alignItems: "flex-end", height: 230, mt: 3, overflowX: "auto", pb: 1 }}
              >
                {(report?.daily ?? []).map((item, index) => (
                  <Stack
                    key={item.date}
                    spacing={0.75}
                    sx={{ alignItems: "center", flex: 1, height: "100%", justifyContent: "flex-end", minWidth: 28 }}
                  >
                    <Box
                      aria-label={`${item.date}: ${money(item.roomRevenue)}`}
                      role="img"
                      title={`${item.date}: ${money(item.roomRevenue)}`}
                      sx={{
                        bgcolor: "primary.main",
                        borderRadius: "7px 7px 2px 2px",
                        height: `${Math.max(6, (item.roomRevenue / maxRevenue) * 175)}px`,
                        minHeight: 6,
                        opacity: item.roomRevenue ? 1 : 0.16,
                        width: "min(26px, 72%)",
                      }}
                    />
                    {index % Math.max(1, Math.ceil((report?.daily.length ?? 1) / 7)) === 0 ? (
                      <Typography color="text.secondary" variant="caption">
                        {formatDateKey(item.date, locale, { day: "numeric", month: "short" })}
                      </Typography>
                    ) : null}
                  </Stack>
                ))}
              </Stack>
            )}
          </Surface>

          <Surface>
            <SectionHeading title={t("Booking mix", "Mchanganyiko wa uhifadhi")} />
            <Stack spacing={2.25} sx={{ mt: 2.5 }}>
              {(report?.sources ?? []).map((item) => {
                const share = totalSourceBookings ? (item.bookings / totalSourceBookings) * 100 : 0;
                return (
                  <Box key={item.source}>
                    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                      <Box>
                        <Typography sx={{ fontWeight: 500, textTransform: "capitalize" }} variant="body2">
                          {item.source.replaceAll("_", " ")}
                        </Typography>
                        <Typography color="text.secondary" variant="caption">
                          {item.bookings} {t("bookings", "uhifadhi")}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }} variant="body2">
                        {money(item.revenue)}
                      </Typography>
                    </Stack>
                    <LinearProgress sx={{ borderRadius: 99, height: 6, mt: 1 }} value={share} variant="determinate" />
                  </Box>
                );
              })}
              {!report?.sources.length && !dataLoading ? (
                <Typography color="text.secondary" variant="body2">
                  {t("No booking sources in this period.", "Hakuna vyanzo vya uhifadhi katika kipindi hiki.")}
                </Typography>
              ) : null}
            </Stack>
          </Surface>
        </Box>

        <Surface padding={false}>
          <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
            <SectionHeading
              action={report?.timezone ? <StatusPill label={report.timezone} /> : undefined}
              description={t(
                "Compare utilization and earned room revenue across your inventory.",
                "Linganisha matumizi na mapato ya vyumba katika biashara yako.",
              )}
              title={t("Room performance", "Utendaji wa vyumba")}
            />
          </Box>
          {dataLoading && !report ? (
            <LoadingRows rows={5} />
          ) : !report?.rooms.length ? (
            <EmptyState
              actionHref="/rooms"
              actionLabel={t("View rooms", "Angalia vyumba")}
              description={t("Room results will appear once stays fall within this period.", "Matokeo ya vyumba yataonekana baada ya ukaaji kuwepo katika kipindi hiki.")}
              icon={<BedtimeRoundedIcon />}
              title={t("No room performance yet", "Bado hakuna utendaji wa vyumba")}
            />
          ) : (
            <>
              <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t("Room", "Chumba")}</TableCell>
                      <TableCell align="right">{t("Room nights", "Usiku wa chumba")}</TableCell>
                      <TableCell align="right">{t("Occupancy", "Ukaaji")}</TableCell>
                      <TableCell align="right">{t("Revenue", "Mapato")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(report?.rooms ?? []).map((room) => <RoomRow key={room.roomId} room={room} />)}
                  </TableBody>
                </Table>
              </TableContainer>
              <Stack divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />} sx={{ display: { xs: "flex", md: "none" } }}>
                {(report?.rooms ?? []).map((room) => <RoomCard key={room.roomId} room={room} />)}
              </Stack>
            </>
          )}
        </Surface>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between" }}>
          <Typography color="text.secondary" variant="caption">
            {t(
              "Room revenue is based on stay value; collections are based on completed payments.",
              "Mapato ya vyumba yanatokana na thamani ya ukaaji; makusanyo yanatokana na malipo yaliyokamilika.",
            )}
          </Typography>
          <Button component={Link} href="/calendar" size="small" startIcon={<CalendarMonthRoundedIcon />}>
            {t("Open calendar", "Fungua kalenda")}
          </Button>
        </Stack>
      </Stack>
    </WorkspacePage>
  );
}

function RoomRow({ room }: { room: RoomPerformance }) {
  return (
    <TableRow hover>
      <TableCell>
        <Typography sx={{ fontWeight: 700 }} variant="body2">{room.roomName}</Typography>
        <Typography color="text.secondary" sx={{ textTransform: "capitalize" }} variant="caption">
          {room.roomType.replaceAll("_", " ")}
        </Typography>
      </TableCell>
      <TableCell align="right">{room.roomNights}</TableCell>
      <TableCell align="right">{percent(room.occupancyRate)}</TableCell>
      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
        {money(room.roomRevenue)}
      </TableCell>
    </TableRow>
  );
}

function RoomCard({ room }: { room: RoomPerformance }) {
  const { t } = useLanguage();

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 700 }}>{room.roomName}</Typography>
          <Typography color="text.secondary" variant="body2">
            {t(`${room.roomNights} room nights`, `Usiku wa vyumba ${room.roomNights}`)} · {percent(room.occupancyRate)} {t("occupancy", "matumizi")}
          </Typography>
        </Box>
        <Typography sx={{ flexShrink: 0, fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
          {money(room.roomRevenue)}
        </Typography>
      </Stack>
    </Box>
  );
}
