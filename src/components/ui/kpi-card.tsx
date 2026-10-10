import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import { TrendingUp, Target, AlertCircle } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: number | string;
  target?: number;
  gap?: number;
  achievementPercentage?: number;
  subtitle?: string;
  currency?: string;
  type?: "currency" | "percent" | "number";
  highlightColor?: "primary" | "positive" | "negative" | "warning";
}

export function KpiCard({
  title,
  value,
  target,
  gap,
  achievementPercentage,
  subtitle,
  currency = "NGN",
  type = "currency",
  highlightColor = "primary",
}: KpiCardProps) {
  const formattedValue =
    type === "currency"
      ? formatCurrency(value, currency)
      : type === "percent"
      ? formatPercent(Number(value))
      : String(value);

  const formattedTarget = target !== undefined ? formatCurrency(target, currency, true) : null;
  const formattedGap = gap !== undefined ? formatCurrency(gap, currency, true) : null;

  return (
    <div className="bg-white border border-[#E4E7EC] rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-[#CF2E2E]/30 transition-all">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">{title}</span>
          {highlightColor === "primary" && <TrendingUp className="w-4 h-4 text-[#CF2E2E]" />}
          {highlightColor === "positive" && <Target className="w-4 h-4 text-[#16794A]" />}
          {highlightColor === "warning" && <AlertCircle className="w-4 h-4 text-[#A96514]" />}
        </div>

        <div className="text-2xl font-extrabold text-[#24252B] tracking-tight tabular-nums my-1">
          {formattedValue}
        </div>

        {subtitle && <p className="text-xs text-[#667085] mt-1">{subtitle}</p>}
      </div>

      {(target !== undefined || achievementPercentage !== undefined) && (
        <div className="mt-4 pt-3 border-t border-[#E4E7EC] space-y-2">
          {achievementPercentage !== undefined && (
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-[#667085]">Target Achievement</span>
                <span className={cn(achievementPercentage >= 100 ? "text-[#16794A]" : "text-[#CF2E2E]")}>
                  {formatPercent(achievementPercentage)}
                </span>
              </div>
              <div className="w-full h-2 bg-[#F8F9FA] border border-[#E4E7EC] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#CF2E2E] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(achievementPercentage, 100)}%` }}
                />
              </div>
            </div>
          )}

          {target !== undefined && (
            <div className="flex items-center justify-between text-[11px] text-[#667085]">
              <span>Target: <strong className="text-[#24252B]">{formattedTarget}</strong></span>
              {gap !== undefined && (
                <span>Gap: <strong className="text-[#CF2E2E]">{formattedGap}</strong></span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
