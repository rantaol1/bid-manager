/**
 * IFS Solution Set Overview catalogue.
 *
 * The Scope tab renders this as a layered solution map (see `solution-map.tsx`):
 * a Functional Layer of grouped tile columns plus a Platform & Technical Layer.
 * Each tile is a selectable piece of functionality that can be assigned to a
 * delivery phase (the colour-coded legend).
 *
 * A flat `IFS_MODULES` array is derived from every tile for backward
 * compatibility with the requirements table and document generation, which key
 * scope selections by tile id.
 */

export interface ScopeTile {
  id: string
  name: string
}

/** A functional column group. Wide groups (Service Mgmt, Manufacturing) use two columns. */
export interface FunctionalGroup {
  id: string
  label: string
  columns: ScopeTile[][]
}

/** A boxed sub-section of the Platform & Technical layer. */
export interface TechnicalSection {
  id: string
  label: string
  tiles: ScopeTile[]
}

export interface ScopePhaseDef {
  id: string
  label: string
  colour: string
}

/** Default delivery-phase legend (matches the reference Solution Set Overview). */
export const SCOPE_PHASES_DEFAULT: ScopePhaseDef[] = [
  { id: 'phase1', label: 'Phase I (Core Scope)', colour: '#1AA65A' },
  { id: 'crm-b2b', label: 'CRM + B2B', colour: '#B89BE6' },
  { id: 'expense', label: 'Expense Management', colour: '#EDE800' },
  { id: 'future', label: 'Future Development', colour: '#5BC2F0' },
]

/* ---------- Functional Layer ---------- */

export const FUNCTIONAL_GROUPS: FunctionalGroup[] = [
  {
    id: 'finance',
    label: 'Finance & Sustainability',
    columns: [
      [
        { id: 'emission-tracker', name: 'Emission Tracker' },
        { id: 'sustainability-management', name: 'Sustainability Management' },
        { id: 'cash-planning', name: 'Cash Planning' },
        { id: 'group-consolidation', name: 'Group Consolidation' },
        { id: 'business-planning', name: 'Business Planning' },
        { id: 'fixed-assets', name: 'Fixed Assets' },
        { id: 'accounts-payable', name: 'Accounts Payable' },
        { id: 'accounts-receivable', name: 'Accounts Receivable' },
        { id: 'general-ledger', name: 'General Ledger' },
      ],
    ],
  },
  {
    id: 'hcm',
    label: 'HCM',
    columns: [
      [
        { id: 'compensation-benefits', name: 'Compensation & Benefits' },
        { id: 'time-attendance', name: 'Time and Attendance' },
        { id: 'expense-management', name: 'Expense Management' },
        { id: 'recruitment', name: 'Recruitment' },
        { id: 'employee-development-training', name: 'Employee Development & Training' },
        { id: 'employee-org-management', name: 'Employee & Organisation Management' },
        { id: 'health-safety', name: 'Health & Safety' },
      ],
    ],
  },
  {
    id: 'supply-chain',
    label: 'Supply Chain & Procurement',
    columns: [
      [
        { id: 'employee-self-service-procurement', name: 'Employee Self-Service Procurement' },
        { id: 'strategic-procurement-planning', name: 'Strategic Procurement Planning' },
        { id: 'procurement', name: 'Procurement' },
        { id: 'warehousing', name: 'Warehousing' },
        { id: 'demand-forecasting', name: 'Demand Forecasting' },
        { id: 'export-control', name: 'Export Control' },
        { id: 'rental-management', name: 'Rental Management' },
        { id: 'supply-chain-planning', name: 'Supply Chain Planning' },
        { id: 'customer-schedules', name: 'Customer Schedules' },
        { id: 'sales-orders', name: 'Sales Orders' },
        { id: 'supplier-schedules', name: 'Supplier Schedules' },
        { id: 'inventory-replenishment', name: 'Inventory Replenishment' },
      ],
    ],
  },
  {
    id: 'service-management',
    label: 'Service Management',
    columns: [
      [
        { id: 'service-management-scheduling', name: 'Service Management Scheduling' },
        { id: 'service-management-core', name: 'Service Management Core' },
        { id: 'mobile-work-order', name: 'Mobile Work Order' },
        { id: 'contract-change-management', name: 'Contract Change Management' },
        { id: 'sub-contract-management', name: 'Sub Contract Management' },
        { id: 'sales-contract-management', name: 'Sales Contract Management' },
        { id: 'call-center', name: 'Call Center' },
        { id: 'enterprise-service-management', name: 'Enterprise Service Management' },
      ],
      [
        { id: 'advanced-forms', name: 'Advanced Forms' },
        { id: 'customer-engagement-portal', name: 'Customer Engagement Portal' },
        { id: 'remote-assistance', name: 'Remote Assistance' },
        { id: 'depot-repair', name: 'Depot Repair' },
        { id: 'contractor-management', name: 'Contractor Management' },
      ],
    ],
  },
  {
    id: 'project-management',
    label: 'Project Management',
    columns: [
      [
        { id: 'schedule-of-work-estimation', name: 'Schedule of Work - Estimation' },
        { id: 'risk-management', name: 'Risk Management' },
        { id: 'project-material-planning', name: 'Project Material Planning' },
        { id: 'project-deliverables', name: 'Project Deliverables' },
        { id: 'job-rate-management', name: 'Job Rate Management' },
        { id: 'project-reporting', name: 'Project Reporting' },
        { id: 'project-budgeting-forecasting', name: 'Project Budgeting and Forecasting' },
        { id: 'project-management', name: 'Project Management' },
        { id: 'indemnity-management', name: 'Indemnity Management' },
      ],
    ],
  },
  {
    id: 'crm',
    label: 'CRM',
    columns: [
      [
        { id: 'crm-companion', name: 'CRM Companion' },
        { id: 'crm-panel', name: 'CRM Panel' },
        { id: 'customer-relationship-management', name: 'Customer Relationship Management' },
      ],
    ],
  },
  {
    id: 'manufacturing',
    label: 'Manufacturing & Cross Functionals',
    columns: [
      [
        { id: 'first-article-inspection', name: 'First Article Inspection' },
        { id: 'product-estimate-management', name: 'Product Estimate Management' },
        { id: 'material-planning', name: 'Material Planning' },
        { id: 'constraint-based-scheduling', name: 'Constraint Based Scheduling' },
        { id: 'eco-footprint-management', name: 'Eco Footprint Management' },
        { id: 'costing', name: 'Costing' },
        { id: 'make-order-to-assembly', name: 'Make/Order to Assembly' },
        { id: 'manufacturing-visual-planning', name: 'Manufacturing Visual Planning' },
      ],
      [
        { id: 'material-requirement-planning-simulation', name: 'Material Requirement Planning Simulation' },
        { id: 'pdm-configuration', name: 'PDM Configuration' },
        { id: 'configure-to-order', name: 'Configure to Order' },
        { id: 'production-management', name: 'Production Management' },
        { id: 'manufacturing-execution-controller', name: 'Manufacturing Execution Controller' },
        { id: 'manufacturing-scheduling-optimization', name: 'Manufacturing Scheduling and Optimization' },
        { id: 'quality-assurance', name: 'Quality Assurance' },
        { id: 'quality-management', name: 'Quality Management' },
      ],
    ],
  },
  {
    id: 'asset-management',
    label: 'Asset Management',
    columns: [
      [
        { id: 'failure-mode-effect-criticality-analysis', name: 'Failure Mode Effect and Criticality Analysis' },
        { id: 'offshore-regulatory-compliance-analysis', name: 'Offshore Regulatory Compliance Analysis' },
        { id: 'offshore-replication-logistics', name: 'Offshore Replication and Logistics' },
        { id: 'asset-planning-realization', name: 'Asset Planning and Realization' },
        { id: 'asset-operations-maintenance', name: 'Asset Operations and Maintenance' },
        { id: 'maintenance-planning-scheduling', name: 'Maintenance Planning & Scheduling' },
        { id: 'fleet-asset-management', name: 'Fleet and Asset Management' },
        { id: 'equipment-data-collection', name: 'Equipment Data Collection' },
        { id: 'linear-assets', name: 'Linear Assets' },
      ],
    ],
  },
  {
    id: 'b2b',
    label: 'B2B',
    columns: [
      [
        { id: 'sub-contract', name: 'Sub-Contract' },
        { id: 'sales-configuration', name: 'Sales Configuration' },
        { id: 'service-order-management', name: 'Service Order Management' },
        { id: 'supplier-self-service-procurement', name: 'Supplier Self-Service Procurement' },
        { id: 'sales', name: 'Sales' },
        { id: 'contracting-for-work-orders', name: 'Contracting for Work Orders' },
        { id: 'manufacturing', name: 'Manufacturing' },
      ],
    ],
  },
]

/* ---------- Platform & Technical Layer ---------- */

export const TECHNICAL_SECTIONS: TechnicalSection[] = [
  {
    id: 'analytics',
    label: 'Analytics',
    tiles: [
      { id: 'ifs-analysis-models', name: 'IFS Analysis Models' },
      { id: 'ifs-advanced-analytics', name: 'IFS Advanced Analytics' },
      { id: 'ifs-analysis-models-power-bi', name: 'IFS Analysis Models for Power BI' },
    ],
  },
  {
    id: 'scheduling-technology',
    label: 'Scheduling Technology',
    tiles: [
      { id: 'dynamic-scheduling', name: 'Dynamic Scheduling' },
      { id: 'scheduling-workbench', name: 'Scheduling Workbench' },
      { id: 'wise-scenario-explorer', name: 'WISE - What If Scenario Explorer' },
      { id: 'map-geocoding-service', name: 'Map Geocoding Service' },
    ],
  },
  {
    id: 'integration',
    label: 'Integration / Connector / Accelerator',
    tiles: [
      { id: 'external-tax-systems-interface', name: 'External Tax Systems Interface' },
      { id: 'web-shop-interface', name: 'Web Shop Interface' },
      { id: 'edi-for-supply-chain', name: 'EDI for Supply Chain' },
      { id: 'microsoft-project-primavera', name: 'Microsoft Project / Primavera' },
    ],
  },
]

/** Full-width foundation bar (selectable). */
export const IFS_AI_FOUNDATION: ScopeTile = { id: 'ifs-ai-foundation', name: 'IFS.ai Foundation' }

/** Bottom platform tile row. */
export const PLATFORM_TILES: ScopeTile[] = [
  { id: 'ifs-cloud-platform', name: 'IFS Cloud Platform' },
  { id: 'ifs-business-reporter', name: 'IFS Business Reporter' },
  { id: 'sql-server-reporting-services', name: 'SQL Server Reporting Services' },
  { id: 'document-management', name: 'Document Management' },
  { id: 'electronic-signature', name: 'Electronic Signature' },
  { id: 'ifs-data-synchronization', name: 'IFS Data Synchronization' },
  { id: 'data-management-bundle', name: 'Data Management Bundle' },
  { id: 'advanced-optimization', name: 'Advanced Optimization' },
  { id: 'global-api-read-update', name: 'Global API Read and Update Access' },
  { id: 'global-api-read-only', name: 'Global API Read Access Only' },
  { id: 'industry-lobbies', name: 'Industry Lobbies' },
]

/** Static deployment label (not selectable). */
export const DEPLOYMENT_LABEL = 'Cloud Deployment (IFS Industrial Cloud)'

/* ---------- Derived flat catalogue (backward compatibility) ---------- */

interface FlatModule {
  id: string
  name: string
  category: string
  description: string
}

function flatten(): FlatModule[] {
  const out: FlatModule[] = []
  for (const group of FUNCTIONAL_GROUPS) {
    for (const col of group.columns) {
      for (const tile of col) out.push({ id: tile.id, name: tile.name, category: group.label, description: '' })
    }
  }
  for (const section of TECHNICAL_SECTIONS) {
    for (const tile of section.tiles) out.push({ id: tile.id, name: tile.name, category: section.label, description: '' })
  }
  out.push({ id: IFS_AI_FOUNDATION.id, name: IFS_AI_FOUNDATION.name, category: 'Platform & Technical', description: '' })
  for (const tile of PLATFORM_TILES) out.push({ id: tile.id, name: tile.name, category: 'Platform & Technical', description: '' })
  return out
}

export const IFS_MODULES: FlatModule[] = flatten()

export type IFSModuleId = string

export const IFS_CATEGORIES = [
  ...FUNCTIONAL_GROUPS.map((g) => g.label),
  ...TECHNICAL_SECTIONS.map((s) => s.label),
  'Platform & Technical',
] as const
