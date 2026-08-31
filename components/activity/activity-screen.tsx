"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import {
  Alert,
  Avatar,
  Box,
  Button,
  IconButton,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Typography,
} from "@mui/material";

import { useLanguage } from "@/components/providers/language-provider";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, LoadingRows, StatusPill, Surface, WorkspacePage } from "@/components/shared/workspace-ui";
import type { ActivityItem } from "@/features/activity/models/activity";
import { listPropertyActivity } from "@/features/activity/services/activity-service";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { getWorkspaceCapabilities } from "@/features/session/permissions";
import { formatLocalDateTime } from "@/lib/date-time";
import { createClient } from "@/lib/supabase/client";

const PAGE_SIZE = 30;

export function ActivityScreen() {
  const { t } = useLanguage();
  const { loading: sessionLoading, session } = useAppSession();
  const supabase = useMemo(() => createClient(), []);
  const [eventType, setEventType] = useState("");
  const [page, setPage] = useState(1);
  const [feedState, setFeedState] = useState<{
    propertyId: string;
    value: Awaited<ReturnType<typeof listPropertyActivity>>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<{ propertyId: string; message: string } | null>(null);
  const requestId = useRef(0);
  const propertyId = session?.activePropertyId;
  const feed = feedState && feedState.propertyId === propertyId ? feedState.value : null;
  const error = errorState && errorState.propertyId === propertyId ? errorState.message : null;
  const dataLoading = loading || Boolean(feedState && feedState.propertyId !== propertyId);
  const canView = getWorkspaceCapabilities(session?.activeRole).canViewActivity;

  const load = useCallback(async () => {
    if (!propertyId || !canView) {
      requestId.current += 1;
      setFeedState(null);
      setLoading(false);
      return;
    }
    const currentRequest = ++requestId.current;
    const requestPropertyId = propertyId;
    setLoading(true);
    setErrorState(null);
    setFeedState((current) => current?.propertyId === requestPropertyId ? current : null);
    try {
      const value = await listPropertyActivity(supabase, {
        propertyId: requestPropertyId,
        eventType,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      if (requestId.current === currentRequest) {
        setFeedState({ propertyId: requestPropertyId, value });
      }
    } catch (caught) {
      if (requestId.current === currentRequest) {
        setErrorState({
          propertyId: requestPropertyId,
          message: caught instanceof Error ? caught.message : t("Unable to load activity.", "Imeshindikana kupakia shughuli."),
        });
      }
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  }, [canView, eventType, page, propertyId, supabase, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(timer);
      requestId.current += 1;
    };
  }, [load]);

  if (!sessionLoading && !canView) {
    return (
      <WorkspacePage>
        <Alert severity="warning">
          {t("The property activity log is available to owners and managers.", "Historia ya shughuli inapatikana kwa wamiliki na mameneja.")}
        </Alert>
      </WorkspacePage>
    );
  }

  if (!sessionLoading && !propertyId) {
    return (
      <WorkspacePage>
        <Alert severity="info">
          {t("Choose or create a property to open its activity log.", "Chagua au unda biashara ili kufungua historia yake ya shughuli.")}
        </Alert>
      </WorkspacePage>
    );
  }

  return (
    <WorkspacePage maxWidth={1120}>
      <Stack spacing={{ xs: 2.5, sm: 3 }}>
        <PageHeader
          title={t("Activity", "Shughuli")}
          description={t(
            "A dependable record of operational changes across your property.",
            "Rekodi ya kuaminika ya mabadiliko ya uendeshaji katika biashara yako.",
          )}
          action={
            <Button component={Link} href="/notifications" variant="outlined">
              {t("My notifications", "Arifa zangu")}
            </Button>
          }
        />

        <Surface sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
            <Box>
              <Typography sx={{ fontWeight: 700 }}>{t("Property timeline", "Mfuatano wa shughuli")}</Typography>
              <Typography color="text.secondary" variant="body2">
                {feed?.total ?? 0} {t("recorded events", "matukio yaliyorekodiwa")}
              </Typography>
            </Box>
            <Select
              displayEmpty
              inputProps={{ "aria-label": t("Filter activity", "Chuja shughuli") }}
              onChange={(event) => {
                setEventType(event.target.value);
                setPage(1);
              }}
              size="small"
              sx={{ minWidth: { sm: 210 } }}
              value={eventType}
            >
              <MenuItem value="">{t("All activity", "Shughuli zote")}</MenuItem>
              <MenuItem value="booking">{t("Bookings", "Uhifadhi")}</MenuItem>
              <MenuItem value="payment">{t("Payments", "Malipo")}</MenuItem>
              <MenuItem value="room">{t("Rooms & housekeeping", "Vyumba na usafi")}</MenuItem>
              <MenuItem value="property">{t("Property & team", "Biashara na timu")}</MenuItem>
            </Select>
          </Stack>
        </Surface>

        {error ? (
          <Alert action={<Button onClick={() => void load()}>{t("Retry", "Jaribu tena")}</Button>} severity="error">
            {error}
          </Alert>
        ) : null}

        <Surface padding={false}>
          {dataLoading ? (
            <LoadingRows rows={8} />
          ) : !feed?.items.length ? (
            <EmptyState
              description={t("Operational actions will appear here as your team works.", "Vitendo vya uendeshaji vitaonekana hapa timu yako inapofanya kazi.")}
              icon={<HistoryRoundedIcon />}
              title={t("No activity yet", "Bado hakuna shughuli")}
            />
          ) : (
            <Stack divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}>
              {feed.items.map((item) => <ActivityRow item={item} key={item.id} />)}
            </Stack>
          )}
          {(feed?.total ?? 0) > PAGE_SIZE ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
              <Pagination count={Math.ceil((feed?.total ?? 0) / PAGE_SIZE)} onChange={(_, value) => setPage(value)} page={page} showFirstButton showLastButton />
            </Box>
          ) : null}
        </Surface>
      </Stack>
    </WorkspacePage>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const { t } = useLanguage();
  const href = entityHref(item);
  const icon = activityIcon(item);
  const title = item.description || formatEvent(item.eventType, item.entityType);
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start", px: { xs: 2, sm: 2.5 }, py: 2 }}>
      <Avatar sx={{ bgcolor: "color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent)", color: "primary.main", height: 38, width: 38 }}>
        {icon}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 0.35, sm: 1 }} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
          <Typography sx={{ fontWeight: 700 }} variant="body2">{t(title)}</Typography>
          <Typography color="text.secondary" sx={{ flexShrink: 0 }} variant="caption">
            {formatLocalDateTime(item.createdAt)}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 0.6 }}>
          <Typography color="text.secondary" noWrap variant="caption">{t(item.actorName)}</Typography>
          <StatusPill label={t(item.entityType || "system")} tone="neutral" />
        </Stack>
      </Box>
      {href ? (
        <IconButton aria-label={t("Open record", "Fungua kumbukumbu")} component={Link} href={href} size="small">
          <ArrowOutwardRoundedIcon fontSize="small" />
        </IconButton>
      ) : null}
    </Stack>
  );
}

function entityHref(item: ActivityItem) {
  if (!item.entityId) return "";
  if (item.entityType === "booking") return `/bookings/${item.entityId}`;
  if (item.entityType === "room") return `/rooms/${item.entityId}`;
  return "";
}

function activityIcon(item: ActivityItem) {
  const value = `${item.entityType} ${item.eventType}`.toLowerCase();
  if (value.includes("payment")) return <PaymentsRoundedIcon fontSize="small" />;
  if (value.includes("booking")) return <EventNoteRoundedIcon fontSize="small" />;
  if (value.includes("room") || value.includes("housekeeping")) return <BedRoundedIcon fontSize="small" />;
  if (value.includes("staff") || value.includes("member")) return <BadgeRoundedIcon fontSize="small" />;
  return <SettingsRoundedIcon fontSize="small" />;
}

function formatEvent(eventType: string, entityType: string) {
  const words = (eventType || `${entityType} updated`).replaceAll("_", " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
