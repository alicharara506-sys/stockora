"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface CapturedCustomer {
  name: string;
  phone: string;
  email: string;
  whatsapp: string;
  company: string;
  notes: string;
  marketingConsent: boolean;
}

export const EMPTY_CAPTURED_CUSTOMER: CapturedCustomer = {
  name: "",
  phone: "",
  email: "",
  whatsapp: "",
  company: "",
  notes: "",
  marketingConsent: false,
};

/** Fields the business has made mandatory, beyond the always-required name. */
export interface CaptureRequirements {
  phone: boolean;
  email: boolean;
}

export function isCaptureComplete(
  value: CapturedCustomer,
  requirements: CaptureRequirements,
): boolean {
  if (value.name.trim().length < 2) return false;
  if (requirements.phone && !value.phone.trim()) return false;
  if (requirements.email && !value.email.trim()) return false;
  return true;
}

export function CustomerCaptureForm({
  value,
  onChange,
  requirements,
}: {
  value: CapturedCustomer;
  onChange: (value: CapturedCustomer) => void;
  requirements: CaptureRequirements;
}) {
  function set<K extends keyof CapturedCustomer>(key: K, next: CapturedCustomer[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="cap-name">
          Customer name <span className="text-brand-danger">*</span>
        </Label>
        <Input
          id="cap-name"
          value={value.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Full name"
          autoFocus
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cap-phone">
            Phone {requirements.phone && <span className="text-brand-danger">*</span>}
          </Label>
          <Input
            id="cap-phone"
            type="tel"
            inputMode="tel"
            value={value.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="03 123 456"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cap-whatsapp">WhatsApp</Label>
          <Input
            id="cap-whatsapp"
            type="tel"
            inputMode="tel"
            value={value.whatsapp}
            onChange={(e) => set("whatsapp", e.target.value)}
            placeholder="Same as phone if blank"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cap-email">
          Email {requirements.email && <span className="text-brand-danger">*</span>}
        </Label>
        <Input
          id="cap-email"
          type="email"
          value={value.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="Optional"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cap-company">Company</Label>
        <Input
          id="cap-company"
          value={value.company}
          onChange={(e) => set("company", e.target.value)}
          placeholder="Optional"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cap-notes">Notes</Label>
        <textarea
          id="cap-notes"
          value={value.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-brand-border px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple-bright"
          placeholder="Optional"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-2 text-sm text-brand-black">
        <input
          type="checkbox"
          checked={value.marketingConsent}
          onChange={(e) => set("marketingConsent", e.target.checked)}
          className="mt-0.5 size-4 rounded border-brand-border"
        />
        <span>
          Customer agrees to receive offers and updates
          <span className="block text-xs text-brand-muted">
            Leave unchecked unless they have actually agreed.
          </span>
        </span>
      </label>
    </div>
  );
}
