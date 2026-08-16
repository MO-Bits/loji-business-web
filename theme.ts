"use client";

import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  cssVariables: true,
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: "#1E88E5",
        },
        background: {
          default: "#F2F2F7",
          paper: "#FFFFFF",
        },
        text: {
          primary: "#17191C",
          secondary: "#667085",
        },
        divider: "#E2E5E9",
      },
    },
    dark: {
      palette: {
        primary: {
          main: "#42A5F5",
        },
        background: {
          default: "#161B22",
          paper: "#21262D",
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
    borderRadius: 12,
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
      fontWeight: 700,
      letterSpacing: "-0.025em",
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
