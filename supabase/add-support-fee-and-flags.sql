-- Support feature: global settings and flags on projects/contracts

-- 1) Global system settings table
create table if not exists public.system_settings (
  id text primary key default 'global',
  support_fee_percent integer not null default 8,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Ensure a single global row exists
insert into public.system_settings (id)
  values ('global')
  on conflict (id) do nothing;

-- 2) Project-level flag: enabled by OrgAdmin at project creation
alter table if exists public.projects
  add column if not exists support_enabled boolean default false;

-- 3) Contract-level flag: enabled by Contractor after award
alter table if exists public.contracts
  add column if not exists support_enabled boolean default false;

-- 4) Trigger to update updated_at on system_settings
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_system_settings_set_updated on public.system_settings;
create trigger trg_system_settings_set_updated
before update on public.system_settings
for each row execute function public.set_updated_at();












