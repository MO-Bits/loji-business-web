"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import MyLocationRoundedIcon from "@mui/icons-material/MyLocationRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, CircularProgress, Container, IconButton, InputAdornment, List, ListItemButton, ListItemText, Paper, Snackbar, Stack, TextField, Typography } from "@mui/material";
import { usePropertyController } from "@/features/property/hooks/use-property-controller";
import type { PlaceDetails, PlacePrediction, PropertyAddress } from "@/features/property/models/property";
import { createClient } from "@/lib/supabase/client";
import { useAppFeedback } from "@/components/providers/feedback-provider";

type LatLng = { lat: number; lng: number };
type MapInstance = { getCenter(): { lat(): number; lng(): number } | null; panTo(position: LatLng): void; setZoom(zoom: number): void; setMapTypeId(type: string): void; addListener(event: string, callback: () => void): { remove(): void } };
declare global { interface Window { google?: { maps: { Map: new (element: HTMLElement, options: Record<string, unknown>) => MapInstance } } } }

const DEFAULT_POSITION = { lat: -6.163, lng: 35.7516 };

function createSessionToken() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("") || `${Date.now()}-${Math.random()}`;
}

function parseComponents(items: Array<{ longText?: string; shortText?: string; types?: string[] }> = []) {
  const find = (...types: string[]) => items.find((item) => types.some((type) => item.types?.includes(type)))?.longText ?? "";
  return {
    country: find("country"), region: find("administrative_area_level_1"), district: find("administrative_area_level_2"),
    ward: find("neighborhood", "sublocality", "sublocality_level_1", "administrative_area_level_3", "administrative_area_level_4"),
    street: [find("street_number"), find("route")].filter(Boolean).join(" "),
  };
}

function detailsFromGoogle(data: Record<string, unknown>): PlaceDetails {
  const location = (data.location ?? {}) as { latitude?: number; longitude?: number };
  const displayName = (data.displayName ?? {}) as { text?: string };
  const parts = parseComponents((data.addressComponents ?? []) as Array<{ longText?: string; types?: string[] }>);
  return { name: displayName.text ?? "Selected location", placeId: String(data.id ?? ""), formattedAddress: String(data.formattedAddress ?? ""), ...parts, latitude: location.latitude ?? DEFAULT_POSITION.lat, longitude: location.longitude ?? DEFAULT_POSITION.lng };
}

function detailsFromGeocode(data: Record<string, unknown>, position: LatLng): PlaceDetails | null {
  const result = Array.isArray(data.results) ? data.results[0] as Record<string, unknown> | undefined : undefined;
  if (!result) return null;
  const components = (result.address_components ?? []) as Array<{ long_name?: string; short_name?: string; types?: string[] }>;
  const parts = parseComponents(components.map((item) => ({ longText: item.long_name, shortText: item.short_name, types: item.types })));
  return { name: parts.street || parts.ward || "Selected location", placeId: String(result.place_id ?? ""), formattedAddress: String(result.formatted_address ?? ""), ...parts, latitude: position.lat, longitude: position.lng };
}

export function PropertyAddressMap() {
  const router = useRouter();
  const feedback = useAppFeedback();
  const mapElement = useRef<HTMLDivElement>(null);
  const map = useRef<MapInstance | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [selected, setSelected] = useState<PlaceDetails | null>(null);
  const [position, setPosition] = useState(DEFAULT_POSITION);
  const [searching, setSearching] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [satellite, setSatellite] = useState(false);
  const [sessionToken, setSessionToken] = useState(createSessionToken);
  const controller = usePropertyController();

  const reverseGeocode = async (next: LatLng) => {
    setLoadingAddress(true);
    try {
      const response = await fetch(`/api/google/geocode?lat=${next.lat}&lng=${next.lng}`);
      const data = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(String(data.error ?? "Unable to load this address."));
      setSelected(detailsFromGeocode(data, next));
    } catch (cause) { setMapError(cause instanceof Error ? cause.message : "Unable to load this address."); }
    finally { setLoadingAddress(false); }
  };

  useEffect(() => {
    let cancelled = false;

    const start = () => {
      if (cancelled || !mapElement.current || !window.google || map.current) return;
      map.current = new window.google.maps.Map(mapElement.current, { center: DEFAULT_POSITION, zoom: 14.5, mapTypeControl: false, streetViewControl: false, fullscreenControl: false, zoomControl: false });
      map.current.addListener("idle", () => {
        const center = map.current?.getCenter(); if (!center) return;
        const next = { lat: center.lat(), lng: center.lng() }; setPosition(next);
        if (idleTimer.current) clearTimeout(idleTimer.current);
        idleTimer.current = setTimeout(() => void reverseGeocode(next), 700);
      });
    };

    const loadMap = async () => {
      try {
        if (window.google) return start();

        const response = await fetch("/api/google/maps-config", { cache: "no-store" });
        const data = await response.json() as { key?: string; error?: string };
        if (!response.ok || !data.key) {
          throw new Error(data.error ?? "Google Maps is not configured.");
        }

        const existing = document.querySelector<HTMLScriptElement>("script[data-loji-google-maps]");
        if (existing) {
          existing.addEventListener("load", start, { once: true });
          return;
        }

        const script = document.createElement("script");
        script.dataset.lojiGoogleMaps = "true";
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(data.key)}&v=weekly`;
        script.async = true;
        script.onload = start;
        script.onerror = () => setMapError("Google Maps could not be loaded. Check the API key website restrictions.");
        document.head.appendChild(script);
      } catch (cause) {
        if (!cancelled) setMapError(cause instanceof Error ? cause.message : "Google Maps could not be loaded.");
      }
    };

    void loadMap();

    return () => {
      cancelled = true;
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch("/api/google/places/autocomplete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: query, latitude: position.lat, longitude: position.lng, sessionToken }) });
        const data = await response.json() as { suggestions?: Array<{ placePrediction?: { placeId?: string; text?: { text?: string }; structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } } } }>; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Search is unavailable.");
        setPredictions((data.suggestions ?? []).map(({ placePrediction: item }) => ({ placeId: item?.placeId ?? "", text: item?.text?.text ?? "", primaryText: item?.structuredFormat?.mainText?.text ?? item?.text?.text ?? "", secondaryText: item?.structuredFormat?.secondaryText?.text ?? "" })).filter((item) => item.placeId));
      } catch (cause) { setMapError(cause instanceof Error ? cause.message : "Search is unavailable."); }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, position.lat, position.lng, sessionToken]);

  const choosePrediction = async (prediction: PlacePrediction) => {
    setQuery(prediction.text); setPredictions([]); setLoadingAddress(true);
    try {
      const response = await fetch(`/api/google/places/details?placeId=${encodeURIComponent(prediction.placeId)}&sessionToken=${encodeURIComponent(sessionToken)}`);
      const data = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(String(data.error ?? "Unable to select this place."));
      const details = detailsFromGoogle(data); setSelected(details); setPosition({ lat: details.latitude, lng: details.longitude }); map.current?.panTo({ lat: details.latitude, lng: details.longitude }); map.current?.setZoom(17); setSessionToken(createSessionToken());
    } catch (cause) { setMapError(cause instanceof Error ? cause.message : "Unable to select this place."); }
    finally { setLoadingAddress(false); }
  };

  const currentLocation = () => {
    if (!navigator.geolocation) return setMapError("Location is not supported by this browser.");
    navigator.geolocation.getCurrentPosition(({ coords }) => { const next = { lat: coords.latitude, lng: coords.longitude }; setPosition(next); map.current?.panTo(next); map.current?.setZoom(17); }, (error) => setMapError(error.message), { enableHighAccuracy: true, timeout: 15000 });
  };

  const confirm = async () => {
    if (!selected) return setMapError("Please select a location.");
    const { data: { user } } = await createClient().auth.getUser();
    if (!user) return setMapError("Your session has expired.");
    try { await controller.saveAddress(user.id, selected as PropertyAddress); feedback.success("Property location saved successfully."); router.replace("/"); } catch { /* displayed below */ }
  };

  return (
    <Box component="main" sx={{ height: "100dvh", overflow: "hidden", position: "relative" }}>
      <Box ref={mapElement} sx={{ bgcolor: "action.hover", height: "100%", width: "100%" }} />
      <LocationOnRoundedIcon color="error" sx={{ fontSize: 56, left: "50%", pointerEvents: "none", position: "absolute", top: "50%", transform: "translate(-50%, -100%)" }} />
      <Container maxWidth="sm" sx={{ left: 0, position: "absolute", right: 0, top: 0 }}>
        <Stack spacing={1.2} sx={{ pt: 2 }}>
          <Paper elevation={3} sx={{ borderRadius: 1 }}><TextField value={query} onChange={(e) => { setQuery(e.target.value); if (e.target.value.trim().length < 2) setPredictions([]); }} placeholder="Search for your property or area" slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon /></InputAdornment>, endAdornment: searching ? <CircularProgress size={20} /> : null } }} /></Paper>
          {predictions.length > 0 && <Paper elevation={8}><List disablePadding>{predictions.map((item) => <ListItemButton key={item.placeId} onClick={() => void choosePrediction(item)}><ListItemText primary={item.primaryText} secondary={item.secondaryText} /></ListItemButton>)}</List></Paper>}
        </Stack>
      </Container>
      <Stack spacing={1} sx={{ left: 16, position: "absolute", top: 92 }}><IconButton aria-label="Back" onClick={() => router.back()} sx={{ bgcolor: "background.paper", boxShadow: 3 }}><ArrowBackRoundedIcon /></IconButton></Stack>
      <Stack spacing={1} sx={{ position: "absolute", right: 16, top: 92 }}><IconButton aria-label="Change map style" onClick={() => { const next = !satellite; setSatellite(next); map.current?.setMapTypeId(next ? "satellite" : "roadmap"); }} sx={{ bgcolor: "background.paper", boxShadow: 3 }}><LayersRoundedIcon /></IconButton><IconButton aria-label="Use current location" onClick={currentLocation} sx={{ bgcolor: "background.paper", boxShadow: 3 }}><MyLocationRoundedIcon /></IconButton></Stack>
      <Paper elevation={12} sx={{ borderRadius: "24px 24px 0 0", bottom: 0, left: 0, p: { xs: 2.5, sm: 3 }, position: "absolute", right: 0 }}>
        <Container maxWidth="sm"><Stack spacing={2}><Box><Typography variant="h6">{loadingAddress ? "Finding this address…" : selected?.name ?? "Choose your property location"}</Typography><Typography color="text.secondary">{selected?.formattedAddress ?? "Search above or move the map so the pin sits on your property."}</Typography></Box>{selected && <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}><Typography variant="body2">{[selected.ward, selected.district, selected.region, selected.country].filter(Boolean).join(" · ")}</Typography></Stack>}<Button fullWidth size="large" variant="contained" disabled={!selected || loadingAddress || controller.loading} onClick={() => void confirm()}>{controller.loading ? "Saving location…" : "Confirm location"}</Button></Stack></Container>
      </Paper>
      <Snackbar open={Boolean(mapError || controller.error)} autoHideDuration={6000} onClose={() => { setMapError(null); controller.clearError(); }}><Alert severity="error" variant="filled">{mapError || controller.error}</Alert></Snackbar>
    </Box>
  );
}
