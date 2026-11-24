"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/types";

/**
 * One button that runs a Server Action, shows a pending label, and shows the
 * action's error or success message underneath.
 */
export function ActionButton({
  action,
  label,
  pendingLabel,
  className,
  confirmText,
  disabled = false,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  label: string;
  pendingLabel: string;
  className: string;
  /** Ask "are you sure?" first. */
  confirmText?: string;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <button
        type="submit"
        disabled={pending || disabled}
        className={className}
        onClick={(event) => {
          if (confirmText && !window.confirm(confirmText)) event.preventDefault();
        }}
      >
        {pending ? pendingLabel : label}
      </button>
      {state.error && (
        <p role="alert" className="max-w-xs text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
          {state.ok}
        </p>
      )}
    </form>
  );
}
