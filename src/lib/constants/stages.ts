export const STAGES = [
  { id: 'lead', label: 'Lead', colour: '#94A3B8' },
  { id: 'qualified', label: 'Qualified', colour: '#3B82F6' },
  { id: 'scoping', label: 'Scoping', colour: '#F59E0B' },
  { id: 'proposal', label: 'Proposal', colour: '#8B5CF6' },
  { id: 'submitted', label: 'Submitted', colour: '#E6007E' },
  { id: 'won', label: 'Won', colour: '#22C55E' },
  { id: 'lost', label: 'Lost', colour: '#EF4444' },
] as const

export type StageId = (typeof STAGES)[number]['id']

export const STAGE_IDS = STAGES.map((s) => s.id) as [StageId, ...StageId[]]

export function getStage(id: string) {
  return STAGES.find((s) => s.id === id)
}
