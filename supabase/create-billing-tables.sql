-- Billing tables for invoices, payouts, and monthly statements
-- Idempotent creation (safe for multiple executions)
-- Create enum types if they don't exist (Postgres-compatible way)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'invoice_direction') then
    create type invoice_direction as enum ('to_operator', 'to_org');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'invoice_status') then
    create type invoice_status as enum ('pending', 'issued', 'paid', 'void');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'payout_status') then
    create type payout_status as enum ('pending', 'scheduled', 'paid', 'void');
  end if;
end $$;

-- Invoices table: used for both contractor->operator and operator->org invoices
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  direction invoice_direction not null,
  org_id uuid references public.organizations(id) on delete set null,
  contractor_id uuid references public.users(id) on delete set null,
  contract_id uuid references public.contracts(id) on delete set null,
  period_start date,
  period_end date,
  issue_date date default now(),
  due_date date,
  subtotal bigint not null default 0, -- base amount before adjustments
  fee_amount bigint not null default 0, -- operator fee (for org invoices)
  tax_withholding bigint not null default 0, -- withholding tax (for individuals)
  transfer_fee bigint not null default 0, -- bank transfer fee (e.g., 550)
  total_amount bigint not null default 0, -- final payable/receivable amount
  currency text not null default 'JPY',
  memo text,
  pdf_url text,
  status invoice_status not null default 'pending',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create indexes only if columns exist (for legacy safety)
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='invoices') then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='invoices' and column_name='org_id') then
      create index if not exists invoices_org_idx on public.invoices(org_id);
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='invoices' and column_name='contractor_id') then
      create index if not exists invoices_contractor_idx on public.invoices(contractor_id);
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='invoices' and column_name='contract_id') then
      create index if not exists invoices_contract_idx on public.invoices(contract_id);
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='invoices' and column_name='direction') then
      create index if not exists invoices_direction_idx on public.invoices(direction);
    end if;
  end if;
end $$;

-- Backfill/ensure columns for legacy environments
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='invoices') then
    if not exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='invoices' and column_name='org_id'
    ) then
      alter table public.invoices add column org_id uuid;
      -- add fk if missing
      if not exists (
        select 1 from pg_constraint where conname = 'invoices_org_id_fkey'
      ) then
        alter table public.invoices add constraint invoices_org_id_fkey foreign key (org_id) references public.organizations(id) on delete set null;
      end if;
    end if;

    -- add contractor_id if missing
    if not exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='invoices' and column_name='contractor_id'
    ) then
      alter table public.invoices add column contractor_id uuid;
      if not exists (
        select 1 from pg_constraint where conname = 'invoices_contractor_id_fkey'
      ) then
        alter table public.invoices add constraint invoices_contractor_id_fkey foreign key (contractor_id) references public.users(id) on delete set null;
      end if;
    end if;

    -- add contract_id if missing
    if not exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='invoices' and column_name='contract_id'
    ) then
      alter table public.invoices add column contract_id uuid;
      if not exists (
        select 1 from pg_constraint where conname = 'invoices_contract_id_fkey'
      ) then
        alter table public.invoices add constraint invoices_contract_id_fkey foreign key (contract_id) references public.contracts(id) on delete set null;
      end if;
    end if;

    -- add direction if missing
    if not exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='invoices' and column_name='direction'
    ) then
      alter table public.invoices add column direction invoice_direction;
    end if;
  end if;
end $$;

-- Payouts to contractors (monthly aggregation)
create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid references public.users(id) on delete set null,
  period_start date not null,
  period_end date not null,
  scheduled_pay_date date, -- usually end of month
  gross_amount bigint not null default 0, -- sum of contractor invoices (subtotal)
  tax_withholding bigint not null default 0,
  transfer_fee bigint not null default 0, -- typically 550 JPY
  net_amount bigint not null default 0, -- actually paid amount
  currency text not null default 'JPY',
  status payout_status not null default 'pending',
  statement_pdf_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='payouts') then
    if exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='payouts' and column_name='contractor_id'
    ) then
      create index if not exists payouts_contractor_idx on public.payouts(contractor_id);
    end if;
    if exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='payouts' and column_name='period_start'
    ) and exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='payouts' and column_name='period_end'
    ) then
      create index if not exists payouts_period_idx on public.payouts(period_start, period_end);
    end if;
  end if;
end $$;

-- Monthly billing statements to organizations (operator -> org)
create table if not exists public.monthly_statements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete set null,
  period_start date not null,
  period_end date not null,
  issue_date date default now(),
  due_date date,
  contractors_total bigint not null default 0, -- sum of contractor payouts (gross)
  operator_fee bigint not null default 0, -- 30% fee to charge org
  total_amount bigint not null default 0, -- contractors_total * 1.3
  currency text not null default 'JPY',
  pdf_url text,
  status invoice_status not null default 'pending',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='monthly_statements') then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='monthly_statements' and column_name='org_id') then
      create index if not exists statements_org_idx on public.monthly_statements(org_id);
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='monthly_statements' and column_name='period_start')
       and exists (select 1 from information_schema.columns where table_schema='public' and table_name='monthly_statements' and column_name='period_end') then
      create index if not exists statements_period_idx on public.monthly_statements(period_start, period_end);
    end if;
  end if;
end $$;

-- Ensure monthly_statements has org_id in legacy environments
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='monthly_statements') then
    if not exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='monthly_statements' and column_name='org_id'
    ) then
      alter table public.monthly_statements add column org_id uuid;
      if not exists (
        select 1 from pg_constraint where conname = 'monthly_statements_org_id_fkey'
      ) then
        alter table public.monthly_statements add constraint monthly_statements_org_id_fkey foreign key (org_id) references public.organizations(id) on delete set null;
      end if;
    end if;
  end if;
end $$;

-- Ensure payouts has contractor_id in legacy environments
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='payouts') then
    if not exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='payouts' and column_name='contractor_id'
    ) then
      alter table public.payouts add column contractor_id uuid;
      if not exists (
        select 1 from pg_constraint where conname = 'payouts_contractor_id_fkey'
      ) then
        alter table public.payouts add constraint payouts_contractor_id_fkey foreign key (contractor_id) references public.users(id) on delete set null;
      end if;
    end if;
  end if;
end $$;

-- Triggers to maintain updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_invoices_updated_at'
  ) then
    create trigger trg_invoices_updated_at
    before update on public.invoices
    for each row execute procedure public.set_updated_at();
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_payouts_updated_at'
  ) then
    create trigger trg_payouts_updated_at
    before update on public.payouts
    for each row execute procedure public.set_updated_at();
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_monthly_statements_updated_at'
  ) then
    create trigger trg_monthly_statements_updated_at
    before update on public.monthly_statements
    for each row execute procedure public.set_updated_at();
  end if;
end $$;


