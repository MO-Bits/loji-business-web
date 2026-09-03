export type PropertyOfferingCategory = "facility" | "service";

export type HospitalityRoomType =
  | "standard"
  | "single"
  | "double"
  | "twin"
  | "triple"
  | "family"
  | "suite"
  | "deluxe";

export const hospitalityRoomTypes = [
  { value: "standard", label: ["Standard", "Kawaida"] as const, capacity: 2, beds: 1 },
  { value: "single", label: ["Single", "Single"] as const, capacity: 1, beds: 1 },
  { value: "double", label: ["Double", "Double"] as const, capacity: 2, beds: 1 },
  { value: "twin", label: ["Twin", "Twin"] as const, capacity: 2, beds: 2 },
  { value: "triple", label: ["Triple", "Triple"] as const, capacity: 3, beds: 3 },
  { value: "family", label: ["Family", "Familia"] as const, capacity: 4, beds: 2 },
  { value: "suite", label: ["Suite", "Suite"] as const, capacity: 2, beds: 1 },
  { value: "deluxe", label: ["Deluxe", "Deluxe"] as const, capacity: 2, beds: 1 },
] satisfies ReadonlyArray<{
  value: HospitalityRoomType;
  label: readonly [string, string];
  capacity: number;
  beds: number;
}>;

export type PropertyOffering = {
  value: string;
  category: PropertyOfferingCategory;
  label: readonly [english: string, swahili: string];
};

export const propertyOfferings: readonly PropertyOffering[] = [
  { value: "WiFi", category: "facility", label: ["Wi-Fi", "Wi-Fi"] },
  { value: "Parking", category: "facility", label: ["Parking", "Maegesho"] },
  { value: "Air Conditioning", category: "facility", label: ["Air conditioning", "Kiyoyozi"] },
  { value: "Hot Water", category: "facility", label: ["Hot water", "Maji ya moto"] },
  { value: "Swimming Pool", category: "facility", label: ["Swimming pool", "Bwawa la kuogelea"] },
  { value: "Gym", category: "facility", label: ["Gym", "Ukumbi wa mazoezi"] },
  { value: "Spa", category: "facility", label: ["Spa", "Spa"] },
  { value: "Garden", category: "facility", label: ["Garden", "Bustani"] },
  { value: "Conference Room", category: "facility", label: ["Conference room", "Ukumbi wa mikutano"] },
  { value: "Wheelchair Access", category: "facility", label: ["Wheelchair access", "Njia ya kiti cha magurudumu"] },
  { value: "Family Rooms", category: "facility", label: ["Family rooms", "Vyumba vya familia"] },
  { value: "Security", category: "facility", label: ["Security", "Ulinzi"] },
  { value: "Backup Power", category: "facility", label: ["Backup power", "Umeme wa dharura"] },
  { value: "Breakfast", category: "service", label: ["Breakfast", "Kifungua kinywa"] },
  { value: "Restaurant", category: "service", label: ["Restaurant", "Mgahawa"] },
  { value: "Bar / Lounge", category: "service", label: ["Bar or lounge", "Baa au sebule"] },
  { value: "Room Service", category: "service", label: ["Room service", "Huduma chumbani"] },
  { value: "Laundry Service", category: "service", label: ["Laundry", "Huduma ya kufua"] },
  { value: "Airport Shuttle", category: "service", label: ["Airport shuttle", "Usafiri wa uwanja wa ndege"] },
  { value: "24-hour Front Desk", category: "service", label: ["24-hour front desk", "Mapokezi saa 24"] },
] as const;

export const propertyAmenities = propertyOfferings.map((offering) => offering.value);

export type AcceptedPaymentMethod =
  | "cash"
  | "mobile_money"
  | "card"
  | "bank_transfer"
  | "cheque"
  | "other";

export const acceptedPaymentMethods: ReadonlyArray<{
  value: AcceptedPaymentMethod;
  label: readonly [english: string, swahili: string];
  description: readonly [english: string, swahili: string];
}> = [
  { value: "cash", label: ["Cash", "Taslimu"], description: ["Notes and coins", "Noti na sarafu"] },
  { value: "mobile_money", label: ["Mobile money", "Pesa kwa simu"], description: ["M-Pesa, Airtel Money, Tigo Pesa and others", "M-Pesa, Airtel Money, Tigo Pesa na nyingine"] },
  { value: "card", label: ["Card", "Kadi"], description: ["Debit or credit card", "Kadi ya benki"] },
  { value: "bank_transfer", label: ["Bank transfer", "Uhamisho wa benki"], description: ["Direct bank payment", "Malipo ya moja kwa moja benki"] },
  { value: "cheque", label: ["Cheque", "Hundi"], description: ["Business or personal cheque", "Hundi ya biashara au binafsi"] },
  { value: "other", label: ["Other", "Nyingine"], description: ["Another method recorded by staff", "Njia nyingine itakayorekodiwa na mfanyakazi"] },
];

export function isAcceptedPaymentMethod(value: unknown): value is AcceptedPaymentMethod {
  return acceptedPaymentMethods.some((method) => method.value === value);
}

export function normalizeAcceptedPaymentMethods(value: unknown): AcceptedPaymentMethod[] {
  if (!Array.isArray(value)) return ["cash", "mobile_money"];
  const methods = value.filter(isAcceptedPaymentMethod);
  return methods.length ? [...new Set(methods)] : ["cash", "mobile_money"];
}
