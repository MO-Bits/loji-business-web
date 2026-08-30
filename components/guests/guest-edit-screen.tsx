"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import ContactEmergencyOutlinedIcon from "@mui/icons-material/ContactEmergencyOutlined";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import NotesRoundedIcon from "@mui/icons-material/NotesRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import TravelExploreRoundedIcon from "@mui/icons-material/TravelExploreRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useAppFeedback } from "@/components/providers/feedback-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import {
  EmptyState,
  StickyMobileActionBar,
  Surface,
  WorkspacePage,
} from "@/components/shared/workspace-ui";
import { useGuestWorkspace } from "@/features/guests/hooks/use-guest-workspace";
import type {
  GuestProfile,
  GuestUpdateInput,
} from "@/features/guests/models/guest";
import { updatePropertyGuest } from "@/features/guests/services/guest-service";
import { useAppSession } from "@/features/session/hooks/use-app-session";
import { createClient } from "@/lib/supabase/client";

import { GuestAvatar } from "./guest-shared";

type GuestForm = Required<GuestUpdateInput>;
type GuestField = keyof GuestForm;
type GuestErrors = Partial<Record<GuestField, string>>;
type Translate = (english: string, swahili: string) => string;

const phonePattern = /^[+()\d.\-\s]+$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const genderOptions = ["male", "female", "other", "prefer_not_to_say"];
const idTypeOptions = [
  "national_id",
  "passport",
  "driving_license",
  "voter_id",
  "other",
];

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
  } = useGuestWorkspace(
    propertyId,
    guestId,
  );
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
    />
  );
}

function GuestEditForm({
  canEditSensitive,
  guest,
  guestHref,
  propertyId,
}: {
  canEditSensitive: boolean;
  guest: GuestProfile;
  guestHref: string;
  propertyId: string;
}) {
  const router = useRouter();
  const feedback = useAppFeedback();
  const { t } = useLanguage();
  const client = useMemo(() => createClient(), []);
  const initial = useMemo(() => guestToInput(guest), [guest]);
  const [form, setForm] = useState<GuestForm>(initial);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const normalized = normalizeGuest(form);
  const errors = validateGuest(normalized, t);
  const invalid = Object.keys(errors).length > 0;
  const dirty = guestInputsDiffer(initial, normalized);

  useEffect(() => {
    if (!dirty || saving) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [dirty, saving]);

  const changeField =
    (field: GuestField) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setForm((current) => ({ ...current, [field]: value }));
      setError(null);
    };

  const helperText = (field: GuestField, fallback = " ") =>
    attempted && errors[field] ? errors[field] : fallback;

  const requestCancel = () => {
    if (saving) return;
    if (dirty) {
      setDiscardOpen(true);
      return;
    }
    router.push(guestHref);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);
    if (invalid || !dirty || saving) return;

    setSaving(true);
    setError(null);
    try {
      await updatePropertyGuest(
        client,
        propertyId,
        guest.id,
        toGuestUpdateInput(normalized, canEditSensitive),
      );
      feedback.success(
        t("Guest profile updated.", "Wasifu wa mgeni umesasishwa."),
      );
      router.replace(guestHref);
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

  const genderValues = choiceOptions(genderOptions, form.gender);
  const idTypeValues = choiceOptions(idTypeOptions, form.idType);

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
            <GuestEditHeader
              guest={guest}
              onCancel={requestCancel}
            />

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

            <FormSection
              description={t(
                "Use the guest's legal or preferred name and the details your front desk needs to identify them.",
                "Tumia jina rasmi au analopendelea mgeni na taarifa zinazohitajika na mapokezi kumtambua.",
              )}
              icon={<PersonOutlineRoundedIcon />}
              title={t("Personal details", "Taarifa binafsi")}
            >
              <FieldGrid>
                <TextField
                  autoComplete="given-name"
                  disabled={saving}
                  error={attempted && Boolean(errors.firstName)}
                  helperText={helperText(
                    "firstName",
                    t("Required", "Inahitajika"),
                  )}
                  label={t("First name", "Jina la kwanza")}
                  onChange={changeField("firstName")}
                  required
                  slotProps={{ htmlInput: { maxLength: 80 } }}
                  value={form.firstName}
                />
                <TextField
                  autoComplete="family-name"
                  disabled={saving}
                  error={attempted && Boolean(errors.lastName)}
                  helperText={helperText(
                    "lastName",
                    t("Required", "Inahitajika"),
                  )}
                  label={t("Last name", "Jina la mwisho")}
                  onChange={changeField("lastName")}
                  required
                  slotProps={{ htmlInput: { maxLength: 80 } }}
                  value={form.lastName}
                />
                <TextField
                  disabled={saving}
                  error={attempted && Boolean(errors.gender)}
                  helperText={helperText("gender", t("Required", "Inahitajika"))}
                  label={t("Gender", "Jinsia")}
                  onChange={changeField("gender")}
                  required
                  select
                  value={form.gender}
                >
                  <MenuItem value="">
                    {t("Select gender", "Chagua jinsia")}
                  </MenuItem>
                  {genderValues.map((value) => (
                    <MenuItem key={value} value={value}>
                      {choiceLabel(value, t)}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  autoComplete="tel"
                  disabled={saving}
                  error={attempted && Boolean(errors.phone)}
                  helperText={helperText("phone", t("Required", "Inahitajika"))}
                  label={t("Phone number", "Namba ya simu")}
                  onChange={changeField("phone")}
                  placeholder="+255 7xx xxx xxx"
                  required
                  slotProps={{ htmlInput: { inputMode: "tel", maxLength: 32 } }}
                  value={form.phone}
                />
              </FieldGrid>
            </FormSection>

            <FormSection
              description={t(
                "Keep contact and profile information useful for confirmations, reporting, and personalized service.",
                "Weka mawasiliano na taarifa za wasifu zinazofaa kwa uthibitisho, ripoti na huduma binafsi.",
              )}
              icon={<EditRoundedIcon />}
              title={t("Contact & profile", "Mawasiliano na wasifu")}
            >
              <FieldGrid>
                <TextField
                  autoComplete="email"
                  disabled={saving}
                  error={attempted && Boolean(errors.email)}
                  helperText={helperText("email", t("Optional", "Si lazima"))}
                  label={t("Email address", "Anwani ya barua pepe")}
                  onChange={changeField("email")}
                  slotProps={{ htmlInput: { inputMode: "email", maxLength: 254 } }}
                  type="email"
                  value={form.email}
                />
                <TextField
                  autoComplete="country-name"
                  disabled={saving}
                  error={attempted && Boolean(errors.nationality)}
                  helperText={helperText(
                    "nationality",
                    t("Optional", "Si lazima"),
                  )}
                  label={t("Nationality", "Uraia")}
                  onChange={changeField("nationality")}
                  slotProps={{ htmlInput: { maxLength: 80 } }}
                  value={form.nationality}
                />
                <TextField
                  autoComplete="organization-title"
                  disabled={saving}
                  error={attempted && Boolean(errors.occupation)}
                  helperText={helperText(
                    "occupation",
                    t("Optional", "Si lazima"),
                  )}
                  label={t("Occupation", "Kazi")}
                  onChange={changeField("occupation")}
                  slotProps={{ htmlInput: { maxLength: 120 } }}
                  value={form.occupation}
                />
                <TextField
                  autoComplete="street-address"
                  disabled={saving}
                  error={attempted && Boolean(errors.address)}
                  helperText={helperText(
                    "address",
                    t(`${form.address.length}/500 · Optional`, `${form.address.length}/500 · Si lazima`),
                  )}
                  label={t("Address", "Anwani")}
                  minRows={3}
                  multiline
                  onChange={changeField("address")}
                  slotProps={{ htmlInput: { maxLength: 500 } }}
                  sx={{ gridColumn: { sm: "1 / -1" } }}
                  value={form.address}
                />
              </FieldGrid>
            </FormSection>

            <FormSection
              description={t(
                canEditSensitive
                  ? "Travel and identification details support arrival preparation and statutory guest records."
                  : "Travel details help the front desk prepare for arrivals and onward journeys.",
                canEditSensitive
                  ? "Taarifa za safari na utambulisho husaidia maandalizi ya kuwasili na rekodi rasmi za wageni."
                  : "Taarifa za safari husaidia mapokezi kuandaa kuwasili na safari inayofuata.",
              )}
              icon={<TravelExploreRoundedIcon />}
              title={
                canEditSensitive
                  ? t("Travel & identity", "Safari na utambulisho")
                  : t("Travel details", "Taarifa za safari")
              }
            >
              <FieldGrid>
                <TextField
                  disabled={saving}
                  error={attempted && Boolean(errors.whereFrom)}
                  helperText={helperText(
                    "whereFrom",
                    t("Optional", "Si lazima"),
                  )}
                  label={t("Coming from", "Anakotoka")}
                  onChange={changeField("whereFrom")}
                  slotProps={{ htmlInput: { maxLength: 120 } }}
                  value={form.whereFrom}
                />
                <TextField
                  disabled={saving}
                  error={attempted && Boolean(errors.whereTo)}
                  helperText={helperText("whereTo", t("Optional", "Si lazima"))}
                  label={t("Going to", "Anakoenda")}
                  onChange={changeField("whereTo")}
                  slotProps={{ htmlInput: { maxLength: 120 } }}
                  value={form.whereTo}
                />
                {canEditSensitive ? (
                  <>
                    <TextField
                      disabled={saving}
                      error={attempted && Boolean(errors.idType)}
                      helperText={helperText("idType", t("Optional", "Si lazima"))}
                      label={t("ID type", "Aina ya kitambulisho")}
                      onChange={changeField("idType")}
                      select
                      value={form.idType}
                    >
                      <MenuItem value="">
                        {t("Not recorded", "Haijaandikwa")}
                      </MenuItem>
                      {idTypeValues.map((value) => (
                        <MenuItem key={value} value={value}>
                          {choiceLabel(value, t)}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      disabled={saving}
                      error={attempted && Boolean(errors.idNumber)}
                      helperText={helperText(
                        "idNumber",
                        form.idType
                          ? t("Required for the selected ID type", "Inahitajika kwa aina ya kitambulisho iliyochaguliwa")
                          : t("Optional", "Si lazima"),
                      )}
                      label={t("ID number", "Namba ya kitambulisho")}
                      onChange={changeField("idNumber")}
                      required={Boolean(form.idType)}
                      slotProps={{ htmlInput: { maxLength: 100 } }}
                      value={form.idNumber}
                    />
                  </>
                ) : null}
              </FieldGrid>
            </FormSection>

            {canEditSensitive ? (
              <FormSection
                description={t(
                  "Emergency details help the team respond safely. Internal notes are visible only to authorized property staff.",
                  "Taarifa za dharura husaidia timu kujibu kwa usalama. Maelezo ya ndani yanaonekana kwa wafanyakazi walioidhinishwa tu.",
                )}
                icon={<ContactEmergencyOutlinedIcon />}
                title={t("Emergency contact & notes", "Mawasiliano ya dharura na maelezo")}
              >
                <FieldGrid>
                <TextField
                  autoComplete="off"
                  disabled={saving}
                  error={attempted && Boolean(errors.emergencyContactName)}
                  helperText={helperText(
                    "emergencyContactName",
                    t("Optional", "Si lazima"),
                  )}
                  label={t("Emergency contact name", "Jina la mawasiliano ya dharura")}
                  onChange={changeField("emergencyContactName")}
                  slotProps={{ htmlInput: { maxLength: 160 } }}
                  value={form.emergencyContactName}
                />
                <TextField
                  autoComplete="off"
                  disabled={saving}
                  error={attempted && Boolean(errors.emergencyContactPhone)}
                  helperText={helperText(
                    "emergencyContactPhone",
                    t("Optional", "Si lazima"),
                  )}
                  label={t("Emergency contact phone", "Simu ya mawasiliano ya dharura")}
                  onChange={changeField("emergencyContactPhone")}
                  placeholder="+255 7xx xxx xxx"
                  slotProps={{ htmlInput: { inputMode: "tel", maxLength: 32 } }}
                  value={form.emergencyContactPhone}
                />
                <TextField
                  disabled={saving}
                  error={attempted && Boolean(errors.notes)}
                  helperText={helperText(
                    "notes",
                    t(`${form.notes.length}/1000 · Internal`, `${form.notes.length}/1000 · Ya ndani`),
                  )}
                  label={t("Internal guest notes", "Maelezo ya ndani ya mgeni")}
                  minRows={5}
                  multiline
                  onChange={changeField("notes")}
                  placeholder={t(
                    "Record service preferences, accessibility needs, or context the team should know.",
                    "Andika mapendeleo ya huduma, mahitaji ya ufikiaji au taarifa muhimu kwa timu.",
                  )}
                  slotProps={{ htmlInput: { maxLength: 1000 } }}
                  sx={{ gridColumn: { sm: "1 / -1" } }}
                  value={form.notes}
                />
                </FieldGrid>
              </FormSection>
            ) : null}

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
              saving ? <CircularProgress color="inherit" size={16} /> : <SaveRoundedIcon />
            }
            type="submit"
            variant="contained"
          >
            {saving ? t("Saving…", "Inahifadhi…") : t("Save", "Hifadhi")}
          </Button>
        </Stack>
      </StickyMobileActionBar>

      <ResponsiveModal
        maxWidth="xs"
        onClose={saving ? undefined : () => setDiscardOpen(false)}
        open={discardOpen}
      >
        <DialogTitle>{t("Discard changes?", "Ondoa mabadiliko?")}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            {t(
              "The guest profile has unsaved changes. Leaving now will discard them.",
              "Wasifu wa mgeni una mabadiliko ambayo hayajahifadhiwa. Kuondoka sasa kutayaondoa.",
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscardOpen(false)}>
            {t("Keep editing", "Endelea kuhariri")}
          </Button>
          <Button color="error" onClick={() => router.push(guestHref)}>
            {t("Discard", "Ondoa")}
          </Button>
        </DialogActions>
      </ResponsiveModal>
    </Box>
  );
}

function GuestEditHeader({
  guest,
  onCancel,
}: {
  guest: GuestProfile;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  return (
    <Stack spacing={2}>
      <Button
        onClick={onCancel}
        startIcon={<ArrowBackRoundedIcon />}
        sx={{ alignSelf: "flex-start" }}
      >
        {t("Guest profile", "Wasifu wa mgeni")}
      </Button>
      <Surface>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 2, sm: 2.5 }}
          sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0 }}>
            <GuestAvatar name={guest.name} size={58} />
            <Box sx={{ minWidth: 0 }}>
              <Typography color="primary.main" variant="overline">
                {t("Guest record", "Rekodi ya mgeni")}
              </Typography>
              <Typography
                component="h1"
                sx={{
                  fontSize: { xs: "1.45rem", sm: "1.75rem" },
                  fontWeight: 700,
                  letterSpacing: "-.035em",
                  lineHeight: 1.15,
                }}
              >
                {t("Edit guest", "Hariri mgeni")}
              </Typography>
              <Typography color="text.secondary" noWrap variant="body2">
                {guest.name}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
            <BadgeOutlinedIcon color="primary" fontSize="small" />
            <Typography color="text.secondary" variant="caption">
              {t(
                "Permission-checked guest data",
                "Taarifa za mgeni zilizokaguliwa ruhusa",
              )}
            </Typography>
          </Stack>
        </Stack>
      </Surface>
    </Stack>
  );
}

function FormSection({
  children,
  description,
  icon,
  title,
}: {
  children: ReactNode;
  description: ReactNode;
  icon: ReactNode;
  title: ReactNode;
}) {
  return (
    <Surface padding={false}>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ alignItems: "flex-start", p: { xs: 2, sm: 2.5 } }}
      >
        <Box
          aria-hidden="true"
          sx={{
            alignItems: "center",
            bgcolor: "color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent)",
            borderRadius: 2,
            color: "primary.main",
            display: "flex",
            flexShrink: 0,
            height: 40,
            justifyContent: "center",
            width: 40,
            "& .MuiSvgIcon-root": { fontSize: 21 },
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" sx={{ fontWeight: 700 }} variant="h6">
            {title}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.35 }} variant="body2">
            {description}
          </Typography>
        </Box>
      </Stack>
      <Divider />
      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>{children}</Box>
    </Surface>
  );
}

function FieldGrid({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: { xs: 1.5, sm: 2 },
        gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "repeat(2,minmax(0,1fr))" },
      }}
    >
      {children}
    </Box>
  );
}

function FormActions({
  dirty,
  onCancel,
  saving,
  t,
}: {
  dirty: boolean;
  onCancel: () => void;
  saving: boolean;
  t: Translate;
}) {
  return (
    <Surface padding={false}>
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: "center", justifyContent: "space-between", px: 2.5, py: 2 }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
          <NotesRoundedIcon color="action" fontSize="small" />
          <Typography color="text.secondary" variant="body2">
            {dirty
              ? t("You have unsaved changes.", "Una mabadiliko ambayo hayajahifadhiwa.")
              : t("This guest profile is up to date.", "Wasifu huu wa mgeni umesasishwa.")}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Button disabled={saving} onClick={onCancel} variant="outlined">
            {t("Cancel", "Ghairi")}
          </Button>
          <Button
            disabled={saving || !dirty}
            startIcon={
              saving ? <CircularProgress color="inherit" size={16} /> : <SaveRoundedIcon />
            }
            type="submit"
            variant="contained"
          >
            {saving
              ? t("Saving changes…", "Inahifadhi mabadiliko…")
              : t("Save changes", "Hifadhi mabadiliko")}
          </Button>
        </Stack>
      </Stack>
    </Surface>
  );
}

function GuestEditLoading() {
  return (
    <WorkspacePage maxWidth={1080}>
      <Stack aria-label="Loading guest editor" spacing={{ xs: 2, sm: 2.5 }}>
        <Skeleton height={36} width={150} />
        <Surface>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Skeleton height={58} variant="circular" width={58} />
            <Box sx={{ flex: 1 }}>
              <Skeleton height={31} width="34%" />
              <Skeleton width="24%" />
            </Box>
          </Stack>
        </Surface>
        {[0, 1, 2].map((item) => (
          <Surface key={item}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.5}>
                <Skeleton height={40} variant="rounded" width={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton width="32%" />
                  <Skeleton width="68%" />
                </Box>
              </Stack>
              <Divider />
              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)" },
                }}
              >
                <Skeleton height={56} variant="rounded" />
                <Skeleton height={56} variant="rounded" />
              </Box>
            </Stack>
          </Surface>
        ))}
      </Stack>
    </WorkspacePage>
  );
}

function GuestEditState({
  actionHref,
  actionLabel,
  description,
  icon,
  onRetry,
  title,
}: {
  actionHref: string;
  actionLabel: string;
  description: string;
  icon?: ReactNode;
  onRetry?: () => void;
  title: string;
}) {
  const { t } = useLanguage();
  return (
    <WorkspacePage maxWidth={760}>
      <Surface>
        <EmptyState
          actionHref={actionHref}
          actionLabel={actionLabel}
          description={description}
          icon={icon ?? <PersonOutlineRoundedIcon />}
          title={title}
        />
        {onRetry ? (
          <Button fullWidth onClick={onRetry} sx={{ mt: -3 }}>
            {t("Try again", "Jaribu tena")}
          </Button>
        ) : null}
      </Surface>
    </WorkspacePage>
  );
}

function guestToInput(guest: GuestProfile): GuestForm {
  return normalizeGuest({
    firstName: guest.firstName,
    lastName: guest.lastName,
    gender: normalizeChoice(guest.gender),
    phone: guest.phone,
    email: guest.email,
    nationality: guest.nationality,
    occupation: guest.occupation,
    address: guest.address,
    whereFrom: guest.whereFrom,
    whereTo: guest.whereTo,
    idType: normalizeChoice(guest.idType),
    idNumber: guest.idNumber,
    emergencyContactName: guest.emergencyContactName,
    emergencyContactPhone: guest.emergencyContactPhone,
    notes: guest.notes,
  });
}

function normalizeGuest(guest: GuestForm): GuestForm {
  return {
    firstName: guest.firstName.trim(),
    lastName: guest.lastName.trim(),
    gender: normalizeChoice(guest.gender),
    phone: guest.phone.trim(),
    email: guest.email.trim().toLowerCase(),
    nationality: guest.nationality.trim(),
    occupation: guest.occupation.trim(),
    address: guest.address.trim(),
    whereFrom: guest.whereFrom.trim(),
    whereTo: guest.whereTo.trim(),
    idType: normalizeChoice(guest.idType),
    idNumber: guest.idNumber.trim(),
    emergencyContactName: guest.emergencyContactName.trim(),
    emergencyContactPhone: guest.emergencyContactPhone.trim(),
    notes: guest.notes.trim(),
  };
}

function validateGuest(guest: GuestForm, t: Translate): GuestErrors {
  const errors: GuestErrors = {};

  if (!guest.firstName || guest.firstName.length > 80) {
    errors.firstName = t(
      "Enter a first name with up to 80 characters.",
      "Weka jina la kwanza lenye herufi zisizozidi 80.",
    );
  }
  if (!guest.lastName || guest.lastName.length > 80) {
    errors.lastName = t(
      "Enter a last name with up to 80 characters.",
      "Weka jina la mwisho lenye herufi zisizozidi 80.",
    );
  }
  if (!guest.gender || guest.gender.length > 32) {
    errors.gender = t("Select a gender.", "Chagua jinsia.");
  }
  if (
    guest.phone.length < 5 ||
    guest.phone.length > 32 ||
    !phonePattern.test(guest.phone)
  ) {
    errors.phone = t(
      "Enter a valid phone number with 5–32 characters.",
      "Weka namba sahihi ya simu yenye herufi 5–32.",
    );
  }
  if (guest.email && (guest.email.length > 254 || !emailPattern.test(guest.email))) {
    errors.email = t(
      "Enter a valid email address.",
      "Weka anwani sahihi ya barua pepe.",
    );
  }
  if (guest.nationality.length > 80) {
    errors.nationality = t(
      "Use no more than 80 characters.",
      "Tumia herufi zisizozidi 80.",
    );
  }
  if (guest.occupation.length > 120) {
    errors.occupation = t(
      "Use no more than 120 characters.",
      "Tumia herufi zisizozidi 120.",
    );
  }
  if (guest.address.length > 500) {
    errors.address = t(
      "Keep the address under 500 characters.",
      "Anwani iwe chini ya herufi 500.",
    );
  }
  if (guest.whereFrom.length > 120) {
    errors.whereFrom = t(
      "Use no more than 120 characters.",
      "Tumia herufi zisizozidi 120.",
    );
  }
  if (guest.whereTo.length > 120) {
    errors.whereTo = t(
      "Use no more than 120 characters.",
      "Tumia herufi zisizozidi 120.",
    );
  }
  if (guest.idType.length > 40) {
    errors.idType = t(
      "Select a valid ID type.",
      "Chagua aina sahihi ya kitambulisho.",
    );
  }
  if (guest.idNumber.length > 100) {
    errors.idNumber = t(
      "Use no more than 100 characters.",
      "Tumia herufi zisizozidi 100.",
    );
  } else if (guest.idType && !guest.idNumber) {
    errors.idNumber = t(
      "Enter the number for the selected ID type.",
      "Weka namba ya aina ya kitambulisho iliyochaguliwa.",
    );
  } else if (guest.idNumber && !guest.idType) {
    errors.idType = t(
      "Select the type for this ID number.",
      "Chagua aina ya namba hii ya kitambulisho.",
    );
  }
  if (guest.emergencyContactName.length > 160) {
    errors.emergencyContactName = t(
      "Use no more than 160 characters.",
      "Tumia herufi zisizozidi 160.",
    );
  }
  if (
    guest.emergencyContactPhone &&
    (guest.emergencyContactPhone.length < 5 ||
      guest.emergencyContactPhone.length > 32 ||
      !phonePattern.test(guest.emergencyContactPhone))
  ) {
    errors.emergencyContactPhone = t(
      "Enter a valid emergency phone number.",
      "Weka namba sahihi ya simu ya dharura.",
    );
  }
  if (guest.notes.length > 1000) {
    errors.notes = t(
      "Keep internal notes under 1,000 characters.",
      "Maelezo ya ndani yawe chini ya herufi 1,000.",
    );
  }

  return errors;
}

function guestInputsDiffer(left: GuestForm, right: GuestForm) {
  return (Object.keys(left) as GuestField[]).some(
    (field) => left[field] !== right[field],
  );
}

function toGuestUpdateInput(
  guest: GuestForm,
  includeSensitive: boolean,
): GuestUpdateInput {
  return {
    firstName: guest.firstName,
    lastName: guest.lastName,
    gender: guest.gender,
    phone: guest.phone,
    email: guest.email,
    nationality: guest.nationality,
    occupation: guest.occupation,
    address: guest.address,
    whereFrom: guest.whereFrom,
    whereTo: guest.whereTo,
    ...(includeSensitive
      ? {
          idType: guest.idType,
          idNumber: guest.idNumber,
          emergencyContactName: guest.emergencyContactName,
          emergencyContactPhone: guest.emergencyContactPhone,
          notes: guest.notes,
        }
      : {}),
  };
}

function normalizeChoice(value: string) {
  return value.trim().toLowerCase().replaceAll(" ", "_");
}

function choiceOptions(options: string[], current: string) {
  return current && !options.includes(current) ? [current, ...options] : options;
}

function choiceLabel(value: string, t: Translate) {
  const known: Record<string, [string, string]> = {
    male: ["Male", "Mwanaume"],
    female: ["Female", "Mwanamke"],
    other: ["Other", "Nyingine"],
    prefer_not_to_say: ["Prefer not to say", "Napendelea kutosema"],
    national_id: ["National ID", "Kitambulisho cha taifa"],
    passport: ["Passport", "Pasipoti"],
    driving_license: ["Driving licence", "Leseni ya udereva"],
    voter_id: ["Voter ID", "Kitambulisho cha mpiga kura"],
  };
  const label = known[value];
  return label ? t(label[0], label[1]) : value.replaceAll("_", " ");
}
