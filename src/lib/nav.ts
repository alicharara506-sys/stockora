import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Shirt,
  Boxes,
  ArrowLeftRight,
  ClipboardList,
  Truck,
  Users,
  Undo2,
  Wallet,
  UserCog,
  BarChart3,
  Trophy,
  Bot,
  QrCode,
  Building2,
  Plug,
  Settings,
} from "lucide-react";

export interface AppNavItem {
  slug: string;
  label: string;
  icon: LucideIcon;
  /** Implementation phase per the Stockora build roadmap (see ARCHITECTURE.md). */
  phase: number;
}

export const APP_NAV: AppNavItem[] = [
  { slug: "dashboard", label: "Dashboard", icon: LayoutDashboard, phase: 1 },
  { slug: "pos", label: "POS", icon: ShoppingCart, phase: 5 },
  { slug: "sales", label: "Sales", icon: Receipt, phase: 5 },
  { slug: "products", label: "Products", icon: Shirt, phase: 3 },
  { slug: "inventory", label: "Inventory", icon: Boxes, phase: 4 },
  { slug: "transfers", label: "Transfers", icon: ArrowLeftRight, phase: 4 },
  { slug: "purchases", label: "Purchases", icon: ClipboardList, phase: 7 },
  { slug: "suppliers", label: "Suppliers", icon: Truck, phase: 7 },
  { slug: "customers", label: "Customers", icon: Users, phase: 6 },
  { slug: "returns", label: "Returns", icon: Undo2, phase: 6 },
  { slug: "expenses", label: "Expenses", icon: Wallet, phase: 7 },
  { slug: "employees", label: "Employees", icon: UserCog, phase: 2 },
  { slug: "reports", label: "Reports", icon: BarChart3, phase: 8 },
  { slug: "performance", label: "Performance", icon: Trophy, phase: 11 },
  { slug: "ai-assistant", label: "AI Assistant", icon: Bot, phase: 9 },
  { slug: "qr-codes", label: "QR Codes", icon: QrCode, phase: 10 },
  { slug: "branches", label: "Branches", icon: Building2, phase: 2 },
  { slug: "integrations", label: "Integrations", icon: Plug, phase: 10 },
  { slug: "settings", label: "Settings", icon: Settings, phase: 2 },
];

export const APP_NAV_SLUGS = APP_NAV.map((item) => item.slug);
