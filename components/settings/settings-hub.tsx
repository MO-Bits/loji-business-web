"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import AddBusinessRoundedIcon from "@mui/icons-material/AddBusinessRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import { Avatar, Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";

import { useLanguage } from "@/components/providers/language-provider";
import { Surface } from "@/components/shared/workspace-ui";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import {
  getWorkspaceCapabilities,
  normalizeWorkspaceRole,
} from "@/features/session/permissions";

import { SettingsPageHeader } from "./settings-shared";

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function SettingsHub() {
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

  return (
    <Stack spacing={{ xs: 2.5, sm: 3 }}>
      <SettingsPageHeader
        description={t(
          "Keep your personal details current and choose how Loji Business works for you.",
          "Sasisha taarifa zako na uchague jinsi Loji Business inavyokufaa.",
        )}
        icon={<TuneRoundedIcon />}
        title={t("Your settings", "Mipangilio yako")}
      />

      <Surface>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ alignItems: { sm: "center" } }}
        >
          <Avatar
            src={avatarUrl}
            sx={{
              bgcolor: "primary.main",
              fontSize: "1.25rem",
              fontWeight: 700,
              height: 56,
              width: 56,
            }}
          >
            {name.slice(0, 1).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography component="p" variant="h5">
              {name}
            </Typography>
            <Typography color="text.secondary" noWrap variant="body2">
              {email}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap" }}>
            <Chip
              color="primary"
              label={titleCase(role)}
              size="small"
              variant="outlined"
            />
            <Chip label={workspaceName} size="small" />
          </Stack>
        </Stack>
      </Surface>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            sm: "repeat(2, minmax(0, 1fr))",
          },
        }}
      >
        <SettingsCard
          description={t(
            "Update your display name, phone number, and staff-facing bio.",
            "Sasisha jina, namba ya simu na maelezo mafupi yanayoonekana kwa timu.",
          )}
          href="/settings/profile"
          icon={<AccountCircleOutlinedIcon />}
          meta={email}
          title={t("Profile", "Wasifu")}
        />
        <SettingsCard
          description={t(
            "Choose light, dark, or system mode and your preferred language.",
            "Chagua mwanga, giza au hali ya mfumo pamoja na lugha unayopendelea.",
          )}
          href="/settings/appearance"
          icon={<DarkModeOutlinedIcon />}
          meta={language === "sw" ? "Kiswahili" : "English"}
          title={t("Appearance", "Mwonekano")}
        />
        <SettingsCard
          description={t(
            "Strengthen your password and control active sign-in sessions.",
            "Imarisha nenosiri na dhibiti vipindi vya akaunti vilivyoingia.",
          )}
          href="/settings/security"
          icon={<SecurityOutlinedIcon />}
          meta={t("Password & sessions", "Nenosiri na vipindi")}
          title={t("Security", "Usalama")}
        />
      </Box>

      {capabilities.canManageProperty || capabilities.canManageStaff ? (
        <Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { sm: "flex-end" }, justifyContent: "space-between", mb: 1.5 }}>
            <Box>
              <Typography component="h3" variant="h5">
                {t("Workspace administration", "Usimamizi wa biashara")}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.4 }} variant="body2">
                {t(
                  "These options are shown because of your role in this workspace.",
                  "Chaguo hizi zinaonekana kulingana na jukumu lako kwenye biashara hii.",
                )}
              </Typography>
            </Box>
            {role === "owner" ? (
              <Button component={Link} href="/properties/new" startIcon={<AddBusinessRoundedIcon />} variant="outlined">
                {t("Add property", "Ongeza biashara")}
              </Button>
            ) : null}
          </Stack>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                sm: "repeat(2, minmax(0, 1fr))",
              },
            }}
          >
            {capabilities.canManageProperty ? (
              <SettingsCard
                description={t(
                  "Business identity, location, services, payments, and operational details.",
                  "Utambulisho wa biashara, eneo, huduma, malipo na taarifa za uendeshaji.",
                )}
                href="/settings/property"
                icon={<BusinessOutlinedIcon />}
                meta={workspaceName}
                title={t("Property settings", "Mipangilio ya biashara")}
              />
            ) : null}
            {capabilities.canManageStaff ? (
              <SettingsCard
                description={t(
                  "Add teammate email access and manage roles and account status.",
                  "Ongeza ruhusa kwa barua pepe na udhibiti majukumu na hali ya akaunti.",
                )}
                href="/settings/team"
                icon={<GroupsOutlinedIcon />}
                meta={t("Role-based access", "Ruhusa kwa majukumu")}
                title={t("Team access", "Ruhusa za timu")}
              />
            ) : null}
          </Box>
        </Box>
      ) : null}
    </Stack>
  );
}

function SettingsCard({
  description,
  href,
  icon,
  meta,
  title,
}: {
  description: string;
  href: string;
  icon: ReactNode;
  meta: string;
  title: string;
}) {
  return (
    <Paper
      component={Link}
      href={href}
      variant="outlined"
      sx={{
        color: "inherit",
        display: "flex",
        flexDirection: "column",
        minHeight: 190,
        p: { xs: 2, sm: 2.5 },
        textDecoration: "none",
        transition: "background-color 160ms ease, border-color 160ms ease",
        "&:hover": {
          bgcolor: "action.hover",
          borderColor: "primary.main",
        },
        "&:focus-visible": {
          outline: "3px solid var(--mui-palette-primary-main)",
          outlineOffset: 2,
        },
      }}
    >
      <Stack
        direction="row"
        sx={{ alignItems: "flex-start", justifyContent: "space-between" }}
      >
        <Box
          aria-hidden="true"
          sx={{
            alignItems: "center",
            bgcolor:
              "color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent)",
            borderRadius: 1,
            color: "primary.main",
            display: "flex",
            height: 42,
            justifyContent: "center",
            width: 42,
            "& .MuiSvgIcon-root": { fontSize: 21 },
          }}
        >
          {icon}
        </Box>
        <ArrowForwardRoundedIcon
          sx={{ color: "text.secondary", fontSize: 20 }}
        />
      </Stack>
      <Box sx={{ flex: 1, mt: 2 }}>
        <Typography component="h3" variant="h5">
          {title}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.55 }} variant="body2">
          {description}
        </Typography>
      </Box>
      <Typography
        color="primary.main"
        noWrap
        sx={{ fontWeight: 500, mt: 2 }}
        variant="caption"
      >
        {meta}
      </Typography>
    </Paper>
  );
}
