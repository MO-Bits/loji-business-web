import type { Metadata } from "next";

import {
  LegalPage,
  type LegalSectionData,
} from "@/components/content/info-page";

export const metadata: Metadata = {
  title: "Data Deletion Instructions",
  description:
    "Instructions for requesting deletion of your Loji Business account and personal data.",
  alternates: {
    canonical: "/data-deletion",
  },
};

const sections: LegalSectionData[] = [
  {
    title: "1. Request deletion by email",
    content: `Send an email to lojipms@gmail.com using the subject “Loji Business Data Deletion Request”.

Please include:
• The name on your Loji Business account.
• The email address connected to your Facebook or Loji Business account.
• Your property name, if applicable.
• A clear statement that you want your account and associated personal data deleted.

Never send your Facebook password, Loji Business password, access token, payment information, or identity document by email.`,
    swTitle: "1. Omba kufutiwa taarifa kwa barua pepe",
    swContent: `Tuma barua pepe kwenda lojipms@gmail.com yenye kichwa “Ombi la Kufuta Taarifa za Loji Business”.

Tafadhali jumuisha:
• Jina lililotumika kwenye akaunti yako ya Loji Business.
• Barua pepe iliyounganishwa na akaunti yako ya Facebook au Loji Business.
• Jina la Lodge, Hotel au Guesthouse yako, ikiwa linahusika.
• Maelezo ya wazi kwamba unataka akaunti yako na taarifa binafsi zinazohusiana nayo zifutwe.

Usitume nenosiri lako la Facebook au Loji Business, access token, taarifa za malipo au kitambulisho kwa barua pepe.`,
  },
  {
    title: "2. Identity verification",
    content:
      "To protect your account, we may send a verification message to the email address registered on your account. We will only process the request after reasonably confirming that it was submitted by the account owner.",
    swTitle: "2. Uthibitishaji wa umiliki wa akaunti",
    swContent:
      "Ili kulinda akaunti yako, tunaweza kutuma ujumbe wa uthibitisho kwenye barua pepe iliyosajiliwa. Tutashughulikia ombi baada ya kuthibitisha kwa kiwango kinachofaa kuwa limetumwa na mmiliki wa akaunti.",
  },
  {
    title: "3. What will be deleted",
    content: `After verification, we will delete or anonymize personal information associated with your account, including:
• Your Loji Business user profile.
• The Facebook authentication connection associated with your account.
• Personal account preferences and identifiers that are no longer required.
• Other personal information that Loji Business is not legally or operationally required to retain.

If you manage a property workspace, we may contact you before deletion to protect bookings, guest records, financial records and other business information belonging to that property.`,
    swTitle: "3. Taarifa zitakazofutwa",
    swContent: `Baada ya uthibitishaji, tutafuta au kuondoa utambulisho kwenye taarifa binafsi zinazohusiana na akaunti yako, ikiwemo:
• Wasifu wako wa Loji Business.
• Muunganisho wa kuingia kwa Facebook unaohusiana na akaunti yako.
• Mapendeleo na vitambulisho vya akaunti ambavyo havihitajiki tena.
• Taarifa nyingine binafsi ambazo hatulazimiki kuzihifadhi kisheria au kiutendaji.

Ikiwa unasimamia Lodge, Hotel au Guesthouse, tunaweza kuwasiliana nawe kabla ya kufuta ili kulinda booking, kumbukumbu za wageni, taarifa za fedha na taarifa nyingine za biashara zinazomilikiwa na eneo hilo.`,
  },
  {
    title: "4. Processing period",
    content:
      "We aim to acknowledge your request within 7 days and complete verified deletion requests within 30 days. We will notify you when deletion is complete or explain if additional time or information is required.",
    swTitle: "4. Muda wa kushughulikia ombi",
    swContent:
      "Tunalenga kuthibitisha kupokea ombi lako ndani ya siku 7 na kukamilisha ombi lililothibitishwa ndani ya siku 30. Tutakujulisha baada ya kufuta au kueleza ikiwa muda au taarifa zaidi zinahitajika.",
  },
  {
    title: "5. Information we may retain",
    content:
      "We may retain limited records where required to comply with Tanzanian law, prevent fraud, resolve disputes, maintain security, enforce agreements or preserve legitimate business records. Any retained information will remain protected and will not be used for unrelated purposes.",
    swTitle: "5. Taarifa tunazoweza kuendelea kuhifadhi",
    swContent:
      "Tunaweza kuhifadhi kumbukumbu chache pale inapohitajika kutimiza sheria za Tanzania, kuzuia udanganyifu, kutatua migogoro, kudumisha usalama, kutekeleza makubaliano au kuhifadhi kumbukumbu halali za biashara. Taarifa hizo zitaendelea kulindwa na hazitatumika kwa madhumuni yasiyohusiana.",
  },
  {
    title: "6. Removing Loji Business from Facebook",
    content:
      "You may also remove Loji Business from Facebook under Facebook Settings → Apps and Websites. Removing the connection stops future Facebook access, but it may not automatically delete information already stored by Loji Business. Use the email process above to request complete account and data deletion.",
    swTitle: "6. Kuondoa Loji Business kwenye Facebook",
    swContent:
      "Unaweza pia kuondoa Loji Business kupitia Facebook Settings → Apps and Websites. Kuondoa muunganisho huzuia ufikiaji wa baadaye kupitia Facebook, lakini huenda kusifute taarifa ambazo tayari zimehifadhiwa na Loji Business. Tumia utaratibu wa barua pepe hapo juu kuomba kufutwa kabisa kwa akaunti na taarifa.",
  },
  {
    title: "7. Contact",
    content:
      "For questions about account or data deletion, contact lojipms@gmail.com or call +255 772 290 005.",
    swTitle: "7. Mawasiliano",
    swContent:
      "Kwa maswali kuhusu kufuta akaunti au taarifa, wasiliana kupitia lojipms@gmail.com au piga simu +255 772 290 005.",
  },
];

export default function DataDeletionPage() {
  return (
    <LegalPage
      kind="privacy"
      title="Data Deletion Instructions"
      introTitle="Delete your Loji Business account and personal data"
      intro="This page explains how Facebook users and other Loji Business users can request deletion of their account and associated personal information."
      sections={sections}
      swTitle="Maelekezo ya Kufuta Taarifa"
      swIntroTitle="Futa akaunti na taarifa zako binafsi za Loji Business"
      swIntro="Ukurasa huu unaeleza jinsi watumiaji wa Facebook na watumiaji wengine wa Loji Business wanavyoweza kuomba kufutwa kwa akaunti na taarifa zao binafsi."
    />
  );
}
