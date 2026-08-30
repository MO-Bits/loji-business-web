"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  List,
  ListItemButton,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { createClient } from "@/lib/supabase/client";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import {
  getWorkspaceCapabilities,
  normalizeWorkspaceRole,
} from "@/features/session/permissions";
import { getMyAccount } from "@/features/more/services/more-service";
import { formatLocalDate } from "@/lib/date-time";

type Account = Awaited<ReturnType<typeof getMyAccount>>;

function roleLabel(role?: string | null) {
  const normalized = normalizeWorkspaceRole(role);
  return normalized === "member"
    ? String(role ?? "Member").replace(/\b\w/g, (letter) => letter.toUpperCase())
    : normalized[0].toUpperCase() + normalized.slice(1);
}

function statusColor(status?: string | null): "default" | "success" | "warning" {
  return status?.toLowerCase() === "active" ? "success" : status ? "warning" : "default";
}

export function AccountScreen() {
  const router = useRouter();
  const { session } = useAppSession();
  const supabase = useMemo(() => createClient(), []);
  const [account, setAccount] = useState<Account>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const propertyId = session?.activePropertyId;

  useEffect(() => {
    let live = true;
    const timer = window.setTimeout(() => {
      if (!propertyId) {
        setAccount(null);
        setError("No active workspace was found.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      getMyAccount(supabase, propertyId)
        .then((value) => {
          if (live) setAccount(value);
        })
        .catch((cause) => {
          if (live) {
            setError(
              cause instanceof Error ? cause.message : "Unable to load account.",
            );
          }
        })
        .finally(() => {
          if (live) setLoading(false);
        });
    }, 0);

    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [propertyId, reloadKey, supabase]);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  if (loading) return <AccountSkeleton />;
  if (error) {
    return (
      <StateFrame>
        <Alert
          severity="error"
          action={
            <Button color="inherit" onClick={() => setReloadKey((current) => current + 1)} startIcon={<RefreshRoundedIcon />}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </StateFrame>
    );
  }
  if (!account) {
    return (
      <StateFrame>
        <Alert severity="info">Your profile could not be found for this workspace.</Alert>
      </StateFrame>
    );
  }

  const name = String(account.display_name ?? "User");
  const role = String(account.role ?? session?.activeRole ?? "member");
  const capabilities = getWorkspaceCapabilities(role);
  const propertyName = String(session?.property?.name ?? "Current workspace");
  const avatarUrl = account.avatar_url ?? undefined;
  const hasWorkspaceLinks =
    capabilities.canManageProperty || capabilities.canManageStaff;

  return (
    <Box component="section" sx={{ py: { xs: 2, sm: 3, lg: 4 } }}>
      <Container maxWidth="lg">
        <Stack spacing={{ xs: 2.25, sm: 3 }}>
          <Stack
            direction="row"
            spacing={1.25}
            sx={{ alignItems: "flex-start", justifyContent: "space-between" }}
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
                  Personal settings
                </Typography>
                <Typography component="h1" variant="h3" sx={{ mt: 0.1 }}>
                  My account
                </Typography>
                <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
                  Your profile and workspace access at a glance.
                </Typography>
              </Box>
            </Stack>
          </Stack>

          <Box
            sx={{
              bgcolor: "background.paper",
              border: 1,
              borderColor: "divider",
              borderRadius: 1.5,
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                background:
                  "linear-gradient(118deg, #173A30 0%, #1D5342 65%, #28755C 100%)",
                height: { xs: 82, sm: 104 },
                position: "relative",
                "&::after": {
                  border: "1px solid rgba(255,255,255,.15)",
                  borderRadius: "50%",
                  content: '\"\"',
                  height: 190,
                  position: "absolute",
                  right: -30,
                  top: -122,
                  width: 190,
                },
              }}
            />
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={{ xs: 1.5, sm: 2.25 }}
              sx={{ alignItems: { sm: "flex-end" }, mt: { xs: -3.25, sm: -4.25 }, p: { xs: 2, sm: 2.5 } }}
            >
              <Avatar
                src={avatarUrl}
                sx={{
                  bgcolor: "primary.main",
                  border: "4px solid",
                  borderColor: "background.paper",
                  boxShadow: "0 8px 22px rgba(16,24,40,.14)",
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  height: { xs: 72, sm: 88 },
                  width: { xs: 72, sm: 88 },
                }}
              >
                {name.slice(0, 1).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0, pb: { sm: 0.25 } }}>
                <Typography component="h2" variant="h4">
                  {name}
                </Typography>
                <Typography color="text.secondary" variant="body2" sx={{ mt: 0.25 }}>
                  {String(account.email ?? session?.user?.email ?? "No email address")}
                </Typography>
              </Box>
              <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", pb: { sm: 0.25 } }}>
                <Chip label={roleLabel(role)} color="primary" size="small" sx={{ fontWeight: 700 }} />
                <Chip
                  label={String(account.status ?? "Unknown")}
                  color={statusColor(account.status)}
                  size="small"
                  sx={{ fontWeight: 700, textTransform: "capitalize" }}
                  variant="outlined"
                />
              </Stack>
            </Stack>
          </Box>

          <Box
            sx={{
              display: "grid",
              gap: { xs: 2.25, lg: 3 },
              gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1.12fr) minmax(320px, .88fr)" },
            }}
          >
            <Stack spacing={2.25}>
              <DetailsPanel title="Contact details" description="Information associated with this account.">
                <DetailRow icon={<EmailRoundedIcon />} label="Email" value={account.email ?? session?.user?.email} />
                <Divider />
                <DetailRow icon={<PhoneRoundedIcon />} label="Phone" value={account.phone} />
              </DetailsPanel>

              <DetailsPanel title="Workspace membership" description="Your current role and access in this property.">
                <DetailRow icon={<ApartmentRoundedIcon />} label="Workspace" value={propertyName} />
                <Divider />
                <DetailRow icon={<ShieldRoundedIcon />} label="Role" value={roleLabel(role)} />
                <Divider />
                <DetailRow icon={<VerifiedUserRoundedIcon />} label="Membership" value={account.status ?? "Unknown"} capitalized />
                {account.joined_at ? (
                  <>
                    <Divider />
                    <DetailRow icon={<VerifiedUserRoundedIcon />} label="Joined" value={formatLocalDate(account.joined_at)} />
                  </>
                ) : null}
              </DetailsPanel>
            </Stack>

            <Stack spacing={2.25}>
              {hasWorkspaceLinks ? (
                <DetailsPanel title="Workspace administration" description="Open the settings available to your role." compact>
                  <List disablePadding>
                    {capabilities.canManageProperty ? (
                      <SettingsLink
                        href="/more/property"
                        icon={<ApartmentRoundedIcon fontSize="small" />}
                        title="Property profile"
                        subtitle="Property information and gallery"
                      />
                    ) : null}
                    {capabilities.canManageProperty && capabilities.canManageStaff ? <Divider /> : null}
                    {capabilities.canManageStaff ? (
                      <SettingsLink
                        href="/more/staff"
                        icon={<GroupsRoundedIcon fontSize="small" />}
                        title="Team access"
                        subtitle="Members and invitations"
                      />
                    ) : null}
                  </List>
                </DetailsPanel>
              ) : null}

              <Box
                sx={{
                  bgcolor: "background.paper",
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  p: { xs: 2, sm: 2.5 },
                }}
              >
                <Stack spacing={1.5}>
                  <Box
                    sx={{
                      alignItems: "center",
                      bgcolor: "rgba(209,67,67,.1)",
                      borderRadius: 1,
                      color: "error.main",
                      display: "grid",
                      height: 36,
                      placeItems: "center",
                      width: 36,
                    }}
                  >
                    <LogoutRoundedIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Sign out of this device
                    </Typography>
                    <Typography color="text.secondary" variant="body2" sx={{ mt: 0.4 }}>
                      End your current Loji Business session on this device.
                    </Typography>
                  </Box>
                  <Button
                    color="error"
                    disabled={signingOut}
                    fullWidth
                    onClick={() => void signOut()}
                    startIcon={<LogoutRoundedIcon />}
                    variant="outlined"
                  >
                    {signingOut ? "Signing out…" : "Sign out"}
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

function StateFrame({ children }: { children: ReactNode }) {
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, sm: 10 } }}>
      {children}
    </Container>
  );
}

function DetailsPanel({
  children,
  compact = false,
  description,
  title,
}: {
  children: ReactNode;
  compact?: boolean;
  description: string;
  title: string;
}) {
  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: { xs: 2, sm: 2.5 }, pb: compact ? { xs: 1.25, sm: 1.5 } : { xs: 1.5, sm: 1.75 } }}>
        <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mt: 0.35 }}>
          {description}
        </Typography>
      </Box>
      <Box>{children}</Box>
    </Box>
  );
}

function DetailRow({
  capitalized = false,
  icon,
  label,
  value,
}: {
  capitalized?: boolean;
  icon: ReactNode;
  label: string;
  value: unknown;
}) {
  const displayValue = value ? String(value) : "Not provided";

  return (
    <Stack
      direction="row"
      spacing={1.25}
      sx={{ alignItems: "center", minHeight: 64, px: { xs: 2, sm: 2.5 }, py: 1.25 }}
    >
      <Box sx={{ color: "primary.main", display: "grid", placeItems: "center" }}>{icon}</Box>
      <Typography color="text.secondary" variant="body2" sx={{ flex: "0 0 96px" }}>
        {label}
      </Typography>
      <Typography
        align="right"
        variant="body2"
        sx={{
          flex: 1,
          fontWeight: 600,
          overflowWrap: "anywhere",
          textTransform: capitalized ? "capitalize" : "none",
        }}
      >
        {displayValue}
      </Typography>
    </Stack>
  );
}

function SettingsLink({
  href,
  icon,
  subtitle,
  title,
}: {
  href: string;
  icon: ReactNode;
  subtitle: string;
  title: string;
}) {
  return (
    <ListItemButton
      className="surface-hover"
      component={Link}
      href={href}
      sx={{ alignItems: "center", borderRadius: 0, gap: 1.25, minHeight: 72, px: { xs: 2, sm: 2.5 } }}
    >
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
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mt: 0.2 }}>
          {subtitle}
        </Typography>
      </Box>
      <ChevronRightRoundedIcon color="action" fontSize="small" />
    </ListItemButton>
  );
}

function AccountSkeleton() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3, lg: 4 } }}>
      <Stack spacing={3}>
        <Box>
          <Skeleton width={126} />
          <Skeleton height={38} width="28%" />
          <Skeleton width="42%" />
        </Box>
        <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, overflow: "hidden" }}>
          <Skeleton height={104} variant="rectangular" />
          <Stack direction="row" spacing={2} sx={{ alignItems: "end", mt: -4, p: 2.5, position: "relative" }}>
            <Skeleton height={84} variant="circular" width={84} />
            <Box sx={{ flex: 1 }}><Skeleton width="30%" /><Skeleton width="45%" /></Box>
          </Stack>
        </Box>
        <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", lg: "1.12fr .88fr" } }}>
          {[0, 1, 2].map((item) => (
            <Box key={item} sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 2.5 }}>
              <Skeleton width="35%" />
              <Skeleton width="60%" />
              <Stack spacing={1.25} sx={{ mt: 2 }}>
                <Skeleton height={42} />
                <Skeleton height={42} />
              </Stack>
            </Box>
          ))}
        </Box>
      </Stack>
    </Container>
  );
}
