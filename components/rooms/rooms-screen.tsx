"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Fab,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { createClient } from "@/lib/supabase/client";
import { getRooms } from "@/features/rooms/services/room-service";
import type { Room } from "@/features/rooms/models/room";
import { useLanguage } from "@/components/providers/language-provider";

const money = new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
});

export function RoomsScreen() {
  const { t } = useLanguage();
  const { session } = useAppSession();
  const client = useMemo(() => createClient(), []);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const propertyId = session?.activePropertyId;
  const canManage = ["owner", "manager"].includes(
    session?.activeRole?.toLowerCase() ?? "",
  );
  const refresh = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    setError(null);
    try {
      setRooms(await getRooms(client, propertyId));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load rooms.",
      );
    } finally {
      setLoading(false);
    }
  }, [client, propertyId]);
  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  return (
    <>
      <Container maxWidth="xl" sx={{ py: { xs: 1.75, sm: 2.5, lg: 3 } }}>
        <Stack spacing={{ xs: 1.5, sm: 2 }}>
          <Typography component="h1" variant="h4">
            {t("Rooms", "Vyumba")}
          </Typography>
          {loading ? (
            <Box
              sx={{
                display: "grid",
                gap: { xs: 1, sm: 1.5 },
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2,1fr)",
                  lg: "repeat(3,1fr)",
                  xl: "repeat(4,1fr)",
                },
              }}
            >
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <Skeleton key={item} height={260} variant="rounded" />
              ))}
            </Box>
          ) : error ? (
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  startIcon={<RefreshRoundedIcon />}
                  onClick={() => void refresh()}
                >
                  {t("Retry", "Jaribu tena")}
                </Button>
              }
            >
              {error}
            </Alert>
          ) : rooms.length === 0 ? (
            <EmptyRooms canManage={canManage} />
          ) : (
            <Box
              sx={{
                display: "grid",
                gap: { xs: 1, sm: 1.5 },
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2,minmax(0,1fr))",
                  lg: "repeat(3,minmax(0,1fr))",
                  xl: "repeat(4,minmax(0,1fr))",
                },
              }}
            >
              {rooms.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </Box>
          )}
        </Stack>
      </Container>
      {canManage && (
        <Fab
          component={Link}
          href="/rooms/new"
          color="primary"
          variant="extended"
          sx={{
            bottom: { xs: 20, sm: 28 },
            position: "fixed",
            right: { xs: 18, sm: 28 },
            zIndex: (theme) => theme.zIndex.speedDial,
          }}
        >
          <AddRoundedIcon sx={{ mr: 1 }} />
          {t("Add room", "Ongeza chumba")}
        </Fab>
      )}
    </>
  );
}

function RoomCard({ room }: { room: Room }) {
  const { t } = useLanguage();
  return (
    <Paper
      component={Link}
      href={`/rooms/${room.id}`}
      variant="outlined"
      className="surface-hover"
      sx={{
        borderRadius: 1,
        color: "inherit",
        display: "block",
        overflow: "hidden",
        textDecoration: "none",
      }}
    >
      <Box
        sx={{
          aspectRatio: "16/8",
          bgcolor: "action.hover",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {room.images[0] ? (
          <Box
            component="img"
            src={room.images[0]}
            alt={room.name}
            sx={{
              height: "100%",
              objectFit: "cover",
              transition: "transform 300ms ease",
              width: "100%",
              ".surface-hover:hover &": { transform: "scale(1.035)" },
            }}
          />
        ) : (
          <Box sx={{ display: "grid", height: "100%", placeItems: "center" }}>
            <BedRoundedIcon sx={{ color: "text.disabled", fontSize: 46 }} />
          </Box>
        )}
        <Chip
          label={
            room.isActive
              ? t("Available", "Kinapatikana")
              : t("Inactive", "Kimezimwa")
          }
          color={room.isActive ? "success" : "default"}
          size="small"
          sx={{
            bgcolor: room.isActive
              ? "color-mix(in srgb, var(--mui-palette-success-main) 18%, var(--mui-palette-background-paper))"
              : "background.paper",
            border: "1px solid",
            borderColor: room.isActive ? "success.main" : "divider",
            color: room.isActive ? "success.main" : "text.primary",
            left: 14,
            position: "absolute",
            top: 14,
          }}
        />
        {room.images.length > 1 && (
          <Chip
            label={`${room.images.length} photos`}
            size="small"
            sx={{
              bgcolor: "rgba(17,24,39,.72)",
              color: "white",
              position: "absolute",
              right: 14,
              top: 14,
            }}
          />
        )}
      </Box>
      <Stack spacing={0.8} sx={{ p: { xs: 1.5, sm: 1.75 } }}>
        <Box>
          <Typography variant="h6" noWrap>
            {room.name}
          </Typography>
          <Typography
            color="text.secondary"
            variant="body2"
            sx={{ textTransform: "capitalize" }}
          >
            {room.roomType}
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Typography color="text.secondary" variant="body2">
            <GroupRoundedIcon
              sx={{ fontSize: 17, mr: 0.5, verticalAlign: "text-bottom" }}
            />
            {room.capacity} {t("guests", "wageni")}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            <BedRoundedIcon
              sx={{ fontSize: 17, mr: 0.5, verticalAlign: "text-bottom" }}
            />
            {room.bedCount} {t("beds", "vitanda")}
          </Typography>
        </Stack>
        {room.amenities.length > 0 && (
          <Typography color="text.secondary" noWrap variant="caption">
            {room.amenities.slice(0, 3).join(" · ")}
            {room.amenities.length > 3
              ? ` · +${room.amenities.length - 3}`
              : ""}
          </Typography>
        )}
        <Box sx={{ pt: 0.75 }}>
          <Typography
            color="primary.dark"
            sx={{ fontSize: "1.12rem", fontWeight: 700 }}
          >
            {money.format(room.pricePerNight)}{" "}
            <Typography
              component="span"
              color="text.secondary"
              variant="caption"
            >
              / {t("night", "usiku")}
            </Typography>
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

function EmptyRooms({ canManage }: { canManage: boolean }) {
  const { t } = useLanguage();
  return (
    <Paper
      variant="outlined"
      sx={{ borderRadius: 1, py: 9, textAlign: "center" }}
    >
      <Box
        sx={{
          bgcolor: "color-mix(in srgb, var(--mui-palette-primary-main) 12%, var(--mui-palette-background-paper))",
          borderRadius: "50%",
          color: "primary.main",
          display: "grid",
          height: 72,
          mx: "auto",
          placeItems: "center",
          width: 72,
        }}
      >
        <BedRoundedIcon sx={{ fontSize: 34 }} />
      </Box>
      <Typography variant="h6" sx={{ mt: 2 }}>
        {t(
          "Start building your room inventory",
          "Anza kuweka orodha ya vyumba",
        )}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2, mt: 0.5 }}>
        {t(
          "Rooms, prices, photos and amenities will appear here.",
          "Vyumba, bei, picha na huduma vitaonekana hapa.",
        )}
      </Typography>
      {canManage && (
        <Button component={Link} href="/rooms/new" variant="contained">
          {t("Add your first room", "Ongeza chumba cha kwanza")}
        </Button>
      )}
    </Paper>
  );
}
