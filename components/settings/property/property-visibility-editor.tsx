"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { SettingsSection } from "@/components/settings/settings-shared";
import { EmptyState, StatusPill, Surface } from "@/components/shared/workspace-ui";
import { usePropertySettings } from "@/features/settings/property/hooks/use-property-settings";
import type { PropertySettingsWorkspace } from "@/features/settings/property/models/property-settings";
import { notifyPropertySettingsChanged, updatePropertyVisibility } from "@/features/settings/property/services/property-settings-service";
import {
  EditorSaveBar,
  PropertyEditorHeader,
  PropertySettingsError,
  PropertySettingsLoading,
} from "./property-settings-shared";

export function PropertyVisibilityEditor() {
  const { t } = useLanguage();
  const state = usePropertySettings();
  if (state.loading) return <PropertySettingsLoading />;
  if (!state.workspace || !state.propertyId) return <PropertySettingsError message={state.error ?? t("Property settings were not found.", "Mipangilio ya biashara haijapatikana.")} onRetry={() => void state.refresh()} />;
  if (!state.workspace.capabilities.changeVisibility) {
    return <Surface padding={false}><EmptyState actionHref="/settings/property" actionLabel={t("View property overview", "Tazama muhtasari wa biashara")} description={t("Only the property owner can activate or hide this workspace. Managers can continue editing other safe property settings.", "Ni mmiliki pekee anayeweza kuwasha au kuficha biashara. Mameneja wanaweza kuendelea kuhariri mipangilio mingine.")} icon={<LockOutlinedIcon />} title={t("Owner approval required", "Idhini ya mmiliki inahitajika")} /></Surface>;
  }
  return <VisibilityForm client={state.client} propertyId={state.propertyId} workspace={state.workspace} />;
}

function VisibilityForm({ client, propertyId, workspace }: { client: ReturnType<typeof usePropertySettings>["client"]; propertyId: string; workspace: PropertySettingsWorkspace }) {
  const { t } = useLanguage();
  const feedback = useAppFeedback();
  const router = useRouter();
  const initial = workspace.property.isActive;
  const [isActive, setIsActive] = useState(initial);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = isActive !== initial;

  const review = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (dirty && !saving) setConfirmOpen(true);
  };

  const confirm = async () => {
    if (!dirty || saving) return;
    setConfirmOpen(false);
    setSaving(true);
    setError(null);
    try {
      await updatePropertyVisibility(client, propertyId, isActive);
      notifyPropertySettingsChanged();
      feedback.success(isActive ? t("Property activated.", "Biashara imewashwa.") : t("Property hidden.", "Biashara imefichwa."));
      router.replace("/settings/property");
      router.refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t("Unable to change property visibility.", "Imeshindikana kubadili mwonekano wa biashara.");
      setError(message);
      feedback.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack component="form" onSubmit={review} spacing={{ xs: 2.5, sm: 3 }}>
        <PropertyEditorHeader description={t("Control whether this property is active in operational and booking workflows.", "Dhibiti kama biashara hii inatumika kwenye uendeshaji na uhifadhi.")} icon={<PublicOutlinedIcon />} title={t("Status and visibility", "Hali na mwonekano")} />
        {error ? <Alert severity="error">{error}</Alert> : null}
        <Surface>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}><Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t("Current property status", "Hali ya sasa ya biashara")}</Typography><Typography color="text.secondary" variant="body2">{t("Visibility changes are owner-only and recorded in the activity log.", "Mabadiliko ya mwonekano ni ya mmiliki pekee na hurekodiwa kwenye historia.")}</Typography></Box><StatusPill label={initial ? t("Active", "Inatumika") : t("Hidden", "Imefichwa")} tone={initial ? "success" : "warning"} /></Stack>
        </Surface>
        <SettingsSection description={t("Choose the state that should apply after you save.", "Chagua hali itakayotumika baada ya kuhifadhi.")} title={t("Property state", "Hali ya biashara")}>
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" }, p: { xs: 2, sm: 2.5 } }}>
            <StatusChoice active={isActive} description={t("The property remains available to staff workflows and eligible booking surfaces.", "Biashara itaendelea kupatikana kwenye kazi za timu na sehemu za uhifadhi.")} icon={<CheckCircleRoundedIcon />} label={t("Active", "Inatumika")} onClick={() => setIsActive(true)} tone="success" />
            <StatusChoice active={!isActive} description={t("The property is hidden from active booking flows while its records remain intact.", "Biashara itafichwa kwenye utaratibu wa uhifadhi huku taarifa zake zikibaki salama.")} icon={<VisibilityOffOutlinedIcon />} label={t("Hidden", "Imefichwa")} onClick={() => setIsActive(false)} tone="warning" />
          </Box>
        </SettingsSection>
        {!isActive ? <Alert icon={<WarningAmberRoundedIcon />} severity="warning">{t("Hiding a property can interrupt new bookings and daily operations. Existing records are preserved.", "Kuficha biashara kunaweza kusitisha uhifadhi mpya na uendeshaji wa kila siku. Taarifa zilizopo zitahifadhiwa.")}</Alert> : null}
        <EditorSaveBar dirty={dirty} saving={saving} submitLabel={t("Review status change", "Kagua mabadiliko ya hali")} />
      </Stack>
      <Dialog fullWidth maxWidth="xs" onClose={() => setConfirmOpen(false)} open={confirmOpen}>
        <DialogTitle>{isActive ? t("Activate this property?", "Washa biashara hii?") : t("Hide this property?", "Ficha biashara hii?")}</DialogTitle>
        <DialogContent><Typography color="text.secondary" variant="body2">{isActive ? t("The property will return to active operational and booking workflows.", "Biashara itarudi kwenye uendeshaji na utaratibu wa uhifadhi.") : t("New booking visibility may stop immediately. Existing rooms, bookings, guests, and history will remain stored.", "Uhifadhi mpya unaweza kusimama mara moja. Vyumba, uhifadhi uliopo, wageni na historia vitabaki.")}</Typography></DialogContent>
        <DialogActions><Button onClick={() => setConfirmOpen(false)}>{t("Cancel", "Ghairi")}</Button><Button color={isActive ? "primary" : "warning"} onClick={() => void confirm()} variant="contained">{isActive ? t("Activate property", "Washa biashara") : t("Hide property", "Ficha biashara")}</Button></DialogActions>
      </Dialog>
    </>
  );
}

function StatusChoice({ active, description, icon, label, onClick, tone }: { active: boolean; description: string; icon: React.ReactNode; label: string; onClick: () => void; tone: "success" | "warning" }) {
  return <Button aria-pressed={active} color={tone} onClick={onClick} sx={{ alignItems: "flex-start", borderColor: active ? `${tone}.main` : "divider", borderWidth: active ? 2 : 1, flexDirection: "column", justifyContent: "flex-start", minHeight: 168, p: 2, textAlign: "left", whiteSpace: "normal", "&:hover": { borderWidth: active ? 2 : 1 } }} variant="outlined"><Box sx={{ mb: 1.25 }}>{icon}</Box><Typography color="text.primary" variant="subtitle1" sx={{ fontWeight: 700 }}>{label}</Typography><Typography color="text.secondary" sx={{ lineHeight: 1.55, mt: 0.5 }} variant="body2">{description}</Typography></Button>;
}
