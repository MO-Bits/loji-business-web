"use client";

import AddPhotoAlternateRoundedIcon from "@mui/icons-material/AddPhotoAlternateRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";

import { OnboardingFrame } from "@/components/auth/onboarding-frame";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { usePropertyController } from "@/features/property/hooks/use-property-controller";
import type { PropertyType } from "@/features/property/models/property";
import {
  MAX_PROPERTY_IMAGE_BYTES,
  MAX_PROPERTY_IMAGES,
  PROPERTY_IMAGE_TYPES,
} from "@/features/property/services/property-service";

const amenities = [
  { label: ["Wi-Fi", "Wi-Fi"], value: "WiFi" },
  { label: ["Parking", "Maegesho"], value: "Parking" },
  { label: ["Swimming pool", "Bwawa la kuogelea"], value: "Swimming Pool" },
  { label: ["Restaurant", "Mgahawa"], value: "Restaurant" },
  { label: ["Bar", "Baa"], value: "Bar" },
  { label: ["Air conditioning", "Kiyoyozi"], value: "Air Conditioning" },
  { label: ["Breakfast", "Kifungua kinywa"], value: "Breakfast" },
  { label: ["24/7 reception", "Mapokezi saa 24"], value: "24/7 Reception" },
  { label: ["Laundry", "Kufua"], value: "Laundry" },
  { label: ["Security", "Usalama"], value: "Security" },
  { label: ["Gym", "Gym"], value: "Gym" },
  { label: ["Conference room", "Ukumbi wa mikutano"], value: "Conference Room" },
] as const;

const propertyTypes: {
  label: [english: string, swahili: string];
  value: PropertyType;
}[] = [
  { label: ["Hotel", "Hoteli"], value: "hotel" },
  { label: ["Lodge", "Lodge"], value: "lodge" },
  { label: ["Apartment", "Apartment"], value: "apartment" },
  { label: ["Guesthouse", "Nyumba ya wageni"], value: "guesthouse" },
];

export function PropertyBasicForm() {
  const router = useRouter();
  const controller = usePropertyController();
  const feedback = useAppFeedback();
  const { t } = useLanguage();
  const [type, setType] = useState<PropertyType>("hotel");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(
    () => () => previews.forEach(({ url }) => URL.revokeObjectURL(url)),
    [previews],
  );

  const pickFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    setLocalError(null);

    if (files.length + picked.length > MAX_PROPERTY_IMAGES) {
      setLocalError(
        t("You can upload up to 3 photos.", "Unaweza kupakia hadi picha 3."),
      );
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

  const submit = async () => {
    setLocalError(null);
    controller.clearError();

    if (name.trim().length < 2) {
      setLocalError(
        t(
          "Enter a property name with at least 2 characters.",
          "Weka jina la biashara lenye angalau herufi 2.",
        ),
      );
      return;
    }
    if (phone.replace(/\D/g, "").length < 7) {
      setLocalError(
        t("Enter a valid phone number.", "Weka namba sahihi ya simu."),
      );
      return;
    }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setLocalError(t("Enter a valid email address.", "Weka barua pepe sahihi."));
      return;
    }
    if (!selectedAmenities.length) {
      setLocalError(
        t("Select at least one amenity.", "Chagua angalau huduma moja."),
      );
      return;
    }
    if (!files.length) {
      setLocalError(
        t("Add at least one property photo.", "Ongeza angalau picha moja ya biashara."),
      );
      return;
    }

    try {
      await controller.createProperty(
        { amenities: selectedAmenities, email, name, phone, type },
        files,
      );
      feedback.success(
        t("Property details saved.", "Taarifa za biashara zimehifadhiwa."),
      );
      router.replace("/");
    } catch {
      // The controller exposes a retry-safe error below.
    }
  };

  const progressLabel =
    controller.phase === "creating"
      ? t("Creating your workspace…", "Inatengeneza sehemu yako ya kazi…")
      : controller.phase === "uploading"
        ? t("Uploading property photos…", "Inapakia picha za biashara…")
        : controller.phase === "saving"
          ? t("Saving the photo gallery…", "Inahifadhi mkusanyiko wa picha…")
          : t("Save property and continue", "Hifadhi biashara na endelea");

  return (
    <OnboardingFrame
      action={
        <Button
          color="inherit"
          disabled={controller.loading}
          onClick={() => router.back()}
          startIcon={<ArrowBackRoundedIcon />}
        >
          {t("Back", "Rudi")}
        </Button>
      }
      description={t(
        "Add the core details your team will use across rooms, bookings, finance and reports.",
        "Ongeza taarifa kuu ambazo timu yako itatumia kwenye vyumba, uhifadhi, fedha na ripoti.",
      )}
      eyebrow={t("Property setup", "Usanidi wa biashara")}
      icon={<HotelRoundedIcon />}
      panelDescription={t("Step 2 of 3", "Hatua ya 2 kati ya 3")}
      panelTitle={t("Property profile", "Wasifu wa biashara")}
      step={2}
      steps={[
        t("Personal profile", "Wasifu binafsi"),
        t("Property details", "Taarifa za biashara"),
        t("Location & finish", "Eneo na kumaliza"),
      ]}
      title={t("Describe your property.", "Eleza biashara yako.")}
      wide
    >
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Stack divider={<Divider flexItem />} spacing={3}>
          <FormSection
            description={t(
              "Information used to identify and contact this property.",
              "Taarifa zinazotumika kutambua na kuwasiliana na biashara hii.",
            )}
            title={t("Business details", "Taarifa za biashara")}
          >
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: {
                  xs: "minmax(0, 1fr)",
                  sm: "repeat(2, minmax(0, 1fr))",
                },
              }}
            >
              <TextField
                disabled={controller.loading}
                fullWidth
                label={t("Property type", "Aina ya biashara")}
                onChange={(event) => setType(event.target.value as PropertyType)}
                select
                value={type}
              >
                {propertyTypes.map((item) => (
                  <MenuItem key={item.value} value={item.value}>
                    {t(item.label[0], item.label[1])}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                autoComplete="organization"
                disabled={controller.loading}
                fullWidth
                label={t("Property name", "Jina la biashara")}
                onChange={(event) => setName(event.target.value.slice(0, 120))}
                required
                slotProps={{ htmlInput: { maxLength: 120 } }}
                value={name}
              />

              <TextField
                autoComplete="tel"
                disabled={controller.loading}
                fullWidth
                label={t("Phone number", "Namba ya simu")}
                onChange={(event) =>
                  setPhone(event.target.value.replace(/[^+\d\s()-]/g, "").slice(0, 32))
                }
                required
                slotProps={{ htmlInput: { inputMode: "tel", maxLength: 32 } }}
                value={phone}
              />

              <TextField
                autoComplete="email"
                disabled={controller.loading}
                fullWidth
                label={t("Email (optional)", "Barua pepe (si lazima)")}
                onChange={(event) => setEmail(event.target.value.slice(0, 160))}
                slotProps={{ htmlInput: { maxLength: 160 } }}
                type="email"
                value={email}
              />
            </Box>
          </FormSection>

          <FormSection
            description={t(
              "Select every facility currently available to guests.",
              "Chagua kila huduma inayopatikana kwa wageni sasa.",
            )}
            title={t("Amenities", "Huduma")}
          >
            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
              {amenities.map((item) => {
                const selected = selectedAmenities.includes(item.value);
                return (
                  <Chip
                    aria-pressed={selected}
                    clickable
                    color={selected ? "primary" : "default"}
                    disabled={controller.loading}
                    key={item.value}
                    label={t(item.label[0], item.label[1])}
                    onClick={() =>
                      setSelectedAmenities((current) =>
                        selected
                          ? current.filter((value) => value !== item.value)
                          : [...current, item.value],
                      )
                    }
                    variant={selected ? "filled" : "outlined"}
                  />
                );
              })}
            </Stack>
          </FormSection>

          <FormSection
            description={t(
              "Add 1–3 JPG, PNG or WebP photos, up to 5 MB each. The first becomes the cover.",
              "Ongeza picha 1–3 za JPG, PNG au WebP, hadi MB 5 kila moja. Ya kwanza itakuwa jalada.",
            )}
            title={t("Property photos", "Picha za biashara")}
          >
            <Box
              sx={{
                display: "grid",
                gap: 1.5,
                gridTemplateColumns: {
                  xs: "minmax(0, 1fr)",
                  sm: "repeat(3, minmax(0, 1fr))",
                },
              }}
            >
              {previews.map(({ file, url }, index) => (
                <Box
                  key={url}
                  sx={{
                    aspectRatio: "4 / 3",
                    bgcolor: "action.hover",
                    borderRadius: 2,
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <Image
                    alt={t(
                      `Property photo ${index + 1}: ${file.name}`,
                      `Picha ya biashara ${index + 1}: ${file.name}`,
                    )}
                    fill
                    sizes="(max-width: 599px) calc(100vw - 64px), 220px"
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
                    aria-label={t("Remove photo", "Ondoa picha")}
                    disabled={controller.loading}
                    onClick={() =>
                      setFiles((current) =>
                        current.filter((_, fileIndex) => fileIndex !== index),
                      )
                    }
                    size="small"
                    sx={{
                      bgcolor: "rgba(0,0,0,.66)",
                      color: "white",
                      position: "absolute",
                      right: 8,
                      top: 8,
                      "&:hover": { bgcolor: "rgba(0,0,0,.82)" },
                    }}
                  >
                    <CloseRoundedIcon />
                  </IconButton>
                </Box>
              ))}

              {files.length < MAX_PROPERTY_IMAGES ? (
                <Button
                  component="label"
                  disabled={controller.loading}
                  startIcon={<AddPhotoAlternateRoundedIcon />}
                  sx={{
                    aspectRatio: "4 / 3",
                    borderStyle: "dashed",
                    minHeight: 128,
                  }}
                  variant="outlined"
                >
                  {t("Add photos", "Ongeza picha")}
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
          </FormSection>

          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            {localError || controller.error ? (
              <Alert severity="error">{localError || controller.error}</Alert>
            ) : null}
            {controller.loading ? (
              <Alert icon={<CircularProgress size={18} />} severity="info">
                {progressLabel}
              </Alert>
            ) : null}
            <Button
              disabled={controller.loading}
              fullWidth
              size="large"
              type="submit"
              variant="contained"
            >
              {controller.loading ? progressLabel : t("Save and continue", "Hifadhi na endelea")}
            </Button>
            <Typography color="text.secondary" sx={{ textAlign: "center" }} variant="caption">
              {t(
                "If an upload is interrupted, retrying continues with the same property.",
                "Upakiaji ukikatika, kujaribu tena kutaendelea na biashara hiyo hiyo.",
              )}
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </OnboardingFrame>
  );
}

function FormSection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: ReactNode;
  title: ReactNode;
}) {
  return (
    <Stack spacing={2} sx={{ py: 0.5 }}>
      <Box>
        <Typography component="h3" variant="h5">
          {title}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.35 }} variant="body2">
          {description}
        </Typography>
      </Box>
      {children}
    </Stack>
  );
}
