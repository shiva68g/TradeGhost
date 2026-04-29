import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  '/api/search': { max: 20, windowMs: 60_000 },
  '/api/posts': { max: 60, windowMs: 60_000 },
  '/api/analytics/track': { max: 30, windowMs: 60_000 },
}

function checkRateLimit(path: string, ip: string): boolean {
  const limit = RATE_LIMITS[path]
  if (!limit) return true
  const key = `${path}:${ip}`
  const now = Date.now()
  const entry = rateLimitMap.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + limit.windowMs })
    return true
  }
  if (entry.count >= limit.max) return false
  entry.count++
  return true
}

export async function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const path = request.nextUrl.pathname

  if (!checkRateLimit(path, ip)) {
    return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname.startsWith('/admin'))
    return NextResponse.redirect(new URL('/login', request.url))

  if (user && request.nextUrl.pathname === '/admin')
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))

  if (user && request.nextUrl.pathname === '/login')
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*', '/login', '/api/search', '/api/posts', '/api/analytics/:path*'],
}