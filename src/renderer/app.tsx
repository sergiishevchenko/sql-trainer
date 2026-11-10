import { QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import { Database } from 'lucide-react'
import { useEffect } from 'react'
import { HashRouter } from 'react-router'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useLocaleStore } from '@/i18n'
import { invoke, queryClient, useApi } from '@/lib/query'
import { useAuthStore } from '@/stores/auth'
import { AppRoutes } from './routes'

function MotionPreferences({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status)
  const settings = useApi('settings:get', undefined, { enabled: status === 'authenticated' })
  return <MotionConfig reducedMotion={settings.data?.reduceMotion ? 'always' : 'user'}>{children}</MotionConfig>
}

function Splash() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex size-10 animate-pulse items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Database className="size-5" />
      </div>
    </div>
  )
}

function Bootstrap() {
  const status = useAuthStore((s) => s.status)
  const setUser = useAuthStore((s) => s.setUser)
  const setLocale = useLocaleStore((s) => s.setLocale)

  useEffect(() => {
    invoke('app:info')
      .then((info) => setLocale(info.locale))
      .catch(() => undefined)
      .then(() => invoke('auth:session'))
      .then((user) => setUser(user))
      .catch(() => setUser(null))
  }, [setUser, setLocale])

  if (status === 'loading') return <Splash />
  return (
    <MotionPreferences>
      <AppRoutes authenticated={status === 'authenticated'} />
    </MotionPreferences>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <HashRouter>
          <Bootstrap />
        </HashRouter>
        <Toaster theme="dark" position="bottom-right" richColors closeButton toastOptions={{ className: 'font-sans' }} />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
