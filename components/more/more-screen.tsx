"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  List,
  ListItemButton,
  Stack,
  Typography,
} from "@mui/material";
import { createClient } from "@/lib/supabase/client";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import {
  getWorkspaceCapabilities,
  normalizeWorkspaceRole,
} from "@/features/session/permissions";

type MoreItemProps = {
  icon: ReactNode;
  title: string;
  subtitle: string;
  href: string;
};

function MoreItem({ icon, title, subtitle, href }: MoreItemProps) {
  return (
    <ListItemButton
      component={Link}
      href={href}
      className="surface-hover"
      sx={{
        alignItems: "center",
        borderRadius: 0,
        gap: { xs: 1.25, sm: 1.5 },
        minHeight: { xs: 76, sm: 80 },
        px: { xs: 2, sm: 2.5 },
        py: 1.25,
        "&:first-of-type": { borderTopLeftRadius: 1, borderTopRightRadius: 1 },
        "&:last-of-type": {
          borderBottomLeftRadius: 1,
          borderBottomRightRadius: 1,
        },
      }}
    >
      <Box
        sx={{
          alignItems: "center",
          bgcolor: "primary.main",
          borderRadius: 1.25,
          color: "primary.contrastText",
          display: "grid",
          flex: "0 0 auto",
          height: 40,
          placeItems: "center",
          width: 40,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography component="span" variant="subtitle2" sx={{ display: "block", fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography
          color="text.secondary"
          component="span"
          variant="body2"
          sx={{ display: "block", mt: 0.25 }}
        >
          {subtitle}
        </Typography>
      </Box>
      <ChevronRightRoundedIcon color="action" fontSize="small" />
    </ListItemButton>
  );
}

function SettingsGroup({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <Box>
      <Typography
        color="text.secondary"
        component="h2"
        variant="overline"
        sx={{ display: "block", mb: 0.75, px: 0.5 }}
      >
        {eyebrow}
      </Typography>
      <Box
        sx={{
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          boxShadow: "0 1px 2px rgba(16,24,40,.025)",
          overflow: "hidden",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export function MoreScreen() {
  const router = useRouter();
  const { session } = useAppSession();
  const [signingOut, setSigningOut] = useState(false);
  const capabilities = getWorkspaceCapabilities(session?.activeRole);
  const role = normalizeWorkspaceRole(session?.activeRole);
  const displayName = String(
    session?.user?.user_metadata?.full_name ??
      session?.user?.user_metadata?.name ??
      session?.user?.email?.split("@")[0] ??
      "Account",
  );
  const avatar =
    typeof session?.user?.user_metadata?.avatar_url === "string"
      ? session.user.user_metadata.avatar_url
      : undefined;
  const propertyName = String(session?.property?.name ?? "Your workspace");

  const logout = async () => {
    setSigningOut(true);
    try {
      await createClient().auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  const hasManagement =
    capabilities.canManageProperty || capabilities.canManageStaff;

  return (
    <Box component="section" sx={{ py: { xs: 2, sm: 3, lg: 4 } }}>
      <Container maxWidth="lg">
        <Stack spacing={{ xs: 2.25, sm: 3 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ alignItems: { sm: "flex-start" }, justifyContent: "space-between" }}
          >
            <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
              <Button
                aria-label="Go back"
                color="inherit"
                onClick={() => router.back()}
                size="small"
                startIcon={<ArrowBackRoundedIcon />}
                sx={{ display: { xs: "none", sm: "inline-flex" }, mt: 0.25 }}
              >
                Back
              </Button>
              <Box>
                <Typography color="text.secondary" variant="overline">
                  Workspace settings
                </Typography>
                <Typography component="h1" variant="h3" sx={{ mt: 0.1 }}>
                  Account & workspace
                </Typography>
                <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
                  Manage your account and the workspace you have access to.
                </Typography>
              </Box>
            </Stack>
          </Stack>

          <Box
            sx={{
              background:
                "linear-gradient(118deg, #173A30 0%, #1D5342 62%, #28755C 100%)",
              borderRadius: 1.5,
              color: "#F8FAFC",
              overflow: "hidden",
              p: { xs: 2, sm: 2.5, md: 3 },
              position: "relative",
            }}
          >
            <Box
              aria-hidden="true"
              sx={{
                border: "1px solid rgba(255,255,255,.14)",
                borderRadius: "50%",
                height: 230,
                position: "absolute",
                right: { xs: -118, sm: -72 },
                top: -118,
                width: 230,
              }}
            />
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ alignItems: { sm: "center" }, position: "relative" }}
            >
              <Avatar
                src={avatar}
                sx={{
                  bgcolor: "rgba(255,255,255,.16)",
                  border: "2px solid rgba(255,255,255,.24)",
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  height: 52,
                  width: 52,
                }}
              >
                {displayName.slice(0, 1).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h5" sx={{ color: "inherit" }}>
                  {displayName}
                </Typography>
                <Typography sx={{ color: "rgba(248,250,252,.72)", mt: 0.35 }} variant="body2">
                  {propertyName}
                </Typography>
              </Box>
              <Chip
                label={role}
                size="small"
                sx={{
                  alignSelf: { xs: "flex-start", sm: "center" },
                  bgcolor: "rgba(255,255,255,.12)",
                  color: "#F8FAFC",
                  fontWeight: 700,
                  textTransform: "capitalize",
                }}
              />
            </Stack>
          </Box>

          <Box
            sx={{
              display: "grid",
              gap: { xs: 2.25, lg: 3 },
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                lg: "minmax(0, 1.1fr) minmax(300px, .9fr)",
              },
            }}
          >
            <Stack spacing={2.25}>
              <SettingsGroup eyebrow="Your account">
                <List disablePadding>
                  <MoreItem
                    icon={<PersonOutlineRoundedIcon fontSize="small" />}
                    title="My account"
                    subtitle="Profile details, membership and sign-in information"
                    href="/more/account"
                  />
                </List>
              </SettingsGroup>

              {hasManagement ? (
                <SettingsGroup eyebrow="Workspace administration">
                  <List disablePadding>
                    {capabilities.canManageProperty ? (
                      <MoreItem
                        icon={<ApartmentRoundedIcon fontSize="small" />}
                        title="Property profile"
                        subtitle="Contact details, description, amenities and gallery"
                        href="/more/property"
                      />
                    ) : null}
                    {capabilities.canManageProperty && capabilities.canManageStaff ? <Divider /> : null}
                    {capabilities.canManageStaff ? (
                      <MoreItem
                        icon={<GroupsRoundedIcon fontSize="small" />}
                        title="Team access"
                        subtitle="Members, invitations and workspace permissions"
                        href="/more/staff"
                      />
                    ) : null}
                  </List>
                </SettingsGroup>
              ) : null}
            </Stack>

            <Box
              sx={{
                alignSelf: "start",
                bgcolor: "background.paper",
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                p: { xs: 2, sm: 2.5 },
              }}
            >
              <Stack spacing={1.75}>
                <Box
                  sx={{
                    alignItems: "center",
                    bgcolor: "primary.main",
                    borderRadius: 1,
                    color: "primary.contrastText",
                    display: "grid",
                    height: 36,
                    placeItems: "center",
                    width: 36,
                  }}
                >
                  <SecurityRoundedIcon fontSize="small" />
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    End this session
                  </Typography>
                  <Typography color="text.secondary" variant="body2" sx={{ mt: 0.4 }}>
                    Sign out of Loji Business on this device when you are finished.
                  </Typography>
                </Box>
                <Button
                  color="error"
                  disabled={signingOut}
                  fullWidth
                  onClick={() => void logout()}
                  startIcon={<LogoutRoundedIcon />}
                  variant="outlined"
                >
                  {signingOut ? "Signing out…" : "Sign out"}
                </Button>
              </Stack>
            </Box>
          </Box>

          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", px: 0.5 }}>
            <SettingsRoundedIcon color="action" fontSize="small" />
            <Typography color="text.secondary" variant="caption">
              The options shown here reflect your workspace role.
            </Typography>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
