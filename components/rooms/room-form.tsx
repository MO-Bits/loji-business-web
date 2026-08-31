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
  getRoomWorkspace,
  removeRoomImages,
  updateRoom,
  uploadRoomImages,
} from "@/features/rooms/services/room-service";
import { roomAmenities, type Room } from "@/features/rooms/models/room";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { getWorkspaceCapabilities } from "@/features/session/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { WorkspacePage } from "@/components/shared/workspace-ui";

const roomTypes = ["single", "master", "suite", "deluxe", "twin", "family"];

export function RoomForm({ roomId }: { roomId?: string }) {
  const router = useRouter();
  const { session, loading: sessionLoading } = useAppSession();
  const client = useMemo(() => createClient(), []);
  const feedback = useAppFeedback();
  const { t } = useLanguage();
  const [room, setRoom] = useState<Room | null>(null);
  const [name, setName] = useState("");
  const [roomType, setRoomType] = useState("master");
  const [capacity, setCapacity] = useState(2);
  const [bedCount, setBedCount] = useState(1);
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [originalImages, setOriginalImages] = useState<string[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [targetRoomId] = useState(() => roomId ?? crypto.randomUUID());
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(Boolean(roomId));
  const [error, setError] = useState<string | null>(null);
  const canManage = getWorkspaceCapabilities(session?.activeRole).canManageRooms;

  useEffect(() => {
    if (sessionLoading || !roomId) return;
    if (!canManage) return;
    const timer = window.setTimeout(() => {
      if (!session?.activePropertyId) {
        setError(t("No active property selected.", "Hakuna biashara inayotumika iliyochaguliwa."));
        setInitialLoading(false);
        return;
      }
      getRoomWorkspace(client, session.activePropertyId, roomId)
        .then((workspace) => {
          if (!workspace.capabilities.manageRooms) throw new Error(t("You do not have permission to manage rooms.", "Huna ruhusa ya kusimamia vyumba."));
          const value = workspace.room;
          setRoom(value);
          setName(value.name);
          setRoomType(value.roomType);
          setCapacity(value.capacity);
          setBedCount(value.bedCount);
          setPrice(String(value.pricePerNight));
          setDescription(value.description);
          setAmenities(value.amenities);
          setExistingImages(value.images);
          setOriginalImages(value.images);
          setIsActive(value.isActive);
        })
        .catch((cause) =>
          setError(
            cause instanceof Error ? cause.message : t("Unable to load room.", "Imeshindikana kupakia chumba."),
          ),
        )
        .finally(() => setInitialLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [canManage, client, roomId, session?.activePropertyId, sessionLoading, t]);

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
    if (existingImages.length + files.length + picked.length > 5) {
      setError(t("Maximum 5 images allowed.", "Picha zisizozidi 5 zinaruhusiwa."));
      return;
    }
    if (picked.some((file) => !file.type.startsWith("image/") || file.type === "image/svg+xml")) {
      setError(t("Choose JPG, PNG, HEIC or WebP image files.", "Chagua picha za JPG, PNG, HEIC au WebP."));
      return;
    }
    if (picked.some((file) => file.size > 6 * 1024 * 1024)) {
      setError(t("Each image must be under 6 MB.", "Kila picha lazima iwe chini ya MB 6."));
      return;
    }
    setFiles((current) => [...current, ...picked]);
  };

  const removeImage = (index: number) => {
    setCoverIndex((current) => current === index ? 0 : index < current ? current - 1 : current);
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
    if (!propertyId) return setError(t("No active property selected.", "Hakuna biashara inayotumika iliyochaguliwa."));
    if (name.trim().length < 2) return setError(t("Enter a valid room name.", "Weka jina sahihi la chumba."));
    const amount = Number(price);
    if (!amount || amount <= 0 || amount > 100_000_000) return setError(t("Enter a valid room price up to TZS 100,000,000.", "Weka bei sahihi ya chumba isiyozidi TZS 100,000,000."));
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) return setError(t("Guest capacity must be between 1 and 100.", "Idadi ya juu ya wageni lazima iwe kati ya 1 na 100."));
    if (!Number.isInteger(bedCount) || bedCount < 1 || bedCount > capacity) return setError(t("Bed count must be at least 1 and no greater than guest capacity.", "Vitanda lazima viwe angalau 1 na visizidi idadi ya juu ya wageni."));
    if (!amenities.length) return setError(t("Select at least one amenity.", "Chagua angalau huduma moja."));
    if (!existingImages.length && !files.length)
      return setError(t("Add at least one room image.", "Ongeza angalau picha moja ya chumba."));

    setLoading(true);
    setError(null);
    let uploaded: string[] = [];
    try {
      uploaded = files.length
        ? await uploadRoomImages(client, propertyId, targetRoomId, files)
        : [];
      const unorderedImages = [...existingImages, ...uploaded];
      const selectedCover = unorderedImages[coverIndex];
      const orderedImages = selectedCover
        ? [selectedCover, ...unorderedImages.filter((_, index) => index !== coverIndex)]
        : unorderedImages;
      const input = {
        name,
        roomType,
        capacity,
        bedCount,
        pricePerNight: amount,
        description,
        amenities,
        images: orderedImages,
        isActive,
      };
      if (roomId) await updateRoom(client, propertyId, roomId, input);
      else await createRoom(client, propertyId, input, targetRoomId);
      const removedImages = originalImages.filter((url) => !existingImages.includes(url));
      if (removedImages.length) {
        void removeRoomImages(client, removedImages).catch(() => undefined);
      }
      feedback.success(
        roomId
          ? t("Room changes saved successfully.", "Mabadiliko ya chumba yamehifadhiwa kikamilifu.")
          : t("Room created successfully.", "Chumba kimetengenezwa kikamilifu."),
      );
      router.replace(roomId ? `/rooms/${roomId}` : "/rooms");
      router.refresh();
    } catch (cause) {
      if (uploaded.length) await removeRoomImages(client, uploaded).catch(() => undefined);
      setError(cause instanceof Error ? cause.message : t("Unable to save room.", "Imeshindikana kuhifadhi chumba."));
    } finally {
      setLoading(false);
    }
  };

  if (sessionLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Paper variant="outlined" sx={{ p: 3.5 }}>
          <Typography color="text.secondary">{t("Loading room workspace…")}</Typography>
        </Paper>
      </Container>
    );
  }

  if (!canManage) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 4, md: 7 } }}>
        <Stack spacing={2}>
          <Alert severity="warning">{t("Only property owners and managers can create or edit rooms.", "Wamiliki na mameneja pekee wanaweza kutengeneza au kuhariri vyumba.")}</Alert>
          <Button onClick={() => router.replace("/rooms")} startIcon={<ArrowBackRoundedIcon />} variant="outlined">{t("Back to rooms")}</Button>
        </Stack>
      </Container>
    );
  }

  if (initialLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Paper variant="outlined" sx={{ p: 3.5 }}>
          <Typography color="text.secondary">{t("Loading room workspace…")}</Typography>
        </Paper>
      </Container>
    );
  }

  if (roomId && !room) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 4, md: 7 } }}>
        <Stack spacing={2}>
          <Alert severity="error">{error ?? t("This room is unavailable or you no longer have permission to edit it.", "Chumba hiki hakipatikani au huna tena ruhusa ya kukihariri.")}</Alert>
          <Button onClick={() => router.replace("/rooms")} startIcon={<ArrowBackRoundedIcon />} variant="outlined">{t("Back to rooms")}</Button>
        </Stack>
      </Container>
    );
  }

  const actionLabel = roomId ? t("Save changes") : t("Create room", "Tengeneza chumba");

  return (
    <Box aria-busy={loading} component="form" onSubmit={submit}>
      <WorkspacePage>
        <Stack spacing={{ xs: 2.25, sm: 3 }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
            <IconButton
              aria-label={t("Go back to rooms")}
              onClick={() => router.back()}
              sx={{ border: "1px solid", borderColor: "divider", mt: 0.15 }}
            >
              <ArrowBackRoundedIcon fontSize="small" />
            </IconButton>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <PageHeader
                eyebrow={t("Room inventory")}
                title={roomId ? t(`Edit ${room?.name ?? "room"}`, `Hariri ${room?.name ?? "chumba"}`) : t("Add a room", "Ongeza chumba")}
                description={t("Define the room’s commercial profile, service setup, and media once.", "Weka taarifa za biashara, huduma na picha za chumba kwa mpangilio mmoja.")}
                action={(
                  <Chip
                    color={roomId ? (isActive ? "success" : "default") : "primary"}
                    label={roomId ? (isActive ? t("Active inventory", "Kinatumika") : t("Inactive inventory", "Hakitatumika") ) : t("Draft room", "Rasimu ya chumba")}
                    size="small"
                  />
                )}
              />
            </Box>
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
              description={t("Use a recognizable name and a clear nightly rate so the front desk can book confidently.", "Tumia jina linalotambulika na bei wazi ya usiku ili mapokezi yaweze kuhifadhi kwa uhakika.")}
              icon={<SellRoundedIcon fontSize="small" />}
              kicker={t("Commercial profile", "Taarifa za biashara")}
              title={t("How this room appears in your inventory", "Jinsi chumba kinavyoonekana kwenye orodha")}
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
                  helperText={t("This is shown on bookings and the room board.")}
                  label={t("Room name or number")}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t("e.g. Suite 204", "mf. Suite 204")}
                  slotProps={{ htmlInput: { maxLength: 100 } }}
                  value={name}
                />
                <TextField
                  select
                  label={t("Room type")}
                  onChange={(event) => setRoomType(event.target.value)}
                  value={roomType}
                >
                  {roomTypes.map((type) => (
                    <MenuItem key={type} sx={{ textTransform: "capitalize" }} value={type}>
                      {t(type, type)}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  required
                  helperText={t("The base rate before any booking adjustments.", "Bei ya msingi kabla ya mabadiliko yoyote ya uhifadhi.")}
                  label={t("Nightly rate")}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="0"
                  slotProps={{
                    htmlInput: { min: 1, max: 100000000, step: 1 },
                    input: { startAdornment: <InputAdornment position="start">TZS</InputAdornment> },
                  }}
                  sx={{ gridColumn: { sm: "1 / -1" } }}
                  type="number"
                  value={price}
                />
                <TextField
                  helperText={t("A concise guest-facing overview of the room.", "Maelezo mafupi ya chumba yatakayoonekana kwa mgeni.")}
                  label={t("Room description")}
                  minRows={3}
                  multiline
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={t("Describe the layout, outlook, and what makes this room special.", "Eleza mpangilio, mandhari na kinachokifanya chumba hiki kuwa maalumu.")}
                  slotProps={{ htmlInput: { maxLength: 1000 } }}
                  sx={{ gridColumn: { sm: "1 / -1" } }}
                  value={description}
                />
              </Box>
            </SectionCard>

            <SectionCard
              description={t("These limits help your team assign rooms accurately and prevent overbooking.", "Viwango hivi husaidia timu kugawa vyumba kwa usahihi na kuzuia uhifadhi unaozidi uwezo.")}
              icon={<BedRoundedIcon fontSize="small" />}
              kicker={t("Stay capacity", "Uwezo wa ukaaji")}
              title={t("Set the sleeping configuration", "Weka mpangilio wa kulala")}
            >
              <Box
                sx={{
                  display: "grid",
                  gap: { xs: 2, sm: 2.25 },
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                }}
              >
                <TextField
                  helperText={t("Maximum guests in this room.", "Idadi ya juu ya wageni katika chumba hiki.")}
                  label={t("Guest capacity")}
                  onBlur={() => setCapacity((value) => Math.min(100, Math.max(1, value)))}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setCapacity(Number.isFinite(value) ? value : 1);
                  }}
                  slotProps={{ htmlInput: { min: 1, max: 100, step: 1 } }}
                  type="number"
                  value={capacity}
                />
                <TextField
                  helperText={t("Physical beds currently available.", "Idadi ya vitanda vilivyopo sasa.")}
                  label={t("Bed count")}
                  onBlur={() => setBedCount((value) => Math.min(100, Math.max(1, value)))}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setBedCount(Number.isFinite(value) ? value : 1);
                  }}
                  slotProps={{ htmlInput: { min: 1, max: 100, step: 1 } }}
                  type="number"
                  value={bedCount}
                />
              </Box>
            </SectionCard>

            <SectionCard
              description={t("Select every amenity a guest can expect. At least one is required.", "Chagua huduma zote atakazopata mgeni. Angalau huduma moja inahitajika.")}
              icon={<CheckRoundedIcon fontSize="small" />}
              kicker={t("Guest experience", "Uzoefu wa mgeni")}
              title={t("Choose the amenities you provide", "Chagua huduma unazotoa")}
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
                      label={t(item)}
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
              description={t("Upload up to five images and choose the strongest one as the cover.", "Pakia hadi picha tano na uchague picha bora kuwa jalada.")}
              icon={<ImageRoundedIcon fontSize="small" />}
              kicker={t("Photo library", "Mkusanyiko wa picha")}
              title={t("Add room visuals", "Ongeza picha za chumba")}
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
                    key={`${index}:${image}`}
                    sx={{
                      aspectRatio: "4 / 3",
                      border: "1px solid",
                      borderColor: index === coverIndex ? "primary.main" : "divider",
                      borderRadius: 1.25,
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <Box
                      alt={t(`Room image ${index + 1}`, `Picha ya chumba ${index + 1}`)}
                      component="img"
                      src={image}
                      sx={{ height: "100%", objectFit: "cover", width: "100%" }}
                    />
                    {index === coverIndex ? (
                      <Chip
                        color="primary"
                        label={t("Cover")}
                        size="small"
                        sx={{ left: 8, position: "absolute", top: 8 }}
                      />
                    ) : null}
                    {index !== coverIndex ? (
                      <Button
                        onClick={() => setCoverIndex(index)}
                        size="small"
                        sx={{ bgcolor: "rgba(15,23,42,.72)", bottom: 8, color: "white", fontSize: ".75rem", left: 8, minWidth: 0, px: 1, position: "absolute", "&:hover": { bgcolor: "rgba(15,23,42,.88)" } }}
                      >
                        {t("Use as cover", "Tumia kama jalada")}
                      </Button>
                    ) : null}
                    <Tooltip title={t("Remove image")}>
                      <IconButton
                        aria-label={t(`Remove room image ${index + 1}`, `Ondoa picha ya chumba ${index + 1}`)}
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

                {imageCount < 5 ? (
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
                      "& .MuiButton-startIcon": { m: 0 },
                    }}
                    variant="outlined"
                  >
                    {t("Add image", "Ongeza picha")}
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
                description={t("Inactive rooms remain in your records but are not available for new bookings.", "Vyumba visivyotumika hubaki kwenye kumbukumbu lakini havipatikani kwa uhifadhi mpya.")}
                icon={<CheckRoundedIcon fontSize="small" />}
                kicker={t("Inventory status", "Hali ya chumba")}
                title={t("Control whether this room can be used", "Dhibiti iwapo chumba hiki kinaweza kutumika")}
              >
                <FormControlLabel
                  control={<Switch checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />}
                  label={isActive ? t("Room is active and bookable", "Chumba kinatumika na kinaweza kuhifadhiwa") : t("Room is inactive", "Chumba hakitumiki")}
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
      </WorkspacePage>
    </Box>
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
              flexShrink: 0,
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
  const { locale, t } = useLanguage();
  const hasSummary = typeof progress === "number";

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack spacing={2}>
        {hasSummary ? (
          <>
            <Box>
              <Typography color="text.secondary" component="p" sx={{ fontSize: ".6875rem", fontWeight: 700, letterSpacing: ".065em", textTransform: "uppercase" }}>
                {t("Setup check", "Ukaguzi wa usanidi")}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.25 }}>
                {name?.trim() || t("New room")}
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: ".8125rem", mt: 0.25 }}>
                {t(`${progress} of 4 required areas are ready.`, `Sehemu ${progress} kati ya 4 zinazohitajika ziko tayari.`)}
              </Typography>
            </Box>
            <Box sx={{ bgcolor: "action.hover", borderRadius: 999, height: 6, overflow: "hidden" }}>
              <Box sx={{ bgcolor: "primary.main", height: "100%", transition: "width 180ms ease", width: `${(progress / 4) * 100}%` }} />
            </Box>
            <Stack spacing={1.15}>
              <SummaryLine label={t("Nightly rate")} value={price ? `TZS ${Number(price).toLocaleString(locale)}` : t("Not set")} />
              <SummaryLine label={t("Guest capacity")} value={t(`${capacity ?? 0} guests`)} />
              <SummaryLine label={t("Beds")} value={`${beds ?? 0}`} />
              <SummaryLine label={t("Amenities")} value={t(`${amenities ?? 0} selected`)} />
              <SummaryLine label={t("Images")} value={t(`${imageCount ?? 0} of 5`)} />
            </Stack>
            <Divider />
          </>
        ) : null}
        <Stack
          direction={{ xs: "column-reverse", sm: "row", lg: "column-reverse" }}
          spacing={1}
          sx={{
            justifyContent: { sm: "flex-end", lg: "initial" },
            "& .MuiButton-root": { minWidth: { sm: 128, lg: "auto" } },
          }}
        >
          <Button disabled={loading} onClick={onCancel} variant="text">
            {t("Cancel")}
          </Button>
          <Button disabled={loading} type="submit" variant="contained">
            {loading ? t("Saving room…", "Inahifadhi chumba…") : actionLabel}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", justifyContent: "space-between", minWidth: 0 }}>
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
      <Typography sx={{ fontSize: ".8125rem", fontWeight: 700, minWidth: 0, overflowWrap: "anywhere", textAlign: "right" }}>
        {value}
      </Typography>
    </Stack>
  );
}
