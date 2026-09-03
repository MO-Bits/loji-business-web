import type { InventoryType, PropertyType } from "./models/property";
import { hospitalityRoomTypes } from "./property-catalog";

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
] as const;

export const hospitalityPropertyTypeDefinitions = propertyTypeDefinitions;

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
  // Older records may still carry apartment/house inventory values. Treat them
  // as rooms in the product UI without rewriting or deleting their stored data.
  void value;
  return getPropertyTypeDefinition("hotel");
}

export type InventorySpaceOption = {
  value: string;
  label: LocalizedText;
};

export function inventoryTypeOptions(propertyType: unknown): readonly InventorySpaceOption[] {
  void propertyType;
  return hospitalityRoomTypes.map(({ value, label }) => ({ value, label }));
}
