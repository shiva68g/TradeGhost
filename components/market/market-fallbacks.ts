// market-fallbacks.ts
//
// PHILOSOPHY:
//   - Index fallbacks (INDIA / GLOBAL) are kept as structural placeholders so the
//     UI renders skeleton cards instead of crashing on first load.
//   - Gainers, Losers, Nifty50, Crypto, Forex: NO static fallbacks.
//     If Supabase has no data yet, we return [] / {} and the UI shows a skeleton.
//     Real stale data from Supabase is always preferred over fake numbers.

import type { CryptoItem, MarketItem } from '@/lib/types'

// ─── India Indices — structural placeholder only (no fake prices) ─────────────
// These are shown as skeletons until real data arrives from Supabase.
export const FALLBACK_INDIA: MarketItem[] = [
  { symbol: 'NSEI',       name: 'NIFTY 50',       price: 0, change: 0, changePercent: 0 },
  { symbol: 'BSESN',      name: 'SENSEX',          price: 0, change: 0, changePercent: 0 },
  { symbol: 'NSEBANK',    name: 'BANK NIFTY',      price: 0, change: 0, changePercent: 0 },
  { symbol: 'CNXIT',      name: 'NIFTY IT',        price: 0, change: 0, changePercent: 0 },
  { symbol: 'CNXAUTO',    name: 'NIFTY AUTO',      price: 0, change: 0, changePercent: 0 },
  { symbol: 'CNXMIDCAP',  name: 'NIFTY MIDCAP',   price: 0, change: 0, changePercent: 0 },
]

// ─── Global Indices — structural placeholder only ─────────────────────────────
export const FALLBACK_GLOBAL: MarketItem[] = [
  { symbol: 'GSPC',  name: 'S&P 500',     price: 0, change: 0, changePercent: 0 },
  { symbol: 'IXIC',  name: 'NASDAQ',      price: 0, change: 0, changePercent: 0 },
  { symbol: 'DJI',   name: 'DOW JONES',   price: 0, change: 0, changePercent: 0 },
  { symbol: 'FTSE',  name: 'FTSE 100',    price: 0, change: 0, changePercent: 0 },
  { symbol: 'GDAXI', name: 'DAX',         price: 0, change: 0, changePercent: 0 },
  { symbol: 'N225',  name: 'NIKKEI 225',  price: 0, change: 0, changePercent: 0 },
]

// ─── No static fallbacks for these — return empty, show skeleton ───────────────
// Gainers, Losers, Nifty50: always from Supabase (real live data or last known)
// Crypto, Forex: always from Supabase (real live data or last known)
export const FALLBACK_GAINERS: MarketItem[] = []
export const FALLBACK_LOSERS:  MarketItem[] = []

export const FALLBACK_CRYPTO: CryptoItem[] = []
export const FALLBACK_FOREX:  Record<string, number> = {}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns live data if available, fallback array otherwise.
 * For gainers/losers/nifty50 — fallback is [], so UI shows skeleton.
 * For indices — fallback has structure so UI renders the right number of cards.
 */
export function getMarketItems(data: unknown, fallback: MarketItem[]): MarketItem[] {
  return Array.isArray(data) && data.length > 0 ? (data as MarketItem[]) : fallback
}

/**
 * Returns crypto items from Supabase data.
 * Returns [] if no data — UI should show skeleton, not fake prices.
 */
export function getCryptoItems(data: unknown): CryptoItem[] {
  return Array.isArray(data) && data.length > 0 ? (data as CryptoItem[]) : []
}

/**
 * Returns forex rates from Supabase data.
 * Returns {} if no data — UI should show skeleton, not fake rates.
 */
export function getForexRates(data: unknown): Record<string, number> {
  return data && typeof data === 'object' && Object.keys(data as object).length > 0
    ? (data as Record<string, number>)
    : {}
}
