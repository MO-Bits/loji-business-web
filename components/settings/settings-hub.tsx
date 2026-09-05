"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import AddBusinessRoundedIcon from "@mui/icons-material/AddBusinessRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PrivacyTipOutlinedIcon from "@mui/icons-material/PrivacyTipOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import {
  Avatar,
  Box,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { useLanguage } from "@/components/providers/language-provider";
import { useDirtyNavigation } from "@/components/providers/unsaved-changes-provider";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import {
  getWorkspaceCapabilities,
  normalizeWorkspaceRole,
} from "@/features/session/permissions";
import { createClient } from "@/lib/supabase/client";

type SettingsRowProps = {
  description?: ReactNode;
  destructive?: boolean;
  href?: string;
  icon: ReactNode;
  meta?: ReactNode;
  onClick?: () => void;
  title: ReactNode;
};

function roleLabel(
  role: string,
  translate: (english: string, swahili: string) => string,
) {
  const labels: Record<string, [string, string]> = {
    owner: ["Owner", "Mmiliki"],
    manager: ["Manager", "Meneja"],
    receptionist: ["Receptionist", "Mhudumu wa mapokezi"],
    staff: ["Staff", "Mfanyakazi"],
    member: ["Staff", "Mfanyakazi"],
  };
  const label = labels[role] ?? ["Account", "Akaunti"];
  return translate(label[0], label[1]);
}

export function SettingsHub() {
  const router = useRouter();
  const { clearDrafts, requestNavigation } = useDirtyNavigation();
  const { session } = useAppSession();
  const { language, t } = useLanguage();
  const role = normalizeWorkspaceRole(session?.activeRole);
  const capabilities = getWorkspaceCapabilities(role);
  const name = String(
    session?.user?.user_metadata?.full_name ??
      session?.user?.user_metadata?.name ??
      session?.user?.email?.split("@")[0] ??
      t("Your profile", "Wasifu wako"),
  );
  const email =
    session?.user?.email ?? t("Signed-in account", "Akaunti iliyoingia");
  const avatarUrl =
    typeof session?.user?.user_metadata?.avatar_url === "string"
      ? session.user.user_metadata.avatar_url
      : undefined;
  const workspaceName = String(
    session?.property?.name ?? t("Current property", "Biashara ya sasa"),
  );
  const workspaceRole = roleLabel(role, t);
  const canShowWorkspaceGroup =
    capabilities.canManageProperty ||
    capabilities.canManageStaff ||
    role === "owner";

  const signOut = () => {
    void requestNavigation(async () => {
      await createClient().auth.signOut();
      clearDrafts();
      router.replace("/login");
      router.refresh();
    });
  };

  return (
    <Stack spacing={{ xs: 2.5, sm: 3 }} sx={{ pb: { xs: 2, sm: 3 } }}>
      <Box sx={{ px: { xs: 0.5, sm: 0 } }}>
        <Typography component="h1" variant="h3">
          {t("Settings", "Mipangilio")}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.55 }} variant="body1">
          {t(
            "Manage your account and how Loji Business works for you.",
            "Dhibiti akaunti yako na jinsi Loji Business inavyokufaa.",
          )}
        </Typography>
      </Box>

      <Paper
        component="section"
        variant="outlined"
        sx={{ borderRadius: { xs: 3, sm: 2 }, overflow: "hidden" }}
      >
        <List disablePadding>
          <ListItemButton
            component={Link}
            href="/settings/profile"
            sx={{
              alignItems: "center",
              minHeight: { xs: 82, sm: 88 },
              px: { xs: 1.75, sm: 2.25 },
              py: 1.5,
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <ListItemIcon sx={{ minWidth: 54 }}>
              <Avatar
                src={avatarUrl}
                sx={{
                  bgcolor: "primary.main",
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  height: 46,
                  width: 46,
                }}
              >
                {name.slice(0, 1).toUpperCase()}
              </Avatar>
            </ListItemIcon>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                noWrap
                sx={{ fontSize: ".95rem", fontWeight: 700 }}
              >
                {name}
              </Typography>
              <Typography
                color="text.secondary"
                noWrap
                sx={{ mt: 0.2 }}
                variant="body2"
              >
                {email}
              </Typography>
              <Typography
                color="text.secondary"
                sx={{ mt: 0.2 }}
                variant="caption"
              >
                {workspaceRole}
                {" · "}
                {workspaceName}
              </Typography>
            </Box>
            <ArrowForwardRoundedIcon
              aria-hidden="true"
              sx={{ color: "text.secondary", flexShrink: 0, ml: 1 }}
            />
          </ListItemButton>
        </List>
      </Paper>

      <SettingsGroup title={t("Account", "Akaunti")}>
        <SettingsRow
          description={t(
            "Personal details and contact information.",
            "Taarifa binafsi na mawasiliano.",
          )}
          href="/settings/profile"
          icon={<AccountCircleOutlinedIcon />}
          title={t("Profile", "Wasifu")}
        />
        <SettingsDivider />
        <SettingsRow
          description={t(
            "Password and active sign-in sessions.",
            "Nenosiri na vipindi vya kuingia vilivyo hai.",
          )}
          href="/settings/security"
          icon={<SecurityOutlinedIcon />}
          title={t("Security", "Usalama")}
        />
      </SettingsGroup>

      <SettingsGroup title={t("Experience", "Matumizi ya programu")}>
        <SettingsRow
          description={t(
            "Theme, language, and display preferences.",
            "Mandhari, lugha na mapendeleo ya mwonekano.",
          )}
          href="/settings/appearance"
          icon={<DarkModeOutlinedIcon />}
          meta={language === "sw" ? "Kiswahili" : "English"}
          title={t("Appearance & language", "Mwonekano na lugha")}
        />
      </SettingsGroup>

      {canShowWorkspaceGroup ? (
        <SettingsGroup title={t("Property & team", "Biashara na timu")}>
          {capabilities.canManageProperty ? (
            <>
              <SettingsRow
                description={t(
                  "Property details, address, photos, services, and booking rules.",
                  "Taarifa, anwani, picha, huduma na kanuni za uhifadhi.",
                )}
                href="/settings/property"
                icon={<BusinessOutlinedIcon />}
                meta={workspaceName}
                title={t("Property settings", "Mipangilio ya biashara")}
              />
              {(capabilities.canManageStaff || role === "owner") && (
                <SettingsDivider />
              )}
            </>
          ) : null}
          {capabilities.canManageStaff ? (
            <>
              <SettingsRow
                description={t(
                  "Staff accounts, roles, and access status.",
                  "Akaunti za wafanyakazi, majukumu na hali ya ruhusa.",
                )}
                href="/settings/team"
                icon={<GroupsOutlinedIcon />}
                title={t("Team & access", "Timu na ruhusa")}
              />
              {role === "owner" && <SettingsDivider />}
            </>
          ) : null}
          {role === "owner" ? (
            <SettingsRow
              description={t(
                "Create and manage another property.",
                "Unda na simamia biashara nyingine.",
              )}
              href="/properties/new"
              icon={<AddBusinessRoundedIcon />}
              title={t("Add property", "Ongeza biashara")}
            />
          ) : null}
        </SettingsGroup>
      ) : null}

      <SettingsGroup title={t("Help & information", "Msaada na taarifa")}>
        <SettingsRow
          description={t(
            "Find answers and learn how to use Loji Business.",
            "Pata majibu na jifunze kutumia Loji Business.",
          )}
          href="/help"
          icon={<SupportAgentRoundedIcon />}
          title={t("Help & support", "Msaada na usaidizi")}
        />
        <SettingsDivider />
        <SettingsRow
          description={t(
            "Common questions about the platform.",
            "Maswali yanayoulizwa mara kwa mara kuhusu mfumo.",
          )}
          href="/faq"
          icon={<HelpOutlineRoundedIcon />}
          title={t("Frequently asked questions", "Maswali yanayoulizwa mara kwa mara")}
        />
        <SettingsDivider />
        <SettingsRow
          description={t(
            "How we handle account and property data.",
            "Jinsi tunavyoshughulikia taarifa za akaunti na biashara.",
          )}
          href="/privacy"
          icon={<PrivacyTipOutlinedIcon />}
          title={t("Privacy policy", "Sera ya faragha")}
        />
        <SettingsDivider />
        <SettingsRow
          description={t(
            "Rules for using Loji Business.",
            "Masharti ya kutumia Loji Business.",
          )}
          href="/terms"
          icon={<DescriptionOutlinedIcon />}
          title={t("Terms of use", "Masharti ya matumizi")}
        />
      </SettingsGroup>

      <SettingsGroup title={t("Session", "Kikao")}>
        <SettingsRow
          destructive
          icon={<LogoutRoundedIcon />}
          onClick={signOut}
          title={t("Sign out", "Ondoka")}
        />
      </SettingsGroup>
    </Stack>
  );
}

function SettingsGroup({
  children,
  title,
}: {
  children: ReactNode;
  title: ReactNode;
}) {
  return (
    <Box component="section">
      <Typography
        component="h2"
        color="text.secondary"
        sx={{
          fontSize: ".7rem",
          fontWeight: 700,
          letterSpacing: ".065em",
          mb: 0.85,
          px: { xs: 1, sm: 0.5 },
          textTransform: "uppercase",
        }}
      >
        {title}
      </Typography>
      <Paper
        variant="outlined"
        sx={{ borderRadius: { xs: 3, sm: 2 }, overflow: "hidden" }}
      >
        <List disablePadding>{children}</List>
      </Paper>
    </Box>
  );
}

function SettingsDivider() {
  return <Divider component="li" sx={{ ml: { xs: 7.5, sm: 8.5 } }} />;
}

function SettingsRow({
  description,
  destructive = false,
  href,
  icon,
  meta,
  onClick,
  title,
}: SettingsRowProps) {
  const rowSx = {
    alignItems: "center",
    minHeight: { xs: 64, sm: 68 },
    px: { xs: 1.5, sm: 2 },
    py: 1,
    textAlign: "left" as const,
    "&:hover": { bgcolor: "action.hover" },
    "&:focus-visible": {
      outline: "3px solid var(--mui-palette-primary-main)",
      outlineOffset: -3,
    },
  };
  const iconColor = destructive ? "error.main" : "primary.main";
  const rowContent = (
    <>
      <ListItemIcon sx={{ minWidth: 44, mr: 1 }}>
        <Box
          aria-hidden="true"
          sx={{
            alignItems: "center",
            bgcolor: destructive
              ? "color-mix(in srgb, var(--mui-palette-error-main) 11%, transparent)"
              : "color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent)",
            borderRadius: 1.5,
            color: iconColor,
            display: "flex",
            height: 34,
            justifyContent: "center",
            width: 34,
            "& .MuiSvgIcon-root": { fontSize: 19 },
          }}
        >
          {icon}
        </Box>
      </ListItemIcon>
      <ListItemText
        primary={title}
        secondary={description}
        sx={{ minWidth: 0, my: 0 }}
        slotProps={{
          primary: {
            sx: {
              color: destructive ? "error.main" : "text.primary",
              fontSize: ".875rem",
              fontWeight: 600,
              lineHeight: 1.35,
            },
          },
          secondary: {
            sx: {
              color: "text.secondary",
              fontSize: ".75rem",
              lineHeight: 1.35,
              mt: 0.25,
            },
          },
        }}
      />
      <Stack
        direction="row"
        spacing={0.7}
        sx={{ alignItems: "center", flexShrink: 0, ml: 1 }}
      >
        {meta ? (
          <Typography
            color="text.secondary"
            noWrap
            sx={{ display: { xs: "none", sm: "block" }, fontSize: ".75rem" }}
          >
            {meta}
          </Typography>
        ) : null}
        <ArrowForwardRoundedIcon
          aria-hidden="true"
          sx={{ color: "text.secondary", fontSize: 19 }}
        />
      </Stack>
    </>
  );

  if (href) {
    return (
      <ListItemButton component={Link} href={href} sx={rowSx}>
        {rowContent}
      </ListItemButton>
    );
  }

  return (
    <ListItemButton component="button" onClick={onClick} sx={rowSx}>
      {rowContent}
    </ListItemButton>
  );
}
