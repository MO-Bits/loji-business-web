"use client";

import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  cssVariables: true,
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: "#0B66D4",
          light: "#4D93E8",
          dark: "#074A9E",
        },
        secondary: { main: "#0E9F6E" },
        background: {
          default: "#F7F8FA",
          paper: "#FFFFFF",
        },
        text: {
          primary: "#17202A",
          secondary: "#647181",
        },
        divider: "#E2E7EC",
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
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          minHeight: 44,
          paddingInline: 18,
          transition: "transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease",
          "&:active": { transform: "scale(.985)" },
        },
        contained: { boxShadow: "0 7px 18px rgba(11,102,212,.18)", "&:hover": { boxShadow: "0 10px 24px rgba(11,102,212,.25)", transform: "translateY(-1px)" } },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: "clamp(16px, 3vw, 32px) !important",
          paddingRight: "clamp(16px, 3vw, 32px) !important",
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        fullWidth: true,
        variant: "outlined",
        size: "medium",
        slotProps: {
          inputLabel: { shrink: true },
          input: { notched: false },
        },
      },
      styleOverrides: {
        root: {
          "&:has(> .MuiInputLabel-root)": {
            marginTop: 26,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          maxWidth: "100%",
          overflow: "visible",
          color: "var(--mui-palette-text-primary)",
          pointerEvents: "none",
          transform: "translate(0, -25px) scale(1)",
          transformOrigin: "left top",
          "&.MuiInputLabel-shrink": {
            transform: "translate(0, -25px) scale(1)",
          },
          "&.Mui-focused": {
            color: "var(--mui-palette-primary-main)",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          backgroundImage: "none",
          borderRadius: ownerState.square ? 0 : 8,
        }),
        rounded: {
          borderRadius: "8px !important",
        },
        outlined: {
          borderColor: "var(--mui-palette-divider)",
          boxShadow: "0 1px 2px rgba(17,24,39,.025), 0 8px 30px rgba(17,24,39,.025)",
        },
      },
    },
    MuiCard: {
      styleOverrides: { root: { borderRadius: "8px !important" } },
    },
    MuiChip: { styleOverrides: { root: { borderRadius: 999 } } },
    MuiIconButton: { styleOverrides: { root: { transition: "background-color 150ms ease, transform 150ms ease", "&:active": { transform: "scale(.94)" } } } },
    MuiDialogActions: { styleOverrides: { root: { gap: 8, padding: "16px 24px 24px", flexWrap: "wrap" } } },
    MuiAlert: { styleOverrides: { root: { borderRadius: 8 } } },
    MuiSkeleton: { styleOverrides: { root: { borderRadius: 8 } } },
    MuiDivider: { styleOverrides: { root: { borderColor: "var(--mui-palette-divider)" } } },
    MuiAppBar: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: "none" } } },
    MuiTooltip: { styleOverrides: { tooltip: { borderRadius: 8, padding: "7px 10px" } } },
    MuiSnackbarContent: { styleOverrides: { root: { borderRadius: 8 } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 8, boxShadow: "0 24px 80px rgba(17,24,39,.18)" } } },
    MuiTabs: { styleOverrides: { indicator: { borderRadius: 4, height: 3 } } },
    MuiCssBaseline: { styleOverrides: { "a:focus-visible, button:focus-visible, [role='button']:focus-visible": { outline: "3px solid color-mix(in srgb, var(--mui-palette-primary-main) 28%, transparent)", outlineOffset: 2 } } },
  },
});
