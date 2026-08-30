"use client";

import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";

import { MarketingPageShell } from "@/components/content/marketing-page-shell";
import {
  MarketingCallout,
  MarketingCard,
  MarketingGrid,
} from "@/components/content/marketing-ui";
import { useLanguage } from "@/components/providers/language-provider";

const channels = [
  {
    href: "mailto:lojipms@gmail.com",
    icon: EmailRoundedIcon,
    label: ["Send an email", "Tuma barua pepe"],
    newTab: false,
    title: ["Email support", "Msaada kwa barua pepe"],
    value: "lojipms@gmail.com",
  },
  {
    href: "tel:+255772290005",
    icon: PhoneRoundedIcon,
    label: ["Call now", "Piga sasa"],
    newTab: false,
    title: ["Phone", "Simu"],
    value: "+255 772 290 005",
  },
  {
    href: "https://wa.me/255772290005",
    icon: WhatsAppIcon,
    label: ["Open WhatsApp", "Fungua WhatsApp"],
    newTab: true,
    title: ["WhatsApp", "WhatsApp"],
    value: "+255 772 290 005",
  },
] as const;

export default function ContactPage() {
  const { t } = useLanguage();

  return (
    <MarketingPageShell
      cta={false}
      description={[
        "Whether you need setup guidance, have a product question or need technical support, choose the channel that suits you.",
        "Iwe unahitaji mwongozo wa usanidi, una swali la bidhaa au unahitaji msaada wa kiufundi, chagua njia inayokufaa.",
      ]}
      eyebrow={["CONTACT & SUPPORT", "MAWASILIANO NA MSAADA"]}
      title={[
        "Talk to the Loji Business team.",
        "Wasiliana na timu ya Loji Business.",
      ]}
    >
      <MarketingGrid>
        {channels.map(({ href, icon: Icon, label, newTab, title, value }) => (
          <MarketingCard
            action={{
              external: true,
              href,
              label: t(label[0], label[1]),
              newTab,
            }}
            description={value}
            icon={<Icon />}
            key={href}
            title={t(title[0], title[1])}
          />
        ))}
      </MarketingGrid>
      <MarketingCallout
        description={t(
          "Include your property type, approximate room count and the task you want to improve. For technical issues, add the screen name and exact error message.",
          "Taja aina ya biashara, takriban idadi ya vyumba na kazi unayotaka kuboresha. Kwa tatizo la kiufundi, ongeza jina la ukurasa na ujumbe halisi wa hitilafu.",
        )}
        title={t("Help us understand your request", "Tusaidie kuelewa ombi lako")}
      />
    </MarketingPageShell>
  );
}
