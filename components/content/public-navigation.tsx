"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import TranslateRoundedIcon from "@mui/icons-material/TranslateRounded";
import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Link,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";

import { useLanguage } from "@/components/providers/language-provider";
import { BrandLockup } from "@/components/shared/brand-lockup";
import { ThemeModeSelect } from "@/components/shared/theme-mode-select";

const publicPaths = ["/login", "/learn-more", "/faq", "/terms", "/privacy"] as const;

export function PublicNavigation() {
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isPublicPage = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!isPublicPage) return null;

  const items = [
    { href: "/login", label: t("Login", "Ingia") },
    { href: "/learn-more", label: t("About", "Kuhusu") },
    { href: "/faq", label: t("FAQs", "Maswali") },
    { href: "/terms", label: t("Terms", "Masharti") },
    { href: "/privacy", label: t("Privacy Policy", "Sera ya faragha") },
  ];

  const toggleLanguage = () => setLanguage(language === "en" ? "sw" : "en");

  return (
    <>
      <Box
        component="header"
        sx={{
          alignItems: "center",
          backdropFilter: "saturate(150%) blur(14px)",
          bgcolor: "color-mix(in srgb, var(--mui-palette-background-paper) 94%, transparent)",
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          height: 64,
          left: 0,
          px: { xs: 2, sm: 3.5 },
          position: "fixed",
          right: 0,
          top: 0,
          width: "100%",
          zIndex: (theme) => theme.zIndex.appBar,
        }}
      >
        <Link
          aria-label={t("Loji Business home", "Nyumbani Loji Business")}
          component={NextLink}
          href="/login"
          sx={{ display: "inline-flex", flexShrink: 0 }}
          underline="none"
        >
          <BrandLockup priority symbolSize={30} textSize={{ xs: ".96rem", sm: "1rem" }} />
        </Link>

        <Stack
          component="nav"
          direction="row"
          spacing={0.15}
          sx={{
            alignItems: "center",
            display: { xs: "none", md: "flex" },
            ml: "auto",
          }}
        >
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Button
                aria-current={active ? "page" : undefined}
                color="inherit"
                component={NextLink}
                href={item.href}
                key={item.href}
                sx={{
                  color: active ? "text.primary" : "text.secondary",
                  fontSize: ".82rem",
                  fontWeight: active ? 700 : 550,
                  minHeight: 38,
                  px: 1.35,
                  position: "relative",
                  "&::after": active
                    ? {
                        bgcolor: "primary.main",
                        borderRadius: 99,
                        bottom: 1,
                        content: '""',
                        height: 2,
                        left: 14,
                        position: "absolute",
                        right: 14,
                      }
                    : undefined,
                }}
              >
                {item.label}
              </Button>
            );
          })}
        </Stack>

        <Stack
          direction="row"
          spacing={0.65}
          sx={{ alignItems: "center", display: { xs: "none", md: "flex" }, ml: 1.75 }}
        >
          <ThemeModeSelect compact />
          <TranslateRoundedIcon aria-hidden sx={{ color: "text.secondary", fontSize: 17 }} />
          <Select
            value={language}
            onChange={(event) => setLanguage(event.target.value as "en" | "sw")}
            size="small"
            inputProps={{ "aria-label": t("Language", "Lugha") }}
            sx={{
              bgcolor: "background.paper",
              borderRadius: 1,
              fontSize: ".75rem",
              fontWeight: 700,
              minWidth: 64,
              "& .MuiSelect-select": { py: 0.7 },
            }}
          >
            <MenuItem value="en">EN</MenuItem>
            <MenuItem value="sw">SW</MenuItem>
          </Select>
        </Stack>

        <Stack
          direction="row"
          spacing={0.25}
          sx={{ alignItems: "center", display: { xs: "flex", md: "none" }, ml: "auto" }}
        >
          <Button
            aria-label={t("Change language", "Badili lugha")}
            onClick={toggleLanguage}
            color="inherit"
            size="small"
            startIcon={<TranslateRoundedIcon sx={{ fontSize: "17px !important" }} />}
            sx={{
              color: "text.secondary",
              fontSize: ".76rem",
              fontWeight: 750,
              minHeight: 40,
              minWidth: 0,
              px: 1,
            }}
          >
            {language === "en" ? "SW" : "EN"}
          </Button>
          <IconButton
            aria-label={t("Open navigation", "Fungua menyu")}
            onClick={() => setMobileOpen(true)}
          >
            <MenuRoundedIcon />
          </IconButton>
        </Stack>
      </Box>

      <Box aria-hidden sx={{ height: 64 }} />

      <Drawer
        anchor="right"
        onClose={() => setMobileOpen(false)}
        open={mobileOpen}
        slotProps={{
          paper: {
            sx: {
              p: 2,
              width: "min(88vw, 330px)",
            },
          },
        }}
      >
        <BrandLockup priority symbolSize={30} textSize="1rem" />
        <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
          {t(
            "Hospitality operations, kept simple.",
            "Usimamizi wa malazi, kwa urahisi.",
          )}
        </Typography>
        <Divider sx={{ my: 2 }} />

        <List component="nav" disablePadding>
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <ListItemButton
                aria-current={active ? "page" : undefined}
                component={NextLink}
                href={item.href}
                key={item.href}
                onClick={() => setMobileOpen(false)}
                selected={active}
                sx={{ mb: 0.4, minHeight: 46, px: 1.5 }}
              >
                <ListItemText
                  primary={item.label}
                  slotProps={{
                    primary: {
                      fontSize: ".9rem",
                      fontWeight: active ? 700 : 550,
                    },
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>

        <Box sx={{ flex: 1 }} />
        <Divider sx={{ my: 2 }} />
        <Typography
          color="text.secondary"
          sx={{ fontSize: ".7rem", fontWeight: 750, letterSpacing: ".06em", mb: 1.25 }}
        >
          {t("PREFERENCES", "MAPENDELEO")}
        </Typography>
        <Stack spacing={1.25}>
          <ThemeModeSelect />
          <Select
            fullWidth
            value={language}
            onChange={(event) => setLanguage(event.target.value as "en" | "sw")}
            size="small"
            inputProps={{ "aria-label": t("Language", "Lugha") }}
          >
            <MenuItem value="en">English</MenuItem>
            <MenuItem value="sw">Kiswahili</MenuItem>
          </Select>
        </Stack>
      </Drawer>
    </>
  );
}
