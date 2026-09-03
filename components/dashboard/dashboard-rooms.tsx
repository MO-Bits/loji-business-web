"use client";

import Link from "next/link";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CleaningServicesRoundedIcon from "@mui/icons-material/CleaningServicesRounded";
import { Box, Button, Divider, Stack, Typography } from "@mui/material";

import { useLanguage } from "@/components/providers/language-provider";
import {
  SectionHeading,
  StatusPill,
  Surface,
  type StatusTone,
} from "@/components/shared/workspace-ui";
import type {
  DashboardHousekeepingRoom,
  DashboardSummary,
} from "@/features/dashboard/models/dashboard";
import type { WorkspaceRole } from "@/features/session/permissions";
import { formatLocalDateTime } from "@/lib/date-time";

import { percentage } from "./dashboard-metrics";
import { getPropertyTypeDefinition } from "@/features/property/property-type";

export function RoomReadinessPanel({
  housekeeping,
  propertyType,
  role,
  summary,
}: {
  housekeeping: DashboardHousekeepingRoom[];
  propertyType?: string;
  role: WorkspaceRole;
  summary: DashboardSummary;
}) {
  const { t } = useLanguage();
  const propertyDefinition = getPropertyTypeDefinition(propertyType);
  const singular = t(propertyDefinition.inventorySingular[0], propertyDefinition.inventorySingular[1]);
  const plural = t(propertyDefinition.inventoryPlural[0], propertyDefinition.inventoryPlural[1]);
  const occupiedRate = percentage(summary.occupiedRooms, summary.totalActiveRooms);
  const readyRate = percentage(summary.readyRooms, summary.totalActiveRooms);

  return (
    <Surface padding={false}>
      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
        <SectionHeading
          action={
            <Button
              component={Link}
              endIcon={<ArrowForwardRoundedIcon />}
              href="/rooms"
              size="small"
            >
              {t(propertyDefinition.inventoryBoard[0], propertyDefinition.inventoryBoard[1])}
            </Button>
          }
          description={
            role === "manager"
              ? t(
                  `${singular} availability and the team’s active turnaround work.`,
                  `Upatikanaji wa ${plural} na kazi zinazoendelea za maandalizi.`,
                )
              : t(
                  `Live occupancy, saleable inventory, and ${plural} blocked by service work.`,
                  `Matumizi ya ${plural}, zinazopatikana na zilizozuiwa na kazi za huduma.`,
                )
          }
          title={t(`${singular} readiness`, `Utayari wa ${plural}`)}
        />
      </Box>
      <Divider />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", sm: "repeat(4,minmax(0,1fr))" },
        }}
      >
        <RoomFact label={t("Active", "Hai")} value={summary.totalActiveRooms} />
        <RoomFact color="info.main" label={t("Occupied", "Vimekaliwa")} value={summary.occupiedRooms} />
        <RoomFact color="success.main" label={t("Ready", "Tayari")} value={summary.readyRooms} />
        <RoomFact color={summary.attentionRooms ? "warning.main" : "success.main"} label={t("Attention", "Uangalizi")} value={summary.attentionRooms} />
      </Box>
      <Divider />

      <Stack spacing={1.3} sx={{ p: { xs: 2, sm: 2.5 } }}>
        <RateBar
          color="info.main"
          label={t("Occupied inventory", `${plural} zilizokaliwa`)}
          trailing={`${occupiedRate}%`}
          value={occupiedRate}
        />
        <RateBar
          color="success.main"
          label={t("Ready to assign", "Tayari kugawiwa")}
          trailing={t(
            `${summary.readyRooms} of ${summary.totalActiveRooms}`,
            `${summary.readyRooms} kati ya ${summary.totalActiveRooms}`,
          )}
          value={readyRate}
        />
      </Stack>
      <Divider />

      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", bgcolor: "background.default", px: { xs: 2, sm: 2.5 }, py: 1.2 }}
      >
        <CleaningServicesRoundedIcon color="primary" fontSize="small" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: ".8125rem", fontWeight: 700 }}>
            {t("Housekeeping & service queue", "Foleni ya usafi na huduma")}
          </Typography>
          <Typography color="text.secondary" variant="caption">
            {housekeeping.length
              ? t(
                  `${housekeeping.length} ${housekeeping.length === 1 ? singular : plural} need follow-up`,
                  `${plural} ${housekeeping.length} zinahitaji ufuatiliaji`,
                )
              : t("Every available room is ready", "Kila chumba kinachopatikana kiko tayari")}
          </Typography>
        </Box>
      </Stack>
      <Divider />

      {housekeeping.length ? (
        <Stack divider={<Divider flexItem />}>
          {housekeeping.slice(0, 6).map((room) => (
            <HousekeepingRow key={room.id} room={room} />
          ))}
          {housekeeping.length > 6 ? (
            <Button
              component={Link}
              href="/rooms"
              size="small"
              sx={{ borderRadius: 0, justifyContent: "flex-start", px: 2.5, py: 1.25 }}
            >
              {t(
                `View ${housekeeping.length - 6} more rooms`,
                `Tazama vyumba vingine ${housekeeping.length - 6}`,
              )}
            </Button>
          ) : null}
        </Stack>
      ) : (
        <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", px: { xs: 2, sm: 2.5 }, py: 2.5 }}>
          <CheckCircleRoundedIcon color="success" fontSize="small" />
          <Box>
            <Typography sx={{ fontSize: ".8125rem", fontWeight: 700 }}>
              {t(`No ${singular} follow-up waiting`, `Hakuna ufuatiliaji wa ${singular} unaosubiri`)}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.25 }} variant="caption">
              {t(
                `Housekeeping exceptions and out-of-service ${plural} will appear here.`,
                `${plural} zenye tatizo la usafi au zisizotumika zitaonekana hapa.`,
              )}
            </Typography>
          </Box>
        </Stack>
      )}
    </Surface>
  );
}

function RoomFact({
  color = "text.primary",
  label,
  value,
}: {
  color?: string;
  label: string;
  value: number;
}) {
  return (
    <Box
      sx={{
        borderBottom: { xs: "1px solid", sm: 0 },
        borderColor: "divider",
        borderRight: "1px solid",
        minWidth: 0,
        p: { xs: 1.4, sm: 1.75 },
        "&:nth-of-type(2n)": { borderRight: { xs: 0, sm: "1px solid" } },
        "&:nth-last-of-type(-n + 2)": { borderBottom: 0 },
        "&:last-of-type": { borderRight: 0 },
      }}
    >
      <Typography color="text.secondary" sx={{ fontSize: ".6875rem", fontWeight: 700, letterSpacing: ".055em", textTransform: "uppercase" }}>
        {label}
      </Typography>
      <Typography sx={{ color, fontSize: "1.3rem", fontVariantNumeric: "tabular-nums", fontWeight: 700, letterSpacing: "-.03em", mt: 0.4 }}>
        {value}
      </Typography>
    </Box>
  );
}

function RateBar({
  color,
  label,
  trailing,
  value,
}: {
  color: string;
  label: string;
  trailing: string;
  value: number;
}) {
  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", justifyContent: "space-between" }}>
        <Typography color="text.secondary" sx={{ fontSize: ".75rem", fontWeight: 500 }}>
          {label}
        </Typography>
        <Typography sx={{ color, fontSize: ".75rem", fontWeight: 700 }}>
          {trailing}
        </Typography>
      </Stack>
      <Box
        aria-label={`${label}: ${value}%`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={value}
        role="progressbar"
        sx={{ bgcolor: "action.hover", borderRadius: 99, height: 7, mt: 0.7, overflow: "hidden" }}
      >
        <Box sx={{ bgcolor: color, borderRadius: "inherit", height: "100%", width: `${value}%` }} />
      </Box>
    </Box>
  );
}

function HousekeepingRow({ room }: { room: DashboardHousekeepingRoom }) {
  const { t } = useLanguage();
  const { label, tone } = roomStatus(room, t);
  return (
    <Box
      component={Link}
      href={`/rooms/${room.id}`}
      sx={{
        color: "inherit",
        display: "block",
        px: { xs: 2, sm: 2.5 },
        py: 1.4,
        textDecoration: "none",
        "&:hover": { bgcolor: "action.hover" },
        "&:focus-visible": { outline: "3px solid", outlineColor: "primary.main", outlineOffset: -3 },
      }}
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: ".875rem", fontWeight: 700 }}>
            {room.name}
          </Typography>
          <Typography color="text.secondary" noWrap sx={{ mt: 0.2 }} variant="caption">
            {room.notes || room.roomType || t("Room follow-up", "Ufuatiliaji wa chumba")}
          </Typography>
          {room.updatedAt ? (
            <Typography color="text.disabled" sx={{ display: { xs: "block", sm: "none" }, mt: 0.2 }} variant="caption">
              {formatLocalDateTime(room.updatedAt)}
            </Typography>
          ) : null}
        </Box>
        {room.updatedAt ? (
          <Typography color="text.secondary" sx={{ display: { xs: "none", sm: "block" }, flexShrink: 0 }} variant="caption">
            {formatLocalDateTime(room.updatedAt)}
          </Typography>
        ) : null}
        <StatusPill label={label} tone={tone} />
        <ArrowForwardRoundedIcon color="action" fontSize="small" sx={{ flexShrink: 0 }} />
      </Stack>
    </Box>
  );
}

function roomStatus(
  room: DashboardHousekeepingRoom,
  t: (english: string, swahili: string) => string,
): { label: string; tone: StatusTone } {
  if (room.operationalStatus === "out_of_service" || room.housekeepingStatus === "out_of_service") {
    return { label: t("Maintenance", "Matengenezo"), tone: "danger" };
  }
  if (room.housekeepingStatus === "cleaning") {
    return { label: t("Cleaning", "Usafi"), tone: "info" };
  }
  if (room.housekeepingStatus === "needs_cleaning") {
    return { label: t("Needs cleaning", "Kinahitaji usafi"), tone: "warning" };
  }
  return {
    label: humanize(room.housekeepingStatus || room.operationalStatus) || t("Attention", "Uangalizi"),
    tone: "warning",
  };
}

function humanize(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
