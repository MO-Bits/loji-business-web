"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";

import { theme } from "@/theme";
import { FeedbackProvider } from "@/components/providers/feedback-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeProvider theme={theme} defaultMode="system">
        <CssBaseline />
        <FeedbackProvider>{children}</FeedbackProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
