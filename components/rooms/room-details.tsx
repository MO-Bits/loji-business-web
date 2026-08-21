"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { createClient } from "@/lib/supabase/client";
import {
  getRoom,
  getRoomBookings,
} from "@/features/rooms/services/room-service";
import { localDateKey, parseDatabaseDate } from "@/lib/date-time";
import type { Room } from "@/features/rooms/models/room";

const money = new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
});

export function RoomDetails({ roomId }: { roomId: string }) {
  const router = useRouter();
  const { session } = useAppSession();
  const client = useMemo(() => createClient(), []);
  const [room, setRoom] = useState<Room | null>(null);
  const [bookedNights, setBookedNights] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState(0);
  const canManage = ["owner", "manager"].includes(
    session?.activeRole?.toLowerCase() ?? "",
  );
  useEffect(() => {
    if (!session?.activePropertyId) return;
    Promise.all([
      getRoom(client, session.activePropertyId, roomId),
      getRoomBookings(client, roomId),
    ])
      .then(([value, bookings]) => {
        if (!value) throw new Error("Room not found.");
        setRoom(value);
        const occupied = new Set<string>();
        bookings
          .filter(
            (booking) =>
              booking.status !== "checked_out" &&
              booking.status !== "cancelled",
          )
          .forEach((booking) => {
            const end = parseDatabaseDate(
              booking.checked_out_at ?? booking.check_out,
            );
            for (
              let date = parseDatabaseDate(booking.check_in);
              date < end;
              date.setDate(date.getDate() + 1)
            )
              occupied.add(localDateKey(date));
          });
        setBookedNights(occupied.size);
      })
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Unable to load room.",
        ),
      )
      .finally(() => setLoading(false));
  }, [client, roomId, session?.activePropertyId]);
  if (loading)
    return (
      <Box sx={{ display: "grid", minHeight: "70dvh", placeItems: "center" }}>
        <CircularProgress size={30} />
      </Box>
    );
  if (error || !room)
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="error">{error ?? "Room not found."}</Alert>
      </Container>
    );
  return (
    <Box sx={{ pb: 6 }}>
      <Box
        sx={{
          bgcolor: "#14345B",
          color: "white",
          minHeight: { xs: 300, md: 420 },
          position: "relative",
        }}
      >
        {room.images[image] && (
          <Box
            component="img"
            src={room.images[image]}
            alt={room.name}
            sx={{
              height: "100%",
              inset: 0,
              objectFit: "cover",
              opacity: 0.72,
              position: "absolute",
              width: "100%",
            }}
          />
        )}
        <Box
          sx={{
            background: "linear-gradient(transparent, rgba(0,0,0,.72))",
            inset: 0,
            position: "absolute",
          }}
        />
        <Container
          maxWidth="lg"
          sx={{
            height: "100%",
            minHeight: "inherit",
            pb: 4,
            pt: 2,
            position: "relative",
          }}
        >
          <Stack
            sx={{
              height: "100%",
              justifyContent: "space-between",
              minHeight: "inherit",
            }}
          >
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <IconButton
                aria-label="Back"
                onClick={() => router.back()}
                sx={{ bgcolor: "rgba(0,0,0,.35)", color: "white" }}
              >
                <ArrowBackRoundedIcon />
              </IconButton>
              {canManage && (
                <Button
                  component={Link}
                  href={`/rooms/${room.id}/edit`}
                  variant="contained"
                  startIcon={<EditRoundedIcon />}
                >
                  Edit room
                </Button>
              )}
            </Stack>
            <Box>
              <Chip
                label={room.isActive ? "Active" : "Inactive"}
                color={room.isActive ? "success" : "default"}
              />
              <Typography
                variant="h2"
                sx={{ fontSize: { xs: "2.3rem", md: "3.5rem" }, mt: 1 }}
              >
                {room.name}
              </Typography>
              <Typography sx={{ opacity: 0.85, textTransform: "capitalize" }}>
                {room.roomType}
              </Typography>
            </Box>
          </Stack>
        </Container>
      </Box>
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        <Stack spacing={3}>
          {room.images.length > 1 && (
            <Stack direction="row" sx={{ gap: 1, overflowX: "auto" }}>
              {room.images.map((url, index) => (
                <Box
                  key={url}
                  component="button"
                  onClick={() => setImage(index)}
                  sx={{
                    bgcolor: "transparent",
                    border: index === image ? 3 : 1,
                    borderColor: index === image ? "primary.main" : "divider",
                    borderRadius: 1,
                    cursor: "pointer",
                    p: 0,
                  }}
                >
                  <Box
                    component="img"
                    src={url}
                    alt=""
                    sx={{
                      borderRadius: 1.5,
                      display: "block",
                      height: 72,
                      objectFit: "cover",
                      width: 96,
                    }}
                  />
                </Box>
              ))}
            </Stack>
          )}
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            }}
          >
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Room information
              </Typography>
              <Stack spacing={1.5}>
                <Info
                  icon={<GroupRoundedIcon />}
                  label="Capacity"
                  value={`${room.capacity} guests`}
                />
                <Info
                  icon={<BedRoundedIcon />}
                  label="Beds"
                  value={`${room.bedCount}`}
                />
                <Info
                  icon={<CalendarMonthRoundedIcon />}
                  label="Upcoming occupied nights"
                  value={`${bookedNights}`}
                />
                <Typography
                  color="primary"
                  variant="h5"
                  sx={{ fontWeight: 700, pt: 1 }}
                >
                  {money.format(room.pricePerNight)}{" "}
                  <Typography
                    component="span"
                    color="text.secondary"
                    variant="body2"
                  >
                    / night
                  </Typography>
                </Typography>
              </Stack>
            </Paper>
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Amenities
              </Typography>
              <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
                {room.amenities.length ? (
                  room.amenities.map((item) => (
                    <Chip
                      key={item}
                      label={item}
                      variant="outlined"
                      color="primary"
                    />
                  ))
                ) : (
                  <Typography color="text.secondary">
                    No amenities added.
                  </Typography>
                )}
              </Stack>
            </Paper>
          </Box>
          <Button
            component={Link}
            href={`/bookings/new?room=${room.id}`}
            size="large"
            variant="contained"
          >
            Create booking for this room
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
      <Box sx={{ color: "primary.main" }}>{icon}</Box>
      <Typography color="text.secondary">{label}</Typography>
      <Typography sx={{ fontWeight: 700, ml: "auto!important" }}>
        {value}
      </Typography>
    </Stack>
  );
}
