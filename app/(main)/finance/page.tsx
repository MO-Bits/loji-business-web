import { FinanceScreen } from "@/components/finance/finance-screen";

type FinanceSection = "today" | "outstanding" | "payments" | "cashier";

const financeSections: readonly FinanceSection[] = ["today", "outstanding", "payments", "cashier"];

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section } = await searchParams;
  const initialSection: FinanceSection = section && financeSections.includes(section as FinanceSection)
    ? section as FinanceSection
    : "today";
  return <FinanceScreen initialSection={initialSection} />;
}
