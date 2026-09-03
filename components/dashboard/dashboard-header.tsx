"use client";

import Link from "next/link";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { Box, Button, IconButton, Stack, Tooltip, Typography } from "@mui/material";

import { useLanguage } from "@/components/providers/language-provider";
import { StatusPill } from "@/components/shared/workspace-ui";
import type { DashboardCapabilities } from "@/features/dashboard/models/dashboard";
import { getPropertyTypeDefinition } from "@/features/property/property-type";
import type { WorkspaceRole } from "@/features/session/permissions";

export function DashboardHeader({
  businessDate,
  capabilities,
  onRefresh,
  propertyName,
  propertyType,
  refreshing,
  role,
}: {
  businessDate: Date;
  capabilities: DashboardCapabilities;
  onRefresh: () => void;
  propertyName: string;
  propertyType: string;
  refreshing: boolean;
  role: WorkspaceRole;
}) {
  const { language, t } = useLanguage();
  const propertyDefinition = getPropertyTypeDefinition(propertyType);
  const date = Number.isNaN(businessDate.getTime())
    ? t("Today", "Leo")
    : businessDate.toLocaleDateString(language === "sw" ? "sw-TZ" : "en-TZ", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
  const roleLabel = role === "owner"
    ? t("Owner", "Mmiliki")
    : role === "manager"
      ? t("Manager", "Meneja")
      : role === "receptionist"
        ? t("Receptionist", "Mapokezi")
        : t("Member", "Mwanachama");
  const focus = role === "owner"
    ? t("Your business at a glance", "Biashara yako kwa muhtasari")
    : role === "manager"
      ? t("Today’s operation at a glance", "Shughuli za leo kwa muhtasari")
      : role === "receptionist"
        ? t("Your front-desk priorities", "Vipaumbele vya mapokezi")
        : t("Today’s property overview", "Muhtasari wa biashara leo");

  return (
    <Stack
      component="header"
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      sx={{
        alignItems: { sm: "center" },
        justifyContent: "space-between",
        py: { xs: 0.25, sm: 0.5 },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          color="text.secondary"
          sx={{ textTransform: "capitalize" }}
          variant="body2"
        >
          {date}
        </Typography>
        <Typography
          component="h1"
          sx={{
            fontSize: { xs: "1.5rem", sm: "1.75rem" },
            fontWeight: 700,
            letterSpacing: "-.035em",
            lineHeight: 1.15,
            mt: 0.35,
          }}
        >
          {propertyName || "Loji Business"}
        </Typography>
        <Stack
          direction="row"
          spacing={0.75}
          sx={{ alignItems: "center", flexWrap: "wrap", mt: 0.75, rowGap: 0.75 }}
        >
          <StatusPill label={roleLabel} tone="info" />
          <StatusPill
            label={t(propertyDefinition.label[0], propertyDefinition.label[1])}
            tone="neutral"
          />
          <Typography color="text.secondary" variant="caption">
            {focus}
          </Typography>
        </Stack>
      </Box>

      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexShrink: 0 }}>
        {capabilities.createBooking ? (
          <Button
            component={Link}
            href="/bookings/new"
            startIcon={<AddRoundedIcon />}
            sx={{ display: { xs: "none", md: "inline-flex" } }}
            variant="contained"
          >
            {t("New booking", "Uhifadhi mpya")}
          </Button>
        ) : null}
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
  );
}
