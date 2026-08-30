"use client";

import Link from "next/link";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { Box, Button, Divider, Stack, Typography } from "@mui/material";

import { useLanguage } from "@/components/providers/language-provider";
import {
  SectionHeading,
  StatusPill,
  Surface,
} from "@/components/shared/workspace-ui";
import type {
  DashboardBooking,
  DashboardSummary,
} from "@/features/dashboard/models/dashboard";
import type { WorkspaceRole } from "@/features/session/permissions";
import { formatLocalDate } from "@/lib/date-time";

const money = new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
});

export function GuestMovementQueue({
  arrivals,
  departures,
  role,
  showFinance,
  summary,
}: {
  arrivals: DashboardBooking[];
  departures: DashboardBooking[];
  role: WorkspaceRole;
  showFinance: boolean;
  summary: DashboardSummary;
}) {
  const { t } = useLanguage();
  const title = role === "receptionist"
    ? t("Front desk work queue", "Foleni ya kazi za mapokezi")
    : t("Guest movement", "Mienendo ya wageni");

  return (
    <Surface padding={false}>
      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
        <SectionHeading
          action={
            <Button
              component={Link}
              endIcon={<ArrowForwardRoundedIcon />}
              href="/bookings"
              size="small"
            >
              {t("All bookings", "Uhifadhi wote")}
            </Button>
          }
          description={t(
            "Guests due now, with overdue work held at the top.",
            "Wageni wanaotarajiwa sasa, huku kazi zilizochelewa zikiwa juu.",
          )}
          title={title}
        />
      </Box>
      <Divider />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0,1fr)", md: "repeat(2,minmax(0,1fr))" },
        }}
      >
        <QueueLane
          bookings={arrivals}
          overdueTotal={summary.overdueArrivals}
          showFinance={showFinance}
          total={summary.arrivalsDue}
          type="arrival"
        />
        <QueueLane
          bookings={departures}
          overdueTotal={summary.overdueDepartures}
          showFinance={showFinance}
          total={summary.departuresDue}
          type="departure"
        />
      </Box>
    </Surface>
  );
}

function QueueLane({
  bookings,
  overdueTotal,
  showFinance,
  total,
  type,
}: {
  bookings: DashboardBooking[];
  overdueTotal: number;
  showFinance: boolean;
  total: number;
  type: "arrival" | "departure";
}) {
  const { t } = useLanguage();
  const arrival = type === "arrival";
  const visibleCount = Math.min(bookings.length, 6);

  return (
    <Box
      sx={{
        borderLeft: { md: type === "departure" ? "1px solid" : 0 },
        borderTop: { xs: type === "departure" ? "1px solid" : 0, md: 0 },
        borderColor: "divider",
        minWidth: 0,
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          bgcolor: "background.default",
          borderBottom: "1px solid",
          borderColor: "divider",
          px: { xs: 2, sm: 2.5 },
          py: 1.25,
        }}
      >
        <Box
          sx={{
            bgcolor: arrival
              ? "color-mix(in srgb, var(--mui-palette-info-main) 11%, transparent)"
              : "color-mix(in srgb, var(--mui-palette-warning-main) 13%, transparent)",
            borderRadius: 1.5,
            color: arrival ? "info.main" : "warning.main",
            display: "grid",
            height: 32,
            placeItems: "center",
            width: 32,
          }}
        >
          {arrival ? <LoginRoundedIcon fontSize="small" /> : <LogoutRoundedIcon fontSize="small" />}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: ".8125rem", fontWeight: 700 }}>
            {arrival ? t("Arrivals", "Wanaowasili") : t("Departures", "Wanaondoka")}
          </Typography>
          <Typography color="text.secondary" variant="caption">
            {bookings.length < total
              ? t(
                  `Showing ${bookings.length} of ${total}${overdueTotal ? ` · ${overdueTotal} overdue` : ""}`,
                  `Inaonyesha ${bookings.length} kati ya ${total}${overdueTotal ? ` · ${overdueTotal} wamechelewa` : ""}`,
                )
              : t(
                  `${total} due${overdueTotal ? ` · ${overdueTotal} overdue` : ""}`,
                  `${total} wanatarajiwa${overdueTotal ? ` · ${overdueTotal} wamechelewa` : ""}`,
                )}
          </Typography>
        </Box>
        <StatusPill
          label={String(total)}
          tone={overdueTotal ? "danger" : total ? (arrival ? "info" : "warning") : "success"}
        />
      </Stack>

      {bookings.length ? (
        <Stack divider={<Divider flexItem />}>
          {bookings.slice(0, 6).map((booking) => (
            <QueueBookingRow
              booking={booking}
              key={booking.id}
              showFinance={showFinance}
              type={type}
            />
          ))}
          {total > visibleCount ? (
            <Button
              component={Link}
              href="/bookings"
              size="small"
              sx={{ borderRadius: 0, justifyContent: "flex-start", px: 2.5, py: 1.25 }}
            >
              {t(
                `Open all ${total}`,
                `Fungua wote ${total}`,
              )}
            </Button>
          ) : null}
        </Stack>
      ) : (
        <Stack spacing={0.65} sx={{ alignItems: "flex-start", px: { xs: 2, sm: 2.5 }, py: 3 }}>
          <CheckCircleRoundedIcon color="success" fontSize="small" />
          <Typography sx={{ fontSize: ".8125rem", fontWeight: 700 }}>
            {arrival
              ? t("No arrivals waiting", "Hakuna wanaowasili wanaosubiri")
              : t("No departures waiting", "Hakuna wanaoondoka wanaosubiri")}
          </Typography>
          <Typography color="text.secondary" variant="caption">
            {arrival
              ? t("There is no arrival action due right now.", "Hakuna hatua ya kuwasili inayohitajika sasa.")
              : t("There is no checkout action due right now.", "Hakuna hatua ya kuondoka inayohitajika sasa.")}
          </Typography>
        </Stack>
      )}
    </Box>
  );
}

function QueueBookingRow({
  booking,
  showFinance,
  type,
}: {
  booking: DashboardBooking;
  showFinance: boolean;
  type: "arrival" | "departure";
}) {
  const { t } = useLanguage();
  const arrival = type === "arrival";
  const balance = showFinance ? booking.balanceDue : null;

  return (
    <Box
      component={Link}
      href={`/bookings/${booking.id}`}
      sx={{
        color: "inherit",
        display: "block",
        px: { xs: 2, sm: 2.5 },
        py: 1.45,
        textDecoration: "none",
        transition: "background-color 150ms ease",
        "&:hover": { bgcolor: "action.hover" },
        "&:focus-visible": { outline: "3px solid", outlineColor: "primary.main", outlineOffset: -3 },
      }}
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", minWidth: 0 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            spacing={0.7}
            sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.6 }}
          >
            <Typography noWrap sx={{ fontSize: ".875rem", fontWeight: 700, maxWidth: "100%" }}>
              {booking.guestName}
            </Typography>
            {booking.isOverdue ? (
              <StatusPill label={t("Overdue", "Imechelewa")} tone="danger" />
            ) : null}
          </Stack>
          <Typography color="text.secondary" noWrap sx={{ mt: 0.25 }} variant="caption">
            {booking.roomName}
            {booking.roomType ? ` · ${booking.roomType}` : ""}
            {booking.bookingNumber ? ` · ${booking.bookingNumber}` : ""}
          </Typography>
          <Typography color="text.secondary" sx={{ display: { sm: "none" }, mt: 0.3 }} variant="caption">
            {arrival ? t("Check-in", "Kuingia") : t("Check-out", "Kuondoka")} {formatLocalDate(arrival ? booking.checkIn : booking.checkOut)}
          </Typography>
        </Box>

        <Box sx={{ display: { xs: "none", sm: "block" }, flexShrink: 0, textAlign: "right" }}>
          <Typography sx={{ fontSize: ".75rem", fontWeight: 500 }}>
            {formatLocalDate(arrival ? booking.checkIn : booking.checkOut, {
              day: "numeric",
              month: "short",
            })}
          </Typography>
          <Typography color="text.secondary" variant="caption">
            {arrival ? t("Check-in", "Kuingia") : t("Check-out", "Kuondoka")}
          </Typography>
        </Box>

        {balance !== null && balance > 0 ? (
          <Box sx={{ display: { xs: "none", md: "block" }, flexShrink: 0, minWidth: 96, textAlign: "right" }}>
            <Typography color="warning.main" sx={{ fontSize: ".75rem", fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
              {money.format(balance)}
            </Typography>
            <Typography color="text.secondary" variant="caption">
              {t("balance", "salio")}
            </Typography>
          </Box>
        ) : null}
        <ArrowForwardRoundedIcon color="action" fontSize="small" sx={{ flexShrink: 0 }} />
      </Stack>
    </Box>
  );
}
