import type { InventoryType, PropertyType } from "./models/property";

export type LocalizedText = readonly [english: string, swahili: string];

export type PropertyTypeDefinition = {
  value: PropertyType;
  label: LocalizedText;
  shortDescription: LocalizedText;
  inventoryType: InventoryType;
  inventorySingular: LocalizedText;
  inventoryPlural: LocalizedText;
  inventoryBoard: LocalizedText;
  allowsMultipleInventory: boolean;
};

export const propertyTypeDefinitions: readonly PropertyTypeDefinition[] = [
  {
    value: "hotel",
    label: ["Hotel", "Hoteli"],
    shortDescription: ["Rooms booked separately, with front-desk operations.", "Vyumba huhifadhiwa kimoja kimoja na shughuli za mapokezi."],
    inventoryType: "room",
    inventorySingular: ["room", "chumba"],
    inventoryPlural: ["rooms", "vyumba"],
    inventoryBoard: ["Room board", "Ubao wa vyumba"],
    allowsMultipleInventory: true,
  },
  {
    value: "lodge",
    label: ["Lodge", "Loji"],
    shortDescription: ["Guest rooms or cottages managed as separate stays.", "Vyumba au cottages husimamiwa kama sehemu tofauti za kukaa."],
    inventoryType: "room",
    inventorySingular: ["room", "chumba"],
    inventoryPlural: ["rooms", "vyumba"],
    inventoryBoard: ["Room board", "Ubao wa vyumba"],
    allowsMultipleInventory: true,
  },
  {
    value: "guesthouse",
    label: ["Guesthouse", "Nyumba ya wageni"],
    shortDescription: ["A smaller property where guests reserve individual rooms.", "Biashara ndogo ambako wageni huhifadhi vyumba tofauti."],
    inventoryType: "room",
    inventorySingular: ["room", "chumba"],
    inventoryPlural: ["rooms", "vyumba"],
    inventoryBoard: ["Room board", "Ubao wa vyumba"],
    allowsMultipleInventory: true,
  },
  {
    value: "apartment",
    label: ["Apartments", "Fleti"],
    shortDescription: ["Separate units, such as studios, 2-bedroom and 3-bedroom apartments.", "Units tofauti kama studio, fleti za vyumba 2 au vyumba 3."],
    inventoryType: "apartment",
    inventorySingular: ["apartment", "fleti"],
    inventoryPlural: ["apartments", "fleti"],
    inventoryBoard: ["Apartment board", "Ubao wa fleti"],
    allowsMultipleInventory: true,
  },
  {
    value: "house",
    label: ["One house", "Nyumba moja"],
    shortDescription: ["One entire house is booked as a single private stay.", "Nyumba nzima huhifadhiwa kama sehemu moja binafsi ya kukaa."],
    inventoryType: "house",
    inventorySingular: ["home", "nyumba"],
    inventoryPlural: ["homes", "nyumba"],
    inventoryBoard: ["Home workspace", "Eneo la nyumba"],
    allowsMultipleInventory: false,
  },
  {
    value: "villa",
    label: ["Villa", "Villa"],
    shortDescription: ["One entire villa is booked by one guest group at a time.", "Villa nzima huhifadhiwa na kundi moja la wageni kwa wakati."],
    inventoryType: "house",
    inventorySingular: ["villa", "villa"],
    inventoryPlural: ["villas", "villa"],
    inventoryBoard: ["Villa workspace", "Eneo la villa"],
    allowsMultipleInventory: false,
  },
  {
    value: "resort",
    label: ["Resort", "Risoti"],
    shortDescription: ["Rooms or suites with shared guest facilities.", "Vyumba au suites vyenye huduma za pamoja kwa wageni."],
    inventoryType: "room",
    inventorySingular: ["room", "chumba"],
    inventoryPlural: ["rooms", "vyumba"],
    inventoryBoard: ["Room board", "Ubao wa vyumba"],
    allowsMultipleInventory: true,
  },
  {
    value: "hostel",
    label: ["Hostel", "Hosteli"],
    shortDescription: ["Private rooms or shared sleeping spaces.", "Vyumba binafsi au sehemu za kulala za pamoja."],
    inventoryType: "room",
    inventorySingular: ["room", "chumba"],
    inventoryPlural: ["rooms", "vyumba"],
    inventoryBoard: ["Room board", "Ubao wa vyumba"],
    allowsMultipleInventory: true,
  },
  {
    value: "bed_and_breakfast",
    label: ["Bed & breakfast", "Malazi na kifungua kinywa"],
    shortDescription: ["Guest rooms with breakfast included or offered.", "Vyumba vya wageni pamoja na kifungua kinywa."],
    inventoryType: "room",
    inventorySingular: ["room", "chumba"],
    inventoryPlural: ["rooms", "vyumba"],
    inventoryBoard: ["Room board", "Ubao wa vyumba"],
    allowsMultipleInventory: true,
  },
] as const;

export const hospitalityPropertyTypeDefinitions = propertyTypeDefinitions.filter(
  (definition) =>
    definition.value === "hotel" ||
    definition.value === "lodge" ||
    definition.value === "guesthouse",
);

const fallback = propertyTypeDefinitions[0];

export function normalizePropertyType(value: unknown): PropertyType {
  const normalized = String(value ?? "").trim().toLowerCase().replaceAll("-", "_");
  return propertyTypeDefinitions.some((item) => item.value === normalized)
    ? normalized as PropertyType
    : "hotel";
}

export function getPropertyTypeDefinition(value: unknown): PropertyTypeDefinition {
  const normalized = normalizePropertyType(value);
  return propertyTypeDefinitions.find((item) => item.value === normalized) ?? fallback;
}

export function getInventoryDefinition(value: unknown): Pick<
  PropertyTypeDefinition,
  "inventoryType" | "inventorySingular" | "inventoryPlural" | "inventoryBoard" | "allowsMultipleInventory"
> {
  const inventoryType = String(value ?? "").trim().toLowerCase();
  if (inventoryType === "apartment") return getPropertyTypeDefinition("apartment");
  if (inventoryType === "house") return getPropertyTypeDefinition("house");
  return getPropertyTypeDefinition("hotel");
}

export type InventorySpaceOption = {
  value: string;
  label: LocalizedText;
};

export function inventoryTypeOptions(propertyType: unknown): readonly InventorySpaceOption[] {
  const definition = getPropertyTypeDefinition(propertyType);
  if (definition.inventoryType === "apartment") {
    return [
      { value: "studio", label: ["Studio", "Studio"] },
      { value: "1-bedroom", label: ["1-bedroom", "Chumba 1 cha kulala"] },
      { value: "2-bedroom", label: ["2-bedroom", "Vyumba 2 vya kulala"] },
      { value: "3-bedroom", label: ["3-bedroom", "Vyumba 3 vya kulala"] },
      { value: "4-plus-bedroom", label: ["4+ bedroom", "Vyumba 4+ vya kulala"] },
      { value: "penthouse", label: ["Penthouse", "Penthouse"] },
    ];
  }
  if (definition.inventoryType === "house") {
    return [
      { value: "entire-house", label: ["Entire house", "Nyumba nzima"] },
      { value: "townhouse", label: ["Townhouse", "Townhouse"] },
      { value: "villa", label: ["Villa", "Villa"] },
      { value: "cottage", label: ["Cottage", "Cottage"] },
    ];
  }
  return [
    { value: "single", label: ["Single", "Single"] },
    { value: "double", label: ["Double", "Double"] },
    { value: "twin", label: ["Twin", "Twin"] },
    { value: "family", label: ["Family", "Familia"] },
    { value: "suite", label: ["Suite", "Suite"] },
    { value: "deluxe", label: ["Deluxe", "Deluxe"] },
  ];
}
