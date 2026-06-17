import { cn } from "@/lib/utils";

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full font-extrabold tracking-tight",
          light ? "bg-white text-primary" : "bg-primary text-primary-foreground",
        )}
      >
        WP
      </div>
      <div className="leading-tight">
        <div className={cn("text-lg font-bold", light ? "text-white" : "text-foreground")}>WePay</div>
        <div className={cn("text-[11px]", light ? "text-white/80" : "text-muted-foreground")}>
          Debt Refinancing
        </div>
      </div>
    </div>
  );
}
