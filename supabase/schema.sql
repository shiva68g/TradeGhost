-- ============================================================
--  TradeGhost — Supabase Database Schema
--  Updated: navbar parent_id nesting, footer columns/types,
--           performance indexes, media imagekit_file_id
--  Run this in the Supabase SQL editor (safe to re-run)
-- ============================================================

-- ─── Extensions ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";

-- ─── Users (mirrors auth.users for role management) ─────────
create table if not exists public.users (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'viewer' check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users: own read" on public.users
  for select using (auth.uid() = id);

-- Trigger: auto-insert a viewer row on new auth signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, role) values (new.id, 'viewer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Helper: auto-update updated_at ─────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── Posts ──────────────────────────────────────────────────
create table if not exists public.posts (
  id                uuid        primary key default uuid_generate_v4(),
  title             text        not null,
  slug              text        not null unique,
  content           text,
  excerpt           text,
  cover_image       text,
  cover_image_alt   text        not null default '',
  status            text        not null default 'draft'
                    check (status in ('draft', 'published')),
  views             bigint      not null default 0,
  meta_title        text,
  meta_description  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.posts enable row level security;
create policy "posts: public read published" on public.posts
  for select using (status = 'published');
create policy "posts: admin all" on public.posts for all
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

create index if not exists posts_status_created on public.posts (status, created_at desc);
create index if not exists posts_status_views   on public.posts (status, views desc);
create index if not exists posts_slug           on public.posts (slug);

create or replace function public.increment_post_views(post_id uuid)
returns void language sql security definer as $$
  update public.posts set views = views + 1 where id = post_id;
$$;

drop trigger if exists posts_updated_at on public.posts;
create trigger posts_updated_at before update on public.posts
  for each row execute procedure public.set_updated_at();

-- ─── Pages (CMS) ────────────────────────────────────────────
create table if not exists public.pages (
  id                uuid        primary key default uuid_generate_v4(),
  title             text        not null,
  slug              text        not null unique,
  content           text,
  status            text        not null default 'draft'
                    check (status in ('draft', 'published')),
  meta_title        text,
  meta_description  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.pages enable row level security;
create policy "pages: public read published" on public.pages
  for select using (status = 'published');
create policy "pages: admin all" on public.pages for all
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

drop trigger if exists pages_updated_at on public.pages;
create trigger pages_updated_at before update on public.pages
  for each row execute procedure public.set_updated_at();

-- ════════════════════════════════════════════════════════════
--  NAVBAR
--  • type  : link | title | dropdown | nested_dropdown
--  • parent_id : links child items to their dropdown parent
--               ON DELETE CASCADE — deleting a parent
--               automatically removes all its children
--  • Admin UI now lets you add children inline under any
--    dropdown/nested_dropdown row and set their parent_id
-- ════════════════════════════════════════════════════════════
create table if not exists public.navbar (
  id        uuid primary key default uuid_generate_v4(),
  label     text not null,
  href      text not null default '/',
  parent_id uuid references public.navbar(id) on delete cascade,
  "order"   int  not null default 0,
  type      text not null default 'link'
            check (type in ('link', 'title', 'dropdown', 'nested_dropdown'))
);

alter table public.navbar enable row level security;
create policy "navbar: public read"  on public.navbar for select using (true);
create policy "navbar: admin write"  on public.navbar for all
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

-- Indexes: child lookups are done on every navbar/admin load
create index if not exists navbar_parent_id       on public.navbar (parent_id);
create index if not exists navbar_parent_id_order on public.navbar (parent_id, "order");
create index if not exists navbar_order           on public.navbar ("order");

-- Seed defaults
insert into public.navbar (label, href, "order") values
  ('Home',    '/',        0),
  ('Posts',   '/posts',   1),
  ('Markets', '/markets', 2)
on conflict do nothing;

-- ════════════════════════════════════════════════════════════
--  FOOTER COLUMNS
--  Each column appears as a titled section in the footer grid.
--  Admin UI lets you add/rename/delete columns and drag-sort.
-- ════════════════════════════════════════════════════════════
create table if not exists public.footer_columns (
  id      uuid primary key default uuid_generate_v4(),
  title   text not null default 'Links',
  "order" int  not null default 0
);

alter table public.footer_columns enable row level security;
create policy "footer_columns: public read" on public.footer_columns for select using (true);
create policy "footer_columns: admin write" on public.footer_columns for all
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

create index if not exists footer_columns_order on public.footer_columns ("order");

-- Seed two default columns with fixed UUIDs
insert into public.footer_columns (id, title, "order") values
  ('11111111-1111-1111-1111-111111111111', 'Quick Links', 0),
  ('22222222-2222-2222-2222-222222222222', 'Legal',       1)
on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════
--  FOOTER ITEMS
--  • type     : link | title | separator
--  • column_id: which column this item belongs to
--               ON DELETE SET NULL — if column is deleted,
--               items become uncategorised (shown as fallback)
--  • Admin UI lets you add any type per column with dedicated
--    buttons (no Select-reset bug), drag-sort within column
-- ════════════════════════════════════════════════════════════
create table if not exists public.footer (
  id        uuid primary key default uuid_generate_v4(),
  label     text not null default '',
  href      text not null default '/',
  column_id uuid references public.footer_columns(id) on delete set null,
  "order"   int  not null default 0,
  type      text not null default 'link'
            check (type in ('link', 'title', 'separator'))
);

alter table public.footer enable row level security;
create policy "footer: public read"  on public.footer for select using (true);
create policy "footer: admin write"  on public.footer for all
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

-- Indexes: per-column item listing is done on every footer render
create index if not exists footer_column_id       on public.footer (column_id);
create index if not exists footer_column_id_order on public.footer (column_id, "order");

-- Seed default footer items
insert into public.footer (label, href, column_id, "order") values
  ('Home',             '/',                      '11111111-1111-1111-1111-111111111111', 0),
  ('Posts',            '/posts',                 '11111111-1111-1111-1111-111111111111', 1),
  ('Markets',          '/markets',               '11111111-1111-1111-1111-111111111111', 2),
  ('Privacy Policy',   '/page/privacy-policy',   '22222222-2222-2222-2222-222222222222', 0),
  ('Terms of Service', '/page/terms-of-service', '22222222-2222-2222-2222-222222222222', 1),
  ('Contact',          '/page/contact',          '22222222-2222-2222-2222-222222222222', 2)
on conflict do nothing;

-- ─── Media ──────────────────────────────────────────────────
create table if not exists public.media (
  id                uuid        primary key default uuid_generate_v4(),
  url               text        not null,
  imagekit_file_id  text,       -- stored at upload; used for reliable ImageKit deletion
  alt_text          text        not null,
  created_at        timestamptz not null default now()
);

alter table public.media enable row level security;
create policy "media: admin read" on public.media for select
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
create policy "media: admin write" on public.media for all
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

create index if not exists media_created_at on public.media (created_at desc);

-- ─── Settings ────────────────────────────────────────────────
create table if not exists public.settings (
  key        text        primary key,
  value      text        not null default '',
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;
create policy "settings: public read"  on public.settings for select using (true);
create policy "settings: admin write"  on public.settings for all
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

insert into public.settings (key, value) values
  ('site_name',                'TradeGhost'),
  ('site_description',         'Live market data, news and trading analysis'),
  ('logo_url',                 ''),
  ('favicon_url',              ''),
  ('default_meta_title',       'TradeGhost — Live Market Data & News'),
  ('default_meta_description', 'Track NIFTY 50, global indices, crypto and forex in real time'),
  ('default_og_image',         ''),
  ('robots_txt',               E'User-agent: *\nAllow: /'),
  ('market_india_more_url',    ''),
  ('market_global_more_url',   ''),
  ('market_gainers_more_url',  ''),
  ('market_losers_more_url',   '')
on conflict (key) do nothing;

-- ─── Market Data ─────────────────────────────────────────────
create table if not exists public.market_data (
  id         text        primary key,
  data       jsonb       not null default '{}',
  source     text,
  updated_at timestamptz not null default now()
);

alter table public.market_data enable row level security;
create policy "market_data: public read"   on public.market_data for select using (true);
create policy "market_data: service write" on public.market_data for all
  using (auth.role() = 'service_role');

insert into public.market_data (id, data) values
  ('crypto',         '[]'),
  ('forex',          '{}'),
  ('indices_india',  '[]'),
  ('indices_global', '[]'),
  ('gainers',        '[]'),
  ('losers',         '[]')
on conflict (id) do nothing;

alter publication supabase_realtime add table public.market_data;

-- ─── Logs ────────────────────────────────────────────────────
create table if not exists public.logs (
  id         uuid        primary key default uuid_generate_v4(),
  level      text        not null default 'info'
             check (level in ('info', 'warn', 'error')),
  message    text        not null,
  context    jsonb,
  created_at timestamptz not null default now()
);

alter table public.logs enable row level security;
create policy "logs: admin all"      on public.logs for all
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
create policy "logs: service insert" on public.logs for insert
  with check (auth.role() = 'service_role');

create index if not exists logs_created_at on public.logs (created_at desc);

select cron.schedule(
  'prune-old-logs',
  '0 0 * * *',
  $$delete from public.logs where created_at < now() - interval '7 days'$$
);

-- ─── Edge Function cron schedules ────────────────────────────────────────────
-- Replace <project-ref> with your Supabase project ref (e.g. prozmrjaqjskpadokves)
-- Replace <cron-secret> with the value of your CRON_SECRET env var
--
-- market-cron-fast: every 1 minute — crypto + forex (Yahoo primary, fallback chain)
select cron.schedule(
  'market-cron-fast',
  '* * * * *',
  $$select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/market-cron-fast',
    headers := '{"Authorization": "Bearer <cron-secret>", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  )$$
);

-- market-cron-slow: every 5 minutes — Indian indices, global indices, gainers, losers
select cron.schedule(
  'market-cron-slow',
  '*/5 * * * *',
  $$select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/market-cron-slow',
    headers := '{"Authorization": "Bearer <cron-secret>", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  )$$
);

-- To update schedules (run in Supabase SQL editor):
-- select cron.unschedule('market-cron-fast');
-- select cron.unschedule('market-cron-slow');
-- then re-run the selects above

-- ============================================================
--  MIGRATION — run ONLY on an existing database
--  (skip everything below if running the full schema fresh)
-- ============================================================

-- 1. navbar: add type column if missing
-- alter table public.navbar
--   add column if not exists type text not null default 'link'
--   check (type in ('link', 'title', 'dropdown', 'nested_dropdown'));

-- 2. navbar: add parent_id self-reference if missing
-- alter table public.navbar
--   add column if not exists parent_id uuid references public.navbar(id) on delete cascade;

-- 3. navbar: performance indexes
-- create index if not exists navbar_parent_id       on public.navbar (parent_id);
-- create index if not exists navbar_parent_id_order on public.navbar (parent_id, "order");
-- create index if not exists navbar_order           on public.navbar ("order");

-- 4. footer_columns: create table if it didn't exist
-- create table if not exists public.footer_columns (
--   id      uuid primary key default uuid_generate_v4(),
--   title   text not null default 'Links',
--   "order" int  not null default 0
-- );
-- alter table public.footer_columns enable row level security;
-- create policy "footer_columns: public read" on public.footer_columns for select using (true);
-- create policy "footer_columns: admin write" on public.footer_columns for all
--   using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

-- 5. footer: add column_id if using old flat schema
-- alter table public.footer
--   add column if not exists column_id uuid references public.footer_columns(id) on delete set null;

-- 6. footer: add type column if missing
-- alter table public.footer
--   add column if not exists type text not null default 'link'
--   check (type in ('link', 'title', 'separator'));

-- 7. footer: performance indexes
-- create index if not exists footer_column_id       on public.footer (column_id);
-- create index if not exists footer_column_id_order on public.footer (column_id, "order");

-- 8. media: add imagekit_file_id for reliable deletion
-- alter table public.media
--   add column if not exists imagekit_file_id text;
