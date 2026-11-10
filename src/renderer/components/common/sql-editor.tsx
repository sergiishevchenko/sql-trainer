import Editor, { type OnMount } from '@monaco-editor/react'
import { useEffect, useRef } from 'react'
import { useApi } from '@/lib/query'
import { EDITOR_THEME, formatSql, monaco, setupMonaco } from '@/lib/monaco'
import { Skeleton } from '@/components/ui/skeleton'

setupMonaco()

export interface SqlEditorHandle {
  format: () => void
  focus: () => void
}

export function SqlEditor({
  value,
  onChange,
  onRun,
  onSubmit,
  readOnly,
  handleRef,
  height = '100%'
}: {
  value: string
  onChange?: (value: string) => void
  onRun?: () => void
  onSubmit?: () => void
  readOnly?: boolean
  handleRef?: React.RefObject<SqlEditorHandle | null>
  height?: string | number
}) {
  const settings = useApi('settings:get')
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const actions = useRef({ onRun, onSubmit })
  actions.current = { onRun, onSubmit }

  useEffect(() => {
    if (!handleRef) return
    handleRef.current = {
      format: () => {
        const editor = editorRef.current
        if (!editor) return
        const formatted = formatSql(editor.getValue())
        editor.executeEdits('format', [{ range: editor.getModel()!.getFullModelRange(), text: formatted }])
        editor.pushUndoStop()
      },
      focus: () => editorRef.current?.focus()
    }
  }, [handleRef])

  useEffect(() => {
    editorRef.current?.updateOptions({
      fontSize: settings.data?.editorFontSize ?? 14,
      minimap: { enabled: settings.data?.editorMinimap ?? false },
      wordWrap: settings.data?.editorWordWrap ? 'on' : 'off'
    })
  }, [settings.data])

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => actions.current.onRun?.())
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => actions.current.onSubmit?.())
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
      const formatted = formatSql(editor.getValue())
      editor.executeEdits('format', [{ range: editor.getModel()!.getFullModelRange(), text: formatted }])
    })
    if (!readOnly) editor.focus()
  }

  return (
    <div className="h-full w-full" data-testid="sql-editor">
      <Editor
        height={height}
        language="sql"
        theme={EDITOR_THEME}
        value={value}
        onChange={(v) => onChange?.(v ?? '')}
        onMount={handleMount}
        loading={<Skeleton className="m-3 h-24 w-[calc(100%-1.5rem)]" />}
        options={{
          readOnly,
          fontFamily: "'JetBrains Mono Variable', ui-monospace, monospace",
          fontLigatures: true,
          fontSize: settings.data?.editorFontSize ?? 14,
          minimap: { enabled: settings.data?.editorMinimap ?? false },
          wordWrap: settings.data?.editorWordWrap ? 'on' : 'off',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: 'line',
          lineNumbersMinChars: 3,
          tabSize: 2,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          quickSuggestions: { other: true, comments: false, strings: false },
          suggestOnTriggerCharacters: true,
          fixedOverflowWidgets: true,
          scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 }
        }}
      />
    </div>
  )
}
