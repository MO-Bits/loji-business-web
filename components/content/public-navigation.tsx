"use client";

import { useState } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
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
  Menu,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";

import { useLanguage } from "@/components/providers/language-provider";
import { BrandLockup } from "@/components/shared/brand-lockup";
import { ThemeModeSelect } from "@/components/shared/theme-mode-select";

type PublicItem = {
  href: string;
  label: [english: string, swahili: string];
};

const publicPaths = [
  "/login",
  "/learn-more",
  "/features",
  "/solutions",
  "/how-it-works",
  "/faq",
  "/security",
  "/help",
  "/contact",
  "/whats-new",
  "/terms",
  "/privacy",
  "/data-deletion",
] as const;

const productItems: PublicItem[] = [
  { href: "/features", label: ["Features", "Vipengele"] },
  { href: "/solutions", label: ["Solutions", "Suluhisho"] },
  {
    href: "/how-it-works",
    label: ["How it works", "Jinsi inavyofanya kazi"],
  },
];

const resourceItems: PublicItem[] = [
  { href: "/faq", label: ["FAQs", "Maswali"] },
  { href: "/security", label: ["Security", "Usalama"] },
  { href: "/help", label: ["Help centre", "Kituo cha msaada"] },
  { href: "/contact", label: ["Contact", "Mawasiliano"] },
  { href: "/whats-new", label: ["What’s new", "Maboresho mapya"] },
];

const legalItems: PublicItem[] = [
  { href: "/terms", label: ["Terms", "Masharti"] },
  { href: "/privacy", label: ["Privacy Policy", "Sera ya faragha"] },
  { href: "/data-deletion", label: ["Data deletion", "Ufutaji wa data"] },
];

function matchesPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PublicNavigation() {
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productAnchor, setProductAnchor] = useState<HTMLElement | null>(null);
  const [resourceAnchor, setResourceAnchor] = useState<HTMLElement | null>(null);

  const isPublicPage = publicPaths.some((path) => matchesPath(pathname, path));
  if (!isPublicPage) return null;

  const productActive = productItems.some((item) =>
    matchesPath(pathname, item.href),
  );
  const resourceActive = resourceItems.some((item) =>
    matchesPath(pathname, item.href),
  );
  const aboutActive = matchesPath(pathname, "/learn-more");
  const mobileItems: PublicItem[] = [
    { href: "/login", label: ["Login", "Ingia"] },
    { href: "/learn-more", label: ["About", "Kuhusu"] },
    ...productItems,
    ...resourceItems,
    ...legalItems,
  ];
  const toggleLanguage = () => setLanguage(language === "en" ? "sw" : "en");
  const primaryAction =
    pathname === "/login"
      ? { href: "/contact", label: t("Contact us", "Wasiliana nasi") }
      : { href: "/login", label: t("Sign in", "Ingia") };

  return (
    <>
      <Box
        component="header"
        sx={{
          alignItems: "center",
          backdropFilter: "saturate(150%) blur(14px)",
          bgcolor:
            "color-mix(in srgb, var(--mui-palette-background-paper) 94%, transparent)",
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          height: 64,
          left: 0,
          px: { xs: 2, sm: 3, lg: 4 },
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
          href="/learn-more"
          sx={{ display: "inline-flex", flexShrink: 0 }}
          underline="none"
        >
          <BrandLockup
            priority
            symbolSize={30}
            textSize={{ xs: ".9375rem", sm: "1rem" }}
          />
        </Link>

        <Stack
          aria-label={t("Public navigation", "Menyu ya umma")}
          component="nav"
          direction="row"
          spacing={0.25}
          sx={{
            alignItems: "center",
            display: { xs: "none", md: "flex" },
            ml: "auto",
          }}
        >
          <Button
            aria-current={aboutActive ? "page" : undefined}
            color="inherit"
            component={NextLink}
            href="/learn-more"
            sx={{
              color: aboutActive ? "text.primary" : "text.secondary",
              fontWeight: aboutActive ? 700 : 500,
              minHeight: 40,
              px: 1.25,
            }}
          >
            {t("About", "Kuhusu")}
          </Button>

          <Button
            aria-controls={productAnchor ? "public-product-menu" : undefined}
            aria-expanded={Boolean(productAnchor)}
            aria-haspopup="menu"
            color="inherit"
            endIcon={<ExpandMoreRoundedIcon sx={{ fontSize: 17 }} />}
            onClick={(event) => setProductAnchor(event.currentTarget)}
            sx={{
              color: productActive ? "text.primary" : "text.secondary",
              fontWeight: productActive ? 700 : 500,
              minHeight: 40,
              px: 1.25,
            }}
          >
            {t("Product", "Bidhaa")}
          </Button>
          <Menu
            id="public-product-menu"
            anchorEl={productAnchor}
            open={Boolean(productAnchor)}
            onClose={() => setProductAnchor(null)}
          >
            {productItems.map((item) => (
              <MenuItem
                aria-current={
                  matchesPath(pathname, item.href) ? "page" : undefined
                }
                component={NextLink}
                href={item.href}
                key={item.href}
                onClick={() => setProductAnchor(null)}
                selected={matchesPath(pathname, item.href)}
              >
                {t(...item.label)}
              </MenuItem>
            ))}
          </Menu>

          <Button
            aria-controls={
              resourceAnchor ? "public-resource-menu" : undefined
            }
            aria-expanded={Boolean(resourceAnchor)}
            aria-haspopup="menu"
            color="inherit"
            endIcon={<ExpandMoreRoundedIcon sx={{ fontSize: 17 }} />}
            onClick={(event) => setResourceAnchor(event.currentTarget)}
            sx={{
              color: resourceActive ? "text.primary" : "text.secondary",
              fontWeight: resourceActive ? 700 : 500,
              minHeight: 40,
              px: 1.25,
            }}
          >
            {t("Resources", "Rasilimali")}
          </Button>
          <Menu
            id="public-resource-menu"
            anchorEl={resourceAnchor}
            open={Boolean(resourceAnchor)}
            onClose={() => setResourceAnchor(null)}
          >
            {resourceItems.map((item) => (
              <MenuItem
                aria-current={
                  matchesPath(pathname, item.href) ? "page" : undefined
                }
                component={NextLink}
                href={item.href}
                key={item.href}
                onClick={() => setResourceAnchor(null)}
                selected={matchesPath(pathname, item.href)}
              >
                {t(...item.label)}
              </MenuItem>
            ))}
          </Menu>
        </Stack>

        <Stack
          direction="row"
          spacing={0.75}
          sx={{
            alignItems: "center",
            display: { xs: "none", md: "flex" },
            ml: 1.5,
          }}
        >
          <ThemeModeSelect compact />
          <Select
            inputProps={{ "aria-label": t("Language", "Lugha") }}
            onChange={(event) =>
              setLanguage(event.target.value as "en" | "sw")
            }
            size="small"
            sx={{
              bgcolor: "background.paper",
              fontSize: ".75rem",
              fontWeight: 700,
              minWidth: 64,
              "& .MuiSelect-select": { py: 0.7 },
            }}
            value={language}
          >
            <MenuItem value="sw">SW</MenuItem>
            <MenuItem value="en">EN</MenuItem>
          </Select>
          <Button
            component={NextLink}
            href={primaryAction.href}
            variant="contained"
            sx={{ minHeight: 40, whiteSpace: "nowrap" }}
          >
            {primaryAction.label}
          </Button>
        </Stack>

        <Stack
          direction="row"
          spacing={0.25}
          sx={{
            alignItems: "center",
            display: { xs: "flex", md: "none" },
            ml: "auto",
          }}
        >
          <Button
            aria-label={t("Change language", "Badili lugha")}
            color="inherit"
            onClick={toggleLanguage}
            size="small"
            startIcon={
              <TranslateRoundedIcon sx={{ fontSize: "17px !important" }} />
            }
            sx={{
              color: "text.secondary",
              fontSize: ".75rem",
              fontWeight: 700,
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
              display: "flex",
              flexDirection: "column",
              p: 2,
              width: "min(88vw, 330px)",
            },
          },
        }}
      >
        <Stack
          direction="row"
          sx={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <BrandLockup priority symbolSize={30} textSize="1rem" />
          <IconButton
            aria-label={t("Close navigation", "Funga menyu")}
            onClick={() => setMobileOpen(false)}
          >
            <CloseRoundedIcon />
          </IconButton>
        </Stack>
        <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
          {t(
            "Hospitality operations, kept simple.",
            "Usimamizi wa malazi, kwa urahisi.",
          )}
        </Typography>
        <Divider sx={{ my: 2 }} />

        <List
          aria-label={t("Public navigation", "Menyu ya umma")}
          component="nav"
          disablePadding
          sx={{ flex: 1, overflowY: "auto" }}
        >
          {mobileItems.map((item) => {
            const active = matchesPath(pathname, item.href);
            return (
              <ListItemButton
                aria-current={active ? "page" : undefined}
                component={NextLink}
                href={item.href}
                key={item.href}
                onClick={() => setMobileOpen(false)}
                selected={active}
                sx={{ mb: 0.25, minHeight: 44, px: 1.5 }}
              >
                <ListItemText
                  primary={t(...item.label)}
                  slotProps={{
                    primary: {
                      sx: {
                        fontSize: ".875rem",
                        fontWeight: active ? 700 : 500,
                      },
                    },
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>

        <Divider sx={{ my: 2 }} />
        <Typography color="text.secondary" variant="overline" sx={{ mb: 1 }}>
          {t("Preferences", "Mapendeleo")}
        </Typography>
        <Stack spacing={1.25}>
          <ThemeModeSelect fullWidth />
          <Select
            fullWidth
            inputProps={{ "aria-label": t("Language", "Lugha") }}
            onChange={(event) =>
              setLanguage(event.target.value as "en" | "sw")
            }
            size="small"
            value={language}
          >
            <MenuItem value="sw">Kiswahili</MenuItem>
            <MenuItem value="en">{t("English", "Kiingereza")}</MenuItem>
          </Select>
        </Stack>
      </Drawer>
    </>
  );
}
