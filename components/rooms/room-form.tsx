"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import SellRoundedIcon from "@mui/icons-material/SellRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { createClient } from "@/lib/supabase/client";
import {
  createRoom,
  getPropertyInventorySetup,
  getRoomWorkspace,
  updateRoom,
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
import { ActionPanel, SectionCard } from "@/components/rooms/room-form-layout";

export function RoomForm({ roomId }: { roomId?: string }) {
  const router = useRouter();
  const { session, loading: sessionLoading } = useAppSession();
  const client = useMemo(() => createClient(), []);
  const feedback = useAppFeedback();
  const { t } = useLanguage();
  const propertyDefinition = getPropertyTypeDefinition(session?.property?.type);
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
  const [targetRoomId] = useState(() => roomId ?? crypto.randomUUID());
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [newRoomBlocked, setNewRoomBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canManage = getWorkspaceCapabilities(session?.activeRole).canManageRooms;
  const roomTypes = useMemo(() => {
    const standardTypes = [...inventoryTypeOptions("hotel")];
    if (!roomId || !roomType || standardTypes.some((option) => option.value === roomType)) {
      return standardTypes;
    }
    return [
      { value: roomType, label: [roomType, roomType] as const },
      ...standardTypes,
    ];
  }, [roomId, roomType]);

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
    if (sessionLoading || roomId) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!propertyId) {
        setError(t("No active property selected.", "Hakuna biashara inayotumika iliyochaguliwa."));
        setInitialLoading(false);
        return;
      }
      setInitialLoading(true);
      setNewRoomBlocked(false);
      setError(null);
      setAmenities([]);
      void getPropertyInventorySetup(client, propertyId)
        .then((setup) => {
          if (cancelled) return;
          if (setup.inventoryType !== "room") {
            setNewRoomBlocked(true);
            setError(t(
              "Adding new rooms is unavailable for this protected existing property. Contact support to convert it safely to a hotel, lodge or guesthouse.",
              "Kuongeza vyumba vipya hakupatikani kwa biashara hii ya zamani iliyolindwa. Wasiliana na msaada ili ibadilishwe salama kuwa hoteli, loji au nyumba ya wageni.",
            ));
            return;
          }
          if (setup.defaultBedroomCount !== null) setBedroomCount(setup.defaultBedroomCount);
          if (setup.defaultBathroomCount !== null) setBathroomCount(setup.defaultBathroomCount);
        })
        .catch((cause) => {
          if (cancelled) return;
          setNewRoomBlocked(true);
          setError(cause instanceof Error ? cause.message : t("Unable to load room setup.", "Imeshindikana kupakia mpangilio wa chumba."));
        })
        .finally(() => {
          if (!cancelled) setInitialLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [client, roomId, session?.activePropertyId, sessionLoading, t]);

  useEffect(() => {
    if (sessionLoading || !roomId) return;
    if (!canManage) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!session?.activePropertyId) {
        setError(t("No active property selected.", "Hakuna biashara inayotumika iliyochaguliwa."));
        setInitialLoading(false);
        return;
      }
      getRoomWorkspace(client, session.activePropertyId, roomId)
        .then((workspace) => {
          if (cancelled) return;
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
          setIsActive(value.isActive);
        })
        .catch((cause) => {
          if (cancelled) return;
          setError(
            cause instanceof Error ? cause.message : t("Unable to load room.", "Imeshindikana kupakia chumba."),
          );
        })
        .finally(() => {
          if (!cancelled) setInitialLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [canManage, client, roomId, session?.activePropertyId, sessionLoading, t]);

  const formProgress = [
    Boolean(name.trim()),
    Boolean(price) && Number(price) > 0,
    Number.isInteger(capacity) && capacity > 0 && Number.isInteger(bedCount) && bedCount > 0,
  ].filter(Boolean).length;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const propertyId = session?.activePropertyId;
    if (!propertyId) return setError(t("No active property selected.", "Hakuna biashara inayotumika iliyochaguliwa."));
    if (name.trim().length < 2) return setError(t(`Enter a valid ${singular} name.`, `Weka jina sahihi la ${singular}.`));
    const amount = Number(price);
    if (!amount || amount <= 0 || amount > 100_000_000) return setError(t(`Enter a valid nightly price up to TZS 100,000,000.`, "Weka bei sahihi ya usiku isiyozidi TZS 100,000,000."));
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) return setError(t("Guest capacity must be between 1 and 100.", "Idadi ya juu ya wageni lazima iwe kati ya 1 na 100."));
    if (!Number.isInteger(bedCount) || bedCount < 1 || bedCount > capacity) return setError(t("Bed count must be at least 1 and no greater than guest capacity.", "Vitanda lazima viwe angalau 1 na visizidi idadi ya juu ya wageni."));

    setLoading(true);
    setError(null);
    try {
      const input = {
        name,
        roomType,
        inventoryType: room?.inventoryType ?? propertyDefinition.inventoryType,
        capacity,
        bedCount,
        bedroomCount,
        bathroomCount,
        pricePerNight: amount,
        description,
        amenities,
        // Existing image data is retained for compatibility, but photos are no
        // longer part of the room-management workflow.
        images: room?.images ?? [],
        isActive,
      };
      if (roomId) await updateRoom(client, propertyId, roomId, input);
      else await createRoom(client, propertyId, input, targetRoomId);
      feedback.success(
        roomId
          ? t(`${singular} changes saved successfully.`, `Mabadiliko ya ${singular} yamehifadhiwa kikamilifu.`)
          : t(`${singular} created successfully.`, `${singular} imetengenezwa kikamilifu.`),
      );
      router.replace(roomId ? `/rooms/${roomId}` : "/rooms");
      router.refresh();
    } catch (cause) {
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

  if (!roomId && newRoomBlocked) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 4, md: 7 } }}>
        <Stack spacing={2}>
          <Alert severity="warning">{error}</Alert>
          <Button onClick={() => router.replace("/rooms")} startIcon={<ArrowBackRoundedIcon />} variant="outlined">{t(`Back to ${plural}`, `Rudi kwenye ${plural}`)}</Button>
        </Stack>
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
                description={t(`Set the rate, capacity and amenities for this ${singular}.`, `Weka bei, uwezo na huduma za ${singular} hii.`)}
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
                  label={t("Room name or number", "Jina au namba ya chumba")}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t("e.g. Suite 204", "mf. Suite 204")}
                  slotProps={{ htmlInput: { maxLength: 100 } }}
                  value={name}
                />
                <TextField
                  select
                  label={t(`${singular} type`, `Aina ya ${singular}`)}
                  onChange={(event) => setRoomType(event.target.value)}
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
              </Box>
            </SectionCard>

            <SectionCard
              description={t(`Select every amenity a guest can expect in this ${singular}. You can leave this empty and add details later.`, `Chagua huduma zote atakazopata mgeni kwenye ${singular} hii. Unaweza kuacha wazi na kuongeza baadaye.`)}
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
