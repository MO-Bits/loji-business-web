"use client";

import { useEffect, useState, type ReactNode } from "react";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import SettingsBrightnessRoundedIcon from "@mui/icons-material/SettingsBrightnessRounded";
import TranslateRoundedIcon from "@mui/icons-material/TranslateRounded";
import {
  Box,
  Chip,
  FormControl,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";
import { useColorScheme } from "@mui/material/styles";

import {
  type AppLanguage,
  useLanguage,
} from "@/components/providers/language-provider";

import {
  BackToSettingsButton,
  SettingsPageHeader,
  SettingsSection,
} from "./settings-shared";

type ThemeMode = "light" | "dark" | "system";

export function AppearanceSettingsScreen() {
  const { mode, setMode, systemMode } = useColorScheme();
  const { language, setLanguage, t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const selectedMode: ThemeMode =
    mounted && (mode === "light" || mode === "dark" || mode === "system")
      ? mode
      : "system";

  const modeOptions: Array<{
    description: string;
    icon: ReactNode;
    label: string;
    value: ThemeMode;
  }> = [
    {
      description: t("Bright surfaces and high contrast.", "Mandhari angavu yenye utofauti mzuri."),
      icon: <LightModeRoundedIcon />,
      label: t("Light", "Mwanga"),
      value: "light",
    },
    {
      description: t("Comfortable in low-light spaces.", "Rafiki kwa macho kwenye mwanga hafifu."),
      icon: <DarkModeRoundedIcon />,
      label: t("Dark", "Giza"),
      value: "dark",
    },
    {
      description: t(
        `Match this device${systemMode ? ` · currently ${systemMode}` : ""}.`,
        `Fuata kifaa hiki${systemMode ? ` · sasa ni ${systemMode === "dark" ? "giza" : "mwanga"}` : ""}.`,
      ),
      icon: <SettingsBrightnessRoundedIcon />,
      label: t("System", "Mfumo"),
      value: "system",
    },
  ];

  const languageOptions: Array<{
    description: string;
    icon: ReactNode;
    label: string;
    value: AppLanguage;
  }> = [
    {
      description: t(
        "Use Loji Business in Swahili, the default language.",
        "Tumia Loji Business kwa Kiswahili, lugha ya chaguo-msingi.",
      ),
      icon: <TranslateRoundedIcon />,
      label: "Kiswahili",
      value: "sw",
    },
    {
      description: t(
        "Use Loji Business in English.",
        "Tumia Loji Business kwa Kiingereza.",
      ),
      icon: <LanguageRoundedIcon />,
      label: t("English", "Kiingereza"),
      value: "en",
    },
  ];

  return (
    <Stack spacing={{ xs: 2.5, sm: 3 }}>
      <SettingsPageHeader
        action={<BackToSettingsButton />}
        description={t(
          "Choose a comfortable theme and the language used across the application.",
          "Chagua mandhari unayoipenda na lugha inayotumika kwenye programu nzima.",
        )}
        icon={<DarkModeRoundedIcon />}
        title={t("Appearance", "Mwonekano")}
      />

      <SettingsSection
        action={
          <Chip
            color="success"
            icon={<CheckCircleRoundedIcon />}
            label={t("Saved automatically", "Inahifadhiwa moja kwa moja")}
            size="small"
            variant="outlined"
          />
        }
        description={t(
          "The selection is remembered on this browser.",
          "Chaguo lako linakumbukwa kwenye kivinjari hiki.",
        )}
        title={t("Color theme", "Mandhari ya rangi")}
      >
        <FormControl disabled={!mounted} fullWidth sx={{ p: { xs: 2, sm: 2.5 } }}>
          <RadioGroup
            aria-label={t("Color theme", "Mandhari ya rangi")}
            name="theme-mode"
            onChange={(event) => setMode(event.target.value as ThemeMode)}
            value={selectedMode}
          >
            <Box
              sx={{
                display: "grid",
                gap: 1.5,
                gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(3, minmax(0, 1fr))" },
              }}
            >
              {modeOptions.map((option) => (
                <AppearanceOption
                  description={option.description}
                  icon={option.icon}
                  key={option.value}
                  label={option.label}
                  selected={selectedMode === option.value}
                  value={option.value}
                />
              ))}
            </Box>
          </RadioGroup>
        </FormControl>
      </SettingsSection>

      <SettingsSection
        action={
          <Chip
            color="success"
            icon={<CheckCircleRoundedIcon />}
            label={t("Saved automatically", "Inahifadhiwa moja kwa moja")}
            size="small"
            variant="outlined"
          />
        }
        description={t(
          "Navigation, actions, and supporting copy update immediately.",
          "Menyu, vitendo na maelezo hubadilika mara moja.",
        )}
        title={t("Language", "Lugha")}
      >
        <FormControl fullWidth sx={{ p: { xs: 2, sm: 2.5 } }}>
          <RadioGroup
            aria-label={t("Application language", "Lugha ya programu")}
            name="application-language"
            onChange={(event) => setLanguage(event.target.value as AppLanguage)}
            value={language}
          >
            <Box
              sx={{
                display: "grid",
                gap: 1.5,
                gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" },
              }}
            >
              {languageOptions.map((option) => (
                <AppearanceOption
                  description={option.description}
                  icon={option.icon}
                  key={option.value}
                  label={option.label}
                  selected={language === option.value}
                  value={option.value}
                />
              ))}
            </Box>
          </RadioGroup>
        </FormControl>
      </SettingsSection>
    </Stack>
  );
}

function AppearanceOption({
  description,
  icon,
  label,
  selected,
  value,
}: {
  description: string;
  icon: ReactNode;
  label: string;
  selected: boolean;
  value: string;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        borderColor: selected ? "primary.main" : "divider",
        boxShadow: selected ? "0 0 0 1px var(--mui-palette-primary-main)" : "none",
        minWidth: 0,
        overflow: "hidden",
        transition: "border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease",
      }}
    >
      <FormControlLabel
        control={<Radio value={value} />}
        label={
          <Stack spacing={0.6} sx={{ minWidth: 0, py: 1.5 }}>
            <Box sx={{ color: selected ? "primary.main" : "text.secondary", display: "flex" }}>
              {icon}
            </Box>
            <Typography sx={{ fontWeight: 700 }} variant="body2">
              {label}
            </Typography>
            <Typography color="text.secondary" variant="caption">
              {description}
            </Typography>
          </Stack>
        }
        sx={{
          alignItems: "flex-start",
          m: 0,
          minHeight: 132,
          px: 1.25,
          width: "100%",
          ".MuiRadio-root": { mt: 1 },
          ".MuiFormControlLabel-label": { flex: 1, minWidth: 0 },
        }}
      />
    </Paper>
  );
}
