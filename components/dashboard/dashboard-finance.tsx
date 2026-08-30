"use client";

import Link from "next/link";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import { Box, Button, Divider, Stack, Typography } from "@mui/material";

import { useLanguage } from "@/components/providers/language-provider";
import {
  SectionHeading,
  StatusPill,
  Surface,
} from "@/components/shared/workspace-ui";
import type {
  DashboardFinance,
  DashboardSummary,
} from "@/features/dashboard/models/dashboard";

import { percentage } from "./dashboard-metrics";

const money = new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
});

export function OwnerFinancePanel({
  finance,
  summary,
}: {
  finance: DashboardFinance | null;
  summary: DashboardSummary;
}) {
  const { t } = useLanguage();

  return (
    <Surface padding={false}>
      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
        <SectionHeading
          action={
            <Button
              component={Link}
              endIcon={<ArrowForwardRoundedIcon />}
              href="/finance"
              size="small"
            >
              {t("Finance workspace", "Eneo la fedha")}
            </Button>
          }
          description={t(
            "Today’s collections, exposure, and the operating context behind them.",
            "Makusanyo ya leo, madeni na hali ya uendeshaji inayohusiana nayo.",
          )}
          eyebrow={t("Owner only", "Mmiliki pekee")}
          title={t("Financial position", "Hali ya fedha")}
        />
      </Box>
      <Divider />

      {finance ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0,1fr)",
              md: "repeat(2,minmax(0,1fr))",
              xl: "minmax(0,1.08fr) minmax(0,1fr) minmax(260px,.8fr)",
            },
          }}
        >
          <FinanceValue
            caption={t(
              `${finance.todayPaymentCount} payment${finance.todayPaymentCount === 1 ? "" : "s"} recorded today`,
              `Malipo ${finance.todayPaymentCount} yamerekodiwa leo`,
            )}
            icon={<TrendingUpRoundedIcon />}
            label={t("Collected today", "Makusanyo leo")}
            tone="success"
            value={money.format(finance.todayCollected)}
          />
          <FinanceValue
            caption={t(
              `${finance.openBalanceCount} booking${finance.openBalanceCount === 1 ? "" : "s"} require follow-up`,
              `Uhifadhi ${finance.openBalanceCount} unahitaji ufuatiliaji`,
            )}
            icon={<AccountBalanceWalletRoundedIcon />}
            label={t("Outstanding balances", "Madeni yaliyobaki")}
            tone={finance.outstandingBalance > 0 ? "warning" : "success"}
            value={money.format(finance.outstandingBalance)}
          />
          <BusinessPulse finance={finance} summary={summary} />
        </Box>
      ) : (
        <Stack spacing={1} sx={{ alignItems: "flex-start", p: { xs: 2, sm: 2.5 } }}>
          <AccountBalanceWalletRoundedIcon color="disabled" />
          <Typography sx={{ fontWeight: 700 }}>
            {t("Financial snapshot unavailable", "Muhtasari wa fedha haupatikani")}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {t(
              "Refresh this dashboard or open Finance to review the ledger.",
              "Sasisha dashibodi au fungua Fedha ili kukagua daftari.",
            )}
          </Typography>
          <Button component={Link} href="/finance" variant="outlined">
            {t("Open finance", "Fungua fedha")}
          </Button>
        </Stack>
      )}
    </Surface>
  );
}

function FinanceValue({
  caption,
  icon,
  label,
  tone,
  value,
}: {
  caption: string;
  icon: React.ReactNode;
  label: string;
  tone: "success" | "warning";
  value: string;
}) {
  return (
    <Stack
      spacing={1.25}
      sx={{
        borderBottom: { xs: "1px solid", md: 0 },
        borderRight: { md: "1px solid" },
        borderColor: "divider",
        minWidth: 0,
        p: { xs: 2, sm: 2.5 },
        "&:nth-of-type(2)": {
          borderRight: { md: 0, xl: "1px solid" },
        },
      }}
    >
      <Stack direction="row" spacing={0.9} sx={{ alignItems: "center" }}>
        <Box
          sx={{
            bgcolor: tone === "success"
              ? "color-mix(in srgb, var(--mui-palette-success-main) 11%, transparent)"
              : "color-mix(in srgb, var(--mui-palette-warning-main) 13%, transparent)",
            borderRadius: 1.75,
            color: tone === "success" ? "success.main" : "warning.main",
            display: "grid",
            height: 36,
            placeItems: "center",
            width: 36,
            "& .MuiSvgIcon-root": { fontSize: 20 },
          }}
        >
          {icon}
        </Box>
        <Typography color="text.secondary" sx={{ fontSize: ".75rem", fontWeight: 500 }}>
          {label}
        </Typography>
      </Stack>
      <Typography
        sx={{
          color: tone === "success" ? "text.primary" : "warning.dark",
          fontSize: { xs: "1.55rem", sm: "1.85rem" },
          fontVariantNumeric: "tabular-nums",
          fontWeight: 700,
          letterSpacing: "-.04em",
          lineHeight: 1.05,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </Typography>
      <Typography color="text.secondary" variant="caption">
        {caption}
      </Typography>
    </Stack>
  );
}

function BusinessPulse({
  finance,
  summary,
}: {
  finance: DashboardFinance;
  summary: DashboardSummary;
}) {
  const { t } = useLanguage();
  const occupancy = percentage(summary.occupiedRooms, summary.totalActiveRooms);
  const readiness = percentage(summary.readyRooms, summary.totalActiveRooms);
  const averagePayment = finance.todayPaymentCount
    ? finance.todayCollected / finance.todayPaymentCount
    : 0;

  return (
    <Stack
      spacing={1.5}
      sx={{
        bgcolor: "color-mix(in srgb, var(--mui-palette-primary-main) 4%, var(--mui-palette-background-paper))",
        borderTop: { md: "1px solid", xl: 0 },
        borderColor: "divider",
        gridColumn: { md: "1 / -1", xl: "auto" },
        minWidth: 0,
        p: { xs: 2, sm: 2.5 },
      }}
    >
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Stack direction="row" spacing={0.7} sx={{ alignItems: "center" }}>
          <PaymentsRoundedIcon color="primary" fontSize="small" />
          <Typography sx={{ fontSize: ".8125rem", fontWeight: 700 }}>
            {t("Business pulse", "Muhtasari wa biashara")}
          </Typography>
        </Stack>
        <StatusPill
          label={finance.openBalanceCount ? t("Follow-up", "Fuatilia") : t("On track", "Iko sawa")}
          tone={finance.openBalanceCount ? "warning" : "success"}
        />
      </Stack>
      <PulseRow label={t("Average payment", "Wastani wa malipo")} value={money.format(averagePayment)} />
      <PulseRow label={t("Occupancy", "Matumizi ya vyumba")} value={`${occupancy}%`} />
      <PulseRow label={t("Rooms ready", "Vyumba tayari")} value={`${readiness}%`} />
      <PulseRow
        label={t("Guest movements due", "Mienendo ya wageni")}
        value={String(summary.arrivalsDue + summary.departuresDue)}
      />
    </Stack>
  );
}

function PulseRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", justifyContent: "space-between" }}>
      <Typography color="text.secondary" variant="caption">
        {label}
      </Typography>
      <Typography sx={{ fontSize: ".8125rem", fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
        {value}
      </Typography>
    </Stack>
  );
}
