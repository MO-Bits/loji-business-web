"use client";

import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import { Avatar, Chip } from "@mui/material";

import { useLanguage } from "@/components/providers/language-provider";
import { guestInitials } from "@/features/guests/models/guest";

type ChipColor = "default" | "error" | "info" | "success" | "warning";

export function GuestAvatar({
  name,
  size = 40,
}: {
  name: string;
  size?: number;
}) {
  return (
    <Avatar
      aria-hidden
      sx={{
        bgcolor:
          "color-mix(in srgb, var(--mui-palette-primary-main) 13%, var(--mui-palette-background-paper))",
        border: "1px solid",
        borderColor:
          "color-mix(in srgb, var(--mui-palette-primary-main) 24%, var(--mui-palette-divider))",
        color: "primary.main",
        fontSize: size >= 64 ? "1.15rem" : ".8rem",
        fontWeight: 700,
        height: size,
        width: size,
      }}
    >
      {guestInitials(name)}
    </Avatar>
  );
}

export function GuestStatusChip({
  status,
}: {
  status: "in_house" | "past" | "returning" | "upcoming";
}) {
  const { t } = useLanguage();
  const config = {
    in_house: {
      color: "success" as ChipColor,
      icon: <HotelRoundedIcon />,
      label: t("In house", "Yupo ndani"),
    },
    upcoming: {
      color: "info" as ChipColor,
      icon: <EventAvailableRoundedIcon />,
      label: t("Upcoming", "Anatarajiwa"),
    },
    returning: {
      color: "default" as ChipColor,
      icon: <HistoryRoundedIcon />,
      label: t("Returning", "Amerudi"),
    },
    past: {
      color: "default" as ChipColor,
      icon: <CheckCircleRoundedIcon />,
      label: t("Past guest", "Mgeni wa zamani"),
    },
  }[status];

  return (
    <Chip
      color={config.color}
      icon={config.icon}
      label={config.label}
      size="small"
      variant={status === "in_house" ? "filled" : "outlined"}
      sx={{ "& .MuiChip-icon": { fontSize: 15 } }}
    />
  );
}

export function StayStatusChip({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const color: ChipColor =
    normalized === "checked_in"
      ? "success"
      : normalized === "confirmed" || normalized === "reserved"
        ? "info"
        : normalized === "cancelled" || normalized === "no_show"
          ? "error"
          : "default";
  const label = normalized
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return (
    <Chip
      color={color}
      label={label || "Unknown"}
      size="small"
      variant={normalized === "checked_in" ? "filled" : "outlined"}
    />
  );
}
