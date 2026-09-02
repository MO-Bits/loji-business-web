import { Suspense } from "react";

import { BusinessSetupFlow } from "@/components/onboarding/business-setup-flow";
import { FullPageLoader } from "@/components/shared/full-page-loader";

export default function PropertyOnboardingPage() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <BusinessSetupFlow />
    </Suspense>
  );
}
