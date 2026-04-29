'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Button } from '@/components/ui/button'
import {
  Bold, Italic, List, ListOrdered, Quote, Heading2, Heading3,
  Link as LinkIcon, Image as ImageIcon, Undo, Redo, Code, Code2, FileText, Type, Braces
} from 'lucide-react'
import { useEffect, useState, useRef, useCallback } from 'react'

interface PostEditorProps {
  content: string
  onChange: (content: string) => void
}

type EditorMode = 'rich' | 'html' | 'text' | 'nextjs'

const NEXTJS_OPEN_TAG = '<!-- __NEXTJS_CODE_START__ --><script type="application/x-nextjs-component">'
const NEXTJS_CLOSE_TAG = '</script><!-- __NEXTJS_CODE_END__ -->'

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
}

function extractScripts(html: string): { clean: string; scripts: string } {
  const scripts: string[] = []
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, (match) => {
    scripts.push(match)
    return ''
  })
  return { clean: clean.trim(), scripts: scripts.join('\n') }
}

function extractNextjsCode(html: string): { html: string; nextjsCode: string } {
  const regex = /<!-- __NEXTJS_CODE_START__ --><script type="application\/x-nextjs-component">([\s\S]*?)<\/script><!-- __NEXTJS_CODE_END__ -->/
  const match = html.match(regex)
  if (match) {
    const nextjsCode = match[1]
    const cleanHtml = html.replace(regex, '').trim()
    return { html: cleanHtml, nextjsCode }
  }
  return { html, nextjsCode: '' }
}

function injectNextjsCode(html: string, code: string): string {
  if (!code.trim()) return html
  return html + '\n' + NEXTJS_OPEN_TAG + code + NEXTJS_CLOSE_TAG
}

export function PostEditor({ content, onChange }: PostEditorProps) {
  const [mode, setMode] = useState<EditorMode>('rich')
  const [htmlValue, setHtmlValue] = useState(() => extractNextjsCode(content).html)
  const [textValue, setTextValue] = useState(() => stripHtml(extractNextjsCode(content).html))
  const [nextjsCode, setNextjsCode] = useState(() => extractNextjsCode(content).nextjsCode)
  const lastModeRef = useRef<EditorMode>('rich')
  const scriptCacheRef = useRef<string>('')

  const buildFullContent = useCallback((html: string, code: string) => {
    return code.trim() ? injectNextjsCode(html, code) : html
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Start writing your post...' }),
    ],
    content: extractNextjsCode(extractScripts(content).clean).html,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const withScripts = scriptCacheRef.current ? html + '\n' + scriptCacheRef.current : html
      setHtmlValue(withScripts)
      onChange(buildFullContent(withScripts, nextjsCode))
    },
    editorProps: {
      attributes: { class: 'tiptap min-h-[400px] focus:outline-none' },
    },
  })

  useEffect(() => {
    if (editor && mode === 'rich' && content !== editor.getHTML()) {
      const { html: htmlWithoutNextjs, nextjsCode: code } = extractNextjsCode(content)
      const { clean, scripts } = extractScripts(htmlWithoutNextjs)
      scriptCacheRef.current = scripts
      editor.commands.setContent(clean, false)
      setHtmlValue(htmlWithoutNextjs)
      setTextValue(stripHtml(clean))
      setNextjsCode(code)
    }
  }, [content, editor, mode])

  function switchMode(newMode: EditorMode) {
    const prev = lastModeRef.current
    if (newMode === prev) return

    if (prev === 'html') {
      const { clean, scripts } = extractScripts(htmlValue)
      scriptCacheRef.current = scripts
      if (editor) editor.commands.setContent(clean, false)
      setTextValue(stripHtml(clean))
      onChange(buildFullContent(htmlValue, nextjsCode))
    } else if (prev === 'rich') {
      const html = editor?.getHTML() ?? ''
      const merged = scriptCacheRef.current ? html + '\n' + scriptCacheRef.current : html
      setHtmlValue(merged)
      setTextValue(stripHtml(html))
    } else if (prev === 'text') {
      const wrapped = textValue
        .split('\n')
        .map(line => line.trim() ? `<p>${line}</p>` : '')
        .join('')
      const merged = scriptCacheRef.current ? wrapped + '\n' + scriptCacheRef.current : wrapped
      setHtmlValue(merged)
      if (editor) editor.commands.setContent(wrapped, false)
      onChange(buildFullContent(merged, nextjsCode))
    } else if (prev === 'nextjs') {
      onChange(buildFullContent(htmlValue, nextjsCode))
    }

    lastModeRef.current = newMode
    setMode(newMode)
  }

  if (!editor) return <div className="h-64 border rounded-md flex items-center justify-center text-muted-foreground">Loading editor...</div>

  function addImage() {
    const url = prompt('Image URL:')
    if (url) editor?.chain().focus().setImage({ src: url }).run()
  }

  function setLink() {
    const url = prompt('URL:')
    if (url) editor?.chain().focus().setLink({ href: url }).run()
  }

  const tools = [
    { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), label: 'Bold' },
    { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), label: 'Italic' },
    { icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }), label: 'H2' },
    { icon: Heading3, action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }), label: 'H3' },
    { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList'), label: 'Bullet List' },
    { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList'), label: 'Ordered List' },
    { icon: Quote, action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive('blockquote'), label: 'Quote' },
    { icon: Code, action: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive('codeBlock'), label: 'Code' },
    { icon: LinkIcon, action: setLink, active: editor.isActive('link'), label: 'Link' },
    { icon: ImageIcon, action: addImage, active: false, label: 'Image' },
    { icon: Undo, action: () => editor.chain().focus().undo().run(), active: false, label: 'Undo' },
    { icon: Redo, action: () => editor.chain().focus().redo().run(), active: false, label: 'Redo' },
  ]

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b bg-muted/10">
        <Button
          type="button"
          variant={mode === 'rich' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => switchMode('rich')}
        >
          <Type className="h-3.5 w-3.5" />
          Rich Text
        </Button>
        <Button
          type="button"
          variant={mode === 'html' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => switchMode('html')}
        >
          <Code2 className="h-3.5 w-3.5" />
          HTML
        </Button>
        <Button
          type="button"
          variant={mode === 'text' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => switchMode('text')}
        >
          <FileText className="h-3.5 w-3.5" />
          Plain Text
        </Button>
        <Button
          type="button"
          variant={mode === 'nextjs' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => switchMode('nextjs')}
        >
          <Braces className="h-3.5 w-3.5" />
          Next.js
        </Button>
        <div className="ml-auto flex items-center gap-2">
          {nextjsCode.trim() && mode !== 'nextjs' && (
            <span className="text-xs text-blue-500 font-medium">Next.js code attached</span>
          )}
          {scriptCacheRef.current && mode !== 'html' && (
            <span className="text-xs text-muted-foreground">Scripts preserved</span>
          )}
        </div>
      </div>

      {mode === 'rich' && (
        <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30">
          {tools.map((tool) => {
            const Icon = tool.icon
            return (
              <Button
                key={tool.label}
                variant={tool.active ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={tool.action}
                type="button"
                title={tool.label}
              >
                <Icon className="h-4 w-4" />
              </Button>
            )
          })}
        </div>
      )}

      {mode === 'rich' && (
        <EditorContent editor={editor} className="bg-background" />
      )}

      {mode === 'html' && (
        <textarea
          className="w-full min-h-[400px] p-4 bg-background font-mono text-sm focus:outline-none resize-y"
          value={htmlValue}
          onChange={(e) => {
            setHtmlValue(e.target.value)
            onChange(buildFullContent(e.target.value, nextjsCode))
          }}
          placeholder="Enter raw HTML here — <script> tags are supported..."
          spellCheck={false}
        />
      )}

      {mode === 'text' && (
        <textarea
          className="w-full min-h-[400px] p-4 bg-background text-sm focus:outline-none resize-y"
          value={textValue}
          onChange={(e) => {
            setTextValue(e.target.value)
          }}
          placeholder="Type plain text here. Switching to another mode will wrap each line in a paragraph tag."
        />
      )}

      {mode === 'nextjs' && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2 px-3 py-2 border-b bg-zinc-950 text-zinc-400 text-xs">
            <Braces className="h-3.5 w-3.5 text-blue-400" />
            <span className="font-semibold text-blue-400">Next.js Component</span>
            <span className="ml-1 text-zinc-500">— paste your .tsx / .jsx code here</span>
            {nextjsCode.trim() && (
              <button
                type="button"
                onClick={() => {
                  setNextjsCode('')
                  onChange(buildFullContent(htmlValue, ''))
                }}
                className="ml-auto text-zinc-500 hover:text-red-400 transition-colors text-xs"
              >
                Clear
              </button>
            )}
          </div>
          <textarea
            className="w-full min-h-[480px] p-4 bg-zinc-950 text-zinc-100 font-mono text-sm focus:outline-none resize-y leading-relaxed tracking-wide"
            value={nextjsCode}
            onChange={(e) => {
              setNextjsCode(e.target.value)
              onChange(buildFullContent(htmlValue, e.target.value))
            }}
            placeholder={`// Paste your Next.js component code here\n// Example:\n\nexport default function MyComponent() {\n  return (\n    <div>\n      <h1>Hello from Next.js!</h1>\n    </div>\n  )\n}`}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
          <div className="px-3 py-2 border-t bg-zinc-900 text-xs text-zinc-500 flex items-center justify-between">
            <span>Supports JSX, TypeScript, imports, hooks, and server/client components</span>
            {nextjsCode.trim() && (
              <span className="text-zinc-400">{nextjsCode.split('\n').length} lines</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
