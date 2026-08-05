"use client";

import { useState, useTransition } from "react";
import { updateMemberRoleAction } from "@/server/actions/employees";

export function MemberRoleSelect({
  membershipId,
  roleId,
  roles,
  disabled,
}: {
  membershipId: string;
  roleId: string;
  roles: { id: string; name: string }[];
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState(roleId);

  function onChange(nextRoleId: string) {
    setError(null);
    const previous = value;
    setValue(nextRoleId);
    startTransition(async () => {
      const result = await updateMemberRoleAction(membershipId, nextRoleId);
      if (!result.success) {
        setValue(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        value={value}
        disabled={disabled || isPending}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border border-brand-border bg-brand-surface px-2.5 text-sm text-brand-black disabled:opacity-50"
      >
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </select>
      {error && <span className="max-w-[200px] text-right text-[11px] text-brand-danger">{error}</span>}
    </div>
  );
}
