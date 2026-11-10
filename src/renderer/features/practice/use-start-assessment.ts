import { useNavigate } from 'react-router'
import { useApiMutation, queryClient } from '@/lib/query'

export function useStartAssessment() {
  const navigate = useNavigate()
  return useApiMutation('assessments:start', {
    onSuccess: (assessment) => {
      void queryClient.invalidateQueries({ queryKey: ['assessments:recent'] })
      void queryClient.invalidateQueries({ queryKey: ['assessments:daily'] })
      navigate(`/practice/session/${assessment.id}`)
    }
  })
}
