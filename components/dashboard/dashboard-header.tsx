"use client";

import Link from "next/link";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import {
  Box,
  Button,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";

import { useLanguage } from "@/components/providers/language-provider";
import { StatusPill, Surface } from "@/components/shared/workspace-ui";
import type { DashboardCapabilities } from "@/features/dashboard/models/dashboard";
import type { WorkspaceRole } from "@/features/session/permissions";

export function DashboardHeader({
  businessDate,
  capabilities,
  onRefresh,
  propertyName,
  refreshing,
  role,
}: {
  businessDate: Date;
  capabilities: DashboardCapabilities;
  onRefresh: () => void;
  propertyName: string;
  refreshing: boolean;
  role: WorkspaceRole;
}) {
  const { language, t } = useLanguage();
  const content = roleContent(role, t);
  const date = Number.isNaN(businessDate.getTime())
    ? t("Business date unavailable", "Tarehe ya biashara haipatikani")
    : businessDate.toLocaleDateString(language === "sw" ? "sw-TZ" : "en-TZ", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  return (
    <Surface
      sx={{
        backgroundImage:
          "radial-gradient(circle at 92% 5%, color-mix(in srgb, var(--mui-palette-primary-main) 14%, transparent), transparent 36%)",
        p: { xs: 2, sm: 2.75, lg: 3.25 },
        position: "relative",
      }}
    >
      <Stack
        component="header"
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 2.25, md: 3 }}
        sx={{ alignItems: { md: "flex-end" }, justifyContent: "space-between" }}
      >
        <Box sx={{ maxWidth: 760, minWidth: 0 }}>
          <Stack
            direction="row"
            spacing={0.75}
            sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.75 }}
          >
            <Typography color="primary.main" variant="overline">
              {content.eyebrow}
            </Typography>
            <StatusPill label={content.roleLabel} tone="info" />
          </Stack>
          <Typography
            component="h1"
            sx={{
              fontSize: { xs: "1.55rem", sm: "1.9rem", lg: "2.15rem" },
              fontWeight: 700,
              letterSpacing: "-.04em",
              lineHeight: 1.08,
              mt: 0.9,
            }}
          >
            {content.title}
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ fontSize: { xs: ".8125rem", sm: ".875rem" }, lineHeight: 1.55, mt: 0.9 }}
          >
            {content.description}
          </Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 0.4, sm: 1.5 }}
            sx={{ color: "text.secondary", mt: 1.5 }}
          >
            <Stack direction="row" spacing={0.6} sx={{ alignItems: "center" }}>
              <ApartmentRoundedIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption">
                {propertyName || t("Active property", "Biashara inayotumika")}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.6} sx={{ alignItems: "center" }}>
              <CalendarMonthRoundedIcon sx={{ fontSize: 16 }} />
              <Typography sx={{ textTransform: "capitalize" }} variant="caption">
                {date}
              </Typography>
            </Stack>
          </Stack>
        </Box>

        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", flexShrink: 0, width: { xs: "100%", md: "auto" } }}
        >
          <Box sx={{ display: { xs: "none", md: "contents" } }}>
            {role === "owner" ? (
              <Button
                component={Link}
                href="/finance"
                startIcon={<TrendingUpRoundedIcon />}
                variant="outlined"
              >
                {t("Open finance", "Fungua fedha")}
              </Button>
            ) : role === "manager" ? (
              <Button
                component={Link}
                href="/rooms"
                startIcon={<ApartmentRoundedIcon />}
                variant="outlined"
              >
                {t("Room board", "Ubao wa vyumba")}
              </Button>
            ) : role === "receptionist" ? (
              <Button
                component={Link}
                href="/calendar"
                startIcon={<CalendarMonthRoundedIcon />}
                variant="outlined"
              >
                {t("Calendar", "Kalenda")}
              </Button>
            ) : null}
            {capabilities.createBooking ? (
              <Button
                component={Link}
                href="/bookings/new"
                startIcon={<AddRoundedIcon />}
                variant="contained"
              >
                {t("New booking", "Uhifadhi mpya")}
              </Button>
            ) : null}
          </Box>
          <Tooltip title={t("Refresh dashboard", "Sasisha dashibodi")}>
            <span>
              <IconButton
                aria-label={t("Refresh dashboard", "Sasisha dashibodi")}
                disabled={refreshing}
                onClick={onRefresh}
                sx={{ border: "1px solid", borderColor: "divider" }}
              >
                <RefreshRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>
    </Surface>
  );
}

function roleContent(
  role: WorkspaceRole,
  t: (english: string, swahili: string) => string,
) {
  if (role === "owner") {
    return {
      eyebrow: t("Executive home", "Nyumbani kwa mmiliki"),
      roleLabel: t("Owner", "Mmiliki"),
      title: t("Business performance today", "Utendaji wa biashara leo"),
      description: t(
        "Revenue, occupancy, service demand, and room readiness in one decision-ready view.",
        "Mapato, matumizi ya vyumba, mahitaji ya huduma na utayari wa vyumba katika muonekano mmoja.",
      ),
    };
  }
  if (role === "manager") {
    return {
      eyebrow: t("Operations home", "Nyumbani kwa uendeshaji"),
      roleLabel: t("Manager", "Meneja"),
      title: t("Keep today’s operation moving", "Endesha shughuli za leo kwa ufanisi"),
      description: t(
        "Prioritize arrivals, departures, room turnover, and housekeeping work for the team.",
        "Panga wanaowasili, wanaoondoka, mabadiliko ya vyumba na kazi za usafi kwa timu.",
      ),
    };
  }
  if (role === "receptionist") {
    return {
      eyebrow: t("Front desk home", "Nyumbani kwa mapokezi"),
      roleLabel: t("Receptionist", "Mapokezi"),
      title: t("Run the front desk with confidence", "Endesha mapokezi kwa uhakika"),
      description: t(
        "See every guest due in or out, confirm room readiness, and open the next action quickly.",
        "Ona kila mgeni anayewasili au kuondoka, thibitisha vyumba na fungua hatua inayofuata haraka.",
      ),
    };
  }
  return {
    eyebrow: t("Workspace home", "Nyumbani kwa eneo la kazi"),
    roleLabel: t("Member", "Mwanachama"),
    title: t("Property overview", "Muhtasari wa biashara"),
    description: t(
      "A read-only view of the property’s current operational position.",
      "Mwonekano wa kusoma tu wa hali ya sasa ya uendeshaji wa biashara.",
    ),
  };
}
