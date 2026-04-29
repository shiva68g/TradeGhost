# TradeGhost

A production Next.js 14 web app with live market data (stocks, crypto, forex), a full blog CMS, and a protected admin panel.

## Tech Stack

- **Framework:** Next.js 14 (App Router, ISR, Server Components)
- **Database & Auth:** Supabase (PostgreSQL + Row Level Security + Realtime)
- **Realtime:** Supabase Realtime channels + TanStack Query 30s polling
- **Media CDN:** ImageKit
- **UI:** shadcn/ui + Tailwind CSS + Radix UI
- **Charts:** Recharts (dynamic import, no SSR)
- **Editor:** TipTap (dynamic import, no SSR)
- **Forms:** React Hook Form + Zod
- **State:** Zustand (sidebar) + TanStack Query (server state)
- **Market Data:**
  - 🇮🇳 NIFTY 50 stocks + indices → Yahoo Finance (Edge Function, 15 min delay)
  - 🌍 Global indices (S&P 500, NASDAQ, FTSE, DAX, Nikkei) → Yahoo Finance (15 min)
  - 💎 Top 20 Crypto → CoinGecko free API (live)
  - 💱 Forex rates → open.er-api.com free API (live)
- **Deployment:** Netlify (zero cost)

---

## Project Structure

```
tradeghost/
├── app/
│   ├── (auth)/login/           # Admin login page
│   ├── (public)/               # Public layout (Navbar + Ticker + Footer)
│   │   ├── page.tsx            # Home (featured + tabbed posts + market sidebar)
│   │   ├── posts/              # Blog listing (cursor pagination + search)
│   │   ├── post/[slug]/        # Post detail (ISR, JSON-LD, view tracking)
│   │   └── page/[slug]/        # CMS pages
│   ├── markets/                # Market pages (india, global, crypto, forex)
│   ├── admin/                  # Protected admin panel
│   │   ├── dashboard/          # Stats + charts + recent logs
│   │   ├── posts/              # TipTap editor (CRUD)
│   │   ├── pages/              # CMS page editor
│   │   ├── navbar/             # DnD reorder
│   │   ├── footer/             # DnD reorder
│   │   ├── media/              # ImageKit upload grid
│   │   ├── settings/           # Logo, favicon, site name
│   │   ├── seo/                # Global meta + robots.txt + sitemap preview
│   │   ├── analytics/          # View count charts
│   │   └── logs/               # System logs with auto-prune warning
│   ├── api/                    # All API routes
│   ├── sitemap.ts              # Dynamic XML sitemap
│   └── robots.ts               # Dynamic robots.txt (from DB)
├── components/
│   ├── ui/                     # shadcn/ui base components
│   ├── layout/                 # Navbar, Footer
│   ├── market/                 # Ticker, Sidebar, Market cards
│   ├── blog/                   # PostCard, PostContent, ViewTracker
│   ├── charts/                 # Recharts wrappers (all dynamic/no-SSR)
│   └── admin/                  # Sidebar, PostEditor (TipTap)
├── hooks/
│   ├── use-market-data.ts      # Realtime + polling dual-layer
│   ├── use-posts.ts            # CRUD mutations
│   ├── use-navbar.ts           # Navbar + footer mutations
│   └── use-settings.ts         # Settings query
├── lib/
│   ├── supabase/client.ts      # Browser client
│   ├── supabase/server.ts      # Server + Service role client
│   ├── imagekit.ts             # ImageKit server SDK
│   ├── types.ts                # TypeScript interfaces
│   ├── validations.ts          # Zod schemas
│   ├── store.ts                # Zustand (sidebar)
│   └── utils.ts                # cn, formatDate, slugify, formatNumber, etc.
├── middleware.ts               # Auth guard + IP rate limiting
├── supabase/
│   ├── config.toml             # Local dev config + Edge Function timeouts
│   ├── schema.sql              # Full DB schema (run in Supabase SQL editor)
│   └── functions/
│       ├── market-cron-slow/   # Yahoo Finance fetcher (runs every 15 min)
│       └── market-cron-fast/   # CoinGecko + Forex fetcher (runs every 5 min)
├── netlify.toml                # Netlify deployment config
└── package.json
```

---

## Setup

### 1. Supabase

1. Create a free Supabase project at [supabase.com](https://supabase.com)
2. In SQL Editor, run **`supabase/schema.sql`** — creates all tables, RLS policies, pg_cron jobs, and default data
3. In **Authentication → Settings**, disable "Enable email confirmations" for easier admin login
4. Create your admin user via **Authentication → Users → Invite user**
5. In SQL Editor, promote your user to admin:
   ```sql
   update public.users set role = 'admin' where id = '<your-auth-user-id>';
   ```

### 2. ImageKit

1. Create a free ImageKit account at [imagekit.io](https://imagekit.io)
2. Get your **Public Key**, **Private Key**, and **URL Endpoint** from the dashboard

### 3. Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/YOUR_ID
NEXT_PUBLIC_APP_URL=https://your-site.netlify.app
SESSION_SECRET=a_long_random_string
```

### 4. Deploy Edge Functions

```bash
supabase functions deploy market-cron-fast
supabase functions deploy market-cron-slow
```

Then uncomment and update the `pg_cron` schedule blocks at the bottom of `schema.sql` with your project ref and service role key.

### 5. Netlify Deployment

1. Push to GitHub
2. Connect the repo in Netlify
3. Set build settings: **Base directory:** `tradeghost`, **Build command:** `npm run build`, **Publish directory:** `tradeghost/.next`
4. Add all environment variables from `.env.local` to Netlify's environment variables panel
5. Deploy!

---

## Admin Panel

Navigate to `/login` with your admin credentials. The admin panel includes:

| Section | Features |
|---------|----------|
| Dashboard | Post count, view totals, top-5 chart, recent logs |
| Posts | TipTap rich-text editor, draft/published, SEO meta, cover image |
| Pages | CMS static pages with TipTap editor |
| Navbar | Drag-and-drop link reorder |
| Footer | Drag-and-drop link reorder |
| Media | ImageKit upload, grid view, alt text, copy URL, delete |
| Settings | Site name, description, logo (ImageKit URL), favicon |
| SEO | Global meta defaults, robots.txt editor, sitemap preview |
| Analytics | Top posts by views chart |
| Logs | System logs (info/warn/error), auto-pruned after 7 days |

---

## Market Data Architecture

```
Supabase Edge Functions (Deno)
├── market-cron-fast (every 5 min)
│   ├── CoinGecko → crypto (top 20)
│   └── open.er-api.com → forex rates
└── market-cron-slow (every 15 min, circuit-breaker)
    ├── yahoo-finance2 → indices_india (NIFTY, SENSEX, BANKNIFTY)
    ├── yahoo-finance2 → indices_global (S&P, NASDAQ, FTSE, DAX, Nikkei)
    ├── yahoo-finance2 → gainers (NIFTY 50 top 10)
    └── yahoo-finance2 → losers (NIFTY 50 bottom 10)

Supabase Realtime → market_data table → client
Client: dual-layer (Realtime push + React Query 30s polling)
```

The circuit breaker in `market-cron-slow` skips Yahoo Finance after 3 consecutive failures and logs a warning. It resets on the next success.

---

## Data freshness disclaimer

- **Stocks / Indian / Global indices:** 15-minute delay (Yahoo Finance limitation)
- **Crypto:** Near-real-time (CoinGecko free tier, ~5 min)
- **Forex:** Near-real-time (open.er-api.com, ~5 min)
