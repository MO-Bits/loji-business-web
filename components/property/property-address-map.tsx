"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
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
  LinearProgress,
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
import { clearPropertyRegistrationDraft } from "@/features/property/services/property-service";
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
const TANZANIA_BOUNDS = {
  north: -0.75,
  south: -11.75,
  east: 40.75,
  west: 28.75,
};
const TANZANIA_REGIONS = [
  "Arusha", "Dar es Salaam", "Dodoma", "Geita", "Iringa", "Kagera",
  "Katavi", "Kigoma", "Kilimanjaro", "Lindi", "Manyara", "Mara",
  "Mbeya", "Morogoro", "Mtwara", "Mwanza", "Njombe",
  "Pemba Kaskazini", "Pemba Kusini", "Pwani", "Rukwa", "Ruvuma",
  "Shinyanga", "Simiyu", "Singida", "Songwe", "Tabora", "Tanga",
  "Unguja Kaskazini", "Unguja Kusini", "Mjini Magharibi",
] as const;

type AddressStage = "map" | "administrative" | "directions" | "review";
const ADDRESS_STAGES: AddressStage[] = [
  "map",
  "administrative",
  "directions",
  "review",
];

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
  /\b[23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,3}\b/gi;

function withoutPlusCodes(value = "") {
  PLUS_CODE_PATTERN.lastIndex = 0;
  return value
    .replace(PLUS_CODE_PATTERN, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s*[,·-]\s*|\s*[,·-]\s*$/g, "")
    .trim();
}

function isPlusCode(value = "") {
  return Boolean(value.trim()) && !withoutPlusCodes(value);
}

function isInTanzania(position: LatLng) {
  return (
    position.lat >= TANZANIA_BOUNDS.south &&
    position.lat <= TANZANIA_BOUNDS.north &&
    position.lng >= TANZANIA_BOUNDS.west &&
    position.lng <= TANZANIA_BOUNDS.east
  );
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

function rebuildAddress(address: PlaceDetails): PlaceDetails {
  const street = withoutPlusCodes(address.street);
  const ward = withoutPlusCodes(address.ward);
  const district = withoutPlusCodes(address.district);
  const region = withoutPlusCodes(address.region);
  const countryInput = withoutPlusCodes(address.country);
  const country =
    /^(tz|tanzania|united republic of tanzania)$/i.test(countryInput)
      ? "Tanzania"
      : countryInput ||
        (isInTanzania({ lat: address.latitude, lng: address.longitude })
          ? "Tanzania"
          : "");
  const formattedAddress =
    uniqueAddressParts([street, ward, district, region, country]).join(", ") ||
    withoutPlusCodes(address.formattedAddress);

  return {
    ...address,
    country,
    district,
    formattedAddress,
    region,
    street,
    ward,
  };
}

function isTanzaniaAddress(address: PlaceDetails) {
  return (
    /^(tz|tanzania|united republic of tanzania)$/i.test(address.country.trim()) &&
    isInTanzania({ lat: address.latitude, lng: address.longitude })
  );
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

function detailsFromGoogle(
  data: Record<string, unknown>,
): PlaceDetails | null {
  const location = (data.location ?? {}) as {
    latitude?: number;
    longitude?: number;
  };
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const displayName = (data.displayName ?? {}) as { text?: string };
  const parts = parseComponents(
    (data.addressComponents ?? []) as AddressComponent[],
  );
  const name = withoutPlusCodes(displayName.text);

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
    country: parts.country || "Tanzania",
    region: parts.region,
    district: parts.district || parts.locality,
    ward: withoutPlusCodes(parts.ward),
    street: withoutPlusCodes(parts.street || parts.premise || name),
    latitude,
    longitude,
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
  const { session, refresh } = useAppSession();
  const mapElement = useRef<HTMLDivElement>(null);
  const map = useRef<MapInstance | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reverseRequest = useRef<AbortController | null>(null);
  const reverseGeneration = useRef(0);
  const skipNextIdle = useRef(true);
  const [stage, setStage] = useState<AddressStage>("map");
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
    const generation = reverseGeneration.current + 1;
    reverseGeneration.current = generation;
    reverseRequest.current?.abort();
    const request = new AbortController();
    reverseRequest.current = request;
    setLoadingAddress(true);
    setMapError(null);
    try {
      const response = await fetch(
        `/api/google/geocode?lat=${next.lat}&lng=${next.lng}`,
        { signal: request.signal },
      );
      const data = (await response.json()) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(
          String(
            data.error ??
              t(
                "Unable to load this address.",
                "Imeshindikana kupata anwani hii.",
              ),
          ),
        );
      }
      const details = detailsFromGeocode(data, next);
      if (!details) {
        throw new Error(
          t(
            "We could not identify this place. Search for a nearby landmark or move the pin.",
            "Hatukutambua eneo hili. Tafuta alama ya karibu au sogeza pini.",
          ),
        );
      }
      if (generation === reverseGeneration.current) {
        setSelected(rebuildAddress(details));
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      if (generation === reverseGeneration.current) {
        setSelected(null);
        setMapError(
          cause instanceof Error
            ? cause.message
            : t(
                "Unable to load this address.",
                "Imeshindikana kupata anwani hii.",
              ),
        );
      }
    } finally {
      if (generation === reverseGeneration.current) setLoadingAddress(false);
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
        restriction: {
          latLngBounds: TANZANIA_BOUNDS,
          strictBounds: false,
        },
      });
      idleListener = map.current.addListener("idle", () => {
        const center = map.current?.getCenter();
        if (!center) return;
        const next = { lat: center.lat(), lng: center.lng() };
        setPosition(next);
        if (skipNextIdle.current) {
          skipNextIdle.current = false;
          return;
        }
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
      reverseRequest.current?.abort();
      map.current = null;
    };
  }, [reverseGeocode]);

  useEffect(() => {
    if (stage !== "map" || query.trim().length < 2) return;
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
          cause instanceof Error ? cause.message : t("Search is unavailable.", "Utafutaji haupatikani."),
        );
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [position.lat, position.lng, query, sessionToken, stage, t]);

  const choosePrediction = async (prediction: PlacePrediction) => {
    setQuery(prediction.text);
    setPredictions([]);
    setLoadingAddress(true);
    setMapError(null);
    reverseGeneration.current += 1;
    reverseRequest.current?.abort();
    try {
      const response = await fetch(
        `/api/google/places/details?placeId=${encodeURIComponent(prediction.placeId)}&sessionToken=${encodeURIComponent(sessionToken)}`,
      );
      const data = (await response.json()) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(
          String(
            data.error ??
              t(
                "Unable to select this place.",
                "Imeshindikana kuchagua eneo hili.",
              ),
          ),
        );
      }
      const details = detailsFromGoogle(data);
      if (!details) {
        throw new Error(
          t(
            "This result has no map position. Choose another result.",
            "Eneo hili halina pini ya ramani. Chagua eneo lingine.",
          ),
        );
      }
      const normalized = rebuildAddress(details);
      setSelected(normalized);
      setPosition({ lat: normalized.latitude, lng: normalized.longitude });
      skipNextIdle.current = true;
      map.current?.panTo({
        lat: normalized.latitude,
        lng: normalized.longitude,
      });
      map.current?.setZoom(17);
      setSessionToken(createSessionToken());
    } catch (cause) {
      setMapError(
        cause instanceof Error
          ? cause.message
          : t(
              "Unable to select this place.",
              "Imeshindikana kuchagua eneo hili.",
            ),
      );
    } finally {
      setLoadingAddress(false);
    }
  };

  const currentLocation = () => {
    if (!navigator.geolocation) {
      setMapError(
        t(
          "Location is not supported by this browser.",
          "Kivinjari hiki hakitumii huduma ya eneo.",
        ),
      );
      return;
    }
    setLoadingAddress(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const next = { lat: coords.latitude, lng: coords.longitude };
        setPosition(next);
        skipNextIdle.current = true;
        map.current?.panTo(next);
        map.current?.setZoom(17);
        void reverseGeocode(next);
      },
      (error) => {
        setLoadingAddress(false);
        setMapError(
          error.code === error.PERMISSION_DENIED
            ? t(
                "Location permission was denied. Search for your area instead.",
                "Ruhusa ya eneo imekataliwa. Tafuta eneo lako badala yake.",
              )
            : error.message,
        );
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const updateAddressField = (
    field: "region" | "district" | "ward" | "street",
    value: string,
  ) => {
    setSelected((current) =>
      current
        ? rebuildAddress({ ...current, [field]: value.slice(0, 200) })
        : current,
    );
    setMapError(null);
  };

  const stageIndex = ADDRESS_STAGES.indexOf(stage);
  const normalizedAddress = selected ? rebuildAddress(selected) : null;

  const goBack = () => {
    setMapError(null);
    controller.clearError();
    if (stageIndex > 0) {
      setStage(ADDRESS_STAGES[stageIndex - 1]);
      return;
    }
    router.push("/onboarding/property/basic");
  };

  const continueLocation = () => {
    setMapError(null);
    if (stage === "map") {
      if (!normalizedAddress) {
        setMapError(
          t(
            "Search for the property or move the pin to its entrance.",
            "Tafuta biashara au sogeza pini hadi kwenye mlango wake.",
          ),
        );
        return;
      }
      if (!isTanzaniaAddress(normalizedAddress)) {
        setMapError(
          t(
            "Choose a location inside Tanzania.",
            "Chagua eneo lililo ndani ya Tanzania.",
          ),
        );
        return;
      }
    }
    if (stage === "administrative") {
      if (!normalizedAddress?.region.trim()) {
        setMapError(t("Select the region.", "Chagua Mkoa."));
        return;
      }
      if (!normalizedAddress.district.trim()) {
        setMapError(
          t(
            "Add the district, city or municipality.",
            "Weka Wilaya, Jiji au Manispaa.",
          ),
        );
        return;
      }
    }
    if (
      stage === "directions" &&
      (!normalizedAddress ||
        withoutPlusCodes(normalizedAddress.street).length < 2)
    ) {
      setMapError(
        t(
          "Add a street, village or nearby landmark people can recognise.",
          "Weka mtaa, kijiji au alama ya karibu ambayo watu wataitambua.",
        ),
      );
      return;
    }
    if (stageIndex < ADDRESS_STAGES.length - 1) {
      setStage(ADDRESS_STAGES[stageIndex + 1]);
    }
  };

  const confirm = async () => {
    if (!normalizedAddress) {
      setMapError(t("Please select a location.", "Tafadhali chagua eneo."));
      return;
    }
    const {
      data: { user },
    } = await createClient().auth.getUser();
    if (!user) {
      setMapError(
        t("Your session has expired.", "Muda wa akaunti yako umeisha."),
      );
      return;
    }
    try {
      await controller.saveAddress(
        user.id,
        session?.activePropertyId,
        normalizedAddress as PropertyAddress,
      );
      clearPropertyRegistrationDraft(user.id);
      await refresh();
      feedback.success(
        t(
          "Your Loji workspace is ready.",
          "Mfumo wako wa Loji uko tayari.",
        ),
      );
      router.replace("/");
    } catch {
      /* The controller exposes a translated retry-safe error below. */
    }
  };

  return (
    <Box component="main" sx={{ height: "100dvh", overflow: "hidden", position: "relative" }}>
      <Box
        ref={mapElement}
        sx={{
          bgcolor: "action.hover",
          filter: stage === "map" ? "none" : "saturate(.65)",
          height: "100%",
          pointerEvents: stage === "map" ? "auto" : "none",
          width: "100%",
        }}
      />

      {stage === "map" ? (
        <LocationOnRoundedIcon
          color="error"
          sx={{
            filter: "drop-shadow(0 5px 8px rgba(0,0,0,.22))",
            fontSize: { xs: 50, sm: 56 },
            left: "50%",
            pointerEvents: "none",
            position: "absolute",
            top: { xs: "42%", md: "50%" },
            transform: "translate(-50%, -100%)",
          }}
        />
      ) : null}

      <IconButton
        aria-label={t("Go back", "Rudi")}
        onClick={goBack}
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

      {stage === "map" ? (
        <>
          <Stack
            direction="row"
            spacing={1}
            sx={{ position: "absolute", right: { xs: 12, sm: 20 }, top: { xs: 12, sm: 20 } }}
          >
            <IconButton
              aria-label={t("Change map style", "Badili aina ya ramani")}
              onClick={() => {
                const next = !satellite;
                setSatellite(next);
                map.current?.setMapTypeId(next ? "satellite" : "roadmap");
              }}
              sx={{ bgcolor: "background.paper", boxShadow: 3, "&:hover": { bgcolor: "background.paper" } }}
            >
              <LayersRoundedIcon />
            </IconButton>
            <IconButton
              aria-label={t("Use current location", "Tumia eneo la sasa")}
              onClick={currentLocation}
              sx={{ bgcolor: "background.paper", boxShadow: 3, "&:hover": { bgcolor: "background.paper" } }}
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
                  onChange={(event) => {
                    setQuery(event.target.value);
                    if (event.target.value.trim().length < 2) setPredictions([]);
                  }}
                  placeholder={t(
                    "Search a property, street or nearby landmark",
                    "Tafuta biashara, mtaa au alama ya karibu",
                  )}
                  size="small"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchRoundedIcon color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: searching ? <CircularProgress size={20} /> : null,
                    },
                  }}
                  value={query}
                />
              </Paper>
              {predictions.length ? (
                <Paper elevation={8} sx={{ maxHeight: 280, overflowY: "auto" }}>
                  <List aria-label={t("Location suggestions", "Mapendekezo ya maeneo")} disablePadding>
                    {predictions.map((item) => (
                      <ListItemButton
                        key={item.placeId}
                        onClick={() => void choosePrediction(item)}
                        sx={{ px: 2, py: 1.25 }}
                      >
                        <ListItemText primary={item.primaryText} secondary={item.secondaryText} />
                      </ListItemButton>
                    ))}
                  </List>
                </Paper>
              ) : null}
            </Stack>
          </Box>
        </>
      ) : null}

      <Paper
        elevation={12}
        sx={{
          borderRadius: { xs: "22px 22px 0 0", md: 3 },
          bottom: { xs: 0, md: 24 },
          left: { xs: 0, md: 24 },
          maxHeight: { xs: "56dvh", md: "calc(100dvh - 48px)" },
          overflowY: "auto",
          p: { xs: 2.5, sm: 3 },
          pb: { xs: "max(20px, env(safe-area-inset-bottom))", sm: 3 },
          position: "absolute",
          right: { xs: 0, md: "auto" },
          width: { xs: "100%", md: 440 },
        }}
      >
        <Stack aria-live="polite" spacing={2.25}>
          <Stack spacing={0.75}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Typography color="primary.main" sx={{ fontWeight: 700 }} variant="caption">
                {t("Location setup", "Usanidi wa eneo")} {stageIndex + 1}/4
              </Typography>
              {loadingAddress ? <CircularProgress size={18} /> : null}
            </Stack>
            <LinearProgress
              aria-label={t("Location setup progress", "Maendeleo ya usanidi wa eneo")}
              value={((stageIndex + 1) / ADDRESS_STAGES.length) * 100}
              variant="determinate"
              sx={{ borderRadius: 99, height: 6 }}
            />
          </Stack>

          <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
            <Box
              sx={{
                bgcolor: "color-mix(in srgb, var(--mui-palette-primary-main) 11%, transparent)",
                borderRadius: 2,
                color: "primary.main",
                display: "grid",
                flexShrink: 0,
                height: 42,
                placeItems: "center",
                width: 42,
              }}
            >
              {stage === "review" ? (
                <CheckCircleRoundedIcon fontSize="small" />
              ) : (
                <LocationOnRoundedIcon fontSize="small" />
              )}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography component="h1" variant="h4">
                {stage === "map"
                  ? t("Where do guests arrive?", "Wageni wanafika wapi?")
                  : stage === "administrative"
                    ? t("Confirm the administrative area", "Thibitisha eneo la kiutawala")
                    : stage === "directions"
                      ? t("How would a local person find it?", "Mtu wa eneo hili ataipataje?")
                      : t("Review the property location", "Kagua eneo la biashara")}
              </Typography>
              <Typography color="text.secondary" sx={{ lineHeight: 1.6, mt: 0.5 }} variant="body2">
                {stage === "map"
                  ? t(
                      "Search or place the pin at the entrance guests use.",
                      "Tafuta au weka pini kwenye mlango unaotumiwa na wageni.",
                    )
                  : stage === "administrative"
                    ? t(
                        "Google does not always return complete Tanzanian addresses. Correct these details if needed.",
                        "Google haitoi anwani kamili kila mara Tanzania. Sahihisha taarifa hizi ikihitajika.",
                      )
                    : stage === "directions"
                      ? t(
                          "Use the words people nearby actually use. A landmark is fine when there is no street name.",
                          "Tumia maelezo yanayotumiwa na watu wa eneo hilo. Alama ya karibu inatosha kama hakuna jina la mtaa.",
                        )
                      : t(
                          "Make sure staff or a driver can identify the place.",
                          "Hakikisha mfanyakazi au dereva anaweza kulitambua eneo.",
                        )}
              </Typography>
            </Box>
          </Stack>

          {stage === "map" ? (
            <AddressCard
              title={normalizedAddress?.name ?? t("No location selected yet", "Bado hujachagua eneo")}
              value={
                normalizedAddress?.formattedAddress ??
                t(
                  "Search above, use your current location, or move the map.",
                  "Tafuta hapo juu, tumia eneo la sasa, au sogeza ramani.",
                )
              }
            />
          ) : null}

          {stage === "administrative" && normalizedAddress ? (
            <Stack spacing={2}>
              <TextField
                autoComplete="address-level1"
                autoFocus
                fullWidth
                helperText={t(
                  "For example: Dar es Salaam, Arusha or Mjini Magharibi.",
                  "Mfano: Dar es Salaam, Arusha au Mjini Magharibi.",
                )}
                label={t("Region", "Mkoa")}
                onChange={(event) => updateAddressField("region", event.target.value)}
                required
                slotProps={{ htmlInput: { list: "tanzania-region-options", maxLength: 120 } }}
                value={normalizedAddress.region}
              />
              <datalist id="tanzania-region-options">
                {TANZANIA_REGIONS.map((region) => (
                  <option key={region} value={region} />
                ))}
              </datalist>
              <TextField
                autoComplete="address-level2"
                fullWidth
                helperText={t(
                  "Use the district, city, town or municipality shown locally.",
                  "Tumia Wilaya, Jiji, Mji au Manispaa inayotambulika eneo hilo.",
                )}
                label={t("District, city or municipality", "Wilaya, Jiji au Manispaa")}
                onChange={(event) => updateAddressField("district", event.target.value)}
                required
                slotProps={{ htmlInput: { maxLength: 120 } }}
                value={normalizedAddress.district}
              />
            </Stack>
          ) : null}

          {stage === "directions" && normalizedAddress ? (
            <Stack spacing={2}>
              <TextField
                autoFocus
                fullWidth
                helperText={t(
                  "Optional. In Zanzibar, enter the Shehia here.",
                  "Si lazima. Zanzibar, weka Shehia hapa.",
                )}
                label={t("Ward or Shehia", "Kata au Shehia")}
                onChange={(event) => updateAddressField("ward", event.target.value)}
                slotProps={{ htmlInput: { maxLength: 120 } }}
                value={normalizedAddress.ward}
              />
              <TextField
                fullWidth
                helperText={t(
                  "Street, village, building or a well-known nearby landmark.",
                  "Mtaa, kijiji, jengo au alama inayojulikana karibu.",
                )}
                label={t("Street, village or landmark", "Mtaa, kijiji au alama ya karibu")}
                onChange={(event) => updateAddressField("street", event.target.value)}
                required
                slotProps={{ htmlInput: { maxLength: 200 } }}
                value={normalizedAddress.street}
              />
            </Stack>
          ) : null}

          {stage === "review" && normalizedAddress ? (
            <Stack
              spacing={1.25}
              sx={{
                bgcolor: "action.hover",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2.5,
                p: 2,
              }}
            >
              <ReviewRow label={t("Map location", "Eneo la ramani")} value={normalizedAddress.formattedAddress} />
              <ReviewRow label={t("Region", "Mkoa")} value={normalizedAddress.region} />
              <ReviewRow
                label={t("District or municipality", "Wilaya au Manispaa")}
                value={normalizedAddress.district}
              />
              <ReviewRow
                label={t("Ward or Shehia", "Kata au Shehia")}
                value={normalizedAddress.ward || t("Not provided", "Haijawekwa")}
              />
              <ReviewRow
                label={t("Street, village or landmark", "Mtaa, kijiji au alama")}
                value={normalizedAddress.street}
              />
            </Stack>
          ) : null}

          <Stack direction="row" spacing={1.25}>
            {stageIndex > 0 ? (
              <Button
                disabled={controller.loading}
                fullWidth
                onClick={goBack}
                startIcon={<ArrowBackRoundedIcon />}
                variant="outlined"
              >
                {t("Back", "Rudi")}
              </Button>
            ) : null}
            <Button
              disabled={loadingAddress || controller.loading || (stage === "map" && !normalizedAddress)}
              endIcon={stage === "review" ? <CheckCircleRoundedIcon /> : <ArrowForwardRoundedIcon />}
              fullWidth
              onClick={() => (stage === "review" ? void confirm() : continueLocation())}
              variant="contained"
            >
              {controller.loading
                ? t("Finishing…", "Inakamilisha…")
                : stage === "review"
                  ? t("Finish and open Loji", "Maliza na fungua Loji")
                  : t("Continue", "Endelea")}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Snackbar
        anchorOrigin={{ horizontal: "center", vertical: "top" }}
        open={Boolean(mapError || controller.error)}
        autoHideDuration={6500}
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

function AddressCard({ title, value }: { title: string; value: string }) {
  return (
    <Box sx={{ bgcolor: "action.hover", border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.75 }}>
      <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
      <Typography color="text.secondary" sx={{ mt: 0.4 }} variant="body2">
        {value}
      </Typography>
    </Box>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography color="text.secondary" variant="caption">{label}</Typography>
      <Typography sx={{ fontWeight: 650, mt: 0.2 }} variant="body2">{value}</Typography>
    </Box>
  );
}
