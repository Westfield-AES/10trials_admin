import type { LucideIcon } from "lucide-react";
import { AlertCircle, CircleCheck, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { cn, formatNumber, titleCase } from "@/lib/utils";
import { requestErrorMessage } from "@/lib/user-errors";

export function Logo({ href = "/", inverse = false }: { href?: string; inverse?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-3" aria-label="10Trials admin">
      <span className={cn(
        "grid size-9 place-items-center rounded-xl text-sm font-black",
        inverse ? "bg-white text-[#032e4d]" : "bg-[#032e4d] text-white",
      )}>
        10
      </span>
      <span>
        <span className={cn(
          "block text-lg font-black tracking-[-0.04em]",
          inverse ? "text-white" : "text-[#032e4d]",
        )}>
          Trials
        </span>
        <span className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#e85b00]">
          Administration
        </span>
      </span>
    </Link>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm font-bold text-[#607282]">
      <LoaderCircle className="animate-spin text-[#e85b00]" size={20} />
      {label}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div className="page-header-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-1 break-words text-3xl font-black tracking-[-0.04em] text-[#032e4d]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#607282]">{description}</p>
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </div>
  );
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  note,
  tone = "navy",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  note?: string;
  tone?: "navy" | "orange" | "green" | "violet" | "red";
}) {
  const tones = {
    navy: "bg-[#e8f3fa] text-[#07436c]",
    orange: "bg-[#fff0e5] text-[#c94d00]",
    green: "bg-[#e9f8f0] text-[#13734d]",
    violet: "bg-[#f1eafe] text-[#6b46c1]",
    red: "bg-red-50 text-red-700",
  };
  return (
    <article className="panel p-4 sm:p-5">
      <div className={cn("grid size-9 place-items-center rounded-lg", tones[tone])}>
        <Icon size={18} />
      </div>
      <p className="mt-4 break-words text-2xl font-black tracking-[-0.03em] text-[#032e4d]">
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      <p className="mt-1 text-sm font-bold text-[#526877]">{label}</p>
      {note && <p className="mt-2 text-xs text-[#82919c]">{note}</p>}
    </article>
  );
}

export function StatusBadge({ value }: { value?: string | null }) {
  const normalized = value ?? "unknown";
  const styles =
    {
      active: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
      succeeded: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
      completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
      owner: "bg-violet-50 text-violet-700 ring-violet-600/15",
      failed: "bg-red-50 text-red-700 ring-red-600/15",
      inactive: "bg-slate-100 text-slate-600 ring-slate-500/15",
      cancelled: "bg-slate-100 text-slate-600 ring-slate-500/15",
      soft_deleted: "bg-red-50 text-red-700 ring-red-600/15",
      grace: "bg-amber-50 text-amber-700 ring-amber-600/15",
      pending: "bg-amber-50 text-amber-700 ring-amber-600/15",
      queued: "bg-blue-50 text-blue-700 ring-blue-600/15",
      running: "bg-blue-50 text-blue-700 ring-blue-600/15",
      ready: "bg-cyan-50 text-cyan-700 ring-cyan-600/15",
      pro: "bg-violet-50 text-violet-700 ring-violet-600/15",
    }[normalized] ?? "bg-slate-100 text-slate-600 ring-slate-500/15";
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ring-1 ring-inset", styles)}>
      {titleCase(normalized)}
    </span>
  );
}

export function ErrorPanel({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  return (
    <div className="panel p-8 text-center">
      <h2 className="text-lg font-black text-[#032e4d]">This view could not be loaded</h2>
      <p className="mt-2 text-sm text-[#607282]">
        {requestErrorMessage(error)}
      </p>
      {onRetry && (
        <button className="button-secondary mt-5" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function FeedbackBanner({
  message,
  tone,
}: {
  message: string;
  tone: "success" | "error";
}) {
  const Icon = tone === "success" ? CircleCheck : AlertCircle;
  return (
    <div
      className={cn(
        "mt-5 flex items-start gap-3 rounded-xl border p-4 text-sm",
        tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-red-200 bg-red-50 text-red-900",
      )}
      role={tone === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <Icon className="mt-0.5 shrink-0" size={18} />
      <p className="font-bold leading-5">{message}</p>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="p-10 text-center text-sm text-[#607282]">{message}</div>;
}

export function BarList({
  items,
  labelKey = "label",
  valueKey = "value",
}: {
  items: Array<Record<string, string | number | null | undefined>>;
  labelKey?: string;
  valueKey?: string;
}) {
  const maximum = Math.max(1, ...items.map((item) => Number(item[valueKey] ?? 0)));
  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const value = Number(item[valueKey] ?? 0);
        return (
          <div key={`${String(item[labelKey])}-${index}`}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-bold text-[#334b5c]">{titleCase(String(item[labelKey]))}</span>
              <span className="font-black text-[#032e4d]">{formatNumber(value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#edf2f5]">
              <div
                className="h-full rounded-full bg-[#ff6b00]"
                style={{ width: `${Math.max(3, (value / maximum) * 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SectionTitle({ title, note }: { title: string; note?: string }) {
  return (
    <div>
      <h2 className="text-lg font-black text-[#032e4d]">{title}</h2>
      {note && <p className="mt-1 text-sm text-[#607282]">{note}</p>}
    </div>
  );
}

export function PaginationControls({
  offset,
  limit,
  total,
  onChange,
}: {
  offset: number;
  limit: number;
  total: number;
  onChange: (next: number) => void;
}) {
  const start = total ? offset + 1 : 0;
  const end = Math.min(total, offset + limit);
  return (
    <div className="pagination-controls flex items-center justify-between border-t border-[#e2e9ed] px-4 py-4 text-sm sm:px-5">
      <p className="text-[#607282]">{start}–{end} of {formatNumber(total)}</p>
      <div className="flex gap-2">
        <button className="button-secondary" disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - limit))}>
          Previous
        </button>
        <button className="button-secondary" disabled={offset + limit >= total} onClick={() => onChange(offset + limit)}>
          Next
        </button>
      </div>
    </div>
  );
}

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="panel w-full max-w-lg p-5 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id="modal-title" className="text-xl font-black text-[#032e4d]">{title}</h2>
          <button className="button-secondary min-h-9 px-3" onClick={onClose}>Close</button>
        </div>
        <div className="mt-5">{children}</div>
      </section>
    </div>
  );
}

export function TrendChart({
  values,
  secondary,
  labels,
}: {
  values: number[];
  secondary?: number[];
  labels?: string[];
}) {
  const all = [...values, ...(secondary ?? [])];
  const maximum = Math.max(1, ...all);
  const points = (data: number[]) =>
    data
      .map((value, index) => {
        const x = data.length <= 1 ? 0 : (index / (data.length - 1)) * 100;
        const y = 94 - (value / maximum) * 84;
        return `${x},${y}`;
      })
      .join(" ");
  return (
    <div>
      <svg viewBox="0 0 100 100" className="h-44 w-full sm:h-56" preserveAspectRatio="none" role="img" aria-label="Activity trend">
        {[10, 31, 52, 73, 94].map((y) => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#e7edf0" strokeWidth="0.5" />
        ))}
        {secondary && (
          <polyline points={points(secondary)} fill="none" stroke="#9eb3c0" strokeWidth="1.7" vectorEffect="non-scaling-stroke" />
        )}
        <polyline points={points(values)} fill="none" stroke="#ff6b00" strokeWidth="2.3" vectorEffect="non-scaling-stroke" />
      </svg>
      {labels?.length ? (
        <div className="mt-1 flex justify-between text-[10px] font-bold text-[#8a9aa5]">
          <span>{labels[0]}</span><span>{labels[Math.floor(labels.length / 2)]}</span><span>{labels.at(-1)}</span>
        </div>
      ) : null}
    </div>
  );
}
