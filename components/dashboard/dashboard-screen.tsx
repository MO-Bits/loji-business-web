"use client";

import Link from "next/link";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { Alert, Box, Button, LinearProgress, Stack, Typography } from "@mui/material";

import { useLanguage } from "@/components/providers/language-provider";
import {
  StickyMobileActionBar,
  Surface,
  WorkspacePage,
} from "@/components/shared/workspace-ui";
import { useHomeDashboard } from "@/features/dashboard/hooks/use-home-dashboard";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { normalizeWorkspaceRole } from "@/features/session/permissions";

import { DashboardHeader } from "./dashboard-header";
import { DashboardMetricGrid } from "./dashboard-metrics";
import { GuestMovementQueue } from "./dashboard-queue";
import { RoomReadinessPanel } from "./dashboard-rooms";
import { DashboardError, DashboardLoading } from "./dashboard-states";
import { DailyStatusBanner } from "./dashboard-status";

export function DashboardScreen() {
  const { t } = useLanguage();
  const sessionState = useAppSession();
  const propertyId = sessionState.session?.activePropertyId;
  const { dashboard, loading, error, refresh } = useHomeDashboard(propertyId);

  if (sessionState.loading || (!dashboard && loading)) {
    return <DashboardLoading />;
  }

  if (sessionState.error || !propertyId) {
    return (
      <DashboardError
        message={
          sessionState.error?.message ??
          t(
            "Select an active property to open its dashboard.",
            "Chagua biashara inayotumika ili kufungua dashibodi yake.",
          )
        }
        onRetry={() => void sessionState.refresh()}
      />
    );
  }

  if (!dashboard) {
    return (
      <DashboardError
        message={error?.message}
        onRetry={() => void refresh()}
      />
    );
  }

  const role = normalizeWorkspaceRole(dashboard.role);
  const canCreateBooking = dashboard.capabilities.createBooking;

  return (
    <Box sx={{ minHeight: "100dvh", pb: { xs: canCreateBooking ? 11 : 0, md: 0 } }}>
      <WorkspacePage>
        <Stack spacing={{ xs: 2, sm: 2.5 }}>
          {loading ? (
            <LinearProgress
              aria-label={t("Refreshing dashboard", "Inasasisha dashibodi")}
              sx={{ borderRadius: 99 }}
            />
          ) : null}

          <DashboardHeader
            businessDate={dashboard.businessDate}
            capabilities={dashboard.capabilities}
            onRefresh={() => void refresh()}
            propertyName={String(sessionState.session?.property?.name ?? "")}
            propertyType={String(sessionState.session?.property?.type ?? "hotel")}
            refreshing={loading}
            role={role}
          />

          {error ? (
            <Alert
              severity="warning"
              action={
                <Button color="inherit" onClick={() => void refresh()}>
                  {t("Retry", "Jaribu tena")}
                </Button>
              }
            >
              {error.message}
            </Alert>
          ) : null}

          {role === "member" ? (
            <MemberLimitedState />
          ) : (
            <>
              <DailyStatusBanner dashboard={dashboard} role={role} />
              <DashboardMetricGrid dashboard={dashboard} propertyType={sessionState.session?.property?.type} role={role} />
              <Box sx={twoColumnLayout}>
                <GuestMovementQueue
                  arrivals={dashboard.arrivals}
                  departures={dashboard.departures}
                  role={role}
                  showFinance={false}
                  summary={dashboard.summary}
                />
                <RoomReadinessPanel
                  housekeeping={dashboard.housekeeping}
                  propertyType={sessionState.session?.property?.type}
                  role={role}
                  summary={dashboard.summary}
                />
              </Box>
            </>
          )}
        </Stack>
      </WorkspacePage>

      {canCreateBooking && role !== "member" ? (
        <StickyMobileActionBar>
          <Button
            component={Link}
            fullWidth
            href="/bookings/new"
            startIcon={<AddRoundedIcon />}
            variant="contained"
          >
            {t("New booking", "Uhifadhi mpya")}
          </Button>
        </StickyMobileActionBar>
      ) : null}
    </Box>
  );
}

const twoColumnLayout = {
  alignItems: "start",
  display: "grid",
  gap: { xs: 2, sm: 2.5 },
  gridTemplateColumns: {
    xs: "minmax(0,1fr)",
    xl: "minmax(0,1.28fr) minmax(360px,.82fr)",
  },
};

function MemberLimitedState() {
  const { t } = useLanguage();
  return (
    <Surface>
      <Stack spacing={1.5} sx={{ alignItems: "flex-start", py: { xs: 2, sm: 3 } }}>
        <Box sx={{ bgcolor: "color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent)", borderRadius: 2, color: "primary.main", display: "grid", height: 44, placeItems: "center", width: 44 }}>
          <LockOutlinedIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {t("Operational access is limited", "Ufikiaji wa uendeshaji umepunguzwa")}
          </Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 600, mt: 0.5 }} variant="body2">
            {t(
              "Your membership does not include guest, room, or financial operations. Ask a property owner or manager if your responsibilities have changed.",
              "Uanachama wako haujumuishi shughuli za wageni, vyumba au fedha. Wasiliana na mmiliki au meneja ikiwa majukumu yako yamebadilika.",
            )}
          </Typography>
        </Box>
        <Button component={Link} href="/settings/profile" variant="outlined">
          {t("View my account", "Tazama akaunti yangu")}
        </Button>
      </Stack>
    </Surface>
  );
}
