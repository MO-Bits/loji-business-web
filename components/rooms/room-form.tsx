"use client";

import {
  useEffect,
  useMemo,
  useRef,
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
  getPropertyInventorySetup,
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
import {
  getPropertyTypeDefinition,
  inventoryTypeOptions,
} from "@/features/property/property-type";

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object" && "url" in item) return String(item.url ?? "");
    return "";
  }).filter(Boolean);
}

export function RoomForm({ roomId }: { roomId?: string }) {
  const router = useRouter();
  const { session, loading: sessionLoading } = useAppSession();
  const client = useMemo(() => createClient(), []);
  const feedback = useAppFeedback();
  const { t } = useLanguage();
  const propertyDefinition = getPropertyTypeDefinition(session?.property?.type);
  const roomTypes = useMemo(
    () => inventoryTypeOptions(propertyDefinition.value),
    [propertyDefinition.value],
  );
  const singular = t(
    propertyDefinition.inventorySingular[0],
    propertyDefinition.inventorySingular[1],
  );
  const plural = t(
    propertyDefinition.inventoryPlural[0],
    propertyDefinition.inventoryPlural[1],
  );
  const [room, setRoom] = useState<Room | null>(null);
  const [name, setName] = useState("");
  const [roomType, setRoomType] = useState("double");
  const [capacity, setCapacity] = useState(2);
  const [bedCount, setBedCount] = useState(1);
  const [bedroomCount, setBedroomCount] = useState(1);
  const [bathroomCount, setBathroomCount] = useState(1);
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
  const setupDefaultsApplied = useRef(false);
  const canManage = getWorkspaceCapabilities(session?.activeRole).canManageRooms;

  useEffect(() => {
    if (roomId || roomTypes.some((option) => option.value === roomType)) return;
    const timer = window.setTimeout(
      () => setRoomType(roomTypes[0]?.value ?? "double"),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [roomId, roomType, roomTypes]);

  useEffect(() => {
    const propertyId = session?.activePropertyId;
    if (sessionLoading || roomId || !propertyId || setupDefaultsApplied.current) return;
    let cancelled = false;
    getPropertyInventorySetup(client, propertyId)
      .then((setup) => {
        if (cancelled || setupDefaultsApplied.current) return;
        setupDefaultsApplied.current = true;
        const propertyAmenities = stringList(session?.property?.amenities);
        if (propertyAmenities.length) setAmenities(propertyAmenities);
        if (setup.inventoryType !== "house") return;
        const bedrooms = setup.defaultBedroomCount ?? 1;
        setBedroomCount(bedrooms);
        setBathroomCount(setup.defaultBathroomCount ?? 1);
        setBedCount(Math.max(1, bedrooms));
        setCapacity(Math.max(2, bedrooms * 2));
        setName(String(session?.property?.name ?? "").trim() || t("Entire home", "Nyumba nzima"));
        const propertyImages = stringList(session?.property?.images).slice(0, 5);
        if (propertyImages.length) setExistingImages(propertyImages);
      })
      .catch(() => {
        setupDefaultsApplied.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, [client, roomId, session?.activePropertyId, session?.property?.amenities, session?.property?.images, session?.property?.name, sessionLoading, t]);

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
          setBedroomCount(value.bedroomCount);
          setBathroomCount(value.bathroomCount);
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
    if (name.trim().length < 2) return setError(t(`Enter a valid ${singular} name.`, `Weka jina sahihi la ${singular}.`));
    const amount = Number(price);
    if (!amount || amount <= 0 || amount > 100_000_000) return setError(t(`Enter a valid nightly price up to TZS 100,000,000.`, "Weka bei sahihi ya usiku isiyozidi TZS 100,000,000."));
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) return setError(t("Guest capacity must be between 1 and 100.", "Idadi ya juu ya wageni lazima iwe kati ya 1 na 100."));
    if (!Number.isInteger(bedCount) || bedCount < 1 || bedCount > capacity) return setError(t("Bed count must be at least 1 and no greater than guest capacity.", "Vitanda lazima viwe angalau 1 na visizidi idadi ya juu ya wageni."));
    if (!Number.isInteger(bedroomCount) || bedroomCount < 0 || bedroomCount > 20) return setError(t("Bedroom count must be between 0 and 20.", "Idadi ya vyumba vya kulala lazima iwe kati ya 0 na 20."));
    if (!Number.isFinite(bathroomCount) || bathroomCount < 0.5 || bathroomCount > 20) return setError(t("Bathroom count must be between 0.5 and 20.", "Idadi ya bafu lazima iwe kati ya 0.5 na 20."));
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
        inventoryType: propertyDefinition.inventoryType,
        capacity,
        bedCount,
        bedroomCount,
        bathroomCount,
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
          ? t(`${singular} changes saved successfully.`, `Mabadiliko ya ${singular} yamehifadhiwa kikamilifu.`)
          : t(`${singular} created successfully.`, `${singular} imetengenezwa kikamilifu.`),
      );
      router.replace(roomId ? `/rooms/${roomId}` : "/rooms");
      router.refresh();
    } catch (cause) {
      if (uploaded.length) await removeRoomImages(client, uploaded).catch(() => undefined);
      setError(cause instanceof Error ? cause.message : t(`Unable to save this ${singular}.`, `Imeshindikana kuhifadhi ${singular} hii.`));
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
          <Alert severity="warning">{t(`Only property owners and managers can create or edit ${plural}.`, `Wamiliki na mameneja pekee wanaweza kutengeneza au kuhariri ${plural}.`)}</Alert>
          <Button onClick={() => router.replace("/rooms")} startIcon={<ArrowBackRoundedIcon />} variant="outlined">{t(`Back to ${plural}`, `Rudi kwenye ${plural}`)}</Button>
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
          <Alert severity="error">{error ?? t(`This ${singular} is unavailable or you no longer have permission to edit it.`, `${singular} hii haipatikani au huna tena ruhusa ya kuihariri.`)}</Alert>
          <Button onClick={() => router.replace("/rooms")} startIcon={<ArrowBackRoundedIcon />} variant="outlined">{t(`Back to ${plural}`, `Rudi kwenye ${plural}`)}</Button>
        </Stack>
      </Container>
    );
  }

  const actionLabel = roomId
    ? t("Save changes", "Hifadhi mabadiliko")
    : t(`Create ${singular}`, `Tengeneza ${singular}`);

  return (
    <Box aria-busy={loading} component="form" onSubmit={submit}>
      <WorkspacePage>
        <Stack spacing={{ xs: 2.25, sm: 3 }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
            <IconButton
              aria-label={t(`Go back to ${plural}`, `Rudi kwenye ${plural}`)}
              onClick={() => router.back()}
              sx={{ border: "1px solid", borderColor: "divider", mt: 0.15 }}
            >
              <ArrowBackRoundedIcon fontSize="small" />
            </IconButton>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <PageHeader
                eyebrow={t("Bookable inventory", "Sehemu za kuhifadhi")}
                title={roomId ? t(`Edit ${room?.name ?? singular}`, `Hariri ${room?.name ?? singular}`) : t(`Add a ${singular}`, `Ongeza ${singular}`)}
                description={t(`Set the rate, capacity, layout and photos for this ${singular}.`, `Weka bei, uwezo, mpangilio na picha za ${singular} hii.`)}
                action={(
                  <Chip
                    color={roomId ? (isActive ? "success" : "default") : "primary"}
                    label={roomId ? (isActive ? t("Active inventory", "Inatumika") : t("Inactive inventory", "Haitumiki") ) : t(`Draft ${singular}`, `Rasimu ya ${singular}`)}
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
              title={t(`How this ${singular} appears in your inventory`, `Jinsi ${singular} hii inavyoonekana kwenye orodha`)}
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
                  helperText={t(`This is shown on bookings and the ${propertyDefinition.inventoryBoard[0].toLowerCase()}.`, `Hili huonekana kwenye uhifadhi na ${propertyDefinition.inventoryBoard[1].toLowerCase()}.`)}
                  label={propertyDefinition.inventoryType === "room" ? t("Room name or number", "Jina au namba ya chumba") : t(`${singular} name`, `Jina la ${singular}`)}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={propertyDefinition.inventoryType === "apartment" ? t("e.g. Apartment A3", "mf. Fleti A3") : propertyDefinition.inventoryType === "house" ? t("e.g. Entire home", "mf. Nyumba nzima") : t("e.g. Suite 204", "mf. Suite 204")}
                  slotProps={{ htmlInput: { maxLength: 100 } }}
                  value={name}
                />
                <TextField
                  select
                  label={t(`${singular} type`, `Aina ya ${singular}`)}
                  onChange={(event) => {
                    const nextType = event.target.value;
                    setRoomType(nextType);
                    if (propertyDefinition.inventoryType === "apartment") {
                      setBedroomCount(bedroomsFromType(nextType, bedroomCount));
                    }
                  }}
                  value={roomType}
                >
                  {roomTypes.map((option) => (
                    <MenuItem key={option.value} sx={{ textTransform: "capitalize" }} value={option.value}>
                      {t(option.label[0], option.label[1])}
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
                  helperText={t(`A concise guest-facing overview of the ${singular}.`, `Maelezo mafupi ya ${singular} yatakayoonekana kwa mgeni.`)}
                  label={t(`${singular} description`, `Maelezo ya ${singular}`)}
                  minRows={3}
                  multiline
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={t(`Describe the layout, outlook, and what makes this ${singular} special.`, `Eleza mpangilio, mandhari na kinachoifanya ${singular} hii kuwa maalumu.`)}
                  slotProps={{ htmlInput: { maxLength: 1000 } }}
                  sx={{ gridColumn: { sm: "1 / -1" } }}
                  value={description}
                />
              </Box>
            </SectionCard>

            <SectionCard
              description={t(`These details help your team assign the right ${singular} and prevent overbooking.`, `Taarifa hizi husaidia timu kugawa ${singular} sahihi na kuzuia uhifadhi unaozidi uwezo.`)}
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
                {propertyDefinition.inventoryType !== "room" ? (
                  <TextField
                    helperText={t(
                      "Separate sleeping rooms; use 0 for a studio.",
                      "Vyumba tofauti vya kulala; tumia 0 kwa studio.",
                    )}
                    label={t("Bedrooms", "Vyumba vya kulala")}
                    onBlur={() =>
                      setBedroomCount((value) =>
                        Math.min(20, Math.max(0, Math.round(value))),
                      )
                    }
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setBedroomCount(Number.isFinite(value) ? value : 0);
                    }}
                    slotProps={{ htmlInput: { min: 0, max: 20, step: 1 } }}
                    type="number"
                    value={bedroomCount}
                  />
                ) : null}
                {propertyDefinition.inventoryType !== "room" ? (
                  <TextField
                    helperText={t(
                      "Include private bathrooms inside the unit.",
                      "Jumuisha bafu binafsi zilizo ndani ya unit.",
                    )}
                    label={t("Bathrooms", "Bafu")}
                    onBlur={() =>
                      setBathroomCount((value) =>
                        Math.min(20, Math.max(0.5, value)),
                      )
                    }
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setBathroomCount(Number.isFinite(value) ? value : 1);
                    }}
                    slotProps={{ htmlInput: { min: 0.5, max: 20, step: 0.5 } }}
                    type="number"
                    value={bathroomCount}
                  />
                ) : null}
              </Box>
            </SectionCard>

            <SectionCard
              description={t(`Select every amenity a guest can expect in this ${singular}. At least one is required.`, `Chagua huduma zote atakazopata mgeni kwenye ${singular} hii. Angalau huduma moja inahitajika.`)}
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
              title={t(`Add ${singular} photos`, `Ongeza picha za ${singular}`)}
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
                      alt={t(`${singular} image ${index + 1}`, `Picha ya ${singular} ${index + 1}`)}
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
                        aria-label={t(`Remove ${singular} image ${index + 1}`, `Ondoa picha ya ${singular} ${index + 1}`)}
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
                description={t(`Inactive ${plural} remain in your records but are not available for new bookings.`, `${plural} zisizotumika hubaki kwenye kumbukumbu lakini hazipatikani kwa uhifadhi mpya.`)}
                icon={<CheckRoundedIcon fontSize="small" />}
                kicker={t("Inventory status", "Hali ya chumba")}
                title={t(`Control whether this ${singular} can be booked`, `Dhibiti iwapo ${singular} hii inaweza kuhifadhiwa`)}
              >
                <FormControlLabel
                  control={<Switch checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />}
                  label={isActive ? t(`${singular} is active and bookable`, `${singular} inatumika na inaweza kuhifadhiwa`) : t(`${singular} is inactive`, `${singular} haitumiki`)}
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

function bedroomsFromType(value: string, fallback: number) {
  if (value === "studio") return 0;
  const match = /^(\d+)-bedroom$/.exec(value);
  return match ? Number(match[1]) : fallback;
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
