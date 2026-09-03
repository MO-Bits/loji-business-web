"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CleaningServicesRoundedIcon from "@mui/icons-material/CleaningServicesRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { Box, Stack, Typography } from "@mui/material";

import { useLanguage } from "@/components/providers/language-provider";
import {
  SectionHeading,
  Surface,
  type StatusTone,
} from "@/components/shared/workspace-ui";
import type {
  DashboardCapabilities,
  HomeDashboard,
} from "@/features/dashboard/models/dashboard";
import type { WorkspaceRole } from "@/features/session/permissions";

type PriorityItem = {
  href: string;
  label: string;
  tone: StatusTone;
};

export function DailyStatusBanner({
  dashboard,
  role,
}: {
  dashboard: HomeDashboard;
  role: WorkspaceRole;
}) {
  const { t } = useLanguage();
  const { finance, summary } = dashboard;
  const priorities: PriorityItem[] = [];

  if (summary.arrivalsDue) {
    priorities.push({
      href: "/bookings",
      label: summary.overdueArrivals
        ? t(
            `${summary.overdueArrivals} overdue of ${summary.arrivalsDue} arrivals`,
            `${summary.overdueArrivals} wamechelewa kati ya wanaowasili ${summary.arrivalsDue}`,
          )
        : t(
            `${summary.arrivalsDue} arrival${summary.arrivalsDue === 1 ? "" : "s"} due`,
            `Wanaowasili ${summary.arrivalsDue} wanatarajiwa`,
          ),
      tone: summary.overdueArrivals ? "danger" : "info",
    });
  }

  if (summary.departuresDue) {
    priorities.push({
      href: "/bookings",
      label: summary.overdueDepartures
        ? t(
            `${summary.overdueDepartures} overdue of ${summary.departuresDue} departures`,
            `${summary.overdueDepartures} wamechelewa kati ya wanaoondoka ${summary.departuresDue}`,
          )
        : t(
            `${summary.departuresDue} departure${summary.departuresDue === 1 ? "" : "s"} due`,
            `Wanaondoka ${summary.departuresDue} wanatarajiwa`,
          ),
      tone: summary.overdueDepartures ? "danger" : "warning",
    });
  }

  if (summary.attentionRooms) {
    priorities.push({
      href: "/rooms",
      label: t(
        `${summary.attentionRooms} room${summary.attentionRooms === 1 ? "" : "s"} need action`,
        `Vyumba ${summary.attentionRooms} vinahitaji hatua`,
      ),
      tone: "warning",
    });
  }

  if (role === "owner" && finance?.openBalanceCount) {
    priorities.push({
      href: "/finance",
      label: t(
        `${finance.openBalanceCount} open balance${finance.openBalanceCount === 1 ? "" : "s"}`,
        `Madeni ${finance.openBalanceCount} yaliyo wazi`,
      ),
      tone: "warning",
    });
  }

  const hasOverdue = Boolean(summary.overdueArrivals || summary.overdueDepartures);
  const statusTone: StatusTone = hasOverdue
    ? "danger"
    : priorities.some((item) => item.tone === "warning")
      ? "warning"
      : priorities.length
        ? "info"
        : "success";
  const title = role === "owner"
    ? t("Today’s decision queue", "Foleni ya maamuzi ya leo")
    : role === "manager"
      ? t("Operational priorities", "Vipaumbele vya uendeshaji")
      : role === "receptionist"
        ? t("Front desk priorities", "Vipaumbele vya mapokezi")
        : t("Daily status", "Hali ya leo");

  return (
    <Surface sx={bannerStyle(statusTone)}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 1.5, md: 2 }}
        sx={{ alignItems: { md: "center" }, justifyContent: "space-between" }}
      >
        <Stack direction="row" spacing={1.1} sx={{ alignItems: "flex-start", minWidth: 0 }}>
          <Box sx={bannerIconStyle(statusTone)}>
            {priorities.length ? (
              <WarningAmberRoundedIcon fontSize="small" />
            ) : (
              <CheckCircleRoundedIcon fontSize="small" />
            )}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.25 }} variant="body2">
              {priorities.length
                ? t(
                    "Open a priority to move directly into the work.",
                    "Fungua kipaumbele ili kwenda moja kwa moja kwenye kazi.",
                  )
                : t(
                    "No overdue guest or room actions are waiting right now.",
                    "Hakuna hatua za wageni au vyumba zilizochelewa kwa sasa.",
                  )}
            </Typography>
          </Box>
        </Stack>

        {priorities.length ? (
          <Stack
            direction="row"
            spacing={0.75}
            sx={{ flexWrap: "wrap", justifyContent: { md: "flex-end" }, rowGap: 0.75 }}
          >
            {priorities.map((priority, index) => (
              <PriorityLink
                href={priority.href}
                key={`${priority.href}-${index}`}
                label={priority.label}
                tone={priority.tone}
              />
            ))}
          </Stack>
        ) : null}
      </Stack>
    </Surface>
  );
}

function PriorityLink({
  href,
  label,
  tone,
}: {
  href: string;
  label: string;
  tone: StatusTone;
}) {
  return (
    <Box
      component={Link}
      href={href}
      sx={{
        ...priorityTone(tone),
        borderRadius: 99,
        display: "inline-flex",
        fontSize: ".75rem",
        fontWeight: 500,
        px: 1.1,
        py: 0.65,
        textDecoration: "none",
        transition: "filter 150ms ease",
        "&:hover": { filter: "brightness(.97)" },
        "&:focus-visible": { outline: "3px solid", outlineColor: "primary.main", outlineOffset: 2 },
      }}
    >
      {label}
    </Box>
  );
}

export function RoleQuickActions({
  capabilities,
  role,
}: {
  capabilities: DashboardCapabilities;
  role: WorkspaceRole;
}) {
  const { t } = useLanguage();
  const actions: Array<{
    description: string;
    href: string;
    icon: ReactNode;
    label: string;
  }> = [];

  if (role === "owner") {
    actions.push(
      {
        description: t("Collections and balances", "Makusanyo na madeni"),
        href: "/finance",
        icon: <AccountBalanceWalletRoundedIcon />,
        label: t("Finance", "Fedha"),
      },
      {
        description: t("Operational and revenue trends", "Mwenendo wa uendeshaji na mapato"),
        href: "/reports",
        icon: <AssessmentRoundedIcon />,
        label: t("Reports", "Ripoti"),
      },
      {
        description: t("Availability and housekeeping", "Upatikanaji na usafi"),
        href: "/rooms",
        icon: <HotelRoundedIcon />,
        label: t("Room board", "Ubao wa vyumba"),
      },
    );
  } else if (role === "manager") {
    actions.push(
      {
        description: t("Availability and housekeeping", "Upatikanaji na usafi"),
        href: "/rooms",
        icon: <CleaningServicesRoundedIcon />,
        label: t("Room board", "Ubao wa vyumba"),
      },
      {
        description: t("Team access and status", "Ufikiaji na hali ya timu"),
      href: "/settings/team",
        icon: <ManageAccountsRoundedIcon />,
        label: t("Staff", "Wafanyakazi"),
      },
      {
        description: t("Plan upcoming stays", "Panga ukaaji unaokuja"),
        href: "/calendar",
        icon: <CalendarMonthRoundedIcon />,
        label: t("Calendar", "Kalenda"),
      },
    );
  } else if (role === "receptionist") {
    actions.push(
      {
        description: t("Open the reservation register", "Fungua rejista ya uhifadhi"),
        href: "/bookings",
        icon: <ReceiptLongRoundedIcon />,
        label: t("Bookings", "Uhifadhi"),
      },
      {
        description: t("Find a guest profile", "Tafuta wasifu wa mgeni"),
        href: "/guests",
        icon: <GroupsRoundedIcon />,
        label: t("Guests", "Wageni"),
      },
      {
        description: t("See stays by date", "Ona ukaaji kwa tarehe"),
        href: "/calendar",
        icon: <CalendarMonthRoundedIcon />,
        label: t("Calendar", "Kalenda"),
      },
    );
  }

  if (capabilities.createBooking) {
    actions.unshift({
      description: t("Start a new guest stay", "Anza ukaaji mpya wa mgeni"),
      href: "/bookings/new",
      icon: <AddRoundedIcon />,
      label: t("New booking", "Uhifadhi mpya"),
    });
  }

  if (!actions.length) return null;

  return (
    <Surface>
      <SectionHeading
        description={t(
          "Role-relevant destinations for the next task.",
          "Sehemu zinazofaa kwa jukumu lako na kazi inayofuata.",
        )}
        title={t("Quick actions", "Hatua za haraka")}
      />
      <Box
        sx={{
          display: "grid",
          gap: 1,
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" },
          mt: 2,
        }}
      >
        {actions.slice(0, 4).map((action) => (
          <Box
            component={Link}
            href={action.href}
            key={action.href}
            sx={{
              alignItems: "center",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              color: "inherit",
              display: "grid",
              gap: 1,
              gridTemplateColumns: "36px minmax(0,1fr) 20px",
              minWidth: 0,
              p: 1.25,
              textDecoration: "none",
              transition: "border-color 150ms ease, background-color 150ms ease",
              "&:hover": { bgcolor: "action.hover", borderColor: "primary.main" },
              "&:focus-visible": { outline: "3px solid", outlineColor: "primary.main", outlineOffset: 2 },
            }}
          >
            <Box sx={{ bgcolor: "color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent)", borderRadius: 1.5, color: "primary.main", display: "grid", height: 36, placeItems: "center", width: 36, "& .MuiSvgIcon-root": { fontSize: 19 } }}>
              {action.icon}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: ".8125rem", fontWeight: 700 }}>
                {action.label}
              </Typography>
              <Typography color="text.secondary" noWrap variant="caption">
                {action.description}
              </Typography>
            </Box>
            <ArrowForwardRoundedIcon color="action" fontSize="small" />
          </Box>
        ))}
      </Box>
    </Surface>
  );
}

function bannerStyle(tone: StatusTone) {
  return {
    bgcolor:
      tone === "danger"
        ? "color-mix(in srgb, var(--mui-palette-error-main) 6%, var(--mui-palette-background-paper))"
        : tone === "warning"
          ? "color-mix(in srgb, var(--mui-palette-warning-main) 7%, var(--mui-palette-background-paper))"
          : tone === "success"
            ? "color-mix(in srgb, var(--mui-palette-success-main) 6%, var(--mui-palette-background-paper))"
            : "color-mix(in srgb, var(--mui-palette-primary-main) 5%, var(--mui-palette-background-paper))",
    borderColor:
      tone === "danger"
        ? "color-mix(in srgb, var(--mui-palette-error-main) 24%, var(--mui-palette-divider))"
        : tone === "warning"
          ? "color-mix(in srgb, var(--mui-palette-warning-main) 26%, var(--mui-palette-divider))"
          : tone === "success"
            ? "color-mix(in srgb, var(--mui-palette-success-main) 22%, var(--mui-palette-divider))"
            : "color-mix(in srgb, var(--mui-palette-primary-main) 20%, var(--mui-palette-divider))",
  };
}

function bannerIconStyle(tone: StatusTone) {
  return {
    ...priorityTone(tone),
    borderRadius: 1.75,
    display: "grid",
    flexShrink: 0,
    height: 36,
    placeItems: "center",
    width: 36,
  };
}

function priorityTone(tone: StatusTone) {
  if (tone === "danger") {
    return {
      bgcolor: "color-mix(in srgb, var(--mui-palette-error-main) 12%, transparent)",
      color: "error.main",
    };
  }
  if (tone === "warning") {
    return {
      bgcolor: "color-mix(in srgb, var(--mui-palette-warning-main) 14%, transparent)",
      color: "warning.dark",
    };
  }
  if (tone === "success") {
    return {
      bgcolor: "color-mix(in srgb, var(--mui-palette-success-main) 12%, transparent)",
      color: "success.main",
    };
  }
  return {
    bgcolor: "color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent)",
    color: "primary.main",
  };
}
