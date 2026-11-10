import {
  MutationCache,
  QueryCache,
  QueryClient,
  useMutation,
  useQuery,
  type UseMutationOptions,
  type UseQueryOptions
} from '@tanstack/react-query'
import { toast } from 'sonner'
import type { IpcChannel } from '@shared/ipc/channels'
import type { IpcInput, IpcOutput } from '@shared/ipc/contract'
import { ApiError, call } from './api'
import { errorMessage } from './errors'
import { useAuthStore } from '@/stores/auth'

function handleGlobalError(error: unknown): void {
  if (error instanceof ApiError && error.code === 'unauthorized') {
    useAuthStore.getState().setUser(null)
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleGlobalError }),
  mutationCache: new MutationCache({ onError: handleGlobalError }),
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false, staleTime: 15_000 },
    mutations: { retry: false }
  }
})

export function invoke<C extends IpcChannel>(channel: C, input?: IpcInput<C>): Promise<IpcOutput<C>> {
  return (call as (c: C, i?: IpcInput<C>) => Promise<IpcOutput<C>>)(channel, input)
}

export function useApi<C extends IpcChannel>(
  channel: C,
  input?: IpcInput<C>,
  options?: Omit<UseQueryOptions<IpcOutput<C>, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<IpcOutput<C>, ApiError>({
    queryKey: input === undefined ? [channel] : [channel, input],
    queryFn: () => invoke(channel, input),
    ...options
  })
}

export function useApiMutation<C extends IpcChannel>(
  channel: C,
  options?: Omit<UseMutationOptions<IpcOutput<C>, ApiError, IpcInput<C>>, 'mutationFn'> & { toastErrors?: boolean }
) {
  const { toastErrors = true, onError, ...rest } = options ?? {}
  return useMutation<IpcOutput<C>, ApiError, IpcInput<C>>({
    mutationFn: (input) => invoke(channel, input),
    onError: (...args) => {
      const [error] = args
      if (toastErrors && error.code !== 'validation' && error.code !== 'unauthorized') toast.error(errorMessage(error))
      onError?.(...args)
    },
    ...rest
  })
}

export function invalidateProgress(): Promise<void> {
  const channels: IpcChannel[] = [
    'dashboard:get',
    'learning:levels',
    'learning:module',
    'learning:projects',
    'exercises:list',
    'exercises:facets',
    'analytics:get',
    'achievements:list',
    'assessments:daily',
    'assessments:recent',
    'auth:session'
  ]
  return Promise.all(channels.map((c) => queryClient.invalidateQueries({ queryKey: [c] }))).then(() => undefined)
}
