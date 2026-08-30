export type UserProfile = {
  userId: string;
  displayName: string;
  email: string;
  phone: string;
  imageUrl: string;
  bio: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ProfileUpdateInput = {
  displayName: string;
  phone: string;
  bio: string;
};

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`The profile response is missing ${field}.`);
  }
  return value;
}

function optionalString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function optionalDate(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

export function parseUserProfile(value: unknown): UserProfile {
  const payload = record(value);
  if (!payload) throw new Error("The profile service returned an invalid response.");

  return {
    userId: requiredString(payload.user_id, "a user ID"),
    displayName: optionalString(payload.display_name),
    email: optionalString(payload.email),
    phone: optionalString(payload.phone),
    imageUrl: optionalString(payload.image_url),
    bio: optionalString(payload.bio),
    createdAt: optionalDate(payload.created_at),
    updatedAt: optionalDate(payload.updated_at),
  };
}
