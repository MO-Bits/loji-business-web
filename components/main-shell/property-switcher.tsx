"use client";

import { useEffect, useMemo, useState } from "react";
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
import { createClient } from "@/lib/supabase/client";

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
  id: string;
  name: string;
  role?: string;
};

type PropertySwitcherProps = {
  activePropertyId?: string;
  memberships: Membership[];
  property?: Property | null;
  onSwitch: (propertyId: string) => Promise<void>;
};

export function PropertySwitcher({
  activePropertyId,
  memberships,
  property,
  onSwitch,
}: PropertySwitcherProps) {
  const { t } = useLanguage();
  const client = useMemo(() => createClient(), []);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [options, setOptions] = useState<PropertyOption[]>([]);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const membershipIds = useMemo(
    () =>
      memberships
        .map((membership) => membership.property_id)
        .filter((id): id is string => Boolean(id)),
    [memberships],
  );

  useEffect(() => {
    if (!membershipIds.length) return;

    let cancelled = false;
    void client
      .from("properties")
      .select("id,name")
      .in("id", membershipIds)
      .then(({ data }) => {
        if (cancelled) return;
        const nameById = new Map(
          (data ?? []).map((item) => [
            String(item.id),
            String(item.name ?? "Property"),
          ]),
        );
        const nextOptions = memberships
          .filter(
            (item): item is Membership & { property_id: string } =>
              Boolean(item.property_id),
          )
          .map((item) => ({
            id: item.property_id,
            name: nameById.get(item.property_id) ?? t("Property", "Jengo"),
            role: item.role,
          }));
        setOptions(nextOptions);
      });

    return () => {
      cancelled = true;
    };
  }, [client, membershipIds, memberships, t]);

  const propertyRecord = property as Record<string, unknown> | null | undefined;
  const propertyName = String(property?.name ?? t("Property", "Jengo"));
  const propertyImage = imageFromProperty(propertyRecord);
  const visibleOptions = options.filter((option) =>
    membershipIds.includes(option.id),
  );
  const canSwitch = visibleOptions.length > 1;

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
    <Stack
      direction="row"
      spacing={{ xs: 0.25, sm: 1 }}
      sx={{ alignItems: "center", justifyContent: "flex-start", minWidth: 0 }}
    >
      <Avatar
        src={propertyImage}
        variant="rounded"
        sx={{
          bgcolor: "primary.main",
          display: { xs: "none", sm: "flex" },
          height: { sm: 32, md: 34 },
          width: { sm: 32, md: 34 },
        }}
      >
        <ApartmentRoundedIcon sx={{ fontSize: 16 }} />
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          noWrap
          sx={{
            fontSize: { xs: ".875rem", sm: ".9375rem" },
            fontWeight: 700,
            letterSpacing: "-.012em",
            lineHeight: 1.25,
            maxWidth: { xs: "min(46vw, 180px)", sm: 320 },
          }}
        >
          {propertyName}
        </Typography>
      </Box>
      {canSwitch ? (
        <ExpandMoreRoundedIcon
          sx={{ color: "text.secondary", flexShrink: 0, fontSize: 18 }}
        />
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
          aria-label={t("Switch property", "Badili jengo")}
          onClick={(event) => setAnchorEl(event.currentTarget)}
          sx={{
            borderRadius: 1,
            maxWidth: { xs: "100%", sm: 420 },
            minWidth: 0,
            px: { xs: 0.25, sm: 0.5 },
            py: 0.5,
            textAlign: "left",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          {identity}
        </ButtonBase>
      ) : (
        <Box
          aria-label={propertyName}
          sx={{ maxWidth: { xs: "100%", sm: 420 }, minWidth: 0, px: 0.5 }}
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
              mt: 0.75,
              minWidth: { xs: "min(88vw, 280px)", sm: 260 },
              maxWidth: 340,
            },
          },
        }}
      >
        <Box sx={{ px: 1.5, pb: 0.75, pt: 0.5 }}>
          <Typography color="text.secondary" variant="caption" sx={{ fontWeight: 700 }}>
            {t("Select property", "Chagua jengo")}
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
              sx={{ minHeight: 52 }}
            >
              <ListItemIcon sx={{ minWidth: 34 }}>
                {switching ? (
                  <CircularProgress size={18} />
                ) : selected ? (
                  <CheckRoundedIcon color="primary" fontSize="small" />
                ) : (
                  <ApartmentRoundedIcon color="action" fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={option.name}
                secondary={
                  option.role ? option.role.replaceAll("_", " ") : undefined
                }
                slotProps={{
                  primary: {
                    noWrap: true,
                    sx: { fontWeight: selected ? 700 : 500 },
                  },
                  secondary: { sx: { textTransform: "capitalize" } },
                }}
              />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
