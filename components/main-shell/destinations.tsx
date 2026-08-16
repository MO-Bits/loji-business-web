import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import BedOutlinedIcon from "@mui/icons-material/BedOutlined";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";

export type MainDestination = {
  label: string;
  path: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  match: (pathname: string) => boolean;
  showsUnread?: boolean;
};

export const mainDestinations: MainDestination[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: <DashboardOutlinedIcon />,
    activeIcon: <DashboardRoundedIcon />,
    match: (pathname) => pathname === "/dashboard",
  },
  {
    label: "Bookings",
    path: "/bookings",
    icon: <MenuBookOutlinedIcon />,
    activeIcon: <MenuBookRoundedIcon />,
    match: (pathname) => pathname === "/bookings",
  },
  {
    label: "New booking",
    path: "/bookings/new",
    icon: <AddCircleOutlineRoundedIcon />,
    activeIcon: <AddCircleRoundedIcon />,
    match: (pathname) => pathname === "/bookings/new",
  },
  {
    label: "Updates",
    path: "/updates",
    icon: <NotificationsNoneRoundedIcon />,
    activeIcon: <NotificationsRoundedIcon />,
    match: (pathname) => pathname === "/updates",
    showsUnread: true,
  },
  {
    label: "Rooms",
    path: "/rooms",
    icon: <BedOutlinedIcon />,
    activeIcon: <BedRoundedIcon />,
    match: (pathname) => pathname === "/rooms",
  },
];
