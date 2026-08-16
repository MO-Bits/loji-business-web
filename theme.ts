"use client";

import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: "light",
    primary: {
      main: "#15803D",
      dark: "#166534",
      light: "#DCFCE7",
    },
    background: {
      default: "#F7F8FA",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#111827",
      secondary: "#667085",
    },
    divider: "#E5E7EB",
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: "var(--font-inter), Arial, sans-serif",
    h1: {
      fontSize: "clamp(2.5rem, 7vw, 5.5rem)",
      fontWeight: 750,
      letterSpacing: "-0.055em",
      lineHeight: 0.98,
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
      styleOverrides: {
        root: {
          borderRadius: 10,
          minHeight: 44,
          paddingInline: 20,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
  },
});
