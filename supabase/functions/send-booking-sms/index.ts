import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

function environmentKey(name: "publishable" | "secret") {
  const modernName = name === "publishable" ? "SUPABASE_PUBLISHABLE_KEYS" : "SUPABASE_SECRET_KEYS";
  const legacyName = name === "publishable" ? "SUPABASE_ANON_KEY" : "SUPABASE_SERVICE_ROLE_KEY";
  const modern = Deno.env.get(modernName);
  if (modern) {
    try {
      const parsed = JSON.parse(modern) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch {
      // Use the legacy key while the project completes key migration.
    }
  }
  return Deno.env.get(legacyName) ?? "";
}

function normalizePhone(value: string) {
  const phone = value.replace(/\D/g, "");
  if (/^255\d{9}$/.test(phone)) return phone;
  if (/^0\d{9}$/.test(phone)) return `255${phone.slice(1)}`;
  if (/^\d{9}$/.test(phone)) return `255${phone}`;
  throw new Error("The guest phone number is invalid.");
}

function dateLabel(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) throw new Error("The booking dates are invalid.");
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function moneyLabel(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ success: false, error: "Method not allowed." }, 405);

  try {
    const authorization = request.headers.get("Authorization") ?? "";
    if (!authorization.startsWith("Bearer ")) return json({ success: false, error: "Authentication is required." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const publishableKey = environmentKey("publishable");
    const secretKey = environmentKey("secret");
    if (!supabaseUrl || !publishableKey || !secretKey) throw new Error("Supabase function credentials are missing.");

    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const token = authorization.slice("Bearer ".length);
    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData.user) return json({ success: false, error: "Your session is invalid or expired." }, 401);

    const payload = await request.json() as { propertyId?: unknown; bookingId?: unknown };
    if (typeof payload.propertyId !== "string" || typeof payload.bookingId !== "string") {
      return json({ success: false, error: "Property and booking are required." }, 400);
    }

    const { error: accessError } = await userClient.rpc("get_booking_workspace", {
      p_property_id: payload.propertyId,
      p_booking_id: payload.bookingId,
    });
    if (accessError) return json({ success: false, error: "You cannot send an SMS for this booking." }, 403);

    const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false } });
    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select("id, booking_number, property_id, room_id, guest_id, check_in, check_out, total_price, status")
      .eq("id", payload.bookingId)
      .eq("property_id", payload.propertyId)
      .single();
    if (bookingError || !booking) return json({ success: false, error: "Booking not found." }, 404);

    const [{ data: property }, { data: room }, { data: guest }] = await Promise.all([
      admin.from("properties").select("name").eq("id", booking.property_id).single(),
      admin.from("rooms").select("name").eq("id", booking.room_id).eq("property_id", booking.property_id).single(),
      admin.from("guests").select("first_name, last_name, phone").eq("id", booking.guest_id).single(),
    ]);
    if (!property?.name || !room?.name || !guest?.phone) throw new Error("The saved booking is missing SMS details.");

    const recipient = normalizePhone(guest.phone);
    const guestName = [guest.first_name, guest.last_name].filter(Boolean).join(" ").trim() || "Mgeni";
    const state = booking.status === "checked_in" ? "umeingia" : "umehifadhiwa";
    const message = [
      property.name,
      `Uhifadhi ${booking.booking_number} ${state}.`,
      `Mgeni: ${guestName}`,
      `Chumba: ${room.name}`,
      `Kuingia: ${dateLabel(booking.check_in)}`,
      `Kutoka: ${dateLabel(booking.check_out)}`,
      `Jumla: TZS ${moneyLabel(Number(booking.total_price))}`,
      "Asante.",
    ].join("\n");

    const apiKey = Deno.env.get("BEEM_API_KEY");
    const beemSecret = Deno.env.get("BEEM_SECRET_KEY");
    const senderId = Deno.env.get("BEEM_SENDER_ID");
    if (!apiKey || !beemSecret || !senderId) throw new Error("Beem credentials are missing.");

    const response = await fetch("https://apisms.beem.africa/v1/send", {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Basic ${btoa(`${apiKey}:${beemSecret}`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_addr: senderId,
        encoding: 0,
        message,
        recipients: [{ recipient_id: "1", dest_addr: recipient }],
      }),
    });
    const responseText = await response.text();
    let provider: unknown = responseText;
    try { provider = JSON.parse(responseText); } catch { /* Keep non-JSON provider response for diagnostics. */ }
    if (!response.ok) {
      console.error("booking_sms_provider_failed", { bookingId: booking.id, status: response.status, provider });
      return json({ success: false, error: "The SMS provider rejected the message." }, 502);
    }

    console.log("booking_sms_sent", { bookingId: booking.id, propertyId: booking.property_id, recipient: recipient.slice(-4) });
    return json({ success: true, phone: recipient });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send booking SMS.";
    console.error("booking_sms_failed", { message });
    return json({ success: false, error: message }, 500);
  }
});
