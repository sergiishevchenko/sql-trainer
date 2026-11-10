import type { ComponentType } from 'react'
import type { ExerciseType } from '@shared/constants/domain'
import type { WorkspaceProps } from './types'
import { ChooseQueryWorkspace, ExplainQueryWorkspace, PredictResultWorkspace } from './workspaces/choice-types'
import { FillBlankWorkspace } from './workspaces/fill-blank'
import { JoinBuilderWorkspace } from './workspaces/join-builder'
import { OrderPartsWorkspace } from './workspaces/order-parts'
import { BusinessCaseWorkspace, ChallengeWorkspace, FixBugWorkspace, WriteQueryWorkspace } from './workspaces/query-types'

/**
 * Maps every exercise type to its dedicated workspace component.
 */
export const WORKSPACES: { [T in ExerciseType]: ComponentType<WorkspaceProps<T>> } = {
  write_query: WriteQueryWorkspace,
  fix_bug: FixBugWorkspace,
  business_case: BusinessCaseWorkspace,
  challenge: ChallengeWorkspace,
  predict_result: PredictResultWorkspace,
  choose_query: ChooseQueryWorkspace,
  fill_blank: FillBlankWorkspace,
  join_builder: JoinBuilderWorkspace,
  order_parts: OrderPartsWorkspace,
  explain_query: ExplainQueryWorkspace
}
