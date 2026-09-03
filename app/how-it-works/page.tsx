"use client";

import { Stack } from "@mui/material";

import { MarketingPageShell } from "@/components/content/marketing-page-shell";
import {
  MarketingCallout,
  MarketingStep,
} from "@/components/content/marketing-ui";
import { useLanguage } from "@/components/providers/language-provider";

const steps = [
  {
    description: [
      "Add the identity, contact details, services, accepted payments, operating times and local address for your lodge, hotel or guesthouse.",
      "Ongeza utambulisho, mawasiliano, huduma, njia za malipo, muda wa uendeshaji na anwani ya loji, hoteli au nyumba yako ya wageni.",
    ],
    number: "01",
    title: ["Create the property", "Tengeneza biashara"],
  },
  {
    description: [
      "Set up room names, types, capacity, prices and amenities so availability is useful from day one.",
      "Weka majina ya vyumba, aina, uwezo, bei na huduma ili upatikanaji uwe na maana tangu siku ya kwanza.",
    ],
    number: "02",
    title: ["Add rooms", "Ongeza vyumba"],
  },
  {
    description: [
      "Add manager or receptionist email access, then give each role only what their work requires.",
      "Ongeza ruhusa kwa barua pepe ya meneja au mapokezi, kisha mpe kila jukumu kinachohitajika kwa kazi yake.",
    ],
    number: "03",
    title: ["Bring in the team", "Ongeza timu"],
  },
  {
    description: [
      "Create bookings, manage arrivals and departures, update rooms and keep guest information together.",
      "Tengeneza uhifadhi, simamia wanaowasili na kuondoka, sasisha vyumba na weka taarifa za wageni pamoja.",
    ],
    number: "04",
    title: ["Run daily operations", "Endesha shughuli za kila siku"],
  },
] as const;

export default function HowItWorksPage() {
  const { t } = useLanguage();

  return (
    <MarketingPageShell
      description={[
        "Loji Business gets a property organised through a guided setup, then keeps the everyday workflow focused.",
        "Loji Business inapanga biashara kupitia usanidi unaoongozwa, kisha kuweka shughuli za kila siku wazi.",
      ]}
      eyebrow={["HOW IT WORKS", "JINSI INAVYOFANYA KAZI"]}
      title={[
        "From first setup to daily operations in four steps.",
        "Kutoka usanidi wa kwanza hadi shughuli za kila siku kwa hatua nne.",
      ]}
    >
      <Stack spacing={2}>
        {steps.map(({ description, number, title }) => (
          <MarketingStep
            description={t(description[0], description[1])}
            key={number}
            number={number}
            title={t(title[0], title[1])}
          />
        ))}
      </Stack>
      <MarketingCallout
        action={{ href: "/login", label: t("Start setup", "Anza usanidi") }}
        description={t(
          "Your progress is guided, and property details remain editable from Settings after setup.",
          "Maendeleo yako yanaongozwa, na taarifa za biashara zinaweza kubadilishwa kwenye Mipangilio baada ya usanidi.",
        )}
        title={t("Ready to organise your property?", "Uko tayari kupanga biashara yako?")}
      />
    </MarketingPageShell>
  );
}
