"use client";

import { AlertCircle, CheckCircle2, Info, Loader2, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

const toneStyles = {
  error: {
    shell: "border-red-100 bg-red-50/80",
    icon: "text-red-500",
    title: "text-red-900",
    body: "text-red-700",
  },
  warning: {
    shell: "border-amber-100 bg-amber-50/80",
    icon: "text-amber-500",
    title: "text-amber-900",
    body: "text-amber-700",
  },
  info: {
    shell: "border-slate-200 bg-slate-50/90",
    icon: "text-slate-500",
    title: "text-slate-900",
    body: "text-slate-600",
  },
} as const;

export function LoadingButton({
  children,
  loading = false,
  loadingLabel = "Working...",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingLabel?: string;
}) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      aria-busy={loading}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {loading ? loadingLabel : children}
    </button>
  );
}

export function RetryButton({
  onRetry,
  label = "Try again",
  compact = false,
}: {
  onRetry: () => void;
  label?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onRetry}
      className={`${compact ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-xs"} inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2`}
    >
      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}

export function FeedbackState({
  title,
  message,
  onRetry,
  tone = "error",
  action,
}: {
  title: string;
  message?: string;
  onRetry?: () => void;
  tone?: keyof typeof toneStyles;
  action?: ReactNode;
}) {
  const styles = toneStyles[tone];
  const Icon = tone === "error" ? AlertCircle : tone === "warning" ? Info : Info;
  return (
    <div className={`rounded-xl border px-5 py-8 text-center ${styles.shell}`} role={tone === "error" ? "alert" : "status"}>
      <Icon className={`mx-auto h-6 w-6 ${styles.icon}`} aria-hidden="true" />
      <p className={`mt-3 text-sm font-semibold ${styles.title}`}>{title}</p>
      {message && <p className={`mx-auto mt-1 max-w-md text-xs leading-relaxed ${styles.body}`}>{message}</p>}
      {(onRetry || action) && <div className="mt-4 flex justify-center gap-2">{action}{onRetry && <RetryButton onRetry={onRetry} />}</div>}
    </div>
  );
}

export function EmptyState({ title, message, icon }: { title: string; message?: string; icon?: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-5 py-10 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
        {icon ?? <CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-900">{title}</p>
      {message && <p className="mt-1 text-xs leading-relaxed text-slate-400">{message}</p>}
    </div>
  );
}
