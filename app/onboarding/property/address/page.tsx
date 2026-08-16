import { FlowPlaceholder } from "@/components/session/flow-placeholder";

export default function PropertyAddressOnboardingPage() {
  return (
    <FlowPlaceholder
      eyebrow="Onboarding · Address"
      title="Add the property location"
      description="This route matches the property_address onboarding step returned by get_app_session."
    />
  );
}
