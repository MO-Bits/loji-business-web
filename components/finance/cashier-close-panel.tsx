"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PointOfSaleRoundedIcon from "@mui/icons-material/PointOfSaleRounded";
import { Alert, Box, Button, Divider, Stack, TextField, Typography } from "@mui/material";

import { useAppFeedback } from "@/components/providers/feedback-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { LoadingRows, SectionHeading, StatusPill, Surface } from "@/components/shared/workspace-ui";
import { closeCashierDay, getCashierCloseWorkspace } from "@/features/finance/services/finance-service";
import { formatLocalDate, formatLocalDateTime } from "@/lib/date-time";
import { createClient } from "@/lib/supabase/client";

const money = new Intl.NumberFormat("en-TZ", { style: "currency", currency: "TZS", maximumFractionDigits: 0 });

export function CashierClosePanel({ propertyId }: { propertyId: string }) {
  const { t } = useLanguage();
  const feedback = useAppFeedback();
  const client = useMemo(() => createClient(), []);
  const requestKey = useRef(crypto.randomUUID());
  const [workspace, setWorkspace] = useState<Awaited<ReturnType<typeof getCashierCloseWorkspace>> | null>(null);
  const [openingFloat, setOpeningFloat] = useState("0");
  const [countedCash, setCountedCash] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setWorkspace(await getCashierCloseWorkspace(client, propertyId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("Unable to load cashier close.", "Imeshindikana kupakia kufunga kaunta."));
    } finally {
      setLoading(false);
    }
  }, [client, propertyId, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const expectedDrawer = (workspace?.expectedCash ?? 0) + (Number(openingFloat) || 0);
  const currentVariance = (Number(countedCash) || 0) - expectedDrawer;
  const valid = Number(openingFloat) >= 0 && Number(countedCash) >= 0 && countedCash !== "";

  const close = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await closeCashierDay(client, {
        propertyId,
        requestKey: requestKey.current,
        openingFloat: Number(openingFloat),
        countedCash: Number(countedCash),
        notes,
      });
      feedback.success(t("Cashier day closed.", "Siku ya kaunta imefungwa."));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("Unable to close cashier day.", "Imeshindikana kufunga siku ya kaunta."));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !workspace) return <Surface padding={false}><LoadingRows rows={5} /></Surface>;
  return (
    <Stack spacing={2}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Surface>
        <SectionHeading description={workspace?.businessDate ? formatLocalDate(workspace.businessDate, { weekday: "long", day: "numeric", month: "long" }) : undefined} title={t("Cashier closing", "Kufunga kaunta")} />
        {workspace?.closing ? (
          <Stack spacing={1.5} sx={{ mt: 2.5 }}>
            <Alert severity={Math.abs(workspace.closing.variance) < 1 ? "success" : "warning"}>{t("Your cashier day is closed.", "Siku yako ya kaunta imefungwa.")}</Alert>
            <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", md: "repeat(4,minmax(0,1fr))" } }}>
              <CashValue label={t("Opening float", "Kiasi cha kuanzia")} value={workspace.closing.openingFloat} />
              <CashValue label={t("Expected cash", "Taslimu iliyotarajiwa")} value={workspace.closing.expectedCash + workspace.closing.openingFloat} />
              <CashValue label={t("Counted cash", "Taslimu iliyohesabiwa")} value={workspace.closing.countedCash} />
              <CashValue label={t("Variance", "Tofauti")} value={workspace.closing.variance} warning={Math.abs(workspace.closing.variance) >= 1} />
            </Box>
            <Typography color="text.secondary" variant="caption">{t("Closed", "Ilifungwa")} {formatLocalDateTime(workspace.closing.closedAt)}</Typography>
          </Stack>
        ) : (
          <Stack spacing={2} sx={{ mt: 2.5 }}>
            <Alert severity="info">{t(`Cash payments recorded by you today: ${money.format(workspace?.expectedCash ?? 0)}.`, `Malipo ya taslimu uliyorekodi leo: ${money.format(workspace?.expectedCash ?? 0)}.`)}</Alert>
            <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" } }}>
              <TextField label={t("Opening float", "Kiasi cha kuanzia")} onChange={(event) => setOpeningFloat(event.target.value)} slotProps={{ htmlInput: { min: 0 } }} type="number" value={openingFloat} />
              <TextField label={t("Counted cash", "Taslimu iliyohesabiwa")} onChange={(event) => setCountedCash(event.target.value)} slotProps={{ htmlInput: { min: 0 } }} type="number" value={countedCash} />
            </Box>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}><Typography color="text.secondary">{t("Expected drawer", "Kiasi kinachotarajiwa")}</Typography><Typography sx={{ fontWeight: 800 }}>{money.format(expectedDrawer)}</Typography></Stack>
            {countedCash ? <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}><Typography color="text.secondary">{t("Current variance", "Tofauti ya sasa")}</Typography><StatusPill label={money.format(currentVariance)} tone={Math.abs(currentVariance) < 1 ? "success" : "warning"} /></Stack> : null}
            <TextField label={t("Closing notes (optional)", "Maelezo ya kufunga (si lazima)")} maxRows={4} minRows={2} multiline onChange={(event) => setNotes(event.target.value.slice(0, 500))} value={notes} />
            <Button disabled={!valid || saving} onClick={() => void close()} startIcon={<PointOfSaleRoundedIcon />} variant="contained">{saving ? t("Closing…", "Inafunga…") : t("Close cashier day", "Funga siku ya kaunta")}</Button>
          </Stack>
        )}
      </Surface>

      {workspace?.teamClosings.length ? <Surface padding={false}><Box sx={{ p: 2 }}><SectionHeading title={t("Team closing summary", "Muhtasari wa kufunga kwa timu")} /></Box><Divider />{workspace.teamClosings.map((closing) => <Stack direction={{ xs: "column", sm: "row" }} key={closing.id} spacing={1} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between", p: 2 }}><Box><Typography sx={{ fontWeight: 700 }}>{closing.cashierName}</Typography><Typography color="text.secondary" variant="caption">{formatLocalDateTime(closing.closedAt)}</Typography></Box><Stack direction="row" spacing={2}><CashValue label={t("Counted", "Iliyohesabiwa")} value={closing.countedCash} /><CashValue label={t("Variance", "Tofauti")} value={closing.variance} warning={Math.abs(closing.variance) >= 1} /></Stack></Stack>)}</Surface> : null}
    </Stack>
  );
}

function CashValue({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return <Box><Typography color="text.secondary" variant="caption">{label}</Typography><Typography color={warning ? "warning.main" : "text.primary"} sx={{ fontWeight: 800 }}>{money.format(value)}</Typography></Box>;
}
