import { NextResponse } from "next/server";
import { rateLimit, rateLimitHeaders, requestIdentity } from "@/lib/server/rate-limit";

export async function GET(request: Request) {
  const limit = rateLimit(`google:${requestIdentity(request)}`, { limit: 40 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many location requests. Please wait a moment and try again." },
      { status: 429, headers: { ...rateLimitHeaders(limit), "Retry-After": String(Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000))) } },
    );
  }
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const url = new URL(request.url);
  const placeId = url.searchParams.get("placeId");
  if (!key) return NextResponse.json({ error: "Google Places is not configured." }, { status: 503 });
  if (!placeId) return NextResponse.json({ error: "placeId is required." }, { status: 400 });
  const sessionToken = url.searchParams.get("sessionToken");
  const endpoint = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
  if (sessionToken) endpoint.searchParams.set("sessionToken", sessionToken);
  const response = await fetch(endpoint, { headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "id,displayName,formattedAddress,location,addressComponents" } });
  return NextResponse.json(await response.json(), { status: response.status });
}
