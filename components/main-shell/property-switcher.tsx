"use client";

import { useMemo, useState } from "react";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import {
  Avatar,
  Box,
  ButtonBase,
  CircularProgress,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import { useLanguage } from "@/components/providers/language-provider";
import type { Membership, Property } from "@/features/session/models/app-session";

function imageFromProperty(property: Record<string, unknown> | null | undefined) {
  if (!property || !Array.isArray(property.images) || !property.images.length) return undefined;
  const first = property.images[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && "url" in first) {
    return String((first as { url?: unknown }).url ?? "") || undefined;
  }
  return undefined;
}

type PropertyOption = {
  address?: string;
  id: string;
  image?: string;
  name: string;
  role?: string;
};

type PropertySwitcherProps = {
  activePropertyId?: string;
  memberships: Membership[];
  onSwitch: (propertyId: string) => Promise<void>;
  placement?: "sidebar" | "topbar";
  property?: Property | null;
};

export function PropertySwitcher({
  activePropertyId,
  memberships,
  onSwitch,
  placement = "topbar",
  property,
}: PropertySwitcherProps) {
  const { t } = useLanguage();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const membershipIds = useMemo(
    () =>
      memberships
        .map((membership) => membership.property_id)
        .filter((id): id is string => Boolean(id)),
    [memberships],
  );

  const options = useMemo<PropertyOption[]>(
    () =>
      memberships.flatMap((membership) => {
        if (!membership.property_id || !membership.property) return [];
        const item = membership.property;
        return [
          {
            address:
              typeof item.formatted_address === "string"
                ? item.formatted_address
                : typeof item.address === "string"
                  ? item.address
                  : undefined,
            id: membership.property_id,
            image: imageFromProperty(item),
            name: String(item.name ?? t("Property", "Biashara")),
            role: membership.role,
          },
        ];
      }),
    [memberships, t],
  );

  const propertyRecord = property as Record<string, unknown> | null | undefined;
  const propertyName = String(property?.name ?? t("Property", "Biashara"));
  const propertyImage = imageFromProperty(propertyRecord);
  const visibleOptions = options.filter((option) => membershipIds.includes(option.id));
  const canSwitch = visibleOptions.length > 1;
  const sidebar = placement === "sidebar";

  const handleSwitch = async (propertyId: string) => {
    if (propertyId === activePropertyId) {
      setAnchorEl(null);
      return;
    }
    setSwitchingId(propertyId);
    try {
      await onSwitch(propertyId);
      setAnchorEl(null);
    } finally {
      setSwitchingId(null);
    }
  };

  const identity = (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0, width: "100%" }}>
      <Avatar
        src={propertyImage}
        variant="rounded"
        sx={{
          bgcolor: "color-mix(in srgb, var(--mui-palette-primary-main) 12%, var(--mui-palette-background-paper))",
          color: "primary.main",
          height: sidebar ? 36 : 30,
          width: sidebar ? 36 : 30,
        }}
      >
        <ApartmentRoundedIcon sx={{ fontSize: sidebar ? 18 : 16 }} />
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {sidebar ? (
          <Typography color="text.secondary" noWrap sx={{ fontSize: ".6875rem", lineHeight: 1.2, mb: 0.2 }}>
            {t("Current property", "Biashara ya sasa")}
          </Typography>
        ) : null}
        <Typography
          noWrap
          sx={{
            fontSize: sidebar ? ".875rem" : { xs: ".8125rem", sm: ".875rem" },
            fontWeight: 700,
            letterSpacing: "-.01em",
            lineHeight: 1.25,
            maxWidth: sidebar ? 150 : { xs: "min(42vw, 164px)", sm: 260 },
          }}
        >
          {propertyName}
        </Typography>
      </Box>
      {canSwitch ? (
        <ExpandMoreRoundedIcon sx={{ color: "text.secondary", flexShrink: 0, fontSize: 18 }} />
      ) : null}
    </Stack>
  );

  return (
    <>
      {canSwitch ? (
        <ButtonBase
          aria-controls={anchorEl ? "property-switcher-menu" : undefined}
          aria-expanded={Boolean(anchorEl)}
          aria-haspopup="menu"
          aria-label={t("Switch property", "Badili biashara")}
          onClick={(event) => setAnchorEl(event.currentTarget)}
          sx={{
            borderRadius: 1,
            maxWidth: sidebar ? "100%" : { xs: "100%", sm: 360 },
            minHeight: sidebar ? 48 : 38,
            minWidth: 0,
            px: sidebar ? 0.75 : 0.25,
            py: 0.4,
            textAlign: "left",
            width: sidebar ? "100%" : "auto",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          {identity}
        </ButtonBase>
      ) : (
        <Box
          aria-label={propertyName}
          sx={{
            maxWidth: sidebar ? "100%" : { xs: "100%", sm: 360 },
            minHeight: sidebar ? 48 : 38,
            minWidth: 0,
            px: sidebar ? 0.75 : 0.25,
            py: 0.4,
            width: sidebar ? "100%" : "auto",
          }}
        >
          {identity}
        </Box>
      )}

      <Menu
        id="property-switcher-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              maxWidth: 360,
              minWidth: { xs: "min(90vw, 300px)", sm: 300 },
              mt: 0.5,
            },
          },
        }}
      >
        <Box sx={{ px: 1.25, pb: 0.75, pt: 0.5 }}>
          <Typography color="text.secondary" variant="caption" sx={{ fontWeight: 700 }}>
            {t("Your properties", "Biashara zako")}
          </Typography>
        </Box>
        {visibleOptions.map((option) => {
          const selected = option.id === activePropertyId;
          const switching = option.id === switchingId;
          return (
            <MenuItem
              key={option.id}
              selected={selected}
              disabled={Boolean(switchingId)}
              onClick={() => void handleSwitch(option.id)}
              sx={{ minHeight: 60, py: 0.75 }}
            >
              <ListItemIcon sx={{ minWidth: 42 }}>
                <Avatar
                  src={option.image}
                  variant="rounded"
                  sx={{ bgcolor: "action.selected", color: "primary.main", height: 32, width: 32 }}
                >
                  <ApartmentRoundedIcon sx={{ fontSize: 16 }} />
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary={option.name}
                secondary={option.address || option.role?.replaceAll("_", " ")}
                slotProps={{
                  primary: { noWrap: true, sx: { fontWeight: selected ? 700 : 500 } },
                  secondary: { noWrap: true, sx: { textTransform: option.address ? "none" : "capitalize" } },
                }}
              />
              {switching ? (
                <CircularProgress size={18} sx={{ ml: 1 }} />
              ) : selected ? (
                <CheckRoundedIcon color="primary" fontSize="small" sx={{ ml: 1 }} />
              ) : null}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
