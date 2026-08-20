// These values are public browser configuration, not server secrets.
// Runtime environment variables remain authoritative when available.
const defaultSupabaseUrl = "https://kymloctcridmvqtdglro.supabase.co";
const defaultSupabasePublishableKey =
  "sb_publishable_xhkpb9xGWGcHhXScgQlmCA_dEOGXKvM";

export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || defaultSupabaseUrl;

export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  defaultSupabasePublishableKey;
