"use client";

import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import MeetingRoomRoundedIcon from "@mui/icons-material/MeetingRoomRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";

import { MarketingPageShell } from "@/components/content/marketing-page-shell";
import {
  MarketingCallout,
  MarketingCard,
  MarketingGrid,
} from "@/components/content/marketing-ui";
import { useLanguage } from "@/components/providers/language-provider";

const topics = [
  {
    action: false,
    description: [
      "Understand property details, photos, address and location setup.",
      "Elewa taarifa za biashara, picha, anwani na usanidi wa eneo.",
    ],
    icon: ApartmentRoundedIcon,
    title: ["Property setup", "Usanidi wa biashara"],
  },
  {
    action: false,
    description: [
      "Learn how room types, prices, capacity, amenities and status work together.",
      "Jifunze jinsi aina za vyumba, bei, uwezo, huduma na hali vinavyofanya kazi pamoja.",
    ],
    icon: MeetingRoomRoundedIcon,
    title: ["Rooms", "Vyumba"],
  },
  {
    action: false,
    description: [
      "Understand availability, booking creation, check-in and check-out.",
      "Elewa upatikanaji, kutengeneza uhifadhi, kuingia na kuondoka.",
    ],
    icon: EventAvailableRoundedIcon,
    title: ["Bookings", "Uhifadhi"],
  },
  {
    action: false,
    description: [
      "Invite teammates and understand the access available to each property role.",
      "Alika washiriki na elewa ruhusa zinazopatikana kwa kila jukumu.",
    ],
    icon: GroupsRoundedIcon,
    title: ["Team & access", "Timu na ruhusa"],
  },
  {
    action: false,
    description: [
      "Keep guest identity, contact and stay information organised.",
      "Weka utambulisho, mawasiliano na taarifa za ukaaji wa wageni kwa mpangilio.",
    ],
    icon: PersonRoundedIcon,
    title: ["Guests", "Wageni"],
  },
  {
    action: true,
    description: [
      "Find concise answers about accounts, access, setup and daily use.",
      "Pata majibu mafupi kuhusu akaunti, ruhusa, usanidi na matumizi ya kila siku.",
    ],
    icon: HelpOutlineRoundedIcon,
    title: ["Common questions", "Maswali ya kawaida"],
  },
] as const;

export default function HelpPage() {
  const { t } = useLanguage();

  return (
    <MarketingPageShell
      cta={false}
      description={[
        "Start with the topic that matches the work you are doing, or contact the Loji Business team for direct support.",
        "Anza na mada inayolingana na kazi unayofanya, au wasiliana na timu ya Loji Business kwa msaada wa moja kwa moja.",
      ]}
      eyebrow={["HELP CENTRE", "KITUO CHA MSAADA"]}
      title={[
        "Find the right answer, one task at a time.",
        "Pata jibu sahihi, kazi moja baada ya nyingine.",
      ]}
    >
      <MarketingGrid>
        {topics.map(({ action, description, icon: Icon, title }) => (
          <MarketingCard
            action={
              action
                ? { href: "/faq", label: t("Open FAQs", "Fungua maswali") }
                : undefined
            }
            description={t(description[0], description[1])}
            icon={<Icon />}
            key={title[0]}
            title={t(title[0], title[1])}
          />
        ))}
      </MarketingGrid>
      <MarketingCallout
        action={{ href: "/contact", label: t("Contact support", "Wasiliana na msaada") }}
        description={t(
          "Share what you were trying to do, the screen you were on and any message you saw so we can help efficiently.",
          "Eleza ulichokuwa unajaribu kufanya, ukurasa uliokuwa nao na ujumbe wowote ulioona ili tukusaidie haraka.",
        )}
        title={t("Need direct support?", "Unahitaji msaada wa moja kwa moja?")}
      />
    </MarketingPageShell>
  );
}
