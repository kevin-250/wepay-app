import { useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatRWF, formatDate } from "@/lib/loan";
import { StatusBadge } from "@/components/StatusBadge";
import { Star, MoreHorizontal, User } from "lucide-react";

interface RecentApplicationsTableProps {
  loans: any[];
  isLoading: boolean;
}

export function RecentApplicationsTable({ loans, isLoading }: RecentApplicationsTableProps) {
  const navigate = useNavigate();

  // Take the 5 most recent applications
  const recentLoans = loans.slice(0, 5);

  // If there are no loans in the DB, generate realistic sample records for display
  const finalLoans = recentLoans.length > 0 
    ? recentLoans 
    : [
        { id: "1", application_ref: "WE-83009", full_name: "Casio G-Shock Shock Resist", outstanding_balance: 92662, status: "submitted", created_at: new Date().toISOString() },
        { id: "2", application_ref: "WE-83001", full_name: "Hybrid Active Noise Cancelling", outstanding_balance: 124839, status: "approved", created_at: new Date().toISOString() },
        { id: "3", application_ref: "WE-83004", full_name: "SAMSUNG Galaxy S25 Ultra", outstanding_balance: 74048, status: "fee_paid", created_at: new Date().toISOString() },
        { id: "4", application_ref: "WE-83002", full_name: "Xbox Wireless Gaming Controller", outstanding_balance: 62820, status: "in_progress", created_at: new Date().toISOString() },
        { id: "5", application_ref: "WE-83007", full_name: "Timex Men's Easy Reader Watch", outstanding_balance: 48724, status: "completed", created_at: new Date().toISOString() },
      ];

  // Helper to generate a mockup score (e.g. 5.0, 4.8) based on references or amounts
  const getRating = (ref: string) => {
    if (ref.endsWith("9")) return { val: "5.0", stars: 5 };
    if (ref.endsWith("1")) return { val: "4.8", stars: 5 };
    if (ref.endsWith("4")) return { val: "4.7", stars: 5 };
    if (ref.endsWith("2")) return { val: "4.5", stars: 4 };
    return { val: "4.0", stars: 4 };
  };

  return (
    <Card className="flex flex-col gap-4 p-5 shadow-sm border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Best Selling Products</h3>
          <p className="text-xs text-muted-foreground">Recent loan refinancing applications</p>
        </div>
        <button className="text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 font-semibold">ID</th>
                <th className="pb-3 font-semibold">Applicant</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Amount</th>
                <th className="pb-3 font-semibold">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {finalLoans.map((l) => {
                const rating = getRating(l.application_ref);
                const firstChar = l.full_name ? l.full_name.charAt(0).toUpperCase() : "U";
                
                return (
                  <tr 
                    key={l.id} 
                    onClick={() => navigate({ to: "/admin/applications" })}
                    className="group cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <td className="py-3.5 text-xs font-mono font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                      #{l.application_ref.replace("WE-", "")}
                    </td>
                    <td className="py-3.5 text-xs font-medium text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary border border-primary/20 shrink-0">
                          {firstChar}
                        </div>
                        <span className="truncate max-w-[150px]">{l.full_name || "Anonymous Applicant"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-xs">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="py-3.5 text-xs font-bold text-foreground">
                      {formatRWF(l.outstanding_balance)}
                    </td>
                    <td className="py-3.5 text-xs">
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 stroke-amber-400" />
                        <span className="font-semibold text-foreground">{rating.val}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate({ to: "/admin/applications" })}
          className="text-xs font-semibold rounded-xl"
        >
          View All Applications
        </Button>
      </div>
    </Card>
  );
}
