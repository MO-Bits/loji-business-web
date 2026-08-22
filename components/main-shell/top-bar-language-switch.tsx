"use client";

import TranslateRoundedIcon from "@mui/icons-material/TranslateRounded";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { useLanguage } from "@/components/providers/language-provider";

export function TopBarLanguageSwitch() {
  const { language, setLanguage, t } = useLanguage();
  const nextLanguage = language === "en" ? "sw" : "en";

  return (
    <ButtonBase
      aria-label={t("Change language", "Badili lugha")}
      onClick={() => setLanguage(nextLanguage)}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        flexShrink: 0,
        minHeight: 36,
        px: { xs: 1, sm: 1.15 },
        py: 0.5,
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Stack direction="row" spacing={0.55} sx={{ alignItems: "center" }}>
        <TranslateRoundedIcon sx={{ color: "text.secondary", fontSize: 17 }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="span"
            sx={{
              display: { xs: "none", sm: "inline" },
              fontSize: ".72rem",
              fontWeight: 700,
              mr: 0.35,
            }}
          >
            {language === "en" ? "EN" : "SW"}
          </Typography>
          <Typography
            component="span"
            color="text.secondary"
            sx={{
              display: { xs: "inline", sm: "none" },
              fontSize: ".72rem",
              fontWeight: 800,
              letterSpacing: ".02em",
            }}
          >
            {language === "en" ? "SW" : "EN"}
          </Typography>
          <Typography
            component="span"
            color="text.secondary"
            sx={{
              display: { xs: "none", sm: "inline" },
              fontSize: ".72rem",
              fontWeight: 700,
            }}
          >
            / {language === "en" ? "SW" : "EN"}
          </Typography>
        </Box>
      </Stack>
    </ButtonBase>
  );
}
