"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "Roboto, Arial, sans-serif", margin: 0 }}>
        <main style={{ display: "grid", minHeight: "100vh", padding: 24, placeItems: "center" }}>
          <div style={{ maxWidth: 480, textAlign: "center" }}>
            <h1>Loji Business is temporarily unavailable</h1>
            <p>We have recorded the problem. Please try again.</p>
            <button onClick={reset} style={{ cursor: "pointer", minHeight: 44, padding: "10px 18px" }}>Try again</button>
          </div>
        </main>
      </body>
    </html>
  );
}
