"use client";

import { MarketingPageShell } from "@/components/content/marketing-page-shell";
import {
  MarketingCallout,
  MarketingCard,
  MarketingGrid,
} from "@/components/content/marketing-ui";
import { useLanguage } from "@/components/providers/language-provider";

const updates = [
  {
    date: ["August 2026", "Agosti 2026"],
    description: [
      "A unified responsive shell, role-aware dashboards and focused workspaces for calendar, guests, operations, finance, reports and activity.",
      "Muundo mmoja unaobadilika kwa skrini, dashibodi kulingana na jukumu na sehemu maalum za kalenda, wageni, shughuli, fedha, ripoti na matukio.",
    ],
    title: ["A clearer operations workspace", "Sehemu ya shughuli iliyo wazi zaidi"],
  },
  {
    date: ["August 2026", "Agosti 2026"],
    description: [
      "Property setup now saves incomplete progress and resumes safely after an interruption without creating duplicate workspaces.",
      "Usanidi wa biashara sasa huhifadhi hatua ambazo hazijakamilika na kuendelea salama baada ya kukatizwa bila kutengeneza sehemu za kazi mara mbili.",
    ],
    title: ["Resumable property setup", "Usanidi wa biashara unaoendelea"],
  },
  {
    date: ["August 2026", "Agosti 2026"],
    description: [
      "Users with access to more than one property can switch between authorised workspaces from the application shell.",
      "Watumiaji wenye ruhusa kwenye biashara zaidi ya moja wanaweza kubadili kati ya sehemu zao zilizoidhinishwa.",
    ],
    title: ["Property switching", "Kubadili biashara"],
  },
  {
    date: ["August 2026", "Agosti 2026"],
    description: [
      "Public pages, onboarding and account settings now use one Apple-blue visual system across light and dark modes.",
      "Kurasa za umma, usanidi na mipangilio ya akaunti sasa zinatumia mfumo mmoja wa Apple-blue katika mwanga na giza.",
    ],
    title: ["Design and language consistency", "Uthabiti wa muundo na lugha"],
  },
] as const;

export default function WhatsNewPage() {
  const { t } = useLanguage();

  return (
    <MarketingPageShell
      cta={false}
      description={[
        "Follow meaningful improvements that make property operations clearer, safer and easier for hospitality teams.",
        "Fuatilia maboresho yanayofanya shughuli za biashara kuwa wazi, salama na rahisi kwa timu za malazi.",
      ]}
      eyebrow={["WHAT’S NEW", "MABORESHO MAPYA"]}
      title={[
        "Loji Business keeps getting better.",
        "Loji Business inaendelea kuboreshwa.",
      ]}
    >
      <MarketingGrid columns={{ xs: 1, md: 2 }}>
        {updates.map(({ date, description, title }) => (
          <MarketingCard
            description={t(description[0], description[1])}
            key={title[0]}
            meta={t(date[0], date[1])}
            title={t(title[0], title[1])}
          />
        ))}
      </MarketingGrid>
      <MarketingCallout
        action={{ href: "/features", label: t("Explore the product", "Angalia bidhaa") }}
        description={t(
          "See how rooms, bookings, guests, team access and operational visibility work together.",
          "Ona jinsi vyumba, uhifadhi, wageni, ruhusa za timu na mwonekano wa shughuli vinavyofanya kazi pamoja.",
        )}
        title={t("See the complete workspace", "Ona sehemu kamili ya kazi")}
      />
    </MarketingPageShell>
  );
}
