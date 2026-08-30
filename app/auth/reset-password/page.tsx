import type { Metadata } from "next";

import { PasswordRecoveryScreen } from "@/components/auth/password-recovery-screen";

export const metadata: Metadata = {
  title: "Reset password",
};

export default function ResetPasswordPage() {
  return <PasswordRecoveryScreen />;
}
