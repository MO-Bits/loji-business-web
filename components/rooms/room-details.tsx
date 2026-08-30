"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import SellRoundedIcon from "@mui/icons-material/SellRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { createClient } from "@/lib/supabase/client";
import {
  getRoom,
  getRoomBookings,
} from "@/features/rooms/services/room-service";
import { localDateKey, parseDatabaseDate } from "@/lib/date-time";
import type { HousekeepingStatus, Room } from "@/features/rooms/models/room";

const money = new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
});

const housekeepingConfig: Record<
  HousekeepingStatus,
  { color: "success" | "warning" | "info" | "default"; label: string; note: string }
> = {
  ready: {
    color: "success",
    label: "Ready to sell",
    note: "Housekeeping has marked this room ready for the next stay.",
  },
  needs_cleaning: {
    color: "warning",
    label: "Needs cleaning",
    note: "A cleaning task is needed before the next guest arrives.",
  },
  cleaning: {
    color: "info",
    label: "Being cleaned",
    note: "Housekeeping is currently preparing this room.",
  },
  out_of_service: {
    color: "default",
    label: "Out of service",
    note: "This room should not be assigned until service is restored.",
  },
};

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
            ) {
              occupied.add(localDateKey(date));
            }
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

  if (loading) {
    return (
      <Box sx={{ display: "grid", minHeight: "70dvh", placeItems: "center" }}>
        <Stack spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress size={30} />
          <Typography color="text.secondary" variant="body2">
            Loading room workspace…
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (error || !room) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 5, md: 8 } }}>
        <Stack spacing={2}>
          <Alert severity="error">{error ?? "Room not found."}</Alert>
          <Button onClick={() => router.back()} variant="outlined">
            Go back to rooms
          </Button>
        </Stack>
      </Container>
    );
  }

  const housekeeping = housekeepingConfig[room.housekeepingStatus];

  return (
    <Container maxWidth="xl" sx={{ pb: { xs: 3, md: 5 }, pt: { xs: 2, md: 3 } }}>
      <Stack spacing={{ xs: 2, md: 2.5 }}>
        <Stack
          component="header"
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 1.5, md: 2 }}
          sx={{ alignItems: { md: "flex-start" }, justifyContent: "space-between" }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
            <IconButton
              aria-label="Go back to rooms"
              onClick={() => router.back()}
              sx={{ border: "1px solid", borderColor: "divider", mt: 0.15 }}
            >
              <ArrowBackRoundedIcon fontSize="small" />
            </IconButton>
            <Box>
              <Typography
                color="text.secondary"
                component="p"
                variant="overline"
                sx={{ fontSize: ".625rem", letterSpacing: ".1em" }}
              >
                Room inventory
              </Typography>
              <Box sx={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 0.75, mt: 0.25 }}>
                <Typography component="h1" variant="h3">
                  {room.name}
                </Typography>
                <Chip
                  color={room.isActive ? "success" : "default"}
                  label={room.isActive ? "Active" : "Inactive"}
                  size="small"
                />
              </Box>
              <Typography color="text.secondary" sx={{ fontSize: ".875rem", mt: 0.5, textTransform: "capitalize" }}>
                {room.roomType} room · {room.capacity} guest capacity · {room.bedCount} bed{room.bedCount === 1 ? "" : "s"}
              </Typography>
            </Box>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: { xs: "100%", md: "auto" } }}>
            <Button
              component={Link}
              href={`/bookings/new?room=${room.id}`}
              startIcon={<CalendarMonthRoundedIcon />}
              variant="contained"
            >
              New booking
            </Button>
            {canManage ? (
              <Button
                component={Link}
                href={`/rooms/${room.id}/edit`}
                startIcon={<EditRoundedIcon />}
                variant="outlined"
              >
                Edit room
              </Button>
            ) : null}
          </Stack>
        </Stack>

        <Box
          sx={{
            alignItems: "start",
            display: "grid",
            gap: { xs: 2, lg: 2.5 },
            gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1.55fr) minmax(300px, .85fr)" },
          }}
        >
          <Stack spacing={{ xs: 2, md: 2.5 }}>
            <Paper variant="outlined" sx={{ overflow: "hidden" }}>
              <Box
                sx={{
                  aspectRatio: { xs: "16 / 10", sm: "16 / 8" },
                  bgcolor: "action.hover",
                  minHeight: 210,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {room.images[image] ? (
                  <Box
                    alt={room.name}
                    component="img"
                    src={room.images[image]}
                    sx={{ height: "100%", objectFit: "cover", width: "100%" }}
                  />
                ) : (
                  <Stack
                    spacing={1}
                    sx={{ alignItems: "center", color: "text.secondary", height: "100%", justifyContent: "center", px: 2 }}
                  >
                    <ImageRoundedIcon sx={{ fontSize: 34 }} />
                    <Typography variant="body2">No room images have been added yet.</Typography>
                  </Stack>
                )}
                {room.images.length ? (
                  <Chip
                    color="default"
                    label={`${image + 1} of ${room.images.length} photos`}
                    size="small"
                    sx={{ bgcolor: "rgba(15, 23, 42, .72)", color: "white", position: "absolute", right: 14, top: 14 }}
                  />
                ) : null}
              </Box>

              {room.images.length > 1 ? (
                <Box sx={{ borderTop: "1px solid", borderColor: "divider", overflowX: "auto", p: 1.25 }}>
                  <Stack direction="row" spacing={1} sx={{ minWidth: "max-content" }}>
                    {room.images.map((url, index) => (
                      <Tooltip key={url} title={`View image ${index + 1}`}>
                        <Box
                          aria-label={`View room image ${index + 1}`}
                          aria-pressed={index === image}
                          component="button"
                          onClick={() => setImage(index)}
                          sx={{
                            appearance: "none",
                            bgcolor: "transparent",
                            border: "2px solid",
                            borderColor: index === image ? "primary.main" : "transparent",
                            borderRadius: 1,
                            cursor: "pointer",
                            overflow: "hidden",
                            p: 0,
                          }}
                          type="button"
                        >
                          <Box
                            alt=""
                            component="img"
                            src={url}
                            sx={{ display: "block", height: 54, objectFit: "cover", width: 72 }}
                          />
                        </Box>
                      </Tooltip>
                    ))}
                  </Stack>
                </Box>
              ) : null}
            </Paper>

            <Paper variant="outlined" sx={{ overflow: "hidden" }}>
              <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Typography color="text.secondary" component="p" sx={{ fontSize: ".6875rem", fontWeight: 700, letterSpacing: ".065em", textTransform: "uppercase" }}>
                  Room configuration
                </Typography>
                <Typography component="h2" variant="h6" sx={{ fontWeight: 700, mt: 0.25 }}>
                  Operating details
                </Typography>
              </Box>
              <Divider />
              <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Stack divider={<Divider flexItem />} spacing={0}>
                  <InfoRow
                    icon={<SellRoundedIcon fontSize="small" />}
                    label="Room type"
                    value={<Typography sx={{ fontSize: ".875rem", fontWeight: 700, textTransform: "capitalize" }}>{room.roomType}</Typography>}
                  />
                  <InfoRow
                    icon={<GroupRoundedIcon fontSize="small" />}
                    label="Guest capacity"
                    value={<Typography sx={{ fontSize: ".875rem", fontWeight: 700 }}>{room.capacity} guests</Typography>}
                  />
                  <InfoRow
                    icon={<BedRoundedIcon fontSize="small" />}
                    label="Beds"
                    value={<Typography sx={{ fontSize: ".875rem", fontWeight: 700 }}>{room.bedCount}</Typography>}
                  />
                  <InfoRow
                    icon={<CalendarMonthRoundedIcon fontSize="small" />}
                    label="Booked nights"
                    value={<Typography sx={{ fontSize: ".875rem", fontWeight: 700 }}>{bookedNights}</Typography>}
                  />
                </Stack>
              </Box>
            </Paper>

            <Paper variant="outlined" sx={{ overflow: "hidden" }}>
              <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Typography color="text.secondary" component="p" sx={{ fontSize: ".6875rem", fontWeight: 700, letterSpacing: ".065em", textTransform: "uppercase" }}>
                  Guest experience
                </Typography>
                <Typography component="h2" variant="h6" sx={{ fontWeight: 700, mt: 0.25 }}>
                  Included amenities
                </Typography>
              </Box>
              <Divider />
              <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                {room.amenities.length ? (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {room.amenities.map((item) => (
                      <Chip key={item} color="primary" label={item} variant="outlined" />
                    ))}
                  </Box>
                ) : (
                  <Typography color="text.secondary" variant="body2">
                    No amenities have been added to this room.
                  </Typography>
                )}
              </Box>
            </Paper>
          </Stack>

          <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ position: { lg: "sticky" }, top: { lg: 84 } }}>
            <Paper variant="outlined" sx={{ overflow: "hidden" }}>
              <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                  <Box>
                    <Typography color="text.secondary" component="p" sx={{ fontSize: ".6875rem", fontWeight: 700, letterSpacing: ".065em", textTransform: "uppercase" }}>
                      Service status
                    </Typography>
                    <Typography component="h2" variant="h6" sx={{ fontWeight: 700, mt: 0.25 }}>
                      Room readiness
                    </Typography>
                  </Box>
                  <CheckCircleRoundedIcon color={housekeeping.color === "default" ? "disabled" : housekeeping.color} />
                </Stack>
                <Chip color={housekeeping.color} label={housekeeping.label} size="small" sx={{ mt: 1.5 }} />
                <Typography color="text.secondary" sx={{ fontSize: ".8125rem", lineHeight: 1.55, mt: 1 }}>
                  {housekeeping.note}
                </Typography>
                {room.housekeepingNotes ? (
                  <Box sx={{ bgcolor: "action.hover", borderRadius: 1, mt: 1.5, p: 1.25 }}>
                    <Typography color="text.secondary" variant="caption">
                      Housekeeping note
                    </Typography>
                    <Typography sx={{ fontSize: ".8125rem", mt: 0.25 }}>
                      {room.housekeepingNotes}
                    </Typography>
                  </Box>
                ) : null}
              </Box>
            </Paper>

            <Paper variant="outlined" sx={{ overflow: "hidden" }}>
              <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Typography color="text.secondary" component="p" sx={{ fontSize: ".6875rem", fontWeight: 700, letterSpacing: ".065em", textTransform: "uppercase" }}>
                  Commercial snapshot
                </Typography>
                <Typography component="h2" variant="h6" sx={{ fontWeight: 700, mt: 0.25 }}>
                  Room at a glance
                </Typography>
              </Box>
              <Divider />
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                }}
              >
                <MetricTile icon={<PaymentsRoundedIcon fontSize="small" />} label="Rate per night" value={money.format(room.pricePerNight)} />
                <MetricTile icon={<CalendarMonthRoundedIcon fontSize="small" />} label="Booked nights" value={String(bookedNights)} />
                <MetricTile icon={<GroupRoundedIcon fontSize="small" />} label="Capacity" value={`${room.capacity} guests`} />
                <MetricTile icon={<ImageRoundedIcon fontSize="small" />} label="Photo library" value={`${room.images.length} image${room.images.length === 1 ? "" : "s"}`} />
              </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
              <Typography component="h2" variant="h6" sx={{ fontWeight: 700 }}>
                Next action
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: ".8125rem", lineHeight: 1.55, mt: 0.5 }}>
                Open a booking for this room or update its configuration when the inventory changes.
              </Typography>
              <Stack spacing={1} sx={{ mt: 1.75 }}>
                <Button component={Link} href={`/bookings/new?room=${room.id}`} variant="contained">
                  Create booking
                </Button>
                {canManage ? (
                  <Button component={Link} href={`/rooms/${room.id}/edit`} variant="outlined">
                    Edit configuration
                  </Button>
                ) : null}
              </Stack>
            </Paper>
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
}

function MetricTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Box sx={{ borderBottom: "1px solid", borderColor: "divider", minWidth: 0, p: 2, "&:nth-of-type(odd)": { borderRight: "1px solid", borderColor: "divider" }, "&:nth-last-of-type(-n + 2)": { borderBottom: 0 } }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", color: "primary.main" }}>
        {icon}
        <Typography color="text.secondary" sx={{ fontSize: ".6875rem", lineHeight: 1.35 }}>
          {label}
        </Typography>
      </Stack>
      <Typography sx={{ fontSize: { xs: ".9375rem", sm: "1rem" }, fontWeight: 700, lineHeight: 1.3, mt: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {value}
      </Typography>
    </Box>
  );
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", justifyContent: "space-between", py: 1.5 }}>
      <Stack direction="row" spacing={1.1} sx={{ alignItems: "center", minWidth: 0 }}>
        <Box sx={{ color: "primary.main", display: "flex" }}>{icon}</Box>
        <Typography color="text.secondary" sx={{ fontSize: ".8125rem" }}>
          {label}
        </Typography>
      </Stack>
      <Box sx={{ flexShrink: 0, ml: 1 }}>{value}</Box>
    </Stack>
  );
}
