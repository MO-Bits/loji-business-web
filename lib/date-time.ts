const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const EXPLICIT_TIME_ZONE = /T.*(?:Z|[+-]\d{2}(?::?\d{2})?)$/i;

/** Convert a Supabase/Postgres date or timestamp into the user's local time. */
export function parseDatabaseDate(value: Date | string | null | undefined): Date {
  if (value instanceof Date) return new Date(value.getTime());
  if (!value) return new Date(Number.NaN);
  const raw = String(value).trim();
  const dateOnly = DATE_ONLY.exec(raw);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }
  const isoLike = raw.includes("T") ? raw : raw.replace(" ", "T");
  return new Date(EXPLICIT_TIME_ZONE.test(isoLike) ? isoLike : `${isoLike}Z`);
}

export function localDateKey(value: Date | string = new Date()): string {
  const date = typeof value === "string" ? parseDatabaseDate(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatLocalDate(
  value: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  const date = parseDatabaseDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-TZ", options).format(date);
}

export function formatLocalTime(
  value: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" },
): string {
  const date = parseDatabaseDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-TZ", options).format(date);
}

export function formatLocalDateTime(value: Date | string | null | undefined): string {
  const date = parseDatabaseDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-TZ", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
