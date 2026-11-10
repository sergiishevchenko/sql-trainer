import { Briefcase, Bug, PencilLine, Swords } from 'lucide-react'
import type { ReactNode } from 'react'
import { useT } from '@/i18n'
import type { WorkspaceProps } from '../types'
import { QueryEditorWorkspace } from './query-editor'

function Banner({ icon, tone, title, text }: { icon: ReactNode; tone: string; title: string; text: string }) {
  return (
    <div className={`flex items-center gap-2.5 border-b px-4 py-2 text-xs ${tone}`}>
      {icon}
      <span className="font-medium">{title}</span>
      <span className="truncate text-muted-foreground">{text}</span>
    </div>
  )
}

export function WriteQueryWorkspace(props: WorkspaceProps<'write_query'>) {
  const t = useT()
  return (
    <QueryEditorWorkspace
      {...props}
      banner={
        props.content.mode === 'mutation' ? (
          <Banner
            icon={<PencilLine className="size-3.5" />}
            tone="bg-info/5 text-info"
            title={t('solver.banners.mutationTitle')}
            text={t('solver.banners.mutationText')}
          />
        ) : null
      }
    />
  )
}

export function FixBugWorkspace(props: WorkspaceProps<'fix_bug'>) {
  const t = useT()
  return (
    <QueryEditorWorkspace
      {...props}
      banner={<Banner icon={<Bug className="size-3.5" />} tone="bg-warning/5 text-warning" title={t('solver.banners.fixTitle')} text={t('solver.banners.fixText')} />}
    />
  )
}

export function BusinessCaseWorkspace(props: WorkspaceProps<'business_case'>) {
  const t = useT()
  return (
    <QueryEditorWorkspace
      {...props}
      banner={
        <Banner
          icon={<Briefcase className="size-3.5" />}
          tone="bg-primary/5 text-primary"
          title={t('solver.banners.businessTitle')}
          text={t('solver.banners.businessText')}
        />
      }
    />
  )
}

export function ChallengeWorkspace(props: WorkspaceProps<'challenge'>) {
  const t = useT()
  return (
    <QueryEditorWorkspace
      {...props}
      banner={
        <Banner
          icon={<Swords className="size-3.5" />}
          tone="bg-destructive/5 text-destructive"
          title={t('solver.banners.challengeTitle')}
          text={t('solver.banners.challengeText')}
        />
      }
    />
  )
}
