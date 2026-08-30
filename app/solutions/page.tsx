"use client";

import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import CottageRoundedIcon from "@mui/icons-material/CottageRounded";
import DomainRoundedIcon from "@mui/icons-material/DomainRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";

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
    title: ["Lodges", "Lodge"],
  },
  {
    description: [
      "Give an independent guesthouse a reliable daily workspace without adding unnecessary complexity.",
      "Ipe guesthouse huru sehemu ya kuaminika ya shughuli za kila siku bila kuongeza ugumu usiohitajika.",
    ],
    icon: ApartmentRoundedIcon,
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
  {
    description: [
      "Organise units, stays and guest records as your apartment or short-stay portfolio grows.",
      "Panga nyumba, ukaaji na taarifa za wageni kadri biashara yako ya apartment au short-stay inavyokua.",
    ],
    icon: DomainRoundedIcon,
    title: ["Apartments & short stays", "Apartment na short-stay"],
  },
] as const;

export default function SolutionsPage() {
  const { t } = useLanguage();

  return (
    <MarketingPageShell
      description={[
        "Whether you run one lodge or a growing accommodation portfolio, Loji Business gives your team one operational workspace.",
        "Iwe una lodge moja au biashara ya malazi inayokua, Loji Business inaipa timu yako sehemu moja ya kusimamia shughuli.",
      ]}
      eyebrow={["SOLUTIONS", "SULUHISHO"]}
      title={[
        "Built around the way accommodation businesses work.",
        "Imejengwa kuendana na namna biashara za malazi zinavyofanya kazi.",
      ]}
    >
      <MarketingGrid columns={{ xs: 1, sm: 2 }}>
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
          "Tell us your property type and room count. We will help you identify the clearest way to set up your workspace.",
          "Tuambie aina ya biashara na idadi ya vyumba. Tutakusaidia kuona njia iliyo wazi zaidi ya kuandaa sehemu yako ya kazi.",
        )}
        title={t("Not sure where your property fits?", "Huna uhakika biashara yako inafaa wapi?")}
      />
    </MarketingPageShell>
  );
}
