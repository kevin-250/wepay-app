import { Card } from "@/components/ui/card";
import { MoreHorizontal } from "lucide-react";

interface ApprovalRateGaugeProps {
  loans: any[];
  isLoading: boolean;
}

export function ApprovalRateGauge({ loans, isLoading }: ApprovalRateGaugeProps) {
  // Calculate approval rate
  const approvalRate = (() => {
    if (loans.length === 0) return 68; // Mockup default
    const approved = loans.filter((l) => ["approved", "fee_paid", "in_progress", "completed"].includes(l.status)).length;
    const total = loans.length;
    return Math.round((approved / total) * 100);
  })();

  // Semicircle parameters
  const radius = 75;
  const strokeWidth = 10;
  const pathLength = Math.PI * radius; // Approx 235.6

  // SVG Semicircle path (starting from left, curving up, ending on right)
  const pathData = `M 20,95 A ${radius},${radius} 0 0,1 170,95`;

  return (
    <Card className="flex flex-col gap-4 p-5 shadow-sm border border-border bg-card">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Repeat Customer Rate</h3>
          <p className="text-xs text-muted-foreground">Platform approval success rate</p>
        </div>
        <button className="text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div className="relative flex flex-col items-center justify-center py-2">
        {isLoading ? (
          <div className="h-[120px] flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            {/* SVG Semicircular Gauge */}
            <svg viewBox="0 0 190 110" className="w-[190px] h-[110px]">
              <defs>
                {/* Gradient for progress */}
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>

                {/* Clip path to reveal only the percentage portion */}
                <clipPath id="gaugeClip">
                  <path
                    d={pathData}
                    fill="none"
                    stroke="black"
                    strokeWidth={strokeWidth + 2}
                    strokeLinecap="round"
                    strokeDasharray={pathLength}
                    strokeDashoffset={pathLength - (pathLength * approvalRate) / 100}
                  />
                </clipPath>
              </defs>

              {/* Background Arc (dashed grey) */}
              <path
                d={pathData}
                fill="none"
                stroke="var(--color-border)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray="4 3"
              />

              {/* Colored Progress Arc (dashed, clipped to percentage) */}
              <path
                d={pathData}
                fill="none"
                stroke="url(#gaugeGradient)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray="4 3"
                clipPath="url(#gaugeClip)"
              />
            </svg>

            {/* Gauge center labels */}
            <div className="absolute top-[50%] flex flex-col items-center text-center">
              <span className="text-3xl font-extrabold text-foreground tracking-tight">{approvalRate}%</span>
              <span className="text-[10px] font-semibold text-emerald-600 mt-0.5">On track for 80% target</span>
            </div>
          </>
        )}
      </div>

      <button className="w-full rounded-xl border border-border bg-card py-2 text-xs font-semibold text-foreground transition-all hover:bg-muted/50">
        Show details
      </button>
    </Card>
  );
}
