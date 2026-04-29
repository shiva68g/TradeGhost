'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Upload, Trash2, Copy, ImageIcon, X, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import type { Media } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

function useMedia() {
  return useQuery<Media[]>({
    queryKey: ['media'],
    queryFn: async () => {
      const res = await fetch('/api/media/list')
      if (!res.ok) throw new Error('Failed to load media')
      const { data } = await res.json()
      return data ?? []
    },
    staleTime: 60_000,
    refetchInterval: false,
  })
}

function shortenFileName(name: string, max = 42) {
  if (name.length <= max) return name
  const dot = name.lastIndexOf('.')
  const ext = dot > 0 ? name.slice(dot) : ''
  const base = dot > 0 ? name.slice(0, dot) : name
  const keep = Math.max(12, max - ext.length - 3)
  return `${base.slice(0, keep)}...${ext}`
}

interface LightboxProps {
  items: Media[]
  index: number | null
  onClose: () => void
  onChange: (i: number) => void
  onDelete: (id: string) => void
  onCopy: (url: string) => void
  isDeleting: boolean
}

function Lightbox({ items, index, onClose, onChange, onDelete, onCopy, isDeleting }: LightboxProps) {
  const media = index !== null ? items[index] : null
  const [imgKey, setImgKey] = useState(0)

  useEffect(() => { setImgKey((k) => k + 1) }, [index])

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!media || index === null) return
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowLeft') onChange((index - 1 + items.length) % items.length)
    if (e.key === 'ArrowRight') onChange((index + 1) % items.length)
  }, [media, index, items.length, onClose, onChange])

  useEffect(() => {
    if (media) {
      document.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [media, handleKey])

  if (!media || index === null) return null

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200" />

      {items.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onChange((index - 1 + items.length) % items.length) }}
          className="absolute left-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label="Previous"
        >
          <ChevronLeft size={26} />
        </button>
      )}

      <div
        key={imgKey}
        className="relative z-10 flex flex-col items-center gap-3 max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'lightboxImageIn 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={media.url}
          alt={media.alt_text}
          className="max-w-[85vw] max-h-[75vh] object-contain rounded-lg shadow-2xl"
        />
        <p className="text-sm text-white/70 text-center max-w-[85vw] truncate" title={media.alt_text}>{media.alt_text}</p>

        {items.length > 1 && (
          <div className="flex gap-1.5 justify-center">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => onChange(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === index ? 'bg-white' : 'bg-white/30 hover:bg-white/60'}`}
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-white hover:bg-white/20 gap-1.5 text-xs"
            onClick={() => onCopy(media.url)}
          >
            <Copy size={13} /> Copy URL
          </Button>
          <a href={media.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-8 text-white hover:bg-white/20 gap-1.5 text-xs">
              <ExternalLink size={13} /> Open
            </Button>
          </a>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 text-red-400 hover:bg-white/10 gap-1.5 text-xs">
                <Trash2 size={13} /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete image?</AlertDialogTitle>
                <AlertDialogDescription>This will delete from ImageKit and the database.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={isDeleting}
                  onClick={() => onDelete(media.id)}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  {isDeleting ? 'Deleting…' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {items.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onChange((index + 1) % items.length) }}
          className="absolute right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label="Next"
        >
          <ChevronRight size={26} />
        </button>
      )}

      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Close"
      >
        <X size={20} />
      </button>

      <style>{`
        @keyframes lightboxImageIn {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

export default function AdminMediaPage() {
  const { data: mediaItems, isLoading } = useMedia()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [altText, setAltText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const items = mediaItems ?? []
  const allSelected = items.length > 0 && selectedIds.length === items.length

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => items.some((item) => item.id === id)))
  }, [items])

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !altText.trim()) throw new Error('File and alt text are required')
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('alt_text', altText)
      const res = await fetch('/api/media/upload', { method: 'POST', body: formData })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? 'Upload failed') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] })
      toast.success('Image uploaded')
      setUploadOpen(false)
      setAltText('')
      setSelectedFile(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/media/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      return id
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['media'] })
      toast.success('Image deleted')
      setPreviewIndex(null)
      setSelectedIds((current) => current.filter((itemId) => itemId !== id))
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(async (id) => {
        const res = await fetch(`/api/media/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Delete failed')
      }))
      return ids.length
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['media'] })
      toast.success(`${count} image${count === 1 ? '' : 's'} deleted`)
      setSelectedIds([])
      setPreviewIndex(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function handleCopyUrl(url: string) {
    navigator.clipboard.writeText(url)
    toast.success('URL copied')
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id])
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? [] : items.map((item) => item.id))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Media</h1>
        <div className="flex flex-wrap items-center gap-2">
          {items.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="h-4 w-4 rounded border-border" />
              Select all
            </label>
          )}
          {selectedIds.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={bulkDeleteMutation.isPending}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete selected ({selectedIds.length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete selected images?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete {selectedIds.length} selected image{selectedIds.length === 1 ? '' : 's'}.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => bulkDeleteMutation.mutate(selectedIds)} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-1" /> Upload
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="aspect-square rounded-md" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-16 text-center text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No media yet. Upload your first image.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map((media, i) => (
            <div
              key={media.id}
              className={`group relative aspect-square border rounded-md overflow-hidden bg-muted hover:scale-[1.02] hover:shadow-lg transition-all duration-200 ${selectedIds.includes(media.id) ? 'ring-2 ring-primary' : ''}`}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(media.id)}
                onChange={() => toggleSelected(media.id)}
                onClick={(e) => e.stopPropagation()}
                className="absolute left-2 top-2 z-10 h-4 w-4 rounded border-white/70 shadow"
                aria-label={`Select ${media.alt_text}`}
              />
              <button
                type="button"
                onClick={() => setPreviewIndex(i)}
                className="absolute inset-0 cursor-pointer"
                aria-label={`Preview ${media.alt_text}`}
              >
                <Image src={media.url} alt={media.alt_text} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="200px" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
                  <p className="w-full bg-black/60 text-white text-[10px] px-2 py-1 truncate" title={media.alt_text}>{media.alt_text}</p>
                </div>
              </button>
            </div>
          ))}
        </div>
      )}

      <Lightbox
        items={items}
        index={previewIndex}
        onClose={() => setPreviewIndex(null)}
        onChange={setPreviewIndex}
        onDelete={(id) => deleteMutation.mutate(id)}
        onCopy={handleCopyUrl}
        isDeleting={deleteMutation.isPending}
      />

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Image</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors min-w-0 ${dragOver ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'}`}
              onClick={() => fileInputRef.current?.click()}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files[0]; if (file) setSelectedFile(file) }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
            >
              {selectedFile ? (
                <p className="mx-auto max-w-full overflow-hidden truncate text-sm font-medium" title={selectedFile.name}>{shortenFileName(selectedFile.name)}</p>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Drag & drop or click to browse</p>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setSelectedFile(f) }} />
            <div className="space-y-2">
              <Label>Alt Text <span className="text-destructive">*</span></Label>
              <Input value={altText} onChange={(e) => setAltText(e.target.value)} placeholder="Describe the image…" />
              <p className="text-xs text-muted-foreground">Required for accessibility and SEO</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
              <Button onClick={() => uploadMutation.mutate()} disabled={uploadMutation.isPending || !selectedFile || !altText.trim()}>
                {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
