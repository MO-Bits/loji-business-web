"use client";

import { useState } from "react";
import Link from "next/link";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import {
  Avatar,
  Box,
  Collapse,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useLanguage } from "@/components/providers/language-provider";
import { BrandLockup } from "@/components/shared/brand-lockup";
import { ThemeModeSelect } from "@/components/shared/theme-mode-select";
import type { Membership, Property } from "@/features/session/models/app-session";
import type { WorkspaceCapabilities } from "@/features/session/permissions";
import { getPropertyTypeDefinition } from "@/features/property/property-type";
import {
  accountDestination,
  businessDestinations,
  managementDestinations,
  operationsDestinations,
  settingsDestination,
  type MainDestination,
  visibleDestinations,
  workspaceDestinations,
} from "./destinations";
import { PropertySwitcher } from "./property-switcher";
import { TopBarLanguageSwitch } from "./top-bar-language-switch";

type SidebarContentProps = {
  activePropertyId?: string;
  avatar?: string;
  capabilities: WorkspaceCapabilities;
  dashboardAllowed: boolean;
  homePath: string;
  memberships: Membership[];
  name: string;
  onClose: () => void;
  onSignOut: () => Promise<void>;
  onSwitchProperty: (propertyId: string) => Promise<void>;
  pathname: string;
  property?: Property | null;
  role: string;
};

export function SidebarContent({
  activePropertyId,
  avatar,
  capabilities,
  dashboardAllowed,
  homePath,
  memberships,
  name,
  onClose,
  onSignOut,
  onSwitchProperty,
  pathname,
  property,
  role,
}: SidebarContentProps) {
  const { t } = useLanguage();
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const propertyDefinition = getPropertyTypeDefinition(property?.type);
  const contextualize = (items: MainDestination[]) =>
    items.map((item) =>
      item.path === "/rooms"
        ? {
            ...item,
            label: propertyDefinition.inventoryPlural[0],
            localizedLabel: propertyDefinition.inventoryPlural,
          }
        : item,
    );
  const operations = contextualize(
    visibleDestinations(operationsDestinations, capabilities),
  ).filter((item) => item.sidebar !== false);
  const business = contextualize(
    visibleDestinations(businessDestinations, capabilities),
  ).filter((item) => item.sidebar !== false);
  const management = contextualize(
    visibleDestinations(managementDestinations, capabilities),
  ).filter((item) => item.sidebar !== false);

  return (
    <Box
      sx={{
        display: "flex",
        flex: 1,
        flexDirection: "column",
        minHeight: 0,
        pb: { xs: "env(safe-area-inset-bottom)", md: 0 },
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          borderBottom: 1,
          borderColor: "divider",
          height: { xs: "calc(60px + env(safe-area-inset-top))", md: 60 },
          justifyContent: "space-between",
          px: 1.5,
          pt: { xs: "env(safe-area-inset-top)", md: 0 },
        }}
      >
        <Box
          component={Link}
          href={homePath}
          aria-label={homePath === "/settings/profile"
            ? t("Open my account", "Fungua akaunti yangu")
            : t("Loji Business home", "Nyumbani Loji Business")}
          onClick={onClose}
          sx={{ display: "inline-flex", p: 0.5, textDecoration: "none" }}
        >
          <BrandLockup symbolSize={28} textSize=".9375rem" />
        </Box>
        <IconButton
          aria-label={t("Close navigation", "Funga menyu")}
          onClick={onClose}
          size="small"
          sx={{ display: { xs: "inline-flex", md: "none" } }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Box sx={{ borderBottom: 1, borderColor: "divider", p: 1.25 }}>
        <PropertySwitcher
          activePropertyId={activePropertyId}
          memberships={memberships}
          property={property}
          onSwitch={onSwitchProperty}
          placement="sidebar"
        />
      </Box>

      <Box
        component="nav"
        aria-label={t("Workspace navigation", "Menyu ya eneo la kazi")}
        sx={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          minHeight: 0,
          overflowY: "auto",
          px: 1,
          py: 1.5,
        }}
      >
        <NavigationSection
          items={contextualize(
            visibleDestinations(workspaceDestinations, capabilities),
          ).filter((item) => item.path !== "/dashboard" || dashboardAllowed)}
          label={t("Workspace", "Eneo la kazi")}
          onNavigate={onClose}
          pathname={pathname}
        />
        {operations.length ? (
          <NavigationSection
            items={operations}
            label={t("Operations", "Shughuli")}
            onNavigate={onClose}
            pathname={pathname}
          />
        ) : null}
        {business.length ? (
          <NavigationSection
            items={business}
            label={t("Business", "Biashara")}
            onNavigate={onClose}
            pathname={pathname}
          />
        ) : null}
        {management.length ? (
          <NavigationSection
            items={management}
            label={t("Manage", "Usimamizi")}
            onNavigate={onClose}
            pathname={pathname}
          />
        ) : null}

        <Box sx={{ flex: 1, minHeight: 20 }} />

        <NavigationList
          items={[settingsDestination]}
          onNavigate={onClose}
          pathname={pathname}
        />

        <ListItemButton
          aria-expanded={preferencesOpen}
          onClick={() => setPreferencesOpen((open) => !open)}
          sx={{ borderRadius: 1, minHeight: { xs: 44, md: 40 }, px: 1.25 }}
        >
          <ListItemIcon sx={{ color: "text.secondary", minWidth: 30 }}>
            <TuneRoundedIcon sx={{ fontSize: 19 }} />
          </ListItemIcon>
          <ListItemText
            primary={t("Preferences", "Mapendeleo")}
            slotProps={{
              primary: { sx: { fontSize: ".8125rem", fontWeight: 500 } },
            }}
          />
          <ExpandMoreRoundedIcon
            sx={{
              color: "text.secondary",
              fontSize: 18,
              transform: preferencesOpen ? "rotate(180deg)" : "none",
              transition: "transform 160ms ease",
            }}
          />
        </ListItemButton>

        <Collapse in={preferencesOpen} timeout="auto" unmountOnExit>
          <Stack
            spacing={1.25}
            sx={{
              bgcolor: "background.default",
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              mt: 0.5,
              p: 1.25,
            }}
          >
            <Box>
              <Typography
                color="text.secondary"
                variant="caption"
                sx={{ display: "block", fontWeight: 500, mb: 0.6 }}
              >
                {t("Appearance", "Mwonekano")}
              </Typography>
              <ThemeModeSelect fullWidth />
            </Box>
            <Box>
              <Typography
                color="text.secondary"
                variant="caption"
                sx={{ display: "block", fontWeight: 500, mb: 0.6 }}
              >
                {t("Language", "Lugha")}
              </Typography>
              <TopBarLanguageSwitch fullWidth />
            </Box>
          </Stack>
        </Collapse>

        <Divider sx={{ my: 1 }} />
        <Stack
          direction="row"
          spacing={0.75}
          sx={{
            alignItems: "center",
            borderRadius: 1,
            minHeight: 52,
            p: 0.5,
          }}
        >
          <Stack
            component={Link}
            direction="row"
            href={accountDestination.path}
            onClick={onClose}
            spacing={1}
            sx={{
              alignItems: "center",
              borderRadius: 1,
              color: "inherit",
              flex: 1,
              minHeight: 44,
              minWidth: 0,
              p: 0.5,
              textDecoration: "none",
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <Avatar
              src={avatar}
              sx={{ bgcolor: "primary.main", height: 32, width: 32 }}
            >
              {name[0]?.toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                noWrap
                sx={{ fontSize: ".8125rem", fontWeight: 700 }}
              >
                {name}
              </Typography>
              <Typography
                color="text.secondary"
                noWrap
                variant="caption"
                sx={{ textTransform: "capitalize" }}
              >
                {role.replaceAll("_", " ")}
              </Typography>
            </Box>
          </Stack>
          <Tooltip title={t("Sign out", "Ondoka")}>
            <IconButton
              aria-label={t("Sign out", "Ondoka")}
              onClick={() => void onSignOut()}
              size="small"
            >
              <LogoutRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
    </Box>
  );
}

function NavigationSection({
  items,
  label,
  onNavigate,
  pathname,
}: {
  items: MainDestination[];
  label: string;
  onNavigate: () => void;
  pathname: string;
}) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography
        color="text.secondary"
        component="p"
        sx={{
          fontSize: ".6875rem",
          fontWeight: 700,
          letterSpacing: ".07em",
          mb: 0.5,
          px: 1.25,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Typography>
      <NavigationList
        items={items}
        onNavigate={onNavigate}
        pathname={pathname}
      />
    </Box>
  );
}

function NavigationList({
  items,
  onNavigate,
  pathname,
}: {
  items: MainDestination[];
  onNavigate: () => void;
  pathname: string;
}) {
  const { t } = useLanguage();

  return (
    <List disablePadding>
      {items.map((item) => {
        const selected = item.match(pathname);
        return (
          <ListItemButton
            aria-current={selected ? "page" : undefined}
            component={Link}
            href={item.path}
            key={item.path}
            onClick={onNavigate}
            selected={selected}
            sx={{
              borderRadius: 1,
              columnGap: 1.1,
              mb: 0.2,
              minHeight: { xs: 44, md: 40 },
              overflow: "hidden",
              position: "relative",
              px: 1.25,
              "&.Mui-selected": {
                bgcolor: "action.selected",
                color: "primary.main",
                "&::before": {
                  bgcolor: "primary.main",
                  borderRadius: 999,
                  bottom: 9,
                  content: '\"\"',
                  left: 0,
                  position: "absolute",
                  top: 9,
                  width: 3,
                },
                "&:hover": { bgcolor: "action.selected" },
              },
            }}
          >
            <ListItemIcon
              sx={{
                alignItems: "center",
                color: selected ? "primary.main" : "text.secondary",
                justifyContent: "center",
                minWidth: 22,
                width: 22,
                "& .MuiSvgIcon-root": { fontSize: 20 },
              }}
            >
              {selected ? item.activeIcon : item.icon}
            </ListItemIcon>
            <ListItemText
              primary={t(...item.localizedLabel)}
              sx={{ m: 0 }}
              slotProps={{
                primary: {
                  sx: {
                    fontSize: ".875rem",
                    fontWeight: selected ? 700 : 500,
                  },
                },
              }}
            />
          </ListItemButton>
        );
      })}
    </List>
  );
}
