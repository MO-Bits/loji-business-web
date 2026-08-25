"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";

import { theme } from "@/theme";
import { FeedbackProvider } from "@/components/providers/feedback-provider";
import { LanguageProvider } from "@/components/providers/language-provider";
import { PwaRegister } from "@/components/providers/pwa-register";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeProvider
        theme={theme}
        defaultMode="system"
        modeStorageKey="loji-theme-mode"
        disableTransitionOnChange
      >
        <CssBaseline />
        <PwaRegister />
        <LanguageProvider>
          <FeedbackProvider>{children}</FeedbackProvider>
        </LanguageProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
