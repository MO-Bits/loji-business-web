"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";

import { useLanguage } from "@/components/providers/language-provider";

const faqs = [
  {
    question: "What is Loji Business?",
    swQuestion: "Loji Business ni nini?",
    answer:
      "Loji Business is a cloud-based workspace for hotels, lodges and guesthouses. It helps your team manage rooms, bookings, guests, staff access and daily property operations from one place.",
    swAnswer:
      "Loji Business ni mfumo wa mtandaoni kwa hoteli, lodge na nyumba za wageni. Husaidia timu yako kusimamia vyumba, uhifadhi, wageni, ruhusa za wafanyakazi na shughuli za kila siku katika sehemu moja.",
  },
  {
    question: "Who is Loji Business designed for?",
    swQuestion: "Loji Business imeundwa kwa ajili ya nani?",
    answer:
      "It is designed for independent hotels, lodges, guesthouses and other accommodation businesses that want a simpler and more organised way to run day-to-day operations.",
    swAnswer:
      "Imeundwa kwa hoteli, lodge, nyumba za wageni na biashara nyingine za malazi zinazotaka njia rahisi na yenye mpangilio zaidi ya kuendesha shughuli za kila siku.",
  },
  {
    question: "Can several staff members use the same property?",
    swQuestion: "Je, wafanyakazi wengi wanaweza kutumia jengo moja?",
    answer:
      "Yes. Owners and managers can invite staff and assign roles so each person sees only the tools and information appropriate to their responsibilities.",
    swAnswer:
      "Ndiyo. Wamiliki na mameneja wanaweza kuwaalika wafanyakazi na kuwapa majukumu ili kila mtu aone zana na taarifa zinazolingana na kazi zake.",
  },
  {
    question: "Can I manage more than one property?",
    swQuestion: "Je, ninaweza kusimamia majengo zaidi ya moja?",
    answer:
      "Yes. If your account has access to multiple properties, you can switch between them while keeping each property's bookings, rooms, staff and operational information separate.",
    swAnswer:
      "Ndiyo. Ikiwa akaunti yako ina ruhusa kwenye majengo mengi, unaweza kubadilisha kati yake huku uhifadhi, vyumba, wafanyakazi na taarifa za kila jengo zikiwa zimetenganishwa.",
  },
  {
    question: "Do I need to install software on a computer?",
    swQuestion: "Je, nahitaji kusakinisha programu kwenye kompyuta?",
    answer:
      "No. Loji Business works through the web, so your authorised team can access it from supported phones, tablets and computers with an internet connection.",
    swAnswer:
      "Hapana. Loji Business hutumika kupitia wavuti, hivyo timu iliyoidhinishwa inaweza kuitumia kwenye simu, tablet na kompyuta zinazotumika zikiwa na intaneti.",
  },
  {
    question: "Can Loji Business help prevent booking conflicts?",
    swQuestion: "Je, Loji Business inaweza kusaidia kuzuia migongano ya uhifadhi?",
    answer:
      "Yes. Availability is checked against existing stays so your team can see which rooms are available for the selected dates before creating a booking.",
    swAnswer:
      "Ndiyo. Upatikanaji wa vyumba hukaguliwa dhidi ya makazi yaliyopo ili timu yako ione vyumba vinavyopatikana kwa tarehe zilizochaguliwa kabla ya kutengeneza uhifadhi.",
  },
  {
    question: "Is my property information protected?",
    swQuestion: "Je, taarifa za jengo langu zinalindwa?",
    answer:
      "Loji Business uses authenticated accounts, property-based access and role permissions to help keep operational information available only to authorised users.",
    swAnswer:
      "Loji Business hutumia akaunti zilizothibitishwa, ufikiaji unaotegemea jengo na ruhusa za majukumu ili kusaidia taarifa za uendeshaji kupatikana kwa watumiaji walioidhinishwa pekee.",
  },
  {
    question: "How do I get started?",
    swQuestion: "Ninaanzaje kutumia Loji Business?",
    answer:
      "Sign in, complete your property setup, add your rooms and invite the staff who need access. After that, your team can start managing daily bookings and operations from the workspace.",
    swAnswer:
      "Ingia, kamilisha taarifa za jengo lako, ongeza vyumba na waalike wafanyakazi wanaohitaji ufikiaji. Baada ya hapo, timu yako inaweza kuanza kusimamia uhifadhi na shughuli za kila siku.",
  },
];

type FaqSectionProps = {
  variant?: "feature" | "plain";
};

function Questions() {
  const { language } = useLanguage();

  return (
    <Stack spacing={1.25}>
      {faqs.map((faq, index) => {
        const question = language === "sw" ? faq.swQuestion : faq.question;
        const answer = language === "sw" ? faq.swAnswer : faq.answer;

        return (
          <Accordion
            key={faq.question}
            disableGutters
            elevation={0}
            defaultExpanded={index === 0}
            sx={{
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: "10px !important",
              overflow: "hidden",
              transition: "border-color 180ms ease, box-shadow 180ms ease",
              "&::before": { display: "none" },
              "&.Mui-expanded": {
                borderColor: "primary.main",
                boxShadow: "0 10px 28px rgba(15, 23, 42, .06)",
              },
            }}
          >
            <AccordionSummary
              expandIcon={<AddRoundedIcon />}
              sx={{
                minHeight: 64,
                px: { xs: 2, sm: 2.75 },
                "& .MuiAccordionSummary-content": { my: 1.65 },
                "& .MuiAccordionSummary-expandIconWrapper": {
                  color: "primary.main",
                  transition: "transform 180ms ease",
                },
                "& .MuiAccordionSummary-expandIconWrapper.Mui-expanded": {
                  transform: "rotate(45deg)",
                },
              }}
            >
              <Typography sx={{ fontSize: { xs: ".98rem", sm: "1.04rem" }, fontWeight: 700, pr: 1 }}>
                {question}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: { xs: 2, sm: 2.75 }, pb: 2.75, pt: 0 }}>
              <Typography color="text.secondary" sx={{ lineHeight: 1.78 }}>
                {answer}
              </Typography>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Stack>
  );
}

export function FaqSection({ variant = "feature" }: FaqSectionProps) {
  const { t } = useLanguage();

  if (variant === "plain") {
    return <Questions />;
  }

  return (
    <Box component="section" aria-labelledby="faq-heading">
      <Paper
        variant="outlined"
        sx={{
          bgcolor: "background.paper",
          borderColor: "primary.main",
          borderRadius: 2,
          overflow: "hidden",
          position: "relative",
          "&::before": {
            bgcolor: "primary.main",
            borderRadius: "50%",
            content: '\"\"',
            height: 240,
            opacity: 0.055,
            position: "absolute",
            right: -80,
            top: -120,
            width: 240,
          },
        }}
      >
        <Box
          sx={{
            display: "grid",
            gap: { xs: 4, md: 7 },
            gridTemplateColumns: { xs: "1fr", md: ".72fr 1.28fr" },
            p: { xs: 3, sm: 4.5, md: 6 },
            position: "relative",
          }}
        >
          <Stack spacing={2.25} sx={{ alignSelf: "start", maxWidth: 430 }}>
            <Chip
              icon={<HelpOutlineRoundedIcon />}
              label={t("FREQUENTLY ASKED QUESTIONS", "MASWALI YANAYOULIZWA MARA KWA MARA")}
              color="primary"
              variant="outlined"
              sx={{ alignSelf: "flex-start", fontWeight: 800, letterSpacing: ".04em" }}
            />
            <Typography
              component="h2"
              id="faq-heading"
              sx={{
                fontSize: { xs: "2rem", sm: "2.7rem", md: "3.15rem" },
                fontWeight: 750,
                letterSpacing: "-.045em",
                lineHeight: 1.04,
              }}
            >
              {t("Questions before you get started?", "Una maswali kabla ya kuanza?")}
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: "1.02rem", lineHeight: 1.75 }}>
              {t(
                "Here are clear answers to the things property owners and teams usually want to know first.",
                "Haya ni majibu ya moja kwa moja kwa mambo ambayo wamiliki na timu zao hutaka kujua kabla ya kuanza.",
              )}
            </Typography>
            <Button
              component={Link}
              href="/faq"
              endIcon={<ArrowForwardRoundedIcon />}
              variant="outlined"
              sx={{ alignSelf: "flex-start", mt: 1 }}
            >
              {t("View all FAQs", "Angalia maswali yote")}
            </Button>
          </Stack>

          <Questions />
        </Box>
      </Paper>
    </Box>
  );
}
