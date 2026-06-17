import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = { label: string };

export function Timeline({
  steps,
  current,
  orientation = "horizontal",
  rejected = false,
}: {
  steps: Step[];
  current: number; // index of current/active step (0-based). Steps < current are complete.
  orientation?: "horizontal" | "vertical";
  rejected?: boolean;
}) {
  if (orientation === "vertical") {
    return (
      <ol className="relative space-y-6">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold",
                    done && "border-success bg-success text-success-foreground",
                    active && !rejected && "border-primary bg-primary text-primary-foreground",
                    active && rejected && "border-destructive bg-destructive text-destructive-foreground",
                    !done && !active && "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                {i < steps.length - 1 && (
                  <span className={cn("mt-1 h-8 w-0.5", done ? "bg-success" : "bg-border")} />
                )}
              </div>
              <div className="pt-1">
                <p className={cn("text-sm font-medium", active ? "text-foreground" : "text-muted-foreground")}>
                  {s.label}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <div className="flex items-center">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {i > 0 && <div className={cn("h-0.5 flex-1", i <= current ? "bg-success" : "bg-border")} />}
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold",
                  done && "border-success bg-success text-success-foreground",
                  active && "border-primary bg-primary text-primary-foreground",
                  !done && !active && "border-border bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              {i < steps.length - 1 && <div className={cn("h-0.5 flex-1", i < current ? "bg-success" : "bg-border")} />}
            </div>
            <span
              className={cn(
                "mt-2 text-center text-[11px] leading-tight",
                active ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
