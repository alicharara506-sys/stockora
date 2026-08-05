"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Percent, AlertTriangle, Star, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  COUNTRY_TAX_PRESETS,
  TAX_TREATMENT_LABELS,
  TAX_SYSTEM_LABELS,
  COUNTRY_SYSTEM_LABELS,
  type TaxRuleSystem,
} from "@/lib/tax/countries";
import type { TaxTreatment } from "@/lib/tax/calculate";
import {
  updateTaxSettingsAction,
  createTaxRuleAction,
  updateTaxRuleAction,
  deleteTaxRuleAction,
  applyCountryPresetAction,
} from "@/server/actions/tax";

export interface TaxRuleRow {
  id: string;
  name: string;
  rate: number;
  system: TaxRuleSystem;
  treatment: TaxTreatment;
  isCompound: boolean;
  country: string | null;
  isDefault: boolean;
  isActive: boolean;
  usageCount: number;
}

export interface TaxSettings {
  taxEnabled: boolean;
  pricesIncludeTax: boolean;
  taxCountry: string | null;
  taxRegistrationNumber: string | null;
}

const TREATMENTS: TaxTreatment[] = ["STANDARD", "ZERO_RATED", "EXEMPT", "REVERSE_CHARGE"];
const SYSTEMS: TaxRuleSystem[] = ["VAT", "GST", "SALES_TAX", "CONSUMPTION_TAX", "CUSTOM"];

export function TaxManager({
  settings,
  rules,
}: {
  settings: TaxSettings;
  rules: TaxRuleRow[];
}) {
  const [form, setForm] = useState(settings);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function saveSettings(next: TaxSettings) {
    setError(null);
    setNotice(null);
    const previous = form;
    setForm(next);
    startTransition(async () => {
      const result = await updateTaxSettingsAction(next);
      if (!result.success) {
        setError(result.error);
        setForm(previous);
        return;
      }
      setNotice("Tax settings saved.");
    });
  }

  function applyPreset(code: string) {
    setError(null);
    setNotice(null);
    const preset = COUNTRY_TAX_PRESETS.find((p) => p.code === code);
    startTransition(async () => {
      const result = await applyCountryPresetAction(code);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setNotice(
        result.created > 0
          ? `Added a starter rule for ${preset?.name}. Confirm the rate against your tax authority before enabling tax.`
          : `A rule for ${preset?.name} already exists.`,
      );
    });
  }

  const activeRules = rules.filter((r) => r.isActive).length;

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-2.5 text-sm text-brand-danger">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-xl border border-brand-success/30 bg-brand-success/10 px-4 py-2.5 text-sm text-brand-success">
          {notice}
        </p>
      )}

      {/* --- Master switch --- */}
      <Card>
        <CardContent className="space-y-5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-display text-sm font-semibold text-brand-black">Taxation</p>
              <p className="mt-1 text-sm text-brand-muted">
                {form.taxEnabled
                  ? "Tax is being calculated on every sale."
                  : "Tax is off — no tax is added or extracted anywhere in the app."}
              </p>
            </div>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={form.taxEnabled}
                disabled={isPending}
                onChange={(e) => saveSettings({ ...form, taxEnabled: e.target.checked })}
                className="size-4 rounded border-brand-border accent-[var(--color-brand-purple,#7C3AED)]"
              />
              <span className="text-sm font-medium text-brand-black">
                {form.taxEnabled ? "Enabled" : "Disabled"}
              </span>
            </label>
          </div>

          {form.taxEnabled && activeRules === 0 && (
            <p className="flex items-start gap-2 rounded-xl border border-brand-warning/30 bg-brand-warning/10 px-4 py-2.5 text-sm text-brand-warning">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              No active tax rules — nothing will be charged. Add a rule below.
            </p>
          )}

          <div className="grid gap-4 border-t border-brand-border pt-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Are your catalog prices tax-inclusive?</Label>
              <select
                value={form.pricesIncludeTax ? "inclusive" : "exclusive"}
                disabled={isPending}
                onChange={(e) =>
                  saveSettings({ ...form, pricesIncludeTax: e.target.value === "inclusive" })
                }
                className="flex h-11 w-full rounded-xl border border-brand-border bg-brand-surface px-4 text-sm text-brand-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple-bright"
              >
                <option value="exclusive">Tax-exclusive — tax is added at checkout</option>
                <option value="inclusive">Tax-inclusive — the tag price is the final price</option>
              </select>
              <p className="text-xs text-brand-muted">
                {form.pricesIncludeTax
                  ? "A $100 tag stays $100; the tax is extracted from it."
                  : "A $100 tag rings up higher once tax is added."}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="taxReg">Tax registration number</Label>
              <Input
                id="taxReg"
                defaultValue={form.taxRegistrationNumber ?? ""}
                placeholder="Printed on invoices"
                disabled={isPending}
                onBlur={(e) => {
                  if (e.target.value !== (form.taxRegistrationNumber ?? "")) {
                    saveSettings({ ...form, taxRegistrationNumber: e.target.value });
                  }
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- Country preset --- */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="font-display text-sm font-semibold text-brand-black">Start from a country</p>
          <p className="text-sm text-brand-muted">
            Prefills a rule with that country&apos;s standard rate. These are reference figures, not
            tax advice — confirm the rate with your tax authority before charging customers.
          </p>
          <div className="flex flex-wrap gap-2">
            <select
              defaultValue=""
              disabled={isPending}
              onChange={(e) => {
                if (e.target.value) {
                  applyPreset(e.target.value);
                  e.target.value = "";
                }
              }}
              className="flex h-11 w-full max-w-sm rounded-xl border border-brand-border bg-brand-surface px-4 text-sm text-brand-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple-bright"
            >
              <option value="">Choose a country…</option>
              {COUNTRY_TAX_PRESETS.map((preset) => (
                <option key={preset.code} value={preset.code}>
                  {preset.name} — {COUNTRY_SYSTEM_LABELS[preset.system]}
                  {preset.system !== "NONE" ? ` ${preset.standardRate}%` : ""}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* --- Rules --- */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-sm font-semibold text-brand-black">Tax rules</p>
          {!adding && (
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus className="size-4" />
              Add rule
            </Button>
          )}
        </div>
        {adding && (
          <div className="mb-3">
            <AddRuleForm onClose={() => setAdding(false)} />
          </div>
        )}
        {rules.length === 0 && !adding ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
              <div className="flex size-11 items-center justify-center rounded-xl bg-brand-purple-lightest text-brand-accent">
                <Percent className="size-5" />
              </div>
              <p className="font-display text-sm font-semibold text-brand-black">No tax rules yet</p>
              <p className="max-w-sm text-sm text-brand-muted">
                Pick a country above to start from its standard rate, or add a rule manually.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {rules.map((rule) => (
              <TaxRuleCard key={rule.id} rule={rule} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const EMPTY_RULE = {
  name: "",
  rate: "",
  system: "VAT" as TaxRuleSystem,
  treatment: "STANDARD" as TaxTreatment,
  isCompound: false,
  country: "",
  isDefault: false,
  isActive: true,
};

function AddRuleForm({ onClose }: { onClose: () => void }) {
  const [draft, setDraft] = useState(EMPTY_RULE);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createTaxRuleAction({ ...draft, rate: Number(draft.rate || 0) });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setDraft(EMPTY_RULE);
      onClose();
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        {error && <p className="text-sm text-brand-danger">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-tax-name">Name</Label>
            <Input
              id="new-tax-name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. VAT 11%"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-tax-rate">Rate (%)</Label>
            <Input
              id="new-tax-rate"
              type="number"
              min={0}
              max={100}
              step="0.001"
              value={draft.rate}
              onChange={(e) => setDraft({ ...draft, rate: e.target.value })}
              placeholder="11"
            />
          </div>
          <div className="space-y-1.5">
            <Label>System</Label>
            <select
              value={draft.system}
              onChange={(e) => setDraft({ ...draft, system: e.target.value as TaxRuleSystem })}
              className="flex h-11 w-full rounded-xl border border-brand-border bg-brand-surface px-4 text-sm"
            >
              {SYSTEMS.map((s) => (
                <option key={s} value={s}>
                  {TAX_SYSTEM_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Treatment</Label>
            <select
              value={draft.treatment}
              onChange={(e) => setDraft({ ...draft, treatment: e.target.value as TaxTreatment })}
              className="flex h-11 w-full rounded-xl border border-brand-border bg-brand-surface px-4 text-sm"
            >
              {TREATMENTS.map((t) => (
                <option key={t} value={t}>
                  {TAX_TREATMENT_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <Toggle
            label="Compound (stacks on other taxes)"
            checked={draft.isCompound}
            onChange={(v) => setDraft({ ...draft, isCompound: v })}
          />
          <Toggle
            label="Use as default"
            checked={draft.isDefault}
            onChange={(v) => setDraft({ ...draft, isDefault: v })}
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={submit} disabled={isPending || !draft.name.trim()}>
            {isPending ? "Adding…" : "Add rule"}
          </Button>
          <Button size="sm" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TaxRuleCard({ rule }: { rule: TaxRuleRow }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState({
    name: rule.name,
    rate: String(rule.rate),
    system: rule.system,
    treatment: rule.treatment,
    isCompound: rule.isCompound,
    country: rule.country ?? "",
    isDefault: rule.isDefault,
    isActive: rule.isActive,
  });

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateTaxRuleAction(rule.id, { ...draft, rate: Number(draft.rate) });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setEditing(false);
    });
  }

  function remove() {
    if (!confirm(`Delete the "${rule.name}" tax rule?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTaxRuleAction(rule.id);
      if (!result.success) setError(result.error);
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-brand-purple-lightest text-brand-accent">
              <Percent className="size-4" />
            </div>
            <div>
              <p className="flex items-center gap-1.5 font-display text-sm font-semibold text-brand-black">
                {rule.name}
                {rule.isDefault && <Star className="size-3.5 fill-current text-brand-warning" />}
              </p>
              <p className="text-xs text-brand-muted">
                {rule.rate}% · {TAX_SYSTEM_LABELS[rule.system]}
                {rule.usageCount > 0 && ` · used by ${rule.usageCount}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              disabled={isPending}
              className="text-brand-muted hover:text-brand-accent disabled:opacity-50"
              aria-label={`Edit ${rule.name}`}
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={isPending}
              className="text-brand-muted hover:text-brand-danger disabled:opacity-50"
              aria-label={`Delete ${rule.name}`}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant={rule.isActive ? "success" : "outline"}>
            {rule.isActive ? "Active" : "Inactive"}
          </Badge>
          <Badge variant={rule.treatment === "STANDARD" ? "purple" : "warning"}>
            {TAX_TREATMENT_LABELS[rule.treatment]}
          </Badge>
          {rule.isCompound && <Badge variant="outline">Compound</Badge>}
          {rule.country && <Badge variant="outline">{rule.country}</Badge>}
        </div>

        {error && <p className="text-xs text-brand-danger">{error}</p>}

        {editing && (
          <div className="space-y-3 border-t border-brand-border pt-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Rate (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.001"
                  value={draft.rate}
                  onChange={(e) => setDraft({ ...draft, rate: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label>System</Label>
                <select
                  value={draft.system}
                  onChange={(e) => setDraft({ ...draft, system: e.target.value as TaxRuleSystem })}
                  className="h-9 w-full rounded-lg border border-brand-border bg-brand-surface px-2 text-sm"
                >
                  {SYSTEMS.map((s) => (
                    <option key={s} value={s}>
                      {TAX_SYSTEM_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Treatment</Label>
                <select
                  value={draft.treatment}
                  onChange={(e) => setDraft({ ...draft, treatment: e.target.value as TaxTreatment })}
                  className="h-9 w-full rounded-lg border border-brand-border bg-brand-surface px-2 text-sm"
                >
                  {TREATMENTS.map((t) => (
                    <option key={t} value={t}>
                      {TAX_TREATMENT_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <Toggle
                label="Compound"
                checked={draft.isCompound}
                onChange={(v) => setDraft({ ...draft, isCompound: v })}
              />
              <Toggle
                label="Default rule"
                checked={draft.isDefault}
                onChange={(v) => setDraft({ ...draft, isDefault: v })}
              />
              <Toggle
                label="Active"
                checked={draft.isActive}
                onChange={(v) => setDraft({ ...draft, isActive: v })}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={isPending}>
                {isPending ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={isPending}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-brand-black">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-brand-border"
      />
      {label}
    </label>
  );
}
