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
    h4: {
      fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
      fontWeight: 780,
      letterSpacing: "-0.035em",
      lineHeight: 1.15,
    },
    h6: {
      fontWeight: 650,
      lineHeight: 1.45,
    },
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
        contained: { boxShadow: "0 8px 22px rgba(23,105,210,.18)" },
      },
    },
    MuiTextField: {
      defaultProps: { fullWidth: true, variant: "outlined" },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
        outlined: {
          borderColor: "var(--mui-palette-divider)",
          boxShadow: "0 1px 2px rgba(16,24,40,.025)",
        },
      },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 650 } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 20 } } },
    MuiDialogTitle: { styleOverrides: { root: { fontWeight: 750, letterSpacing: "-.02em" } } },
    MuiTabs: { styleOverrides: { indicator: { borderRadius: 4, height: 3 } } },
    MuiTab: { styleOverrides: { root: { fontWeight: 700, textTransform: "none" } } },
  },
});
