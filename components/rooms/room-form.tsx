"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import PhotoLibraryRoundedIcon from "@mui/icons-material/PhotoLibraryRounded";
import SellRoundedIcon from "@mui/icons-material/SellRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { createClient } from "@/lib/supabase/client";
import {
  createRoom,
  getRoom,
  updateRoom,
  uploadRoomImages,
} from "@/features/rooms/services/room-service";
import { roomAmenities, type Room } from "@/features/rooms/models/room";
import { useAppFeedback } from "@/components/providers/feedback-provider";

const roomTypes = ["single", "master", "suite", "deluxe", "twin", "family"];

export function RoomForm({ roomId }: { roomId?: string }) {
  const router = useRouter();
  const { session } = useAppSession();
  const client = useMemo(() => createClient(), []);
  const feedback = useAppFeedback();
  const [room, setRoom] = useState<Room | null>(null);
  const [name, setName] = useState("");
  const [roomType, setRoomType] = useState("master");
  const [capacity, setCapacity] = useState(2);
  const [bedCount, setBedCount] = useState(1);
  const [price, setPrice] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(Boolean(roomId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId || !session?.activePropertyId) return;
    getRoom(client, session.activePropertyId, roomId)
      .then((value) => {
        if (!value) throw new Error("Room not found.");
        setRoom(value);
        setName(value.name);
        setRoomType(value.roomType);
        setCapacity(value.capacity);
        setBedCount(value.bedCount);
        setPrice(String(value.pricePerNight));
        setAmenities(value.amenities);
        setExistingImages(value.images);
        setIsActive(value.isActive);
      })
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Unable to load room.",
        ),
      )
      .finally(() => setInitialLoading(false));
  }, [client, roomId, session?.activePropertyId]);

  const previews = useMemo(() => files.map(URL.createObjectURL), [files]);
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  const imageCount = existingImages.length + files.length;
  const formProgress = [
    Boolean(name.trim()),
    Boolean(price) && Number(price) > 0,
    amenities.length > 0,
    imageCount > 0,
  ].filter(Boolean).length;

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (existingImages.length + files.length + picked.length > 3) {
      setError("Maximum 3 images allowed.");
      return;
    }
    if (picked.some((file) => file.size > 5 * 1024 * 1024)) {
      setError("Each image must be under 5 MB.");
      return;
    }
    setFiles((current) => [...current, ...picked]);
  };

  const removeImage = (index: number) => {
    if (index < existingImages.length) {
      setExistingImages((current) => current.filter((_, item) => item !== index));
      return;
    }
    setFiles((current) =>
      current.filter((_, item) => item !== index - existingImages.length),
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const propertyId = session?.activePropertyId;
    if (!propertyId) return setError("No active property selected.");
    if (name.trim().length < 2) return setError("Enter a valid room name.");
    const amount = Number(price);
    if (!amount || amount <= 0) return setError("Enter a valid room price.");
    if (!amenities.length) return setError("Select at least one amenity.");
    if (!existingImages.length && !files.length)
      return setError("Add at least one room image.");

    setLoading(true);
    setError(null);
    try {
      const targetId = roomId ?? crypto.randomUUID();
      const uploaded = files.length
        ? await uploadRoomImages(client, propertyId, targetId, files)
        : [];
      const input = {
        name,
        roomType,
        capacity,
        bedCount,
        pricePerNight: amount,
        amenities,
        images: [...existingImages, ...uploaded],
        isActive,
      };
      if (roomId) await updateRoom(client, propertyId, roomId, input);
      else await createRoom(client, propertyId, input, targetId);
      feedback.success(
        roomId
          ? "Room changes saved successfully."
          : "Room created successfully.",
      );
      router.replace(roomId ? `/rooms/${roomId}` : "/rooms");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save room.");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Paper variant="outlined" sx={{ p: 3.5 }}>
          <Typography color="text.secondary">Loading room workspace…</Typography>
        </Paper>
      </Container>
    );
  }

  const actionLabel = roomId ? "Save changes" : "Create room";

  return (
    <Container
      component="form"
      maxWidth="xl"
      onSubmit={submit}
      sx={{ pb: { xs: 3, md: 5 }, pt: { xs: 2, md: 3 } }}
    >
      <Stack spacing={{ xs: 2, md: 2.5 }}>
        <Stack
          component="header"
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 1.5, sm: 2 }}
          sx={{ alignItems: { sm: "flex-start" }, justifyContent: "space-between" }}
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
              <Typography component="h1" variant="h3" sx={{ mt: 0.25 }}>
                {roomId ? `Edit ${room?.name ?? "room"}` : "Add a room"}
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: ".875rem", mt: 0.5 }}>
                Define the room’s commercial profile, service setup, and media once.
              </Typography>
            </Box>
          </Stack>

          <Chip
            color={roomId ? (isActive ? "success" : "default") : "primary"}
            label={roomId ? (isActive ? "Active inventory" : "Inactive inventory") : "Draft room"}
            size="small"
            sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
          />
        </Stack>

        <Box
          sx={{
            alignItems: "start",
            display: "grid",
            gap: { xs: 2, lg: 2.5 },
            gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1fr) 320px" },
          }}
        >
          <Stack spacing={{ xs: 2, md: 2.5 }}>
            {error ? (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            ) : null}

            <SectionCard
              description="Use a recognizable name and a clear nightly rate so the front desk can book confidently."
              icon={<SellRoundedIcon fontSize="small" />}
              kicker="Commercial profile"
              title="How this room appears in your inventory"
            >
              <Box
                sx={{
                  display: "grid",
                  gap: { xs: 2, sm: 2.25 },
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                }}
              >
                <TextField
                  required
                  autoComplete="off"
                  helperText="This is shown on bookings and the room board."
                  label="Room name or number"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Suite 204"
                  value={name}
                />
                <TextField
                  select
                  label="Room type"
                  onChange={(event) => setRoomType(event.target.value)}
                  value={roomType}
                >
                  {roomTypes.map((type) => (
                    <MenuItem key={type} sx={{ textTransform: "capitalize" }} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  required
                  helperText="The base rate before any booking adjustments."
                  label="Nightly rate"
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="0"
                  slotProps={{
                    htmlInput: { min: 1, step: 1 },
                    input: { startAdornment: <InputAdornment position="start">TZS</InputAdornment> },
                  }}
                  sx={{ gridColumn: { sm: "1 / -1" } }}
                  type="number"
                  value={price}
                />
              </Box>
            </SectionCard>

            <SectionCard
              description="These limits help your team assign rooms accurately and prevent overbooking."
              icon={<BedRoundedIcon fontSize="small" />}
              kicker="Stay capacity"
              title="Set the sleeping configuration"
            >
              <Box
                sx={{
                  display: "grid",
                  gap: { xs: 2, sm: 2.25 },
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                }}
              >
                <TextField
                  helperText="Maximum guests in this room."
                  label="Guest capacity"
                  onBlur={() => setCapacity((value) => Math.min(20, Math.max(1, value)))}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setCapacity(Number.isFinite(value) ? value : 1);
                  }}
                  slotProps={{ htmlInput: { min: 1, max: 20, step: 1 } }}
                  type="number"
                  value={capacity}
                />
                <TextField
                  helperText="Physical beds currently available."
                  label="Bed count"
                  onBlur={() => setBedCount((value) => Math.min(20, Math.max(1, value)))}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setBedCount(Number.isFinite(value) ? value : 1);
                  }}
                  slotProps={{ htmlInput: { min: 1, max: 20, step: 1 } }}
                  type="number"
                  value={bedCount}
                />
              </Box>
            </SectionCard>

            <SectionCard
              description="Select every amenity a guest can expect. At least one is required."
              icon={<CheckRoundedIcon fontSize="small" />}
              kicker="Guest experience"
              title="Choose the amenities you provide"
            >
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {roomAmenities.map((item) => {
                  const selected = amenities.includes(item);
                  return (
                    <Chip
                      key={item}
                      aria-pressed={selected}
                      clickable
                      color={selected ? "primary" : "default"}
                      label={item}
                      onClick={() =>
                        setAmenities((current) =>
                          current.includes(item)
                            ? current.filter((value) => value !== item)
                            : [...current, item],
                        )
                      }
                      variant={selected ? "filled" : "outlined"}
                    />
                  );
                })}
              </Box>
            </SectionCard>

            <SectionCard
              description="Upload up to three images. The first image is used as the room cover."
              icon={<ImageRoundedIcon fontSize="small" />}
              kicker="Photo library"
              title="Add room visuals"
            >
              <Box
                sx={{
                  display: "grid",
                  gap: 1.25,
                  gridTemplateColumns: {
                    xs: "repeat(2, minmax(0, 1fr))",
                    sm: "repeat(3, minmax(0, 1fr))",
                  },
                }}
              >
                {[...existingImages, ...previews].map((image, index) => (
                  <Box
                    key={image}
                    sx={{
                      aspectRatio: "4 / 3",
                      border: "1px solid",
                      borderColor: index === 0 ? "primary.main" : "divider",
                      borderRadius: 1.25,
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <Box
                      alt={`Room image ${index + 1}`}
                      component="img"
                      src={image}
                      sx={{ height: "100%", objectFit: "cover", width: "100%" }}
                    />
                    {index === 0 ? (
                      <Chip
                        color="primary"
                        label="Cover"
                        size="small"
                        sx={{ left: 8, position: "absolute", top: 8 }}
                      />
                    ) : null}
                    <Tooltip title="Remove image">
                      <IconButton
                        aria-label={`Remove room image ${index + 1}`}
                        onClick={() => removeImage(index)}
                        size="small"
                        sx={{
                          bgcolor: "rgba(15, 23, 42, .72)",
                          color: "white",
                          position: "absolute",
                          right: 8,
                          top: 8,
                          "&:hover": { bgcolor: "rgba(15, 23, 42, .88)" },
                        }}
                      >
                        <CloseRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}

                {imageCount < 3 ? (
                  <Button
                    component="label"
                    startIcon={<PhotoLibraryRoundedIcon />}
                    sx={{
                      aspectRatio: "4 / 3",
                      borderColor: "divider",
                      borderStyle: "dashed",
                      color: "text.secondary",
                      flexDirection: "column",
                      gap: 0.75,
                    }}
                    variant="outlined"
                  >
                    Add image
                    <Typography color="inherit" variant="caption">
                      JPG, PNG or WebP
                    </Typography>
                    <input hidden multiple accept="image/*" type="file" onChange={pick} />
                  </Button>
                ) : null}
              </Box>
            </SectionCard>

            {roomId ? (
              <SectionCard
                description="Inactive rooms remain in your records but are not available for new bookings."
                icon={<CheckRoundedIcon fontSize="small" />}
                kicker="Inventory status"
                title="Control whether this room can be used"
              >
                <FormControlLabel
                  control={<Switch checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />}
                  label={isActive ? "Room is active and bookable" : "Room is inactive"}
                  sx={{ m: 0 }}
                />
              </SectionCard>
            ) : null}

            <Box sx={{ display: { lg: "none" } }}>
              <ActionPanel
                actionLabel={actionLabel}
                loading={loading}
                onCancel={() => router.back()}
              />
            </Box>
          </Stack>

          <Box sx={{ display: { xs: "none", lg: "block" }, position: "sticky", top: 84 }}>
            <ActionPanel
              actionLabel={actionLabel}
              amenities={amenities.length}
              beds={bedCount}
              capacity={capacity}
              imageCount={imageCount}
              loading={loading}
              name={name}
              onCancel={() => router.back()}
              price={price}
              progress={formProgress}
            />
          </Box>
        </Box>
      </Stack>

    </Container>
  );
}

function SectionCard({
  children,
  description,
  icon,
  kicker,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  kicker: string;
  title: string;
}) {
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
          <Box
            sx={{
              alignItems: "center",
              bgcolor: "action.hover",
              borderRadius: 1,
              color: "primary.main",
              display: "flex",
              height: 34,
              justifyContent: "center",
              mt: 0.1,
              width: 34,
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography color="text.secondary" component="p" sx={{ fontSize: ".6875rem", fontWeight: 700, letterSpacing: ".065em", textTransform: "uppercase" }}>
              {kicker}
            </Typography>
            <Typography component="h2" variant="h6" sx={{ fontWeight: 700, mt: 0.15 }}>
              {title}
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: ".8125rem", lineHeight: 1.5, mt: 0.4 }}>
              {description}
            </Typography>
          </Box>
        </Stack>
      </Box>
      <Divider />
      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>{children}</Box>
    </Paper>
  );
}

function ActionPanel({
  actionLabel,
  amenities,
  beds,
  capacity,
  imageCount,
  loading,
  name,
  onCancel,
  price,
  progress,
}: {
  actionLabel: string;
  amenities?: number;
  beds?: number;
  capacity?: number;
  imageCount?: number;
  loading: boolean;
  name?: string;
  onCancel: () => void;
  price?: string;
  progress?: number;
}) {
  const hasSummary = typeof progress === "number";

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack spacing={2}>
        {hasSummary ? (
          <>
            <Box>
              <Typography color="text.secondary" component="p" sx={{ fontSize: ".6875rem", fontWeight: 700, letterSpacing: ".065em", textTransform: "uppercase" }}>
                Setup check
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.25 }}>
                {name?.trim() || "New room"}
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: ".8125rem", mt: 0.25 }}>
                {progress} of 4 required areas are ready.
              </Typography>
            </Box>
            <Box sx={{ bgcolor: "action.hover", borderRadius: 999, height: 6, overflow: "hidden" }}>
              <Box sx={{ bgcolor: "primary.main", height: "100%", transition: "width 180ms ease", width: `${(progress / 4) * 100}%` }} />
            </Box>
            <Stack spacing={1.15}>
              <SummaryLine label="Nightly rate" value={price ? `TZS ${Number(price).toLocaleString("en-TZ")}` : "Not set"} />
              <SummaryLine label="Guest capacity" value={`${capacity ?? 0} guests`} />
              <SummaryLine label="Beds" value={`${beds ?? 0}`} />
              <SummaryLine label="Amenities" value={`${amenities ?? 0} selected`} />
              <SummaryLine label="Images" value={`${imageCount ?? 0} of 3`} />
            </Stack>
            <Divider />
          </>
        ) : null}
        <Stack direction={{ xs: "column-reverse", sm: "row", lg: "column-reverse" }} spacing={1}>
          <Button disabled={loading} onClick={onCancel} variant="text">
            Cancel
          </Button>
          <Button disabled={loading} type="submit" variant="contained">
            {loading ? "Saving room…" : actionLabel}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", justifyContent: "space-between" }}>
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
      <Typography sx={{ fontSize: ".8125rem", fontWeight: 700, textAlign: "right" }}>
        {value}
      </Typography>
    </Stack>
  );
}
