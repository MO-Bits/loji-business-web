"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import { Alert, Box, InputAdornment, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { SettingsSection } from "@/components/settings/settings-shared";
import { usePropertySettings } from "@/features/settings/property/hooks/use-property-settings";
import { propertyTypes, type PropertyProfileInput, type PropertySettingsWorkspace } from "@/features/settings/property/models/property-settings";
import { notifyPropertySettingsChanged, updatePropertyProfile } from "@/features/settings/property/services/property-settings-service";
import {
  EditorSaveBar,
  PropertyAccessDenied,
  PropertyEditorHeader,
  PropertySettingsError,
  PropertySettingsLoading,
} from "./property-settings-shared";

export function PropertyProfileEditor() {
  const { t } = useLanguage();
  const state = usePropertySettings();
  if (state.loading) return <PropertySettingsLoading />;
  if (!state.workspace || !state.propertyId) return <PropertySettingsError message={state.error ?? t("Property settings were not found.", "Mipangilio ya biashara haijapatikana.")} onRetry={() => void state.refresh()} />;
  if (!state.workspace.capabilities.updateProperty) return <PropertyAccessDenied />;
  return <ProfileForm client={state.client} propertyId={state.propertyId} workspace={state.workspace} />;
}

function ProfileForm({ client, propertyId, workspace }: { client: ReturnType<typeof usePropertySettings>["client"]; propertyId: string; workspace: PropertySettingsWorkspace }) {
  const { t } = useLanguage();
  const feedback = useAppFeedback();
  const router = useRouter();
  const property = workspace.property;
  const initial: PropertyProfileInput = {
    name: property.name,
    description: property.description,
    propertyType: property.propertyType,
    phone: property.phone,
    email: property.email,
  };
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalized = {
    name: form.name.trim(),
    description: form.description.trim(),
    propertyType: form.propertyType,
    phone: form.phone.trim(),
    email: form.email.trim().toLowerCase(),
  };
  const dirty = JSON.stringify(normalized) !== JSON.stringify({ ...initial, name: initial.name.trim(), description: initial.description.trim(), phone: initial.phone.trim(), email: initial.email.trim().toLowerCase() });
  const errors = {
    name: normalized.name.length < 2 || normalized.name.length > 120,
    description: normalized.description.length > 2000,
    propertyType: !normalized.propertyType,
    phone: normalized.phone.length < 5 || normalized.phone.length > 32 || !/^[+()\d.\-\s]+$/.test(normalized.phone),
    email: Boolean(normalized.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email),
  };
  const invalid = Object.values(errors).some(Boolean);

  const field = (key: keyof PropertyProfileInput, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);
    if (invalid || !dirty || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updatePropertyProfile(client, propertyId, normalized);
      notifyPropertySettingsChanged();
      feedback.success(t("Property profile saved.", "Wasifu wa biashara umehifadhiwa."));
      router.replace("/settings/property");
      router.refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t("Unable to save property profile.", "Imeshindikana kuhifadhi wasifu wa biashara.");
      setError(message);
      feedback.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack component="form" noValidate onSubmit={(event) => void submit(event)} spacing={{ xs: 2.5, sm: 3 }}>
      <PropertyEditorHeader description={t("Update the guest-facing identity and primary contact details for this workspace.", "Sasisha utambulisho unaoonekana kwa wageni na mawasiliano makuu ya biashara.")} icon={<BadgeOutlinedIcon />} title={t("Identity and contact", "Utambulisho na mawasiliano")} />
      {error ? <Alert severity="error">{error}</Alert> : null}
      <SettingsSection description={t("These details appear across bookings, staff workflows, and property summaries.", "Taarifa hizi huonekana kwenye nafasi, kazi za timu na muhtasari wa biashara.")} title={t("Business identity", "Utambulisho wa biashara")}>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" }, p: { xs: 2, sm: 2.5 } }}>
          <TextField autoComplete="organization" error={attempted && errors.name} helperText={attempted && errors.name ? t("Use 2–120 characters.", "Tumia herufi 2–120.") : " "} label={t("Property name", "Jina la biashara")} onChange={(event) => field("name", event.target.value)} required slotProps={{ htmlInput: { maxLength: 120 } }} value={form.name} />
          <TextField error={attempted && errors.propertyType} helperText=" " label={t("Property type", "Aina ya biashara")} onChange={(event) => field("propertyType", event.target.value)} select value={form.propertyType}>{propertyTypes.map((type) => <MenuItem key={type} sx={{ textTransform: "capitalize" }} value={type}>{type.replaceAll("_", " ")}</MenuItem>)}</TextField>
          <TextField error={attempted && errors.description} helperText={attempted && errors.description ? t("Keep the description under 2,000 characters.", "Maelezo yawe chini ya herufi 2,000.") : t(`${form.description.length}/2000 · Optional`, `${form.description.length}/2000 · Si lazima`)} label={t("Property description", "Maelezo ya biashara")} minRows={5} multiline onChange={(event) => field("description", event.target.value)} placeholder={t("Describe the location, atmosphere, and experience guests can expect.", "Eleza eneo, mazingira na uzoefu ambao wageni watapata.")} slotProps={{ htmlInput: { maxLength: 2000 } }} sx={{ gridColumn: { sm: "1/-1" } }} value={form.description} />
        </Box>
      </SettingsSection>
      <SettingsSection description={t("Use contact details actively monitored by your front desk or management team.", "Tumia mawasiliano yanayofuatiliwa na mapokezi au usimamizi.")} title={t("Primary contact", "Mawasiliano makuu")}>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" }, p: { xs: 2, sm: 2.5 } }}>
          <TextField autoComplete="tel" error={attempted && errors.phone} helperText={attempted && errors.phone ? t("Enter a valid phone number with 5–32 characters.", "Weka namba sahihi yenye herufi 5–32.") : " "} label={t("Phone number", "Namba ya simu")} onChange={(event) => field("phone", event.target.value)} placeholder="+255 7xx xxx xxx" required slotProps={{ htmlInput: { inputMode: "tel", maxLength: 32 }, input: { startAdornment: <InputAdornment position="start"><PhoneOutlinedIcon fontSize="small" /></InputAdornment> } }} value={form.phone} />
          <TextField autoComplete="email" error={attempted && errors.email} helperText={attempted && errors.email ? t("Enter a valid email address.", "Weka anwani sahihi ya barua pepe.") : t("Optional", "Si lazima")} label={t("Property email", "Barua pepe ya biashara")} onChange={(event) => field("email", event.target.value)} slotProps={{ htmlInput: { inputMode: "email", maxLength: 254 }, input: { startAdornment: <InputAdornment position="start"><EmailOutlinedIcon fontSize="small" /></InputAdornment> } }} value={form.email} />
        </Box>
      </SettingsSection>
      <EditorSaveBar dirty={dirty} saving={saving} />
      <Typography color="text.secondary" sx={{ textAlign: "center" }} variant="caption">{t("Profile updates are permission-checked and recorded in the activity log.", "Mabadiliko hukaguliwa kwa ruhusa na kurekodiwa kwenye historia.")}</Typography>
    </Stack>
  );
}
