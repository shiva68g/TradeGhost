// market-cron-slow — runs every 5 minutes
// India indices:  Finnhub → Twelve Data (ONE batch call) → last_known
// Global indices: Finnhub → Twelve Data (ONE batch call) → last_known
// Nifty 50:       Finnhub → Twelve Data (ONE batch call, 50 symbols) → last_known
//
// Finnhub: free, 60 req/min, NSE listed as supported exchange
// Twelve Data: 1 credit/symbol, batch up to 120 symbols per call (confirmed official docs)
// Free tier: 800 credits/day — only consumed if Finnhub fails

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const DEFAULT_NIFTY_50 = [
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

// Finnhub index symbols
const INDIA_INDICES_FH: Record<string, string> = {
  '^NSEI':    'Nifty 50',
  '^BSESN':   'Sensex',
  '^NSEBANK': 'Bank Nifty',
}
const GLOBAL_INDICES_FH: Record<string, string> = {
  '^GSPC':  'S&P 500',
  '^IXIC':  'Nasdaq',
  '^DJI':   'Dow Jones',
  '^FTSE':  'FTSE 100',
  '^GDAXI': 'DAX',
  '^FCHI':  'CAC 40',
  '^N225':  'Nikkei 225',
  '^HSI':   'Hang Seng',
}

// Twelve Data index symbols (confirmed format from official docs)
const INDIA_INDICES_TD  = ['NIFTY50:NSE','SENSEX:BSE','BANKNIFTY:NSE']
const GLOBAL_INDICES_TD = ['SPX:NYSE','IXIC:NASDAQ','DJI:NYSE','FTSE:LSE','DAX:XETRA','N225:JPX']

type MarketItem = { symbol: string; name: string; price: number; change: number; changePercent: number }

async function log(level: 'info'|'warn'|'error', msg: string) {
  try { await supabase.from('logs').insert([{ level, message: msg, context: { fn: 'market-cron-slow' } }]) } catch { /* */ }
}

async function getLastKnown(id: string): Promise<unknown | null> {
  try {
    const { data } = await supabase.from('market_data').select('data').eq('id', id).single()
    return data?.data ?? null
  } catch { return null }
}

// ─── Finnhub quote ────────────────────────────────────────────────────────────
// Official endpoint: GET /api/v1/quote?symbol=SYMBOL&token=KEY
// Returns: { c: price, d: change, dp: changePercent, ... }
// c === 0 means no data for that symbol on free tier

async function finnhubQuote(symbol: string, key: string): Promise<{ c: number; d: number; dp: number } | null> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`,
      { signal: AbortSignal.timeout(12_000) }
    )
    if (!res.ok) return null
    const j = await res.json()
    if (!j || j.c === 0 || j.c === undefined) return null
    return { c: j.c, d: j.d ?? 0, dp: j.dp ?? 0 }
  } catch { return null }
}

async function finnhubBatch(
  symbols: string[],
  key: string,
  concurrency = 10
): Promise<Map<string, { c: number; d: number; dp: number }>> {
  const out = new Map<string, { c: number; d: number; dp: number }>()
  for (let i = 0; i < symbols.length; i += concurrency) {
    const batch = symbols.slice(i, i + concurrency)
    const rows = await Promise.all(batch.map(async (s: string) => ({ s, q: await finnhubQuote(s, key) })))
    for (const { s, q } of rows) { if (q) out.set(s, q) }
    if (i + concurrency < symbols.length) await new Promise(r => setTimeout(r, 150))
  }
  return out
}

// ─── Twelve Data batch quote ──────────────────────────────────────────────────
// Official docs confirm: up to 120 symbols per call, 1 credit per symbol
// NSE format confirmed: SYMBOL:NSE (e.g. SBIN:NSE from official example)

async function twelveBatch(tdSymbols: string[], key: string): Promise<MarketItem[]> {
  const res = await fetch(
    `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(tdSymbols.join(','))}&apikey=${key}`,
    { signal: AbortSignal.timeout(20_000) }
  )
  if (!res.ok) throw new Error(`Twelve Data HTTP ${res.status}`)
  const json = await res.json()
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

// ─── India Indices ────────────────────────────────────────────────────────────
async function getIndiaIndices(fhKey: string, tdKey: string): Promise<{ data: MarketItem[]; source: string }> {
  // 1. Finnhub
  try {
    if (!fhKey) throw new Error('no FINNHUB_API_KEY')
    const quotes = await finnhubBatch(Object.keys(INDIA_INDICES_FH), fhKey)
    const items: MarketItem[] = []
    for (const [sym, name] of Object.entries(INDIA_INDICES_FH)) {
      const q = quotes.get(sym)
      if (q) items.push({ symbol: sym.replace('^',''), name, price: q.c, change: q.d, changePercent: q.dp })
    }
    if (items.length) return { data: items, source: 'finnhub' }
    throw new Error('all returned 0')
  } catch (e) { await log('warn', `India indices Finnhub: ${e}`) }

  // 2. Twelve Data (3 symbols = 3 credits, 1 call)
  try {
    if (!tdKey) throw new Error('no TWELVE_DATA_API_KEY')
    const items = await twelveBatch(INDIA_INDICES_TD, tdKey)
    if (!items.length) throw new Error('no items')
    await log('info', 'India indices: TwelveData backup used')
    return { data: items, source: 'twelvedata' }
  } catch (e) { await log('warn', `India indices TwelveData: ${e}`) }

  // 3. Last known
  const last = await getLastKnown('indices_india')
  if (last) return { data: last as MarketItem[], source: 'last_known' }
  throw new Error('No India indices data')
}

// ─── Global Indices ───────────────────────────────────────────────────────────
async function getGlobalIndices(fhKey: string, tdKey: string): Promise<{ data: MarketItem[]; source: string }> {
  // 1. Finnhub
  try {
    if (!fhKey) throw new Error('no FINNHUB_API_KEY')
    const quotes = await finnhubBatch(Object.keys(GLOBAL_INDICES_FH), fhKey)
    const items: MarketItem[] = []
    for (const [sym, name] of Object.entries(GLOBAL_INDICES_FH)) {
      const q = quotes.get(sym)
      if (q) items.push({ symbol: sym.replace('^',''), name, price: q.c, change: q.d, changePercent: q.dp })
    }
    if (items.length) return { data: items, source: 'finnhub' }
    throw new Error('all returned 0')
  } catch (e) { await log('warn', `Global indices Finnhub: ${e}`) }

  // 2. Twelve Data (6 symbols = 6 credits, 1 call)
  try {
    if (!tdKey) throw new Error('no TWELVE_DATA_API_KEY')
    const items = await twelveBatch(GLOBAL_INDICES_TD, tdKey)
    if (!items.length) throw new Error('no items')
    await log('info', 'Global indices: TwelveData backup used')
    return { data: items, source: 'twelvedata' }
  } catch (e) { await log('warn', `Global indices TwelveData: ${e}`) }

  // 3. Last known
  const last = await getLastKnown('indices_global')
  if (last) return { data: last as MarketItem[], source: 'last_known' }
  throw new Error('No global indices data')
}

// ─── Nifty 50 ─────────────────────────────────────────────────────────────────
async function getNifty50(
  symbols: string[],
  fhKey: string,
  tdKey: string
): Promise<{ items: MarketItem[]; source: string }> {
  // 1. Finnhub (50 symbols, 8 concurrency, ~200ms pause between batches)
  try {
    if (!fhKey) throw new Error('no FINNHUB_API_KEY')
    const quotes = await finnhubBatch(symbols.map(s => `NSE:${s}`), fhKey, 8)
    if (!quotes.size) throw new Error('no data')
    const items: MarketItem[] = []
    for (const [sym, q] of quotes) {
      const clean = sym.replace('NSE:', '')
      items.push({ symbol: clean, name: clean, price: q.c, change: q.d, changePercent: q.dp })
    }
    return { items, source: 'finnhub' }
  } catch (e) { await log('warn', `Nifty 50 Finnhub: ${e}`) }

  // 2. Twelve Data — ONE batch call for all 50 symbols (50 credits, confirmed up to 120/call)
  try {
    if (!tdKey) throw new Error('no TWELVE_DATA_API_KEY')
    const tdSyms = symbols.map(s => `${s}:NSE`)
    const items = await twelveBatch(tdSyms, tdKey)
    if (!items.length) throw new Error('no data')
    await log('info', 'Nifty 50: TwelveData backup used')
    return { items, source: 'twelvedata' }
  } catch (e) { await log('warn', `Nifty 50 TwelveData: ${e}`) }

  throw new Error('No Nifty 50 data')
}

// ─── Main ─────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET')
  if (secret && req.headers.get('Authorization') !== `Bearer ${secret}`)
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const start = Date.now()
  await log('info', 'market-cron-slow: start')
  const now    = new Date().toISOString()
  const fhKey  = Deno.env.get('FINNHUB_API_KEY') ?? ''
  const tdKey  = Deno.env.get('TWELVE_DATA_API_KEY') ?? ''

  let niftySymbols = DEFAULT_NIFTY_50
  try {
    const { data } = await supabase.from('market_data').select('data').eq('id', 'nifty50_symbols').single()
    if (Array.isArray(data?.data) && data.data.length > 0) niftySymbols = data.data as string[]
  } catch { /* use defaults */ }

  const [indiaRes, globalRes, niftyRes] = await Promise.allSettled([
    getIndiaIndices(fhKey, tdKey),
    getGlobalIndices(fhKey, tdKey),
    getNifty50(niftySymbols, fhKey, tdKey),
  ])

  const upserts: { id: string; data: unknown; source: string; updated_at: string }[] = []

  if (indiaRes.status === 'fulfilled')
    upserts.push({ id: 'indices_india', data: indiaRes.value.data, source: indiaRes.value.source, updated_at: now })
  else await log('error', `India indices: ${indiaRes.reason}`)

  if (globalRes.status === 'fulfilled')
    upserts.push({ id: 'indices_global', data: globalRes.value.data, source: globalRes.value.source, updated_at: now })
  else await log('error', `Global indices: ${globalRes.reason}`)

  if (niftyRes.status === 'fulfilled') {
    const { items, source } = niftyRes.value
    const sorted = [...items].sort((a, b) => b.changePercent - a.changePercent)
    upserts.push(
      { id: 'nifty50_stocks', data: sorted,                             source, updated_at: now },
      { id: 'gainers',        data: sorted.slice(0, 10),                source, updated_at: now },
      { id: 'losers',         data: [...sorted].reverse().slice(0, 10), source, updated_at: now },
    )
  } else await log('error', `Nifty 50: ${niftyRes.reason}`)

  if (upserts.length > 0) {
    const { error } = await supabase.from('market_data').upsert(upserts, { onConflict: 'id' })
    if (error) { await log('error', `DB: ${error.message}`); return new Response(JSON.stringify({ ok: false }), { status: 500 }) }
  }

  const elapsed = Date.now() - start
  const sources = upserts.map(u => `${u.id}:${u.source}`).join(', ')
  await log('info', `market-cron-slow: done ${elapsed}ms | ${sources}`)
  return new Response(JSON.stringify({ ok: true, elapsed, sources, saved: upserts.map(u => u.id) }), { status: 200 })
})
