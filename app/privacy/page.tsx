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
  { title: "7. Third-Party Services", content: `Loji Business may use authentication providers, cloud hosting services, database and storage providers, maps and location services, payment providers, and notification services.

These services may process information only as required to provide their functionality.` },
  { title: "8. Location Information", content: `Some features may request location access for property location setup, maps, and nearby search functionality.

Location permission is optional and can be controlled through your device settings.` },
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

export default function PrivacyPage() { return <LegalPage kind="privacy" title="Privacy Policy" introTitle="Loji Business Privacy Commitment" intro="This Privacy Policy explains how Loji Business collects, uses, stores, and protects information when owners and staff use our property management platform." sections={sections} />; }
