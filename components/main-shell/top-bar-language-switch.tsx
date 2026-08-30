"use client";

import TranslateRoundedIcon from "@mui/icons-material/TranslateRounded";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { useLanguage } from "@/components/providers/language-provider";

export function TopBarLanguageSwitch({
  compact = false,
  fullWidth = false,
}: {
  compact?: boolean;
  fullWidth?: boolean;
}) {
  const { language, setLanguage, t } = useLanguage();
  const nextLanguage = language === "en" ? "sw" : "en";
  const currentLabel = language === "en" ? "English" : "Kiswahili";

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
        px: compact ? 1 : 1.25,
        py: 0.5,
        width: fullWidth ? "100%" : "auto",
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Stack direction="row" spacing={0.7} sx={{ alignItems: "center", minWidth: 0, width: "100%" }}>
        <TranslateRoundedIcon sx={{ color: "text.secondary", flexShrink: 0, fontSize: 17 }} />
        <Typography
          component="span"
          noWrap
          sx={{
            flex: fullWidth ? 1 : "initial",
            fontSize: ".75rem",
            fontWeight: 500,
            textAlign: "left",
          }}
        >
          {compact ? language.toUpperCase() : currentLabel}
        </Typography>
        <Box
          component="span"
          sx={{
            color: "text.secondary",
            fontSize: ".6875rem",
            fontWeight: 700,
            ml: fullWidth ? "auto !important" : undefined,
          }}
        >
          {nextLanguage.toUpperCase()}
        </Box>
      </Stack>
    </ButtonBase>
  );
}
