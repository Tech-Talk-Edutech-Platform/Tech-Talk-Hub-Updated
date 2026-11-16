-- =============================================================================
-- The sales and marketing team's role: `marketer` (shown as "Sales &
-- Marketing" in the admin user screens; front end: src/types/roles.ts).
--
-- After this, an admin can give someone the role under Users & Staff → Edit,
-- and when they sign in they land on /marketer, the sales dashboard. That
-- dashboard still runs on demo data: the sales tables, policies and booking
-- functions stay in supabase/drafts/sales_trial_booking.sql until signed off.
--
-- A new enum value must be committed before anything uses it, which is why it
-- ships on its own, ahead of that draft.
--
-- Apply with `npx supabase db push` (or paste into the SQL Editor), then
-- `npm run gen:types`. Safe to re-run.
-- =============================================================================

alter type public.user_role add value if not exists 'marketer';
