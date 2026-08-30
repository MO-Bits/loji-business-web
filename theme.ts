"use client";

import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  breakpoints: {
    values: { xs: 0, sm: 600, md: 960, lg: 1200, xl: 1536 },
  },
  cssVariables: {
    colorSchemeSelector: "data",
  },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#176B4D", light: "#4E9D7D", dark: "#104C36" },
        secondary: { main: "#397BB1" },
        success: { main: "#258463" },
        warning: { main: "#AE6F13" },
        error: { main: "#D14343" },
        info: { main: "#1769D2" },
        background: { default: "#F6F8F7", paper: "#FFFFFF" },
        text: { primary: "#1E2A25", secondary: "#718079" },
        divider: "#E1E8E4",
        action: {
          hover: "rgba(23,107,77,.055)",
          selected: "rgba(23,107,77,.10)",
          disabledBackground: "rgba(30,42,37,.08)",
        },
      },
    },
    dark: {
      palette: {
        primary: {
          main: "#72C6A5",
          light: "#9BDEC5",
          dark: "#4FA17F",
          contrastText: "#071B13",
        },
        secondary: { main: "#82BDEB" },
        success: { main: "#45C486", light: "#78DBA9", dark: "#23945D" },
        warning: { main: "#F4B557", light: "#FFD28A", dark: "#C9821F" },
        error: { main: "#FF7B7B", light: "#FFA6A6", dark: "#D94F4F" },
        info: { main: "#72B7FF" },
        background: { default: "#101A16", paper: "#16231D" },
        text: { primary: "#F1F7F4", secondary: "#AAB8B1" },
        divider: "#30433A",
        action: {
          hover: "rgba(255,255,255,.055)",
          selected: "rgba(114,198,165,.14)",
          disabledBackground: "rgba(255,255,255,.08)",
        },
      },
    },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
      fontWeight: 700,
      letterSpacing: "-0.035em",
      lineHeight: 1.12,
    },
    h2: {
      fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
      fontWeight: 700,
      letterSpacing: "-0.03em",
      lineHeight: 1.16,
    },
    h3: {
      fontSize: "clamp(1.375rem, 2vw, 1.75rem)",
      fontWeight: 700,
      letterSpacing: "-0.025em",
      lineHeight: 1.2,
    },
    h4: {
      fontSize: "clamp(1.25rem, 1.8vw, 1.5rem)",
      fontWeight: 700,
      letterSpacing: "-0.025em",
      lineHeight: 1.24,
    },
    h5: {
      fontSize: "1.125rem",
      fontWeight: 700,
      letterSpacing: "-0.018em",
      lineHeight: 1.35,
    },
    h6: {
      fontSize: "1rem",
      fontWeight: 500,
      letterSpacing: "-0.01em",
      lineHeight: 1.45,
    },
    subtitle1: { fontSize: ".9375rem", fontWeight: 500, lineHeight: 1.5 },
    subtitle2: { fontSize: ".875rem", fontWeight: 500, lineHeight: 1.45 },
    body1: { fontSize: ".875rem", lineHeight: 1.55 },
    body2: { fontSize: ".8125rem", lineHeight: 1.5 },
    caption: { fontSize: ".75rem", lineHeight: 1.45 },
    overline: {
      fontSize: ".75rem",
      fontWeight: 700,
      letterSpacing: ".08em",
      lineHeight: 1.6,
    },
    button: { fontSize: ".875rem", fontWeight: 500, textTransform: "none" },
  },
  components: {
    MuiButtonBase: {
      styleOverrides: {
        root: {
          "&.Mui-focusVisible": {
            outline: "3px solid var(--mui-palette-primary-main)",
            outlineOffset: 2,
          },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          minHeight: 40,
          paddingInline: 16,
          transition:
            "transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease",
          letterSpacing: "-.005em",
          "&:active": { transform: "scale(.985)" },
          "@media (max-width: 599px)": { minHeight: 44 },
        },
        sizeLarge: { minHeight: 48, paddingInline: 20 },
        contained: {
          boxShadow: "0 1px 2px rgba(23,107,77,.18)",
          "&:hover": {
            boxShadow: "0 5px 14px rgba(23,107,77,.2)",
          },
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: 16,
          paddingRight: 16,
          "@media (min-width: 600px)": {
            paddingLeft: 24,
            paddingRight: 24,
          },
          "@media (min-width: 1200px)": {
            paddingLeft: 32,
            paddingRight: 32,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          backgroundImage: "none",
          borderRadius: ownerState.square ? 0 : 10,
        }),
        rounded: { borderRadius: "10px !important" },
        outlined: {
          borderColor: "var(--mui-palette-divider)",
          boxShadow: "0 1px 2px rgba(16,24,40,.025)",
        },
      },
    },
    MuiCard: {
      styleOverrides: { root: { borderRadius: "10px !important" } },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999, fontWeight: 500 },
        sizeSmall: { height: 24 },
      },
    },
    MuiFab: {
      defaultProps: { disableRipple: false },
      styleOverrides: {
        root: {
          boxShadow: "0 8px 24px rgba(23,107,77,.24)",
          minHeight: 48,
          textTransform: "none",
          "&:hover": {
            boxShadow: "0 12px 30px rgba(23,107,77,.3)",
            transform: "translateY(-1px)",
          },
          "&:active": { transform: "scale(.98)" },
        },
        extended: {
          borderRadius: 999,
          fontSize: ".875rem",
          fontWeight: 700,
          paddingInline: 20,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minHeight: 40,
          minWidth: 40,
          transition: "background-color 150ms ease, transform 150ms ease",
          "&:active": { transform: "scale(.94)" },
          "@media (max-width: 599px)": {
            minHeight: 44,
            minWidth: 44,
          },
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          gap: 8,
          padding: "16px 24px 24px",
          flexWrap: "wrap",
        },
      },
    },
    MuiAlert: { styleOverrides: { root: { borderRadius: 8 } } },
    MuiSkeleton: { styleOverrides: { root: { borderRadius: 8 } } },
    MuiDivider: {
      styleOverrides: { root: { borderColor: "var(--mui-palette-divider)" } },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: "none" } },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { borderRadius: 8, padding: "7px 10px" } },
    },
    MuiSnackbarContent: {
      styleOverrides: { root: { borderRadius: 8 } },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          border: "1px solid var(--mui-palette-divider)",
          borderRadius: 8,
          boxShadow: "0 24px 80px rgba(17,24,39,.18)",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { padding: "24px 24px 12px" } },
    },
    MuiDialogContent: {
      styleOverrides: { root: { paddingInline: 24 } },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 44 },
        indicator: { borderRadius: 4, height: 3 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 44,
          minWidth: 96,
          paddingInline: 16,
          textTransform: "none",
          fontSize: ".875rem",
          fontWeight: 500,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: "background-color 140ms ease, color 140ms ease",
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          border: "1px solid var(--mui-palette-divider)",
          boxShadow: "0 12px 36px rgba(17,24,39,.12)",
          marginTop: 6,
        },
        list: { padding: 6 },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontSize: ".875rem",
          minHeight: 40,
          "@media (max-width: 599px)": { minHeight: 44 },
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          borderRadius: "8px !important",
          "&::before": { display: "none" },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: "var(--mui-palette-background-default)",
          color: "var(--mui-palette-text-secondary)",
          fontSize: ".75rem",
          fontWeight: 700,
          letterSpacing: ".035em",
          textTransform: "uppercase",
        },
        root: { borderColor: "var(--mui-palette-divider)" },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: "background-color 140ms ease",
          "&:hover": { backgroundColor: "var(--mui-palette-action-hover)" },
        },
      },
    },
    MuiSelect: {
      defaultProps: { MenuProps: { disableScrollLock: true } },
    },
    MuiTextField: {
      defaultProps: { size: "small" },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: ".875rem",
          "&.MuiOutlinedInput-root": {
            backgroundColor: "var(--mui-palette-background-paper)",
            borderRadius: 8,
            transition: "box-shadow 150ms ease, border-color 150ms ease",
            "&.Mui-focused": {
              boxShadow: "0 0 0 3px color-mix(in srgb, var(--mui-palette-primary-main) 16%, transparent)",
            },
          },
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: { minHeight: 56, minWidth: 56 },
        label: { fontSize: ".75rem", marginTop: 3 },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          border:
            "1px solid color-mix(in srgb, var(--mui-palette-divider) 78%, transparent)",
          fontWeight: 700,
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backdropFilter: "blur(3px)",
          backgroundColor: "rgba(15,23,42,.42)",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundImage: "none", boxShadow: "none" },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          border: "2px solid var(--mui-palette-background-paper)",
          fontSize: ".68rem",
          fontWeight: 700,
          minWidth: 18,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 999, height: 6 },
        bar: { borderRadius: 999 },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          border: "1px solid var(--mui-palette-divider)",
          boxShadow: "0 16px 44px rgba(17,24,39,.14)",
          marginTop: 6,
        },
        option: { borderRadius: 6, margin: "2px 6px", minHeight: 42 },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          "&.Mui-checked + .MuiSwitch-track": { opacity: 1 },
        },
        track: { opacity: .35 },
      },
    },
    MuiSnackbar: {
      styleOverrides: {
        root: {
          "@media (max-width: 599px)": {
            bottom: "max(16px, env(safe-area-inset-bottom)) !important",
            left: "12px !important",
            right: "12px !important",
          },
        },
      },
    },
    MuiPaginationItem: {
      styleOverrides: { root: { borderRadius: 7, fontWeight: 500 } },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          textRendering: "optimizeLegibility",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        },
        "a:focus-visible, button:focus-visible, [role='button']:focus-visible": {
          outline: "3px solid var(--mui-palette-primary-main)",
          outlineOffset: 2,
        },
      },
    },
  },
});
