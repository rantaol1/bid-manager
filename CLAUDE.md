# CLAUDE.md — Arcwide Bid Manager POC

> **IMPORTANT: Read `PROJECT_RULES.md` first.** That file contains all engineering standards, security rules, coding conventions, and quality requirements for this project. This file (`CLAUDE.md`) defines WHAT to build. `PROJECT_RULES.md` defines HOW to build it. Both files live in the project root. Follow both at all times.

---

## Project overview

Build a web application called "Arcwide Bid Manager" — a platform for IFS implementation consultants to manage prospects, scope implementations, estimate resources/costs, visualise project timelines, and generate branded proposal documents (DOCX/PPTX).

This is a POC (proof of concept) targeting internal demo to 5-10 stakeholders. Use free-tier infrastructure throughout. The application must be functional end-to-end: create a customer → create an opportunity → scope it → estimate it → visualise the timeline → generate proposal documents.

---

## Tech stack

- **Framework:** Next.js 15 (App Router) with React 19 and TypeScript (strict mode)
- **Styling:** Tailwind CSS 4 + shadcn/ui (use `npx shadcn@latest init` then add components as needed)
- **Auth:** Clerk (`@clerk/nextjs`) — free tier, 50K MAU
- **Database:** Neon PostgreSQL (free tier, 0.5 GB) with Prisma 6 ORM
- **File storage:** Vercel Blob (`@vercel/blob`)
- **Document generation:** `docx` (npm) for Word files, `pptxgenjs` for PowerPoint files
- **State management:** TanStack Query for server state, React `useState`/`useReducer` for local state
- **Drag and drop:** `@hello-pangea/dnd` for Kanban board
- **Tables:** `@tanstack/react-table` for sortable/filterable data tables
- **Date handling:** `date-fns`
- **Charts:** `recharts` for dashboard visualisations
- **File upload:** `react-dropzone`
- **Validation:** `zod` for request validation (see `PROJECT_RULES.md` §1.4)
- **Deployment:** Vercel (Git integration)

## Project setup

```bash
npx create-next-app@latest arcwide-bid-manager --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd arcwide-bid-manager
npx shadcn@latest init
npm install @clerk/nextjs prisma @prisma/client @vercel/blob
npm install @tanstack/react-query @tanstack/react-table @hello-pangea/dnd
npm install docx pptxgenjs date-fns recharts react-dropzone zod
npm install -D @types/node
npx prisma init
```

## Environment variables

```env
# .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
DATABASE_URL=postgresql://...@ep-...neon.tech/neondb?sslmode=require
BLOB_READ_WRITE_TOKEN=vercel_blob_...
```

Create a `.env.example` with placeholder values and commit it. Never commit `.env.local`. Validate all env vars at startup as described in `PROJECT_RULES.md` §1.7.

## Branding / Design tokens

All generated documents and key UI elements use Arcwide brand:

```
Primary:    #E6007E (magenta)
Black:      #1A1A1A
White:      #FFFFFF
Gray light: #F2F2F2
Gray mid:   #D9D9D9
Font:       Arial (documents), Inter (web UI via Tailwind default)
```

In Tailwind config, extend with:

```ts
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      magenta: { DEFAULT: '#E6007E', 50: '#FCE4F0', 100: '#F9B3D6', 500: '#E6007E', 600: '#C70069', 700: '#A30056' },
    },
  },
}
```

---

## Directory structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   └── sign-up/[[...sign-up]]/page.tsx
│   ├── (app)/                            # Protected routes (wrapped in auth layout)
│   │   ├── layout.tsx                    # Sidebar + TopBar + ClerkProvider
│   │   ├── error.tsx                     # Error boundary (see PROJECT_RULES.md §9.2)
│   │   ├── dashboard/page.tsx
│   │   ├── pipeline/page.tsx
│   │   ├── customers/
│   │   │   ├── page.tsx                  # Customer list
│   │   │   └── [id]/page.tsx             # Customer detail
│   │   ├── opportunities/
│   │   │   ├── new/page.tsx              # Create opportunity
│   │   │   └── [id]/page.tsx             # Opportunity workspace (tabbed)
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── customers/route.ts
│   │   ├── customers/[id]/route.ts
│   │   ├── opportunities/route.ts
│   │   ├── opportunities/[id]/route.ts
│   │   ├── opportunities/[id]/scope/route.ts
│   │   ├── opportunities/[id]/roles/route.ts
│   │   ├── opportunities/[id]/rollouts/route.ts
│   │   ├── opportunities/[id]/phases/route.ts
│   │   ├── opportunities/[id]/allocations/route.ts
│   │   ├── opportunities/[id]/deliverables/route.ts
│   │   ├── opportunities/[id]/deliverables/[delivId]/versions/route.ts
│   │   ├── opportunities/[id]/activities/route.ts
│   │   ├── opportunities/[id]/team/route.ts
│   │   ├── opportunities/[id]/generate/estimate/route.ts
│   │   ├── opportunities/[id]/generate/pricing/route.ts
│   │   ├── opportunities/[id]/generate/timeline/route.ts
│   │   ├── opportunities/[id]/generate/summary/route.ts
│   │   ├── opportunities/[id]/export/xlsx/route.ts
│   │   ├── settings/rate-card/route.ts
│   │   ├── upload/route.ts
│   │   └── health/route.ts               # Public health check endpoint
│   ├── layout.tsx                        # Root layout (ClerkProvider, QueryClientProvider)
│   └── page.tsx                          # Redirect to /dashboard
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── top-bar.tsx
│   │   └── page-shell.tsx
│   ├── pipeline/
│   │   ├── kanban-board.tsx
│   │   ├── pipeline-table.tsx
│   │   ├── opportunity-card.tsx
│   │   └── stage-column.tsx
│   ├── opportunity/
│   │   ├── workspace-tabs.tsx
│   │   ├── overview-tab.tsx
│   │   ├── scope-tab.tsx
│   │   ├── estimation-tab.tsx
│   │   ├── timeline-tab.tsx
│   │   └── deliverables-tab.tsx
│   ├── estimation/
│   │   ├── role-config-panel.tsx
│   │   ├── phase-builder.tsx
│   │   ├── allocation-matrix.tsx
│   │   └── cost-summary-cards.tsx
│   ├── timeline/
│   │   ├── roadmap-builder.tsx           # React port of the interactive roadmap HTML
│   │   └── go-live-manager.tsx
│   ├── scope/
│   │   ├── module-picker.tsx
│   │   ├── requirements-table.tsx
│   │   ├── fit-gap-summary.tsx
│   │   └── risk-register.tsx
│   ├── deliverables/
│   │   ├── file-upload-zone.tsx
│   │   ├── deliverable-list.tsx
│   │   ├── version-history.tsx
│   │   └── generate-menu.tsx
│   └── ui/                               # shadcn/ui generated components
├── lib/
│   ├── auth.ts                           # Auth wrapper — see implementation below
│   ├── storage.ts                        # Storage wrapper — see implementation below
│   ├── prisma.ts                         # Prisma client singleton (see PROJECT_RULES.md §2.1)
│   ├── env.ts                            # Env var validation with Zod (see PROJECT_RULES.md §1.7)
│   ├── utils.ts                          # cn(), formatCurrency(), calculateWorkingDays()
│   ├── schemas/                          # Zod validation schemas for API routes
│   │   ├── customer.ts
│   │   ├── opportunity.ts
│   │   ├── estimation.ts
│   │   └── deliverable.ts
│   ├── documents/
│   │   ├── generate-estimate.ts
│   │   ├── generate-pricing.ts
│   │   ├── generate-timeline-pptx.ts
│   │   └── generate-summary-pptx.ts
│   └── constants/
│       ├── ifs-modules.ts
│       └── stages.ts
├── hooks/
│   ├── use-customers.ts
│   ├── use-opportunities.ts
│   ├── use-estimation.ts
│   └── use-deliverables.ts
└── types/
    └── index.ts
```

---

## Prisma schema

Create `prisma/schema.prisma` with the following models. This is the complete schema — implement it exactly as specified.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Customer {
  id            String        @id @default(cuid())
  name          String
  industry      String?
  country       String?
  contactName   String?
  contactEmail  String?
  contactPhone  String?
  notes         String?
  opportunities Opportunity[]
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  createdBy     String
}

model Opportunity {
  id            String        @id @default(cuid())
  name          String
  customerId    String
  customer      Customer      @relation(fields: [customerId], references: [id])
  stage         String        @default("lead")
  expectedValue Decimal?      @db.Decimal(12, 2)
  currency      String        @default("EUR")
  probability   Int?
  closeDate     DateTime?
  tags          String[]
  notes         String?
  teamMembers   TeamMember[]
  scope         Scope?
  rollouts      Rollout[]
  roleConfigs   RoleConfig[]
  timelineConfig Json?
  deliverables  Deliverable[]
  activities    Activity[]
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  createdBy     String

  @@index([customerId])
  @@index([stage])
  @@index([createdBy])
}

model TeamMember {
  id            String      @id @default(cuid())
  opportunityId String
  opportunity   Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  userId        String
  userName      String
  userEmail     String?
  role          String
  @@unique([opportunityId, userId])
  @@index([userId])
}

model Scope {
  id            String      @id @default(cuid())
  opportunityId String      @unique
  opportunity   Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  modules       Json        @default("{}")
  requirements  Json        @default("[]")
  assumptions   String[]
  exclusions    String[]
  risks         Json        @default("[]")
  updatedAt     DateTime    @updatedAt
}

model RoleConfig {
  id            String      @id @default(cuid())
  opportunityId String
  opportunity   Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  roleName      String
  rate          Decimal     @db.Decimal(10, 2)
  rateUnit      String      @default("day")
  hoursPerDay   Int         @default(8)
  sortOrder     Int         @default(0)
  @@unique([opportunityId, roleName])
  @@index([opportunityId])
}

model Rollout {
  id            String      @id @default(cuid())
  opportunityId String
  opportunity   Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  name          String
  colour        String      @default("#E87722")
  sortOrder     Int         @default(0)
  phases        Phase[]
  @@index([opportunityId])
}

model Phase {
  id          String       @id @default(cuid())
  rolloutId   String
  rollout     Rollout      @relation(fields: [rolloutId], references: [id], onDelete: Cascade)
  name        String
  startDate   DateTime
  endDate     DateTime
  workingDays Int
  sortOrder   Int          @default(0)
  goLives     DateTime[]
  allocations Allocation[]
  @@index([rolloutId])
}

model Allocation {
  id           String  @id @default(cuid())
  phaseId      String
  phase        Phase   @relation(fields: [phaseId], references: [id], onDelete: Cascade)
  roleConfigId String
  percentage   Decimal @db.Decimal(5, 2)
  @@unique([phaseId, roleConfigId])
  @@index([phaseId])
}

model Deliverable {
  id            String               @id @default(cuid())
  opportunityId String
  opportunity   Opportunity          @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  name          String
  type          String
  description   String?
  currentVersion Int                 @default(1)
  versions      DeliverableVersion[]
  createdAt     DateTime             @default(now())
  updatedAt     DateTime             @updatedAt
  createdBy     String
  @@index([opportunityId])
}

model DeliverableVersion {
  id            String      @id @default(cuid())
  deliverableId String
  deliverable   Deliverable @relation(fields: [deliverableId], references: [id], onDelete: Cascade)
  version       Int
  fileUrl       String
  fileName      String
  fileSize      Int
  mimeType      String
  changeSummary String?
  createdAt     DateTime    @default(now())
  createdBy     String
  @@index([deliverableId])
}

model Activity {
  id            String      @id @default(cuid())
  opportunityId String
  opportunity   Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  type          String
  description   String
  metadata      Json?
  createdAt     DateTime    @default(now())
  createdBy     String
  @@index([opportunityId])
  @@index([createdAt])
}

model DefaultRoleConfig {
  id          String  @id @default(cuid())
  roleName    String  @unique
  rate        Decimal @db.Decimal(10, 2)
  rateUnit    String  @default("day")
  hoursPerDay Int     @default(8)
  sortOrder   Int     @default(0)
}
```

---

## Files to create first

These foundational files must be created before building any features. Implement them exactly as shown. For the rules governing their usage, see `PROJECT_RULES.md` §6.

### `src/lib/auth.ts` — Auth wrapper

```typescript
import { auth, currentUser } from '@clerk/nextjs/server'

export async function requireAuth() {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorised')
  return userId
}

export async function getCurrentUser() {
  const user = await currentUser()
  if (!user) return null
  return {
    id: user.id,
    name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
    email: user.primaryEmailAddress?.emailAddress ?? null,
    role: (user.publicMetadata?.role as string) || 'contributor',
    imageUrl: user.imageUrl,
  }
}

export async function requireRole(allowedRoles: string[]) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorised')
  if (!allowedRoles.includes(user.role)) throw new Error('Forbidden')
  return user
}
```

**Rule:** No other file may import from `@clerk/nextjs/server`. All auth goes through this wrapper.

### `src/lib/storage.ts` — Storage wrapper

```typescript
import { put, del, list } from '@vercel/blob'

export async function uploadFile(file: File, folder: string) {
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const blob = await put(`${folder}/${safeName}`, file, { access: 'public' })
  return { url: blob.url, fileName: file.name, size: file.size, mimeType: file.type }
}

export async function deleteFile(url: string) {
  await del(url)
}

export async function listFiles(folder: string) {
  const result = await list({ prefix: folder })
  return result.blobs
}
```

**Rule:** No other file may import from `@vercel/blob`. All storage goes through this wrapper.

### `src/lib/prisma.ts` — Prisma singleton

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### `src/lib/utils.ts` — Shared utilities

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { eachDayOfInterval, isWeekend } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateWorkingDays(start: Date, end: Date): number {
  const days = eachDayOfInterval({ start, end })
  return days.filter(day => !isWeekend(day)).length
}

export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}
```

### `middleware.ts` — Clerk auth middleware (project root)

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/health',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)'],
}
```

---

## IFS module catalogue

Store in `src/lib/constants/ifs-modules.ts`:

```typescript
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

export type IFSModuleId = typeof IFS_MODULES[number]['id']
export type IFSCategory = typeof IFS_MODULES[number]['category']
```

## Pipeline stages

```typescript
// src/lib/constants/stages.ts
export const STAGES = [
  { id: 'lead', label: 'Lead', colour: '#94A3B8' },
  { id: 'qualified', label: 'Qualified', colour: '#3B82F6' },
  { id: 'scoping', label: 'Scoping', colour: '#F59E0B' },
  { id: 'proposal', label: 'Proposal', colour: '#8B5CF6' },
  { id: 'submitted', label: 'Submitted', colour: '#E6007E' },
  { id: 'won', label: 'Won', colour: '#22C55E' },
  { id: 'lost', label: 'Lost', colour: '#EF4444' },
] as const

export type StageId = typeof STAGES[number]['id']
```

---

## Estimation engine calculation logic

The allocation matrix stores percentage values (0–100). All calculations are derived:

```
days_per_role_per_phase    = (allocation.percentage / 100) × phase.workingDays
cost_per_role_per_phase    = days_per_role_per_phase × roleConfig.rate
phase_total_days           = SUM(days_per_role_per_phase) across all roles
phase_total_cost           = SUM(cost_per_role_per_phase) across all roles
role_total_days            = SUM(days for role) across all phases
role_total_cost            = role_total_days × roleConfig.rate
project_total_days         = SUM(all phase_total_days)
project_total_cost         = SUM(all phase_total_cost)
average_utilisation        = AVERAGE(percentage) for non-empty phases only
project_duration_months    = months between earliest phase start and latest phase end
```

Working days: count weekdays (Mon–Fri) between start and end date inclusive. Use `calculateWorkingDays()` from `lib/utils.ts`.

---

## The roadmap builder component

Port the interactive HTML roadmap into a React component (`components/timeline/roadmap-builder.tsx`). It must:

- Accept phase data from the estimation tab (rollouts, phases, dates, go-lives)
- Render chevron-shaped bars on a monthly axis, colour-coded by rollout
- Support lanes (y-axis positioning for parallel workstreams)
- Render go-live diamonds at specific month positions (at the start of the month, not centre)
- Include a colour legend
- Export as PNG using `html-to-image` (hide toolbar before capture)
- Be interactive: zoom slider (px per month), editable phase properties in an edit panel

Visual specs:
- Chevron clip-path: `polygon(0 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 0 100%, 16px 50%)`
- First chevron in a rollout: rounded left edge (no left notch), plus icon
- Go-live diamonds: 14px rotated squares, green `#2EB872`, positioned at start of month
- Month axis: columns grouped by year
- Default rollout colours: orange `#E87722`, blue `#2196F3`, green `#2EB872`, purple `#9C27B0`

---

## Document generation

Follow the DOCX/PPTX rules in `PROJECT_RULES.md` §7. Here are the document structures to implement:

### Resource Estimate (DOCX) — `lib/documents/generate-estimate.ts`

1. Cover page: Arcwide branding, project name, customer, date, version
2. Executive summary paragraph (auto-generated from opportunity data)
3. Project team table: role, rate, rate unit
4. Project phases table: rollout, phase, start, end, working days
5. Allocation matrix table: phase rows × role columns showing % values with day totals
6. Cost summary by phase: phase, days, cost
7. Cost summary by role: role, total days, rate, total cost
8. Grand total
9. Assumptions and exclusions lists

### Pricing Summary (DOCX) — `lib/documents/generate-pricing.ts`

1. Cover page
2. Pricing overview: total cost, duration, team size
3. Cost breakdown by rollout (table per rollout)
4. Cost breakdown by role
5. Rate card table
6. Assumptions, exclusions, validity period

### Project Timeline (PPTX) — `lib/documents/generate-timeline-pptx.ts`

1. Title slide (project name, customer, date)
2. Roadmap slide (chevron shapes rendered as PowerPoint shapes per phase)
3. Phase detail table slide

### Executive Summary (PPTX) — `lib/documents/generate-summary-pptx.ts`

1. Title slide
2. Opportunity overview slide (customer, industry, scope)
3. Solution approach slide (selected modules, methodology)
4. Project team slide (role cards)
5. Timeline slide (roadmap)
6. Investment summary slide (cost by rollout, total)
7. Why Arcwide slide (standard positioning)

---

## Seed data

Create `prisma/seed.ts` that populates the database with demo data. Must be idempotent (safe to run multiple times — use upsert or delete-then-create).

Default role configs:
| Role | Rate (EUR/day) |
|------|---------------|
| Project Manager | 1,500 |
| Solution Architect | 1,600 |
| Functional Consultant - ERP | 1,300 |
| Functional Consultant - EAM | 1,300 |
| Functional Consultant - FSM | 1,300 |
| Technical Consultant | 1,200 |
| Data Migration Specialist | 1,200 |
| Integration Specialist | 1,300 |
| Test Manager | 1,200 |
| Change Management Lead | 1,100 |

Sample customer: "Acme Manufacturing Oy" (Finland, Manufacturing industry)

Sample opportunity: "IFS Cloud ERP Implementation", stage "scoping", value €1,500,000, with two rollouts (Global Template with 6 phases, Pilot with 3 phases), role configs copied from defaults, and sample allocations (PM 50%, SA 100% for first phase, etc.).

Add the seed command to `package.json`:
```json
"prisma": { "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts" }
```

---

## Build order

Build and verify each step works before moving to the next. Deploy to Vercel after step 1 and keep deploying continuously.

1. **Project setup + auth + deploy** — scaffold, install deps, Clerk config, sign-in/sign-up pages, protected layout with sidebar placeholder, middleware, deploy to Vercel. Verify: sign-in works on deployed URL.

2. **Database + seed** — Prisma schema, Neon connection, `npx prisma db push`, seed script, `lib/prisma.ts`. Verify: `npx prisma studio` shows seeded data.

3. **Layout shell** — Sidebar with navigation links, TopBar with user avatar (Clerk `<UserButton />`), PageShell wrapper. Verify: navigation works between placeholder pages.

4. **Customers** — Zod schemas, API routes (CRUD), customer list page with search, create/edit dialog (shadcn `Dialog`), customer detail page. Verify: create, list, edit, delete a customer.

5. **Opportunities + Pipeline** — Zod schemas, API routes, create opportunity page, Kanban board with drag-to-change-stage, table view with sort/filter, stage change activity logging. Verify: drag an opportunity from Lead to Qualified, see activity logged.

6. **Dashboard** — Pipeline summary cards (total value by stage), my opportunities list, recent activity feed. Verify: dashboard reflects real data.

7. **Opportunity workspace shell** — Tabbed layout (`overview`, `scope`, `estimation`, `timeline`, `deliverables`), team assignment, overview tab with activity timeline. Verify: tabs switch, team members can be added.

8. **Estimation engine** — Role config panel, rollout/phase builder with date pickers, allocation matrix (% input grid), cost summary cards and breakdown tables, XLSX export. Verify: enter allocations, see costs calculate correctly, download XLSX.

9. **Scope tab** — Module picker grid, requirements table (add/edit/delete rows), fit-gap summary counts, assumptions/exclusions lists, risk register. Verify: select modules, add requirements, see fit-gap counts update.

10. **Timeline tab** — Roadmap builder React component (ported from HTML), go-live management, PNG export. Verify: phases from estimation appear as chevrons, export produces clean PNG.

11. **Deliverables tab** — File upload with drag-and-drop, deliverable list, version history panel, download. Verify: upload a PDF, see it in the list, upload a new version, see version history.

12. **Document generation** — DOCX generation (resource estimate, pricing summary), PPTX generation (timeline slide, executive summary deck), auto-save as deliverable. Verify: generate each document type, open in Word/PowerPoint, check branding and data accuracy.

---

## What NOT to build

- No AI features (deferred to Phase 1)
- No email notifications
- No real-time collaboration
- No approval workflows
- No dark mode toggle (use system default)
- No command palette
- No multi-language support
- No mobile-native views (responsive is sufficient)
- No knowledge base or RAG

---

## Cross-reference

- **Engineering standards, security, conventions:** `PROJECT_RULES.md` (same directory)
- **Product specification with full scope:** `Arcwide_Bid_Manager_Spec_v2_POC.md`
