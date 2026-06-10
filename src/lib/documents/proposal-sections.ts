import type { SlideBuilder } from '@/lib/documents/slides/types'
import * as c1 from '@/lib/documents/slides/full-proposal/chapter1'
import * as c2 from '@/lib/documents/slides/full-proposal/chapter2'
import * as c3 from '@/lib/documents/slides/full-proposal/chapter3'
import * as board from '@/lib/documents/slides/board-summary/board'

export type DeliverableType = 'full_proposal' | 'board_summary'

/** Which right-panel editor (if any) a section maps to in the proposal builder. */
export type EditorKey =
  | 'executiveSummary'
  | 'understanding'
  | 'valueDrivers'
  | 'commercialModel'
  | 'recommendation'
  | 'teamReferences'
  | 'contact'
  | 'raci'
  | 'crims'
  | 'methodologyPhases'
  | 'waysOfWorking'
  | 'governance'
  | 'customerCommitments'
  | 'dataMigrationSteps'
  | 'integrationSteps'
  | 'testingSteps'
  | 'adoptionSteps'
  | 'goLiveSteps'
  | 'whyArcwide'

export type SectionKind = 'cover' | 'contents' | 'divider' | 'content'

export interface ProposalSection {
  id: string
  chapter: string
  title: string
  kind: SectionKind
  /** content slide builder */
  builder?: SlideBuilder
  /** divider props */
  dividerNumber?: string
  dividerSubtitle?: string
  /** which builder-panel editor populates this slide */
  editorKey?: EditorKey
  /** checked by default in the builder */
  defaultOn: boolean
}

const CH1 = 'Chapter 1 · Understanding & Solution'
const CH2 = 'Chapter 2 · Approach & Delivery'
const CH3 = 'Chapter 3 · Commercials & Why Arcwide'
const DOC = 'Document'

export const FULL_SECTIONS: ProposalSection[] = [
  { id: 'cover', chapter: DOC, title: 'Cover page', kind: 'cover', defaultOn: true },
  { id: 'contents', chapter: DOC, title: 'Table of contents', kind: 'contents', defaultOn: true },

  { id: 'section_1_divider', chapter: CH1, title: 'Chapter 1 divider', kind: 'divider', dividerNumber: '01', dividerSubtitle: 'Understanding & Solution', defaultOn: true },
  { id: 'executive_summary', chapter: CH1, title: 'Executive summary', kind: 'content', builder: c1.executiveSummarySlide, editorKey: 'executiveSummary', defaultOn: true },
  { id: 'understanding', chapter: CH1, title: 'Our understanding', kind: 'content', builder: c1.understandingSlide, editorKey: 'understanding', defaultOn: true },
  { id: 'value_drivers', chapter: CH1, title: 'Business drivers → outcomes', kind: 'content', builder: c1.valueDriversSlide, editorKey: 'valueDrivers', defaultOn: true },
  { id: 'solution_overview', chapter: CH1, title: 'Solution overview', kind: 'content', builder: c1.solutionOverviewSlide, defaultOn: true },
  { id: 'scope_in', chapter: CH1, title: 'In scope — by module', kind: 'content', builder: c1.scopeInSlide, defaultOn: true },
  { id: 'scope_out', chapter: CH1, title: 'Out of scope & deferred', kind: 'content', builder: c1.scopeOutSlide, defaultOn: true },
  { id: 'assumptions', chapter: CH1, title: 'Assumptions & dependencies', kind: 'content', builder: c1.assumptionsSlide, defaultOn: true },
  { id: 'fit_assessment', chapter: CH1, title: 'High-level fit assessment', kind: 'content', builder: c1.fitAssessmentSlide, defaultOn: true },

  { id: 'section_2_divider', chapter: CH2, title: 'Chapter 2 divider', kind: 'divider', dividerNumber: '02', dividerSubtitle: 'Approach & Delivery', defaultOn: true },
  { id: 'methodology', chapter: CH2, title: 'IFS Cloud methodology', kind: 'content', builder: c2.methodologySlide, editorKey: 'methodologyPhases', defaultOn: true },
  { id: 'ways_of_working', chapter: CH2, title: 'The Arcwide delivery wrap', kind: 'content', builder: c2.waysOfWorkingSlide, editorKey: 'waysOfWorking', defaultOn: true },
  { id: 'plan', chapter: CH2, title: 'Indicative project plan', kind: 'content', builder: c2.planSlide, defaultOn: true },
  { id: 'phasing', chapter: CH2, title: 'Release & rollout strategy', kind: 'content', builder: c2.phasingSlide, defaultOn: true },
  { id: 'governance', chapter: CH2, title: 'Project governance', kind: 'content', builder: c2.governanceSlide, editorKey: 'governance', defaultOn: true },
  { id: 'team', chapter: CH2, title: 'Proposed delivery team', kind: 'content', builder: c2.teamSlide, defaultOn: true },
  { id: 'raci', chapter: CH2, title: 'RACI matrix', kind: 'content', builder: c2.raciSlide, editorKey: 'raci', defaultOn: true },
  { id: 'crims', chapter: CH2, title: 'CRIMs register', kind: 'content', builder: c2.crimsSlide, editorKey: 'crims', defaultOn: true },
  { id: 'customer_commitment', chapter: CH2, title: 'What we need from you', kind: 'content', builder: c2.customerCommitmentSlide, editorKey: 'customerCommitments', defaultOn: true },
  { id: 'data_migration', chapter: CH2, title: 'Data migration approach', kind: 'content', builder: c2.dataMigrationSlide, editorKey: 'dataMigrationSteps', defaultOn: true },
  { id: 'integration', chapter: CH2, title: 'Integration approach', kind: 'content', builder: c2.integrationSlide, editorKey: 'integrationSteps', defaultOn: true },
  { id: 'testing', chapter: CH2, title: 'Quality assurance & testing', kind: 'content', builder: c2.testingSlide, editorKey: 'testingSteps', defaultOn: true },
  { id: 'adoption', chapter: CH2, title: 'Training & change management', kind: 'content', builder: c2.adoptionSlide, editorKey: 'adoptionSteps', defaultOn: true },
  { id: 'go_live', chapter: CH2, title: 'Cutover & hypercare', kind: 'content', builder: c2.goLiveSlide, editorKey: 'goLiveSteps', defaultOn: true },
  { id: 'risk', chapter: CH2, title: 'Risk management', kind: 'content', builder: c2.riskSlide, defaultOn: true },

  { id: 'section_3_divider', chapter: CH3, title: 'Chapter 3 divider', kind: 'divider', dividerNumber: '03', dividerSubtitle: 'Commercials & Why Arcwide', defaultOn: true },
  { id: 'commercials', chapter: CH3, title: 'Indicative investment', kind: 'content', builder: c3.commercialsSlide, editorKey: 'commercialModel', defaultOn: true },
  { id: 'why_arcwide', chapter: CH3, title: 'Why Arcwide', kind: 'content', builder: c3.whyArcwideSlide, editorKey: 'whyArcwide', defaultOn: true },
  { id: 'team_references', chapter: CH3, title: 'Key people & references', kind: 'content', builder: c3.teamReferencesSlide, editorKey: 'teamReferences', defaultOn: true },
  { id: 'next_steps', chapter: CH3, title: 'The path forward', kind: 'content', builder: c3.nextStepsSlide, editorKey: 'contact', defaultOn: true },
]

const BOARD = 'Board Summary'

export const BOARD_SECTIONS: ProposalSection[] = [
  { id: 'cover', chapter: DOC, title: 'Cover page', kind: 'cover', defaultOn: true },
  { id: 'executive_summary', chapter: BOARD, title: 'Why choose Arcwide', kind: 'content', builder: board.executiveSummaryBoard, editorKey: 'executiveSummary', defaultOn: true },
  { id: 'understanding', chapter: BOARD, title: 'Your business and drivers', kind: 'content', builder: board.understandingBoard, editorKey: 'valueDrivers', defaultOn: true },
  { id: 'solution', chapter: BOARD, title: 'IFS Cloud scope at a glance', kind: 'content', builder: board.solutionBoard, defaultOn: true },
  { id: 'scope', chapter: BOARD, title: 'In scope / out of scope', kind: 'content', builder: board.scopeBoard, defaultOn: true },
  { id: 'approach', chapter: BOARD, title: 'How we deliver', kind: 'content', builder: board.approachBoard, editorKey: 'methodologyPhases', defaultOn: true },
  { id: 'commitment', chapter: BOARD, title: 'What success requires', kind: 'content', builder: board.commitmentBoard, editorKey: 'customerCommitments', defaultOn: true },
  { id: 'investment', chapter: BOARD, title: 'Indicative investment', kind: 'content', builder: board.investmentBoard, defaultOn: true },
  { id: 'why_arcwide', chapter: BOARD, title: 'Why Arcwide', kind: 'content', builder: board.whyArcwideBoard, editorKey: 'whyArcwide', defaultOn: true },
  { id: 'recommendation', chapter: BOARD, title: 'Recommendation & next steps', kind: 'content', builder: board.recommendationBoard, editorKey: 'recommendation', defaultOn: true },
]

export function getSections(type: DeliverableType): ProposalSection[] {
  return type === 'board_summary' ? BOARD_SECTIONS : FULL_SECTIONS
}

/** The default { sectionId: on } map for a deck kind, from each section's `defaultOn`. */
export function defaultSectionSelection(type: DeliverableType): Record<string, boolean> {
  const sel: Record<string, boolean> = {}
  for (const s of getSections(type)) sel[s.id] = s.defaultOn
  return sel
}
