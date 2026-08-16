import { FlowPlaceholder } from "@/components/session/flow-placeholder";

export default function PropertyOnboardingPage() {
  return (
    <FlowPlaceholder
      eyebrow="Onboarding · Property"
      title="Create your property"
      description="This route matches the property_basic onboarding step returned by get_app_session."
    />
  );
}
