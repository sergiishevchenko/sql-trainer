import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router'
import { RecoveryCodeDialog } from '@/features/auth/recovery-code-dialog'
import { useHeartbeat } from '@/hooks/use-heartbeat'
import { CommandPalette } from './command-palette'
import { LevelUpDialog } from './level-up-dialog'
import { NAV_ITEMS } from './nav-items'
import { Sidebar } from './sidebar'

export function AppShell() {
  const navigate = useNavigate()
  const [paletteOpen, setPaletteOpen] = useState(false)
  useHeartbeat(true)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod || e.altKey) return
      if (e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
        return
      }
      const index = Number(e.key) - 1
      if (!e.shiftKey && Number.isInteger(index) && index >= 0 && index < NAV_ITEMS.length) {
        e.preventDefault()
        navigate(NAV_ITEMS[index].to)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return (
    <div className="flex h-full">
      <Sidebar onOpenPalette={() => setPaletteOpen(true)} />
      <main className="relative min-w-0 flex-1">
        <div className="drag-region absolute inset-x-0 top-0 z-0 h-3" />
        <Outlet />
      </main>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <RecoveryCodeDialog />
      <LevelUpDialog />
    </div>
  )
}
