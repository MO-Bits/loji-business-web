"use client";

import { useRouter } from "next/navigation";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import SearchOffRoundedIcon from "@mui/icons-material/SearchOffRounded";

import { AppStateScreen } from "@/components/session/app-state-screen";
import { useLanguage } from "@/components/providers/language-provider";

export default function NotFound() {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <AppStateScreen
      description={t(
        "The address may be incorrect, or this page may have moved. Use the dashboard to continue working.",
        "Anwani inaweza kuwa si sahihi, au ukurasa huu umehamishwa. Tumia dashibodi kuendelea na kazi.",
      )}
      eyebrow="404"
      icon={<SearchOffRoundedIcon />}
      primaryAction={{
        href: "/dashboard",
        icon: <DashboardRoundedIcon />,
        label: t("Open dashboard", "Fungua dashibodi"),
      }}
      secondaryAction={{
        icon: <ArrowBackRoundedIcon />,
        label: t("Go back", "Rudi nyuma"),
        onClick: () => router.back(),
      }}
      title={t("This page isn’t here", "Ukurasa huu haupo")}
      tone="info"
    />
  );
}
