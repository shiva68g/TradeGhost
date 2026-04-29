export interface Post {
  id: string
  title: string
  slug: string
  content: string | null
  excerpt: string | null
  cover_image: string | null
  cover_image_alt: string
  status: 'draft' | 'published'
  views: number
  meta_title: string | null
  meta_description: string | null
  created_at: string
  updated_at: string
}

export interface Page {
  id: string
  title: string
  slug: string
  content: string | null
  status: 'draft' | 'published'
  meta_title: string | null
  meta_description: string | null
  created_at: string
  updated_at: string
}

export type NavItemType = 'link' | 'title' | 'dropdown' | 'nested_dropdown'

export interface NavItem {
  id: string
  label: string
  href: string
  parent_id: string | null
  order: number
  type: NavItemType
}

export interface FooterColumn {
  id: string
  title: string
  order: number
}

export type FooterItemType = 'link' | 'title' | 'dropdown' | 'nested_dropdown' | 'separator'

export interface FooterItem {
  id: string
  label: string
  href: string
  column_id: string | null
  parent_id: string | null
  order: number
  type: FooterItemType
}

export interface FooterColumnWithItems extends FooterColumn {
  items: FooterItem[]
}

export interface Setting {
  key: string
  value: string
}

export interface Media {
  id: string
  url: string
  imagekit_file_id: string | null
  alt_text: string
  created_at: string
}

export interface MarketData {
  id: string
  data: unknown
  source: string
  updated_at: string
}

export interface Log {
  id: string
  level: 'info' | 'warn' | 'error'
  message: string
  context: Record<string, unknown> | null
  created_at: string
}

export interface MarketItem {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume?: number
}

export interface CryptoItem {
  id: string
  symbol: string
  name: string
  image: string
  current_price: number
  price_change_percentage_24h: number
  market_cap: number
  total_volume: number
}

export interface ForexRates {
  [pair: string]: number
}

export interface ApiResponse<T> {
  data?: T
  error?: string
}