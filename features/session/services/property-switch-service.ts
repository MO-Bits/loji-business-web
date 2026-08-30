import type { Membership, Property } from "../models/app-session";
import { trackEvent } from "@/lib/analytics";

export const ACTIVE_PROPERTY_STORAGE_KEY = "loji.activePropertyId";

export function readPreferredPropertyId() {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem(ACTIVE_PROPERTY_STORAGE_KEY) ?? undefined;
}

export function savePreferredPropertyId(propertyId: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ACTIVE_PROPERTY_STORAGE_KEY, propertyId);
    trackEvent("property_switched", { property_id: propertyId });
    window.dispatchEvent(new CustomEvent("loji:property-change", { detail: propertyId }));
  }
}

export function loadPropertyForMembership(membership: Membership): Property {
  if (!membership.property || typeof membership.property !== "object") {
    throw new Error("The workspace session is missing property details.");
  }
  return membership.property;
}
