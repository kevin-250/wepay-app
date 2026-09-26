"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

interface HatchProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  showHatch?: boolean;
}

const HatchProgress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  HatchProgressProps
>(({ className, value, showHatch = true, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn("relative h-3 w-full overflow-hidden rounded-full bg-border", className)}
    {...props}
  >
    {/* Hatch pattern for inactive portion */}
    {showHatch && (
      <div
        className="absolute inset-0 h-full w-full"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0L6 6M6 0L0 6' stroke='%23C7CAD1' stroke-width='2'/%3E%3C/svg%3E")`,
          backgroundSize: '6px 6px',
          opacity: 0.5,
        }}
      />
    )}
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-all duration-400 ease-out relative z-10"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
HatchProgress.displayName = "HatchProgress";

export { HatchProgress };