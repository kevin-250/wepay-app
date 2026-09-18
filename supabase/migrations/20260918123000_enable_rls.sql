-- Policies already exist for all 8 public tables (created 2026-06-16) but RLS
-- was never switched on for 7 of them, leaving profiles, user_roles, loans,
-- documents, notifications, messages, and audit_logs fully exposed to anyone
-- holding the public anon/publishable key. Only `payments` currently has RLS on.
--
-- This just turns RLS on for the remaining tables. No new policies needed --
-- the existing ones (own-row + admin bypass via public.has_role) cover them.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
