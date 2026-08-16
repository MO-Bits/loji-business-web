import { FlowPlaceholder } from "@/components/session/flow-placeholder";

export default function ProfileOnboardingPage() {
  return (
    <FlowPlaceholder
      eyebrow="Onboarding · Profile"
      title="Set up your profile"
      description="This route matches the profile onboarding step returned by get_app_session."
    />
  );
}
