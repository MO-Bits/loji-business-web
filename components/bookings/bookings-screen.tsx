"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Fab,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { getWorkspaceCapabilities } from "@/features/session/permissions";
import { createClient } from "@/lib/supabase/client";
import { listPropertyBookings } from "@/features/bookings/services/booking-service";
import {
  bookingStatusLabel,
  type Booking,
  type BookingListResult,
} from "@/features/bookings/models/booking";
import { formatLocalDate } from "@/lib/date-time";
import { PageHeader } from "@/components/shared/page-header";

const money = new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
});

const statusOptions = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "reserved", label: "Reserved" },
  { value: "confirmed", label: "Confirmed" },
  { value: "checked_in", label: "In house" },
  { value: "checked_out", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No-show" },
] as const;

function statusTone(status: string): "default" | "info" | "success" | "warning" | "error" {
  if (status === "checked_in") return "success";
  if (status === "confirmed" || status === "reserved") return "info";
  if (status === "pending") return "warning";
  if (status === "cancelled" || status === "no_show") return "error";
  return "default";
}

export function BookingsScreen() {
  return (
    <Suspense fallback={<Container maxWidth="xl" sx={{ py: { xs: 2, sm: 2.5, lg: 3 } }}><BookingListSkeleton /></Container>}>
      <BookingsSearchParamsBoundary />
    </Suspense>
  );
}

function BookingsSearchParamsBoundary() {
  const searchParams = useSearchParams();
  return <BookingsWorkspace key={searchParams.get("q") ?? ""} />;
}

function BookingsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, loading: sessionLoading, error: sessionError } = useAppSession();
  const client = useMemo(() => createClient(), []);
  const propertyId = session?.activePropertyId;
  const capabilities = getWorkspaceCapabilities(session?.activeRole);
  const [resultState, setResultState] = useState<{
    propertyId: string;
    value: BookingListResult;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorState, setErrorState] = useState<{ propertyId: string; message: string } | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const requestId = useRef(0);
  const result = resultState && resultState.propertyId === propertyId ? resultState.value : null;
  const error = errorState && errorState.propertyId === propertyId ? errorState.message : null;
  const dataLoading = loading || Boolean(resultState && resultState.propertyId !== propertyId);

  const requestedStatus = searchParams.get("status") ?? "all";
  const status = statusOptions.some((item) => item.value === requestedStatus)
    ? requestedStatus
    : "all";
  const committedQuery = searchParams.get("q") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const filtersActive = Boolean(query.trim() || status !== "all" || from || to);

  const updateUrl = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value && value !== "all") params.set(key, value);
        else params.delete(key);
      });
      const next = params.toString();
      router.replace(next ? `/bookings?${next}` : "/bookings", { scroll: false });
    },
    [router, searchParams],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (committedQuery !== query.trim()) {
        updateUrl({ q: query.trim() });
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [committedQuery, query, updateUrl]);

  const fetchPage = useCallback(
    async (append = false, offset = 0) => {
      if (!propertyId) {
        requestId.current += 1;
        setResultState(null);
        setLoading(false);
        setLoadingMore(false);
        return;
      }
      const requestPropertyId = propertyId;
      const currentRequest = ++requestId.current;
      if (append) {
        setLoadingMore(true);
        setLoadMoreError(null);
      } else {
        setLoading(true);
        setLoadingMore(false);
        setErrorState(null);
        setLoadMoreError(null);
        setResultState((current) => current?.propertyId === requestPropertyId ? current : null);
      }
      try {
        const next = await listPropertyBookings(client, requestPropertyId, {
          status: status === "all" ? undefined : status,
          query: committedQuery || undefined,
          from: from || undefined,
          to: to || undefined,
          limit: 30,
          offset,
        });
        if (currentRequest !== requestId.current) return;
        setResultState((current) => ({
          propertyId: requestPropertyId,
          value: append && current && current.propertyId === requestPropertyId
            ? { ...next, bookings: [...current.value.bookings, ...next.bookings] }
            : next,
        }));
      } catch (cause) {
        if (currentRequest !== requestId.current) return;
        const message = cause instanceof Error ? cause.message : "Unable to load bookings.";
        if (append) setLoadMoreError(message);
        else setErrorState({ propertyId: requestPropertyId, message });
      } finally {
        if (currentRequest !== requestId.current) return;
        setLoading(false);
        setLoadingMore(false);
      }
    }, [client, committedQuery, from, propertyId, status, to]);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchPage(false), 0);
    return () => {
      window.clearTimeout(timer);
      requestId.current += 1;
    };
  }, [fetchPage]);

  const clearFilters = () => {
    setQuery("");
    router.replace("/bookings", { scroll: false });
  };

  if (sessionError || (!sessionLoading && !propertyId)) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="error">
          {sessionError?.message ?? "Select an active property to view bookings."}
        </Alert>
      </Container>
    );
  }

  const canCreateBooking =
    capabilities.canCreateBooking &&
    Boolean(result?.capabilities.createBooking);
  const showFinance =
    capabilities.canViewFinance && Boolean(result?.capabilities.viewFinance);
  const showContextualCreateAction =
    canCreateBooking && !filtersActive && result?.bookings.length === 0;
  const showGlobalCreateAction = canCreateBooking && !showContextualCreateAction;

  return (
    <>
      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 2.5, lg: 3 } }}>
        <Stack spacing={{ xs: 2, md: 2.5 }}>
          <PageHeader
            eyebrow={result?.businessDate ? `Business date · ${formatLocalDate(result.businessDate)}` : "Reservations"}
            title="Bookings"
            description="Manage every arrival, in-house stay and departure from one live register."
            action={
              showGlobalCreateAction ? (
                <Button component={Link} href="/bookings/new" startIcon={<AddRoundedIcon />} variant="contained" sx={{ display: { xs: "none", sm: "inline-flex" } }}>
                  New booking
                </Button>
              ) : undefined
            }
          />

          <SummaryStrip result={result} loading={dataLoading || sessionLoading} />

          <Paper variant="outlined" sx={{ overflow: "hidden" }}>
            <Tabs
              value={statusOptions.some((item) => item.value === status) ? status : "all"}
              onChange={(_, value) => updateUrl({ status: String(value) })}
              variant="scrollable"
              scrollButtons={false}
              sx={{ borderBottom: "1px solid", borderColor: "divider", px: { xs: 0.5, sm: 1 } }}
            >
              {statusOptions.map((item) => (
                <Tab key={item.value} value={item.value} label={item.label} />
              ))}
            </Tabs>

            <Box
              sx={{
                display: "grid",
                gap: 1.25,
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2,minmax(0,1fr))",
                  lg: "minmax(240px,1fr) repeat(2,minmax(150px,200px)) auto",
                },
                p: { xs: 1.25, sm: 1.5 },
              }}
            >
              <TextField
                aria-label="Search bookings"
                placeholder="Search guest, booking number or phone"
                size="small"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment>
                    ),
                    endAdornment: query ? (
                      <InputAdornment position="end">
                        <IconButton aria-label="Clear search" onClick={() => setQuery("")} size="small"><ClearRoundedIcon fontSize="small" /></IconButton>
                      </InputAdornment>
                    ) : undefined,
                  },
                }}
                sx={{ gridColumn: { sm: "1 / -1", lg: "auto" } }}
              />
              <TextField
                label="From"
                size="small"
                type="date"
                value={from}
                onChange={(event) => updateUrl({ from: event.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="To"
                size="small"
                type="date"
                value={to}
                onChange={(event) => updateUrl({ to: event.target.value })}
                slotProps={{ htmlInput: { min: from || undefined }, inputLabel: { shrink: true } }}
              />
              <Button
                disabled={!filtersActive}
                onClick={clearFilters}
                startIcon={<ClearRoundedIcon />}
                sx={{ gridColumn: { sm: "1 / -1", lg: "auto" }, justifySelf: { sm: "end", lg: "stretch" } }}
              >
                Clear
              </Button>
            </Box>
          </Paper>

          {dataLoading || sessionLoading ? (
            <BookingListSkeleton />
          ) : error ? (
            <Alert
              severity="error"
              action={<Button color="inherit" startIcon={<RefreshRoundedIcon />} onClick={() => void fetchPage(false)}>Retry</Button>}
            >
              {error}
            </Alert>
          ) : !result?.bookings.length ? (
            <EmptyBookings filtered={filtersActive} canCreate={canCreateBooking} onClear={clearFilters} />
          ) : (
            <>
              <Box sx={{ display: { xs: "none", lg: "block" } }}>
                <BookingsTable bookings={result.bookings} showFinance={showFinance} />
              </Box>
              <Stack spacing={1} sx={{ display: { xs: "flex", lg: "none" } }}>
                {result.bookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} showFinance={showFinance} />
                ))}
              </Stack>
              {result.hasMore ? (
                <Box sx={{ display: "grid", placeItems: "center", pt: 0.5 }}>
                  <Button disabled={loadingMore || result.nextOffset == null} onClick={() => void fetchPage(true, result.nextOffset ?? 0)} variant="outlined">
                    {loadingMore ? "Loading…" : "Load more bookings"}
                  </Button>
                </Box>
              ) : null}
              {loadMoreError ? <Alert severity="error" onClose={() => setLoadMoreError(null)}>More bookings could not be loaded: {loadMoreError}</Alert> : null}
            </>
          )}
        </Stack>
      </Container>

      {showGlobalCreateAction ? (
        <Fab component={Link} href="/bookings/new" color="primary" aria-label="New booking" sx={{ bottom: "calc(80px + env(safe-area-inset-bottom))", display: { xs: "inline-flex", sm: "none" }, position: "fixed", right: 18 }}>
          <AddRoundedIcon />
        </Fab>
      ) : null}
    </>
  );
}

function SummaryStrip({ result, loading }: { result: BookingListResult | null; loading: boolean }) {
  const values = [
    { label: "All reservations", value: result?.summary.total ?? 0, icon: <CalendarTodayRoundedIcon /> },
    { label: "Arriving today", value: result?.summary.arrivals ?? 0, icon: <GroupsRoundedIcon /> },
    { label: "In house", value: result?.summary.inHouse ?? 0, icon: <HotelRoundedIcon /> },
    { label: "Need attention", value: result?.summary.attention ?? 0, icon: <ErrorOutlineRoundedIcon /> },
  ];
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", md: "repeat(4,minmax(0,1fr))" } }}>
        {values.map((item, index) => (
          <Box
            key={item.label}
            sx={{
              borderBottom: { xs: index < 2 ? "1px solid" : 0, md: 0 },
              borderRight: { xs: index % 2 === 0 ? "1px solid" : 0, md: index < values.length - 1 ? "1px solid" : 0 },
              borderColor: "divider",
              minWidth: 0,
              p: { xs: 1.5, sm: 2 },
            }}
          >
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", color: "text.secondary" }}>
              <Box sx={{ color: "primary.main", display: "flex", flexShrink: 0, "& .MuiSvgIcon-root": { fontSize: 18 } }}>{item.icon}</Box>
              <Typography variant="caption">{item.label}</Typography>
            </Stack>
            {loading ? <Skeleton width={46} /> : <Typography sx={{ fontSize: { xs: "1.3rem", sm: "1.55rem" }, fontVariantNumeric: "tabular-nums", fontWeight: 700, mt: 0.5 }}>{item.value}</Typography>}
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

function BookingsTable({ bookings, showFinance }: { bookings: Booking[]; showFinance: boolean }) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table aria-label="Bookings register">
        <TableHead>
          <TableRow>
            <TableCell>Guest & booking</TableCell>
            <TableCell>Stay</TableCell>
            <TableCell>Room</TableCell>
            <TableCell>Status</TableCell>
            {showFinance ? <TableCell align="right">Payment</TableCell> : null}
            <TableCell aria-label="Actions" padding="checkbox" />
          </TableRow>
        </TableHead>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow key={booking.id} hover>
              <TableCell><GuestIdentity booking={booking} /></TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{formatLocalDate(booking.checkIn, { day: "numeric", month: "short" })} → {formatLocalDate(booking.checkOut, { day: "numeric", month: "short", year: "numeric" })}</Typography>
                <Typography color="text.secondary" variant="caption">{booking.totalGuests} guest{booking.totalGuests === 1 ? "" : "s"} · {booking.bookingSource}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{booking.roomName || "Unassigned"}</Typography>
                <Typography color="text.secondary" sx={{ textTransform: "capitalize" }} variant="caption">{booking.roomType}</Typography>
              </TableCell>
              <TableCell><BookingStatusChip booking={booking} /></TableCell>
              {showFinance ? <TableCell align="right"><PaymentPosition booking={booking} /></TableCell> : null}
              <TableCell padding="checkbox"><RowMenu booking={booking} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function BookingCard({ booking, showFinance }: { booking: Booking; showFinance: boolean }) {
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Box component={Link} href={`/bookings/${booking.id}`} sx={{ color: "inherit", display: "block", p: { xs: 1.5, sm: 2 }, textDecoration: "none", "&:hover": { bgcolor: "action.hover" } }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
          <GuestIdentity booking={booking} compact />
          <Box sx={{ ml: "auto!important" }}><BookingStatusChip booking={booking} /></Box>
        </Stack>
        <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: "repeat(2,minmax(0,1fr))", mt: 1.5 }}>
          <CompactFact label="Stay" value={`${formatLocalDate(booking.checkIn, { day: "numeric", month: "short" })} → ${formatLocalDate(booking.checkOut, { day: "numeric", month: "short" })}`} />
          <CompactFact label="Room" value={booking.roomName || "Unassigned"} />
          <CompactFact label="Guests" value={`${booking.totalGuests} · ${booking.bookingSource}`} />
          {showFinance ? <CompactFact label="Payment" value={booking.balanceDue != null && booking.balanceDue > 0 ? `${money.format(booking.balanceDue)} due` : booking.paymentStatus === "paid" ? "Paid" : bookingStatusLabel(booking.paymentStatus)} /> : null}
        </Box>
        <Stack direction="row" sx={{ alignItems: "center", borderTop: "1px solid", borderColor: "divider", color: "primary.main", justifyContent: "space-between", mt: 1.5, pt: 1.25 }}>
          <Typography variant="caption" sx={{ fontWeight: 500 }}>Open reservation</Typography>
          <ArrowForwardRoundedIcon fontSize="small" />
        </Stack>
      </Box>
    </Paper>
  );
}

function GuestIdentity({ booking, compact = false }: { booking: Booking; compact?: boolean }) {
  const initials = booking.guestName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return (
    <Stack direction="row" spacing={1.1} sx={{ alignItems: "center", flex: 1, minWidth: 0 }}>
      <Avatar sx={{ bgcolor: "action.selected", color: "primary.main", flexShrink: 0, fontSize: ".75rem", fontWeight: 700, height: compact ? 36 : 40, width: compact ? 36 : 40 }}>{initials || "G"}</Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography noWrap variant="body2" sx={{ fontWeight: 700 }}>{booking.guestName}</Typography>
        <Typography color="text.secondary" noWrap variant="caption">{booking.bookingNumber}{booking.phone ? ` · ${booking.phone}` : ""}</Typography>
      </Box>
    </Stack>
  );
}

function BookingStatusChip({ booking }: { booking: Booking }) {
  return <Chip color={statusTone(booking.status)} label={booking.isOverdue ? `${bookingStatusLabel(booking.status)} · overdue` : bookingStatusLabel(booking.status)} size="small" variant={booking.isOverdue ? "filled" : "outlined"} />;
}

function PaymentPosition({ booking }: { booking: Booking }) {
  if (booking.balanceDue == null) return <Typography color="text.secondary">—</Typography>;
  return (
    <Box>
      <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{booking.balanceDue > 0 ? money.format(booking.balanceDue) : "Paid"}</Typography>
      <Typography color={booking.balanceDue > 0 ? "warning.main" : "success.main"} variant="caption">{booking.balanceDue > 0 ? "Outstanding" : "Settled"}</Typography>
    </Box>
  );
}

function CompactFact({ label, value }: { label: string; value: string }) {
  return <Box sx={{ minWidth: 0 }}><Typography color="text.secondary" variant="caption">{label}</Typography><Typography noWrap variant="body2" sx={{ fontWeight: 500, mt: 0.15 }}>{value}</Typography></Box>;
}

function RowMenu({ booking }: { booking: Booking }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = (event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget);
  return (
    <>
      <Tooltip title="Booking actions"><IconButton aria-label={`Actions for ${booking.bookingNumber}`} onClick={open} size="small"><MoreHorizRoundedIcon /></IconButton></Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem component={Link} href={`/bookings/${booking.id}`} onClick={() => setAnchor(null)}>Open reservation</MenuItem>
        {booking.phone ? <MenuItem component="a" href={`tel:${booking.phone}`} onClick={() => setAnchor(null)}>Call guest</MenuItem> : null}
      </Menu>
    </>
  );
}

function BookingListSkeleton() {
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      {[0, 1, 2, 3, 4].map((item) => (
        <Stack key={item} direction="row" spacing={2} sx={{ alignItems: "center", borderBottom: item < 4 ? "1px solid" : 0, borderColor: "divider", p: 2 }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Box sx={{ flex: 1 }}><Skeleton width="min(220px,60%)" /><Skeleton width="min(150px,42%)" /></Box>
          <Skeleton sx={{ display: { xs: "none", sm: "block" } }} width={110} />
        </Stack>
      ))}
    </Paper>
  );
}

function EmptyBookings({ filtered, canCreate, onClear }: { filtered: boolean; canCreate: boolean; onClear: () => void }) {
  return (
    <Paper variant="outlined" sx={{ px: 2, py: { xs: 6, sm: 8 }, textAlign: "center" }}>
      <Box sx={{ bgcolor: "action.selected", borderRadius: "50%", color: "primary.main", display: "grid", height: 56, mx: "auto", placeItems: "center", width: 56 }}><CalendarTodayRoundedIcon /></Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mt: 1.75 }}>{filtered ? "No bookings match these filters" : "Your booking register is ready"}</Typography>
      <Typography color="text.secondary" variant="body2" sx={{ maxWidth: 420, mx: "auto", mt: 0.5 }}>{filtered ? "Clear or adjust the current filters to see more reservations." : "New reservations will appear here with their room, stay and operational status."}</Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "center", mt: 2 }}>
        {filtered ? <Button onClick={onClear} variant="outlined">Clear filters</Button> : null}
        {!filtered && canCreate ? <Button component={Link} href="/bookings/new" variant="contained">Create first booking</Button> : null}
      </Stack>
    </Paper>
  );
}
