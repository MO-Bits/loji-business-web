import {
  hospitalityRoomTypes,
  isAcceptedPaymentMethod,
  propertyAmenities,
  type AcceptedPaymentMethod,
  type HospitalityRoomType,
} from "@/features/property/property-catalog";

export type HospitalityBusinessType = "hotel" | "lodge" | "guesthouse";
export type SetupRoomType = HospitalityRoomType;
export type SetupStaffRole = "manager" | "receptionist";

export type RoomGroupDraft = {
  id: string;
  roomType: SetupRoomType;
  count: number;
  pricePerNight: string;
  capacity: number;
  bedCount: number;
};

export type StaffAccessDraft = {
  id: string;
  email: string;
  role: SetupStaffRole;
};

export type BusinessSetupDraft = {
  requestKey: string;
  businessType: HospitalityBusinessType | null;
  businessName: string;
  businessPhone: string;
  businessEmail: string;
  description: string;
  region: string;
  district: string;
  ward: string;
  street: string;
  amenities: string[];
  paymentMethods: AcceptedPaymentMethod[];
  checkinTime: string;
  checkoutTime: string;
  roomCount: number;
  roomGroups: RoomGroupDraft[];
  staff: StaffAccessDraft[];
};

export type RegistrationRoom = {
  name: string;
  room_type: SetupRoomType;
  capacity: number;
  bed_count: number;
  price_per_night: number;
};

export const setupStepSlugs = [
  "type",
  "name",
  "contact",
  "description",
  "area",
  "address",
  "offerings",
  "payments",
  "schedule",
  "room-count",
  "room-details",
  "staff",
  "review",
] as const;

export type SetupStepSlug = (typeof setupStepSlugs)[number];

export const hospitalityBusinessTypes = [
  {
    value: "hotel",
    label: ["Hotel", "Hoteli"] as const,
    description: [
      "A staffed property with rooms managed separately.",
      "Biashara yenye wafanyakazi na vyumba vinavyosimamiwa kimoja kimoja.",
    ] as const,
  },
  {
    value: "lodge",
    label: ["Lodge", "Loji"] as const,
    description: [
      "Guest rooms or cottages run as one accommodation business.",
      "Vyumba au cottages zinazoendeshwa kama biashara moja ya malazi.",
    ] as const,
  },
  {
    value: "guesthouse",
    label: ["Guesthouse", "Nyumba ya wageni"] as const,
    description: [
      "A smaller accommodation business with individual guest rooms.",
      "Biashara ndogo ya malazi yenye vyumba tofauti vya wageni.",
    ] as const,
  },
] satisfies ReadonlyArray<{
  value: HospitalityBusinessType;
  label: readonly [string, string];
  description: readonly [string, string];
}>;

export const setupRoomTypes = hospitalityRoomTypes;

export const staffRoles = [
  {
    value: "manager",
    label: ["Manager", "Meneja"] as const,
    description: [
      "Manages rooms, bookings, daily operations and receptionist access.",
      "Anasimamia vyumba, uhifadhi, shughuli za kila siku na ruhusa za mapokezi.",
    ] as const,
  },
  {
    value: "receptionist",
    label: ["Receptionist", "Mapokezi"] as const,
    description: [
      "Handles bookings, guests, arrivals and departures.",
      "Anahudumia uhifadhi, wageni, wanaowasili na wanaoondoka.",
    ] as const,
  },
] satisfies ReadonlyArray<{
  value: SetupStaffRole;
  label: readonly [string, string];
  description: readonly [string, string];
}>;

export const tanzaniaRegions = [
  "Arusha",
  "Dar es Salaam",
  "Dodoma",
  "Geita",
  "Iringa",
  "Kagera",
  "Katavi",
  "Kigoma",
  "Kilimanjaro",
  "Kaskazini Pemba",
  "Kaskazini Unguja",
  "Kusini Pemba",
  "Kusini Unguja",
  "Lindi",
  "Manyara",
  "Mara",
  "Mbeya",
  "Mjini Magharibi",
  "Morogoro",
  "Mtwara",
  "Mwanza",
  "Njombe",
  "Pwani",
  "Rukwa",
  "Ruvuma",
  "Shinyanga",
  "Simiyu",
  "Singida",
  "Songwe",
  "Tabora",
  "Tanga",
] as const;

export const MAX_ONBOARDING_ROOMS = 300;
export const MAX_ONBOARDING_STAFF = 50;

function id() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

export function createRoomGroup(count = 1): RoomGroupDraft {
  return {
    id: id(),
    roomType: "double",
    count,
    pricePerNight: "",
    capacity: 2,
    bedCount: 1,
  };
}

export function createStaffAccess(): StaffAccessDraft {
  return { id: id(), email: "", role: "receptionist" };
}

export function createBusinessSetupDraft(
  ownerEmail = "",
): BusinessSetupDraft {
  return {
    requestKey: id(),
    businessType: null,
    businessName: "",
    businessPhone: "",
    businessEmail: ownerEmail,
    description: "",
    region: "",
    district: "",
    ward: "",
    street: "",
    amenities: [],
    paymentMethods: ["cash", "mobile_money"],
    checkinTime: "14:00",
    checkoutTime: "10:00",
    roomCount: 1,
    roomGroups: [createRoomGroup(1)],
    staff: [],
  };
}

export function configuredRoomCount(groups: RoomGroupDraft[]) {
  return groups.reduce(
    (total, group) => total + (Number.isInteger(group.count) ? group.count : 0),
    0,
  );
}

export function normalizeRoomGroups(
  groups: RoomGroupDraft[],
  roomCount: number,
): RoomGroupDraft[] {
  const safeCount = Math.max(
    1,
    Math.min(MAX_ONBOARDING_ROOMS, Math.round(roomCount || 1)),
  );
  const next = groups.length
    ? groups.map((group) => ({ ...group }))
    : [createRoomGroup(safeCount)];
  const assigned = configuredRoomCount(next);
  if (assigned < safeCount) {
    next[next.length - 1].count += safeCount - assigned;
    return next;
  }

  let overflow = assigned - safeCount;
  for (let index = next.length - 1; index >= 0 && overflow > 0; index -= 1) {
    const removable = Math.min(overflow, next[index].count - 1);
    next[index].count -= removable;
    overflow -= removable;
  }
  while (overflow > 0 && next.length > 1) {
    const removed = next.pop();
    overflow -= removed?.count ?? 0;
  }
  if (overflow < 0) {
    next[next.length - 1].count += Math.abs(overflow);
  }
  return next;
}

function isBusinessType(value: unknown): value is HospitalityBusinessType {
  return value === "hotel" || value === "lodge" || value === "guesthouse";
}

function isRoomType(value: unknown): value is SetupRoomType {
  return setupRoomTypes.some((option) => option.value === value);
}

function isStaffRole(value: unknown): value is SetupStaffRole {
  return value === "manager" || value === "receptionist";
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function isTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function knownAmenities(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const known = new Map(propertyAmenities.map((amenity) => [amenity.toLocaleLowerCase(), amenity]));
  return Array.from(new Set(value.flatMap((item) => {
    const match = typeof item === "string" ? known.get(item.trim().toLocaleLowerCase()) : undefined;
    return match ? [match] : [];
  }))).slice(0, 50);
}

function integer(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}

/** Restores only known registration fields from local storage. */
export function restoreBusinessSetupDraft(
  value: unknown,
  ownerEmail = "",
): BusinessSetupDraft {
  const fresh = createBusinessSetupDraft(ownerEmail);
  if (!value || typeof value !== "object" || Array.isArray(value)) return fresh;

  const saved = value as Record<string, unknown>;
  const savedRegion = text(saved.region).trim();
  const region = tanzaniaRegions.find(
    (item) => item.toLowerCase() === savedRegion.toLowerCase(),
  ) ?? "";
  const roomCount = integer(saved.roomCount, fresh.roomCount, 1, MAX_ONBOARDING_ROOMS);
  const roomGroups = Array.isArray(saved.roomGroups)
    ? saved.roomGroups.slice(0, MAX_ONBOARDING_ROOMS).flatMap((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        const group = item as Record<string, unknown>;
        const roomType = isRoomType(group.roomType) ? group.roomType : "double";
        return [{
          id: text(group.id) || id(),
          roomType,
          count: integer(group.count, 1, 1, roomCount),
          pricePerNight: text(group.pricePerNight).replace(/[^0-9]/g, "").slice(0, 9),
          capacity: integer(group.capacity, 2, 1, 20),
          bedCount: integer(group.bedCount, 1, 1, 20),
        } satisfies RoomGroupDraft];
      })
    : fresh.roomGroups;
  const staff = Array.isArray(saved.staff)
    ? saved.staff.slice(0, MAX_ONBOARDING_STAFF).flatMap((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        const member = item as Record<string, unknown>;
        return [{
          id: text(member.id) || id(),
          email: text(member.email).slice(0, 254),
          role: isStaffRole(member.role) ? member.role : "receptionist",
        } satisfies StaffAccessDraft];
      })
    : [];

  return {
    requestKey: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text(saved.requestKey))
      ? text(saved.requestKey)
      : fresh.requestKey,
    businessType: isBusinessType(saved.businessType) ? saved.businessType : null,
    businessName: text(saved.businessName).slice(0, 120),
    businessPhone: text(saved.businessPhone).slice(0, 32),
    businessEmail: text(saved.businessEmail, ownerEmail).slice(0, 254),
    description: text(saved.description).slice(0, 2000),
    region,
    district: text(saved.district).slice(0, 120),
    ward: text(saved.ward).slice(0, 120),
    street: text(saved.street).slice(0, 200),
    amenities: knownAmenities(saved.amenities),
    paymentMethods: Array.isArray(saved.paymentMethods)
      ? Array.from(new Set(saved.paymentMethods.filter(isAcceptedPaymentMethod))).slice(0, 6)
      : fresh.paymentMethods,
    checkinTime: isTime(saved.checkinTime) ? saved.checkinTime : fresh.checkinTime,
    checkoutTime: isTime(saved.checkoutTime) ? saved.checkoutTime : fresh.checkoutTime,
    roomCount,
    roomGroups: normalizeRoomGroups(roomGroups, roomCount).map((group) => ({
      ...group,
      bedCount: Math.min(group.bedCount, group.capacity),
    })),
    staff,
  };
}

export function materializeRooms(draft: BusinessSetupDraft): RegistrationRoom[] {
  const width = Math.max(2, String(draft.roomCount).length);
  let roomNumber = 1;
  const rooms: RegistrationRoom[] = [];
  for (const group of draft.roomGroups) {
    for (let index = 0; index < group.count; index += 1) {
      rooms.push({
        name: `Chumba ${String(roomNumber).padStart(width, "0")}`,
        room_type: group.roomType,
        capacity: group.capacity,
        bed_count: group.bedCount,
        price_per_night: Number(group.pricePerNight),
      });
      roomNumber += 1;
    }
  }
  return rooms;
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function setupDraftStorageKey(ownerId: string) {
  return `loji-hospitality-registration:v1:${ownerId}`;
}

export function clearLegacyPropertySetupDrafts(ownerId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(`loji-property-registration:v3:${ownerId}`);
    window.localStorage.removeItem("loji-property-registration:v2");
    window.localStorage.removeItem("loji-property-setup:v1");
  } catch {
    // Legacy storage is only a resume convenience.
  }
}
