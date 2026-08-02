import {
  ShoppingCart,
  Boxes,
  Building2,
  Shirt,
  Undo2,
  Users,
  BarChart3,
  Wallet,
  Truck,
  UserCog,
  ShieldCheck,
  Globe,
  Bot,
  QrCode,
} from "lucide-react";
import { Container } from "@/components/ui/container";

const FEATURES = [
  { icon: ShoppingCart, title: "Point of Sale (POS)", body: "Fast & intuitive sales with barcode scanning, discounts, and multiple payment methods." },
  { icon: Boxes, title: "Inventory Management", body: "Real-time stock tracking, stock alerts, transfers, and adjustments." },
  { icon: Building2, title: "Multi-Branch", body: "Manage multiple branches and warehouses from one central account." },
  { icon: Shirt, title: "Products & Variants", body: "Manage sizes, colors, and variants easily — perfect for apparel and footwear." },
  { icon: Undo2, title: "Returns & Exchanges", body: "Hassle-free returns and exchanges with full refund or store-credit options." },
  { icon: Users, title: "Customers (CRM)", body: "Track customers, loyalty points, purchase history, and outstanding balances." },
  { icon: BarChart3, title: "Reports & Analytics", body: "Powerful reports and dashboards to make smarter business decisions." },
  { icon: Wallet, title: "Expenses Management", body: "Track all your expenses and understand your profitability in real time." },
  { icon: Truck, title: "Suppliers & Purchases", body: "Manage suppliers, purchase orders, and goods received easily." },
  { icon: UserCog, title: "Employee Management", body: "Roles, permissions, shifts, and performance tracking." },
  { icon: ShieldCheck, title: "Cloud Backup & Security", body: "Automatic backups, data encryption, and 24/7 enterprise-grade security." },
  { icon: Globe, title: "E-Commerce Ready", body: "Integrate with your online store and sell seamlessly across channels." },
  { icon: Bot, title: "AI Chatbot Assistant", body: "Ask anything about your business and get instant, data-backed answers." },
  { icon: QrCode, title: "QR Code Management", body: "Payment, product, receipt, loyalty, and store QR codes — all in one place." },
];

export function CoreFeatures() {
  return (
    <section id="features" className="bg-brand-purple-lightest/40 py-20">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-brand-black">Core Features</h2>
          <p className="mt-4 text-brand-muted">
            Everything a modern retail business needs, in one connected platform.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-brand-border bg-white p-5 shadow-card transition-shadow hover:shadow-card-lg"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand-purple-lightest text-brand-purple">
                <feature.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-display text-sm font-semibold text-brand-black">
                {feature.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-brand-muted">{feature.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
