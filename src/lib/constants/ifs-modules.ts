export const IFS_MODULES = [
  { id: 'fin', name: 'Financials', category: 'ERP', description: 'GL, AP, AR, Fixed Assets, Cash Management' },
  { id: 'proc', name: 'Procurement', category: 'ERP', description: 'Purchase Orders, Sourcing, Supplier Management' },
  { id: 'sc', name: 'Supply Chain', category: 'ERP', description: 'Inventory, Warehouse, Distribution, Demand Planning' },
  { id: 'mfg', name: 'Manufacturing', category: 'ERP', description: 'Shop Orders, BOM, Routing, MES' },
  { id: 'proj', name: 'Projects', category: 'ERP', description: 'Project Costing, Planning, Resource Management, ETO' },
  { id: 'sales', name: 'Sales & CRM', category: 'ERP', description: 'Customer Orders, Quotations, Pricing, CRM' },
  { id: 'eng', name: 'Engineering', category: 'ERP', description: 'ECM, Part Revision, Product Structure, PLM' },
  { id: 'quality', name: 'Quality', category: 'ERP', description: 'Inspection, NCR, CAPA, SPC, Compliance' },
  { id: 'hr', name: 'HRM', category: 'ERP', description: 'Employee Management, Skills, Time & Attendance' },
  { id: 'wo', name: 'Work Orders', category: 'EAM', description: 'Corrective & Preventive Maintenance, Task Templates' },
  { id: 'asset', name: 'Asset Lifecycle', category: 'EAM', description: 'Equipment, Functional Objects, Criticality, Spare Parts' },
  { id: 'permit', name: 'Permits', category: 'EAM', description: 'Permit to Work, Safety Compliance' },
  { id: 'sched', name: 'Scheduling', category: 'FSM', description: 'PSO, Dispatch, Route Optimisation, SLA' },
  { id: 'mobile', name: 'Mobile Workforce', category: 'FSM', description: 'Mobile App, Offline, Time & Material Capture' },
  { id: 'contract', name: 'Service Contracts', category: 'FSM', description: 'Service Agreements, Warranties, Entitlements' },
  { id: 'docman', name: 'Document Management', category: 'Platform', description: 'Document Control, Revision Workflows' },
  { id: 'reporting', name: 'Reporting & BI', category: 'Platform', description: 'Operational Reports, KPIs, Power BI Integration' },
  { id: 'integration', name: 'Integration', category: 'Platform', description: 'IFS Connect, APIs, EDI, Middleware' },
  { id: 'security', name: 'Security & Access', category: 'Platform', description: 'Permission Sets, RBAC, SSO, Audit' },
  { id: 'sustainability', name: 'Sustainability', category: 'Platform', description: 'Carbon Tracking, REACH/RoHS, ESG Reporting' },
  { id: 'datamigration', name: 'Data Migration', category: 'Cross-cutting', description: 'Migration Framework, Data Cleansing, Cutover' },
  { id: 'testing', name: 'Testing', category: 'Cross-cutting', description: 'Test Management, UAT, Regression' },
  { id: 'training', name: 'Training & OCM', category: 'Cross-cutting', description: 'User Training, Change Management, Documentation' },
] as const

export type IFSModuleId = (typeof IFS_MODULES)[number]['id']
export type IFSCategory = (typeof IFS_MODULES)[number]['category']

export const IFS_CATEGORIES = ['ERP', 'EAM', 'FSM', 'Platform', 'Cross-cutting'] as const
