/** @type {import('next').NextConfig} */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const IMAGEKIT_URL = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ?? 'https://ik.imagekit.io'

const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: ${IMAGEKIT_URL} https://ik.imagekit.io https://assets.coingecko.com`,
  `font-src 'self' data:`,
  `connect-src 'self' ${SUPABASE_URL} wss://*.supabase.co https://api.coingecko.com https://v6.exchangerate-api.com https://api.web3forms.com`,
  `frame-src 'self'`,
  `frame-ancestors 'self' https://*.replit.dev https://*.replit.app https://*.repl.co`,
  `base-uri 'self'`,
  `form-action 'self' https://api.web3forms.com`,
].join('; ')

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'ik.imagekit.io' },
      { protocol: 'https', hostname: '*.imagekit.io' },
      { protocol: 'https', hostname: 'assets.coingecko.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/sitemap.xml',
        headers: [
          { key: 'Content-Type', value: 'application/xml' },
          { key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ]
  },
}

export default nextConfig
