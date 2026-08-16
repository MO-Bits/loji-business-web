import { FlowPlaceholder } from "@/components/session/flow-placeholder";

export default function InactivePage() {
  return (
    <FlowPlaceholder
      eyebrow="Account inactive"
      title="Your access is currently inactive"
      description="This route matches the inactive status returned by get_app_session."
    />
  );
}
