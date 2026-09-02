"use client";

import CottageRoundedIcon from "@mui/icons-material/CottageRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import OtherHousesRoundedIcon from "@mui/icons-material/OtherHousesRounded";

import { MarketingPageShell } from "@/components/content/marketing-page-shell";
import {
  MarketingCallout,
  MarketingCard,
  MarketingGrid,
} from "@/components/content/marketing-ui";
import { useLanguage } from "@/components/providers/language-provider";

const solutions = [
  {
    description: [
      "Keep rooms, bookings, arrivals and staff coordinated without relying on scattered notebooks.",
      "Weka vyumba, uhifadhi, wanaowasili na wafanyakazi katika mpangilio bila kutegemea madaftari yaliyotawanyika.",
    ],
    icon: CottageRoundedIcon,
    title: ["Lodges", "Loji"],
  },
  {
    description: [
      "Give an independent guesthouse a reliable daily workspace without adding unnecessary complexity.",
      "Ipe nyumba ya wageni inayojitegemea sehemu ya kuaminika ya shughuli za kila siku bila kuongeza ugumu usiohitajika.",
    ],
    icon: OtherHousesRoundedIcon,
    title: ["Guesthouses", "Nyumba za wageni"],
  },
  {
    description: [
      "Give reception, management and ownership one shared view of rooms, guests and performance.",
      "Wape mapokezi, menejimenti na wamiliki mwonekano mmoja wa vyumba, wageni na utendaji.",
    ],
    icon: HotelRoundedIcon,
    title: ["Hotels", "Hoteli"],
  },
] as const;

export default function SolutionsPage() {
  const { t } = useLanguage();

  return (
    <MarketingPageShell
      description={[
        "Whether you run one lodge or a growing accommodation portfolio, Loji Business gives your team one operational workspace.",
        "Iwe una loji moja au biashara ya malazi inayokua, Loji Business inaipa timu yako sehemu moja ya kusimamia shughuli.",
      ]}
      eyebrow={["SOLUTIONS", "SULUHISHO"]}
      title={[
        "Built around the way accommodation businesses work.",
        "Imejengwa kuendana na namna biashara za malazi zinavyofanya kazi.",
      ]}
    >
      <MarketingGrid columns={{ xs: 1, sm: 3 }}>
        {solutions.map(({ description, icon: Icon, title }) => (
          <MarketingCard
            description={t(description[0], description[1])}
            icon={<Icon />}
            key={title[0]}
            title={t(title[0], title[1])}
          />
        ))}
      </MarketingGrid>
      <MarketingCallout
        action={{ href: "/contact", label: t("Talk to our team", "Wasiliana na timu") }}
        description={t(
          "Loji Business gives hotel, lodge and guesthouse teams one clear workspace for rooms, guests and daily operations.",
          "Loji Business inaipa timu ya hoteli, loji au nyumba ya wageni eneo moja wazi la kusimamia vyumba, wageni na shughuli za kila siku.",
        )}
        title={t("Built only for hospitality teams", "Imeundwa kwa timu za biashara za malazi")}
      />
    </MarketingPageShell>
  );
}
