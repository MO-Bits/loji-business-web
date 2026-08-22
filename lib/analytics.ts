"use client";

type AnalyticsValue = string | number | boolean | null | undefined;

declare global {
  interface Window {
    gtag?: (
      command: "event",
      eventName: string,
      parameters?: Record<string, AnalyticsValue>,
    ) => void;
  }
}

export function trackEvent(
  eventName: string,
  parameters: Record<string, AnalyticsValue> = {},
) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", eventName, parameters);
}
