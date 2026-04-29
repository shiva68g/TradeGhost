'use client'

import React, { useEffect, useRef, useMemo, useState } from 'react'
import * as Babel from '@babel/standalone'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const NEXTJS_REGEX = /<script type="application\/x-nextjs-component">([\s\S]*?)<\/script>/

const RECHARTS_SCOPE = {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
};

function NextjsRenderer({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    let isMounted = true

    async function compileAndRender() {
      try {
        setError(null)
        if (!containerRef.current) return

        const cleanedCode = code
          .replace(/['"]use (client|server)['"];?/g, '')
          .replace(/import[\s\S]*?from\s+['"][^'"]+['"];?/g, '')

        const result = Babel.transform(cleanedCode, {
          presets: ['react', ['typescript', { isTSX: true, allExtensions: true }]],
          plugins: ['transform-modules-commonjs'],
        })

        const compiledCode = result.code
        if (!compiledCode) return

        const exports: any = {}
        const module = { exports }
        
        const scopeKeys = [
          'React', 'useState', 'useEffect', 'useMemo', 'useRef', 'useCallback', 
          'exports', 'module', 
          ...Object.keys(RECHARTS_SCOPE)
        ]

        const scopeValues = [
          React, React.useState, React.useEffect, React.useMemo, React.useRef, React.useCallback, 
          exports, module,
          ...Object.values(RECHARTS_SCOPE)
        ]

        const fn = new Function(...scopeKeys, compiledCode)
        fn(...scopeValues)

        const Component = exports.default || module.exports.default || exports.Component

        if (isMounted && containerRef.current) {
          const { createRoot } = await import('react-dom/client')
          if (rootRef.current) rootRef.current.unmount()
          rootRef.current = createRoot(containerRef.current)
          rootRef.current.render(React.createElement(Component))
        }
      } catch (err: any) {
        if (isMounted) setError(err.message)
      }
    }

    compileAndRender()

    return () => {
      isMounted = false
      if (rootRef.current) {
        const r = rootRef.current
        setTimeout(() => { try { r.unmount() } catch(e) {} }, 0)
        rootRef.current = null
      }
    }
  }, [code, mounted])

  if (!mounted) {
    return <div className="min-h-[300px] w-full bg-transparent animate-pulse" />
  }

  if (error) return <div className="py-2 text-red-500 text-sm font-mono">⚠️ {error}</div>

  return <div ref={containerRef} className="not-prose w-full h-full" suppressHydrationWarning /> 
}

export function PostContent({ content }: { content: string }) {
  const match = useMemo(() => content.match(NEXTJS_REGEX), [content])
  const html = useMemo(() => match ? content.replace(NEXTJS_REGEX, '').trim() : content, [content, match])
  const nextjsCode = match ? match[1] : null

  return (
    <div className="w-full">
      {html && (
        <div 
          className="prose dark:prose-invert max-w-none" 
          dangerouslySetInnerHTML={{ __html: html }} 
        />
      )}
      {nextjsCode && (
        <div className="mt-6 w-full bg-transparent">
          <NextjsRenderer code={nextjsCode} />
        </div>
      )}
    </div>
  )
}