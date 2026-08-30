"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import { Alert, Box, InputAdornment, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { SettingsSection } from "@/components/settings/settings-shared";
import { Surface } from "@/components/shared/workspace-ui";
import { usePropertySettings } from "@/features/settings/property/hooks/use-property-settings";
import type { PropertyOperationsInput, PropertySettingsWorkspace } from "@/features/settings/property/models/property-settings";
import { notifyPropertySettingsChanged, updatePropertyOperationalSettings } from "@/features/settings/property/services/property-settings-service";
import {
  EditorSaveBar,
  PropertyAccessDenied,
  PropertyEditorHeader,
  PropertySettingsError,
  PropertySettingsLoading,
} from "./property-settings-shared";

const commonTimezones = [
  "Africa/Dar_es_Salaam",
  "Africa/Nairobi",
  "Africa/Kampala",
  "Africa/Kigali",
  "Africa/Bujumbura",
  "Africa/Maputo",
  "Africa/Johannesburg",
  "Africa/Lusaka",
  "UTC",
];

export function PropertyOperationsEditor() {
  const { t } = useLanguage();
  const state = usePropertySettings();
  if (state.loading) return <PropertySettingsLoading />;
  if (!state.workspace || !state.propertyId) return <PropertySettingsError message={state.error ?? t("Property settings were not found.", "Mipangilio ya biashara haijapatikana.")} onRetry={() => void state.refresh()} />;
  if (!state.workspace.capabilities.updateProperty) return <PropertyAccessDenied />;
  return <OperationsForm client={state.client} propertyId={state.propertyId} workspace={state.workspace} />;
}

function OperationsForm({ client, propertyId, workspace }: { client: ReturnType<typeof usePropertySettings>["client"]; propertyId: string; workspace: PropertySettingsWorkspace }) {
  const { t } = useLanguage();
  const feedback = useAppFeedback();
  const router = useRouter();
  const initial: PropertyOperationsInput = {
    timezone: workspace.property.timezone,
    checkinTime: workspace.property.checkinTime,
    checkoutTime: workspace.property.checkoutTime,
  };
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timezoneOptions = useMemo(() => commonTimezones.includes(form.timezone) ? commonTimezones : [form.timezone, ...commonTimezones], [form.timezone]);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const invalid = !form.timezone || !/^\d{2}:\d{2}$/.test(form.checkinTime) || !/^\d{2}:\d{2}$/.test(form.checkoutTime);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dirty || invalid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updatePropertyOperationalSettings(client, propertyId, form);
      notifyPropertySettingsChanged();
      feedback.success(t("Operating schedule saved.", "Ratiba ya uendeshaji imehifadhiwa."));
      router.replace("/settings/property");
      router.refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t("Unable to save operating schedule.", "Imeshindikana kuhifadhi ratiba ya uendeshaji.");
      setError(message);
      feedback.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack component="form" onSubmit={(event) => void submit(event)} spacing={{ xs: 2.5, sm: 3 }}>
      <PropertyEditorHeader description={t("Set the property clock and the default times your team uses for arrivals and departures.", "Weka saa za eneo na muda wa kawaida ambao timu hutumia kwa kuingia na kutoka.")} icon={<ScheduleOutlinedIcon />} title={t("Operating schedule", "Ratiba ya uendeshaji")} />
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Surface>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}><Box sx={{ bgcolor: "color-mix(in srgb, var(--mui-palette-info-main) 11%, transparent)", borderRadius: 2, color: "info.main", display: "grid", flexShrink: 0, height: 40, placeItems: "center", width: 40 }}><PublicRoundedIcon fontSize="small" /></Box><Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t("Property-local business date", "Tarehe ya biashara kwa saa za eneo")}</Typography><Typography color="text.secondary" sx={{ mt: 0.35 }} variant="body2">{t("Room occupancy, arrivals, departures, and dashboard totals use this timezone—not the browser clock.", "Ukaaji wa vyumba, wanaowasili, wanaotoka na takwimu hutumia saa hizi, si saa za kivinjari.")}</Typography></Box></Stack>
      </Surface>
      <SettingsSection description={t("Choose the IANA timezone where this property physically operates.", "Chagua saa za IANA za eneo ambako biashara hii ipo.")} title={t("Property timezone", "Saa za eneo la biashara")}>
        <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
          <TextField fullWidth label={t("Timezone", "Saa za eneo")} onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))} select slotProps={{ input: { startAdornment: <InputAdornment position="start"><PublicRoundedIcon fontSize="small" /></InputAdornment> } }} value={form.timezone}>{timezoneOptions.map((timezone) => <MenuItem key={timezone} value={timezone}>{timezone.replaceAll("_", " ")}</MenuItem>)}</TextField>
        </Box>
      </SettingsSection>
      <SettingsSection description={t("These are operational defaults; each booking still keeps its own stay dates.", "Hizi ni saa za kawaida; kila nafasi bado ina tarehe zake.")} title={t("Guest arrival and departure", "Kuingia na kutoka kwa wageni")}>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" }, p: { xs: 2, sm: 2.5 } }}>
          <TextField helperText={t("When rooms normally become available.", "Muda ambao vyumba huwa tayari kwa kawaida.")} label={t("Standard check-in time", "Muda wa kawaida wa kuingia")} onChange={(event) => setForm((current) => ({ ...current, checkinTime: event.target.value }))} slotProps={{ htmlInput: { step: 300 }, input: { startAdornment: <InputAdornment position="start"><AccessTimeRoundedIcon fontSize="small" /></InputAdornment> }, inputLabel: { shrink: true } }} type="time" value={form.checkinTime} />
          <TextField helperText={t("When departing guests should release rooms.", "Muda ambao wageni wanaotoka wanapaswa kuacha vyumba.")} label={t("Standard checkout time", "Muda wa kawaida wa kutoka")} onChange={(event) => setForm((current) => ({ ...current, checkoutTime: event.target.value }))} slotProps={{ htmlInput: { step: 300 }, input: { startAdornment: <InputAdornment position="start"><AccessTimeRoundedIcon fontSize="small" /></InputAdornment> }, inputLabel: { shrink: true } }} type="time" value={form.checkoutTime} />
        </Box>
      </SettingsSection>
      <EditorSaveBar dirty={dirty && !invalid} saving={saving} />
    </Stack>
  );
}
