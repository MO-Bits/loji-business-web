import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import BedOutlinedIcon from "@mui/icons-material/BedOutlined";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import PeopleOutlineRoundedIcon from "@mui/icons-material/PeopleOutlineRounded";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import type { WorkspaceCapabilities } from "@/features/session/permissions";

export type MainDestination = {
  activeIcon: React.ReactNode;
  capability?: keyof WorkspaceCapabilities;
  icon: React.ReactNode;
  label: string;
  localizedLabel: readonly [english: string, swahili: string];
  match: (pathname: string) => boolean;
  path: string;
  sidebar?: boolean;
};

export const workspaceDestinations: MainDestination[] = [
  {
    label: "Home",
    localizedLabel: ["Home", "Nyumbani"],
    path: "/dashboard",
    icon: <HomeOutlinedIcon />,
    activeIcon: <HomeRoundedIcon />,
    match: (path) => path === "/dashboard",
  },
  {
    label: "Front Desk",
    localizedLabel: ["Front Desk", "Mapokezi"],
    path: "/front-desk",
    capability: "canViewOperations",
    icon: <FactCheckOutlinedIcon />,
    activeIcon: <FactCheckRoundedIcon />,
    match: (path) => path.startsWith("/front-desk") || path.startsWith("/operations"),
  },
  {
    label: "Bookings",
    localizedLabel: ["Bookings", "Uhifadhi"],
    path: "/bookings",
    capability: "canViewBookings",
    icon: <EventNoteOutlinedIcon />,
    activeIcon: <EventNoteRoundedIcon />,
    match: (path) => path === "/bookings" || path.startsWith("/bookings/"),
  },
  {
    label: "Rooms",
    localizedLabel: ["Rooms", "Vyumba"],
    path: "/rooms",
    capability: "canViewRooms",
    icon: <BedOutlinedIcon />,
    activeIcon: <BedRoundedIcon />,
    match: (path) => path.startsWith("/rooms"),
  },
  {
    label: "Guests",
    localizedLabel: ["Guests", "Wageni"],
    path: "/guests",
    capability: "canViewGuests",
    icon: <PeopleOutlineRoundedIcon />,
    activeIcon: <PeopleRoundedIcon />,
    match: (path) => path.startsWith("/guests"),
  },
];

export const operationsDestinations: MainDestination[] = [
  {
    label: "Notifications",
    localizedLabel: ["Notifications", "Arifa"],
    path: "/notifications",
    capability: "canViewNotifications",
    icon: <NotificationsNoneRoundedIcon />,
    activeIcon: <NotificationsRoundedIcon />,
    match: (path) => path.startsWith("/notifications"),
    sidebar: false,
  },
  {
    label: "Activity",
    localizedLabel: ["Activity", "Matukio"],
    path: "/activity",
    capability: "canViewActivity",
    icon: <HistoryOutlinedIcon />,
    activeIcon: <HistoryRoundedIcon />,
    match: (path) => path.startsWith("/activity"),
    sidebar: false,
  },
];

export const businessDestinations: MainDestination[] = [
  {
    label: "Calendar",
    localizedLabel: ["Calendar", "Kalenda"],
    path: "/calendar",
    capability: "canViewCalendar",
    icon: <CalendarMonthOutlinedIcon />,
    activeIcon: <CalendarMonthRoundedIcon />,
    match: (path) => path.startsWith("/calendar"),
    sidebar: false,
  },
  {
    label: "Finance",
    localizedLabel: ["Finance", "Fedha"],
    path: "/finance",
    capability: "canViewFinance",
    icon: <AccountBalanceWalletOutlinedIcon />,
    activeIcon: <AccountBalanceWalletRoundedIcon />,
    match: (path) => path.startsWith("/finance"),
  },
  {
    label: "Reports",
    localizedLabel: ["Reports", "Ripoti"],
    path: "/reports",
    capability: "canViewReports",
    icon: <AssessmentOutlinedIcon />,
    activeIcon: <AssessmentRoundedIcon />,
    match: (path) => path.startsWith("/reports"),
  },
];

export const managementDestinations: MainDestination[] = [
  {
    label: "Property",
    localizedLabel: ["Property", "Biashara"],
    path: "/settings/property",
    capability: "canManageProperty",
    icon: <BusinessOutlinedIcon />,
    activeIcon: <BusinessRoundedIcon />,
    match: (path) => path.startsWith("/settings/property"),
    sidebar: false,
  },
  {
    label: "Staff",
    localizedLabel: ["Staff", "Wafanyakazi"],
    path: "/settings/team",
    capability: "canManageStaff",
    icon: <GroupsOutlinedIcon />,
    activeIcon: <GroupsRoundedIcon />,
    match: (path) => path.startsWith("/settings/team"),
    sidebar: false,
  },
];

export const settingsDestination: MainDestination = {
  label: "Settings",
  localizedLabel: ["Settings", "Mipangilio"],
  path: "/settings",
  icon: <SettingsOutlinedIcon />,
  activeIcon: <SettingsRoundedIcon />,
  match: (path) =>
    path.startsWith("/settings"),
};

export const accountDestination: MainDestination = {
  label: "My account",
  localizedLabel: ["My account", "Akaunti yangu"],
  path: "/settings/profile",
  icon: <PersonOutlineRoundedIcon />,
  activeIcon: <PersonRoundedIcon />,
  match: (path) => path === "/more/account" || path === "/settings/profile",
};

export function visibleDestinations(
  items: MainDestination[],
  capabilities: WorkspaceCapabilities,
) {
  return items.filter(
    (item) => !item.capability || capabilities[item.capability],
  );
}

export function requiredCapabilityForPath(
  pathname: string,
): keyof WorkspaceCapabilities | null {
  if (pathname === "/bookings/new") return "canCreateBooking";
  if (
    pathname === "/rooms/new" ||
    (pathname.startsWith("/rooms/") && pathname.endsWith("/edit"))
  ) {
    return "canManageRooms";
  }

  const guardedDestinations = [
    ...managementDestinations,
    ...businessDestinations,
    ...operationsDestinations,
    ...workspaceDestinations,
  ];
  return (
    guardedDestinations.find(
      (destination) => destination.capability && destination.match(pathname),
    )?.capability ?? null
  );
}
