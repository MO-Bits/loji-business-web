"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import MyLocationRoundedIcon from "@mui/icons-material/MyLocationRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { usePropertyController } from "@/features/property/hooks/use-property-controller";
import type {
  PlaceDetails,
  PlacePrediction,
  PropertyAddress,
} from "@/features/property/models/property";
import { createClient } from "@/lib/supabase/client";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { useAppSession } from "@/features/session/hooks/use-app-session";

type LatLng = { lat: number; lng: number };
type MapInstance = {
  getCenter(): { lat(): number; lng(): number } | null;
  panTo(position: LatLng): void;
  setZoom(zoom: number): void;
  setMapTypeId(type: string): void;
  addListener(event: string, callback: () => void): { remove(): void };
};
declare global {
  interface Window {
    google?: {
      maps: {
        Map: new (
          element: HTMLElement,
          options: Record<string, unknown>,
        ) => MapInstance;
      };
    };
  }
}

const DEFAULT_POSITION = { lat: -6.163, lng: 35.7516 };

function createSessionToken() {
  if (typeof globalThis.crypto?.randomUUID === "function")
    return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  return (
    Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join(
      "",
    ) || `${Date.now()}-${Math.random()}`
  );
}

type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

type AddressParts = {
  country: string;
  countryCode: string;
  region: string;
  district: string;
  ward: string;
  locality: string;
  street: string;
  premise: string;
};

const PLUS_CODE_PATTERN =
  /\\b[23456789CFGHJMPQRVWX]{4,8}\\+[23456789CFGHJMPQRVWX]{2,3}\\b/i;

function isPlusCode(value = "") {
  return PLUS_CODE_PATTERN.test(value);
}

function parseComponents(items: AddressComponent[] = []): AddressParts {
  const component = (...types: string[]) => {
    for (const type of types) {
      const match = items.find((item) => item.types?.includes(type));
      if (match) return match;
    }
    return undefined;
  };
  const text = (...types: string[]) => component(...types)?.longText ?? "";

  const country = component("country");
  const route = text("route");
  const streetNumber = text("street_number");

  return {
    country: country?.longText ?? "",
    countryCode: country?.shortText?.toUpperCase() ?? "",
    region: text("administrative_area_level_1"),
    district: text("administrative_area_level_2"),
    ward: text(
      "neighborhood",
      "sublocality_level_1",
      "sublocality",
      "administrative_area_level_3",
      "administrative_area_level_4",
    ),
    locality: text("locality", "postal_town"),
    street: [streetNumber, route].filter(Boolean).join(" "),
    premise: text("premise", "subpremise", "establishment", "point_of_interest"),
  };
}

function uniqueAddressParts(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const clean = value.trim();
    if (!clean || isPlusCode(clean)) return false;
    const key = clean.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function localAddress(parts: AddressParts, preferredName = "") {
  const name = isPlusCode(preferredName) ? "" : preferredName.trim();
  const primary =
    name ||
    parts.premise ||
    parts.street ||
    parts.ward ||
    parts.locality ||
    parts.district ||
    parts.region ||
    "Selected location";

  const city =
    parts.locality &&
    parts.locality.toLocaleLowerCase() !== primary.toLocaleLowerCase()
      ? parts.locality
      : parts.district;

  return uniqueAddressParts([
    primary,
    parts.street,
    parts.ward,
    city,
    parts.region,
    parts.countryCode || (parts.country === "Tanzania" ? "TZ" : parts.country),
  ]).join(", ");
}

function geocodeScore(result: Record<string, unknown>) {
  const formatted = String(result.formatted_address ?? "");
  const types = Array.isArray(result.types)
    ? result.types.map(String)
    : [];
  const components = (result.address_components ?? []) as Array<{
    long_name?: string;
    short_name?: string;
    types?: string[];
  }>;
  const parts = parseComponents(
    components.map((item) => ({
      longText: item.long_name,
      shortText: item.short_name,
      types: item.types,
    })),
  );

  let score = 0;
  if (types.includes("street_address")) score += 100;
  if (types.includes("premise")) score += 90;
  if (types.includes("route")) score += 75;
  if (types.includes("intersection")) score += 70;
  if (types.includes("neighborhood")) score += 65;
  if (types.some((type) => type.startsWith("sublocality"))) score += 60;
  if (types.includes("locality")) score += 30;
  if (parts.premise) score += 45;
  if (parts.street) score += 40;
  if (parts.ward) score += 35;
  if (parts.locality) score += 15;
  if (types.includes("plus_code") || isPlusCode(formatted)) score -= 200;
  if (types.includes("country") || types.includes("postal_code")) score -= 50;
  return score;
}

function detailsFromGoogle(data: Record<string, unknown>): PlaceDetails {
  const location = (data.location ?? {}) as {
    latitude?: number;
    longitude?: number;
  };
  const displayName = (data.displayName ?? {}) as { text?: string };
  const parts = parseComponents(
    (data.addressComponents ?? []) as AddressComponent[],
  );
  const name =
    !isPlusCode(displayName.text)
      ? displayName.text?.trim() || ""
      : "";

  return {
    name:
      name ||
      parts.premise ||
      parts.street ||
      parts.ward ||
      parts.locality ||
      "Selected location",
    placeId: String(data.id ?? ""),
    formattedAddress: localAddress(parts, name),
    country: parts.country,
    region: parts.region,
    district: parts.district || parts.locality,
    ward: parts.ward,
    street: parts.street || parts.premise,
    latitude: location.latitude ?? DEFAULT_POSITION.lat,
    longitude: location.longitude ?? DEFAULT_POSITION.lng,
  };
}

function distanceInMetres(a: LatLng, b: LatLng) {
  const earthRadius = 6_371_000;
  const radians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = radians(b.lat - a.lat);
  const longitudeDelta = radians(b.lng - a.lng);
  const latitudeA = radians(a.lat);
  const latitudeB = radians(b.lat);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeA) *
      Math.cos(latitudeB) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function detailsFromGeocode(
  data: Record<string, unknown>,
  position: LatLng,
): PlaceDetails | null {
  const results = Array.isArray(data.results)
    ? (data.results as Record<string, unknown>[])
    : [];
  const geocodeResult = [...results].sort(
    (a, b) => geocodeScore(b) - geocodeScore(a),
  )[0];

  const nearbyPlaces = Array.isArray(data.nearbyPlaces)
    ? (data.nearbyPlaces as Record<string, unknown>[])
    : [];

  const nearbyPlace = nearbyPlaces
    .map((place) => {
      const displayName = (place.displayName ?? {}) as { text?: string };
      const location = (place.location ?? {}) as {
        latitude?: number;
        longitude?: number;
      };
      const name = displayName.text?.trim() ?? "";
      const latitude = Number(location.latitude);
      const longitude = Number(location.longitude);
      if (
        !name ||
        isPlusCode(name) ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        return null;
      }
      return {
        place,
        name,
        distance: distanceInMetres(position, {
          lat: latitude,
          lng: longitude,
        }),
      };
    })
    .filter(
      (
        item,
      ): item is {
        place: Record<string, unknown>;
        name: string;
        distance: number;
      } => Boolean(item),
    )
    .filter((item) => item.distance <= 120)
    .sort((a, b) => a.distance - b.distance)[0];

  if (!geocodeResult && !nearbyPlace) return null;

  const geocodeComponents = (geocodeResult?.address_components ?? []) as Array<{
    long_name?: string;
    short_name?: string;
    types?: string[];
  }>;
  const geocodeParts = parseComponents(
    geocodeComponents.map((item) => ({
      longText: item.long_name,
      shortText: item.short_name,
      types: item.types,
    })),
  );

  const nearbyParts = parseComponents(
    (nearbyPlace?.place.addressComponents ?? []) as AddressComponent[],
  );

  const parts: AddressParts = {
    country: nearbyParts.country || geocodeParts.country,
    countryCode: nearbyParts.countryCode || geocodeParts.countryCode,
    region: nearbyParts.region || geocodeParts.region,
    district: nearbyParts.district || geocodeParts.district,
    ward: nearbyParts.ward || geocodeParts.ward,
    locality: nearbyParts.locality || geocodeParts.locality,
    street: nearbyParts.street || geocodeParts.street,
    premise: nearbyParts.premise || geocodeParts.premise,
  };

  const googlePlaceName = nearbyPlace?.name ?? "";
  const fallbackName =
    parts.premise ||
    parts.street ||
    parts.ward ||
    parts.locality ||
    parts.district ||
    parts.region ||
    "Selected location";
  const name = googlePlaceName || fallbackName;

  return {
    name,
    placeId: String(
      nearbyPlace?.place.id ?? geocodeResult?.place_id ?? "",
    ),
    formattedAddress: localAddress(parts, name),
    country: parts.country,
    region: parts.region,
    district: parts.district || parts.locality,
    ward: parts.ward,
    street:
      nearbyParts.street ||
      googlePlaceName ||
      geocodeParts.street ||
      parts.premise,
    latitude: position.lat,
    longitude: position.lng,
  };
}

export function PropertyAddressMap() {
  const router = useRouter();
  const feedback = useAppFeedback();
  const { t } = useLanguage();
  const { session } = useAppSession();
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

  const reverseGeocode = useCallback(async (next: LatLng) => {
    setLoadingAddress(true);
    try {
      const response = await fetch(
        `/api/google/geocode?lat=${next.lat}&lng=${next.lng}`,
      );
      const data = (await response.json()) as Record<string, unknown>;
      if (!response.ok)
        throw new Error(
          String(
            data.error ??
              t(
                "Unable to load this address.",
                "Imeshindikana kupata anwani hii.",
              ),
          ),
        );
      setSelected(detailsFromGeocode(data, next));
    } catch (cause) {
      setMapError(
        cause instanceof Error
          ? cause.message
          : t(
              "Unable to load this address.",
              "Imeshindikana kupata anwani hii.",
            ),
      );
    } finally {
      setLoadingAddress(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    let idleListener: { remove(): void } | null = null;
    let loadingScript: HTMLScriptElement | null = null;

    const start = () => {
      if (cancelled || !mapElement.current || !window.google || map.current)
        return;
      map.current = new window.google.maps.Map(mapElement.current, {
        center: DEFAULT_POSITION,
        zoom: 14.5,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: false,
      });
      idleListener = map.current.addListener("idle", () => {
        const center = map.current?.getCenter();
        if (!center) return;
        const next = { lat: center.lat(), lng: center.lng() };
        setPosition(next);
        if (idleTimer.current) clearTimeout(idleTimer.current);
        idleTimer.current = setTimeout(() => void reverseGeocode(next), 700);
      });
    };

    const loadMap = async () => {
      try {
        if (window.google) return start();

        const response = await fetch("/api/google/maps-config", {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          key?: string;
          error?: string;
        };
        if (!response.ok || !data.key) {
          throw new Error(data.error ?? "Google Maps is not configured.");
        }

        const existing = document.querySelector<HTMLScriptElement>(
          "script[data-loji-google-maps]",
        );
        if (existing) {
          loadingScript = existing;
          existing.addEventListener("load", start, { once: true });
          return;
        }

        const script = document.createElement("script");
        script.dataset.lojiGoogleMaps = "true";
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(data.key)}&v=weekly`;
        script.async = true;
        script.onload = start;
        script.onerror = () =>
          setMapError(
            "Google Maps could not be loaded. Check the API key website restrictions.",
          );
        document.head.appendChild(script);
      } catch (cause) {
        if (!cancelled)
          setMapError(
            cause instanceof Error
              ? cause.message
              : "Google Maps could not be loaded.",
          );
      }
    };

    void loadMap();

    return () => {
      cancelled = true;
      idleListener?.remove();
      loadingScript?.removeEventListener("load", start);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      map.current = null;
    };
  }, [reverseGeocode]);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch("/api/google/places/autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: query,
            latitude: position.lat,
            longitude: position.lng,
            sessionToken,
          }),
        });
        const data = (await response.json()) as {
          suggestions?: Array<{
            placePrediction?: {
              placeId?: string;
              text?: { text?: string };
              structuredFormat?: {
                mainText?: { text?: string };
                secondaryText?: { text?: string };
              };
            };
          }>;
          error?: string;
        };
        if (!response.ok)
          throw new Error(data.error ?? "Search is unavailable.");
        setPredictions(
          (data.suggestions ?? [])
            .map(({ placePrediction: item }) => ({
              placeId: item?.placeId ?? "",
              text: item?.text?.text ?? "",
              primaryText:
                item?.structuredFormat?.mainText?.text ??
                item?.text?.text ??
                "",
              secondaryText: item?.structuredFormat?.secondaryText?.text ?? "",
            }))
            .filter(
              (item) => item.placeId && !isPlusCode(item.primaryText),
            ),
        );
      } catch (cause) {
        setMapError(
          cause instanceof Error ? cause.message : "Search is unavailable.",
        );
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, position.lat, position.lng, sessionToken]);

  const choosePrediction = async (prediction: PlacePrediction) => {
    setQuery(prediction.text);
    setPredictions([]);
    setLoadingAddress(true);
    try {
      const response = await fetch(
        `/api/google/places/details?placeId=${encodeURIComponent(prediction.placeId)}&sessionToken=${encodeURIComponent(sessionToken)}`,
      );
      const data = (await response.json()) as Record<string, unknown>;
      if (!response.ok)
        throw new Error(String(data.error ?? "Unable to select this place."));
      const details = detailsFromGoogle(data);
      setSelected(details);
      setPosition({ lat: details.latitude, lng: details.longitude });
      map.current?.panTo({ lat: details.latitude, lng: details.longitude });
      map.current?.setZoom(17);
      setSessionToken(createSessionToken());
    } catch (cause) {
      setMapError(
        cause instanceof Error ? cause.message : "Unable to select this place.",
      );
    } finally {
      setLoadingAddress(false);
    }
  };

  const currentLocation = () => {
    if (!navigator.geolocation)
      return setMapError(
        t(
          "Location is not supported by this browser.",
          "Kivinjari hiki hakitumii huduma ya eneo.",
        ),
      );
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const next = { lat: coords.latitude, lng: coords.longitude };
        setPosition(next);
        map.current?.panTo(next);
        map.current?.setZoom(17);
      },
      (error) => setMapError(error.message),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const confirm = async () => {
    if (!selected)
      return setMapError(
        t("Please select a location.", "Tafadhali chagua eneo."),
      );
    const {
      data: { user },
    } = await createClient().auth.getUser();
    if (!user)
      return setMapError(
        t("Your session has expired.", "Muda wa akaunti yako umeisha."),
      );
    try {
      await controller.saveAddress(
        user.id,
        session?.activePropertyId,
        selected as PropertyAddress,
      );
      feedback.success(
        t("Property location saved.", "Eneo la biashara limehifadhiwa."),
      );
      router.replace("/");
    } catch {
      /* displayed below */
    }
  };

  return (
    <Box
      component="main"
      sx={{ height: "100dvh", overflow: "hidden", position: "relative" }}
    >
      <Box
        ref={mapElement}
        sx={{ bgcolor: "action.hover", height: "100%", width: "100%" }}
      />
      <LocationOnRoundedIcon
        color="error"
        sx={{
          filter: "drop-shadow(0 5px 8px rgba(0,0,0,.22))",
          fontSize: { xs: 50, sm: 56 },
          left: "50%",
          pointerEvents: "none",
          position: "absolute",
          top: { xs: "44%", md: "50%" },
          transform: "translate(-50%, -100%)",
        }}
      />

      <IconButton
        aria-label={t("Go back", "Rudi")}
        onClick={() => router.back()}
        sx={{
          bgcolor: "background.paper",
          boxShadow: 3,
          left: { xs: 12, sm: 20 },
          position: "absolute",
          top: { xs: 12, sm: 20 },
          "&:hover": { bgcolor: "background.paper" },
        }}
      >
        <ArrowBackRoundedIcon />
      </IconButton>

      <Stack
        direction="row"
        spacing={1}
        sx={{
          position: "absolute",
          right: { xs: 12, sm: 20 },
          top: { xs: 12, sm: 20 },
        }}
      >
        <IconButton
          aria-label={t("Change map style", "Badili aina ya ramani")}
          onClick={() => {
            const next = !satellite;
            setSatellite(next);
            map.current?.setMapTypeId(next ? "satellite" : "roadmap");
          }}
          sx={{
            bgcolor: "background.paper",
            boxShadow: 3,
            "&:hover": { bgcolor: "background.paper" },
          }}
        >
          <LayersRoundedIcon />
        </IconButton>
        <IconButton
          aria-label={t("Use current location", "Tumia eneo la sasa")}
          onClick={currentLocation}
          sx={{
            bgcolor: "background.paper",
            boxShadow: 3,
            "&:hover": { bgcolor: "background.paper" },
          }}
        >
          <MyLocationRoundedIcon />
        </IconButton>
      </Stack>

      <Box
        sx={{
          left: "50%",
          maxWidth: 560,
          px: { xs: 1.5, sm: 2.5 },
          position: "absolute",
          top: { xs: 70, sm: 20 },
          transform: "translateX(-50%)",
          width: "100%",
        }}
      >
        <Stack spacing={1}>
          <Paper elevation={4}>
            <TextField
              aria-label={t("Search property location", "Tafuta eneo la biashara")}
              fullWidth
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value.trim().length < 2) setPredictions([]);
              }}
              placeholder={t(
                "Search for your property or area",
                "Tafuta biashara au eneo lako",
              )}
              size="small"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: searching ? (
                    <CircularProgress size={20} />
                  ) : null,
                },
              }}
              value={query}
            />
          </Paper>
          {predictions.length > 0 ? (
            <Paper elevation={8} sx={{ maxHeight: 280, overflowY: "auto" }}>
              <List aria-label={t("Location suggestions", "Mapendekezo ya maeneo")} disablePadding>
                {predictions.map((item) => (
                  <ListItemButton
                    key={item.placeId}
                    onClick={() => void choosePrediction(item)}
                    sx={{ px: 2, py: 1.25 }}
                  >
                    <ListItemText
                      primary={item.primaryText}
                      secondary={item.secondaryText}
                      slotProps={{
                        primary: { sx: { fontSize: ".875rem", fontWeight: 500 } },
                        secondary: { sx: { fontSize: ".75rem", mt: 0.25 } },
                      }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          ) : null}
        </Stack>
      </Box>

      <Paper
        elevation={12}
        sx={{
          borderRadius: { xs: "20px 20px 0 0", md: 3 },
          bottom: { xs: 0, md: 24 },
          left: { xs: 0, md: 24 },
          maxHeight: { xs: "42dvh", md: "calc(100dvh - 48px)" },
          overflowY: "auto",
          p: { xs: 2.5, sm: 3 },
          position: "absolute",
          right: { xs: 0, md: "auto" },
          width: { xs: "100%", md: 410 },
        }}
      >
        <Stack aria-live="polite" spacing={2}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
            <Box
              sx={{
                bgcolor:
                  "color-mix(in srgb, var(--mui-palette-primary-main) 11%, transparent)",
                borderRadius: 2,
                color: "primary.main",
                display: "grid",
                flexShrink: 0,
                height: 42,
                placeItems: "center",
                width: 42,
              }}
            >
              {loadingAddress ? (
                <CircularProgress size={20} />
              ) : (
                <LocationOnRoundedIcon fontSize="small" />
              )}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography component="h1" variant="h4">
                {loadingAddress
                  ? t("Finding this address…", "Inatafuta anwani hii…")
                  : selected?.name ??
                    t(
                      "Choose the property location",
                      "Chagua eneo la biashara",
                    )}
              </Typography>
              <Typography color="text.secondary" sx={{ lineHeight: 1.6, mt: 0.5 }} variant="body2">
                {selected?.formattedAddress ??
                  t(
                    "Search above or move the map until the pin sits on your property entrance.",
                    "Tafuta hapo juu au sogeza ramani hadi pini iwe kwenye mlango wa biashara yako.",
                  )}
              </Typography>
            </Box>
          </Stack>

          {selected ? (
            <Typography color="text.secondary" variant="caption">
              {[selected.ward, selected.district, selected.region, selected.country]
                .filter(Boolean)
                .join(" · ")}
            </Typography>
          ) : null}

          <Button
            disabled={!selected || loadingAddress || controller.loading}
            fullWidth
            onClick={() => void confirm()}
            size="large"
            variant="contained"
          >
            {controller.loading
              ? t("Saving location…", "Inahifadhi eneo…")
              : t("Confirm location", "Thibitisha eneo")}
          </Button>
        </Stack>
      </Paper>

      <Snackbar
        anchorOrigin={{ horizontal: "center", vertical: "top" }}
        open={Boolean(mapError || controller.error)}
        autoHideDuration={6000}
        onClose={() => {
          setMapError(null);
          controller.clearError();
        }}
        sx={{ top: { xs: 132, sm: 84 } }}
      >
        <Alert severity="error" variant="filled">
          {mapError || controller.error}
        </Alert>
      </Snackbar>
    </Box>
  );
}
