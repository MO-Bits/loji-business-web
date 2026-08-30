export type PropertySettings = {
  id: string;
  name: string;
  description: string;
  propertyType: string;
  phone: string;
  email: string;
  country: string;
  region: string;
  district: string;
  ward: string;
  street: string;
  formattedAddress: string;
  placeId: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  checkinTime: string;
  checkoutTime: string;
  amenities: string[];
  images: string[];
  isActive: boolean;
  updatedAt: string | null;
};

export type PropertySettingsWorkspace = {
  property: PropertySettings;
  role: string;
  capabilities: {
    updateProperty: boolean;
    manageProperty: boolean;
    changeVisibility: boolean;
  };
};

export type PropertyProfileInput = {
  name: string;
  description: string;
  propertyType: string;
  phone: string;
  email: string;
};

export type PropertyOperationsInput = {
  timezone: string;
  checkinTime: string;
  checkoutTime: string;
};

export type PropertyLocationInput = {
  country: string;
  region: string;
  district: string;
  ward: string;
  street: string;
  formattedAddress: string;
  placeId: string;
  latitude: number | null;
  longitude: number | null;
};

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function field(row: UnknownRecord, snake: string, camel = snake): unknown {
  return row[snake] ?? row[camel];
}

function text(row: UnknownRecord, snake: string, camel = snake, fallback = ""): string {
  const value = field(row, snake, camel);
  return value === null || value === undefined ? fallback : String(value);
}

function optionalNumber(row: UnknownRecord, snake: string, camel = snake): number | null {
  const value = field(row, snake, camel);
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function boolean(row: UnknownRecord, snake: string, camel = snake, fallback = false): boolean {
  const value = field(row, snake, camel);
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true" || value === "active" || value === "published";
  return fallback;
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      const value = record(item).url;
      return typeof value === "string" ? value : "";
    })
    .filter(Boolean);
}

function timeValue(value: string, fallback: string): string {
  const match = /^(\d{2}):(\d{2})/.exec(value);
  return match ? `${match[1]}:${match[2]}` : fallback;
}

export function parsePropertySettingsWorkspace(input: unknown): PropertySettingsWorkspace {
  const root = record(input);
  if (root.success === false) throw new Error(text(root, "message", "message", "Unable to load property settings."));
  const property = record(root.property);
  if (!text(property, "id")) throw new Error("Property settings were not found.");
  const capabilities = record(root.capabilities);
  return {
    property: {
      id: text(property, "id"),
      name: text(property, "name", "name", "Property"),
      description: text(property, "description"),
      propertyType: text(property, "property_type", "propertyType", "hotel"),
      phone: text(property, "phone"),
      email: text(property, "email"),
      country: text(property, "country"),
      region: text(property, "region"),
      district: text(property, "district"),
      ward: text(property, "ward"),
      street: text(property, "street"),
      formattedAddress: text(property, "formatted_address", "formattedAddress"),
      placeId: text(property, "place_id", "placeId"),
      latitude: optionalNumber(property, "latitude"),
      longitude: optionalNumber(property, "longitude"),
      timezone: text(property, "timezone", "timezone", "Africa/Dar_es_Salaam"),
      checkinTime: timeValue(text(property, "checkin_time", "checkinTime"), "14:00"),
      checkoutTime: timeValue(text(property, "checkout_time", "checkoutTime"), "10:00"),
      amenities: strings(field(property, "amenities")),
      images: strings(field(property, "images")),
      isActive: boolean(property, "is_active", "isActive", boolean(property, "status")),
      updatedAt: field(property, "updated_at", "updatedAt")
        ? text(property, "updated_at", "updatedAt")
        : null,
    },
    role: text(root, "role", "role", "member"),
    capabilities: {
      updateProperty: boolean(capabilities, "update_property", "updateProperty"),
      manageProperty: boolean(capabilities, "manage_property", "manageProperty"),
      changeVisibility: boolean(capabilities, "change_visibility", "changeVisibility"),
    },
  };
}

export const propertyTypes = [
  "hotel",
  "lodge",
  "guesthouse",
  "apartment",
  "resort",
  "hostel",
  "villa",
  "bed_and_breakfast",
];

export const propertyAmenities = [
  "WiFi",
  "Parking",
  "Restaurant",
  "Breakfast",
  "Swimming Pool",
  "Airport Shuttle",
  "24-hour Front Desk",
  "Room Service",
  "Laundry Service",
  "Air Conditioning",
  "Conference Room",
  "Bar / Lounge",
  "Gym",
  "Spa",
  "Wheelchair Access",
  "Family Rooms",
  "Business Centre",
  "Garden",
  "Security",
  "Backup Power",
];
