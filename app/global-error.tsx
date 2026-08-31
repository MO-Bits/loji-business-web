"use client";

import { useEffect } from "react";
import Link from "next/link";
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
    <html lang="sw">
      <head>
        <title>Loji Business haipatikani kwa muda</title>
        <style>{`
          :root { color-scheme: light dark; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #f5f5f7;
            color: #1d1d1f;
            font-family: Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            font-weight: 400;
          }
          .global-error-shell {
            display: grid;
            min-height: 100vh;
            min-height: 100dvh;
            padding: 24px;
            place-items: center;
          }
          .global-error-card {
            width: 100%;
            max-width: 560px;
            overflow: hidden;
            padding: 40px;
            border: 1px solid #d8d8dc;
            border-radius: 24px;
            background: #ffffff;
            box-shadow: 0 20px 60px rgba(0, 0, 0, .08);
            text-align: center;
          }
          .global-error-brand {
            display: inline-flex;
            align-items: center;
            gap: 9px;
            font-size: 15px;
            font-weight: 700;
            letter-spacing: -.02em;
          }
          .global-error-mark {
            display: grid;
            width: 30px;
            height: 30px;
            border-radius: 9px;
            background: #007aff;
            color: #ffffff;
            font-size: 16px;
            place-items: center;
          }
          .global-error-icon {
            display: grid;
            width: 52px;
            height: 52px;
            margin: 28px auto 20px;
            border-radius: 14px;
            background: #fff1f0;
            color: #d70015;
            font-size: 25px;
            font-weight: 700;
            place-items: center;
          }
          .global-error-card h1 {
            margin: 0;
            font-size: clamp(24px, 5vw, 30px);
            font-weight: 700;
            letter-spacing: -.035em;
            line-height: 1.2;
          }
          .global-error-card p {
            max-width: 440px;
            margin: 12px auto 0;
            color: #6e6e73;
            font-size: 15px;
            line-height: 1.65;
          }
          .global-error-actions {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 28px;
          }
          .global-error-actions button,
          .global-error-actions a {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 144px;
            min-height: 44px;
            padding: 10px 18px;
            border: 1px solid #007aff;
            border-radius: 12px;
            cursor: pointer;
            font: inherit;
            font-size: 14px;
            font-weight: 500;
            text-decoration: none;
          }
          .global-error-actions button { background: #007aff; color: #ffffff; }
          .global-error-actions a { background: transparent; color: #007aff; }
          .global-error-actions button:focus-visible,
          .global-error-actions a:focus-visible { outline: 3px solid rgba(0, 122, 255, .28); outline-offset: 2px; }
          .global-error-reference { margin-top: 20px !important; color: #86868b !important; font-size: 12px !important; overflow-wrap: anywhere; }
          @media (max-width: 520px) {
            .global-error-shell { padding: 16px; }
            .global-error-card { padding: 28px 20px; border-radius: 20px; }
            .global-error-actions { flex-direction: column; }
            .global-error-actions button, .global-error-actions a { width: 100%; }
          }
          @media (prefers-color-scheme: dark) {
            body { background: #0b0d10; color: #f5f5f7; }
            .global-error-card { border-color: #303238; background: #16181c; box-shadow: none; }
            .global-error-card p { color: #a1a1a6; }
            .global-error-icon { background: #33191d; color: #ff6961; }
            .global-error-actions a { background: #16181c; color: #409cff; }
            .global-error-reference { color: #86868b !important; }
          }
        `}</style>
      </head>
      <body>
        <main className="global-error-shell">
          <section
            aria-labelledby="global-error-title"
            className="global-error-card"
            role="alert"
          >
            <div aria-label="Loji Business" className="global-error-brand">
              <span aria-hidden="true" className="global-error-mark">L</span>
              <span>Loji Business</span>
            </div>
            <div aria-hidden="true" className="global-error-icon">!</div>
            <h1 id="global-error-title">Loji Business haipatikani kwa muda</h1>
            <p>
              Tumerekodi tatizo hili. Taarifa zako zilizohifadhiwa ziko salama; tafadhali jaribu tena.
            </p>
            <div className="global-error-actions">
              <button onClick={reset} type="button">Jaribu tena</button>
              <Link href="/">Rudi nyumbani</Link>
            </div>
            {error.digest ? (
              <p className="global-error-reference">Kumbukumbu: {error.digest}</p>
            ) : null}
          </section>
        </main>
      </body>
    </html>
  );
}
