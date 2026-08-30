"use client";

import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  breakpoints: {
    values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 },
  },
  cssVariables: {
    colorSchemeSelector: "data",
  },
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: "#007AFF",
          light: "#5AC8FA",
          dark: "#0066CC",
          contrastText: "#FFFFFF",
        },
        secondary: { main: "#5856D6" },
        success: { main: "#248A3D" },
        warning: { main: "#C76A00" },
        error: { main: "#D70015" },
        info: { main: "#007AFF" },
        background: { default: "#F5F5F7", paper: "#FFFFFF" },
        text: { primary: "#1D1D1F", secondary: "#6E6E73" },
        divider: "#E5E5EA",
        action: {
          hover: "rgba(0,122,255,.055)",
          selected: "rgba(0,122,255,.105)",
          disabled: "rgba(60,60,67,.38)",
          disabledBackground: "rgba(116,116,128,.12)",
        },
      },
    },
    dark: {
      palette: {
        primary: {
          main: "#0A84FF",
          light: "#64D2FF",
          dark: "#409CFF",
          contrastText: "#FFFFFF",
        },
        secondary: { main: "#BF5AF2" },
        success: { main: "#30D158" },
        warning: { main: "#FF9F0A" },
        error: { main: "#FF453A" },
        info: { main: "#64D2FF" },
        background: { default: "#0B0D10", paper: "#15171B" },
        text: { primary: "#F5F5F7", secondary: "#A1A1A6" },
        divider: "#2C2C2E",
        action: {
          hover: "rgba(255,255,255,.06)",
          selected: "rgba(10,132,255,.16)",
          disabled: "rgba(235,235,245,.3)",
          disabledBackground: "rgba(118,118,128,.24)",
        },
      },
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: "clamp(1.75rem, 2.4vw, 2rem)",
      fontWeight: 700,
      letterSpacing: "-0.03em",
      lineHeight: 1.16,
    },
    h2: {
      fontSize: "clamp(1.5rem, 2vw, 1.75rem)",
      fontWeight: 700,
      letterSpacing: "-0.03em",
      lineHeight: 1.16,
    },
    h3: {
      fontSize: "clamp(1.375rem, 1.7vw, 1.625rem)",
      fontWeight: 700,
      letterSpacing: "-0.025em",
      lineHeight: 1.2,
    },
    h4: {
      fontSize: "clamp(1.25rem, 1.5vw, 1.375rem)",
      fontWeight: 700,
      letterSpacing: "-0.025em",
      lineHeight: 1.24,
    },
    h5: {
      fontSize: "1.0625rem",
      fontWeight: 700,
      letterSpacing: "-0.018em",
      lineHeight: 1.35,
    },
    h6: {
      fontSize: ".9375rem",
      fontWeight: 500,
      letterSpacing: "-0.01em",
      lineHeight: 1.45,
    },
    subtitle1: { fontSize: ".9375rem", fontWeight: 500, lineHeight: 1.5 },
    subtitle2: { fontSize: ".875rem", fontWeight: 500, lineHeight: 1.45 },
    body1: { fontSize: ".875rem", lineHeight: 1.6 },
    body2: { fontSize: ".8125rem", lineHeight: 1.55 },
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
          borderRadius: 10,
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
          boxShadow: "0 1px 2px rgba(0,122,255,.18)",
          "&:hover": {
            boxShadow: "0 6px 18px rgba(0,122,255,.22)",
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
          borderRadius: ownerState.square ? 0 : 12,
        }),
        rounded: { borderRadius: "12px !important" },
        outlined: {
          borderColor: "var(--mui-palette-divider)",
          boxShadow: "0 1px 2px rgba(0,0,0,.025)",
        },
      },
    },
    MuiCard: {
      styleOverrides: { root: { borderRadius: "12px !important" } },
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
          boxShadow: "0 8px 24px rgba(0,122,255,.24)",
          minHeight: 48,
          textTransform: "none",
          "&:hover": {
            boxShadow: "0 12px 30px rgba(0,122,255,.3)",
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
    MuiAlert: { styleOverrides: { root: { borderRadius: 10 } } },
    MuiSkeleton: { styleOverrides: { root: { borderRadius: 10 } } },
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
          borderRadius: 14,
          boxShadow: "0 24px 80px rgba(0,0,0,.2)",
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
          boxShadow: "0 14px 44px rgba(0,0,0,.14)",
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
          borderRadius: "12px !important",
          "&::before": { display: "none" },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor:
            "color-mix(in srgb, var(--mui-palette-background-default) 78%, var(--mui-palette-background-paper))",
          color: "var(--mui-palette-text-secondary)",
          fontSize: ".75rem",
          fontWeight: 700,
          letterSpacing: ".035em",
          textTransform: "uppercase",
        },
        root: {
          borderColor: "var(--mui-palette-divider)",
          fontSize: ".875rem",
          height: 48,
          padding: "10px 16px",
        },
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
            borderRadius: 10,
            minHeight: 40,
            transition: "box-shadow 150ms ease, border-color 150ms ease",
            "&.Mui-focused": {
              boxShadow: "0 0 0 3px color-mix(in srgb, var(--mui-palette-primary-main) 16%, transparent)",
            },
            "@media (max-width: 599px)": { minHeight: 44 },
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
          boxShadow: "0 16px 44px rgba(0,0,0,.16)",
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
