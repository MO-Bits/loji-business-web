"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import PhotoLibraryRoundedIcon from "@mui/icons-material/PhotoLibraryRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { Alert, Box, Button, Chip, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { SettingsSection } from "@/components/settings/settings-shared";
import { Surface } from "@/components/shared/workspace-ui";
import { usePropertySettings } from "@/features/settings/property/hooks/use-property-settings";
import type { PropertySettingsWorkspace } from "@/features/settings/property/models/property-settings";
import {
  MAX_PROPERTY_GALLERY_IMAGES,
  MAX_PROPERTY_IMAGE_BYTES,
  notifyPropertySettingsChanged,
  removePropertySettingsImages,
  updatePropertyGallery,
  uploadPropertySettingsImages,
} from "@/features/settings/property/services/property-settings-service";
import {
  EditorSaveBar,
  PropertyAccessDenied,
  PropertyEditorHeader,
  PropertySettingsError,
  PropertySettingsLoading,
} from "./property-settings-shared";

type GalleryItem =
  | { id: string; kind: "existing"; url: string }
  | { id: string; kind: "file"; file: File; url: string };

export function PropertyGalleryEditor() {
  const { t } = useLanguage();
  const state = usePropertySettings();
  if (state.loading) return <PropertySettingsLoading />;
  if (!state.workspace || !state.propertyId) return <PropertySettingsError message={state.error ?? t("Property settings were not found.", "Mipangilio ya biashara haijapatikana.")} onRetry={() => void state.refresh()} />;
  if (!state.workspace.capabilities.updateProperty) return <PropertyAccessDenied />;
  return <GalleryForm client={state.client} propertyId={state.propertyId} workspace={state.workspace} />;
}

function GalleryForm({ client, propertyId, workspace }: { client: ReturnType<typeof usePropertySettings>["client"]; propertyId: string; workspace: PropertySettingsWorkspace }) {
  const { t } = useLanguage();
  const feedback = useAppFeedback();
  const router = useRouter();
  const original = workspace.property.images;
  const [items, setItems] = useState<GalleryItem[]>(() => original.map((url) => ({ id: url, kind: "existing", url })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewUrls = useRef(new Set<string>());
  const currentUrls = items.filter((item): item is Extract<GalleryItem, { kind: "existing" }> => item.kind === "existing").map((item) => item.url);
  const representation = items.map((item) => item.kind === "existing" ? item.url : `file:${item.file.name}:${item.file.size}:${item.file.lastModified}`);
  const dirty = JSON.stringify(representation) !== JSON.stringify(original);

  useEffect(() => () => {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current.clear();
  }, []);

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (items.length + files.length > MAX_PROPERTY_GALLERY_IMAGES) {
      setError(t("A property gallery can contain at most 8 photos.", "Picha za biashara zisizidi 8."));
      return;
    }
    const invalid = files.find((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || !file.size || file.size > MAX_PROPERTY_IMAGE_BYTES);
    if (invalid) {
      setError(t(`${invalid.name} must be a JPG, PNG or WebP image under 5 MB.`, `${invalid.name} lazima iwe JPG, PNG au WebP chini ya MB 5.`));
      return;
    }
    const next = files.map((file) => {
      const url = URL.createObjectURL(file);
      previewUrls.current.add(url);
      return { id: crypto.randomUUID(), kind: "file" as const, file, url };
    });
    setItems((current) => [...current, ...next]);
    setError(null);
  };

  const remove = (index: number) => {
    const item = items[index];
    if (item?.kind === "file") {
      URL.revokeObjectURL(item.url);
      previewUrls.current.delete(item.url);
    }
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const move = (index: number, nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= items.length || index === nextIndex) return;
    setItems((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    let uploaded: string[] = [];
    try {
      const files = items.filter((item): item is Extract<GalleryItem, { kind: "file" }> => item.kind === "file").map((item) => item.file);
      uploaded = files.length ? await uploadPropertySettingsImages(client, propertyId, files) : [];
      let uploadedIndex = 0;
      const urls = items.map((item) => item.kind === "existing" ? item.url : uploaded[uploadedIndex++]).filter(Boolean);
      await updatePropertyGallery(client, propertyId, urls);
      notifyPropertySettingsChanged();
      const removed = original.filter((url) => !currentUrls.includes(url));
      if (removed.length) void removePropertySettingsImages(client, removed).catch(() => undefined);
      feedback.success(t("Property gallery saved.", "Picha za biashara zimehifadhiwa."));
      router.replace("/settings/property");
      router.refresh();
    } catch (cause) {
      if (uploaded.length) await removePropertySettingsImages(client, uploaded).catch(() => undefined);
      const message = cause instanceof Error ? cause.message : t("Unable to save property gallery.", "Imeshindikana kuhifadhi picha za biashara.");
      setError(message);
      feedback.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack component="form" onSubmit={(event) => void submit(event)} spacing={{ xs: 2.5, sm: 3 }}>
      <PropertyEditorHeader description={t("Arrange up to eight high-quality photos. The first image becomes the property cover.", "Panga hadi picha nane bora. Picha ya kwanza itakuwa jalada la biashara.")} icon={<ImageOutlinedIcon />} title={t("Property gallery", "Picha za biashara")} />
      {error ? <Alert onClose={() => setError(null)} severity="error">{error}</Alert> : null}
      <Surface>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}><Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t("Gallery quality", "Ubora wa picha")}</Typography><Typography color="text.secondary" variant="body2">{t("Use bright, landscape-oriented photos that represent the real guest experience.", "Tumia picha zenye mwanga na mlalo zinazoonyesha uzoefu halisi wa wageni.")}</Typography></Box><Chip color={items.length ? "primary" : "default"} label={t(`${items.length} of 8 photos`, `Picha ${items.length} kati ya 8`)} /></Stack>
      </Surface>
      <SettingsSection description={t("Move photos to control their order, or make any photo the cover.", "Hamisha picha kubadili mpangilio, au chagua picha yoyote kuwa jalada.")} title={t("Gallery order", "Mpangilio wa picha")}>
        <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", sm: "repeat(3,minmax(0,1fr))" }, p: { xs: 2, sm: 2.5 } }}>
          {items.map((item, index) => (
            <Box key={item.id} sx={{ aspectRatio: "4/3", border: 2, borderColor: index === 0 ? "primary.main" : "divider", borderRadius: 2, overflow: "hidden", position: "relative" }}>
              <Box alt={`${workspace.property.name} ${index + 1}`} component="img" src={item.url} sx={{ height: "100%", objectFit: "cover", width: "100%" }} />
              {index === 0 ? <Chip color="primary" icon={<StarRoundedIcon />} label={t("Cover", "Jalada")} size="small" sx={{ left: 8, position: "absolute", top: 8 }} /> : <Button onClick={() => move(index, 0)} size="small" sx={{ bgcolor: "rgba(10,24,45,.74)", bottom: 8, color: "white", left: 8, position: "absolute", "&:hover": { bgcolor: "rgba(10,24,45,.9)" } }}>{t("Make cover", "Weka jalada")}</Button>}
              <Tooltip title={t("Remove photo", "Ondoa picha")}><IconButton aria-label={t(`Remove photo ${index + 1}`, `Ondoa picha ${index + 1}`)} onClick={() => remove(index)} size="small" sx={{ bgcolor: "rgba(10,24,45,.74)", color: "white", position: "absolute", right: 8, top: 8, "&:hover": { bgcolor: "rgba(10,24,45,.9)" } }}><CloseRoundedIcon fontSize="small" /></IconButton></Tooltip>
              <Stack direction="row" spacing={0.5} sx={{ bottom: 8, position: "absolute", right: 8 }}>
                <Tooltip title={t("Move earlier", "Hamisha nyuma")}><span><IconButton aria-label={t("Move photo earlier", "Hamisha picha nyuma")} disabled={index === 0} onClick={() => move(index, index - 1)} size="small" sx={{ bgcolor: "rgba(10,24,45,.74)", color: "white", "&:hover": { bgcolor: "rgba(10,24,45,.9)" } }}><ArrowUpwardRoundedIcon fontSize="small" /></IconButton></span></Tooltip>
                <Tooltip title={t("Move later", "Hamisha mbele")}><span><IconButton aria-label={t("Move photo later", "Hamisha picha mbele")} disabled={index === items.length - 1} onClick={() => move(index, index + 1)} size="small" sx={{ bgcolor: "rgba(10,24,45,.74)", color: "white", "&:hover": { bgcolor: "rgba(10,24,45,.9)" } }}><ArrowDownwardRoundedIcon fontSize="small" /></IconButton></span></Tooltip>
              </Stack>
            </Box>
          ))}
          {items.length < MAX_PROPERTY_GALLERY_IMAGES ? <Button component="label" startIcon={<PhotoLibraryRoundedIcon />} sx={{ aspectRatio: "4/3", borderStyle: "dashed", flexDirection: "column", gap: 0.75 }} variant="outlined">{t("Add photos", "Ongeza picha")}<Typography color="text.secondary" variant="caption">JPG, PNG, WebP · {t("5 MB max", "MB 5 kiwango")}</Typography><input accept="image/jpeg,image/png,image/webp" hidden multiple onChange={pick} type="file" /></Button> : null}
        </Box>
        {!items.length ? <Typography color="text.secondary" sx={{ px: { xs: 2, sm: 2.5 }, pb: 2.5 }} variant="body2">{t("The gallery can be empty, but a strong cover photo improves recognition across the workspace.", "Picha zinaweza kuwa tupu, lakini jalada zuri husaidia kuitambua biashara.")}</Typography> : null}
      </SettingsSection>
      <EditorSaveBar dirty={dirty} saving={saving} />
    </Stack>
  );
}
