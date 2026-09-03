"use client";

import Link from "next/link";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import { Box, Button, Divider, Stack, Typography } from "@mui/material";

import { useLanguage } from "@/components/providers/language-provider";
import { EmptyState, SectionHeading, StatusPill, Surface } from "@/components/shared/workspace-ui";
import type { OutstandingBalances } from "@/features/finance/models/finance";
import { formatLocalDate } from "@/lib/date-time";

const money = new Intl.NumberFormat("en-TZ", { style: "currency", currency: "TZS", maximumFractionDigits: 0 });

export function OutstandingBalancesPanel({ data }: { data: OutstandingBalances | null }) {
  const { t } = useLanguage();
  const total = data?.totalBalance ?? 0;
  const description = data?.truncated
    ? t(
        `Showing the first ${data.itemsReturned} of ${data.totalCount} balances. The total includes every open balance.`,
        `Inaonyesha salio ${data.itemsReturned} za kwanza kati ya ${data.totalCount}. Jumla inajumuisha salio zote zilizo wazi.`,
      )
    : t(
        "Collect balances directly from the booking workspace before checkout.",
        "Kusanya salio moja kwa moja kwenye uhifadhi kabla ya kumtoa mgeni.",
      );
  return (
    <Surface padding={false}>
      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
        <SectionHeading
          action={<StatusPill label={money.format(total)} tone={total ? "warning" : "success"} />}
          description={description}
          title={t("Outstanding balances", "Salio linalodaiwa")}
        />
      </Box>
      <Divider />
      {data?.items.length ? <Stack divider={<Divider flexItem />}>{data.items.map((item) => (
        <Stack direction={{ xs: "column", sm: "row" }} key={item.bookingId} spacing={1.5} sx={{ alignItems: { sm: "center" }, p: 2 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <Typography sx={{ fontWeight: 700 }}>{item.guestName}</Typography>
              {item.overdue ? <StatusPill label={t("Due", "Linatakiwa")} tone="warning" /> : null}
            </Stack>
            <Typography color="text.secondary" variant="body2">{item.roomName} · {item.bookingNumber} · {t("Checkout", "Kutoka")} {formatLocalDate(item.checkOut)}</Typography>
            {item.guestPhone ? <Typography color="text.secondary" variant="caption">{item.guestPhone}</Typography> : null}
          </Box>
          <Box sx={{ minWidth: { sm: 150 }, textAlign: { sm: "right" } }}>
            <Typography color="warning.main" sx={{ fontWeight: 800 }}>{money.format(item.balance)}</Typography>
            <Typography color="text.secondary" variant="caption">{t(`${money.format(item.paid)} paid`, `${money.format(item.paid)} imelipwa`)}</Typography>
          </Box>
          <Button component={Link} href={`/bookings/${item.bookingId}?action=payment`} startIcon={<PaymentsRoundedIcon />} variant="contained">{t("Record payment", "Rekodi malipo")}</Button>
        </Stack>
      ))}</Stack> : <EmptyState description={t("Every active booking is fully settled.", "Kila uhifadhi unaoendelea umelipwa kikamilifu.")} icon={<PaymentsRoundedIcon />} title={t("No outstanding balances", "Hakuna salio linalodaiwa")} />}
    </Surface>
  );
}
