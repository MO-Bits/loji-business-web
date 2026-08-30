"use client";

import type { ReactNode } from "react";

import {
  AppSessionContext,
  useAppSessionProviderValue,
} from "@/features/session/hooks/use-app-session";

export function AppSessionProvider({ children }: { children: ReactNode }) {
  const value = useAppSessionProviderValue();
  return (
    <AppSessionContext.Provider value={value}>
      {children}
    </AppSessionContext.Provider>
  );
}
