import type { Metadata } from "next";

import { LoginScreen } from "@/components/auth/login-screen";

export const metadata: Metadata = {
  title: "Ingia",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const params = await searchParams;
  const hasCallbackError = Boolean(
    Array.isArray(params.error) ? params.error[0] : params.error,
  );

  return (
    <LoginScreen
      initialError={
        hasCallbackError
          ? "Hatukuweza kukamilisha kukuingiza. Tafadhali jaribu tena."
          : null
      }
    />
  );
}
