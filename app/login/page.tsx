import type { Metadata } from "next";

import { LoginScreen } from "@/components/auth/login-screen";

export const metadata: Metadata = {
  title: "Sign in",
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
          ? "We could not finish signing you in. Please try again."
          : null
      }
    />
  );
}
