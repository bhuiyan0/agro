"use client";

// Small shared building blocks. Touch targets are at least 48 px high.

import type { ReactNode } from "react";

export const inputClass =
  "h-14 w-full rounded-lg border-2 border-border bg-background px-4 text-xl focus:border-primary focus:outline-none";

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3 px-4 pt-5 pb-3">
      <h1 className="text-2xl font-bold">{title}</h1>
      {action}
    </header>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-semibold">{label}</span>
      {children}
    </label>
  );
}

/** A row of tappable options; one is selected at a time. */
export function Chips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-12 rounded-full border-2 px-4 font-semibold ${
            value === o.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border-2 border-danger px-4 py-3 font-semibold text-danger">
      {message}
    </p>
  );
}

export function PrimaryButton({
  children,
  disabled,
  type = "submit",
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="h-14 w-full rounded-lg bg-primary text-xl font-bold text-primary-foreground disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  danger,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-12 rounded-lg border-2 px-4 font-semibold disabled:opacity-60 ${
        danger ? "border-danger text-danger" : "border-border"
      }`}
    >
      {children}
    </button>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border-2 border-dashed border-border px-4 py-8 text-center text-muted">
      {children}
    </p>
  );
}
