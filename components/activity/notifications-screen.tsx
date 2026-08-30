"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import {
  Alert,
  Avatar,
  Box,
  Button,
  IconButton,
  Pagination,
  Stack,
  Switch,
  Typography,
} from "@mui/material";

import { useLanguage } from "@/components/providers/language-provider";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, LoadingRows, StatusPill, Surface, WorkspacePage } from "@/components/shared/workspace-ui";
import type { WorkspaceNotification } from "@/features/activity/models/activity";
import {
  listMyNotifications,
  markAllNotificationsRead,
  setNotificationRead,
} from "@/features/activity/services/activity-service";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { normalizeWorkspaceRole } from "@/features/session/permissions";
import { createClient } from "@/lib/supabase/client";

const PAGE_SIZE = 30;

export function NotificationsScreen() {
  const { t } = useLanguage();
  const { loading: sessionLoading, session } = useAppSession();
  const supabase = useMemo(() => createClient(), []);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [feedState, setFeedState] = useState<{
    propertyId: string;
    value: Awaited<ReturnType<typeof listMyNotifications>>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<{ propertyId: string; message: string } | null>(null);
  const requestId = useRef(0);
  const activePropertyId = useRef<string | undefined>(undefined);
  const propertyId = session?.activePropertyId;
  const feed = feedState && feedState.propertyId === propertyId ? feedState.value : null;
  const error = errorState && errorState.propertyId === propertyId ? errorState.message : null;
  const dataLoading = loading || Boolean(feedState && feedState.propertyId !== propertyId);
  const canView = normalizeWorkspaceRole(session?.activeRole) !== "member";

  useEffect(() => {
    activePropertyId.current = propertyId;
    return () => {
      activePropertyId.current = undefined;
    };
  }, [propertyId]);

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
      const value = await listMyNotifications(supabase, {
        propertyId: requestPropertyId,
        unreadOnly,
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
          message: caught instanceof Error ? caught.message : "Unable to load notifications.",
        });
      }
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  }, [canView, page, propertyId, supabase, unreadOnly]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(timer);
      requestId.current += 1;
    };
  }, [load]);

  const toggleRead = async (item: WorkspaceNotification) => {
    if (!propertyId) return;
    const requestPropertyId = propertyId;
    const previous = feedState?.propertyId === requestPropertyId ? feedState : null;
    const nextIsRead = !item.isRead;
    setWorkingId(item.id);
    setErrorState(null);
    setFeedState((current) => current?.propertyId === requestPropertyId ? {
      ...current,
      value: {
        ...current.value,
        items: unreadOnly && nextIsRead
          ? current.value.items.filter((candidate) => candidate.id !== item.id)
          : current.value.items.map((candidate) => candidate.id === item.id
            ? { ...candidate, isRead: nextIsRead }
            : candidate),
        total: unreadOnly && nextIsRead ? Math.max(0, current.value.total - 1) : current.value.total,
        unreadCount: Math.max(0, current.value.unreadCount + (nextIsRead ? -1 : 1)),
      },
    } : current);
    try {
      await setNotificationRead(supabase, item.id, nextIsRead);
    } catch (caught) {
      if (activePropertyId.current === requestPropertyId) {
        setFeedState(previous);
        setErrorState({
          propertyId: requestPropertyId,
          message: caught instanceof Error ? caught.message : "Unable to update notification.",
        });
      }
    } finally {
      if (activePropertyId.current === requestPropertyId) setWorkingId(null);
    }
  };

  const markAll = async () => {
    if (!propertyId) return;
    const requestPropertyId = propertyId;
    const previous = feedState?.propertyId === requestPropertyId ? feedState : null;
    setWorkingId("all");
    setErrorState(null);
    setFeedState((current) => current?.propertyId === requestPropertyId ? {
      ...current,
      value: {
        ...current.value,
        items: unreadOnly ? [] : current.value.items.map((item) => ({ ...item, isRead: true })),
        total: unreadOnly ? 0 : current.value.total,
        unreadCount: 0,
      },
    } : current);
    try {
      await markAllNotificationsRead(supabase, requestPropertyId);
    } catch (caught) {
      if (activePropertyId.current === requestPropertyId) {
        setFeedState(previous);
        setErrorState({
          propertyId: requestPropertyId,
          message: caught instanceof Error ? caught.message : "Unable to update notifications.",
        });
      }
    } finally {
      if (activePropertyId.current === requestPropertyId) setWorkingId(null);
    }
  };

  if (!sessionLoading && !canView) {
    return (
      <WorkspacePage>
        <Alert severity="warning">
          {t("Your role cannot open property notifications.", "Jukumu lako haliruhusu kufungua arifa za biashara.")}
        </Alert>
      </WorkspacePage>
    );
  }

  if (!sessionLoading && !propertyId) {
    return (
      <WorkspacePage>
        <Alert severity="info">
          {t("Choose or create a property to open notifications.", "Chagua au unda biashara ili kufungua arifa.")}
        </Alert>
      </WorkspacePage>
    );
  }

  return (
    <WorkspacePage maxWidth={980}>
      <Stack spacing={{ xs: 2.5, sm: 3 }}>
        <PageHeader
          title={t("Notifications", "Arifa")}
          description={t(
            "Stay current on bookings, rooms and important property updates.",
            "Pata taarifa mpya kuhusu uhifadhi, vyumba na mabadiliko muhimu.",
          )}
          action={
            <Button
              disabled={!feed?.unreadCount || workingId === "all"}
              onClick={() => void markAll()}
              startIcon={<CheckCircleRoundedIcon />}
              variant="outlined"
            >
              {t("Mark all read", "Weka zote zimesomwa")}
            </Button>
          }
        />

        <Surface sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Typography sx={{ fontWeight: 700 }}>{t("Inbox", "Kikasha")}</Typography>
                {feed?.unreadCount ? <StatusPill label={`${feed.unreadCount} ${t("unread", "hazijasomwa")}`} tone="info" /> : null}
              </Stack>
              <Typography color="text.secondary" variant="body2">
                {feed?.total ?? 0} {t("notifications", "arifa")}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", justifyContent: { xs: "space-between", sm: "flex-start" }, width: { xs: "100%", sm: "auto" } }}>
              <Typography color="text.secondary" variant="body2">{t("Unread only", "Ambazo hazijasomwa")}</Typography>
              <Switch
                checked={unreadOnly}
                onChange={(event) => {
                  setUnreadOnly(event.target.checked);
                  setPage(1);
                }}
                slotProps={{ input: { "aria-label": t("Show unread only", "Onyesha ambazo hazijasomwa") } }}
              />
            </Stack>
          </Stack>
        </Surface>

        {error ? (
          <Alert action={<Button onClick={() => void load()}>{t("Retry", "Jaribu tena")}</Button>} severity="error">
            {error}
          </Alert>
        ) : null}

        <Surface padding={false}>
          {dataLoading ? (
            <LoadingRows rows={7} />
          ) : !feed?.items.length ? (
            <EmptyState
              description={unreadOnly
                ? t("You have read every notification for this property.", "Umesoma kila arifa ya biashara hii.")
                : t("Important property updates will arrive here.", "Taarifa muhimu za biashara zitafika hapa.")}
              icon={<NotificationsNoneRoundedIcon />}
              title={unreadOnly ? t("You’re all caught up", "Umesoma zote") : t("No notifications yet", "Bado hakuna arifa")}
            />
          ) : (
            <Stack divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}>
              {feed.items.map((item) => (
                <NotificationRow
                  busy={workingId === item.id}
                  item={item}
                  key={item.id}
                  markReadLabel={item.isRead ? t("Mark unread", "Weka haijasomwa") : t("Mark read", "Weka imesomwa")}
                  onToggleRead={() => void toggleRead(item)}
                  openLabel={t("Open notification", "Fungua arifa")}
                />
              ))}
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

function NotificationRow({
  busy,
  item,
  markReadLabel,
  onToggleRead,
  openLabel,
}: {
  busy: boolean;
  item: WorkspaceNotification;
  markReadLabel: string;
  onToggleRead: () => void;
  openLabel: string;
}) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: "flex-start",
        bgcolor: item.isRead ? "transparent" : "color-mix(in srgb, var(--mui-palette-primary-main) 3.5%, transparent)",
        px: { xs: 2, sm: 2.5 },
        py: 2,
        transition: "background-color 160ms ease",
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Avatar
        sx={{
          bgcolor: item.isRead ? "action.hover" : "color-mix(in srgb, var(--mui-palette-primary-main) 11%, transparent)",
          color: item.isRead ? "text.secondary" : "primary.main",
          height: 40,
          width: 40,
        }}
      >
        <NotificationsNoneRoundedIcon fontSize="small" />
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 0.35, sm: 1 }} sx={{ justifyContent: "space-between" }}>
          <Stack direction="row" spacing={0.8} sx={{ alignItems: "center", minWidth: 0 }}>
            {!item.isRead ? <Box aria-hidden sx={{ bgcolor: "primary.main", borderRadius: "50%", flexShrink: 0, height: 7, width: 7 }} /> : null}
            <Typography sx={{ fontWeight: item.isRead ? 500 : 700 }} variant="body2">{item.title}</Typography>
          </Stack>
          <Typography color="text.secondary" sx={{ flexShrink: 0 }} variant="caption">{formatDate(item.createdAt)}</Typography>
        </Stack>
        {item.body ? <Typography color="text.secondary" sx={{ mt: 0.45 }} variant="body2">{item.body}</Typography> : null}
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", flexWrap: "wrap", mt: 0.75, rowGap: 0.75 }}>
          <StatusPill label={item.type.replaceAll("_", " ")} tone="neutral" />
          {item.priority !== "normal" ? <StatusPill label={item.priority} tone={item.priority === "high" || item.priority === "urgent" ? "danger" : "warning"} /> : null}
          <Button disabled={busy} onClick={onToggleRead} size="small" sx={{ ml: "auto" }}>
            {markReadLabel}
          </Button>
        </Stack>
      </Box>
      {item.href ? (
        <IconButton aria-label={openLabel} component={Link} href={item.href} size="small">
          <ArrowForwardRoundedIcon fontSize="small" />
        </IconButton>
      ) : null}
    </Stack>
  );
}

function formatDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
