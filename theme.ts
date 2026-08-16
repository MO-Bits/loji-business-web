"use client";

import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  cssVariables: true,
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: "#1769D2",
          light: "#4D94E8",
          dark: "#0D4FA8",
        },
        secondary: { main: "#6C5CE7" },
        background: {
          default: "#F6F8FB",
          paper: "#FFFFFF",
        },
        text: {
          primary: "#17191C",
          secondary: "#667085",
        },
        divider: "#E5E9F0",
      },
    },
    dark: {
      palette: {
        primary: {
          main: "#64B5F6",
        },
        background: {
          default: "#0D1117",
          paper: "#161B22",
        },
        text: {
          primary: "#F0F3F6",
          secondary: "#9DA7B3",
        },
        divider: "#30363D",
      },
    },
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: "var(--font-inter), Arial, sans-serif",
    h1: {
      fontSize: "clamp(2.25rem, 6vw, 4.5rem)",
      fontWeight: 750,
      letterSpacing: "-0.045em",
      lineHeight: 1,
    },
    h2: { fontWeight: 800, letterSpacing: "-0.045em", lineHeight: 1.08 },
    h3: { fontWeight: 780, letterSpacing: "-0.04em", lineHeight: 1.12 },
    h4: {
      fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
      fontWeight: 780,
      letterSpacing: "-0.035em",
      lineHeight: 1.15,
    },
    h6: {
      fontWeight: 700,
      letterSpacing: "-0.015em",
      lineHeight: 1.45,
    },
    subtitle1: { fontWeight: 650 },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.55 },
    button: {
      fontWeight: 650,
      textTransform: "none",
    },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 12,
          minHeight: 46,
          paddingInline: 20,
          transition: "transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease",
          "&:active": { transform: "scale(.985)" },
        },
        contained: { boxShadow: "0 8px 22px rgba(23,105,210,.18)", "&:hover": { boxShadow: "0 12px 28px rgba(23,105,210,.24)", transform: "translateY(-1px)" } },
      },
    },
    MuiTextField: {
      defaultProps: { fullWidth: true, variant: "outlined", size: "medium" },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
        outlined: {
          borderColor: "var(--mui-palette-divider)",
          boxShadow: "0 1px 3px rgba(16,24,40,.035)",
        },
      },
    },
    MuiChip: { styleOverrides: { root: { borderRadius: 9, fontWeight: 680 } } },
    MuiIconButton: { styleOverrides: { root: { transition: "background-color 150ms ease, transform 150ms ease", "&:active": { transform: "scale(.94)" } } } },
    MuiAlert: { styleOverrides: { root: { borderRadius: 14 }, message: { lineHeight: 1.55 } } },
    MuiSkeleton: { styleOverrides: { root: { borderRadius: 12 } } },
    MuiDivider: { styleOverrides: { root: { borderColor: "var(--mui-palette-divider)" } } },
    MuiAppBar: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: "none" } } },
    MuiTooltip: { styleOverrides: { tooltip: { borderRadius: 8, fontSize: ".75rem", padding: "7px 10px" } } },
    MuiSnackbarContent: { styleOverrides: { root: { borderRadius: 14 } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 20 } } },
    MuiDialogTitle: { styleOverrides: { root: { fontWeight: 750, letterSpacing: "-.02em" } } },
    MuiTabs: { styleOverrides: { indicator: { borderRadius: 4, height: 3 } } },
    MuiTab: { styleOverrides: { root: { fontWeight: 700, textTransform: "none" } } },
    MuiCssBaseline: { styleOverrides: { "a:focus-visible, button:focus-visible, [role='button']:focus-visible": { outline: "3px solid color-mix(in srgb, var(--mui-palette-primary-main) 28%, transparent)", outlineOffset: 2 } } },
  },
});
