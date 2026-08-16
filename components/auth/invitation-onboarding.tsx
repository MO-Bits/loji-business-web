"use client";

import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import ConfirmationNumberRoundedIcon from "@mui/icons-material/ConfirmationNumberRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import { Alert, Box, Button, CircularProgress, Container, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, Paper, Snackbar, Stack, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuthController } from "@/features/auth/hooks/use-auth-controller";
import { createClient } from "@/lib/supabase/client";

type Invitation = { property_name?: string; formatted_address?: string; role?: string };
type RpcResponse = { status?: string; message?: string; invitation?: Invitation };
function resultObject(value: unknown): RpcResponse { return value && typeof value === "object" ? value as RpcResponse : {}; }

export function InvitationOnboarding() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const auth = useAuthController();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const normalizedToken = token.trim().toUpperCase();

  async function loadInvitation() {
    if (!normalizedToken) { setMessage("Please enter your invitation code."); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_invitation_details" as never, { p_token: normalizedToken } as never);
      if (error) throw error;
      const result = resultObject(data);
      if (result.status !== "success") throw new Error(result.message || "Invalid invitation code.");
      setInvitation(result.invitation ?? {});
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to check this invitation."); }
    finally { setLoading(false); }
  }

  async function respond(action: "accept_property_invitation" | "reject_property_invitation") {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc(action as never, { p_token: normalizedToken } as never);
      if (error) throw error;
      const result = resultObject(data);
      if (result.status && result.status !== "success") throw new Error(result.message || "Unable to update the invitation.");
      setInvitation(null);
      if (action === "accept_property_invitation") { setMessage("Welcome to the team 🎉"); router.replace("/dashboard"); router.refresh(); }
      else setMessage(result.message || "Invitation declined.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update the invitation."); }
    finally { setLoading(false); }
  }

  async function signOut() { await auth.signOut(); router.replace("/login"); router.refresh(); }

  return <Box component="main" sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", py: 4 }}><Container maxWidth="sm"><Stack spacing={3}>
    <Box textAlign="center"><Typography variant="h4">Join their team</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Use the invitation code sent by your property administrator.</Typography></Box>
    <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 4 }}><Stack spacing={3}>
      <Alert icon={<InfoRoundedIcon />} severity="info"><strong>Need an invitation code?</strong><br />Ask the staff member who invited you for the 8-character code.</Alert>
      <TextField label="Invitation code" value={token} onChange={(event) => setToken(event.target.value.toUpperCase().slice(0, 9))} placeholder="XXXX-XXXX" autoComplete="off" slotProps={{ input: { startAdornment: <InputAdornment position="start"><ConfirmationNumberRoundedIcon color="primary" /></InputAdornment> }, htmlInput: { style: { textAlign: "center", letterSpacing: 5, fontWeight: 800, textTransform: "uppercase" } } }} />
      <Button variant="contained" size="large" disabled={loading} onClick={() => void loadInvitation()}>{loading ? <CircularProgress size={22} color="inherit" /> : "Continue"}</Button>
      <Button color="error" variant="outlined" startIcon={<LogoutRoundedIcon />} disabled={auth.loading} onClick={() => void signOut()}>Sign out</Button>
    </Stack></Paper>
  </Stack></Container>
  <Dialog open={Boolean(invitation)} onClose={loading ? undefined : () => setInvitation(null)} fullWidth maxWidth="xs"><DialogTitle>Property invitation</DialogTitle><DialogContent><Stack spacing={2.5}>
    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: "primary.main", color: "primary.contrastText" }}><BusinessRoundedIcon sx={{ fontSize: 38 }} /><Typography variant="h5" fontWeight={800} sx={{ mt: 1 }}>{invitation?.property_name || "Property"}</Typography><Typography sx={{ opacity: .86, mt: .75 }}>{invitation?.formatted_address || "Address unavailable"}</Typography></Paper>
    <Typography color="text.secondary">You have been invited as</Typography><Paper variant="outlined" sx={{ p: 2 }}><Stack direction="row" spacing={1.5} alignItems="center"><PersonRoundedIcon color="primary" /><Typography fontWeight={800}>{(invitation?.role || "Staff").toUpperCase()}</Typography></Stack></Paper>
  </Stack></DialogContent><DialogActions sx={{ p: 3, pt: 1 }}><Button color="inherit" disabled={loading} onClick={() => void respond("reject_property_invitation")}>Decline</Button><Button variant="contained" disabled={loading} onClick={() => void respond("accept_property_invitation")}>{loading ? <CircularProgress size={20} color="inherit" /> : "Accept invitation"}</Button></DialogActions></Dialog>
  <Snackbar open={Boolean(message)} autoHideDuration={5000} onClose={() => setMessage(null)}><Alert severity="info" onClose={() => setMessage(null)}>{message}</Alert></Snackbar>
  </Box>;
}
