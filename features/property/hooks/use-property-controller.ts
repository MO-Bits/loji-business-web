"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PropertyAddress } from "../models/property";
import {
  createPropertyBasicInfo,
  savePropertyImages,
  updatePropertyAddress,
  uploadPropertyImages,
  type PropertyBasicInput,
} from "../services/property-service";

export function usePropertyController() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    }
  }, []);

  const createProperty = useCallback(
    (input: PropertyBasicInput, files: File[]) =>
      run(async () => {
        const supabase = createClient();
        const propertyId = await createPropertyBasicInfo(supabase, input);
        const urls = await uploadPropertyImages(supabase, propertyId, files);
        await savePropertyImages(supabase, propertyId, urls);
        return propertyId;
      }),
    [run],
  );

  const saveAddress = useCallback(
    (ownerId: string, address: PropertyAddress) =>
      run(() => updatePropertyAddress(createClient(), ownerId, address)),
    [run],
  );

  return { loading, error, clearError: () => setError(null), createProperty, saveAddress };
}
