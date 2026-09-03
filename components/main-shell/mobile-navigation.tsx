import type { ReactNode } from "react";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import {
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
} from "@mui/material";
import { useLanguage } from "@/components/providers/language-provider";
import type { WorkspaceCapabilities } from "@/features/session/permissions";

type MobileNavigationProps = {
  capabilities: WorkspaceCapabilities;
  dashboardAllowed: boolean;
  menuOpen: boolean;
  onNavigate: (path: string) => void;
  onNewBooking: () => void;
  onOpenMenu: () => void;
  pathname: string;
  role?: string;
};

type MobileNavigationItem = {
  activeIcon: ReactNode;
  icon: ReactNode;
  label: string;
  value: string;
};

export function getMobileNavigationValue(pathname: string) {
  if (pathname === "/bookings/new") return "/bookings/new";
  if (
    pathname.startsWith("/front-desk") ||
    pathname.startsWith("/operations")
  ) {
    return "/front-desk";
  }
  if (pathname.startsWith("/bookings")) return "/bookings";
  if (pathname.startsWith("/rooms")) return "/rooms";
  if (pathname.startsWith("/guests")) return "/guests";
  if (pathname === "/dashboard") return "/dashboard";
  if (pathname.startsWith("/finance")) return "/finance";
  if (pathname.startsWith("/reports")) return "/reports";
  return "menu";
}

export function MobileNavigation({
  capabilities,
  dashboardAllowed,
  menuOpen,
  onNavigate,
  onNewBooking,
  onOpenMenu,
  pathname,
  role,
}: MobileNavigationProps) {
  const { t } = useLanguage();
  const activeValue = getMobileNavigationValue(pathname);
  const items: MobileNavigationItem[] = [];

  if (dashboardAllowed) {
    items.push({
      activeIcon: <HomeRoundedIcon />,
      icon: <HomeOutlinedIcon />,
      label: t("Home", "Nyumbani"),
      value: "/dashboard",
    });
  }

  if (capabilities.canViewOperations) {
    items.push({
      activeIcon: <FactCheckRoundedIcon />,
      icon: <FactCheckOutlinedIcon />,
      label: t("Front Desk", "Mapokezi"),
      value: "/front-desk",
    });
  }

  if (role === "receptionist" && capabilities.canViewBookings) {
    items.push({
      activeIcon: <EventNoteRoundedIcon />,
      icon: <EventNoteOutlinedIcon />,
      label: t("Bookings", "Uhifadhi"),
      value: "/bookings",
    });
  }

  if (capabilities.canViewFinance && (role === "owner" || role === "manager")) {
    items.push({
      activeIcon: <AccountBalanceWalletRoundedIcon />,
      icon: <AccountBalanceWalletOutlinedIcon />,
      label: t("Finance", "Fedha"),
      value: "/finance",
    });
  }

  if (role === "owner" && capabilities.canViewReports && items.length < 3) {
    items.push({
      activeIcon: <AssessmentRoundedIcon />,
      icon: <AssessmentOutlinedIcon />,
      label: t("Reports", "Ripoti"),
      value: "/reports",
    });
  }

  return (
    <Paper
      component="nav"
      aria-label={t("Primary navigation", "Menyu kuu")}
      elevation={0}
      sx={{
        bgcolor: "background.paper",
        borderTop: 1,
        borderColor: "divider",
        borderRadius: 0,
        bottom: 0,
        display: { xs: "block", md: "none" },
        left: 0,
        overflow: "visible",
        pb: "env(safe-area-inset-bottom)",
        position: "fixed",
        right: 0,
        zIndex: (theme) => theme.zIndex.appBar,
      }}
    >
      <BottomNavigation
        showLabels
        value={menuOpen ? "menu" : activeValue}
        onChange={(_, value) => {
          if (value === "menu") {
            onOpenMenu();
            return;
          }
          if (value === "new-booking") {
            onNewBooking();
            return;
          }
          onNavigate(String(value));
        }}
        sx={{
          bgcolor: "transparent",
          height: 64,
          px: 0.25,
          "& .MuiBottomNavigationAction-root": {
            color: "text.secondary",
            minWidth: 52,
            position: "relative",
            "&.Mui-selected": {
              color: "primary.main",
              "&::before": {
                bgcolor: "primary.main",
                borderRadius: 999,
                content: '\"\"',
                height: 3,
                left: "34%",
                position: "absolute",
                right: "34%",
                top: 0,
              },
            },
          },
          "& .MuiBottomNavigationAction-label": {
            fontSize: ".6875rem",
            fontWeight: 500,
            mt: 0.25,
            "&.Mui-selected": { fontSize: ".6875rem", fontWeight: 700 },
          },
        }}
      >
        {items.slice(0, capabilities.canCreateBooking ? 3 : 4).flatMap((item, index) => {
          const actions = [
            <BottomNavigationAction
              icon={activeValue === item.value ? item.activeIcon : item.icon}
              key={item.value}
              label={item.label}
              value={item.value}
            />,
          ];
          if (capabilities.canCreateBooking && index === 1) {
            actions.push(
              <BottomNavigationAction
                aria-label={t("New booking", "Uhifadhi mpya")}
                icon={(
                  <Box
                    sx={{
                      alignItems: "center",
                      bgcolor: "primary.main",
                      border: "5px solid",
                      borderColor: "background.paper",
                      borderRadius: 2.25,
                      boxShadow: "0 7px 20px color-mix(in srgb, var(--mui-palette-primary-main) 30%, transparent)",
                      color: "primary.contrastText",
                      display: "flex",
                      height: 50,
                      justifyContent: "center",
                      transform: "translateY(-8px)",
                      width: 50,
                    }}
                  >
                    <AddRoundedIcon sx={{ fontSize: 28 }} />
                  </Box>
                )}
                key="new-booking"
                label={t("New", "Mpya")}
                sx={{
                  color: "primary.main!important",
                  "& .MuiBottomNavigationAction-label": { color: "text.primary", fontWeight: 700 },
                }}
                value="new-booking"
              />,
            );
          }
          return actions;
        })}
        <BottomNavigationAction
          icon={<MoreHorizRoundedIcon />}
          label={t("More", "Zaidi")}
          value="menu"
        />
      </BottomNavigation>
    </Paper>
  );
}
