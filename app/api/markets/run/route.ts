import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// ─── Types ────────────────────────────────────────────────────────────────────
type MarketItem = {
  symbol: string; name: string
  price: number; change: number; changePercent: number
}

// ─── Symbol lists ─────────────────────────────────────────────────────────────

// Finnhub uses "NSE:SYMBOL" format (confirmed: NSE is in supported exchanges)
// Twelve Data uses "SYMBOL:NSE" format (confirmed from official docs: SBIN:NSE)
const DEFAULT_NIFTY_50_CLEAN = [
  'ADANIENT','ADANIPORTS','APOLLOHOSP','ASIANPAINT','AXISBANK',
  'BAJAJ-AUTO','BAJAJFINSV','BAJFINANCE','BEL','BHARTIARTL',
  'BPCL','BRITANNIA','CIPLA','COALINDIA','DIVISLAB',
  'DRREDDY','EICHERMOT','GRASIM','HCLTECH','HDFCBANK',
  'HDFCLIFE','HEROMOTOCO','HINDALCO','HINDUNILVR','ICICIBANK',
  'INDUSINDBK','INFY','ITC','JIOFIN','JSWSTEEL',
  'KOTAKBANK','LT','LTIM','M&M','MARUTI',
  'NESTLEIND','NTPC','ONGC','POWERGRID','RELIANCE',
  'SBIN','SBILIFE','SHREECEM','SUNPHARMA','TATAMOTORS',
  'TATACONSUM','TATASTEEL','TCS','TECHM','TITAN',
]

// Finnhub global index symbols (^GSPC etc — confirmed standard Yahoo/Finnhub format)
const GLOBAL_INDICES_FINNHUB: Record<string, string> = {
  '^GSPC':  'S&P 500',
  '^IXIC':  'Nasdaq',
  '^DJI':   'Dow Jones',
  '^FTSE':  'FTSE 100',
  '^GDAXI': 'DAX',
  '^FCHI':  'CAC 40',
  '^N225':  'Nikkei 225',
  '^HSI':   'Hang Seng',
}

// Twelve Data global index symbols (confirmed format)
const GLOBAL_INDICES_TD = [
  'SPX:NYSE','IXIC:NASDAQ','DJI:NYSE','FTSE:LSE','DAX:XETRA','N225:JPX',
]

// Stooq forex — confirmed working from your own logs
const FOREX_STOOQ_SYMBOLS = ['USDINR','EURUSD','GBPUSD','USDJPY','AUDUSD','USDCAD','USDCHF','USDSGD','USDHKD','USDCNY']
const FOREX_STOOQ_MAP: Record<string, { key: string; inverse: boolean }> = {
  USDINR: { key: 'INR', inverse: false },
  EURUSD: { key: 'EUR', inverse: true  },
  GBPUSD: { key: 'GBP', inverse: true  },
  USDJPY: { key: 'JPY', inverse: false },
  AUDUSD: { key: 'AUD', inverse: true  },
  USDCAD: { key: 'CAD', inverse: false },
  USDCHF: { key: 'CHF', inverse: false },
  USDSGD: { key: 'SGD', inverse: false },
  USDHKD: { key: 'HKD', inverse: false },
  USDCNY: { key: 'CNY', inverse: false },
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function assertAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
  return data?.role === 'admin'
}

// ─── Finnhub ──────────────────────────────────────────────────────────────────
// Official docs: GET /api/v1/quote?symbol=SYMBOL&token=KEY
// Response: { c: price, d: change, dp: changePercent, h, l, o, pc, t }
// Free tier: 60 req/min confirmed. NSE India listed as supported exchange.

async function finnhubQuote(symbol: string, apiKey: string): Promise<{ c: number; d: number; dp: number } | null> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
      { cache: 'no-store' }
    )
    if (!res.ok) return null
    const json = await res.json()
    // c === 0 means no data (unknown symbol or market closed with no last price)
    if (!json || json.c === 0 || json.c === undefined) return null
    return { c: json.c, d: json.d ?? 0, dp: json.dp ?? 0 }
  } catch { return null }
}

// Parallel fetch with concurrency limit to stay within 60 req/min
async function finnhubBatch(
  symbols: string[],
  apiKey: string,
  concurrency = 10
): Promise<Map<string, { c: number; d: number; dp: number }>> {
  const out = new Map<string, { c: number; d: number; dp: number }>()
  for (let i = 0; i < symbols.length; i += concurrency) {
    const batch = symbols.slice(i, i + concurrency)
    const rows = await Promise.all(batch.map(async s => ({ s, q: await finnhubQuote(s, apiKey) })))
    for (const { s, q } of rows) { if (q) out.set(s, q) }
    if (i + concurrency < symbols.length) await new Promise(r => setTimeout(r, 150))
  }
  return out
}

// ─── Twelve Data ──────────────────────────────────────────────────────────────
// Official docs: GET /quote?symbol=SYM1:NSE,SYM2:NSE&apikey=KEY
// Batch: up to 120 symbols per call (confirmed). 1 credit per symbol.
// Free tier: 800 credits/day. NSE format: SYMBOL:NSE (e.g. SBIN:NSE)

async function fetchTwelveDataBatch(tdSymbols: string[], apiKey: string): Promise<MarketItem[]> {
  // All 50 Nifty stocks in ONE call = 50 credits (confirmed supported)
  const res = await fetch(
    `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(tdSymbols.join(','))}&apikey=${apiKey}`,
    { cache: 'no-store' }
  )
  if (!res.ok) throw new Error(`Twelve Data HTTP ${res.status}`)
  const json = await res.json()

  // Single symbol returns object directly; multiple returns { SYMBOL: {...} }
  const entries: Array<Record<string, string>> =
    tdSymbols.length === 1 ? [json] : Object.values(json)

  return entries
    .filter(q => q && typeof q === 'object' && !Array.isArray(q) && q['status'] !== 'error' && !('code' in (q as object)))
    .map(q => ({
      symbol: (q['symbol'] ?? '').replace(/:NSE|:BSE|:NYSE|:NASDAQ|:LSE|:XETRA|:JPX|:HKEX/g, ''),
      name:   q['name'] ?? q['symbol'] ?? '',
      price:  parseFloat(q['close'] ?? '0') || 0,
      change: parseFloat(q['change'] ?? '0') || 0,
      changePercent: parseFloat(q['percent_change'] ?? '0') || 0,
    }))
    .filter(q => q.price > 0)
}

// ─── Stooq (forex only — confirmed working) ───────────────────────────────────
// One symbol per request. f=sd2ncp → Symbol, Date, Name, Close, Prev
// Confirmed headers from live logs: Symbol|Date|Name|Low|Close|Prev

async function stooqOne(symbol: string): Promise<{ symbol: string; close: number } | null> {
  try {
    const res = await fetch(
      `https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2ncp&h&e=csv`,
      { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/csv,*/*' }, cache: 'no-store' }
    )
    if (!res.ok) return null
    const lines = (await res.text()).trim().split('\n').filter(Boolean)
    if (lines.length < 2) return null
    const headers = lines[0].split(',').map(h => h.trim())
    const cols    = lines[1].split(',').map(c => c.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = cols[i] ?? '' })
    const close = parseFloat(row['Close'] ?? '')
    if (!close || row['Close'] === 'N/D') return null
    return { symbol: row['Symbol'] ?? symbol, close }
  } catch { return null }
}

async function fetchStooqForex(): Promise<Record<string, number>> {
  const rows = await Promise.all(FOREX_STOOQ_SYMBOLS.map(stooqOne))
  const rates: Record<string, number> = {}
  for (const r of rows) {
    if (!r) continue
    const m = FOREX_STOOQ_MAP[r.symbol.toUpperCase()]
    if (m) rates[m.key] = m.inverse ? 1 / r.close : r.close
  }
  if (!Object.keys(rates).length) throw new Error('Stooq: no forex rates')
  return rates
}

// ─── ExchangeRate-API (forex backup) ─────────────────────────────────────────
async function fetchExchangeRateApi(): Promise<Record<string, number>> {
  const key = process.env.EXCHANGE_RATE_API_KEY ?? ''
  const url = key
    ? `https://v6.exchangerate-api.com/v6/${key}/latest/USD`
    : 'https://open.er-api.com/v6/latest/USD'
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`ExchangeRate-API HTTP ${res.status}`)
  const json = await res.json()
  const all = (json.rates ?? json.conversion_rates) as Record<string, number>
  if (!all) throw new Error('no rates field')
  const wanted = ['INR','EUR','GBP','JPY','AUD','CAD','CHF','SGD','HKD','CNY']
  return Object.fromEntries(wanted.filter(k => all[k]).map(k => [k, all[k]]))
}

// ─── CoinGecko ────────────────────────────────────────────────────────────────
async function fetchCoinGecko() {
  const res = await fetch(
    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false',
    { cache: 'no-store' }
  )
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`)
  return res.json()
}

// ─── Last known ───────────────────────────────────────────────────────────────
async function getLastKnown(svc: ReturnType<typeof createServiceClient>, id: string): Promise<unknown | null> {
  try {
    const { data } = await svc.from('market_data').select('data').eq('id', id).single()
    return data?.data ?? null
  } catch { return null }
}

// ─── POST handler ─────────────────────────────────────────────────────────────
export async function POST() {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'Missing env' }, { status: 500 })

  const svc = createServiceClient()
  const finnhubKey = process.env.FINNHUB_API_KEY ?? ''
  const tdKey      = process.env.TWELVE_DATA_API_KEY ?? ''
  const now        = new Date().toISOString()
  const upserts: { id: string; data: unknown; source: string; updated_at: string }[] = []
  const errors: string[] = []

  // Load stored Nifty 50 symbols (or use defaults)
  let nifty50 = DEFAULT_NIFTY_50_CLEAN
  try {
    const { data } = await svc.from('market_data').select('data').eq('id', 'nifty50_symbols').single()
    if (Array.isArray(data?.data) && data.data.length > 0) nifty50 = data.data as string[]
  } catch { /* use defaults */ }

  // ── Crypto → CoinGecko ────────────────────────────────────────────────────
  try {
    upserts.push({ id: 'crypto', data: await fetchCoinGecko(), source: 'coingecko', updated_at: now })
  } catch (e) {
    errors.push(`Crypto: ${e}`)
    const last = await getLastKnown(svc, 'crypto')
    if (last) upserts.push({ id: 'crypto', data: last, source: 'last_known', updated_at: now })
  }

  // ── Forex → Stooq → ExchangeRate-API ─────────────────────────────────────
  try {
    upserts.push({ id: 'forex', data: await fetchStooqForex(), source: 'stooq', updated_at: now })
  } catch (e) {
    errors.push(`Forex Stooq: ${e}`)
    try {
      upserts.push({ id: 'forex', data: await fetchExchangeRateApi(), source: 'exchangerate-api', updated_at: now })
    } catch (e2) {
      errors.push(`Forex ExchangeRate-API: ${e2}`)
      const last = await getLastKnown(svc, 'forex')
      if (last) upserts.push({ id: 'forex', data: last, source: 'last_known', updated_at: now })
    }
  }

  // ── India Indices → Finnhub → Twelve Data ────────────────────────────────
  try {
    if (!finnhubKey) throw new Error('FINNHUB_API_KEY not set')
    const quotes = await finnhubBatch(Object.keys(GLOBAL_INDICES_FINNHUB).concat(['^NSEI','^BSESN','^NSEBANK']), finnhubKey)
    const indiaItems: MarketItem[] = [
      { symbol: 'NSEI',    name: 'Nifty 50',    ...(quotes.get('^NSEI')    ?? { c: 0, d: 0, dp: 0 }) },
      { symbol: 'BSESN',   name: 'Sensex',       ...(quotes.get('^BSESN')   ?? { c: 0, d: 0, dp: 0 }) },
      { symbol: 'NSEBANK', name: 'Bank Nifty',   ...(quotes.get('^NSEBANK') ?? { c: 0, d: 0, dp: 0 }) },
    ].filter(x => x.c > 0).map(x => ({ symbol: x.symbol, name: x.name, price: x.c, change: x.d, changePercent: x.dp }))
    if (!indiaItems.length) throw new Error('Finnhub: all India indices returned 0')
    upserts.push({ id: 'indices_india', data: indiaItems, source: 'finnhub', updated_at: now })
  } catch (e) {
    errors.push(`India indices Finnhub: ${e}`)
    try {
      if (!tdKey) throw new Error('TWELVE_DATA_API_KEY not set')
      const items = await fetchTwelveDataBatch(['NIFTY50:NSE','SENSEX:BSE','BANKNIFTY:NSE'], tdKey)
      if (!items.length) throw new Error('Twelve Data: no India indices returned')
      upserts.push({ id: 'indices_india', data: items, source: 'twelvedata', updated_at: now })
    } catch (e2) {
      errors.push(`India indices Twelve: ${e2}`)
      const last = await getLastKnown(svc, 'indices_india')
      if (last) upserts.push({ id: 'indices_india', data: last, source: 'last_known', updated_at: now })
    }
  }

  // ── Global Indices → Finnhub → Twelve Data ────────────────────────────────
  try {
    if (!finnhubKey) throw new Error('FINNHUB_API_KEY not set')
    const quotes = await finnhubBatch(Object.keys(GLOBAL_INDICES_FINNHUB), finnhubKey)
    const items: MarketItem[] = []
    Object.entries(GLOBAL_INDICES_FINNHUB).forEach(([sym, name]) => {
      const q = quotes.get(sym)
      if (q) items.push({ symbol: sym.replace('^', ''), name, price: q.c, change: q.d, changePercent: q.dp })
    })
    if (!items.length) throw new Error('Finnhub: all global indices returned 0')
    upserts.push({ id: 'indices_global', data: items, source: 'finnhub', updated_at: now })
  } catch (e) {
    errors.push(`Global indices Finnhub: ${e}`)
    try {
      if (!tdKey) throw new Error('TWELVE_DATA_API_KEY not set')
      const items = await fetchTwelveDataBatch(GLOBAL_INDICES_TD, tdKey)
      if (!items.length) throw new Error('Twelve Data: no global indices returned')
      upserts.push({ id: 'indices_global', data: items, source: 'twelvedata', updated_at: now })
    } catch (e2) {
      errors.push(`Global indices Twelve: ${e2}`)
      const last = await getLastKnown(svc, 'indices_global')
      if (last) upserts.push({ id: 'indices_global', data: last, source: 'last_known', updated_at: now })
    }
  }

  // ── Nifty 50 → Finnhub → Twelve Data (ONE batch call) ────────────────────
  try {
    if (!finnhubKey) throw new Error('FINNHUB_API_KEY not set')
    const finnhubSyms = nifty50.map(s => `NSE:${s}`)
    const quotes = await finnhubBatch(finnhubSyms, finnhubKey, 8)
    if (!quotes.size) throw new Error('Finnhub: no Nifty 50 data returned')
    const items: MarketItem[] = Array.from(quotes.entries()).map(([sym, q]) => ({
      symbol: sym.replace('NSE:', ''), name: sym.replace('NSE:', ''),
      price: q.c, change: q.d, changePercent: q.dp,
    }))
    const sorted = [...items].sort((a, b) => b.changePercent - a.changePercent)
    upserts.push(
      { id: 'nifty50_stocks', data: sorted,                             source: 'finnhub', updated_at: now },
      { id: 'gainers',        data: sorted.slice(0, 10),                source: 'finnhub', updated_at: now },
      { id: 'losers',         data: [...sorted].reverse().slice(0, 10), source: 'finnhub', updated_at: now },
    )
  } catch (e) {
    errors.push(`Nifty 50 Finnhub: ${e}`)
    try {
      if (!tdKey) throw new Error('TWELVE_DATA_API_KEY not set')
      // ONE batch call for all 50 symbols (confirmed: up to 120 per call)
      const tdSyms = nifty50.map(s => `${s}:NSE`)
      const items = await fetchTwelveDataBatch(tdSyms, tdKey)
      if (!items.length) throw new Error('Twelve Data: no Nifty 50 data returned')
      const sorted = [...items].sort((a, b) => b.changePercent - a.changePercent)
      upserts.push(
        { id: 'nifty50_stocks', data: sorted,                             source: 'twelvedata', updated_at: now },
        { id: 'gainers',        data: sorted.slice(0, 10),                source: 'twelvedata', updated_at: now },
        { id: 'losers',         data: [...sorted].reverse().slice(0, 10), source: 'twelvedata', updated_at: now },
      )
    } catch (e2) {
      errors.push(`Nifty 50 Twelve: ${e2}`)
      // Keep existing Supabase data — don't upsert stale zeros
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  if (upserts.length > 0) {
    const { error: dbErr } = await svc.from('market_data').upsert(upserts, { onConflict: 'id' })
    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  }

  await svc.from('logs').insert([{
    level: errors.length ? 'warn' : 'info',
    message: `Manual sync: ${upserts.length} saved${errors.length ? ` | ${errors.join('; ')}` : ''}`,
    context: { sources: upserts.map(u => `${u.id}:${u.source}`) },
  }])

  return NextResponse.json({
    success: true,
    updated: upserts.map(u => u.id),
    sources: upserts.map(u => `${u.id}:${u.source}`),
    errors,
    updated_at: now,
  }, { status: errors.length ? 207 : 200 })
}
