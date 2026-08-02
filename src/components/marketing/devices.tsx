import { Globe, Smartphone, Tablet, Monitor } from "lucide-react";
import { Container } from "@/components/ui/container";

const DEVICES = [
  { icon: Globe, label: "Web App" },
  { icon: Smartphone, label: "Mobile (Android & iOS)" },
  { icon: Tablet, label: "Tablet POS" },
  { icon: Monitor, label: "Desktop Dashboard" },
];

export function Devices() {
  return (
    <section className="py-20">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-brand-black">Works on all devices</h2>
          <p className="mt-4 text-brand-muted">
            One account, every screen — from the register on the counter to reports on your
            phone.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {DEVICES.map((device) => (
            <div
              key={device.label}
              className="flex flex-col items-center gap-3 rounded-2xl border border-brand-border bg-white p-6 text-center shadow-card"
            >
              <device.icon className="size-6 text-brand-purple" />
              <span className="text-sm font-medium text-brand-black">{device.label}</span>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
