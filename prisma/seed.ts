import { PrismaClient, Prisma } from '@prisma/client'
import { eachDayOfInterval, isWeekend } from 'date-fns'
import { BUILTIN_STRUCTURED_CONTENT } from '../src/lib/documents/slides/static-content'

const prisma = new PrismaClient()

const SEED_USER = 'seed-script'
const CUSTOMER_ID = 'seed-cus-acme'
const OPPORTUNITY_ID = 'seed-opp-ifs'

function workingDays(start: Date, end: Date): number {
  return eachDayOfInterval({ start, end }).filter((d) => !isWeekend(d)).length
}

const DEFAULT_ROLES: Array<{ roleName: string; rate: number; sortOrder: number }> = [
  { roleName: 'Project Manager', rate: 1500, sortOrder: 0 },
  { roleName: 'Solution Architect', rate: 1600, sortOrder: 1 },
  { roleName: 'Functional Consultant - ERP', rate: 1300, sortOrder: 2 },
  { roleName: 'Functional Consultant - EAM', rate: 1300, sortOrder: 3 },
  { roleName: 'Functional Consultant - FSM', rate: 1300, sortOrder: 4 },
  { roleName: 'Technical Consultant', rate: 1200, sortOrder: 5 },
  { roleName: 'Data Migration Specialist', rate: 1200, sortOrder: 6 },
  { roleName: 'Integration Specialist', rate: 1300, sortOrder: 7 },
  { roleName: 'Test Manager', rate: 1200, sortOrder: 8 },
  { roleName: 'Change Management Lead', rate: 1100, sortOrder: 9 },
]

async function main() {
  console.error('[seed] Seeding default role configs...')
  for (const r of DEFAULT_ROLES) {
    await prisma.defaultRoleConfig.upsert({
      where: { roleName: r.roleName },
      update: { rate: new Prisma.Decimal(r.rate), sortOrder: r.sortOrder, rateUnit: 'day', hoursPerDay: 8 },
      create: { roleName: r.roleName, rate: new Prisma.Decimal(r.rate), sortOrder: r.sortOrder },
    })
  }

  console.error('[seed] Seeding proposal defaults...')
  await prisma.proposalDefaults.upsert({
    where: { id: 'singleton' },
    update: BUILTIN_STRUCTURED_CONTENT as unknown as Prisma.ProposalDefaultsUpdateInput,
    create: { id: 'singleton', ...(BUILTIN_STRUCTURED_CONTENT as unknown as object) } as Prisma.ProposalDefaultsCreateInput,
  })

  console.error('[seed] Seeding sample customer...')
  await prisma.customer.upsert({
    where: { id: CUSTOMER_ID },
    update: {},
    create: {
      id: CUSTOMER_ID,
      name: 'Acme Manufacturing Oy',
      industry: 'Manufacturing',
      country: 'Finland',
      contactName: 'Mikko Virtanen',
      contactEmail: 'mikko.virtanen@acme.fi',
      contactPhone: '+358 40 123 4567',
      notes: 'Strategic prospect — replacing legacy ERP with IFS Cloud.',
      createdBy: SEED_USER,
    },
  })

  console.error('[seed] Resetting sample opportunity...')
  await prisma.opportunity.deleteMany({ where: { id: OPPORTUNITY_ID } })

  await prisma.opportunity.create({
    data: {
      id: OPPORTUNITY_ID,
      name: 'IFS Cloud ERP Implementation',
      customerId: CUSTOMER_ID,
      stage: 'scoping',
      expectedValue: new Prisma.Decimal(1_500_000),
      currency: 'EUR',
      probability: 60,
      closeDate: new Date('2026-09-30'),
      tags: ['ERP', 'Manufacturing', 'IFS Cloud'],
      notes: 'Two-phase rollout: global template then pilot site.',
      createdBy: SEED_USER,
    },
  })

  // Role configs copied from defaults
  console.error('[seed] Creating opportunity role configs...')
  const roleConfigs: Record<string, string> = {}
  for (const r of DEFAULT_ROLES) {
    const rc = await prisma.roleConfig.create({
      data: {
        opportunityId: OPPORTUNITY_ID,
        roleName: r.roleName,
        rate: new Prisma.Decimal(r.rate),
        rateUnit: 'day',
        hoursPerDay: 8,
        sortOrder: r.sortOrder,
      },
    })
    roleConfigs[r.roleName] = rc.id
  }

  // Rollout 1: Global Template (6 phases)
  console.error('[seed] Creating rollouts and phases...')
  const global = await prisma.rollout.create({
    data: { opportunityId: OPPORTUNITY_ID, name: 'Global Template', colour: '#E87722', sortOrder: 0 },
  })
  const pilot = await prisma.rollout.create({
    data: { opportunityId: OPPORTUNITY_ID, name: 'Pilot', colour: '#2196F3', sortOrder: 1 },
  })

  const globalPhases: Array<{ name: string; start: string; end: string }> = [
    { name: 'Prepare', start: '2026-06-01', end: '2026-06-30' },
    { name: 'Explore', start: '2026-07-01', end: '2026-08-31' },
    { name: 'Design', start: '2026-09-01', end: '2026-10-31' },
    { name: 'Build', start: '2026-11-01', end: '2027-01-31' },
    { name: 'Test', start: '2027-02-01', end: '2027-03-31' },
    { name: 'Deploy', start: '2027-04-01', end: '2027-04-30' },
  ]
  const pilotPhases: Array<{ name: string; start: string; end: string; goLives?: string[] }> = [
    { name: 'Prepare', start: '2027-05-01', end: '2027-05-31' },
    { name: 'Build', start: '2027-06-01', end: '2027-07-31' },
    { name: 'Go-Live', start: '2027-08-01', end: '2027-08-31', goLives: ['2027-08-15'] },
  ]

  // allocation profile per phase index for the Global Template rollout
  const globalAllocations: Array<Record<string, number>> = [
    { 'Project Manager': 50, 'Solution Architect': 100, 'Change Management Lead': 30 },
    { 'Project Manager': 50, 'Solution Architect': 100, 'Functional Consultant - ERP': 100, 'Change Management Lead': 30 },
    { 'Project Manager': 50, 'Solution Architect': 80, 'Functional Consultant - ERP': 100, 'Integration Specialist': 50 },
    { 'Project Manager': 50, 'Technical Consultant': 100, 'Functional Consultant - ERP': 80, 'Integration Specialist': 100, 'Data Migration Specialist': 80 },
    { 'Project Manager': 50, 'Test Manager': 100, 'Functional Consultant - ERP': 60, 'Data Migration Specialist': 50 },
    { 'Project Manager': 100, 'Solution Architect': 50, 'Change Management Lead': 100, 'Test Manager': 50 },
  ]
  const pilotAllocations: Array<Record<string, number>> = [
    { 'Project Manager': 30, 'Functional Consultant - ERP': 50 },
    { 'Project Manager': 30, 'Functional Consultant - ERP': 80, 'Data Migration Specialist': 50 },
    { 'Project Manager': 50, 'Change Management Lead': 50, 'Functional Consultant - ERP': 50 },
  ]

  async function createPhases(
    rolloutId: string,
    phases: Array<{ name: string; start: string; end: string; goLives?: string[] }>,
    allocations: Array<Record<string, number>>
  ) {
    for (let i = 0; i < phases.length; i++) {
      const p = phases[i]
      const start = new Date(p.start)
      const end = new Date(p.end)
      const phase = await prisma.phase.create({
        data: {
          rolloutId,
          name: p.name,
          startDate: start,
          endDate: end,
          workingDays: workingDays(start, end),
          sortOrder: i,
          goLives: (p.goLives ?? []).map((d) => new Date(d)),
        },
      })
      const alloc = allocations[i] ?? {}
      for (const [roleName, pct] of Object.entries(alloc)) {
        const roleConfigId = roleConfigs[roleName]
        if (!roleConfigId) continue
        await prisma.allocation.create({
          data: { phaseId: phase.id, roleConfigId, percentage: new Prisma.Decimal(pct) },
        })
      }
    }
  }

  await createPhases(global.id, globalPhases, globalAllocations)
  await createPhases(pilot.id, pilotPhases, pilotAllocations)

  // Scope
  console.error('[seed] Creating scope...')
  await prisma.scope.create({
    data: {
      opportunityId: OPPORTUNITY_ID,
      modules: {
        fin: { selected: true, fitGap: 'fit' },
        proc: { selected: true, fitGap: 'partial' },
        sc: { selected: true, fitGap: 'fit' },
        mfg: { selected: true, fitGap: 'gap' },
        datamigration: { selected: true, fitGap: 'partial' },
        testing: { selected: true, fitGap: 'fit' },
        training: { selected: true, fitGap: 'fit' },
      },
      requirements: [
        { id: 'r1', title: 'Multi-company financial consolidation', moduleId: 'fin', priority: 'must', fitGap: 'fit' },
        { id: 'r2', title: 'Shop floor MES integration', moduleId: 'mfg', priority: 'should', fitGap: 'gap' },
        { id: 'r3', title: 'Supplier portal for POs', moduleId: 'proc', priority: 'could', fitGap: 'partial' },
      ],
      assumptions: [
        'Customer provides cleansed master data for migration.',
        'Standard IFS Cloud functionality used wherever possible.',
      ],
      exclusions: ['Custom mobile app development', 'Third-party EDI onboarding fees'],
      risks: [
        { id: 'k1', title: 'Legacy data quality', likelihood: 'high', impact: 'high', mitigation: 'Early data assessment workshop.' },
        { id: 'k2', title: 'Manufacturing fit-gap', likelihood: 'medium', impact: 'high', mitigation: 'Prototype shop order flow in Explore phase.' },
      ],
    },
  })

  // Team members
  console.error('[seed] Creating team members...')
  await prisma.teamMember.createMany({
    data: [
      { opportunityId: OPPORTUNITY_ID, userId: 'seed-user-1', userName: 'Anna Korhonen', userEmail: 'anna.korhonen@arcwide.com', role: 'Bid Manager' },
      { opportunityId: OPPORTUNITY_ID, userId: 'seed-user-2', userName: 'Sami Nieminen', userEmail: 'sami.nieminen@arcwide.com', role: 'Solution Architect' },
    ],
  })

  // Activity
  await prisma.activity.create({
    data: {
      opportunityId: OPPORTUNITY_ID,
      type: 'created',
      description: 'Opportunity created from seed data',
      createdBy: SEED_USER,
    },
  })

  console.error('[seed] Done.')
}

main()
  .catch((e) => {
    console.error('[seed] Failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
