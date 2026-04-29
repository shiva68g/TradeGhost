// market-cron-fast — runs every 1 minute
// Crypto:  CoinGecko (no key, no daily limit) → last_known
// Forex:   Stooq one-by-one parallel (no key, confirmed working) → ExchangeRate-API → last_known

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const FOREX_SYMBOLS = ['USDINR','EURUSD','GBPUSD','USDJPY','AUDUSD','USDCAD','USDCHF','USDSGD','USDHKD','USDCNY']
const FOREX_MAP: Record<string, { key: string; inverse: boolean }> = {
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

async function log(level: 'info'|'warn'|'error', msg: string) {
  try { await supabase.from('logs').insert([{ level, message: msg, context: { fn: 'market-cron-fast' } }]) } catch { /* */ }
}

async function getLastKnown(id: string): Promise<unknown | null> {
  try {
    const { data } = await supabase.from('market_data').select('data').eq('id', id).single()
    return data?.data ?? null
  } catch { return null }
}

// Stooq: one symbol per request, f=sd2ncp
// Confirmed headers from live logs: Symbol|Date|Name|Low|Close|Prev
async function stooqOne(symbol: string): Promise<{ symbol: string; close: number } | null> {
  try {
    const res = await fetch(
      `https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2ncp&h&e=csv`,
      { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/csv,*/*' }, signal: AbortSignal.timeout(10_000) }
    )
    if (!res.ok) return null
    const lines = (await res.text()).trim().split('\n').filter(Boolean)
    if (lines.length < 2) return null
    const headers = lines[0].split(',').map((h: string) => h.trim())
    const cols    = lines[1].split(',').map((c: string) => c.trim())
    const row: Record<string, string> = {}
    headers.forEach((h: string, i: number) => { row[h] = cols[i] ?? '' })
    const close = parseFloat(row['Close'] ?? '')
    if (!close || row['Close'] === 'N/D') return null
    return { symbol: row['Symbol'] ?? symbol, close }
  } catch { return null }
}

async function getForex(): Promise<{ data: unknown; source: string }> {
  // 1. Stooq — all 10 forex in parallel
  try {
    const rows = await Promise.all(FOREX_SYMBOLS.map(stooqOne))
    const rates: Record<string, number> = {}
    for (const r of rows) {
      if (!r) continue
      const m = FOREX_MAP[r.symbol.toUpperCase()]
      if (m) rates[m.key] = m.inverse ? 1 / r.close : r.close
    }
    if (Object.keys(rates).length > 0) return { data: rates, source: 'stooq' }
    throw new Error('no rates parsed')
  } catch (e) { await log('warn', `Stooq forex failed: ${e}`) }

  // 2. ExchangeRate-API
  try {
    const key = Deno.env.get('EXCHANGE_RATE_API_KEY') ?? ''
    const url = key
      ? `https://v6.exchangerate-api.com/v6/${key}/latest/USD`
      : 'https://open.er-api.com/v6/latest/USD'
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const all = (json.rates ?? json.conversion_rates) as Record<string, number>
    if (!all) throw new Error('no rates field')
    const wanted = ['INR','EUR','GBP','JPY','AUD','CAD','CHF','SGD','HKD','CNY']
    const rates = Object.fromEntries(wanted.filter(k => all[k]).map(k => [k, all[k]]))
    await log('info', 'Forex: ExchangeRate-API backup used')
    return { data: rates, source: 'exchangerate-api' }
  } catch (e) { await log('warn', `ExchangeRate-API failed: ${e}`) }

  // 3. Last known
  const last = await getLastKnown('forex')
  if (last) return { data: last, source: 'last_known' }
  throw new Error('No forex data')
}

async function getCrypto(): Promise<{ data: unknown; source: string }> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false',
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12_000) }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return { data: await res.json(), source: 'coingecko' }
  } catch (e) { await log('warn', `CoinGecko failed: ${e}`) }
  const last = await getLastKnown('crypto')
  if (last) return { data: last, source: 'last_known' }
  throw new Error('No crypto data')
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET')
  if (secret && req.headers.get('Authorization') !== `Bearer ${secret}`)
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const start = Date.now()
  await log('info', 'market-cron-fast: start')
  const now = new Date().toISOString()

  const [cryptoRes, forexRes] = await Promise.allSettled([getCrypto(), getForex()])
  const upserts: { id: string; data: unknown; source: string; updated_at: string }[] = []

  if (cryptoRes.status === 'fulfilled')
    upserts.push({ id: 'crypto', data: cryptoRes.value.data, source: cryptoRes.value.source, updated_at: now })
  else await log('error', `Crypto failed: ${cryptoRes.reason}`)

  if (forexRes.status === 'fulfilled')
    upserts.push({ id: 'forex', data: forexRes.value.data, source: forexRes.value.source, updated_at: now })
  else await log('error', `Forex failed: ${forexRes.reason}`)

  if (upserts.length > 0) {
    const { error } = await supabase.from('market_data').upsert(upserts, { onConflict: 'id' })
    if (error) { await log('error', `DB: ${error.message}`); return new Response(JSON.stringify({ ok: false }), { status: 500 }) }
  }

  const elapsed = Date.now() - start
  const sources = upserts.map(u => `${u.id}:${u.source}`).join(', ')
  await log('info', `market-cron-fast: done ${elapsed}ms | ${sources}`)
  return new Response(JSON.stringify({ ok: true, elapsed, sources }), { status: 200 })
})
