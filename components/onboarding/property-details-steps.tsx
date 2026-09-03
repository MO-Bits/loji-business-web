"use client";

import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import {
  Box,
  Button,
  ButtonBase,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useLanguage } from "@/components/providers/language-provider";
import {
  acceptedPaymentMethods,
  propertyOfferings,
  type AcceptedPaymentMethod,
  type PropertyOfferingCategory,
} from "@/features/property/property-catalog";

export function BusinessDescriptionStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <Stack spacing={1}>
      <TextField
        autoFocus
        fullWidth
        label={t("Short description (optional)", "Maelezo mafupi (si lazima)")}
        maxRows={6}
        minRows={4}
        multiline
        onChange={(event) => onChange(event.target.value.slice(0, 2000))}
        placeholder={t(
          "For example: A quiet 20-room lodge near the town centre, ideal for business and family stays.",
          "Mfano: Loji tulivu yenye vyumba 20 karibu na katikati ya mji, inayofaa safari za biashara na familia.",
        )}
        slotProps={{ htmlInput: { maxLength: 2000 } }}
        value={value}
      />
      <Typography color="text.secondary" sx={{ textAlign: "right" }} variant="caption">
        {value.length}/2000
      </Typography>
    </Stack>
  );
}

export function PropertyOfferingsStep({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const { t } = useLanguage();
  const toggle = (offering: string) => {
    onChange(value.includes(offering)
      ? value.filter((item) => item !== offering)
      : [...value, offering]);
  };

  return (
    <Stack spacing={2.5}>
      {(["facility", "service"] as PropertyOfferingCategory[]).map((category) => (
        <Stack key={category} spacing={1}>
          <Typography sx={{ fontWeight: 700 }} variant="subtitle2">
            {category === "facility"
              ? t("Facilities", "Vifaa vinavyopatikana")
              : t("Guest services", "Huduma za wageni")}
          </Typography>
          <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" } }}>
            {propertyOfferings.filter((item) => item.category === category).map((offering) => {
              const selected = value.includes(offering.value);
              return (
                <ButtonBase
                  aria-pressed={selected}
                  key={offering.value}
                  onClick={() => toggle(offering.value)}
                  sx={{
                    alignItems: "center",
                    border: "1px solid",
                    borderColor: selected ? "primary.main" : "divider",
                    borderRadius: 2,
                    bgcolor: selected ? "action.selected" : "background.paper",
                    display: "flex",
                    gap: 1,
                    justifyContent: "flex-start",
                    minHeight: 52,
                    px: 1.25,
                    textAlign: "left",
                    "&:hover": { bgcolor: selected ? "action.selected" : "action.hover" },
                  }}
                >
                  <Checkbox
                    checked={selected}
                    disableRipple
                    slotProps={{ input: { "aria-hidden": "true", tabIndex: -1 } }}
                  />
                  <Typography sx={{ fontWeight: selected ? 700 : 500 }} variant="body2">
                    {t(offering.label[0], offering.label[1])}
                  </Typography>
                </ButtonBase>
              );
            })}
          </Box>
        </Stack>
      ))}
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Typography color="text.secondary" variant="body2">
          {t(`${value.length} selected`, `${value.length} zimechaguliwa`)}
        </Typography>
        {value.length ? <Button color="inherit" onClick={() => onChange([])} size="small">{t("Clear", "Ondoa zote")}</Button> : null}
      </Stack>
    </Stack>
  );
}

export function AcceptedPaymentsStep({
  value,
  onChange,
}: {
  value: AcceptedPaymentMethod[];
  onChange: (value: AcceptedPaymentMethod[]) => void;
}) {
  const { t } = useLanguage();
  const toggle = (method: AcceptedPaymentMethod) => {
    onChange(value.includes(method)
      ? value.filter((item) => item !== method)
      : [...value, method]);
  };
  return (
    <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" } }}>
      {acceptedPaymentMethods.map((method) => {
        const selected = value.includes(method.value);
        return (
          <ButtonBase
            aria-pressed={selected}
            key={method.value}
            onClick={() => toggle(method.value)}
            sx={{
              alignItems: "flex-start",
              border: "1px solid",
              borderColor: selected ? "primary.main" : "divider",
              borderRadius: 2,
              display: "flex",
              gap: 1,
              minHeight: 76,
              p: 1.25,
              textAlign: "left",
            }}
          >
            <Box sx={{ bgcolor: selected ? "primary.main" : "action.selected", borderRadius: "50%", color: selected ? "primary.contrastText" : "text.disabled", display: "grid", flexShrink: 0, height: 24, mt: 0.25, placeItems: "center", width: 24 }}>
              <CheckRoundedIcon sx={{ fontSize: 17 }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700 }} variant="body2">{t(method.label[0], method.label[1])}</Typography>
              <Typography color="text.secondary" variant="caption">{t(method.description[0], method.description[1])}</Typography>
            </Box>
          </ButtonBase>
        );
      })}
    </Box>
  );
}

export function OperatingScheduleStep({
  checkinTime,
  checkoutTime,
  onChange,
}: {
  checkinTime: string;
  checkoutTime: string;
  onChange: (field: "checkinTime" | "checkoutTime", value: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <Stack spacing={2}>
      <TextField
        fullWidth
        label={t("Standard check-in time", "Muda wa kawaida wa kuingia")}
        onChange={(event) => onChange("checkinTime", event.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
        type="time"
        value={checkinTime}
      />
      <TextField
        fullWidth
        label={t("Standard checkout time", "Muda wa kawaida wa kutoka")}
        onChange={(event) => onChange("checkoutTime", event.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
        type="time"
        value={checkoutTime}
      />
      <FormControlLabel
        control={<Checkbox checked disabled />}
        label={t("Business timezone: Africa/Dar es Salaam", "Saa za biashara: Africa/Dar es Salaam")}
      />
    </Stack>
  );
}
