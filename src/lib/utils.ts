import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency with Naira symbol (₦) or ISO standard
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = "NGN",
  compact: boolean = false
): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return "—";
  }

  const num = Number(amount);
  const formatter = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: compact ? 0 : 2,
    maximumFractionDigits: compact ? 1 : 2,
    notation: compact ? "compact" : "standard",
  });

  return formatter.format(num);
}

/**
 * Format percentage values with explicit sign option
 */
export function formatPercent(
  value: number | null | undefined,
  includeSign: boolean = false
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }

  const sign = includeSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * Format date nicely for financial reporting
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}
