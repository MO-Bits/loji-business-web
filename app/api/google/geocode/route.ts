import { NextResponse } from "next/server";

import {
  rateLimit,
  rateLimitHeaders,
  requestIdentity,
} from "@/lib/server/rate-limit";

export async function GET(request: Request) {
  const limit = rateLimit(`google:${requestIdentity(request)}`, {
    limit: 40,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error:
          "Too many location requests. Please wait a moment and try again.",
      },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders(limit),
          "Retry-After": String(
            Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000)),
          ),
        },
      },
    );
  }

  const key = process.env.GOOGLE_PLACES_API_KEY;
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("lat"));
  const longitude = Number(url.searchParams.get("lng"));

  if (!key) {
    return NextResponse.json(
      { error: "Google Places is not configured." },
      { status: 503 },
    );
  }

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return NextResponse.json(
      { error: "Valid coordinates are required." },
      { status: 400 },
    );
  }

  const geocodeEndpoint = new URL(
    "https://maps.googleapis.com/maps/api/geocode/json",
  );
  geocodeEndpoint.searchParams.set("latlng", `${latitude},${longitude}`);
  geocodeEndpoint.searchParams.set("key", key);
  geocodeEndpoint.searchParams.set("language", "en");
  geocodeEndpoint.searchParams.set("region", "tz");

  const nearbyRequest = fetch(
    "https://places.googleapis.com/v1/places:searchNearby",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": [
          "places.id",
          "places.displayName",
          "places.formattedAddress",
          "places.shortFormattedAddress",
          "places.addressComponents",
          "places.location",
          "places.primaryType",
          "places.types",
        ].join(","),
      },
      body: JSON.stringify({
        languageCode: "en",
        regionCode: "TZ",
        maxResultCount: 5,
        rankPreference: "DISTANCE",
        locationRestriction: {
          circle: {
            center: { latitude, longitude },
            radius: 120,
          },
        },
      }),
      cache: "no-store",
    },
  );

  const [geocodeResponse, nearbyResult] = await Promise.all([
    fetch(geocodeEndpoint, { cache: "no-store" }),
    nearbyRequest.then(
      async (response) =>
        response.ok
          ? ((await response.json()) as { places?: unknown[] })
          : { places: [] },
      () => ({ places: [] }),
    ),
  ]);

  const geocodeData = (await geocodeResponse.json()) as Record<
    string,
    unknown
  >;

  return NextResponse.json(
    {
      ...geocodeData,
      nearbyPlaces: nearbyResult.places ?? [],
    },
    { status: geocodeResponse.status },
  );
}
