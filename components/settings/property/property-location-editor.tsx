"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, CircularProgress, InputAdornment, List, ListItemButton, ListItemText, Paper, Stack, TextField, Typography } from "@mui/material";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { SettingsSection } from "@/components/settings/settings-shared";
import { Surface } from "@/components/shared/workspace-ui";
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

type Prediction = { placeId: string; primary: string; secondary: string; text: string };
type AddressComponent = { longText?: string; shortText?: string; types?: string[] };

function createSessionToken() {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function component(items: AddressComponent[], ...types: string[]) {
  for (const type of types) {
    const item = items.find((value) => value.types?.includes(type));
    if (item) return item;
  }
  return undefined;
}

function locationFromGoogle(data: Record<string, unknown>): PropertyLocationInput {
  const items = Array.isArray(data.addressComponents) ? data.addressComponents as AddressComponent[] : [];
  const location = data.location && typeof data.location === "object" ? data.location as { latitude?: number; longitude?: number } : {};
  const streetNumber = component(items, "street_number")?.longText ?? "";
  const route = component(items, "route")?.longText ?? "";
  const premise = component(items, "premise", "establishment", "point_of_interest")?.longText ?? "";
  const country = component(items, "country");
  const region = component(items, "administrative_area_level_1")?.longText ?? "";
  const district = component(items, "administrative_area_level_2", "locality", "postal_town")?.longText ?? "";
  const ward = component(items, "neighborhood", "sublocality_level_1", "sublocality", "administrative_area_level_3")?.longText ?? "";
  const street = [streetNumber, route].filter(Boolean).join(" ") || premise;
  return {
    country: country?.longText ?? "",
    region,
    district,
    ward,
    street,
    formattedAddress: typeof data.formattedAddress === "string" ? data.formattedAddress : [street, ward, district, region, country?.shortText].filter(Boolean).join(", "),
    placeId: typeof data.id === "string" ? data.id : "",
    latitude: Number.isFinite(Number(location.latitude)) ? Number(location.latitude) : null,
    longitude: Number.isFinite(Number(location.longitude)) ? Number(location.longitude) : null,
  };
}

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
    country: property.country,
    region: property.region,
    district: property.district,
    ward: property.ward,
    street: property.street,
    formattedAddress: property.formattedAddress,
    placeId: property.placeId,
    latitude: property.latitude,
    longitude: property.longitude,
  };
  const [form, setForm] = useState(initial);
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [searching, setSearching] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [sessionToken, setSessionToken] = useState(createSessionToken);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch("/api/google/places/autocomplete", {
          body: JSON.stringify({
            input: query,
            latitude: form.latitude ?? -6.163,
            longitude: form.longitude ?? 35.7516,
            sessionToken,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
          signal: controller.signal,
        });
        const data = await response.json() as { suggestions?: Array<{ placePrediction?: { placeId?: string; text?: { text?: string }; structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } } } }>; error?: string };
        if (!response.ok) throw new Error(data.error ?? t("Location search is unavailable.", "Utafutaji wa eneo haupatikani."));
        setPredictions((data.suggestions ?? []).map(({ placePrediction: item }) => ({ placeId: item?.placeId ?? "", primary: item?.structuredFormat?.mainText?.text ?? item?.text?.text ?? "", secondary: item?.structuredFormat?.secondaryText?.text ?? "", text: item?.text?.text ?? "" })).filter((item) => Boolean(item.placeId)));
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : t("Location search is unavailable.", "Utafutaji wa eneo haupatikani."));
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [form.latitude, form.longitude, query, sessionToken, t]);

  const choose = async (prediction: Prediction) => {
    setSelecting(true);
    setError(null);
    setPredictions([]);
    setQuery(prediction.text);
    try {
      const response = await fetch(`/api/google/places/details?placeId=${encodeURIComponent(prediction.placeId)}&sessionToken=${encodeURIComponent(sessionToken)}`);
      const data = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(String(data.error ?? t("Unable to select this location.", "Imeshindikana kuchagua eneo hili.")));
      setForm(locationFromGoogle(data));
      setQuery("");
      setSessionToken(createSessionToken());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("Unable to select this location.", "Imeshindikana kuchagua eneo hili."));
    } finally {
      setSelecting(false);
    }
  };

  const manualField = (key: Exclude<keyof PropertyLocationInput, "latitude" | "longitude" | "placeId">, value: string) => {
    setForm((current) => ({ ...current, [key]: value, placeId: "", latitude: null, longitude: null }));
  };

  const clearLocation = () => {
    setForm({ country: "", region: "", district: "", ward: "", street: "", formattedAddress: "", placeId: "", latitude: null, longitude: null });
    setQuery("");
    setPredictions([]);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updatePropertyLocation(client, propertyId, form);
      notifyPropertySettingsChanged();
      feedback.success(t("Property location saved.", "Eneo la biashara limehifadhiwa."));
      router.replace("/settings/property");
      router.refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t("Unable to save property location.", "Imeshindikana kuhifadhi eneo la biashara.");
      setError(message);
      feedback.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack component="form" onSubmit={(event) => void submit(event)} spacing={{ xs: 2.5, sm: 3 }}>
      <PropertyEditorHeader description={t("Keep a precise guest-facing address and the administrative details your team needs.", "Weka anwani sahihi kwa wageni na taarifa za eneo zinazohitajika na timu.")} icon={<LocationOnRoundedIcon />} title={t("Property location", "Eneo la biashara")} />
      {error ? <Alert onClose={() => setError(null)} severity="error">{error}</Alert> : null}
      <SettingsSection description={t("Select a Google result to populate a verified address and coordinates.", "Chagua matokeo ya Google kujaza anwani na viwianishi vilivyothibitishwa.")} title={t("Find the property", "Tafuta biashara")}>
        <Box sx={{ p: { xs: 2, sm: 2.5 }, position: "relative" }}>
          <TextField fullWidth label={t("Search property or address", "Tafuta biashara au anwani")} onChange={(event) => { setQuery(event.target.value); if (event.target.value.trim().length < 2) setPredictions([]); }} placeholder={t("Start typing a place name", "Anza kuandika jina la eneo")} slotProps={{ input: { endAdornment: searching || selecting ? <CircularProgress size={18} /> : null, startAdornment: <InputAdornment position="start"><SearchRoundedIcon /></InputAdornment> } }} value={query} />
          {predictions.length ? <Paper elevation={8} sx={{ left: { xs: 16, sm: 20 }, maxHeight: 280, overflowY: "auto", position: "absolute", right: { xs: 16, sm: 20 }, top: { xs: 76, sm: 80 }, zIndex: 4 }}><List disablePadding>{predictions.map((prediction) => <ListItemButton key={prediction.placeId} onClick={() => void choose(prediction)}><ListItemText primary={prediction.primary} secondary={prediction.secondary} /></ListItemButton>)}</List></Paper> : null}
        </Box>
      </SettingsSection>
      {form.placeId && form.latitude !== null && form.longitude !== null ? <Surface><Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}><Box sx={{ color: "success.main", display: "grid", mt: 0.1, placeItems: "center" }}><CheckCircleRoundedIcon /></Box><Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t("Google location selected", "Eneo la Google limechaguliwa")}</Typography><Typography color="text.secondary" variant="body2">{form.formattedAddress}</Typography><Typography color="text.secondary" sx={{ display: "block", mt: 0.5 }} variant="caption">{form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}</Typography></Box></Stack></Surface> : null}
      <SettingsSection action={<Button color="inherit" onClick={clearLocation} size="small">{t("Clear location", "Ondoa eneo")}</Button>} description={t("You can refine the selected address. Manual edits remove the coordinate link to prevent mismatched map data.", "Unaweza kurekebisha anwani. Mabadiliko ya mkono huondoa viwianishi ili kuepuka data isiyolingana.")} title={t("Address details", "Maelezo ya anwani")}>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" }, p: { xs: 2, sm: 2.5 } }}>
          <TextField label={t("Formatted address", "Anwani kamili")} minRows={2} multiline onChange={(event) => manualField("formattedAddress", event.target.value)} placeholder={t("Street, area, region, country", "Mtaa, eneo, mkoa, nchi")} slotProps={{ htmlInput: { maxLength: 500 } }} sx={{ gridColumn: { sm: "1/-1" } }} value={form.formattedAddress} />
          <TextField autoComplete="country-name" label={t("Country", "Nchi")} onChange={(event) => manualField("country", event.target.value)} slotProps={{ htmlInput: { maxLength: 100 } }} value={form.country} />
          <TextField label={t("Region / state", "Mkoa") } onChange={(event) => manualField("region", event.target.value)} slotProps={{ htmlInput: { maxLength: 100 } }} value={form.region} />
          <TextField label={t("District / city", "Wilaya / mji")} onChange={(event) => manualField("district", event.target.value)} slotProps={{ htmlInput: { maxLength: 100 } }} value={form.district} />
          <TextField label={t("Ward / area", "Kata / eneo")} onChange={(event) => manualField("ward", event.target.value)} slotProps={{ htmlInput: { maxLength: 100 } }} value={form.ward} />
          <TextField label={t("Street / landmark", "Mtaa / alama ya eneo")} onChange={(event) => manualField("street", event.target.value)} slotProps={{ htmlInput: { maxLength: 160 } }} sx={{ gridColumn: { sm: "1/-1" } }} value={form.street} />
        </Box>
      </SettingsSection>
      <EditorSaveBar dirty={dirty} saving={saving} />
    </Stack>
  );
}
