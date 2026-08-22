"use client";

import { useEffect, useState } from "react";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import SettingsBrightnessRoundedIcon from "@mui/icons-material/SettingsBrightnessRounded";
import {
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { useColorScheme } from "@mui/material/styles";

import { useLanguage } from "@/components/providers/language-provider";

type ThemeMode = "light" | "dark" | "system";

function ModeIcon({ mode }: { mode: ThemeMode }) {
  if (mode === "light") return <LightModeRoundedIcon fontSize="small" />;
  if (mode === "dark") return <DarkModeRoundedIcon fontSize="small" />;
  return <SettingsBrightnessRoundedIcon fontSize="small" />;
}

export function ThemeModeSelect({ compact = false }: { compact?: boolean }) {
  const { mode, setMode } = useColorScheme();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const value: ThemeMode =
    mounted && (mode === "light" || mode === "dark" || mode === "system")
      ? mode
      : "system";

  const labels: Record<ThemeMode, string> = {
    light: t("Light", "Mwanga"),
    dark: t("Dark", "Giza"),
    system: t("System", "Mfumo"),
  };

  return (
    <Select
      disabled={!mounted}
      value={value}
      onChange={(event) => setMode(event.target.value as ThemeMode)}
      size="small"
      inputProps={{ "aria-label": t("Appearance", "Mwonekano") }}
      renderValue={(selected) => {
        const selectedMode = selected as ThemeMode;
        return (
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
            <ModeIcon mode={selectedMode} />
            <Typography
              component="span"
              sx={{
                display: compact ? { xs: "none", sm: "inline" } : "inline",
                fontSize: ".78rem",
                fontWeight: 700,
              }}
            >
              {labels[selectedMode]}
            </Typography>
          </Stack>
        );
      }}
      sx={{
        bgcolor: "background.paper",
        minWidth: compact ? { xs: 48, sm: 100 } : 108,
        "& .MuiSelect-select": {
          alignItems: "center",
          display: "flex",
          minHeight: "auto !important",
          py: 0.75,
          pr: compact ? { xs: "26px !important", sm: "32px !important" } : undefined,
        },
      }}
    >
      {(["system", "light", "dark"] as ThemeMode[]).map((option) => (
        <MenuItem key={option} value={option}>
          <ListItemIcon sx={{ minWidth: 34 }}>
            <ModeIcon mode={option} />
          </ListItemIcon>
          <ListItemText primary={labels[option]} />
        </MenuItem>
      ))}
    </Select>
  );
}
