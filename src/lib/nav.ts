import type { LucideIcon } from "lucide-react";
import type en from "@/messages/en.json";

type NavMessageKey = keyof (typeof en)["nav"];
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
  /** English fallback, used where no translation context is available. */
  label: string;
  /** Key into the `nav` section of the message catalogs. */
  labelKey: NavMessageKey;
  icon: LucideIcon;
  /** Implementation phase per the Stockora build roadmap (see ARCHITECTURE.md). */
  phase: number;
}

export const APP_NAV: AppNavItem[] = [
  { slug: "dashboard", labelKey: "dashboard", label: "Dashboard", icon: LayoutDashboard, phase: 1 },
  { slug: "pos", labelKey: "pos", label: "POS", icon: ShoppingCart, phase: 5 },
  { slug: "sales", labelKey: "sales", label: "Sales", icon: Receipt, phase: 5 },
  { slug: "products", labelKey: "products", label: "Products", icon: Shirt, phase: 3 },
  { slug: "inventory", labelKey: "inventory", label: "Inventory", icon: Boxes, phase: 4 },
  { slug: "transfers", labelKey: "transfers", label: "Transfers", icon: ArrowLeftRight, phase: 4 },
  { slug: "purchases", labelKey: "purchases", label: "Purchases", icon: ClipboardList, phase: 7 },
  { slug: "suppliers", labelKey: "suppliers", label: "Suppliers", icon: Truck, phase: 7 },
  { slug: "customers", labelKey: "customers", label: "Customers", icon: Users, phase: 6 },
  { slug: "returns", labelKey: "returns", label: "Returns", icon: Undo2, phase: 6 },
  { slug: "expenses", labelKey: "expenses", label: "Expenses", icon: Wallet, phase: 7 },
  { slug: "employees", labelKey: "employees", label: "Employees", icon: UserCog, phase: 2 },
  { slug: "reports", labelKey: "reports", label: "Reports", icon: BarChart3, phase: 8 },
  { slug: "performance", labelKey: "performance", label: "Performance", icon: Trophy, phase: 11 },
  { slug: "ai-assistant", labelKey: "aiAssistant", label: "AI Assistant", icon: Bot, phase: 9 },
  { slug: "qr-codes", labelKey: "qrCodes", label: "QR Codes", icon: QrCode, phase: 10 },
  { slug: "branches", labelKey: "branches", label: "Branches", icon: Building2, phase: 2 },
  { slug: "integrations", labelKey: "integrations", label: "Integrations", icon: Plug, phase: 10 },
  { slug: "settings", labelKey: "settings", label: "Settings", icon: Settings, phase: 2 },
];

export const APP_NAV_SLUGS = APP_NAV.map((item) => item.slug);
