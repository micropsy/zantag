import { 
  LayoutDashboard, 
  User, 
  Users, 
  FileText, 
  BarChart3, 
  Settings,
  LucideIcon 
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: string[]; // If restricted to specific roles
  adminOnly?: boolean; // If restricted to admin roles (shortcut)
  mobileLabel?: string; // Optional shorter label for mobile
}

export const navigationItems: NavItem[] = [
  { 
    label: "Overview", 
    mobileLabel: "Home",
    href: "/dashboard", 
    icon: LayoutDashboard 
  },
  { 
    label: "Profile Editor", 
    mobileLabel: "Profile",
    href: "/dashboard/profile", 
    icon: User 
  },
  { 
    label: "Leads", 
    href: "/dashboard/leads", 
    icon: Users 
  },
  { 
    label: "Documents", 
    mobileLabel: "Docs",
    href: "/dashboard/documents", 
    icon: FileText 
  },
  { 
    label: "Analytics", 
    mobileLabel: "Stats",
    href: "/dashboard/analytics", 
    icon: BarChart3 
  },
  { 
    label: "Settings", 
    href: "/dashboard/settings", 
    icon: Settings 
  },
  { 
    label: "Admin Portal", 
    href: "/admin", 
    icon: Users,
    roles: ["SUPER_ADMIN", "BUSINESS_ADMIN"]
  }
];
