import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { session, loading, homeTo } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    navigate({ to: session ? homeTo : "/auth", replace: true });
  }, [session, loading, homeTo, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="animate-pulse">
        <Logo />
      </div>
    </div>
  );
}
