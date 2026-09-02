"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import OtherHousesRoundedIcon from "@mui/icons-material/OtherHousesRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import VillaRoundedIcon from "@mui/icons-material/VillaRounded";
import {
  Box,
  ButtonBase,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { ElementType, ReactNode } from "react";

import { useLanguage } from "@/components/providers/language-provider";
import {
  hospitalityBusinessTypes,
  MAX_ONBOARDING_ROOMS,
  tanzaniaRegions,
  type BusinessSetupDraft,
  type HospitalityBusinessType,
} from "@/features/onboarding/models/business-setup";

const businessIcons: Record<HospitalityBusinessType, ElementType> = {
  hotel: HotelRoundedIcon,
  lodge: VillaRoundedIcon,
  guesthouse: OtherHousesRoundedIcon,
};

export function BusinessTypeStep({
  value,
  onChange,
}: {
  value: HospitalityBusinessType | null;
  onChange: (value: HospitalityBusinessType) => void;
}) {
  const { t } = useLanguage();
  return (
    <Stack spacing={1.25}>
      {hospitalityBusinessTypes.map((option) => {
        const Icon = businessIcons[option.value];
        return (
          <ChoiceCard
            description={t(option.description[0], option.description[1])}
            icon={<Icon />}
            key={option.value}
            label={t(option.label[0], option.label[1])}
            onClick={() => onChange(option.value)}
            selected={value === option.value}
          />
        );
      })}
    </Stack>
  );
}

export function BusinessNameStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <TextField
      autoComplete="organization"
      autoFocus
      fullWidth
      helperText={t(
        "This is the name staff will see throughout Loji Business.",
        "Hili ndilo jina ambalo wafanyakazi wataliona ndani ya Loji Business.",
      )}
      label={t("Business name", "Jina la biashara")}
      onChange={(event) => onChange(event.target.value.slice(0, 120))}
      placeholder={t("Example: Bahari Lodge", "Mfano: Bahari Lodge")}
      required
      slotProps={{ htmlInput: { maxLength: 120 } }}
      value={value}
    />
  );
}

export function BusinessContactStep({
  draft,
  onChange,
}: {
  draft: BusinessSetupDraft;
  onChange: (field: "businessPhone" | "businessEmail", value: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <Stack spacing={2.5}>
      <TextField
        autoComplete="tel"
        autoFocus
        fullWidth
        label={t("Business phone", "Namba ya simu ya biashara")}
        onChange={(event) => onChange("businessPhone", event.target.value.slice(0, 32))}
        placeholder="+255 7XX XXX XXX"
        required
        slotProps={{ htmlInput: { inputMode: "tel", maxLength: 32 } }}
        value={draft.businessPhone}
      />
      <TextField
        autoComplete="email"
        fullWidth
        helperText={t("Optional", "Si lazima")}
        label={t("Business email", "Barua pepe ya biashara")}
        onChange={(event) => onChange("businessEmail", event.target.value.slice(0, 254))}
        placeholder="biashara@example.com"
        slotProps={{ htmlInput: { inputMode: "email", maxLength: 254 } }}
        type="email"
        value={draft.businessEmail}
      />
    </Stack>
  );
}

export function BusinessAreaStep({
  draft,
  onChange,
}: {
  draft: BusinessSetupDraft;
  onChange: (field: "region" | "district", value: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <Stack spacing={2.5}>
      <TextField
        autoFocus
        fullWidth
        label={t("Region", "Mkoa")}
        onChange={(event) => onChange("region", event.target.value)}
        required
        select
        value={draft.region}
      >
        {tanzaniaRegions.map((region) => (
          <MenuItem key={region} value={region}>
            {region}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        autoComplete="address-level2"
        fullWidth
        label={t("District", "Wilaya")}
        onChange={(event) => onChange("district", event.target.value.slice(0, 120))}
        placeholder={t("Example: Kinondoni", "Mfano: Kinondoni")}
        required
        slotProps={{ htmlInput: { maxLength: 120 } }}
        value={draft.district}
      />
    </Stack>
  );
}

export function BusinessAddressStep({
  draft,
  onChange,
}: {
  draft: BusinessSetupDraft;
  onChange: (field: "ward" | "street", value: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <Stack spacing={2.5}>
      <TextField
        autoComplete="address-level3"
        autoFocus
        fullWidth
        helperText={t("Add a ward when you know it.", "Weka kata ikiwa unaifahamu.")}
        label={t("Ward", "Kata")}
        onChange={(event) => onChange("ward", event.target.value.slice(0, 120))}
        placeholder={t("Example: Mikocheni", "Mfano: Mikocheni")}
        slotProps={{ htmlInput: { maxLength: 120 } }}
        value={draft.ward}
      />
      <TextField
        autoComplete="street-address"
        fullWidth
        helperText={t(
          "A street, neighbourhood or landmark is enough—no map pin is needed.",
          "Mtaa, kitongoji au alama maarufu inatosha—huhitaji kuweka pini ya ramani.",
        )}
        label={t("Street or nearby landmark", "Mtaa au alama ya karibu")}
        onChange={(event) => onChange("street", event.target.value.slice(0, 200))}
        placeholder={t("Example: Near the main bus stand", "Mfano: Karibu na stendi kuu")}
        slotProps={{ htmlInput: { maxLength: 200 } }}
        value={draft.street}
      />
    </Stack>
  );
}

export function RoomCountStep({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const { t } = useLanguage();
  const update = (next: number) =>
    onChange(Math.max(1, Math.min(MAX_ONBOARDING_ROOMS, next)));
  return (
    <Stack spacing={2.5} sx={{ alignItems: "center", py: { xs: 1, sm: 2 } }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <IconButton
          aria-label={t("Remove one room", "Punguza chumba kimoja")}
          disabled={value <= 1}
          onClick={() => update(value - 1)}
          sx={{ border: "1px solid", borderColor: "divider", height: 52, width: 52 }}
        >
          <RemoveRoundedIcon />
        </IconButton>
        <TextField
          slotProps={{
            htmlInput: {
              "aria-label": t("Number of rooms", "Idadi ya vyumba"),
              inputMode: "numeric",
              max: MAX_ONBOARDING_ROOMS,
              min: 1,
              style: {
                fontSize: "2rem",
                fontWeight: 700,
                textAlign: "center",
                width: 112,
              },
            },
          }}
          onChange={(event) => update(Number(event.target.value) || 1)}
          type="number"
          value={value}
        />
        <IconButton
          aria-label={t("Add one room", "Ongeza chumba kimoja")}
          disabled={value >= MAX_ONBOARDING_ROOMS}
          onClick={() => update(value + 1)}
          sx={{ border: "1px solid", borderColor: "divider", height: 52, width: 52 }}
        >
          <AddRoundedIcon />
        </IconButton>
      </Stack>
      <Typography color="text.secondary" sx={{ textAlign: "center" }} variant="body2">
        {t(
          "Count only rooms that guests can book separately.",
          "Hesabu vyumba ambavyo wageni wanaweza kuhifadhi kimoja kimoja.",
        )}
      </Typography>
    </Stack>
  );
}

function ChoiceCard({
  description,
  icon,
  label,
  onClick,
  selected,
}: {
  description: ReactNode;
  icon: ReactNode;
  label: ReactNode;
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <ButtonBase
      aria-pressed={selected}
      onClick={onClick}
      sx={{
        alignItems: "center",
        border: "1.5px solid",
        borderColor: selected ? "primary.main" : "divider",
        borderRadius: 2.5,
        bgcolor: selected
          ? "color-mix(in srgb, var(--mui-palette-primary-main) 6%, var(--mui-palette-background-paper))"
          : "background.paper",
        display: "grid",
        gap: 1.5,
        gridTemplateColumns: "44px minmax(0,1fr)",
        justifyItems: "stretch",
        minHeight: 84,
        p: 2,
        textAlign: "left",
        width: "100%",
        "&:hover": { bgcolor: "action.hover", borderColor: "primary.main" },
      }}
    >
      <Box
        sx={{
          bgcolor: selected ? "primary.main" : "action.hover",
          borderRadius: 2,
          color: selected ? "primary.contrastText" : "text.secondary",
          display: "grid",
          height: 44,
          placeItems: "center",
          width: 44,
          "& .MuiSvgIcon-root": { fontSize: 23 },
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 700 }}>{label}</Typography>
        <Typography color="text.secondary" sx={{ lineHeight: 1.5, mt: 0.25 }} variant="body2">
          {description}
        </Typography>
      </Box>
    </ButtonBase>
  );
}
