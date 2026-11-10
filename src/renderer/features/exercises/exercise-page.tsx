import { useParams } from 'react-router'
import { Page } from '@/components/common/page'
import { ErrorState } from '@/components/common/states'
import { Skeleton } from '@/components/ui/skeleton'
import { useApi } from '@/lib/query'
import { ExerciseSolver } from './solver/exercise-solver'

export function ExercisePage() {
  const { exerciseId = '' } = useParams()
  const exercise = useApi('exercises:get', { exerciseId }, { staleTime: 0 })

  if (exercise.isPending) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b px-4 py-3">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <div className="flex flex-1 gap-px">
          <Skeleton className="m-4 w-[36%] rounded-xl" />
          <Skeleton className="m-4 flex-1 rounded-xl" />
        </div>
      </div>
    )
  }
  if (exercise.isError) {
    return (
      <Page>
        <ErrorState error={exercise.error} onRetry={() => exercise.refetch()} />
      </Page>
    )
  }
  return <ExerciseSolver key={exercise.data.id} exercise={exercise.data} />
}
