"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PropertyAddress } from "../models/property";
import {
  clearPendingPropertySetup,
  createPropertyBasicInfo,
  getPendingPropertySetup,
  removePropertyImages,
  savePropertyImages,
  savePendingPropertySetup,
  updatePropertyAddress,
  uploadPropertyImages,
  type PropertyBasicInput,
} from "../services/property-service";

export function usePropertyController() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<
    "idle" | "creating" | "uploading" | "saving" | "saving-address"
  >("idle");

  const run = useCallback(async <T,>(task: () => Promise<T>) => {
    setLoading(true);
    setError(null);
    try {
      return await task();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Something went wrong.";
      setError(message);
      throw cause;
    } finally {
      setLoading(false);
      setPhase("idle");
    }
  }, []);

  const createProperty = useCallback(
    (input: PropertyBasicInput, files: File[]) =>
      run(async () => {
        const supabase = createClient();
        setPhase("creating");
        const { data, error: userError } = await supabase.auth.getUser();
        if (userError || !data.user) {
          throw new Error("Your session has expired. Sign in and try again.");
        }

        const pending = getPendingPropertySetup(data.user.id);
        const propertyId =
          pending.propertyId ??
          (await createPropertyBasicInfo(supabase, input, pending.requestKey));

        if (!pending.propertyId) {
          savePendingPropertySetup({ ...pending, propertyId });
        }

        if (files.length) {
          setPhase("uploading");
          const uploaded = await uploadPropertyImages(supabase, propertyId, files);
          try {
            setPhase("saving");
            await savePropertyImages(supabase, propertyId, uploaded.urls);
          } catch (cause) {
            await removePropertyImages(supabase, uploaded.paths);
            throw cause;
          }
        }

        return propertyId;
      }),
    [run],
  );

  const saveAddress = useCallback(
    (ownerId: string, sessionPropertyId: string | undefined, address: PropertyAddress) =>
      run(async () => {
        setPhase("saving-address");
        const propertyId = sessionPropertyId ?? getPendingPropertySetup(ownerId).propertyId;
        if (!propertyId) {
          throw new Error("We could not identify the property being configured. Return to property details and try again.");
        }
        await updatePropertyAddress(createClient(), propertyId, address);
        clearPendingPropertySetup(ownerId);
      }),
    [run],
  );

  return {
    loading,
    phase,
    error,
    clearError: () => setError(null),
    createProperty,
    saveAddress,
  };
}
