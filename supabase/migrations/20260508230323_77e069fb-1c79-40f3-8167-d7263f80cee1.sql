
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  email text not null default '',
  phone text,
  sms_opt_in boolean not null default false,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

-- Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, email, phone, sms_opt_in)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.email, ''),
    new.raw_user_meta_data->>'phone',
    false
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Events
create type public.event_type as enum ('birthday', 'appointment', 'trip', 'other');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  event_type public.event_type not null default 'other',
  event_date timestamptz not null,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "Users view own events" on public.events for select using (auth.uid() = user_id);
create policy "Users insert own events" on public.events for insert with check (auth.uid() = user_id);
create policy "Users update own events" on public.events for update using (auth.uid() = user_id);
create policy "Users delete own events" on public.events for delete using (auth.uid() = user_id);

create index events_user_date_idx on public.events(user_id, event_date);
