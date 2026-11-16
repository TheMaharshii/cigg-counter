-- DESTRUCTIVE: this removes all existing Tapri application data and tables.
-- It does not remove Supabase Auth users or alter auth.users.

begin;

drop table if exists public.session_drafts cascade;
drop table if exists public.session_items cascade;
drop table if exists public.sessions cascade;
drop table if exists public.items cascade;
drop table if exists public.people cascade;
drop table if exists public.group_memberships cascade;
drop table if exists public.groups cascade;

create table public.people (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null check (char_length(btrim(name)) between 1 and 80),
    created_at timestamptz not null default now(),
    unique (id, user_id)
);

create unique index people_user_name_lower_uidx
    on public.people (user_id, lower(name));

create table public.items (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null check (char_length(btrim(name)) between 1 and 80),
    category text not null check (category in ('cigarette', 'chai', 'food', 'other')),
    price numeric(12, 2) not null check (price >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (id, user_id)
);

create unique index items_user_name_lower_uidx
    on public.items (user_id, lower(name));

create table public.sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null default 'Tapri session' check (char_length(btrim(name)) between 1 and 80),
    session_date timestamptz not null default now(),
    total_items integer not null default 0 check (total_items >= 0),
    total_cost numeric(14, 2) not null default 0 check (total_cost >= 0),
    created_at timestamptz not null default now(),
    unique (id, user_id)
);

create table public.session_items (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    session_id uuid not null,
    item_id uuid,
    person_id uuid,
    item_name text not null check (char_length(btrim(item_name)) between 1 and 80),
    person_name text not null check (char_length(btrim(person_name)) between 1 and 80),
    price numeric(12, 2) not null check (price >= 0),
    quantity integer not null check (quantity > 0),
    total numeric(14, 2) generated always as (price * quantity) stored,
    created_at timestamptz not null default now(),
    foreign key (session_id, user_id)
        references public.sessions(id, user_id) on delete cascade,
    foreign key (item_id, user_id)
        references public.items(id, user_id) on delete set null (item_id),
    foreign key (person_id, user_id)
        references public.people(id, user_id) on delete set null (person_id)
);

create table public.session_drafts (
    user_id uuid primary key references auth.users(id) on delete cascade,
    session_name text not null default '' check (char_length(session_name) <= 80),
    entries jsonb not null default '{}'::jsonb check (jsonb_typeof(entries) = 'object'),
    updated_at timestamptz not null default now()
);

create index people_user_id_idx on public.people (user_id);
create index items_user_id_idx on public.items (user_id);
create index sessions_user_date_idx on public.sessions (user_id, session_date desc);
create index session_items_user_session_idx on public.session_items (user_id, session_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = pg_catalog.now();
    return new;
end;
$$;

create trigger items_set_updated_at
before update on public.items
for each row execute function public.set_updated_at();

create trigger session_drafts_set_updated_at
before update on public.session_drafts
for each row execute function public.set_updated_at();

alter table public.people enable row level security;
alter table public.items enable row level security;
alter table public.sessions enable row level security;
alter table public.session_items enable row level security;
alter table public.session_drafts enable row level security;

create policy "Users manage their own people"
on public.people for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users manage their own items"
on public.items for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users manage their own sessions"
on public.sessions for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users manage their own session items"
on public.session_items for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users manage their own draft"
on public.session_drafts for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

revoke all on public.people, public.items, public.sessions,
    public.session_items, public.session_drafts from anon, public;
grant select, insert, update, delete on public.people, public.items,
    public.sessions, public.session_items, public.session_drafts to authenticated;

alter publication supabase_realtime add table public.people;
alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.session_items;
alter publication supabase_realtime add table public.session_drafts;

notify pgrst, 'reload schema';

commit;