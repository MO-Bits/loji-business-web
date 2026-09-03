"use client";

import * as Sentry from "@sentry/nextjs";
import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import AddPhotoAlternateRoundedIcon from "@mui/icons-material/AddPhotoAlternateRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import PhotoLibraryOutlinedIcon from "@mui/icons-material/PhotoLibraryOutlined";
import StarOutlineRoundedIcon from "@mui/icons-material/StarOutlineRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { SettingsSection } from "@/components/settings/settings-shared";
import { Surface } from "@/components/shared/workspace-ui";
import { usePropertySettings } from "@/features/settings/property/hooks/use-property-settings";
import type { PropertySettingsWorkspace } from "@/features/settings/property/models/property-settings";
import {
  MAX_PROPERTY_PHOTO_BYTES,
  MAX_PROPERTY_PHOTOS,
  getPropertySettings,
  isPropertySettingsRpcError,
  notifyPropertySettingsChanged,
  removePropertySettingsPhotos,
  updatePropertyGallery,
  uploadPropertySettingsPhotos,
} from "@/features/settings/property/services/property-settings-service";
import {
  EditorSaveBar,
  PropertyAccessDenied,
  PropertyEditorHeader,
  PropertySettingsError,
  PropertySettingsLoading,
} from "./property-settings-shared";

const ACCEPTED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type PhotoItem =
  | { id: string; kind: "existing"; url: string }
  | { file: File; id: string; kind: "file"; url: string };

export function PropertyPhotosEditor() {
  const { t } = useLanguage();
  const state = usePropertySettings();

  if (state.loading) return <PropertySettingsLoading />;
  if (!state.workspace || !state.propertyId) {
    return (
      <PropertySettingsError
        message={state.error ?? t("Property settings were not found.", "Mipangilio ya biashara haijapatikana.")}
        onRetry={() => void state.refresh()}
      />
    );
  }
  if (!state.workspace.capabilities.updateProperty) return <PropertyAccessDenied />;

  return (
    <PhotosForm
      client={state.client}
      propertyId={state.propertyId}
      workspace={state.workspace}
    />
  );
}

function PhotosForm({
  client,
  propertyId,
  workspace,
}: {
  client: ReturnType<typeof usePropertySettings>["client"];
  propertyId: string;
  workspace: PropertySettingsWorkspace;
}) {
  const { t } = useLanguage();
  const feedback = useAppFeedback();
  const router = useRouter();
  const original = workspace.property.images;
  const previewUrls = useRef(new Set<string>());
  const [items, setItems] = useState<PhotoItem[]>(() => (
    original.map((url) => ({ id: url, kind: "existing", url }))
  ));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuPhotoId, setMenuPhotoId] = useState<string | null>(null);

  const representation = items.map((item) => (
    item.kind === "existing" ? item.url : `file:${item.id}`
  ));
  const dirty = JSON.stringify(representation) !== JSON.stringify(original);
  const remaining = MAX_PROPERTY_PHOTOS - items.length;
  const menuIndex = items.findIndex((item) => item.id === menuPhotoId);

  useEffect(() => {
    const urls = previewUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const pickPhotos = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    if (files.length > remaining) {
      setError(t(
        `You can add ${remaining} more ${remaining === 1 ? "photo" : "photos"}.`,
        `Unaweza kuongeza picha ${remaining} zaidi.`,
      ));
      return;
    }

    const invalid = files.find((file) => (
      !ACCEPTED_PHOTO_TYPES.has(file.type)
      || !file.size
      || file.size > MAX_PROPERTY_PHOTO_BYTES
    ));
    if (invalid) {
      setError(t(
        `${invalid.name} must be a JPG, PNG or WebP image under 5 MB.`,
        `${invalid.name} lazima iwe JPG, PNG au WebP chini ya MB 5.`,
      ));
      return;
    }

    const selected = files.map((file): PhotoItem => {
      const url = URL.createObjectURL(file);
      previewUrls.current.add(url);
      return { file, id: crypto.randomUUID(), kind: "file", url };
    });
    setItems((current) => [...current, ...selected]);
    setError(null);
  };

  const removePhoto = (index: number) => {
    const item = items[index];
    if (item?.kind === "file") {
      URL.revokeObjectURL(item.url);
      previewUrls.current.delete(item.url);
    }
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setMenuAnchor(null);
    setMenuPhotoId(null);
  };

  const makeCover = (index: number) => {
    if (index <= 0 || index >= items.length) return;
    setItems((current) => {
      const next = [...current];
      const [cover] = next.splice(index, 1);
      return [cover, ...next];
    });
    setMenuAnchor(null);
    setMenuPhotoId(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dirty || saving) return;

    setSaving(true);
    setError(null);
    let uploaded: string[] = [];
    let desiredUrls: string[] | null = null;

    const reportCleanupFailure = (cause: unknown, operation: string, count: number) => {
      Sentry.captureException(cause, {
        tags: { area: "property-photos", operation },
        extra: { propertyId, photoCount: count },
      });
    };

    const finishSaved = () => {
      notifyPropertySettingsChanged();
      feedback.success(t("Property photos saved.", "Picha za biashara zimehifadhiwa."));
      router.replace("/settings/property");
      router.refresh();
    };

    try {
      const files = items
        .filter((item): item is Extract<PhotoItem, { kind: "file" }> => item.kind === "file")
        .map((item) => item.file);
      uploaded = files.length
        ? await uploadPropertySettingsPhotos(client, propertyId, files)
        : [];

      let uploadedIndex = 0;
      desiredUrls = items.map((item) => (
        item.kind === "existing" ? item.url : uploaded[uploadedIndex++]
      ));
      await updatePropertyGallery(
        client,
        propertyId,
        desiredUrls,
        workspace.property.updatedAt,
      );
      finishSaved();
    } catch (cause) {
      let displayCause = cause;
      if (desiredUrls) {
        try {
          // Retry the exact idempotent write. Its property-row lock serializes
          // with an original request that may still be committing after a lost
          // network response.
          await updatePropertyGallery(
            client,
            propertyId,
            desiredUrls,
            workspace.property.updatedAt,
          );
          finishSaved();
          return;
        } catch (retryCause) {
          if (isPropertySettingsRpcError(retryCause)) {
            displayCause = retryCause;
            try {
              const latest = await getPropertySettings(client, propertyId);
              const unreferencedUploads = uploaded.filter(
                (url) => !latest.property.images.includes(url),
              );
              if (unreferencedUploads.length) {
                await removePropertySettingsPhotos(
                  client,
                  propertyId,
                  unreferencedUploads,
                ).catch((cleanupCause) => {
                  reportCleanupFailure(
                    cleanupCause,
                    "rejected-save-cleanup",
                    unreferencedUploads.length,
                  );
                });
              }
            } catch (recoveryCause) {
              Sentry.captureException(recoveryCause, {
                tags: { area: "property-photos", operation: "rejected-save-recovery" },
                extra: { propertyId, uploadedCount: uploaded.length },
              });
            }
          } else {
            // A second transport failure is still indeterminate. Keep uploads
            // so committed metadata can never point at objects we deleted.
            Sentry.captureException(retryCause, {
              tags: { area: "property-photos", operation: "save-retry" },
              extra: {
                propertyId,
                uploadedCount: uploaded.length,
                firstError: cause instanceof Error ? cause.message : "Unknown error",
              },
            });
          }
        }
      }
      const message = displayCause instanceof Error
        ? displayCause.message
        : t("Unable to save property photos.", "Imeshindikana kuhifadhi picha za biashara.");
      setError(message);
      feedback.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack
      component="form"
      noValidate
      onSubmit={(event) => void submit(event)}
      spacing={{ xs: 2.5, sm: 3 }}
    >
      <PropertyEditorHeader
        description={t(
          "Add clear, recent photos that help your team and guests recognize the property.",
          "Ongeza picha wazi na za hivi karibuni zinazosaidia timu na wageni kuitambua biashara.",
        )}
        icon={<PhotoLibraryOutlinedIcon />}
        title={t("Property photos", "Picha za biashara")}
      />

      {error ? <Alert onClose={() => setError(null)} severity="error">{error}</Alert> : null}
      {saving ? <LinearProgress aria-label={t("Saving property photos", "Inahifadhi picha za biashara")} /> : null}

      <Surface>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.25}
          sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700 }} variant="subtitle1">
              {t("Keep it simple", "Weka kwa urahisi")}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {t(
                "The first photo is the cover. Use landscape photos with good light.",
                "Picha ya kwanza ni jalada. Tumia picha za mlalo zenye mwanga mzuri.",
              )}
            </Typography>
          </Box>
          <Chip
            color={items.length === MAX_PROPERTY_PHOTOS ? "primary" : "default"}
            label={t(
              `${items.length} of ${MAX_PROPERTY_PHOTOS} photos`,
              `Picha ${items.length} kati ya ${MAX_PROPERTY_PHOTOS}`,
            )}
            sx={{ alignSelf: { xs: "flex-start", sm: "center" }, flexShrink: 0 }}
          />
        </Stack>
      </Surface>

      <SettingsSection
        description={t(
          "Open a photo's menu to make it the cover or remove it.",
          "Fungua menyu ya picha ili kuiweka kuwa jalada au kuiondoa.",
        )}
        title={t("Your photos", "Picha zako")}
      >
        <Box
          sx={{
            display: "grid",
            gap: { xs: 1, sm: 1.5 },
            gridTemplateColumns: {
              xs: "repeat(2,minmax(0,1fr))",
              md: "repeat(3,minmax(0,1fr))",
            },
            p: { xs: 1.5, sm: 2.5 },
          }}
        >
          {items.map((item, index) => (
            <Box
              key={item.id}
              sx={{
                border: 1,
                borderColor: index === 0 ? "primary.main" : "divider",
                borderRadius: 2,
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              <Box sx={{ aspectRatio: "4 / 3", bgcolor: "action.hover", position: "relative" }}>
                <Image
                  alt={t(
                    `${workspace.property.name} photo ${index + 1}`,
                    `Picha ya ${workspace.property.name} ${index + 1}`,
                  )}
                  fill
                  sizes="(max-width: 600px) 46vw, (max-width: 1200px) 30vw, 280px"
                  src={item.url}
                  style={{ objectFit: "cover" }}
                  unoptimized={item.kind === "file"}
                />
                {index === 0 ? (
                  <Chip
                    color="primary"
                    label={t("Cover", "Jalada")}
                    size="small"
                    sx={{ left: 8, position: "absolute", top: 8 }}
                  />
                ) : null}
              </Box>

              <Stack
                direction="row"
                sx={{ alignItems: "center", minHeight: 48, pl: 1.25, pr: 0.25 }}
              >
                <Typography noWrap sx={{ flex: 1, fontWeight: 650 }} variant="caption">
                  {t(`Photo ${index + 1}`, `Picha ${index + 1}`)}
                </Typography>
                <IconButton
                  aria-controls={menuAnchor && menuPhotoId === item.id ? "property-photo-actions" : undefined}
                  aria-expanded={menuAnchor && menuPhotoId === item.id ? true : undefined}
                  aria-haspopup="menu"
                  aria-label={t(
                    `Options for property photo ${index + 1}`,
                    `Chaguo za picha ya biashara ${index + 1}`,
                  )}
                  disabled={saving}
                  onClick={(event) => {
                    setMenuAnchor(event.currentTarget);
                    setMenuPhotoId(item.id);
                  }}
                  size="small"
                  sx={{ height: 44, width: 44 }}
                >
                  <MoreVertRoundedIcon />
                </IconButton>
              </Stack>
            </Box>
          ))}

          {remaining > 0 ? (
            <Button
              component="label"
              disabled={saving}
              startIcon={<AddPhotoAlternateRoundedIcon />}
              sx={{
                aspectRatio: items.length ? "4 / 3" : "auto",
                borderStyle: "dashed",
                flexDirection: "column",
                gap: 0.75,
                gridColumn: items.length ? "auto" : "1 / -1",
                minHeight: 132,
                px: 1,
              }}
              variant="outlined"
            >
              {t("Add photos", "Ongeza picha")}
              <Typography color="text.secondary" variant="caption">
                JPG, PNG, WebP · {t("5 MB max", "MB 5 upeo")}
              </Typography>
              <input
                accept="image/jpeg,image/png,image/webp"
                aria-label={t(
                  `Add up to ${remaining} property photos`,
                  `Ongeza hadi picha ${remaining} za biashara`,
                )}
                disabled={saving}
                hidden
                multiple
                onChange={pickPhotos}
                type="file"
              />
            </Button>
          ) : null}
        </Box>
      </SettingsSection>

      <Menu
        id="property-photo-actions"
        anchorEl={menuAnchor}
        onClose={() => {
          setMenuAnchor(null);
          setMenuPhotoId(null);
        }}
        open={Boolean(menuAnchor && menuIndex >= 0)}
      >
        {menuIndex > 0 ? (
          <MenuItem onClick={() => makeCover(menuIndex)} sx={{ minHeight: 48 }}>
            <ListItemIcon><StarOutlineRoundedIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{t("Make cover", "Weka jalada")}</ListItemText>
          </MenuItem>
        ) : null}
        {menuIndex >= 0 ? (
          <MenuItem
            onClick={() => removePhoto(menuIndex)}
            sx={{ color: "error.main", minHeight: 48 }}
          >
            <ListItemIcon sx={{ color: "inherit" }}>
              <DeleteOutlineRoundedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t("Remove photo", "Ondoa picha")}</ListItemText>
          </MenuItem>
        ) : null}
      </Menu>

      <EditorSaveBar dirty={dirty} saving={saving} />
    </Stack>
  );
}
