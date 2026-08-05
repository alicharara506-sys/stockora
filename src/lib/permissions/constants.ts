export const PERMISSIONS = {
  VIEW_COST_PRICE: "view_cost_price",
  CHANGE_PRICE: "change_price",
  APPLY_DISCOUNT: "apply_discount",
  OVERRIDE_DISCOUNT_LIMIT: "override_discount_limit",
  CANCEL_SALE: "cancel_sale",
  RETURN_SALE: "return_sale",
  EXCHANGE_ITEM: "exchange_item",
  OPEN_REGISTER: "open_register",
  CLOSE_REGISTER: "close_register",
  VIEW_PROFIT: "view_profit",
  MANAGE_PRODUCTS: "manage_products",
  ADJUST_STOCK: "adjust_stock",
  TRANSFER_STOCK: "transfer_stock",
  VIEW_REPORTS: "view_reports",
  MANAGE_EMPLOYEES: "manage_employees",
  MANAGE_SUBSCRIPTIONS: "manage_subscriptions",
  CHANGE_SETTINGS: "change_settings",
  VIEW_PERFORMANCE: "view_performance",
  MANAGE_COMMISSION: "manage_commission",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_DEFINITIONS: { key: PermissionKey; label: string; group: string }[] = [
  { key: PERMISSIONS.VIEW_COST_PRICE, label: "View cost price", group: "Products" },
  { key: PERMISSIONS.CHANGE_PRICE, label: "Change price", group: "Products" },
  { key: PERMISSIONS.APPLY_DISCOUNT, label: "Apply discount", group: "Sales" },
  { key: PERMISSIONS.OVERRIDE_DISCOUNT_LIMIT, label: "Override discount limit", group: "Sales" },
  { key: PERMISSIONS.CANCEL_SALE, label: "Cancel sale", group: "Sales" },
  { key: PERMISSIONS.RETURN_SALE, label: "Return sale", group: "Sales" },
  { key: PERMISSIONS.EXCHANGE_ITEM, label: "Exchange item", group: "Sales" },
  { key: PERMISSIONS.OPEN_REGISTER, label: "Open register", group: "Register" },
  { key: PERMISSIONS.CLOSE_REGISTER, label: "Close register", group: "Register" },
  { key: PERMISSIONS.VIEW_PROFIT, label: "View profit", group: "Reports" },
  { key: PERMISSIONS.MANAGE_PRODUCTS, label: "Manage products", group: "Products" },
  { key: PERMISSIONS.ADJUST_STOCK, label: "Adjust stock", group: "Inventory" },
  { key: PERMISSIONS.TRANSFER_STOCK, label: "Transfer stock", group: "Inventory" },
  { key: PERMISSIONS.VIEW_REPORTS, label: "View reports", group: "Reports" },
  { key: PERMISSIONS.MANAGE_EMPLOYEES, label: "Manage employees", group: "Team" },
  { key: PERMISSIONS.MANAGE_SUBSCRIPTIONS, label: "Manage subscriptions", group: "Billing" },
  { key: PERMISSIONS.CHANGE_SETTINGS, label: "Change settings", group: "Settings" },
  { key: PERMISSIONS.VIEW_PERFORMANCE, label: "View performance", group: "Performance" },
  { key: PERMISSIONS.MANAGE_COMMISSION, label: "Manage targets & commission", group: "Performance" },
];

export const SYSTEM_ROLES = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  CASHIER: "CASHIER",
  INVENTORY_MANAGER: "INVENTORY_MANAGER",
  ACCOUNTANT: "ACCOUNTANT",
  SALESPERSON: "SALESPERSON",
} as const;

export type SystemRoleKey = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const SYSTEM_ROLE_DEFINITIONS: Record<
  SystemRoleKey,
  { name: string; permissions: PermissionKey[] }
> = {
  [SYSTEM_ROLES.OWNER]: { name: "Owner", permissions: ALL_PERMISSIONS },
  [SYSTEM_ROLES.ADMIN]: { name: "Admin", permissions: ALL_PERMISSIONS },
  [SYSTEM_ROLES.MANAGER]: {
    name: "Manager",
    permissions: [
      PERMISSIONS.VIEW_COST_PRICE,
      PERMISSIONS.CHANGE_PRICE,
      PERMISSIONS.APPLY_DISCOUNT,
      PERMISSIONS.OVERRIDE_DISCOUNT_LIMIT,
      PERMISSIONS.CANCEL_SALE,
      PERMISSIONS.RETURN_SALE,
      PERMISSIONS.EXCHANGE_ITEM,
      PERMISSIONS.OPEN_REGISTER,
      PERMISSIONS.CLOSE_REGISTER,
      PERMISSIONS.VIEW_PROFIT,
      PERMISSIONS.MANAGE_PRODUCTS,
      PERMISSIONS.ADJUST_STOCK,
      PERMISSIONS.TRANSFER_STOCK,
      PERMISSIONS.VIEW_REPORTS,
      PERMISSIONS.MANAGE_EMPLOYEES,
      PERMISSIONS.VIEW_PERFORMANCE,
      PERMISSIONS.MANAGE_COMMISSION,
    ],
  },
  [SYSTEM_ROLES.CASHIER]: {
    name: "Cashier",
    permissions: [
      PERMISSIONS.APPLY_DISCOUNT,
      PERMISSIONS.RETURN_SALE,
      PERMISSIONS.EXCHANGE_ITEM,
      PERMISSIONS.OPEN_REGISTER,
      PERMISSIONS.CLOSE_REGISTER,
    ],
  },
  [SYSTEM_ROLES.INVENTORY_MANAGER]: {
    name: "Inventory Manager",
    permissions: [
      PERMISSIONS.VIEW_COST_PRICE,
      PERMISSIONS.MANAGE_PRODUCTS,
      PERMISSIONS.ADJUST_STOCK,
      PERMISSIONS.TRANSFER_STOCK,
      PERMISSIONS.VIEW_REPORTS,
    ],
  },
  [SYSTEM_ROLES.ACCOUNTANT]: {
    name: "Accountant",
    permissions: [
      PERMISSIONS.VIEW_COST_PRICE,
      PERMISSIONS.VIEW_PROFIT,
      PERMISSIONS.VIEW_REPORTS,
      PERMISSIONS.VIEW_PERFORMANCE,
    ],
  },
  [SYSTEM_ROLES.SALESPERSON]: {
    name: "Salesperson",
    permissions: [
      PERMISSIONS.APPLY_DISCOUNT,
      PERMISSIONS.OPEN_REGISTER,
      PERMISSIONS.CLOSE_REGISTER,
      PERMISSIONS.VIEW_PERFORMANCE,
    ],
  },
};
