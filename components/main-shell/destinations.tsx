import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import BedOutlinedIcon from "@mui/icons-material/BedOutlined";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";

export type MainDestination = {
  label: string;
  path: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  match: (pathname: string) => boolean;
};

export const workspaceDestinations: MainDestination[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: <DashboardOutlinedIcon />,
    activeIcon: <DashboardRoundedIcon />,
    match: (path) => path === "/dashboard",
  },
  {
    label: "Bookings",
    path: "/bookings",
    icon: <MenuBookOutlinedIcon />,
    activeIcon: <MenuBookRoundedIcon />,
    match: (path) =>
      path === "/bookings" ||
      (path.startsWith("/bookings/") && path !== "/bookings/new"),
  },
  {
    label: "Rooms",
    path: "/rooms",
    icon: <BedOutlinedIcon />,
    activeIcon: <BedRoundedIcon />,
    match: (path) => path.startsWith("/rooms"),
  },
];

export const managementDestinations: MainDestination[] = [
  {
    label: "Property",
    path: "/more/property",
    icon: <ApartmentOutlinedIcon />,
    activeIcon: <ApartmentRoundedIcon />,
    match: (path) => path === "/more/property",
  },
  {
    label: "Staff",
    path: "/more/staff",
    icon: <GroupsOutlinedIcon />,
    activeIcon: <GroupsRoundedIcon />,
    match: (path) => path === "/more/staff",
  },
];

export const accountDestination: MainDestination = {
  label: "My account",
  path: "/more/account",
  icon: <PersonOutlineRoundedIcon />,
  activeIcon: <PersonRoundedIcon />,
  match: (path) => path === "/more/account",
};
export const mobileDestinations = [
  ...workspaceDestinations.slice(0, 2),
  {
    label: "New booking",
    path: "/bookings/new",
    icon: <AddCircleOutlineRoundedIcon />,
    activeIcon: <AddCircleRoundedIcon />,
    match: (path: string) => path === "/bookings/new",
  },
  workspaceDestinations[2],
  accountDestination,
];
