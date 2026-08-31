"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, Chip, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { SettingsSection } from "@/components/settings/settings-shared";
import { Surface } from "@/components/shared/workspace-ui";
import { usePropertySettings } from "@/features/settings/property/hooks/use-property-settings";
import { propertyAmenities, type PropertySettingsWorkspace } from "@/features/settings/property/models/property-settings";
import { notifyPropertySettingsChanged, updatePropertyAmenities } from "@/features/settings/property/services/property-settings-service";
import {
  EditorSaveBar,
  PropertyAccessDenied,
  PropertyEditorHeader,
  PropertySettingsError,
  PropertySettingsLoading,
} from "./property-settings-shared";

export function PropertyAmenitiesEditor() {
  const { t } = useLanguage();
  const state = usePropertySettings();
  if (state.loading) return <PropertySettingsLoading />;
  if (!state.workspace || !state.propertyId) return <PropertySettingsError message={state.error ?? t("Property settings were not found.", "Mipangilio ya biashara haijapatikana.")} onRetry={() => void state.refresh()} />;
  if (!state.workspace.capabilities.updateProperty) return <PropertyAccessDenied />;
  return <AmenitiesForm client={state.client} propertyId={state.propertyId} workspace={state.workspace} />;
}

function normalized(values: string[]) {
  const seen = new Set<string>();
  return values.map((value) => value.trim()).filter((value) => {
    const key = value.toLocaleLowerCase();
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function AmenitiesForm({ client, propertyId, workspace }: { client: ReturnType<typeof usePropertySettings>["client"]; propertyId: string; workspace: PropertySettingsWorkspace }) {
  const { t } = useLanguage();
  const feedback = useAppFeedback();
  const router = useRouter();
  const initial = normalized(workspace.property.amenities);
  const [selected, setSelected] = useState(initial);
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(selected) !== JSON.stringify(initial);
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return propertyAmenities.filter((amenity) =>
      !term || `${amenity} ${t(amenity)}`.toLocaleLowerCase().includes(term),
    );
  }, [query, t]);

  const toggle = (amenity: string) => {
    setSelected((current) => current.some((value) => value.toLocaleLowerCase() === amenity.toLocaleLowerCase())
      ? current.filter((value) => value.toLocaleLowerCase() !== amenity.toLocaleLowerCase())
      : current.length < 50 ? [...current, amenity] : current);
  };

  const addCustom = () => {
    const value = custom.trim();
    if (!value) return;
    if (value.length > 80) return setError(t("Custom amenities must be 80 characters or fewer.", "Huduma maalum ziwe na herufi 80 au chache."));
    if (selected.length >= 50) return setError(t("A property can have at most 50 amenities.", "Biashara inaweza kuwa na huduma zisizozidi 50."));
    setSelected((current) => normalized([...current, value]));
    setCustom("");
    setError(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updatePropertyAmenities(client, propertyId, selected);
      notifyPropertySettingsChanged();
      feedback.success(t("Property amenities saved.", "Huduma za biashara zimehifadhiwa."));
      router.replace("/settings/property");
      router.refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t("Unable to save amenities.", "Imeshindikana kuhifadhi huduma.");
      setError(message);
      feedback.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack component="form" onSubmit={(event) => void submit(event)} spacing={{ xs: 2.5, sm: 3 }}>
      <PropertyEditorHeader description={t("Choose the facilities and services available across the property.", "Chagua vifaa na huduma zinazopatikana katika biashara.")} icon={<LocalOfferOutlinedIcon />} title={t("Property amenities", "Huduma za biashara")} />
      {error ? <Alert onClose={() => setError(null)} severity="error">{error}</Alert> : null}
      <Surface>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}><Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t("Selected amenities", "Huduma zilizochaguliwa")}</Typography><Typography color="text.secondary" variant="body2">{t(`${selected.length} of 50 available slots`, `Sehemu ${selected.length} kati ya 50 zimetumika`)}</Typography></Box>{selected.length ? <Button color="inherit" onClick={() => setSelected([])} size="small">{t("Clear all", "Ondoa zote")}</Button> : null}</Stack>
        {selected.length ? <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 2 }}>{selected.map((amenity) => <Chip key={amenity.toLocaleLowerCase()} label={t(amenity)} onDelete={() => toggle(amenity)} variant="outlined" />)}</Box> : <Typography color="text.secondary" sx={{ mt: 2 }} variant="body2">{t("No amenities selected. You can save an empty list.", "Hakuna huduma zilizochaguliwa. Unaweza kuhifadhi orodha tupu.")}</Typography>}
      </Surface>
      <SettingsSection description={t("Tap a facility to add or remove it from the property profile.", "Bonyeza huduma ili kuiongeza au kuiondoa kwenye wasifu wa biashara.")} title={t("Common facilities", "Huduma za kawaida")}>
        <Stack spacing={2} sx={{ p: { xs: 2, sm: 2.5 } }}>
          <TextField label={t("Find an amenity", "Tafuta huduma")} onChange={(event) => setQuery(event.target.value)} placeholder={t("Search facilities", "Tafuta huduma")} size="small" slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> } }} value={query} />
          <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" } }}>
            {visible.map((amenity) => {
              const active = selected.some((value) => value.toLocaleLowerCase() === amenity.toLocaleLowerCase());
              return <Button aria-pressed={active} color={active ? "primary" : "inherit"} key={amenity} onClick={() => toggle(amenity)} startIcon={active ? <CheckRoundedIcon /> : <AddRoundedIcon />} sx={{ justifyContent: "flex-start" }} variant={active ? "contained" : "outlined"}>{t(amenity)}</Button>;
            })}
          </Box>
        </Stack>
      </SettingsSection>
      <SettingsSection description={t("Add a facility specific to your property. Maximum 80 characters.", "Ongeza huduma maalum ya biashara yako. Herufi zisizozidi 80.")} title={t("Custom amenity", "Huduma maalum")}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ p: { xs: 2, sm: 2.5 } }}><TextField fullWidth label={t("Amenity name", "Jina la huduma")} onChange={(event) => setCustom(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustom(); } }} slotProps={{ htmlInput: { maxLength: 80 } }} value={custom} /><Button disabled={!custom.trim()} onClick={addCustom} startIcon={<AddRoundedIcon />} variant="outlined">{t("Add", "Ongeza")}</Button></Stack>
      </SettingsSection>
      <EditorSaveBar dirty={dirty} saving={saving} />
    </Stack>
  );
}
