"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import QueryStatsRoundedIcon from "@mui/icons-material/QueryStatsRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Select,
  Skeleton,
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
import { useLanguage } from "@/components/providers/language-provider";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { getWorkspaceCapabilities } from "@/features/session/permissions";
import type { PaymentLedgerItem } from "@/features/finance/models/finance";
import {
  getPropertyFinanceDashboard,
  listPropertyPayments,
  reverseBookingPayment,
  type PaymentReversalAction,
} from "@/features/finance/services/finance-service";
import { createClient } from "@/lib/supabase/client";

const PAGE_SIZE = 25;
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
const formatTimestamp = (
  value: string,
  locale: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(date);
  } catch {
    return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(date);
  }
};
const rangeIsInvalid = (from: string, to: string) => {
  if (!from || !to || to < from) return true;
  return (Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / DAY > 366;
};
const money = (amount: number, currency = "TZS") => {
  try {
    return new Intl.NumberFormat("en-TZ", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${new Intl.NumberFormat("en-TZ", { maximumFractionDigits: 0 }).format(amount)}`;
  }
};
const csvCell = (value: string | number) => {
  const raw = String(value);
  const protectedValue = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${protectedValue.replaceAll('"', '""')}"`;
};
const paymentTone = (status: string): "danger" | "neutral" | "success" | "warning" => {
  if (status === "completed") return "success";
  if (status === "pending") return "warning";
  if (["failed", "refund", "refunded", "void", "voided"].includes(status)) return "danger";
  return "neutral";
};

export function FinanceScreen() {
  const { loading: sessionLoading, session } = useAppSession();
  const { language, t } = useLanguage();
  const feedback = useAppFeedback();
  const supabase = useMemo(() => createClient(), []);
  const bootstrapDate = useMemo(() => iso(new Date()), []);
  const propertyId = session?.activePropertyId;
  const activePropertyId = useRef(propertyId);
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
    : { from: addDays(rangeAnchor, -29), to: rangeAnchor };
  const { from, to } = activeRange;
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [financeState, setFinanceState] = useState<{
    propertyId: string;
    dashboard: Awaited<ReturnType<typeof getPropertyFinanceDashboard>>;
    ledger: Awaited<ReturnType<typeof listPropertyPayments>>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<{ propertyId: string; message: string } | null>(null);
  const [reversal, setReversal] = useState<{
    propertyId: string;
    item: PaymentLedgerItem;
    action: PaymentReversalAction;
    idempotencyKey: string;
  } | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [reversalError, setReversalError] = useState<string | null>(null);
  const [reversing, setReversing] = useState(false);
  const requestId = useRef(0);
  const reversalRequestId = useRef(0);
  const initializedBusinessContext = useRef<string | null>(null);
  const customizedPropertyId = useRef<string | null>(null);
  const dashboard = financeState && financeState.propertyId === propertyId
    ? financeState.dashboard
    : null;
  const ledger = financeState && financeState.propertyId === propertyId
    ? financeState.ledger
    : null;
  const error = errorState && errorState.propertyId === propertyId
    ? errorState.message
    : null;
  const propertyIsChanging = Boolean(financeState && financeState.propertyId !== propertyId);
  const dataLoading = loading || propertyIsChanging;
  const capabilities = getWorkspaceCapabilities(session?.activeRole);
  const canView = capabilities.canViewFinance;
  const canReverse = capabilities.canReversePayment;
  const activeReversal = reversal?.propertyId === propertyId ? reversal : null;
  const invalidRange = rangeIsInvalid(from, to);

  useEffect(() => {
    activePropertyId.current = propertyId;
  }, [propertyId]);

  const load = useCallback(async () => {
    if (!propertyId || !canView || invalidRange) {
      requestId.current += 1;
      setFinanceState(null);
      setLoading(false);
      return;
    }
    const currentRequest = ++requestId.current;
    const requestPropertyId = propertyId;
    setLoading(true);
    setErrorState(null);
    setFinanceState((current) => current?.propertyId === requestPropertyId ? current : null);
    let awaitingAlignedReload = false;
    try {
      const [nextDashboard, nextLedger] = await Promise.all([
        getPropertyFinanceDashboard(supabase, requestPropertyId, from, to),
        listPropertyPayments(supabase, {
          propertyId: requestPropertyId,
          from,
          to,
          query,
          method,
          status,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        }),
      ]);
      if (requestId.current === currentRequest) {
        const businessDate = isDateKey(nextDashboard.businessDate)
          ? nextDashboard.businessDate
          : null;
        const businessContext = businessDate
          ? `${requestPropertyId}:${businessDate}`
          : null;
        if (businessDate && initializedBusinessContext.current !== businessContext) {
          initializedBusinessContext.current = businessContext;
          if (customizedPropertyId.current !== requestPropertyId) {
            const alignedFrom = addDays(businessDate, -29);
            if (from !== alignedFrom || to !== businessDate) {
              awaitingAlignedReload = true;
              setRangeState({
                propertyId: requestPropertyId,
                from: alignedFrom,
                to: businessDate,
              });
              return;
            }
          }
        }
        setFinanceState({
          propertyId: requestPropertyId,
          dashboard: nextDashboard,
          ledger: nextLedger,
        });
      }
    } catch (caught) {
      if (requestId.current === currentRequest) {
        setErrorState({
          propertyId: requestPropertyId,
          message: caught instanceof Error ? caught.message : "Unable to load finance data.",
        });
      }
    } finally {
      if (requestId.current === currentRequest && !awaitingAlignedReload) {
        setLoading(false);
      }
    }
  }, [canView, from, invalidRange, method, page, propertyId, query, status, supabase, to]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), query ? 250 : 0);
    return () => {
      window.clearTimeout(timer);
      requestId.current += 1;
    };
  }, [load, query]);

  const openReversal = (
    item: PaymentLedgerItem,
    action: PaymentReversalAction,
  ) => {
    if (!propertyId || !canReverse || (action === "refund" ? !item.canRefund : !item.canVoid)) return;
    reversalRequestId.current += 1;
    setReversal({ propertyId, item, action, idempotencyKey: crypto.randomUUID() });
    setReversalReason("");
    setReversalError(null);
    setReversing(false);
  };

  const closeReversal = () => {
    if (reversing) return;
    setReversal(null);
    setReversalReason("");
    setReversalError(null);
  };

  const submitReversal = async () => {
    if (!propertyId || !activeReversal) return;
    if (reversalReason.trim().length < 3) {
      setReversalError(t("Add a clear reason before continuing.", "Weka sababu wazi kabla ya kuendelea."));
      return;
    }
    const requestPropertyId = propertyId;
    const currentRequest = ++reversalRequestId.current;
    setReversing(true);
    setReversalError(null);
    try {
      await reverseBookingPayment(supabase, {
        propertyId: requestPropertyId,
        paymentId: activeReversal.item.id,
        action: activeReversal.action,
        reason: reversalReason,
        idempotencyKey: activeReversal.idempotencyKey,
      });
      if (currentRequest !== reversalRequestId.current || activePropertyId.current !== requestPropertyId) return;
      feedback.success(activeReversal.action === "refund" ? "Payment refunded." : "Payment voided.");
      setReversal(null);
      setReversalReason("");
      await load();
    } catch (caught) {
      if (currentRequest === reversalRequestId.current && activePropertyId.current === requestPropertyId) {
        setReversalError(caught instanceof Error ? caught.message : "Unable to reverse payment.");
      }
    } finally {
      if (currentRequest === reversalRequestId.current) setReversing(false);
    }
  };

  const exportLedger = () => {
    if (!ledger?.items.length) return;
    const rows = [
      ["Entry ID", "Entry type", "Booking", "Guest", "Date", "Method", "Reference", "Status", "Amount", "Currency", "Received by", "Approved by", "Reversal reason"],
      ...ledger.items.map((item) => [
        item.id,
        item.entryType,
        item.bookingNumber,
        item.guestName,
        item.paidAt,
        item.method,
        item.reference,
        item.status,
        item.amount,
        item.currency,
        item.receiverName,
        item.approverName,
        item.reversalReason,
      ]),
    ];
    const csv = rows
      .map((row) => row.map(csvCell).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `loji-payments-${from}-${to}-page-${page}.csv`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  if (!sessionLoading && !canView) {
    return (
      <WorkspacePage>
        <Alert severity="warning">{t("Finance is available to property owners and managers.", "Fedha zinapatikana kwa wamiliki na mameneja wa biashara.")}</Alert>
      </WorkspacePage>
    );
  }

  if (!sessionLoading && !propertyId) {
    return (
      <WorkspacePage>
        <Alert severity="info">
          {t("Choose or create a property to open finance.", "Chagua au unda biashara ili kufungua fedha.")}
        </Alert>
      </WorkspacePage>
    );
  }

  const summary = dashboard?.summary;
  const maxDaily = Math.max(1, ...(dashboard?.daily.map((item) => item.collected) ?? [0]));
  const locale = language === "sw" ? "sw-TZ" : "en-TZ";
  const propertyTimeZone = dashboard?.timezone || "UTC";

  return (
    <WorkspacePage>
      <Stack spacing={{ xs: 2.5, sm: 3 }}>
        <PageHeader
          title={t("Finance", "Fedha")}
          description={t("Track collections, balances and every recorded payment.", "Fuatilia makusanyo, salio na kila malipo yaliyorekodiwa.")}
          action={capabilities.canViewReports ? <Button component={Link} href="/reports" startIcon={<QueryStatsRoundedIcon />} variant="outlined">{t("Reports", "Ripoti")}</Button> : undefined}
        />

        <Surface sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" }, width: { xs: "100%", sm: "auto" } }}>
              <TextField fullWidth label={t("From", "Kuanzia")} onChange={(event) => { if (!propertyId) return; customizedPropertyId.current = propertyId; setRangeState({ propertyId, from: event.target.value, to }); setPage(1); }} type="date" value={from} slotProps={{ htmlInput: { max: to }, inputLabel: { shrink: true } }} />
              <TextField fullWidth label={t("To", "Hadi")} onChange={(event) => { if (!propertyId) return; customizedPropertyId.current = propertyId; setRangeState({ propertyId, from, to: event.target.value }); setPage(1); }} type="date" value={to} slotProps={{ htmlInput: { min: from }, inputLabel: { shrink: true } }} />
            </Stack>
            {dashboard?.timezone ? <StatusPill label={dashboard.timezone} /> : null}
          </Stack>
        </Surface>

        {invalidRange ? <Alert severity="warning">{t("Choose a valid finance range of one year or less.", "Chagua kipindi sahihi cha fedha cha mwaka mmoja au chini.")}</Alert> : null}

        {error ? <Alert action={<Button onClick={() => void load()}>{t("Retry", "Jaribu tena")}</Button>} severity="error">{error}</Alert> : null}

        <Box sx={{ display: "grid", gap: { xs: 1.5, sm: 2 }, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" } }}>
          <MetricCell caption={t("Payments less refunds and voids", "Malipo baada ya marejesho na yaliyobatilishwa")} icon={<PaymentsRoundedIcon />} label={t("Net collected", "Jumla halisi")} tone="success" value={dataLoading && !dashboard ? "—" : money(summary?.collected ?? 0)} />
          <MetricCell caption={t("Open booking balances", "Salio la uhifadhi ambalo halijalipwa")} icon={<SavingsRoundedIcon />} label={t("Outstanding", "Yanayodaiwa")} tone="warning" value={dataLoading && !dashboard ? "—" : money(summary?.outstanding ?? 0)} />
          <MetricCell caption={t("Payment entries", "Miamala ya malipo")} icon={<ReceiptLongRoundedIcon />} label={t("Transactions", "Miamala")} tone="info" value={dataLoading && !dashboard ? "—" : summary?.transactions ?? 0} />
          <MetricCell caption={t("Refunds and voids in period", "Marejesho na yaliyobatilishwa katika kipindi")} icon={<ReplayRoundedIcon />} label={t("Reversed", "Yaliyorejeshwa")} tone="danger" value={dataLoading && !dashboard ? "—" : money((summary?.refunds ?? 0) + (summary?.voids ?? 0))} />
        </Box>

        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.45fr) minmax(280px, .55fr)" } }}>
          <Surface>
            <SectionHeading description={t("Actual completed collections, not projected revenue.", "Makusanyo halisi yaliyokamilika, si makadirio.")} title={t("Collection trend", "Mwenendo wa makusanyo")} />
            {dataLoading && !dashboard ? (
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "flex-end", height: 210, mt: 3, pb: 1 }}>
                {Array.from({ length: 12 }, (_, index) => (
                  <Skeleton
                    key={index}
                    animation="wave"
                    sx={{ flex: 1, height: `${48 + (index % 5) * 22}px`, minWidth: 16 }}
                    variant="rounded"
                  />
                ))}
              </Stack>
            ) : dashboard?.daily.length ? (
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "flex-end", height: 210, mt: 3, overflowX: "auto", pb: 1 }}>
                {dashboard.daily.map((item, index) => (
                  <Stack key={item.date} spacing={0.75} sx={{ alignItems: "center", flex: 1, height: "100%", justifyContent: "flex-end", minWidth: 24 }}>
                    <Box aria-label={`${item.date}: ${money(item.collected)}`} role="img" title={`${item.date}: ${money(item.collected)}`} sx={{ bgcolor: item.collected ? "primary.main" : "action.disabledBackground", borderRadius: "6px 6px 2px 2px", height: `${Math.max(item.collected ? 8 : 2, (item.collected / maxDaily) * 160)}px`, minHeight: 2, transition: "height 180ms ease", width: "min(24px, 70%)" }} />
                    {index % Math.max(1, Math.ceil(dashboard.daily.length / 7)) === 0 ? <Typography color="text.secondary" variant="caption">{formatDateKey(item.date, locale, { day: "numeric", month: "short" })}</Typography> : null}
                  </Stack>
                ))}
              </Stack>
            ) : (
              <EmptyState
                description={t("Completed payments in this period will build the trend automatically.", "Malipo yaliyokamilika katika kipindi hiki yatajenga mwenendo moja kwa moja.")}
                icon={<QueryStatsRoundedIcon />}
                title={t("No completed collections", "Hakuna makusanyo yaliyokamilika")}
              />
            )}
          </Surface>

          <Surface>
            <SectionHeading description={t("Completed payment mix", "Mgawanyo wa malipo yaliyokamilika")} title={t("Payment methods", "Njia za malipo")} />
            <Stack spacing={2} sx={{ mt: 3 }}>
              {dashboard?.methods.length ? dashboard.methods.map((item) => {
                const share = summary?.grossCollected ? Math.round((item.amount / summary.grossCollected) * 100) : 0;
                return (
                  <Box key={item.method}>
                    <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, textTransform: "capitalize" }}>{item.method.replaceAll("_", " ")}</Typography>
                      <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{money(item.amount)}</Typography>
                    </Stack>
                    <Box sx={{ bgcolor: "action.disabledBackground", borderRadius: 99, height: 6, mt: 0.8, overflow: "hidden" }}><Box sx={{ bgcolor: "primary.main", height: "100%", width: `${share}%` }} /></Box>
                  </Box>
                );
              }) : <Typography color="text.secondary" variant="body2">{t("No completed payments in this period.", "Hakuna malipo yaliyokamilika katika kipindi hiki.")}</Typography>}
            </Stack>
          </Surface>
        </Box>

        <Surface padding={false}>
          <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
            <SectionHeading action={<Button disabled={!ledger?.items.length} onClick={exportLedger} startIcon={<DownloadRoundedIcon />} size="small">{t("Export page", "Pakua ukurasa")}</Button>} description={t("Search by guest, booking or transaction reference.", "Tafuta kwa mgeni, namba ya uhifadhi au kumbukumbu ya muamala.")} title={t("Payment ledger", "Daftari la malipo")} />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ mt: 2.5 }}>
              <TextField fullWidth placeholder={t("Search payments", "Tafuta malipo")} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> } }} />
              <Select displayEmpty value={method} onChange={(event) => { setMethod(event.target.value); setPage(1); }} sx={{ minWidth: { sm: 180 } }}>
                <MenuItem value="">{t("All methods", "Njia zote")}</MenuItem>
                <MenuItem value="cash">{t("Cash", "Taslimu")}</MenuItem>
                <MenuItem value="mobile_money">{t("Mobile money", "Pesa ya simu")}</MenuItem>
                <MenuItem value="card">{t("Card", "Kadi")}</MenuItem>
                <MenuItem value="bank_transfer">{t("Bank transfer", "Benki")}</MenuItem>
              </Select>
              <Select displayEmpty value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} sx={{ minWidth: { sm: 160 } }}>
                <MenuItem value="">{t("All statuses", "Hali zote")}</MenuItem>
                <MenuItem value="completed">{t("Completed", "Yamekamilika")}</MenuItem>
                <MenuItem value="refunded">{t("Refunded", "Yamerudishwa")}</MenuItem>
                <MenuItem value="voided">{t("Voided", "Yaliyobatilishwa")}</MenuItem>
                <MenuItem value="refund">{t("Refund entries", "Miamala ya marejesho")}</MenuItem>
                <MenuItem value="void">{t("Void entries", "Miamala iliyobatilishwa")}</MenuItem>
              </Select>
            </Stack>
          </Box>

          {dataLoading ? <LoadingRows rows={6} /> : !ledger?.items.length ? (
            <EmptyState description={t("No payments match this period and filter.", "Hakuna malipo yanayolingana na kipindi na kichujio hiki.")} icon={<ReceiptLongRoundedIcon />} title={t("No payments found", "Hakuna malipo yaliyopatikana")} />
          ) : (
            <>
              <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
                <Table>
                  <TableHead><TableRow><TableCell>{t("Guest / booking", "Mgeni / uhifadhi")}</TableCell><TableCell>{t("Date", "Tarehe")}</TableCell><TableCell>{t("Method", "Njia")}</TableCell><TableCell>{t("Reference", "Kumbukumbu")}</TableCell><TableCell align="right">{t("Amount", "Kiasi")}</TableCell><TableCell /></TableRow></TableHead>
                  <TableBody>{ledger.items.map((item) => <PaymentRow item={item} key={item.id} locale={locale} timeZone={propertyTimeZone} onReverse={openReversal} />)}</TableBody>
                </Table>
              </TableContainer>
              <Stack divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />} sx={{ display: { xs: "flex", md: "none" } }}>
                {ledger.items.map((item) => <PaymentCard item={item} key={item.id} locale={locale} timeZone={propertyTimeZone} onReverse={openReversal} />)}
              </Stack>
              {ledger.total > PAGE_SIZE ? <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}><Pagination count={Math.ceil(ledger.total / PAGE_SIZE)} onChange={(_, value) => setPage(value)} page={page} /></Box> : null}
            </>
          )}
        </Surface>
      </Stack>
      <PaymentReversalModal
        reversal={activeReversal}
        reason={reversalReason}
        error={reversalError}
        working={reversing}
        onClose={closeReversal}
        onReason={setReversalReason}
        onSubmit={() => void submitReversal()}
      />
    </WorkspacePage>
  );
}

type ReversalHandler = (
  item: PaymentLedgerItem,
  action: PaymentReversalAction,
) => void;

function PaymentRow({
  item,
  locale,
  timeZone,
  onReverse,
}: {
  item: PaymentLedgerItem;
  locale: string;
  timeZone: string;
  onReverse: ReversalHandler;
}) {
  return (
    <TableRow hover>
      <TableCell><Typography sx={{ fontWeight: 700 }} variant="body2">{item.guestName}</Typography><Typography color="text.secondary" variant="caption">{item.bookingNumber}</Typography></TableCell>
      <TableCell>{item.paidAt ? formatTimestamp(item.paidAt, locale, timeZone, { dateStyle: "medium", timeStyle: "short" }) : "—"}</TableCell>
      <TableCell>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <StatusPill label={item.method.replaceAll("_", " ")} tone="info" />
          <StatusPill label={item.status.replaceAll("_", " ")} tone={paymentTone(item.status)} />
        </Stack>
      </TableCell>
      <TableCell><Typography variant="body2">{item.reference || "—"}</Typography>{item.reversalReason ? <Typography color="text.secondary" variant="caption">{item.reversalReason}</Typography> : null}</TableCell>
      <TableCell align="right" sx={{ color: item.amount < 0 ? "error.main" : undefined, fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{money(item.amount, item.currency)}</TableCell>
      <TableCell align="right">
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", justifyContent: "flex-end" }}>
          {item.canVoid ? <Button color="error" onClick={() => onReverse(item, "void")} size="small">Void</Button> : null}
          {item.canRefund ? <Button color="error" onClick={() => onReverse(item, "refund")} size="small">Refund</Button> : null}
          <IconButton aria-label={`Open ${item.bookingNumber}`} component={Link} href={`/bookings/${item.bookingId}`}><ArrowOutwardRoundedIcon fontSize="small" /></IconButton>
        </Stack>
      </TableCell>
    </TableRow>
  );
}

function PaymentCard({
  item,
  locale,
  timeZone,
  onReverse,
}: {
  item: PaymentLedgerItem;
  locale: string;
  timeZone: string;
  onReverse: ReversalHandler;
}) {
  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography component={Link} href={`/bookings/${item.bookingId}`} noWrap sx={{ color: "inherit", display: "block", fontWeight: 700, textDecoration: "none" }}>{item.guestName}</Typography>
          <Typography color="text.secondary" variant="body2">{item.bookingNumber} · {item.method.replaceAll("_", " ")}</Typography>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mt: 0.5 }}>
            <StatusPill label={item.status.replaceAll("_", " ")} tone={paymentTone(item.status)} />
            <Typography color="text.secondary" variant="caption">{item.paidAt ? formatTimestamp(item.paidAt, locale, timeZone, { dateStyle: "medium" }) : ""}</Typography>
          </Stack>
        </Box>
        <Typography color={item.amount < 0 ? "error.main" : "text.primary"} sx={{ flexShrink: 0, fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{money(item.amount, item.currency)}</Typography>
      </Stack>
      {item.reversalReason ? <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>{item.reversalReason}</Typography> : null}
      {item.canRefund || item.canVoid ? <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
        {item.canVoid ? <Button color="error" fullWidth onClick={() => onReverse(item, "void")} startIcon={<BlockRoundedIcon />} variant="outlined">Void</Button> : null}
        {item.canRefund ? <Button color="error" fullWidth onClick={() => onReverse(item, "refund")} startIcon={<ReplayRoundedIcon />} variant="outlined">Refund</Button> : null}
      </Stack> : null}
    </Box>
  );
}

function PaymentReversalModal({
  reversal,
  reason,
  error,
  working,
  onClose,
  onReason,
  onSubmit,
}: {
  reversal: {
    item: PaymentLedgerItem;
    action: PaymentReversalAction;
    idempotencyKey: string;
  } | null;
  reason: string;
  error: string | null;
  working: boolean;
  onClose: () => void;
  onReason: (value: string) => void;
  onSubmit: () => void;
}) {
  if (!reversal) return null;
  const isVoid = reversal.action === "void";
  return (
    <ResponsiveModal maxWidth="xs" onClose={onClose} open>
      <DialogTitle>{isVoid ? "Void this payment?" : "Refund this payment?"}</DialogTitle>
      <DialogContent>
        <Alert severity="warning">
          This creates a linked {reversal.action} entry for the full amount. The original payment remains unchanged in the audit ledger.
        </Alert>
        <Box sx={{ bgcolor: "action.hover", borderRadius: 2, mt: 2, p: 1.5 }}>
          <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between" }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700 }} variant="body2">{reversal.item.guestName}</Typography>
              <Typography color="text.secondary" variant="caption">{reversal.item.bookingNumber}{reversal.item.reference ? ` · ${reversal.item.reference}` : ""}</Typography>
            </Box>
            <Typography color="error.main" sx={{ flexShrink: 0, fontVariantNumeric: "tabular-nums", fontWeight: 800 }}>{money(reversal.item.amount, reversal.item.currency)}</Typography>
          </Stack>
        </Box>
        <TextField
          autoFocus
          disabled={working}
          fullWidth
          label="Reason"
          minRows={3}
          multiline
          onChange={(event) => onReason(event.target.value)}
          placeholder={isVoid ? "Example: Duplicate payment entered at front desk" : "Example: Guest cancellation approved by manager"}
          required
          value={reason}
          sx={{ mt: 2 }}
        />
        {error ? <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert> : null}
      </DialogContent>
      <DialogActions>
        <Button disabled={working} onClick={onClose}>Keep payment</Button>
        <Button color="error" disabled={working || reason.trim().length < 3} onClick={onSubmit} startIcon={isVoid ? <BlockRoundedIcon /> : <ReplayRoundedIcon />} variant="contained">
          {working ? "Processing…" : isVoid ? "Void payment" : "Issue refund"}
        </Button>
      </DialogActions>
    </ResponsiveModal>
  );
}
