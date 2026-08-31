import type { Metadata } from "next";

import { PasswordRecoveryScreen } from "@/components/auth/password-recovery-screen";

export const metadata: Metadata = {
  title: "Badili nenosiri",
};

export default function ResetPasswordPage() {
  return <PasswordRecoveryScreen />;
}
