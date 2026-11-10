import { useEffect, useState } from 'react'
import { monaco, setupMonaco } from '@/lib/monaco'
import { cn } from '@/lib/utils'

setupMonaco()

/**
 * Read-only syntax highlighted SQL rendered through Monaco's tokenizer.
 */
export function SqlCode({ code, className }: { code: string; className?: string }) {
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    monaco.editor.setTheme('sql-mastery-dark')
    monaco.editor.colorize(code, 'sql', { tabSize: 2 }).then((result) => {
      if (active) setHtml(result)
    })
    return () => {
      active = false
    }
  }, [code])

  return (
    <pre className={cn('overflow-x-auto rounded-lg border bg-[#0d0d12] p-3 font-mono text-[12.5px] leading-relaxed', className)}>
      {html === null ? <code>{code}</code> : <code dangerouslySetInnerHTML={{ __html: html }} />}
    </pre>
  )
}
