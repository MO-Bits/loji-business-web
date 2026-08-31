import { PropertyBasicForm } from "@/components/property/property-basic-form";

export default async function PropertyBasicPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string | string[] }>;
}) {
  const params = await searchParams;
  const step = Array.isArray(params.step) ? params.step[0] : params.step;
  return <PropertyBasicForm initialStep={step} />;
}
