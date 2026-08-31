"use client";

import AddPhotoAlternateRoundedIcon from "@mui/icons-material/AddPhotoAlternateRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

import { OnboardingFrame } from "@/components/auth/onboarding-frame";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { usePropertyController } from "@/features/property/hooks/use-property-controller";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import type { InventoryType, PropertyType } from "@/features/property/models/property";
import {
  getPropertyTypeDefinition,
  propertyTypeDefinitions,
} from "@/features/property/property-type";
import {
  MAX_PROPERTY_IMAGE_BYTES,
  MAX_PROPERTY_IMAGES,
  PROPERTY_IMAGE_TYPES,
  propertyRegistrationDraftKey,
} from "@/features/property/services/property-service";

const BASIC_STEP_SLUGS = [
  "type",
  "name",
  "contact",
  "spaces",
  "amenities",
  "photos",
] as const;

const amenities = [
  { label: ["Wi-Fi", "Wi-Fi"], value: "WiFi" },
  { label: ["Parking", "Maegesho"], value: "Parking" },
  { label: ["Air conditioning", "Kiyoyozi"], value: "Air Conditioning" },
  { label: ["Hot water", "Maji ya moto"], value: "Hot Water" },
  { label: ["Full kitchen", "Jiko kamili"], value: "Full Kitchen" },
  { label: ["Washing machine", "Mashine ya kufulia"], value: "Washing Machine" },
  { label: ["Private entrance", "Mlango binafsi"], value: "Private Entrance" },
  { label: ["Swimming pool", "Bwawa la kuogelea"], value: "Swimming Pool" },
  { label: ["Restaurant", "Mgahawa"], value: "Restaurant" },
  { label: ["Breakfast", "Kifungua kinywa"], value: "Breakfast" },
  { label: ["24/7 reception", "Mapokezi saa 24"], value: "24/7 Reception" },
  { label: ["Laundry", "Kufua"], value: "Laundry" },
  { label: ["Security", "Usalama"], value: "Security" },
  { label: ["Backup power", "Umeme wa akiba"], value: "Backup Power" },
] as const;

type RegistrationDraft = {
  type: PropertyType | null;
  name: string;
  phone: string;
  email: string;
  expectedInventoryCount: number;
  defaultBedroomCount: number;
  defaultBathroomCount: number;
  amenities: string[];
};

const initialDraft: RegistrationDraft = {
  type: null,
  name: "",
  phone: "",
  email: "",
  expectedInventoryCount: 1,
  defaultBedroomCount: 2,
  defaultBathroomCount: 1,
  amenities: [],
};

export function PropertyBasicForm({
  initialStep,
}: {
  initialStep?: string | null;
}) {
  const router = useRouter();
  const controller = usePropertyController();
  const feedback = useAppFeedback();
  const { t } = useLanguage();
  const { session, refresh } = useAppSession();
  const ownerId = session?.user?.id ?? "";
  const registrationDraftKey = ownerId
    ? propertyRegistrationDraftKey(ownerId)
    : "";
  const routeStep = BASIC_STEP_SLUGS.indexOf(
    initialStep as (typeof BASIC_STEP_SLUGS)[number],
  );
  const activeStep = routeStep >= 0 ? routeStep : 0;
  const stepFocusRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<RegistrationDraft>(initialDraft);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [loadedDraftKey, setLoadedDraftKey] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const definition = draft.type
    ? getPropertyTypeDefinition(draft.type)
    : null;
  const inventoryType = definition?.inventoryType ?? "room";
  const inventoryPlural =
    definition?.inventoryPlural ?? (["spaces", "sehemu"] as const);

  const stepLabels = [
    t("Property type", "Aina ya biashara"),
    t("Property name", "Jina la biashara"),
    t("Contact", "Mawasiliano"),
    inventoryType === "house"
      ? t("Home layout", "Mpangilio wa nyumba")
      : t("Bookable spaces", "Sehemu za kuhifadhi"),
    t("Amenities", "Huduma"),
    t("Photos", "Picha"),
    t("Location", "Eneo"),
  ];

  useEffect(() => {
    let stored:
      | (Partial<RegistrationDraft> & { activeStep?: unknown })
      | null = null;
    if (registrationDraftKey) {
      try {
        window.localStorage.removeItem("loji-property-registration:v2");
        stored = JSON.parse(
          window.localStorage.getItem(registrationDraftKey) ?? "null",
        ) as
        | (Partial<RegistrationDraft> & { activeStep?: unknown })
        | null;
      } catch {
        // A malformed draft should not block a fresh registration.
      }
    }

    const timer = window.setTimeout(() => {
      const validStoredType =
        stored?.type &&
        propertyTypeDefinitions.some((item) => item.value === stored?.type);
      setDraft(
        validStoredType && stored
          ? {
              ...initialDraft,
              ...stored,
              amenities: Array.isArray(stored.amenities)
                ? stored.amenities.filter(
                    (item): item is string => typeof item === "string",
                  )
                : [],
            }
          : initialDraft,
      );
      setFiles([]);
      setLocalError(null);
      setLoadedDraftKey(registrationDraftKey);
      setDraftLoaded(Boolean(registrationDraftKey));

      const storedStep =
        typeof stored?.activeStep === "number" &&
        Number.isInteger(stored.activeStep) &&
        stored.activeStep >= 0 &&
        stored.activeStep < BASIC_STEP_SLUGS.length
          ? stored.activeStep
          : 0;
      if (!initialStep && storedStep > 0) {
        router.replace(
          `/onboarding/property/basic?step=${BASIC_STEP_SLUGS[storedStep]}`,
        );
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialStep, registrationDraftKey, router]);

  useEffect(() => {
    if (draftLoaded && activeStep > 0 && !draft.type) {
      router.replace("/onboarding/property/basic?step=type");
    }
  }, [activeStep, draft.type, draftLoaded, router]);

  useEffect(() => {
    if (
      !draftLoaded ||
      !registrationDraftKey ||
      loadedDraftKey !== registrationDraftKey
    ) {
      return;
    }
    try {
      window.localStorage.setItem(
        registrationDraftKey,
        JSON.stringify({ ...draft, activeStep }),
      );
    } catch {
      // Browser storage is a convenience; the form remains usable without it.
    }
  }, [
    activeStep,
    draft,
    draftLoaded,
    loadedDraftKey,
    registrationDraftKey,
  ]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const firstControl = stepFocusRef.current?.querySelector<HTMLElement>(
        "input:not([type='hidden']), [role='radio'], [role='button'], button",
      );
      (firstControl ?? stepFocusRef.current)?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeStep]);

  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(
    () => () => previews.forEach(({ url }) => URL.revokeObjectURL(url)),
    [previews],
  );

  const setField = <K extends keyof RegistrationDraft>(
    key: K,
    value: RegistrationDraft[K],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setLocalError(null);
  };

  const chooseType = (type: PropertyType) => {
    const nextDefinition = getPropertyTypeDefinition(type);
    setDraft((current) => ({
      ...current,
      type,
      expectedInventoryCount:
        nextDefinition.inventoryType === "house"
          ? 1
          : Math.max(1, current.expectedInventoryCount),
    }));
    setLocalError(null);
  };

  const pickFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    setLocalError(null);
    if (files.length + picked.length > MAX_PROPERTY_IMAGES) {
      setLocalError(t("You can add up to 3 photos.", "Unaweza kuongeza hadi picha 3."));
      return;
    }
    const invalidType = picked.find(
      (file) =>
        !PROPERTY_IMAGE_TYPES.includes(
          file.type as (typeof PROPERTY_IMAGE_TYPES)[number],
        ),
    );
    if (invalidType) {
      setLocalError(
        t(
          `${invalidType.name} must be a JPG, PNG or WebP image.`,
          `${invalidType.name} lazima iwe picha ya JPG, PNG au WebP.`,
        ),
      );
      return;
    }
    const tooLarge = picked.find((file) => file.size > MAX_PROPERTY_IMAGE_BYTES);
    if (tooLarge) {
      setLocalError(
        t(
          `${tooLarge.name} is larger than 5 MB.`,
          `${tooLarge.name} ni kubwa kuliko MB 5.`,
        ),
      );
      return;
    }
    setFiles((current) => [...current, ...picked]);
  };

  const validateCurrentStep = () => {
    if (activeStep === 0 && !draft.type) {
      return t(
        "Choose the type that best matches your business.",
        "Chagua aina inayolingana zaidi na biashara yako.",
      );
    }
    if (activeStep === 1 && draft.name.trim().length < 2) {
      return t(
        "Enter a name with at least 2 characters.",
        "Weka jina lenye angalau herufi 2.",
      );
    }
    if (activeStep === 2 && draft.phone.replace(/\D/g, "").length < 7) {
      return t(
        "Enter a phone number guests or staff can use.",
        "Weka namba ya simu ambayo wageni au timu wanaweza kutumia.",
      );
    }
    if (
      activeStep === 2 &&
      draft.email.trim() &&
      !/^\S+@\S+\.\S+$/.test(draft.email.trim())
    ) {
      return t(
        "Enter a valid email address, or leave it blank.",
        "Weka barua pepe sahihi, au acha nafasi wazi.",
      );
    }
    if (
      activeStep === 3 &&
      inventoryType !== "house" &&
      (!Number.isInteger(draft.expectedInventoryCount) ||
        draft.expectedInventoryCount < 1 ||
        draft.expectedInventoryCount > 1000)
    ) {
      return t("Enter a number between 1 and 1,000.", "Weka namba kati ya 1 na 1,000.");
    }
    if (
      activeStep === 3 &&
      inventoryType === "house" &&
      (!Number.isInteger(draft.defaultBedroomCount) ||
        draft.defaultBedroomCount < 0 ||
        draft.defaultBedroomCount > 20 ||
        !Number.isFinite(draft.defaultBathroomCount) ||
        draft.defaultBathroomCount < 0.5 ||
        draft.defaultBathroomCount > 20)
    ) {
      return t(
        "Check the bedroom and bathroom counts.",
        "Kagua idadi ya vyumba vya kulala na bafu.",
      );
    }
    return null;
  };

  const submit = async () => {
    setLocalError(null);
    controller.clearError();
    const propertyType = draft.type;
    if (!propertyType) {
      setLocalError(
        t(
          "Choose the type that best matches your business.",
          "Chagua aina inayolingana zaidi na biashara yako.",
        ),
      );
      return;
    }
    try {
      await controller.createProperty(
        {
          amenities: draft.amenities,
          email: draft.email,
          name: draft.name,
          phone: draft.phone,
          type: propertyType,
          expectedInventoryCount:
            inventoryType === "house"
              ? 1
              : draft.expectedInventoryCount,
          defaultBedroomCount:
            inventoryType === "house"
              ? draft.defaultBedroomCount
              : null,
          defaultBathroomCount:
            inventoryType === "house"
              ? draft.defaultBathroomCount
              : null,
        },
        files,
      );
      await refresh();
      feedback.success(
        t("Your property profile is ready.", "Wasifu wa biashara yako uko tayari."),
      );
      router.replace("/onboarding/property/address/map");
      router.refresh();
    } catch {
      // The controller exposes a retry-safe error below.
    }
  };

  const continueForward = async () => {
    const message = validateCurrentStep();
    if (message) {
      setLocalError(message);
      return;
    }
    if (activeStep < BASIC_STEP_SLUGS.length - 1) {
      router.push(
        `/onboarding/property/basic?step=${BASIC_STEP_SLUGS[activeStep + 1]}`,
      );
      setLocalError(null);
      return;
    }
    await submit();
  };

  const goBack = () => {
    setLocalError(null);
    controller.clearError();
    if (activeStep > 0) {
      router.push(
        `/onboarding/property/basic?step=${BASIC_STEP_SLUGS[activeStep - 1]}`,
      );
    } else {
      router.back();
    }
  };

  const screen = screenContent(
    activeStep,
    inventoryType,
    inventoryPlural,
    t,
  );
  const progressLabel =
    controller.phase === "creating"
      ? t("Creating your workspace…", "Inatengeneza sehemu yako ya kazi…")
      : controller.phase === "uploading"
        ? t("Uploading your photos…", "Inapakia picha zako…")
        : controller.phase === "saving"
          ? t("Finishing your profile…", "Inakamilisha wasifu wako…")
          : t(
              "Save and continue to location",
              "Hifadhi na uende kwenye eneo",
            );

  return (
    <OnboardingFrame
      action={
        <Button
          color="inherit"
          disabled={controller.loading}
          onClick={goBack}
          startIcon={<ArrowBackRoundedIcon />}
        >
          {t("Back", "Rudi")}
        </Button>
      }
      description={screen.description}
      eyebrow={t(
        "Guided property setup",
        "Usanidi wa biashara unaoongozwa",
      )}
      icon={
        activeStep === 0 ? <HomeWorkRoundedIcon /> : <ApartmentRoundedIcon />
      }
      panelDescription={t(
        `Question ${activeStep + 1} of 6`,
        `Swali la ${activeStep + 1} kati ya 6`,
      )}
      panelTitle={screen.question}
      step={activeStep + 1}
      steps={stepLabels}
      title={screen.title}
      wide
    >
      <Stack
        aria-label={screen.question}
        ref={stepFocusRef}
        spacing={{ xs: 2.25, sm: 3 }}
        sx={{ outline: "none" }}
        tabIndex={-1}
      >
        <Box
          aria-atomic="true"
          aria-live="polite"
          sx={{
            clip: "rect(0 0 0 0)",
            clipPath: "inset(50%)",
            height: 1,
            overflow: "hidden",
            position: "absolute",
            whiteSpace: "nowrap",
            width: 1,
          }}
        >
          {screen.question}
        </Box>
        {activeStep === 0 ? (
          <PropertyTypeChoices selected={draft.type} onChange={chooseType} />
        ) : null}

        {activeStep === 1 ? (
          <Stack spacing={1.25}>
            <TextField
              autoComplete="organization"
              autoFocus
              fullWidth
              label={t("Property or business name", "Jina la biashara")}
              onChange={(event) =>
                setField("name", event.target.value.slice(0, 120))
              }
              placeholder={propertyNamePlaceholder(draft.type, t)}
              required
              slotProps={{ htmlInput: { maxLength: 120 } }}
              value={draft.name}
            />
            <FriendlyNote>
              {t(
                "Use the name your guests already know. You can change it later.",
                "Tumia jina ambalo wageni wako wanalijua. Unaweza kulibadili baadaye.",
              )}
            </FriendlyNote>
          </Stack>
        ) : null}

        {activeStep === 2 ? (
          <Stack spacing={2}>
            <TextField
              autoComplete="tel"
              autoFocus
              fullWidth
              label={t("Main phone number", "Namba kuu ya simu")}
              onChange={(event) =>
                setField(
                  "phone",
                  event.target.value
                    .replace(/[^+\d\s()-]/g, "")
                    .slice(0, 32),
                )
              }
              placeholder="+255 7xx xxx xxx"
              required
              slotProps={{
                htmlInput: { inputMode: "tel", maxLength: 32 },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">TZ</InputAdornment>
                  ),
                },
              }}
              value={draft.phone}
            />
            <TextField
              autoComplete="email"
              fullWidth
              helperText={t(
                "Optional — leave blank if the business does not use email.",
                "Si lazima — acha wazi kama biashara haitumii barua pepe.",
              )}
              label={t("Business email", "Barua pepe ya biashara")}
              onChange={(event) =>
                setField("email", event.target.value.slice(0, 160))
              }
              slotProps={{ htmlInput: { maxLength: 160 } }}
              type="email"
              value={draft.email}
            />
          </Stack>
        ) : null}

        {activeStep === 3 ? (
          inventoryType === "house" ? (
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2,minmax(0,1fr))",
                },
              }}
            >
              <TextField
                autoFocus
                helperText={t(
                  "Use 0 for a studio-style home.",
                  "Tumia 0 kwa nyumba ya aina ya studio.",
                )}
                label={t("Bedrooms", "Vyumba vya kulala")}
                onChange={(event) =>
                  setField(
                    "defaultBedroomCount",
                    numericValue(event.target.value, 0),
                  )
                }
                slotProps={{
                  htmlInput: {
                    inputMode: "numeric",
                    min: 0,
                    max: 20,
                    step: 1,
                  },
                }}
                type="number"
                value={draft.defaultBedroomCount}
              />
              <TextField
                helperText={t(
                  "Count all private bathrooms.",
                  "Hesabu bafu zote binafsi.",
                )}
                label={t("Bathrooms", "Bafu")}
                onChange={(event) =>
                  setField(
                    "defaultBathroomCount",
                    numericValue(event.target.value, 1),
                  )
                }
                slotProps={{
                  htmlInput: {
                    inputMode: "decimal",
                    min: 0.5,
                    max: 20,
                    step: 0.5,
                  },
                }}
                type="number"
                value={draft.defaultBathroomCount}
              />
              <FriendlyNote sx={{ gridColumn: { sm: "1/-1" } }}>
                {t(
                  "Guests will reserve the whole home. Loji will keep one bookable home instead of creating hotel rooms.",
                  "Wageni watahifadhi nyumba nzima. Loji itasimamia nyumba moja badala ya kutengeneza vyumba vya hoteli.",
                )}
              </FriendlyNote>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              <TextField
                autoFocus
                fullWidth
                label={
                  inventoryType === "apartment"
                    ? t(
                        "How many apartments can be booked separately?",
                        "Fleti ngapi zinaweza kuhifadhiwa tofauti?",
                      )
                    : t(
                        "How many rooms can guests book?",
                        "Wageni wanaweza kuhifadhi vyumba vingapi?",
                      )
                }
                onChange={(event) =>
                  setField(
                    "expectedInventoryCount",
                    numericValue(event.target.value, 1),
                  )
                }
                slotProps={{
                  htmlInput: {
                    inputMode: "numeric",
                    min: 1,
                    max: 1000,
                    step: 1,
                  },
                }}
                type="number"
                value={draft.expectedInventoryCount}
              />
              <FriendlyNote>
                {inventoryType === "apartment"
                  ? t(
                      "Each apartment will get its own bedrooms, bathrooms, capacity and nightly price later.",
                      "Kila fleti itawekewa vyumba vya kulala, bafu, uwezo na bei yake baadaye.",
                    )
                  : t(
                      "This helps Loji show setup progress. You will add each room’s rate and capacity after registration.",
                      "Hii husaidia Loji kuonyesha maendeleo ya usanidi. Utaongeza bei na uwezo wa kila chumba baada ya usajili.",
                    )}
              </FriendlyNote>
            </Stack>
          )
        ) : null}

        {activeStep === 4 ? (
          <Stack spacing={1.5}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {amenities.map((item) => {
                const selected = draft.amenities.includes(item.value);
                return (
                  <Chip
                    aria-pressed={selected}
                    clickable
                    color={selected ? "primary" : "default"}
                    key={item.value}
                    label={t(item.label[0], item.label[1])}
                    onClick={() =>
                      setField(
                        "amenities",
                        selected
                          ? draft.amenities.filter(
                              (value) => value !== item.value,
                            )
                          : [...draft.amenities, item.value],
                      )
                    }
                    variant={selected ? "filled" : "outlined"}
                  />
                );
              })}
            </Box>
            <FriendlyNote>
              {draft.amenities.length
                ? t(
                    `${draft.amenities.length} selected.`,
                    `Huduma ${draft.amenities.length} zimechaguliwa.`,
                  )
                : t(
                    "Nothing selected yet. You may skip this and add amenities later.",
                    "Bado hujachagua. Unaweza kuruka na kuongeza huduma baadaye.",
                  )}
            </FriendlyNote>
          </Stack>
        ) : null}

        {activeStep === 5 ? (
          <Stack spacing={1.5}>
            <Box
              sx={{
                display: "grid",
                gap: 1.25,
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(3,minmax(0,1fr))",
                },
              }}
            >
              {previews.map(({ file, url }, index) => (
                <Box
                  key={url}
                  sx={{
                    aspectRatio: "4/3",
                    bgcolor: "action.hover",
                    borderRadius: 2,
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <Image
                    alt={t(
                      `Property photo ${index + 1}`,
                      `Picha ya biashara ${index + 1}`,
                    )}
                    fill
                    sizes="(max-width: 599px) 100vw, 220px"
                    src={url}
                    style={{ objectFit: "cover" }}
                    unoptimized
                  />
                  {index === 0 ? (
                    <Chip
                      color="primary"
                      label={t("Cover", "Jalada")}
                      size="small"
                      sx={{ left: 8, position: "absolute", top: 8 }}
                    />
                  ) : null}
                  <IconButton
                    aria-label={t(
                      `Remove ${file.name}`,
                      `Ondoa ${file.name}`,
                    )}
                    onClick={() =>
                      setFiles((current) =>
                        current.filter((_, item) => item !== index),
                      )
                    }
                    size="small"
                    sx={{
                      bgcolor: "rgba(0,0,0,.68)",
                      color: "white",
                      position: "absolute",
                      right: 8,
                      top: 8,
                      "&:hover": { bgcolor: "rgba(0,0,0,.82)" },
                    }}
                  >
                    <CloseRoundedIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              {files.length < MAX_PROPERTY_IMAGES ? (
                <Button
                  component="label"
                  startIcon={<AddPhotoAlternateRoundedIcon />}
                  sx={{
                    aspectRatio: "4/3",
                    borderStyle: "dashed",
                    minHeight: 136,
                  }}
                  variant="outlined"
                >
                  {files.length
                    ? t("Add another", "Ongeza nyingine")
                    : t("Choose photos", "Chagua picha")}
                  <input
                    accept={PROPERTY_IMAGE_TYPES.join(",")}
                    hidden
                    multiple
                    onChange={pickFiles}
                    type="file"
                  />
                </Button>
              ) : null}
            </Box>
            <FriendlyNote>
              {t(
                "Photos are optional now. Add up to 3 clear exterior or common-area photos; room or apartment photos are added separately.",
                "Picha si lazima sasa. Ongeza hadi picha 3 zilizo wazi za nje au maeneo ya pamoja; picha za chumba au fleti huongezwa tofauti.",
              )}
            </FriendlyNote>
          </Stack>
        ) : null}

        {localError || controller.error ? (
          <Alert severity="error">{localError || controller.error}</Alert>
        ) : null}
        {controller.loading ? (
          <Alert icon={<CircularProgress size={18} />} severity="info">
            {progressLabel}
          </Alert>
        ) : null}

        <Stack
          direction={{ xs: "column-reverse", sm: "row" }}
          spacing={1.25}
          sx={{
            alignItems: { sm: "center" },
            justifyContent: "space-between",
            pt: 0.5,
          }}
        >
          <Typography color="text.secondary" variant="caption">
            {t(
              `Step ${activeStep + 1} of 6`,
              `Hatua ya ${activeStep + 1} kati ya 6`,
            )}
          </Typography>
          <Button
            disabled={controller.loading}
            endIcon={
              activeStep === 5 ? (
                <CheckCircleRoundedIcon />
              ) : (
                <ArrowForwardRoundedIcon />
              )
            }
            onClick={() => void continueForward()}
            size="large"
            sx={{ minWidth: { sm: 190 } }}
            variant="contained"
          >
            {controller.loading
              ? progressLabel
              : activeStep === 5
                ? t("Save and set location", "Hifadhi na weka eneo")
                : t("Continue", "Endelea")}
          </Button>
        </Stack>
      </Stack>
    </OnboardingFrame>
  );
}

function PropertyTypeChoices({
  onChange,
  selected,
}: {
  onChange: (value: PropertyType) => void;
  selected: PropertyType | null;
}) {
  const { t } = useLanguage();
  return (
    <Box
      role="radiogroup"
      sx={{
        display: "grid",
        gap: 1.25,
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2,minmax(0,1fr))",
        },
      }}
    >
      {propertyTypeDefinitions.map((item) => {
        const active = item.value === selected;
        return (
          <ButtonBase
            aria-checked={active}
            key={item.value}
            role="radio"
            onClick={() => onChange(item.value)}
            sx={{
              alignItems: "flex-start",
              border: "1px solid",
              borderColor: active ? "primary.main" : "divider",
              borderRadius: 2.5,
              bgcolor: active
                ? "color-mix(in srgb, var(--mui-palette-primary-main) 7%, transparent)"
                : "background.paper",
              gap: 1.5,
              justifyContent: "flex-start",
              minHeight: 112,
              p: 2,
              textAlign: "left",
              transition:
                "border-color 150ms ease, background-color 150ms ease, transform 150ms ease",
              width: "100%",
              "&:hover": {
                borderColor: "primary.main",
                transform: "translateY(-1px)",
              },
              "&:focus-visible": {
                outline: "3px solid",
                outlineColor: "primary.light",
                outlineOffset: 2,
              },
            }}
          >
            <Box
              sx={{
                bgcolor: active ? "primary.main" : "action.hover",
                borderRadius: 1.75,
                color: active ? "primary.contrastText" : "text.secondary",
                display: "grid",
                flexShrink: 0,
                height: 40,
                placeItems: "center",
                width: 40,
              }}
            >
              {item.inventoryType === "house" ? (
                <HomeWorkRoundedIcon fontSize="small" />
              ) : (
                <ApartmentRoundedIcon fontSize="small" />
              )}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: "center", justifyContent: "space-between" }}
              >
                <Typography sx={{ fontWeight: 700 }}>
                  {t(item.label[0], item.label[1])}
                </Typography>
                {active ? (
                  <CheckCircleRoundedIcon color="primary" fontSize="small" />
                ) : null}
              </Stack>
              <Typography
                color="text.secondary"
                sx={{ lineHeight: 1.55, mt: 0.45 }}
                variant="body2"
              >
                {t(item.shortDescription[0], item.shortDescription[1])}
              </Typography>
            </Box>
          </ButtonBase>
        );
      })}
    </Box>
  );
}

function FriendlyNote({
  children,
  sx,
}: {
  children: ReactNode;
  sx?: object;
}) {
  return (
    <Box sx={{ bgcolor: "action.hover", borderRadius: 2, px: 1.75, py: 1.35, ...sx }}>
      <Typography color="text.secondary" sx={{ lineHeight: 1.55 }} variant="body2">
        {children}
      </Typography>
    </Box>
  );
}

function numericValue(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function propertyNamePlaceholder(
  type: PropertyType | null,
  t: (english: string, swahili: string) => string,
) {
  if (type === "apartment") {
    return t("e.g. Bahari Apartments", "mf. Bahari Apartments");
  }
  if (type === "house" || type === "villa") {
    return t(
      "e.g. Mikocheni Family Home",
      "mf. Nyumba ya Familia Mikocheni",
    );
  }
  if (type === "guesthouse") {
    return t("e.g. Amani Guesthouse", "mf. Amani Guesthouse");
  }
  return t("e.g. Bahari Hotel", "mf. Bahari Hotel");
}

function screenContent(
  step: number,
  inventoryType: InventoryType,
  plural: readonly [string, string],
  t: (english: string, swahili: string) => string,
) {
  const screens = [
    {
      title: t(
        "Start with what you manage.",
        "Anza na unachosimamia.",
      ),
      question: t(
        "Which option best describes your property?",
        "Ni chaguo gani linaeleza biashara yako vizuri?",
      ),
      description: t(
        "Your answer changes the words, fields and operating flow Loji shows your team.",
        "Jibu lako litabadilisha maneno, sehemu za kujaza na mtiririko ambao Loji itaonyesha timu yako.",
      ),
    },
    {
      title: t(
        "Give your workspace a familiar name.",
        "Ipe sehemu yako ya kazi jina linalofahamika.",
      ),
      question: t(
        "What should we call this property?",
        "Tuiite biashara hii jina gani?",
      ),
      description: t(
        "This name appears on the dashboard, bookings and staff workspace.",
        "Jina hili litaonekana kwenye dashibodi, uhifadhi na eneo la kazi la timu.",
      ),
    },
    {
      title: t(
        "How can people reach the business?",
        "Watu watawasiliana na biashara vipi?",
      ),
      question: t(
        "Add the main contact details.",
        "Ongeza mawasiliano makuu.",
      ),
      description: t(
        "Use a phone number your front desk, manager or owner actively monitors.",
        "Tumia namba ya simu inayofuatiliwa na mapokezi, meneja au mmiliki.",
      ),
    },
    {
      title:
        inventoryType === "house"
          ? t("Tell us about the whole home.", "Tueleze kuhusu nyumba nzima.")
          : t(
              `Help us size your ${plural[0]}.`,
              `Tusaidie kuelewa idadi ya ${plural[1]}.`,
            ),
      question:
        inventoryType === "house"
          ? t("How is the home laid out?", "Nyumba imepangwaje?")
          : inventoryType === "apartment"
            ? t(
                "How many units are booked separately?",
                "Units ngapi huhifadhiwa tofauti?",
              )
            : t(
                "How many guest rooms do you manage?",
                "Unasimamia vyumba vingapi vya wageni?",
              ),
      description:
        inventoryType === "apartment"
          ? t(
              "A 2-bedroom and a 3-bedroom apartment are separate bookable units, each with its own rate and availability.",
              "Fleti ya vyumba 2 na ya vyumba 3 ni units tofauti; kila moja ina bei na upatikanaji wake.",
            )
          : inventoryType === "house"
            ? t(
                "Loji will treat this as one entire-home booking, with bedrooms and bathrooms inside it.",
                "Loji itaitambua kama nyumba moja nzima ya kuhifadhi, yenye vyumba vya kulala na bafu ndani yake.",
              )
            : t(
                "You will add each room’s name, capacity and price after this short registration.",
                "Utaongeza jina, uwezo na bei ya kila chumba baada ya usajili huu mfupi.",
              ),
    },
    {
      title: t("What can guests expect?", "Wageni watapata huduma gani?"),
      question: t(
        "Choose the amenities available across the property.",
        "Chagua huduma zinazopatikana kwenye biashara.",
      ),
      description: t(
        "Select what is available today. This step is optional and easy to update later.",
        "Chagua vinavyopatikana sasa. Hatua hii si lazima na ni rahisi kubadili baadaye.",
      ),
    },
    {
      title: t(
        "Make the property easy to recognise.",
        "Fanya biashara iwe rahisi kutambulika.",
      ),
      question: t(
        "Would you like to add a few property photos?",
        "Ungependa kuongeza picha chache za biashara?",
      ),
      description: t(
        "You may skip photos now. The next and final step is confirming the property location.",
        "Unaweza kuruka picha sasa. Hatua inayofuata na ya mwisho ni kuthibitisha eneo la biashara.",
      ),
    },
  ];
  return screens[step] ?? screens[0];
}
