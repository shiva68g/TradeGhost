import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const PostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be URL-safe'),
  content: z.string().optional(),
  excerpt: z.string().max(500).optional(),
  cover_image: z.string().url().optional().or(z.literal('')),
  cover_image_alt: z.string().max(200).optional(),
  status: z.enum(['draft', 'published']),
  meta_title: z.string().max(70).optional(),
  meta_description: z.string().max(160).optional(),
})

export const PageSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be URL-safe'),
  content: z.string().optional(),
  status: z.enum(['draft', 'published']),
  meta_title: z.string().max(70).optional(),
  meta_description: z.string().max(160).optional(),
})

export const NavItemSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, 'Label is required'),
  href: z.string().min(1, 'Link is required'),
  parent_id: z.string().nullable().optional(),
  order: z.number().default(0),
  type: z.enum(['link', 'title', 'dropdown', 'nested_dropdown']).default('link'),
})

export const FooterItemSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, 'Label is required'),
  href: z.string().optional(),
  parent_id: z.string().nullable().optional(),
  order: z.number().default(0),
  type: z.enum(['link', 'title', 'separator', 'dropdown', 'nested_dropdown']).default('link'),
})

export const MediaUploadSchema = z.object({
  alt_text: z.string().min(1, 'Alt text is required for accessibility'),
})

export const SettingsSchema = z.object({
  site_name: z.string().min(1, 'Site name is required').max(100),
  site_description: z.string().max(300).optional(),
  logo_url: z.string().optional(),
  favicon_url: z.string().optional(),
  market_india_more_url: z.string().optional(),
  market_global_more_url: z.string().optional(),
  market_gainers_more_url: z.string().optional(),
  market_losers_more_url: z.string().optional(),
  market_forex_more_url: z.string().optional(),
  market_crypto_more_url: z.string().optional(),
})

export const SeoSchema = z.object({
  default_meta_title: z.string().max(70).optional(),
  default_meta_description: z.string().max(160).optional(),
  default_og_image: z.string().url().optional().or(z.literal('')),
  robots_txt: z.string().optional(),
})

export type LoginInput = z.infer<typeof LoginSchema>
export type PostInput = z.infer<typeof PostSchema>
export type PageInput = z.infer<typeof PageSchema>
export type NavItemInput = z.infer<typeof NavItemSchema>
export type FooterItemInput = z.infer<typeof FooterItemSchema>
export type SettingsInput = z.infer<typeof SettingsSchema>
export type SeoInput = z.infer<typeof SeoSchema>
