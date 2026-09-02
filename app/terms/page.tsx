import { LegalPage, type LegalSectionData } from "@/components/content/info-page";

const sections: LegalSectionData[] = [
  { title: "1. Acceptance of Terms", content: `By creating an account, accepting an invitation, accessing, or using Loji Business, you agree to these Terms of Use.

Loji Business is a property management platform designed to help accommodation businesses manage rooms, bookings, guests, staff, and daily operations.

If you are a property owner or authorized representative creating a workspace, you confirm that you have permission to manage that business account.

If you are a staff member invited to use Loji Business, you agree to use the platform only according to the permissions assigned to you.

If you do not agree with these terms, you should not use Loji Business.` },
  { title: "2. About Loji Business", content: `Loji Business provides digital tools for hotels, lodges, and guesthouses.

Features may include property and room management, booking management, guest records, staff accounts and permissions, availability management, reports, and operational tools.

Loji Business provides software tools only and does not operate, own, or represent your accommodation business.` },
  { title: "3. Accounts, Roles, and Access", content: `Loji Business supports Property Owners, Managers, Receptionists, and other authorized staff members.

Property owners and administrators are responsible for creating and managing the workspace, inviting staff, assigning permissions, reviewing access, and removing access when necessary.

Staff members must use only assigned permissions, protect their account access, enter accurate information, and report unauthorized activity. Each user is responsible for actions performed through their own account.` },
  { title: "4. Property and Business Information", content: `Users may enter property details, rooms, prices, bookings, guest information, and staff information.

Property owners, administrators, and staff are responsible for ensuring information entered while performing their duties is accurate. Loji Business is not responsible for errors caused by incorrect information entered by users.` },
  { title: "5. Ownership of Business Data", content: `Business information stored in a Loji Business workspace belongs to the accommodation business that owns that workspace.

Property owners and authorized administrators control access to business information. Staff members do not obtain ownership rights over business data by using Loji Business.

Loji Business only processes information required to provide, maintain, secure, and improve the service.` },
  { title: "6. Guest Information Responsibilities", content: `Property owners and authorized staff are responsible for collecting and managing guest information.

Users should only access guest information necessary for their assigned responsibilities. The accommodation business is responsible for ensuring guest information is handled according to applicable laws and regulations.` },
  { title: "7. Staff Access and Permissions", content: `Loji Business allows property owners and administrators to control staff access to bookings, rooms, guests, reports, property settings, and other operational features.

Owners and administrators are responsible for assigning suitable access levels. Staff members must not attempt to access information or features outside their assigned permissions.` },
  { title: "8. Acceptable Use", content: `All Loji Business users agree not to:

• Use the platform for illegal activities
• Access another business's information without permission
• Share accounts with unauthorized users
• Attempt to bypass security systems
• Upload malicious content
• Misuse guest or business information

Violation of these rules may result in restricted or terminated access.` },
  { title: "9. Service Availability", content: `We aim to keep Loji Business reliable and available. Temporary interruptions may occur because of maintenance, security updates, technical issues, or third-party service interruptions.

We will make reasonable efforts to restore affected services.` },
  { title: "10. Payments and Subscriptions", content: `Some Loji Business features may require payment or subscriptions. Pricing will be shown before purchase, payments must follow the selected plan, and unpaid accounts may have restricted access.

Subscription plans and pricing may change with reasonable notice.` },
  { title: "11. Third-Party Services", content: `Loji Business may use authentication providers, cloud infrastructure, storage services, maps and location services, payment providers, and notification services.

These services may have their own terms and privacy policies.` },
  { title: "12. Account Suspension and Termination", content: `Property owners may remove staff access from their workspace at any time.

Loji Business may suspend or terminate accounts that violate these terms, create security risks, attempt unauthorized access, abuse the platform, or engage in fraudulent activities.

Removing a staff account does not automatically delete property business records.` },
  { title: "13. Limitation of Liability", content: `Loji Business provides software tools to support accommodation operations. We are not responsible for lost revenue, missed bookings, incorrect information entered by users, business decisions made using the platform, or problems caused by external services.

Businesses remain responsible for their own operations.` },
  { title: "14. Changes to These Terms", content: `We may update these Terms of Use as Loji Business evolves. Important updates may be communicated through the application or official channels.

Continued use of Loji Business means you accept updated terms.` },
  { title: "15. Governing Law", content: `These Terms of Use are governed by the laws of the United Republic of Tanzania.

Disputes should first be resolved through good-faith discussions. If unresolved, disputes may be handled through the appropriate courts of Tanzania.` },
  { title: "16. Contact Us", content: `For questions regarding these Terms of Use, contact Loji Business support.

Email: lojipms@gmail.com
Phone Number: +255772290005` },
];

const swSections: Array<Pick<LegalSectionData, "swTitle" | "swContent">> = [
  { swTitle: "1. Kukubali Masharti", swContent: "Kwa kufungua akaunti, kukubali mwaliko au kutumia Loji Business, unakubali masharti haya. Wamiliki wanathibitisha kuwa wana mamlaka ya kusimamia biashara, na wafanyakazi watatumia mfumo kulingana na ruhusa walizopewa." },
  { swTitle: "2. Kuhusu Loji Business", swContent: "Loji Business hutoa zana za kidijitali kwa hoteli, loji na nyumba za wageni. Mfumo husaidia kusimamia biashara, vyumba, uhifadhi, wageni, wafanyakazi na shughuli; haumiliki wala kuendesha biashara yako." },
  { swTitle: "3. Akaunti, Majukumu na Ufikiaji", swContent: "Mfumo una majukumu ya Mmiliki, Meneja, Mapokezi na wafanyakazi wengine walioidhinishwa. Wasimamizi wanawajibika kutoa na kuondoa ruhusa. Kila mtumiaji anatakiwa kulinda akaunti yake na anawajibika kwa vitendo vinavyofanywa kupitia akaunti hiyo." },
  { swTitle: "4. Taarifa za Biashara", swContent: "Watumiaji wanaweza kuweka taarifa za biashara, vyumba, bei, uhifadhi, wageni na wafanyakazi. Biashara na watumiaji wake wanawajibika kuhakikisha taarifa hizo ni sahihi." },
  { swTitle: "5. Umiliki wa Taarifa za Biashara", swContent: "Taarifa zilizohifadhiwa kwenye eneo la kazi ni mali ya biashara inayomiliki eneo hilo. Wamiliki na wasimamizi walioidhinishwa hudhibiti ufikiaji. Loji Business huchakata taarifa kwa ajili ya kutoa, kulinda na kuboresha huduma." },
  { swTitle: "6. Wajibu Kuhusu Taarifa za Wageni", swContent: "Biashara na wafanyakazi walioidhinishwa wanawajibika kukusanya na kusimamia taarifa za wageni kwa mujibu wa sheria. Mtumiaji anapaswa kuona taarifa zinazohitajika tu kwa kazi yake." },
  { swTitle: "7. Ruhusa za Wafanyakazi", swContent: "Wamiliki na wasimamizi huamua ruhusa za wafanyakazi kwenye uhifadhi, vyumba, wageni, ripoti na mipangilio. Mfanyakazi hatakiwi kujaribu kufikia taarifa au huduma nje ya ruhusa alizopewa." },
  { swTitle: "8. Matumizi Yanayokubalika", swContent: "Hairuhusiwi kutumia mfumo kwa vitendo haramu, kufikia biashara nyingine bila ruhusa, kushirikisha akaunti na mtu asiyeidhinishwa, kukwepa ulinzi, kupakia programu hatarishi au kutumia vibaya taarifa. Ukiukaji unaweza kusababisha ufikiaji kuzuiwa au kusitishwa." },
  { swTitle: "9. Upatikanaji wa Huduma", swContent: "Tunalenga kuweka Loji Business salama na inayopatikana. Huduma inaweza kusimama kwa muda kutokana na matengenezo, masasisho ya usalama, hitilafu za kiufundi au huduma za washirika. Tutafanya juhudi stahiki kuirejesha." },
  { swTitle: "10. Malipo na Usajili", swContent: "Baadhi ya huduma zinaweza kuhitaji malipo au usajili. Bei itaonyeshwa kabla ya ununuzi. Akaunti yenye deni inaweza kuwekewa mipaka, na bei zinaweza kubadilishwa kwa taarifa ya kutosha." },
  { swTitle: "11. Huduma za Watoa Huduma Wengine", swContent: "Loji Business inaweza kutumia watoa huduma za uthibitishaji, wingu, hifadhi, ramani, malipo na arifa. Huduma hizo zinaweza kuwa na masharti na sera zao." },
  { swTitle: "12. Kusimamisha au Kufunga Akaunti", swContent: "Mmiliki anaweza kuondoa ufikiaji wa mfanyakazi wakati wowote. Loji Business inaweza kusimamisha akaunti inayokiuka masharti, kuhatarisha usalama, kufanya udanganyifu au kujaribu ufikiaji usioidhinishwa." },
  { swTitle: "13. Kikomo cha Dhima", swContent: "Loji Business ni zana ya kusaidia shughuli za malazi. Hatuwajibiki kwa mapato yaliyopotea, uhifadhi uliokosekana, taarifa zisizo sahihi zilizoingizwa na watumiaji, maamuzi ya biashara au matatizo ya huduma za nje. Biashara inabaki kuwajibika kwa shughuli zake." },
  { swTitle: "14. Mabadiliko ya Masharti", swContent: "Tunaweza kusasisha masharti haya kadiri huduma inavyokua. Mabadiliko muhimu yanaweza kutangazwa kupitia programu au njia rasmi. Kuendelea kutumia huduma kunamaanisha umekubali masharti yaliyosasishwa." },
  { swTitle: "15. Sheria Inayotumika", swContent: "Masharti haya yanaongozwa na sheria za Jamhuri ya Muungano wa Tanzania. Migogoro itaanza kutatuliwa kwa mazungumzo ya nia njema, na ikishindikana inaweza kupelekwa katika mahakama husika za Tanzania." },
  { swTitle: "16. Wasiliana Nasi", swContent: "Kwa maswali kuhusu masharti haya, wasiliana na msaada wa Loji Business.\n\nBarua pepe: lojipms@gmail.com\nSimu: +255772290005" },
];

const localizedSections = sections.map((section, index) => ({ ...section, ...swSections[index] }));

export default function TermsPage() { return <LegalPage kind="terms" title="Terms of Use" introTitle="Loji Business Agreement" intro="Please read these terms carefully before creating an account, accepting an invitation, or using Loji Business." sections={localizedSections} swTitle="Masharti ya Matumizi" swIntroTitle="Makubaliano ya Loji Business" swIntro="Soma masharti haya kwa makini kabla ya kufungua akaunti, kukubali mwaliko au kutumia Loji Business." />; }
