"use client";

import { useId } from "react";
import type { PermissionKey } from "@/lib/permissions/constants";

export function PermissionCheckboxGrid({
  groups,
  defaultChecked = [],
  disabled = false,
  name,
}: {
  groups: { group: string; permissions: { key: PermissionKey; label: string }[] }[];
  defaultChecked?: string[];
  disabled?: boolean;
  name: string;
}) {
  const checkedSet = new Set(defaultChecked);

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.group}>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-brand-muted">
            {group.group}
          </p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {group.permissions.map((permission) => (
              <PermissionCheckbox
                key={permission.key}
                name={name}
                value={permission.key}
                label={permission.label}
                defaultChecked={checkedSet.has(permission.key)}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PermissionCheckbox({
  name,
  value,
  label,
  defaultChecked,
  disabled,
}: {
  name: string;
  value: string;
  label: string;
  defaultChecked: boolean;
  disabled: boolean;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-2 rounded-lg border border-brand-border px-3 py-2 text-sm text-brand-black has-checked:border-brand-purple has-checked:bg-brand-purple-lightest"
    >
      <input
        id={id}
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="size-4 rounded border-brand-border text-brand-accent focus:ring-brand-purple-bright"
      />
      {label}
    </label>
  );
}
