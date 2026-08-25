"use client";

import NextLink from "next/link";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import TranslateRoundedIcon from "@mui/icons-material/TranslateRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Drawer,
  IconButton,
  Link,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";

import { useLanguage } from "@/components/providers/language-provider";
import { BrandLockup } from "@/components/shared/brand-lockup";
import { ThemeModeSelect } from "@/components/shared/theme-mode-select";
import { useAuthController } from "@/features/auth/hooks/use-auth-controller";

import { GoogleMark } from "./google-mark";

export function LoginScreen() {
  const auth = useAuthController();
  const { language, setLanguage, t } = useLanguage();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navItems = [
    { href: "#login", label: t("Login", "Ingia") },
    { href: "/learn-more", label: t("About", "Kuhusu") },
    { href: "/terms", label: t("Terms", "Masharti") },
    { href: "/privacy", label: t("Privacy Policy", "Sera ya faragha") },
  ];

  return (
    <Box
      component="main"
      sx={{
        bgcolor: "background.default",
        minHeight: "100dvh",
      }}
    >
      <Container
        maxWidth={false}
        sx={{
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          minHeight: "100dvh",
          px: { xs: 2.25, sm: 3.5 },
          pb: { xs: 2, sm: 2.5 },
          pt: { xs: "74px", md: "82px" },
        }}
      >
        <Stack
          component="header"
          direction="row"
          sx={{
            alignItems: "center",
            bgcolor: "rgba(var(--mui-palette-background-defaultChannel) / .88)",
            borderBottom: 1,
            borderColor: "divider",
            gap: 2,
            justifyContent: "space-between",
            minHeight: { xs: 58, md: 64 },
            left: 0,
            px: { xs: 2.25, sm: 3.5 },
            position: "fixed",
            right: 0,
            top: 0,
            width: "100%",
            zIndex: (theme) => theme.zIndex.appBar,
            backdropFilter: "blur(18px)",
          }}
        >
          <Link
            aria-label={t("Loji Business home", "Nyumbani Loji Business")}
            component={NextLink}
            href="/"
            sx={{ display: "inline-flex", flexShrink: 0 }}
            underline="none"
          >
            <BrandLockup
              priority
              symbolSize={30}
              textSize={{ xs: ".96rem", sm: "1rem" }}
            />
          </Link>

          <Stack
            component="nav"
            direction="row"
            spacing={0.25}
            sx={{
              alignItems: "center",
              display: { xs: "none", md: "flex" },
              ml: "auto",
            }}
          >
            {navItems.map((item) => (
              <Button
                color="inherit"
                component={NextLink}
                href={item.href}
                key={item.href}
                sx={{
                  color: item.href === "#login" ? "text.primary" : "text.secondary",
                  fontSize: ".82rem",
                  minHeight: 38,
                  px: 1.4,
                }}
              >
                {item.label}
              </Button>
            ))}
          </Stack>

          <Stack
            direction="row"
            spacing={0.75}
            sx={{ alignItems: "center", display: { xs: "none", md: "flex" } }}
          >
            <ThemeModeSelect compact />
            <TranslateRoundedIcon
              aria-hidden
              sx={{ color: "text.secondary", fontSize: 17 }}
            />
            <Select
              value={language}
              onChange={(event) =>
                setLanguage(event.target.value as "en" | "sw")
              }
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

          <IconButton
            aria-label={t("Open navigation", "Fungua menyu")}
            onClick={() => setMobileNavOpen(true)}
            sx={{ display: { md: "none" } }}
          >
            <MenuRoundedIcon />
          </IconButton>
        </Stack>

        <Drawer
          anchor="right"
          onClose={() => setMobileNavOpen(false)}
          open={mobileNavOpen}
          slotProps={{
            paper: {
              sx: {
                p: 2,
                width: "min(86vw, 320px)",
              },
            },
          }}
        >
          <BrandLockup priority symbolSize={30} textSize="1rem" />
          <Divider sx={{ my: 2 }} />

          <List component="nav" disablePadding>
            {navItems.map((item) => (
              <ListItemButton
                component={NextLink}
                href={item.href}
                key={item.href}
                onClick={() => setMobileNavOpen(false)}
                sx={{ mb: 0.5, minHeight: 46 }}
              >
                <ListItemText
                  primary={item.label}
                  slotProps={{
                    primary: {
                      fontSize: ".9rem",
                      fontWeight: item.href === "#login" ? 700 : 500,
                    },
                  }}
                />
              </ListItemButton>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />
          <Typography
            color="text.secondary"
            sx={{ fontSize: ".7rem", fontWeight: 700, mb: 1.25 }}
          >
            {t("PREFERENCES", "MAPENDELEO")}
          </Typography>
          <Stack spacing={1.25}>
            <ThemeModeSelect />
            <Select
              fullWidth
              value={language}
              onChange={(event) =>
                setLanguage(event.target.value as "en" | "sw")
              }
              size="small"
              inputProps={{ "aria-label": t("Language", "Lugha") }}
            >
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="sw">Kiswahili</MenuItem>
            </Select>
          </Stack>
        </Drawer>

        <Box
          id="login"
          sx={{
            alignItems: "center",
            display: "flex",
            justifyContent: "center",
            py: { xs: 5, sm: 7 },
          }}
        >
          <Stack
            component="section"
            spacing={3.5}
            sx={{
              maxWidth: 420,
              textAlign: "center",
              width: "100%",
            }}
          >
            <Box>
              <Typography
                component="h1"
                sx={{
                  color: "text.primary",
                  fontSize: { xs: "2rem", sm: "2.4rem" },
                  fontWeight: 700,
                  letterSpacing: "-.045em",
                  lineHeight: 1.08,
                }}
              >
                {t("Welcome back", "Karibu tena")}
              </Typography>
              <Typography
                color="text.secondary"
                sx={{
                  fontSize: { xs: ".95rem", sm: "1rem" },
                  lineHeight: 1.65,
                  mt: 1.25,
                }}
              >
                {t(
                  "Sign in to manage your property.",
                  "Ingia ili kusimamia jengo lako.",
                )}
              </Typography>
            </Box>

            <Button
              disabled={auth.loading}
              fullWidth
              onClick={() => void auth.signInWithGoogle()}
              size="large"
              startIcon={
                auth.loading ? (
                  <CircularProgress color="inherit" size={19} />
                ) : (
                  <GoogleMark />
                )
              }
              sx={{
                bgcolor: "background.paper",
                borderColor: "divider",
                borderRadius: 1,
                color: "text.primary",
                fontSize: ".92rem",
                fontWeight: 600,
                minHeight: 52,
                textTransform: "none",
                transition:
                  "border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease",
                "&:hover": {
                  bgcolor: "action.hover",
                  borderColor: "text.secondary",
                  boxShadow: "0 4px 14px rgba(15, 23, 42, .06)",
                },
              }}
              variant="outlined"
            >
              {auth.loading
                ? t("Signing in…", "Inaingia…")
                : t("Continue with Google", "Endelea na Google")}
            </Button>

            <Typography
              color="text.secondary"
              variant="caption"
              sx={{ lineHeight: 1.65, px: { xs: 1, sm: 2 } }}
            >
              {t("By continuing, you agree to the", "Kwa kuendelea, unakubali")}{" "}
              <Link
                component={NextLink}
                href="/terms"
                underline="hover"
                sx={{ color: "text.primary", fontWeight: 600 }}
              >
                {t("Terms", "Masharti")}
              </Link>{" "}
              {t("and", "na")}{" "}
              <Link
                component={NextLink}
                href="/privacy"
                underline="hover"
                sx={{ color: "text.primary", fontWeight: 600 }}
              >
                {t("Privacy Policy", "Sera ya faragha")}
              </Link>
              .
            </Typography>

            <Link
              component={NextLink}
              href="/learn-more"
              underline="hover"
              sx={{
                alignSelf: "center",
                color: "text.secondary",
                fontSize: ".78rem",
                fontWeight: 600,
              }}
            >
              {t("Learn more", "Fahamu zaidi")}
            </Link>
          </Stack>
        </Box>

        <Typography
          color="text.secondary"
          component="footer"
          sx={{
            fontSize: ".72rem",
            pb: { xs: 0.5, sm: 0 },
            textAlign: "center",
          }}
        >
          © {new Date().getFullYear()} Loji
        </Typography>
      </Container>

      <Snackbar
        anchorOrigin={{ horizontal: "center", vertical: "bottom" }}
        autoHideDuration={6000}
        onClose={auth.clearError}
        open={Boolean(auth.error)}
      >
        <Alert onClose={auth.clearError} severity="error" variant="filled">
          {auth.error}
        </Alert>
      </Snackbar>
    </Box>
  );
}
