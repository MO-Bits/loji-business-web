import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ error: "Google Places is not configured." }, { status: 503 });
  const body = await request.json() as { input?: string; latitude?: number; longitude?: number; sessionToken?: string };
  if (!body.input?.trim()) return NextResponse.json({ suggestions: [] });
  const payload: Record<string, unknown> = { input: body.input.trim(), languageCode: "en", includedRegionCodes: ["tz"], sessionToken: body.sessionToken };
  if (Number.isFinite(body.latitude) && Number.isFinite(body.longitude)) payload.locationBias = { circle: { center: { latitude: body.latitude, longitude: body.longitude }, radius: 50000 } };
  const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", { method: "POST", headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat" }, body: JSON.stringify(payload) });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
