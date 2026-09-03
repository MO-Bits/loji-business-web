"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import { Alert, Box, MenuItem, Stack, TextField, Typography } from "@mui/material";

import { useAppFeedback } from "@/components/providers/feedback-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { SettingsSection } from "@/components/settings/settings-shared";
import { Surface } from "@/components/shared/workspace-ui";
import { tanzaniaRegions } from "@/features/onboarding/models/business-setup";
import { usePropertySettings } from "@/features/settings/property/hooks/use-property-settings";
import type { PropertyLocationInput, PropertySettingsWorkspace } from "@/features/settings/property/models/property-settings";
import { notifyPropertySettingsChanged, updatePropertyLocation } from "@/features/settings/property/services/property-settings-service";
import {
  EditorSaveBar,
  PropertyAccessDenied,
  PropertyEditorHeader,
  PropertySettingsError,
  PropertySettingsLoading,
} from "./property-settings-shared";

export function PropertyLocationEditor() {
  const { t } = useLanguage();
  const state = usePropertySettings();
  if (state.loading) return <PropertySettingsLoading />;
  if (!state.workspace || !state.propertyId) return <PropertySettingsError message={state.error ?? t("Property settings were not found.", "Mipangilio ya biashara haijapatikana.")} onRetry={() => void state.refresh()} />;
  if (!state.workspace.capabilities.updateProperty) return <PropertyAccessDenied />;
  return <LocationForm client={state.client} propertyId={state.propertyId} workspace={state.workspace} />;
}

function LocationForm({ client, propertyId, workspace }: { client: ReturnType<typeof usePropertySettings>["client"]; propertyId: string; workspace: PropertySettingsWorkspace }) {
  const { t } = useLanguage();
  const feedback = useAppFeedback();
  const router = useRouter();
  const property = workspace.property;
  const initial: PropertyLocationInput = {
    country: "Tanzania",
    region: property.region,
    district: property.district,
    ward: property.ward,
    street: property.street,
    formattedAddress: property.formattedAddress,
    placeId: "",
    latitude: null,
    longitude: null,
  };
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const address = [form.street, form.ward, form.district, form.region, "Tanzania"].filter(Boolean).join(", ");
  const normalized = {
    ...form,
    country: "Tanzania",
    formattedAddress: address,
    placeId: "",
    latitude: null,
    longitude: null,
  };
  const dirty = JSON.stringify(normalized) !== JSON.stringify(initial);
  const invalid = !tanzaniaRegions.some((region) => region === form.region) || !form.district.trim() || (!form.ward.trim() && !form.street.trim());

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dirty || invalid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updatePropertyLocation(client, propertyId, normalized);
      notifyPropertySettingsChanged();
      feedback.success(t("Business location saved.", "Eneo la biashara limehifadhiwa."));
      router.replace("/settings/property");
      router.refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t("Unable to save business location.", "Imeshindikana kuhifadhi eneo la biashara.");
      setError(message);
      feedback.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack component="form" onSubmit={(event) => void submit(event)} spacing={{ xs: 2.5, sm: 3 }}>
      <PropertyEditorHeader description={t("Keep a clear local address for staff and guests. A ward, street or nearby landmark is enough.", "Weka anwani rahisi kwa wafanyakazi na wageni. Kata, mtaa au alama ya karibu inatosha.")} icon={<LocationOnRoundedIcon />} title={t("Business location", "Eneo la biashara")} />
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Surface>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
          <Box sx={{ bgcolor: "action.selected", borderRadius: 2, color: "primary.main", display: "grid", flexShrink: 0, height: 40, placeItems: "center", width: 40 }}><LocationOnRoundedIcon fontSize="small" /></Box>
          <Box><Typography sx={{ fontWeight: 700 }}>{t("Tanzania address", "Anwani ya Tanzania")}</Typography><Typography color="text.secondary" variant="body2">{address || t("Choose the region and add the local address below.", "Chagua mkoa na uweke anwani ya eneo hapa chini.")}</Typography></Box>
        </Stack>
      </Surface>
      <SettingsSection description={t("Choose the administrative area where the business operates.", "Chagua eneo la utawala ambako biashara ipo.")} title={t("Region and district", "Mkoa na wilaya")}>
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" }, p: { xs: 2, sm: 2.5 } }}>
          <TextField disabled label={t("Country", "Nchi")} value="Tanzania" />
          <TextField required label={t("Region", "Mkoa")} onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))} select value={form.region}>{tanzaniaRegions.map((region) => <MenuItem key={region} value={region}>{region}</MenuItem>)}</TextField>
          <TextField required label={t("District", "Wilaya")} onChange={(event) => setForm((current) => ({ ...current, district: event.target.value.slice(0, 120) }))} value={form.district} />
        </Box>
      </SettingsSection>
      <SettingsSection description={t("Add a ward and a street, road or nearby landmark. At least one is required.", "Weka kata na mtaa, barabara au alama ya karibu. Angalau kimoja kinahitajika.")} title={t("Local address", "Anwani ya eneo")}>
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" }, p: { xs: 2, sm: 2.5 } }}>
          <TextField label={t("Ward", "Kata")} onChange={(event) => setForm((current) => ({ ...current, ward: event.target.value.slice(0, 120) }))} value={form.ward} />
          <TextField label={t("Street or landmark", "Mtaa au alama ya karibu")} onChange={(event) => setForm((current) => ({ ...current, street: event.target.value.slice(0, 200) }))} value={form.street} />
        </Box>
      </SettingsSection>
      <EditorSaveBar dirty={dirty && !invalid} saving={saving} />
    </Stack>
  );
}
