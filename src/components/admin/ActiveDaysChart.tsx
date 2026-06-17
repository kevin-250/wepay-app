import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { MoreHorizontal } from "lucide-react";

interface ActiveDaysChartProps {
  loans: any[];
  isLoading: boolean;
}

export function ActiveDaysChart({ loans, isLoading }: ActiveDaysChartProps) {
  // Days of week
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Group applications by weekday
  const chartData = (() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    
    // Count days from real loans
    loans.forEach((l) => {
      if (l.created_at) {
        const dayIdx = new Date(l.created_at).getDay();
        counts[dayIdx]++;
      }
    });

    // Fallback to sample mockup data if empty
    const hasData = counts.some((c) => c > 0);
    const finalCounts = hasData 
      ? counts 
      : [1200, 3400, 8162, 4300, 3100, 5200, 2100]; // Tuesday (index 2) is active in mockup with 8,162

    return DAYS.map((name, i) => ({
      name,
      value: finalCounts[i],
    }));
  })();

  // Find max day value and index
  const maxValue = Math.max(...chartData.map((d) => d.value));
  const maxIndex = chartData.findIndex((d) => d.value === maxValue);

  // Custom label rendering for the active bar only
  const renderCustomLabel = (props: any) => {
    const { x, y, width, value, index } = props;
    if (index !== maxIndex) return null;

    return (
      <text
        x={x + width / 2}
        y={y - 8}
        fill="var(--color-foreground)"
        textAnchor="middle"
        fontSize={11}
        fontWeight="bold"
      >
        {value.toLocaleString()}
      </text>
    );
  };

  return (
    <Card className="flex flex-col gap-4 p-5 shadow-sm border border-border bg-card">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Most Day Active</h3>
          <p className="text-xs text-muted-foreground">Monitor review volume weekly</p>
        </div>
        <button className="text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div className="h-[180px] w-full">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={({ x, y, payload, index }) => {
                  const isActive = index === maxIndex;
                  return (
                    <text
                      x={x}
                      y={y + 12}
                      fill={isActive ? "var(--color-primary)" : "var(--color-muted-foreground)"}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={isActive ? "bold" : "normal"}
                    >
                      {payload.value}
                    </text>
                  );
                }}
              />
              <YAxis hide domain={[0, maxValue * 1.15]} />
              <Bar 
                dataKey="value" 
                radius={[5, 5, 0, 0]} 
                barSize={18}
              >
                {chartData.map((entry, index) => {
                  const isActive = index === maxIndex;
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={isActive ? "var(--color-primary)" : "var(--color-border)"} 
                      className={isActive ? "opacity-100" : "opacity-80"}
                    />
                  );
                })}
                <LabelList dataKey="value" content={renderCustomLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
