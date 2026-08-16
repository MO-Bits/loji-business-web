import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const url = new URL(request.url);
  const lat = url.searchParams.get("lat");
  const lng = url.searchParams.get("lng");
  if (!key) return NextResponse.json({ error: "Google Geocoding is not configured." }, { status: 503 });
  if (!lat || !lng) return NextResponse.json({ error: "Coordinates are required." }, { status: 400 });
  const endpoint = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  endpoint.searchParams.set("latlng", `${lat},${lng}`);
  endpoint.searchParams.set("key", key);
  endpoint.searchParams.set("language", "en");
  const response = await fetch(endpoint);
  return NextResponse.json(await response.json(), { status: response.status });
}
