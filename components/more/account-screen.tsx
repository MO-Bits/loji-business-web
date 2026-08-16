"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import { Alert, Avatar, Box, Button, CircularProgress, Container, Divider, Paper, Stack, Typography } from "@mui/material";
import { createClient } from "@/lib/supabase/client";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { getMyAccount } from "@/features/more/services/more-service";

type Account = Awaited<ReturnType<typeof getMyAccount>>;

export function AccountScreen() {
  const router = useRouter();
  const { session } = useAppSession();
  const supabase = useMemo(() => createClient(), []);
  const [account, setAccount] = useState<Account>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!session?.activePropertyId) return; let live = true; getMyAccount(supabase, session.activePropertyId).then((value) => { if (live) setAccount(value); }).catch((cause) => { if (live) setError(cause instanceof Error ? cause.message : "Unable to load account."); }).finally(() => { if (live) setLoading(false); }); return () => { live = false; }; }, [session?.activePropertyId, supabase]);
  if (loading) return <Centered><CircularProgress size={28} /></Centered>;
  if (error) return <Centered><Alert severity="error">{error}</Alert></Centered>;
  if (!account) return <Centered><Typography color="text.secondary">Profile not found</Typography></Centered>;
  const name = String(account.display_name ?? "User");
  return <Container maxWidth="sm" sx={{ py: { xs: 2, md: 5 } }}><Stack spacing={3}><Button color="inherit" startIcon={<ArrowBackRoundedIcon />} onClick={() => router.back()} sx={{ alignSelf: "flex-start" }}>Back</Button><Stack sx={{ alignItems: "center" }}><Avatar src={account.avatar_url ?? undefined} sx={{ fontSize: "2rem", height: 90, width: 90 }}>{name[0]?.toUpperCase()}</Avatar><Typography variant="h4" sx={{ mt: 2 }}>{name}</Typography></Stack><InfoCard title="Personal Details" rows={[[<EmailRoundedIcon key="email" />, "Email", account.email], [<PhoneRoundedIcon key="phone" />, "Phone", account.phone]]} /><InfoCard title="Property Membership" rows={[[<ShieldRoundedIcon key="role" />, "Role", account.role], [<ShieldRoundedIcon key="status" />, "Status", account.status]]} /></Stack></Container>;
}

function Centered({ children }: { children: React.ReactNode }) { return <Box sx={{ display: "grid", minHeight: "70dvh", placeItems: "center", p: 3 }}>{children}</Box>; }
function InfoCard({ title, rows }: { title: string; rows: [React.ReactNode, string, unknown][] }) { return <Box><Typography color="text.secondary" sx={{ fontSize: ".76rem", fontWeight: 800, letterSpacing: ".1em", mb: 1, px: 1 }}>{title.toUpperCase()}</Typography><Paper variant="outlined">{rows.map(([icon, label, value], index) => <Box key={label}>{index > 0 && <Divider />}<Stack direction="row" spacing={1.5} sx={{ alignItems: "center", p: 2 }}>{icon}<Typography sx={{ fontWeight: 650 }}>{label}</Typography><Typography color="text.secondary" sx={{ ml: "auto!important", textTransform: label === "Role" || label === "Status" ? "capitalize" : "none" }}>{String(value ?? "-")}</Typography></Stack></Box>)}</Paper></Box>; }
