"use client";

import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
} from "@mui/material";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import { useAppFeedback } from "@/components/providers/feedback-provider";
import { useLanguage } from "@/components/providers/language-provider";
import {
  useDirtyNavigation,
  useEphemeralDraft,
  useUnsavedChanges,
} from "@/components/providers/unsaved-changes-provider";
import {
  StickyMobileActionBar,
  WorkspacePage,
} from "@/components/shared/workspace-ui";
import { useGuestWorkspace } from "@/features/guests/hooks/use-guest-workspace";
import type { GuestProfile } from "@/features/guests/models/guest";
import { updatePropertyGuest } from "@/features/guests/services/guest-service";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { createClient } from "@/lib/supabase/client";

import { GuestFormSections } from "./guest-edit-fields";
import {
  guestInputsDiffer,
  guestToInput,
  normalizeGuest,
  toGuestUpdateInput,
  validateGuest,
  type DraftNotice,
  type GuestEditorDraft,
  type GuestField,
  type GuestForm,
} from "./guest-edit-form-model";
import {
  FormActions,
  GuestEditHeader,
  GuestEditLoading,
  GuestEditState,
} from "./guest-edit-layout";

export function GuestEditScreen({ guestId }: { guestId: string }) {
  const { t } = useLanguage();
  const {
    session,
    loading: sessionLoading,
    error: sessionError,
  } = useAppSession();
  const propertyId = session?.activePropertyId;
  const {
    workspace: loadedWorkspace,
    loading,
    error,
    refresh,
  } = useGuestWorkspace(propertyId, guestId);
  const workspace =
    loadedWorkspace &&
    loadedWorkspace.propertyId === propertyId &&
    loadedWorkspace.guest.id === guestId
      ? loadedWorkspace
      : null;
  const guestHref = `/guests/${encodeURIComponent(guestId)}`;

  if (sessionLoading || (!workspace && loading)) return <GuestEditLoading />;

  if (sessionError || !propertyId) {
    return (
      <GuestEditState
        actionLabel={t("Back to guests", "Rudi kwa wageni")}
        actionHref="/guests"
        description={
          sessionError?.message ??
          t(
            "Select an active property before editing a guest profile.",
            "Chagua biashara inayotumika kabla ya kuhariri wasifu wa mgeni.",
          )
        }
        title={t("Guest editor unavailable", "Kihariri cha mgeni hakipatikani")}
      />
    );
  }

  if (!workspace) {
    return (
      <GuestEditState
        actionLabel={t("Back to guests", "Rudi kwa wageni")}
        actionHref="/guests"
        description={
          error?.message ??
          t(
            "This guest could not be found in the active property.",
            "Mgeni huyu hakupatikana kwenye biashara inayotumika.",
          )
        }
        onRetry={() => void refresh()}
        title={t("Guest not found", "Mgeni hajapatikana")}
      />
    );
  }

  if (!workspace.capabilities.updateGuest) {
    return (
      <GuestEditState
        actionLabel={t("View guest profile", "Tazama wasifu wa mgeni")}
        actionHref={guestHref}
        description={t(
          "Your role can view this record but cannot change guest identity or contact details.",
          "Jukumu lako linaweza kuona rekodi hii lakini haliwezi kubadilisha utambulisho au mawasiliano ya mgeni.",
        )}
        icon={<LockOutlinedIcon />}
        title={t("Editing is restricted", "Uhariri umezuiwa")}
      />
    );
  }

  return (
    <GuestEditForm
      canEditSensitive={["owner", "manager"].includes(
        workspace.role.toLowerCase(),
      )}
      guest={workspace.guest}
      guestHref={guestHref}
      key={`${workspace.propertyId}:${workspace.guest.id}`}
      propertyId={propertyId}
      userId={session?.user?.id ?? "unknown-user"}
    />
  );
}

function GuestEditForm({
  canEditSensitive,
  guest,
  guestHref,
  propertyId,
  userId,
}: {
  canEditSensitive: boolean;
  guest: GuestProfile;
  guestHref: string;
  propertyId: string;
  userId: string;
}) {
  const router = useRouter();
  const feedback = useAppFeedback();
  const { t } = useLanguage();
  const { requestNavigation } = useDirtyNavigation();
  const client = useMemo(() => createClient(), []);
  const initial = useMemo(() => guestToInput(guest), [guest]);
  const draftKey = [
    "guest-editor",
    userId,
    propertyId,
    guest.id,
    canEditSensitive ? "sensitive" : "standard",
  ].join(":");
  const draftStore = useEphemeralDraft<GuestEditorDraft>(draftKey);
  const storedDraft = useMemo(() => draftStore.read(), [draftStore]);
  const restoredDraft =
    storedDraft && !guestInputsDiffer(storedDraft.baseline, initial)
      ? storedDraft
      : null;
  const [baseline, setBaseline] = useState<GuestForm>(initial);
  const [form, setForm] = useState<GuestForm>(restoredDraft?.form ?? initial);
  const [draftNotice, setDraftNotice] = useState<DraftNotice>(() => {
    if (restoredDraft) return "restored";
    return storedDraft ? "stale" : null;
  });
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalized = normalizeGuest(form);
  const errors = validateGuest(normalized, t);
  const invalid = Object.keys(errors).length > 0;
  const dirty = guestInputsDiffer(baseline, normalized);
  const clearUnsavedChanges = useUnsavedChanges(dirty, draftStore.clear);

  useEffect(() => {
    if (storedDraft && !restoredDraft) draftStore.clear();
  }, [draftStore, restoredDraft, storedDraft]);

  const changeField =
    (field: GuestField) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      const nextForm = { ...form, [field]: value };
      setForm(nextForm);
      if (guestInputsDiffer(baseline, normalizeGuest(nextForm))) {
        draftStore.write({ baseline, form: nextForm });
      } else {
        draftStore.clear();
      }
      setError(null);
    };

  const discardRestoredDraft = () => {
    draftStore.clear();
    setForm(initial);
    setAttempted(false);
    setError(null);
    setDraftNotice(null);
  };

  const helperText = (field: GuestField, fallback = " ") =>
    attempted && errors[field] ? errors[field] : fallback;

  const requestCancel = () => {
    if (saving) return;
    void requestNavigation(() => router.push(guestHref));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);
    if (invalid || !dirty || saving) return;

    setSaving(true);
    setError(null);
    try {
      const updatedGuestId = await updatePropertyGuest(
        client,
        propertyId,
        guest.id,
        toGuestUpdateInput(normalized, canEditSensitive, guest.updatedAt),
      );
      feedback.success(
        t("Guest profile updated.", "Wasifu wa mgeni umesasishwa."),
      );
      draftStore.clear();
      setBaseline(normalized);
      clearUnsavedChanges();
      router.replace(`/guests/${encodeURIComponent(updatedGuestId)}`);
      router.refresh();
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t(
              "Unable to update this guest profile.",
              "Imeshindikana kusasisha wasifu wa mgeni huyu.",
            );
      setError(message);
      feedback.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100dvh", pb: { xs: 13, md: 0 } }}>
      <WorkspacePage maxWidth={1080}>
        <Box
          component="form"
          id="guest-edit-form"
          noValidate
          onSubmit={(event) => void submit(event)}
        >
          <Stack spacing={{ xs: 2, sm: 2.5, lg: 3 }}>
            <GuestEditHeader guest={guest} onCancel={requestCancel} />

            {draftNotice === "restored" ? (
              <Alert
                action={
                  <Button
                    color="inherit"
                    onClick={discardRestoredDraft}
                    size="small"
                    type="button"
                  >
                    {t("Discard draft", "Ondoa rasimu")}
                  </Button>
                }
                onClose={() => setDraftNotice(null)}
                severity="info"
              >
                {t(
                  "Your unsaved draft was restored from this tab.",
                  "Rasimu yako ambayo haijahifadhiwa imerejeshwa kutoka kwenye kichupo hiki.",
                )}
              </Alert>
            ) : draftNotice === "stale" ? (
              <Alert onClose={() => setDraftNotice(null)} severity="warning">
                {t(
                  "This guest changed while you were away, so the older draft was not restored.",
                  "Taarifa za mgeni huyu zilibadilika ulipokuwa mbali, hivyo rasimu ya zamani haikurejeshwa.",
                )}
              </Alert>
            ) : null}

            {error ? (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            ) : null}
            {attempted && invalid ? (
              <Alert severity="warning">
                {t(
                  "Review the highlighted fields before saving.",
                  "Kagua sehemu zilizoangaziwa kabla ya kuhifadhi.",
                )}
              </Alert>
            ) : null}
            {!canEditSensitive ? (
              <Alert severity="info">
                {t(
                  "This role can update guest contact and travel details. Identity documents, emergency contacts, and internal notes remain protected and unchanged.",
                  "Jukumu hili linaweza kusasisha mawasiliano na taarifa za safari. Vitambulisho, mawasiliano ya dharura na maelezo ya ndani yanalindwa na hayabadilishwi.",
                )}
              </Alert>
            ) : null}

            <GuestFormSections
              attempted={attempted}
              canEditSensitive={canEditSensitive}
              changeField={changeField}
              errors={errors}
              form={form}
              helperText={helperText}
              saving={saving}
              t={t}
            />

            <Box sx={{ display: { xs: "none", md: "block" } }}>
              <FormActions
                dirty={dirty}
                onCancel={requestCancel}
                saving={saving}
                t={t}
              />
            </Box>
          </Stack>
        </Box>
      </WorkspacePage>

      <StickyMobileActionBar>
        <Stack direction="row" spacing={1}>
          <Button
            disabled={saving}
            fullWidth
            onClick={requestCancel}
            variant="outlined"
          >
            {t("Cancel", "Ghairi")}
          </Button>
          <Button
            disabled={saving || !dirty}
            form="guest-edit-form"
            fullWidth
            startIcon={
              saving ? (
                <CircularProgress color="inherit" size={16} />
              ) : (
                <SaveRoundedIcon />
              )
            }
            type="submit"
            variant="contained"
          >
            {saving ? t("Saving…", "Inahifadhi…") : t("Save", "Hifadhi")}
          </Button>
        </Stack>
      </StickyMobileActionBar>
    </Box>
  );
}
