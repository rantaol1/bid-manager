import type {
  CrimItem,
  GovernanceContent,
  MethodologyPhase,
  ProposalStructuredContent,
  TeamStructureContent,
  TitledItem,
} from '@/types'
import { DEFAULT_RACI } from '@/lib/raci'

/**
 * Built-in default proposal content. These constants seed the global
 * `ProposalDefaults` singleton (see prisma/seed.ts) and act as the ultimate
 * fallback if a default row/column is ever missing at generation time.
 */

export const METHODOLOGY_PHASES: MethodologyPhase[] = [
  { phase: '1 · Initiate', focus: 'Mobilise team, confirm scope, stand up environments', deliverables: 'Charter, plan, governance, solution scope (Scope Tool)' },
  { phase: '2 · Confirm Prototype', focus: 'Build a minimum viable solution; validate fit', deliverables: 'Prototype, refined scope (in/out/deferred), fit-gap' },
  { phase: '3 · Establish Solution', focus: 'Document end-to-end scenarios; plan CRIMs', deliverables: 'Solution design, CRIM register, integration & data design' },
  { phase: '4 · Implement', focus: 'Configure, build, test, migrate, train', deliverables: 'Configured system, built CRIMs, SIT/UAT, trained users' },
  { phase: '5 · Go Live', focus: 'Cutover, final checks, hypercare', deliverables: 'Live system, cutover record, hypercare & handover' },
]

export const WAYS_OF_WORKING: TitledItem[] = [
  { title: 'Joint teams', description: 'Arcwide and customer work as one team, with clear roles (see RACI).' },
  { title: 'Iterative & prototype-led', description: 'Show working software early; decide against a live prototype, not documents.' },
  { title: 'Standard-first', description: 'Adopt IFS standard; justify every CRIM on business value to control cost & upgradeability.' },
  { title: 'Governed & transparent', description: 'Fixed cadence of steering, status, risk and decision logs; no surprises.' },
]

export const DEFAULT_RISKS: Array<{ risk: string; impact: string; mitigation: string }> = [
  { risk: 'SME availability / competing priorities', impact: 'High', mitigation: 'Named SMEs, planned calendar, sponsor escalation' },
  { risk: 'Scope creep / unclear requirements', impact: 'High', mitigation: 'Standard-first, CRIM governance, change control' },
  { risk: 'Data quality below expectation', impact: 'Med', mitigation: 'Early profiling, cleanse at source, validation gates' },
  { risk: 'Integration / vendor dependencies', impact: 'Med', mitigation: 'Early cataloguing, vendor engagement, SIT buffers' },
  { risk: 'Adoption / change resistance', impact: 'Med', mitigation: 'Change workstream, champions, comms plan' },
  { risk: 'Aggressive timeline', impact: 'Med', mitigation: 'Phased rollout, contingency, realistic milestones' },
]

export const DEFAULT_CRIMS: CrimItem[] = [
  { id: 'crim-1', type: 'I', name: 'Bank payment file integration', description: 'Outbound payments to corporate bank (ISO 20022).', complexity: 'med' },
  { id: 'crim-2', type: 'M', name: 'Open AP/AR balances migration', description: 'Migrate open items and ledgers from legacy ERP.', complexity: 'high' },
  { id: 'crim-3', type: 'R', name: 'Statutory financial reporting pack', description: 'Localised statutory reports beyond IFS standard.', complexity: 'med' },
  { id: 'crim-4', type: 'C', name: 'Shop floor terminal screen', description: 'Simplified operator screen for production reporting.', complexity: 'low' },
]

export const GOVERNANCE: GovernanceContent = {
  bodies: [
    {
      name: 'Steering Committee',
      cadence: 'Monthly',
      icon: 'clipboard',
      customerParticipants: ['Project Sponsor', '{customer} Executive Committee', '{customer} Project Manager'],
      partnerParticipants: ['{partner} Executive Sponsor', '{partner} Project Manager', 'IFS Representatives'],
      responsibilities: [
        'Arbitrate and decide on structural issues',
        'Ensure program objectives are being met and monitor program progress against key milestones and budget',
        'Validate main deliverables & project steps',
      ],
    },
    {
      name: 'Project Committee',
      cadence: 'Weekly',
      icon: 'gauge',
      customerParticipants: ['{customer} Project Manager', 'Business Process Owners'],
      partnerParticipants: ['{partner} Project Manager', '{partner} PMO', '{partner} Consultants'],
      responsibilities: [
        'Arbitrate business rules, processes and configurations to be implemented',
        'Monitor the project on a weekly basis (coordination, planning)',
        'Define operational actions',
      ],
    },
    {
      name: 'Project Team Meeting',
      cadence: 'Weekly',
      icon: 'pin',
      customerParticipants: ['Business Process Owners'],
      partnerParticipants: ['{partner} Project Manager', '{partner} PMO', '{partner} Consultants'],
      responsibilities: [
        'Discuss to do/in progress/done tasks daily',
        'Follow advancements towards milestones and identify delays',
        'Identify issues and risk',
      ],
    },
  ],
}

// The functional team's scope areas are mirrored on both the partner and customer
// sides in the default org chart (see the reference image).
const FUNCTIONAL_AREAS = [
  {
    label: 'Manufacturing',
    children: ['Shop Order', 'Part Costing', 'Shop floor workbench', 'PLM / Engineering', 'Quality'],
  },
  { label: 'Finance', children: ['AP, AR, GL'] },
  { label: 'Supply Chain', children: ['Inventory / Warehouse', 'Multisite / Inter Company', 'Rental Management'] },
  { label: 'Sales and Procurement', children: [] },
  { label: 'EAM and Document Management', children: [] },
  { label: 'HR', children: [] },
]

export const TEAM_STRUCTURE: TeamStructureContent = {
  steeringLabel: 'Steering Group',
  designAuthorityLabel: 'Design Authority',
  changeManagementLabel: 'Change Management',
  partner: {
    projectManager: '{partner} Project Manager',
    teams: [
      {
        title: 'Technical Team',
        enabled: true,
        areas: [
          { label: 'Technical Consultancy', children: ['Integration', 'Migration'] },
          { label: 'Developers', children: ['Integration'] },
        ],
      },
      {
        title: 'Functional Team',
        lead: 'Solution Architect',
        enabled: true,
        areas: FUNCTIONAL_AREAS,
      },
    ],
  },
  customer: {
    projectManager: '{customer} Project Manager',
    teams: [
      {
        title: '{customer} Functional Team',
        lead: 'Solution Architect',
        enabled: true,
        areas: FUNCTIONAL_AREAS,
      },
      {
        title: '{customer} Technical Team',
        lead: 'Technical Lead',
        enabled: true,
        areas: [
          { label: 'Configuration', children: [] },
          { label: 'Reporting', children: [] },
          { label: 'Integration', children: [] },
          { label: 'Migration', children: [] },
        ],
      },
    ],
  },
}

export const CUSTOMER_COMMITMENTS: TitledItem[] = [
  { title: 'Executive sponsor', description: 'Visible leadership, fast decisions, and escalation ownership.' },
  { title: 'Process owners', description: 'Empowered to make design decisions and sign off solutions.' },
  { title: 'Subject-matter experts', description: 'Available per the planned calendar for workshops and testing.' },
  { title: 'Data & IT', description: 'Source data extracts, environments, and infrastructure access.' },
  { title: 'UAT & adoption', description: 'Business users for UAT and active participation in change activities.' },
]

export const DATA_MIGRATION_STEPS: string[] = [
  'Profile & cleanse — assess legacy data quality and cleanse at source',
  'Map & build — define mappings and build migration loads',
  'Validate — reconcile and validate migrated data with the business',
  'Cutover loads — execute final loads against the cutover plan',
]

export const INTEGRATION_STEPS: string[] = [
  'Catalogue — inventory all interfaces and data flows',
  'Pattern — select integration pattern and technology per interface',
  'Build & test — develop and SIT-test each integration',
  'Operate — monitor and support integrations in production',
]

export const TESTING_STEPS: string[] = [
  'Unit & string — consultants test configuration and CRIMs',
  'SIT — end-to-end system integration testing',
  'UAT — business users validate against scenarios',
  'Regression — confirm stability before go-live',
]

export const ADOPTION_STEPS: string[] = [
  'Stakeholder & comms — engagement and communications plan',
  'Train-the-trainer — equip customer trainers',
  'Role-based materials — targeted training content per role',
  'Adoption tracking — measure usage and reinforce',
]

export const GO_LIVE_STEPS: string[] = [
  'Cutover plan — sequenced, rehearsed cutover runbook',
  'Rollback readiness — defined fallback and go/no-go criteria',
  'Hypercare — intensive post-go-live support',
  'Transition to support — handover to managed support',
]

export const WHY_ARCWIDE: TitledItem[] = [
  { title: 'IFS Elite Partner', description: 'Top-tier IFS partner with certified consultants across ERP, EAM and FSM.' },
  { title: 'BearingPoint Group', description: 'Backed by BearingPoint scale, methods and industry depth.' },
  { title: 'Industry track record', description: 'Proven delivery across manufacturing, asset-intensive and service industries.' },
  { title: 'Long-term partner', description: 'We stay beyond go-live — optimisation, upgrades and value realisation.' },
]

/** The complete set of built-in structured content defaults. */
export const BUILTIN_STRUCTURED_CONTENT: ProposalStructuredContent = {
  raci: DEFAULT_RACI,
  crims: DEFAULT_CRIMS,
  methodologyPhases: METHODOLOGY_PHASES,
  waysOfWorking: WAYS_OF_WORKING,
  governance: GOVERNANCE,
  teamStructure: TEAM_STRUCTURE,
  customerCommitments: CUSTOMER_COMMITMENTS,
  dataMigrationSteps: DATA_MIGRATION_STEPS,
  integrationSteps: INTEGRATION_STEPS,
  testingSteps: TESTING_STEPS,
  adoptionSteps: ADOPTION_STEPS,
  goLiveSteps: GO_LIVE_STEPS,
  whyArcwide: WHY_ARCWIDE,
}
