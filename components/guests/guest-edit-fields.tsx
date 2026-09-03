import ContactEmergencyOutlinedIcon from "@mui/icons-material/ContactEmergencyOutlined";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import TravelExploreRoundedIcon from "@mui/icons-material/TravelExploreRounded";
import {
  Box,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { ChangeEvent, ReactNode } from "react";

import { Surface } from "@/components/shared/workspace-ui";

import {
  choiceLabel,
  choiceOptions,
  genderOptions,
  idTypeOptions,
  type GuestErrors,
  type GuestField,
  type GuestForm,
  type Translate,
} from "./guest-edit-form-model";

type GuestFormSectionsProps = {
  attempted: boolean;
  canEditSensitive: boolean;
  changeField: (
    field: GuestField,
  ) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  errors: GuestErrors;
  form: GuestForm;
  helperText: (field: GuestField, fallback?: string) => string;
  saving: boolean;
  t: Translate;
};

export function GuestFormSections({
  attempted,
  canEditSensitive,
  changeField,
  errors,
  form,
  helperText,
  saving,
  t,
}: GuestFormSectionsProps) {
  const genderValues = choiceOptions(genderOptions, form.gender);
  const idTypeValues = choiceOptions(idTypeOptions, form.idType);

  return (
    <>
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
              t(
                `${form.address.length}/500 · Optional`,
                `${form.address.length}/500 · Si lazima`,
              ),
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
            helperText={helperText("whereFrom", t("Optional", "Si lazima"))}
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
                    ? t(
                        "Required for the selected ID type",
                        "Inahitajika kwa aina ya kitambulisho iliyochaguliwa",
                      )
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
          title={t(
            "Emergency contact & notes",
            "Mawasiliano ya dharura na maelezo",
          )}
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
              label={t(
                "Emergency contact name",
                "Jina la mawasiliano ya dharura",
              )}
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
              label={t(
                "Emergency contact phone",
                "Simu ya mawasiliano ya dharura",
              )}
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
                t(
                  `${form.notes.length}/1000 · Internal`,
                  `${form.notes.length}/1000 · Ya ndani`,
                ),
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
    </>
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
            bgcolor:
              "color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent)",
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
        gridTemplateColumns: {
          xs: "minmax(0,1fr)",
          sm: "repeat(2,minmax(0,1fr))",
        },
      }}
    >
      {children}
    </Box>
  );
}
