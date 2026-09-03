import { LegalPage, type LegalSectionData } from "@/components/content/info-page";

const sections: LegalSectionData[] = [
  { title: "1. Information We Collect", content: `Loji Business collects information necessary to provide property management services. This may include:

• Account information such as name, email address, profile information, and authentication details.
• Property information such as business name, address, rooms, pricing, availability, and settings.
• Booking information including reservations, check-in/check-out details, and operational records.
• Guest information entered by authorized property users.
• Staff information created by owners or administrators.
• Technical information such as device information, application logs, and service usage data.

The information collected depends on the features you use and the permissions assigned to your account.` },
  { title: "2. User Roles and Information Access", content: `Loji Business supports Property Owners, Managers, Receptionists, and other authorized staff members.

Property owners and administrators control who can access their workspace. Staff members can only access information and features allowed by their assigned permissions. Users should only access information required for their responsibilities.` },
  { title: "3. How We Use Your Information", content: `We use collected information to provide Loji Business features, manage properties, rooms, bookings and guest records, authenticate users, maintain security, support role-based access, improve reliability, provide support, send service notifications, and detect misuse.` },
  { title: "4. Business Data Ownership", content: `Business information stored in Loji Business belongs to the accommodation business that owns the workspace.

Property owners and authorized administrators control business data access. Staff members access business information only as part of their assigned work responsibilities.

Loji Business does not claim ownership of your property records, guest information, or operational data.` },
  { title: "5. Guest Information and Privacy Responsibility", content: `Accommodation businesses using Loji Business are responsible for guest information they collect and manage.

Property owners and administrators must ensure guest information is collected lawfully, staff access is properly managed, and guest information is used only for legitimate business purposes.

Loji Business provides tools to manage records but does not control how each accommodation business collects information from guests.` },
  { title: "6. Data Security", content: `We apply reasonable technical and organizational measures designed to protect information, including secure authentication, encrypted communication, access permissions, secure cloud infrastructure, and security monitoring.

No online service can guarantee complete security, but we continuously work to improve protection of user information.` },
  { title: "7. Third-Party Services", content: `Loji Business may use authentication providers, cloud hosting services, database and storage providers, payment providers, and notification services.

These services may process information only as required to provide their functionality.` },
  { title: "8. Business Location Information", content: `Authorized users may enter a region, district, ward, street, or nearby landmark to identify the accommodation business.

Loji Business does not require precise device location for business setup.` },
  { title: "9. Your Privacy Rights", content: `Depending on applicable laws, you may have rights to access your personal information, request correction of inaccurate information, request deletion of your account, and ask how your information is processed.

Property owners may also manage staff access and remove users from their workspace.` },
  { title: "10. Data Retention", content: `We keep information only for as long as necessary to provide services, maintain business records, improve security, meet legal requirements, and resolve disputes.

Some information may remain stored where required for legal or operational reasons.` },
  { title: "11. Account Deletion", content: `Users may request deletion of their account. Property owners should ensure important business records are saved before deleting a workspace.

Some information may need to be retained for legal, security, or compliance purposes.` },
  { title: "12. Children Privacy", content: `Loji Business is intended for business users.

We do not knowingly provide accounts to children or intentionally collect children's personal information.` },
  { title: "13. Changes to This Privacy Policy", content: `We may update this Privacy Policy when our services, technology, or legal requirements change. Important updates may be communicated through the application or official channels.

Continued use of Loji Business means you accept the updated Privacy Policy.` },
  { title: "14. Governing Law", content: `This Privacy Policy is governed by applicable laws of the United Republic of Tanzania.

We aim to handle personal information responsibly, transparently, and securely.` },
  { title: "15. Contact Us", content: `For privacy questions, data requests, or security concerns, contact Loji Business support.

Email: lojipms@gmail.com
Phone Number: +255772290005` },
];

const swSections: Array<Pick<LegalSectionData, "swTitle" | "swContent">> = [
  { swTitle: "1. Taarifa Tunazokusanya", swContent: "Tunakusanya taarifa zinazohitajika kutoa huduma, ikiwemo taarifa za akaunti, biashara, vyumba, bei, uhifadhi, wageni, wafanyakazi, kifaa, kumbukumbu za mfumo na matumizi. Taarifa halisi hutegemea huduma na ruhusa unazotumia." },
  { swTitle: "2. Majukumu na Ufikiaji wa Taarifa", swContent: "Loji Business ina Wamiliki, Mameneja, Mapokezi na wafanyakazi wengine walioidhinishwa. Wamiliki na wasimamizi hudhibiti ufikiaji; mfanyakazi huona taarifa na huduma zinazoruhusiwa kwa jukumu lake." },
  { swTitle: "3. Jinsi Tunavyotumia Taarifa", swContent: "Tunatumia taarifa kutoa huduma za biashara, vyumba, uhifadhi na wageni; kuthibitisha watumiaji; kulinda mfumo; kutekeleza ruhusa; kuboresha uaminifu; kutoa msaada na arifa; na kugundua matumizi mabaya." },
  { swTitle: "4. Umiliki wa Taarifa za Biashara", swContent: "Taarifa za biashara ni mali ya biashara inayomiliki eneo la kazi. Wamiliki na wasimamizi walioidhinishwa hudhibiti ufikiaji. Loji Business haidai umiliki wa taarifa za biashara, wageni au shughuli zako." },
  { swTitle: "5. Taarifa za Wageni na Wajibu wa Faragha", swContent: "Biashara ndiyo inayowajibika kukusanya taarifa za wageni kisheria, kusimamia ruhusa za wafanyakazi na kutumia taarifa kwa madhumuni halali. Loji Business hutoa zana za usimamizi lakini haiamui namna biashara inavyokusanya taarifa." },
  { swTitle: "6. Usalama wa Taarifa", swContent: "Tunatumia hatua stahiki kama uthibitishaji salama, mawasiliano yaliyosimbwa, ruhusa, miundombinu salama ya wingu na ufuatiliaji. Hakuna huduma ya mtandaoni inayoweza kuahidi usalama kamili, hivyo tunaendelea kuboresha ulinzi." },
  { swTitle: "7. Huduma za Watoa Huduma Wengine", swContent: "Tunaweza kutumia huduma za uthibitishaji, hosting, hifadhidata, hifadhi, malipo na arifa. Watoa huduma hao huchakata taarifa kwa kiwango kinachohitajika kutoa huduma zao." },
  { swTitle: "8. Taarifa za Eneo la Biashara", swContent: "Watumiaji walioidhinishwa wanaweza kuweka mkoa, wilaya, kata, mtaa au alama ya karibu ili kutambulisha biashara ya malazi. Loji Business haihitaji eneo sahihi la kifaa wakati wa kusanidi biashara." },
  { swTitle: "9. Haki Zako za Faragha", swContent: "Kwa mujibu wa sheria, unaweza kuomba kuona taarifa zako, kusahihisha taarifa zisizo sahihi, kufuta akaunti na kupata maelezo ya uchakataji. Wamiliki wanaweza pia kusimamia au kuondoa ufikiaji wa wafanyakazi." },
  { swTitle: "10. Muda wa Kuhifadhi Taarifa", swContent: "Tunahifadhi taarifa kwa muda unaohitajika kutoa huduma, kutunza kumbukumbu za biashara, kulinda mfumo, kutimiza sheria na kutatua migogoro. Baadhi ya taarifa zinaweza kubaki kwa sababu za kisheria au kiutendaji." },
  { swTitle: "11. Kufuta Akaunti", swContent: "Mtumiaji anaweza kuomba akaunti ifutwe. Mmiliki anapaswa kuhifadhi kumbukumbu muhimu kabla ya kufuta eneo la kazi. Baadhi ya taarifa zinaweza kuhifadhiwa kwa mahitaji ya sheria, usalama au uzingatiaji." },
  { swTitle: "12. Faragha ya Watoto", swContent: "Loji Business imekusudiwa kwa watumiaji wa biashara. Hatutoi akaunti kwa watoto kwa kujua wala kukusanya kwa makusudi taarifa zao binafsi." },
  { swTitle: "13. Mabadiliko ya Sera Hii", swContent: "Tunaweza kusasisha sera hii huduma, teknolojia au sheria zinapobadilika. Mabadiliko muhimu yanaweza kutangazwa kupitia programu au njia rasmi. Kuendelea kutumia huduma kunamaanisha umekubali sera iliyosasishwa." },
  { swTitle: "14. Sheria Inayotumika", swContent: "Sera hii inaongozwa na sheria zinazotumika za Jamhuri ya Muungano wa Tanzania. Tunalenga kushughulikia taarifa binafsi kwa uwajibikaji, uwazi na usalama." },
  { swTitle: "15. Wasiliana Nasi", swContent: "Kwa maswali ya faragha, maombi ya taarifa au masuala ya usalama, wasiliana na msaada wa Loji Business.\n\nBarua pepe: lojipms@gmail.com\nSimu: +255772290005" },
];

const localizedSections = sections.map((section, index) => ({ ...section, ...swSections[index] }));

export default function PrivacyPage() { return <LegalPage kind="privacy" title="Privacy Policy" introTitle="Loji Business Privacy Commitment" intro="This Privacy Policy explains how Loji Business collects, uses, stores, and protects information when owners and staff use our property management platform." sections={localizedSections} swTitle="Sera ya Faragha" swIntroTitle="Ahadi ya Faragha ya Loji Business" swIntro="Sera hii inaeleza jinsi Loji Business inavyokusanya, kutumia, kuhifadhi na kulinda taarifa wakati wamiliki na wafanyakazi wanatumia mfumo." />; }
