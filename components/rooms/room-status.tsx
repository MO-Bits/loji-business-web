"use client";

import type { ReactNode } from "react";
import { StatusPill, type StatusTone } from "@/components/shared/workspace-ui";
import type { HousekeepingStatus, RoomOperationalStatus } from "@/features/rooms/models/room";

export const housekeepingOptions: Array<{
  value: HousekeepingStatus;
  label: string;
  swahili: string;
}> = [
  { value: "ready", label: "Mark ready", swahili: "Weka tayari" },
  { value: "needs_cleaning", label: "Needs cleaning", swahili: "Kinahitaji usafi" },
  { value: "cleaning", label: "Cleaning in progress", swahili: "Usafi unaendelea" },
  { value: "out_of_service", label: "Out of service", swahili: "Hakitumiki" },
];

export function roomStatusMeta(
  status: RoomOperationalStatus,
  t: (english: string, swahili: string) => string,
): { label: string; tone: StatusTone } {
  const values: Record<RoomOperationalStatus, { label: string; swahili: string; tone: StatusTone }> = {
    ready: { label: "Ready", swahili: "Tayari", tone: "success" },
    occupied: { label: "Occupied", swahili: "Kimekaliwa", tone: "info" },
    checking_out_today: { label: "Checking out today", swahili: "Anatoka leo", tone: "warning" },
    needs_cleaning: { label: "Needs cleaning", swahili: "Kinahitaji usafi", tone: "warning" },
    cleaning: { label: "Cleaning", swahili: "Kinasafishwa", tone: "info" },
    out_of_service: { label: "Out of service", swahili: "Hakitumiki", tone: "danger" },
    inactive: { label: "Inactive", swahili: "Kimezimwa", tone: "neutral" },
  };
  const item = values[status];
  return { label: t(item.label, item.swahili), tone: item.tone };
}

export function RoomStatusPill({
  status,
  t,
}: {
  status: RoomOperationalStatus;
  t: (english: string, swahili: string) => string;
}): ReactNode {
  const item = roomStatusMeta(status, t);
  return <StatusPill label={item.label} tone={item.tone} />;
}
