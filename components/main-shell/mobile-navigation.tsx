import type { ReactNode } from "react";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import BedOutlinedIcon from "@mui/icons-material/BedOutlined";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
} from "@mui/material";
import { useLanguage } from "@/components/providers/language-provider";
import type { WorkspaceCapabilities } from "@/features/session/permissions";

type MobileNavigationProps = {
  capabilities: WorkspaceCapabilities;
  dashboardAllowed: boolean;
  inventoryLabel: string;
  menuOpen: boolean;
  onNavigate: (path: string) => void;
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
  inventoryLabel,
  menuOpen,
  onNavigate,
  onOpenMenu,
  pathname,
  role,
}: MobileNavigationProps) {
  const { t } = useLanguage();
  const activeValue = getMobileNavigationValue(pathname);
  const items: MobileNavigationItem[] = [];

  if (role === "owner" && dashboardAllowed) {
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

  if (role !== "owner" && capabilities.canViewBookings) {
    items.push({
      activeIcon: <EventNoteRoundedIcon />,
      icon: <EventNoteOutlinedIcon />,
      label: t("Bookings", "Uhifadhi"),
      value: "/bookings",
    });
  }

  if (role === "receptionist" && capabilities.canCreateBooking) {
    items.push({
      activeIcon: <AddRoundedIcon />,
      icon: <AddRoundedIcon />,
      label: t("New", "Mpya"),
      value: "/bookings/new",
    });
  }

  if (role !== "owner" && capabilities.canViewRooms) {
    items.push({
      activeIcon: <BedRoundedIcon />,
      icon: <BedOutlinedIcon />,
      label: inventoryLabel,
      value: "/rooms",
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

  if (role === "owner" && capabilities.canViewReports) {
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
        backdropFilter: "saturate(150%) blur(20px)",
        bgcolor: "color-mix(in srgb, var(--mui-palette-background-paper) 94%, transparent)",
        border: 1,
        borderColor: "divider",
        borderRadius: 3,
        bottom: "max(8px, env(safe-area-inset-bottom))",
        boxShadow: "0 12px 38px rgba(15, 34, 58, .18)",
        display: { xs: "block", md: "none" },
        left: 10,
        overflow: "hidden",
        position: "fixed",
        right: 10,
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
          onNavigate(String(value));
        }}
        sx={{
          bgcolor: "transparent",
          height: 62,
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
        {items.map((item) => (
          <BottomNavigationAction
            icon={activeValue === item.value ? item.activeIcon : item.icon}
            key={item.value}
            label={item.label}
            value={item.value}
          />
        ))}
        <BottomNavigationAction
          icon={<MoreHorizRoundedIcon />}
          label={t("More", "Zaidi")}
          value="menu"
        />
      </BottomNavigation>
    </Paper>
  );
}
