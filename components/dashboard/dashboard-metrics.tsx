"use client";

import type { ReactNode } from "react";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import CleaningServicesRoundedIcon from "@mui/icons-material/CleaningServicesRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import { Box } from "@mui/material";

import { useLanguage } from "@/components/providers/language-provider";
import {
  MetricCell,
  type StatusTone,
} from "@/components/shared/workspace-ui";
import type { HomeDashboard } from "@/features/dashboard/models/dashboard";
import type { WorkspaceRole } from "@/features/session/permissions";
import { getPropertyTypeDefinition } from "@/features/property/property-type";

const compactMoney = new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  notation: "compact",
  maximumFractionDigits: 1,
});

type DashboardMetric = {
  caption: string;
  href?: string;
  icon: ReactNode;
  label: string;
  tone?: StatusTone;
  value: ReactNode;
};

export function DashboardMetricGrid({
  dashboard,
  propertyType,
  role,
}: {
  dashboard: HomeDashboard;
  propertyType?: string;
  role: WorkspaceRole;
}) {
  const { t } = useLanguage();
  const { finance, summary } = dashboard;
  const propertyDefinition = getPropertyTypeDefinition(propertyType);
  const singular = t(propertyDefinition.inventorySingular[0], propertyDefinition.inventorySingular[1]);
  const plural = t(propertyDefinition.inventoryPlural[0], propertyDefinition.inventoryPlural[1]);
  const occupancy = percentage(summary.occupiedRooms, summary.totalActiveRooms);
  const serviceDue = summary.arrivalsDue + summary.departuresDue;
  let metrics: DashboardMetric[];

  if (role === "owner") {
    metrics = [
      {
        caption: t(
          `${summary.occupiedRooms} of ${summary.totalActiveRooms} active ${plural}`,
          `${summary.occupiedRooms} kati ya ${plural} ${summary.totalActiveRooms} zinazotumika`,
        ),
        href: "/rooms",
        icon: <HotelRoundedIcon />,
        label: t("Occupancy", `Matumizi ya ${plural}`),
        tone: "info",
        value: `${occupancy}%`,
      },
      {
        caption: finance
          ? t(
              `${finance.todayPaymentCount} payment${finance.todayPaymentCount === 1 ? "" : "s"} recorded`,
              `Malipo ${finance.todayPaymentCount} yamerekodiwa`,
            )
          : t("Financial data unavailable", "Taarifa za fedha hazipatikani"),
        href: "/finance",
        icon: <PaymentsRoundedIcon />,
        label: t("Collected today", "Makusanyo leo"),
        tone: finance ? "success" : "neutral",
        value: finance ? compactMoney.format(finance.todayCollected) : "—",
      },
      {
        caption: finance
          ? t(
              `${finance.openBalanceCount} booking${finance.openBalanceCount === 1 ? "" : "s"} to follow up`,
              `Uhifadhi ${finance.openBalanceCount} wa kufuatilia`,
            )
          : t("Financial data unavailable", "Taarifa za fedha hazipatikani"),
        href: "/finance",
        icon: <AccountBalanceWalletRoundedIcon />,
        label: t("Outstanding", "Madeni yaliyobaki"),
        tone: !finance
          ? "neutral"
          : finance.outstandingBalance
            ? "warning"
            : "success",
        value: finance ? compactMoney.format(finance.outstandingBalance) : "—",
      },
      {
        caption: t(
          `${summary.arrivalsDue} arrivals · ${summary.departuresDue} departures`,
          `Wanaowasili ${summary.arrivalsDue} · wanaondoka ${summary.departuresDue}`,
        ),
        href: "/bookings",
        icon: <LoginRoundedIcon />,
        label: t("Service due", "Huduma zinazohitajika"),
        tone: serviceDue ? "warning" : "success",
        value: serviceDue,
      },
    ];
  } else if (role === "manager") {
    metrics = [
      {
        caption: t(
          `${summary.occupiedRooms} of ${summary.totalActiveRooms} ${plural}`,
          `${summary.occupiedRooms} kati ya ${plural} ${summary.totalActiveRooms}`,
        ),
        href: "/rooms",
        icon: <HotelRoundedIcon />,
        label: t("Occupancy", `Matumizi ya ${plural}`),
        tone: "info",
        value: `${occupancy}%`,
      },
      arrivalMetric(dashboard, t),
      departureMetric(dashboard, t),
      {
        caption: t("Cleaning or service follow-up", "Ufuatiliaji wa usafi au matengenezo"),
        href: "/rooms",
        icon: <CleaningServicesRoundedIcon />,
        label: t(`${plural} needing action`, `${plural} zinazohitaji hatua`),
        tone: summary.attentionRooms ? "warning" : "success",
        value: summary.attentionRooms,
      },
    ];
  } else if (role === "receptionist") {
    metrics = [
      arrivalMetric(dashboard, t),
      departureMetric(dashboard, t),
      {
        caption: t(
          `Available from ${summary.totalActiveRooms} active ${plural}`,
          `Zinapatikana kati ya ${plural} ${summary.totalActiveRooms} zinazotumika`,
        ),
        href: "/rooms?status=ready",
        icon: <BedRoundedIcon />,
        label: t(`${plural} ready`, `${plural} tayari`),
        tone: summary.readyRooms ? "success" : "warning",
        value: summary.readyRooms,
      },
      {
        caption: t("Guests currently staying", "Wageni wanaokaa sasa"),
        href: "/rooms?status=occupied",
        icon: <HotelRoundedIcon />,
        label: t("In house", "Waliopo"),
        tone: "info",
        value: summary.occupiedRooms,
      },
    ];
  } else {
    metrics = [
      {
        caption: t(`Active ${singular} inventory`, `Orodha ya ${plural} zinazotumika`),
        href: "/rooms",
        icon: <BedRoundedIcon />,
        label: t(`Active ${plural}`, `${plural} zinazotumika`),
        value: summary.totalActiveRooms,
      },
      {
        caption: t("Current occupied inventory", `${plural} zilizokaliwa sasa`),
        icon: <HotelRoundedIcon />,
        label: t("Occupied", "Vimekaliwa"),
        tone: "info",
        value: summary.occupiedRooms,
      },
      {
        caption: t("Clean and available", "Visafi na vinapatikana"),
        icon: <BedRoundedIcon />,
        label: t("Ready", "Tayari"),
        tone: "success",
        value: summary.readyRooms,
      },
      {
        caption: t("Operational follow-up", "Ufuatiliaji wa uendeshaji"),
        icon: <CleaningServicesRoundedIcon />,
        label: t("Attention", "Uangalizi"),
        tone: summary.attentionRooms ? "warning" : "success",
        value: summary.attentionRooms,
      },
    ];
  }

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
      {metrics.map((metric) => (
        <MetricCell key={metric.label} {...metric} />
      ))}
    </Box>
  );
}

function arrivalMetric(
  dashboard: HomeDashboard,
  t: (english: string, swahili: string) => string,
): DashboardMetric {
  const { summary } = dashboard;
  return {
    caption: summary.overdueArrivals
      ? t(
          `${summary.overdueArrivals} overdue arrival${summary.overdueArrivals === 1 ? "" : "s"}`,
          `Wanaowasili ${summary.overdueArrivals} wamechelewa`,
        )
      : t("Due at the front desk", "Wanatarajiwa mapokezi"),
    href: "/bookings",
    icon: <LoginRoundedIcon />,
    label: t("Arrivals due", "Wanaowasili"),
    tone: summary.overdueArrivals ? "danger" : summary.arrivalsDue ? "info" : "success",
    value: summary.arrivalsDue,
  };
}

function departureMetric(
  dashboard: HomeDashboard,
  t: (english: string, swahili: string) => string,
): DashboardMetric {
  const { summary } = dashboard;
  return {
    caption: summary.overdueDepartures
      ? t(
          `${summary.overdueDepartures} overdue departure${summary.overdueDepartures === 1 ? "" : "s"}`,
          `Wanaondoka ${summary.overdueDepartures} wamechelewa`,
        )
      : t("Room turnover due", "Mabadiliko ya vyumba yanahitajika"),
    href: "/bookings",
    icon: <LogoutRoundedIcon />,
    label: t("Departures due", "Wanaondoka"),
    tone: summary.overdueDepartures ? "danger" : summary.departuresDue ? "warning" : "success",
    value: summary.departuresDue,
  };
}

export function percentage(value: number, total: number): number {
  return total ? Math.max(0, Math.min(100, Math.round((value / total) * 100))) : 0;
}
