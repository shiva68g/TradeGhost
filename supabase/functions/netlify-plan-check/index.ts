// Supabase Edge Function — netlify-plan-check
// Purpose  : Check Netlify credit balance, show plan info, trigger build only on confirmation
// Trigger  : Manual HTTP POST only — never runs on a cron
// Auth     : Requires CRON_SECRET in Authorization header
//
// Usage:
//   Step 1 — Check credits (GET or POST without confirm):
//     POST https://<project>.supabase.co/functions/v1/netlify-plan-check
//     Authorization: Bearer <CRON_SECRET>
//     → Returns credit info and a confirm_token
//
//   Step 2 — Trigger build after reviewing:
//     POST https://<project>.supabase.co/functions/v1/netlify-plan-check
//     Authorization: Bearer <CRON_SECRET>
//     Content-Type: application/json
//     { "confirm": true, "confirm_token": "<token from step 1>" }
//     → Triggers Netlify deploy hook if credits are safe

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Minimum credits required before a build is allowed (1 deploy = 15 credits, keep buffer of 2)
const MIN_CREDITS_TO_BUILD = 30
// Simple in-memory token store (valid for the lifetime of this cold start, ~5 min)
const pendingTokens = new Map<string, number>()
const TOKEN_TTL_MS = 5 * 60 * 1000 // 5 minutes

async function log(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>) {
  try { await supabase.from('logs').insert([{ level, message, context: { fn: 'netlify-plan-check', ...context } }]) } catch { /* ignore */ }
}

function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

interface NetlifyAccount {
  id: string
  name: string
  slug: string
  type: string
  capabilities?: Record<string, unknown>
}

interface NetlifyUsage {
  active: boolean
  period_start_date: string
  period_end_date: string
  bandwidth?: { used: number; included: number; additional: number }
  requests?: { used: number; included: number; additional: number }
  credits?: { used: number; included: number; remaining: number }
  builds?: { active_builds: number; pending_concurrency: number }
}

async function fetchNetlifyAccount(token: string): Promise<NetlifyAccount> {
  const res = await fetch('https://api.netlify.com/api/v1/accounts', {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`Netlify accounts API HTTP ${res.status}`)
  const accounts = await res.json() as NetlifyAccount[]
  if (!accounts.length) throw new Error('No Netlify accounts found')
  return accounts[0]
}

async function fetchNetlifyUsage(token: string, accountSlug: string): Promise<NetlifyUsage> {
  const res = await fetch(`https://api.netlify.com/api/v1/accounts/${accountSlug}/usage`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`Netlify usage API HTTP ${res.status}`)
  return res.json() as Promise<NetlifyUsage>
}

async function triggerNetlifyBuild(deployHookUrl: string): Promise<{ deploy_id: string }> {
  const res = await fetch(deployHookUrl, {
    method: 'POST',
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`Netlify deploy hook HTTP ${res.status}`)
  return res.json()
}

Deno.serve(async (req) => {
  // Auth check
  const secret = Deno.env.get('CRON_SECRET')
  if (secret && req.headers.get('Authorization') !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const netlifyToken = Deno.env.get('NETLIFY_TOKEN')
  const deployHookUrl = Deno.env.get('NETLIFY_DEPLOY_HOOK_URL')

  if (!netlifyToken) {
    return new Response(JSON.stringify({ error: 'NETLIFY_TOKEN env var not set' }), { status: 500 })
  }

  let body: { confirm?: boolean; confirm_token?: string } = {}
  try {
    if (req.headers.get('content-type')?.includes('application/json')) {
      body = await req.json()
    }
  } catch { /* no body is fine */ }

  // ── STEP 2: Confirm and trigger build ─────────────────────────────────────
  if (body.confirm === true) {
    if (!deployHookUrl) {
      return new Response(JSON.stringify({ error: 'NETLIFY_DEPLOY_HOOK_URL env var not set' }), { status: 500 })
    }

    const token = body.confirm_token
    if (!token || !pendingTokens.has(token)) {
      return new Response(JSON.stringify({
        error: 'Invalid or expired confirm_token. Call without confirm first to get a fresh token.',
      }), { status: 400 })
    }

    const issuedAt = pendingTokens.get(token)!
    if (Date.now() - issuedAt > TOKEN_TTL_MS) {
      pendingTokens.delete(token)
      return new Response(JSON.stringify({ error: 'confirm_token expired (5 min limit). Request a new one.' }), { status: 400 })
    }

    pendingTokens.delete(token)

    try {
      const result = await triggerNetlifyBuild(deployHookUrl)
      await log('info', 'Netlify build triggered manually after credit check confirmation', { deploy_id: result.deploy_id })
      return new Response(JSON.stringify({
        ok: true,
        message: 'Build triggered successfully',
        deploy_id: result.deploy_id,
      }), { status: 200 })
    } catch (err) {
      await log('error', `Netlify build trigger failed: ${err}`)
      return new Response(JSON.stringify({ error: `Build trigger failed: ${err}` }), { status: 502 })
    }
  }

  // ── STEP 1: Fetch plan info and return for review ─────────────────────────
  try {
    const account = await fetchNetlifyAccount(netlifyToken)
    const usage = await fetchNetlifyUsage(netlifyToken, account.slug)

    const credits = usage.credits
    const creditsRemaining = credits?.remaining ?? null
    const creditsUsed = credits?.used ?? null
    const creditsIncluded = credits?.included ?? null

    // Calculate how many more production deploys are possible (15 credits each)
    const deploysRemaining = creditsRemaining != null ? Math.floor(creditsRemaining / 15) : null
    const isSafeToBuild = creditsRemaining != null ? creditsRemaining >= MIN_CREDITS_TO_BUILD : null

    // Issue a confirm token for step 2
    const confirmToken = generateToken()
    pendingTokens.set(confirmToken, Date.now())

    const planInfo = {
      account_name: account.name,
      account_type: account.type,
      period_start: usage.period_start_date,
      period_end: usage.period_end_date,
      credits: {
        included: creditsIncluded,
        used: creditsUsed,
        remaining: creditsRemaining,
        deploys_remaining: deploysRemaining,
      },
      bandwidth: usage.bandwidth ?? null,
      is_safe_to_build: isSafeToBuild,
      min_credits_required: MIN_CREDITS_TO_BUILD,
    }

    await log('info', 'Netlify plan check completed', planInfo as unknown as Record<string, unknown>)

    if (isSafeToBuild === false) {
      return new Response(JSON.stringify({
        ok: false,
        message: `⚠️ Build BLOCKED — only ${creditsRemaining} credits remaining (need at least ${MIN_CREDITS_TO_BUILD}). Wait for next billing cycle.`,
        plan: planInfo,
        confirm_token: null,
      }), { status: 200 })
    }

    return new Response(JSON.stringify({
      ok: true,
      message: isSafeToBuild
        ? `✅ Safe to build — ${creditsRemaining} credits remaining (~${deploysRemaining} deploys left)`
        : `ℹ️ Credit info retrieved (could not determine safety — check manually)`,
      plan: planInfo,
      next_step: deployHookUrl
        ? 'POST this endpoint with { "confirm": true, "confirm_token": "<token>" } to trigger build'
        : 'Set NETLIFY_DEPLOY_HOOK_URL env var to enable build triggering',
      confirm_token: deployHookUrl ? confirmToken : null,
    }), { status: 200 })

  } catch (err) {
    await log('error', `Netlify plan check failed: ${err}`)
    return new Response(JSON.stringify({ error: `Failed to fetch Netlify plan: ${err}` }), { status: 502 })
  }
})
