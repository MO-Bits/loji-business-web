"use client";

import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: "data",
  },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#155EEF", light: "#528BFF", dark: "#0B46B5" },
        secondary: { main: "#12A66A" },
        success: { main: "#159455" },
        warning: { main: "#D97706" },
        error: { main: "#D14343" },
        info: { main: "#1769D2" },
        background: { default: "#F4F6F9", paper: "#FFFFFF" },
        text: { primary: "#101828", secondary: "#667085" },
        divider: "#E3E8EF",
        action: {
          hover: "rgba(16,24,40,.045)",
          selected: "rgba(21,94,239,.09)",
          disabledBackground: "rgba(16,24,40,.08)",
        },
      },
    },
    dark: {
      palette: {
        primary: {
          main: "#7CB2FF",
          light: "#A8CBFF",
          dark: "#4C8DE8",
          contrastText: "#07111F",
        },
        secondary: { main: "#45C993" },
        success: { main: "#45C486", light: "#78DBA9", dark: "#23945D" },
        warning: { main: "#F4B557", light: "#FFD28A", dark: "#C9821F" },
        error: { main: "#FF7B7B", light: "#FFA6A6", dark: "#D94F4F" },
        info: { main: "#72B7FF" },
        background: { default: "#0D1117", paper: "#161B22" },
        text: { primary: "#F0F3F6", secondary: "#9DA7B3" },
        divider: "#303A46",
        action: {
          hover: "rgba(255,255,255,.055)",
          selected: "rgba(124,178,255,.13)",
          disabledBackground: "rgba(255,255,255,.08)",
        },
      },
    },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: "clamp(2.35rem, 5vw, 4.25rem)",
      fontWeight: 700,
      letterSpacing: "-0.045em",
      lineHeight: 1.04,
    },
    h2: {
      fontSize: "clamp(2rem, 3.8vw, 3.25rem)",
      fontWeight: 700,
      letterSpacing: "-0.038em",
      lineHeight: 1.08,
    },
    h3: {
      fontSize: "clamp(1.65rem, 2.7vw, 2.35rem)",
      fontWeight: 700,
      letterSpacing: "-0.03em",
      lineHeight: 1.14,
    },
    h4: {
      fontSize: "clamp(1.4rem, 2vw, 1.85rem)",
      fontWeight: 700,
      letterSpacing: "-0.025em",
      lineHeight: 1.2,
    },
    h5: { fontWeight: 700, letterSpacing: "-0.018em", lineHeight: 1.25 },
    h6: { fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.35 },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.5 },
    button: { fontWeight: 600, textTransform: "none" },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          minHeight: 42,
          paddingInline: 16,
          transition:
            "transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease",
          letterSpacing: "-.005em",
          "&:active": { transform: "scale(.985)" },
        },
        sizeLarge: { minHeight: 48, paddingInline: 20 },
        contained: {
          boxShadow: "0 1px 2px rgba(21,94,239,.2)",
          "&:hover": {
            boxShadow: "0 7px 18px rgba(21,94,239,.22)",
            transform: "translateY(-1px)",
          },
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: "clamp(16px, 2.6vw, 32px) !important",
          paddingRight: "clamp(16px, 2.6vw, 32px) !important",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          backgroundImage: "none",
          borderRadius: ownerState.square ? 0 : 8,
        }),
        rounded: { borderRadius: "8px !important" },
        outlined: {
          borderColor: "var(--mui-palette-divider)",
          boxShadow: "0 1px 3px rgba(16,24,40,.035)",
        },
      },
    },
    MuiCard: {
      styleOverrides: { root: { borderRadius: "8px !important" } },
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
          boxShadow: "0 8px 24px rgba(21,94,239,.24)",
          minHeight: 48,
          textTransform: "none",
          "&:hover": {
            boxShadow: "0 12px 30px rgba(21,94,239,.3)",
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
      styleOverrides: { root: { borderRadius: 6, minHeight: 40 } },
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
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: { minHeight: 56, minWidth: 56 },
        label: { marginTop: 3 },
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
      styleOverrides: { root: { borderRadius: 7, fontWeight: 600 } },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          textRendering: "optimizeLegibility",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        },
        "a:focus-visible, button:focus-visible, [role='button']:focus-visible": {
          outline:
            "3px solid color-mix(in srgb, var(--mui-palette-primary-main) 28%, transparent)",
          outlineOffset: 2,
        },
      },
    },
  },
});
