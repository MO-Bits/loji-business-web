import { PropertyAddressMap } from "@/components/property/property-address-map";

export default async function PropertyAddressMapPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string | string[] }>;
}) {
  const params = await searchParams;
  const stage = Array.isArray(params.stage) ? params.stage[0] : params.stage;
  return <PropertyAddressMap initialStage={stage} />;
}
