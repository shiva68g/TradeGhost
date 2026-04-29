import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'
import slugifyLib from 'slugify'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), 'MMM d, yyyy HH:mm')
}

export function slugify(text: string): string {
  return slugifyLib(text, { lower: true, strict: true, trim: true })
}

export function uniqueSlug(base: string, existingSlugs: string[]): string {
  const slug = slugify(base)
  if (!existingSlugs.includes(slug)) return slug
  let counter = 2
  while (existingSlugs.includes(`${slug}-${counter}`)) counter++
  return `${slug}-${counter}`
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—'
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`
  return value.toFixed(2)
}

export function formatPercentage(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function isPositive(value: number): boolean {
  return value >= 0
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}
