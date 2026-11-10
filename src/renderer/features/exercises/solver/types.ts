import type { RefObject } from 'react'
import type { ExerciseType } from '@shared/constants/domain'
import type { DatasetSchema } from '@shared/types/engine'
import type { ExerciseAnswer, PublicExercise, PublicExerciseContent } from '@shared/types/exercise'
import type { SqlEditorHandle } from '@/components/common/sql-editor'

export type ContentOf<T extends ExerciseType> = PublicExerciseContent extends infer C
  ? C extends { type: infer U }
    ? T extends U
      ? C
      : never
    : never
  : never

export interface WorkspaceProps<T extends ExerciseType = ExerciseType> {
  exercise: PublicExercise
  content: ContentOf<T>
  onAnswer: (answer: ExerciseAnswer | null) => void
  onRun: () => void
  onSubmit: () => void
  disabled: boolean
  editorRef: RefObject<SqlEditorHandle | null>
  schema: DatasetSchema | undefined
  initialSql?: string | null
}

export const RUNNABLE_TYPES: ExerciseType[] = [
  'write_query',
  'fix_bug',
  'business_case',
  'challenge',
  'choose_query',
  'fill_blank',
  'join_builder',
  'order_parts'
]

export const SQL_TYPES: ExerciseType[] = ['write_query', 'fix_bug', 'business_case', 'challenge']
