import { NextResponse } from "next/server";
import { rateLimit, rateLimitHeaders, requestIdentity } from "@/lib/server/rate-limit";

export async function POST(request: Request) {
  const limit = rateLimit(`google:${requestIdentity(request)}`, { limit: 40 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many location requests. Please wait a moment and try again." },
      { status: 429, headers: { ...rateLimitHeaders(limit), "Retry-After": String(Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000))) } },
    );
  }
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
