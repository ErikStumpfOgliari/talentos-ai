-- Aptelys Supabase hardening.
--
-- The app uses Prisma from the server with DATABASE_URL/DIRECT_URL. Browser code
-- must not connect directly to Supabase tables. RLS is enabled here as a
-- defense-in-depth layer for Supabase Data API exposure on the public schema.
--
-- No anon/authenticated policies are added on purpose: direct Supabase Data API
-- access should deny all rows unless a future client-side Supabase feature adds
-- explicit, tenant-scoped policies.

begin;

do $$
declare
  app_table record;
begin
  for app_table in
    select schemaname, tablename
      from pg_tables
     where schemaname = 'public'
     order by tablename
  loop
    execute format('alter table %I.%I enable row level security', app_table.schemaname, app_table.tablename);
  end loop;
end $$;

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
revoke all on all sequences in schema public from anon;
revoke all on all sequences in schema public from authenticated;

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on tables from authenticated;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on sequences from authenticated;

commit;
