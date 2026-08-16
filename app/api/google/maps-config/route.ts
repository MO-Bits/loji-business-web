import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!key) {
    return NextResponse.json(
      { error: "Google Maps is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  // A Maps JavaScript browser key is public by design. Its protection comes
  // from Google Cloud website and API restrictions, not from hiding the key.
  return NextResponse.json(
    { key },
    { headers: { "Cache-Control": "no-store" } },
  );
}
