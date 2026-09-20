import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { decideAction, getIssues, getState } from '../api'
import type { DemoState, Issue } from '../types'

export const DEMO_STATE_KEY = ['demo-state'] as const
export const ISSUES_KEY = ['issues'] as const

export function useDemoState() {
  return useQuery({
    queryKey: DEMO_STATE_KEY,
    queryFn: getState,
  })
}

export function useIssues() {
  const query = useQuery({
    queryKey: ISSUES_KEY,
    queryFn: getIssues,
  })
  return {
    issues: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

function patchIssues(issues: Issue[] | undefined, issueId: string, status: string) {
  return (issues ?? []).map(issue => issue.id === issueId ? { ...issue, status } : issue)
}

export function useApproveIssue() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ actionId }: { actionId: string; issueId: string }) => decideAction(actionId, 'approved'),
    onMutate: async ({ issueId }) => {
      await Promise.all([
        client.cancelQueries({ queryKey: DEMO_STATE_KEY }),
        client.cancelQueries({ queryKey: ISSUES_KEY }),
      ])
      const previousState = client.getQueryData<DemoState>(DEMO_STATE_KEY)
      const previousIssues = client.getQueryData<Issue[]>(ISSUES_KEY)
      if (previousState) {
        client.setQueryData<DemoState>(DEMO_STATE_KEY, {
          ...previousState,
          issues: patchIssues(previousState.issues, issueId, 'Approved'),
        })
      }
      if (previousIssues) {
        client.setQueryData<Issue[]>(ISSUES_KEY, patchIssues(previousIssues, issueId, 'Approved'))
      }
      return { previousState, previousIssues }
    },
    onError: (_error, _vars, context) => {
      if (context?.previousState) client.setQueryData(DEMO_STATE_KEY, context.previousState)
      if (context?.previousIssues) client.setQueryData(ISSUES_KEY, context.previousIssues)
    },
    onSuccess: next => {
      client.setQueryData(DEMO_STATE_KEY, next)
      client.setQueryData(ISSUES_KEY, next.issues)
    },
  })
}
