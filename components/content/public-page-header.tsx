"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import TranslateRoundedIcon from "@mui/icons-material/TranslateRounded";
import {
  Box,
  Button,
  Container,
  MenuItem,
  Select,
  Stack,
} from "@mui/material";
import Link from "next/link";

import { useLanguage } from "@/components/providers/language-provider";
import { BrandLockup } from "@/components/shared/brand-lockup";
import { ThemeModeSelect } from "@/components/shared/theme-mode-select";

export function PublicPageHeader() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <Box
      component="header"
      sx={{
        backdropFilter: "blur(16px)",
        bgcolor: "rgba(var(--mui-palette-background-defaultChannel) / .88)",
        borderBottom: "1px solid",
        borderColor: "divider",
        position: "sticky",
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar,
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            height: { xs: 58, sm: 64 },
            justifyContent: "space-between",
          }}
        >
          <BrandLockup
            priority
            symbolSize={28}
            textSize={{ xs: ".92rem", sm: "1rem" }}
          />

          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            <Button
              component={Link}
              href="/login"
              color="inherit"
              size="small"
              startIcon={<ArrowBackRoundedIcon />}
              sx={{
                display: { xs: "none", sm: "inline-flex" },
                fontWeight: 500,
              }}
            >
              {t("Sign in", "Ingia")}
            </Button>
            <ThemeModeSelect compact />
            <TranslateRoundedIcon
              aria-hidden
              sx={{
                color: "text.secondary",
                display: { xs: "none", md: "block" },
                fontSize: 17,
              }}
            />
            <Select
              value={language}
              onChange={(event) =>
                setLanguage(event.target.value as "en" | "sw")
              }
              size="small"
              inputProps={{ "aria-label": t("Language", "Lugha") }}
              sx={{
                fontSize: ".73rem",
                fontWeight: 700,
                minWidth: 62,
                "& .MuiSelect-select": { py: .65 },
              }}
            >
              <MenuItem value="sw">SW</MenuItem>
              <MenuItem value="en">EN</MenuItem>
            </Select>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
