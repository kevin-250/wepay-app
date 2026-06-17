import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { STATUS_VARIANT, type LoanStatus } from "@/lib/loan";

export function StatusBadge({ status, className }: { status: LoanStatus; className?: string }) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        STATUS_VARIANT[status],
        className,
      )}
    >
      {t(`status.${status}`)}
    </span>
  );
}
