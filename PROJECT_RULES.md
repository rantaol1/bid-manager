# Arcwide Bid Manager — Engineering Standards

> **Every developer (human or AI) must read this file before writing code.** It is the single source of truth for conventions, security rules, and quality standards.

---

## 0. Project Context

**Product:** Internal bid management platform for Arcwide (IFS Elite Partner). Manages prospects, scoping, resource estimation, timeline visualisation, and document generation for IFS Cloud implementation opportunities.

**Stack:**
- Next.js 15 (App Router, Turbopack) + React 19 + TypeScript (strict)
- Styling: Tailwind CSS 4 + shadcn/ui
- Auth: Clerk (`@clerk/nextjs`)
- Database: PostgreSQL (Neon free tier, POC) via Prisma 6
- File storage: Vercel Blob (`@vercel/blob`)
- Document generation: `docx` (npm) + `pptxgenjs`
- State: TanStack Query (server state) + React state (local)
- Deployment: Vercel

**Users:** 20-100 internal Arcwide consultants. No public-facing pages. Every route is authenticated.

**Migration path:** POC runs on Vercel/Clerk/Neon. Production migrates to Azure/Auth.js+EntraID/Azure PostgreSQL. Auth, storage, and AI are abstracted behind wrappers in `lib/` to keep migration bounded.

---

## 1. Security Rules (Non-Negotiable)

### 1.1 Authentication

Clerk handles auth. Every protected route and API endpoint must enforce it.

```typescript
// ❌ WRONG — unprotected API route
export async function GET() {
  const customers = await prisma.customer.findMany()
  return NextResponse.json(customers)
}

// ✅ CORRECT — auth check via wrapper
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const userId = await requireAuth()
  const customers = await prisma.customer.findMany()
  return NextResponse.json(customers)
}
```

**Rules:**
- Every API route calls `requireAuth()` or `requireRole()` as its first action.
- Never trust `userId` from request body — always use the value from `requireAuth()`.
- Pages in `(app)/` are protected by Clerk middleware. Verify the middleware config covers all routes.
- Role checks use `requireRole(['admin', 'bid_manager'])` — never assume authenticated means authorised.

### 1.2 Clerk Middleware

```typescript
// middleware.ts (project root)
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

**Rules:**
- Only `/sign-in`, `/sign-up`, and `/api/health` are public.
- Every other route requires authentication at the middleware level.
- Never add routes to the public matcher without explicit approval.

### 1.3 Role-Based Access

Roles are stored in Clerk `publicMetadata.role`. Three roles for the POC: `admin`, `bid_manager`, `contributor`.

```typescript
// ❌ WRONG — no role check on admin action
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await requireAuth()
  await prisma.customer.delete({ where: { id: params.id } })
}

// ✅ CORRECT — role check
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await requireRole(['admin', 'bid_manager'])
  await prisma.customer.delete({ where: { id: params.id } })
}
```

**Rules:**
- Destructive actions (delete customer, delete opportunity) require `admin` or `bid_manager`.
- Settings and rate card management require `admin`.
- Contributors can only edit opportunities they are assigned to — verify team membership.
- Never check roles client-side only — always enforce server-side.

### 1.4 Input Validation

All user input must be validated server-side. Client-side validation is for UX only.

```typescript
// ❌ WRONG — blindly accepting request body
export async function POST(req: NextRequest) {
  const userId = await requireAuth()
  const body = await req.json()
  const customer = await prisma.customer.create({ data: body })
}

// ✅ CORRECT — validate and whitelist fields
import { z } from 'zod'

const createCustomerSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  industry: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  contactName: z.string().max(200).optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().max(50).optional(),
  notes: z.string().max(5000).optional(),
})

export async function POST(req: NextRequest) {
  const userId = await requireAuth()
  const body = await req.json()
  const parsed = createCustomerSchema.parse(body)
  const customer = await prisma.customer.create({
    data: { ...parsed, createdBy: userId },
  })
  return NextResponse.json(customer, { status: 201 })
}
```

**Rules:**
- Use Zod for all request body validation. Define schemas next to the route or in `lib/schemas/`.
- Validate types, lengths, ranges, and formats.
- Trim all string inputs.
- Whitelist allowed fields — never spread raw `req.body` into Prisma.
- Return specific validation errors to help the client fix input.
- Validate URL params (`id`) — ensure they're valid CUIDs before querying.

### 1.5 SQL Injection Prevention

Prisma uses parameterised queries by default. The risk is raw queries.

```typescript
// ❌ WRONG — string interpolation in raw query
const results = await prisma.$queryRawUnsafe(
  `SELECT * FROM "Customer" WHERE name = '${userInput}'`
)

// ✅ CORRECT — parameterised raw query
const results = await prisma.$queryRaw`
  SELECT * FROM "Customer" WHERE name = ${userInput}
`
```

**Rules:**
- Never use `$queryRawUnsafe` with user input.
- Always use Prisma's tagged template literal for raw queries (`$queryRaw`).
- Prefer Prisma's query builder over raw SQL wherever possible.
- Never concatenate user input into any query string.

### 1.6 File Upload Security

```typescript
// ✅ CORRECT — validate file before upload
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
]
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB

export async function POST(req: NextRequest) {
  const userId = await requireAuth()
  const formData = await req.formData()
  const file = formData.get('file') as File

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'File too large (25 MB max)' }, { status: 400 })

  const blob = await uploadFile(file, `opportunities/${opportunityId}`)
  return NextResponse.json(blob, { status: 201 })
}
```

**Rules:**
- Validate MIME type server-side — never trust the client.
- Enforce file size limits (25 MB for documents, 5 MB for images).
- Use the `uploadFile` wrapper from `lib/storage.ts` — never call Vercel Blob directly.
- Generate safe filenames — never use user-supplied filenames as-is.

### 1.7 Environment Variables

```typescript
// ❌ WRONG — hardcoded secret
const secret = 'sk_test_abc123'

// ❌ WRONG — no validation
const dbUrl = process.env.DATABASE_URL

// ✅ CORRECT — validate on startup
// lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  BLOB_READ_WRITE_TOKEN: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  CLERK_SECRET_KEY: z.string().startsWith('sk_'),
})

export const env = envSchema.parse(process.env)
```

**Rules:**
- Validate all required environment variables at startup with Zod.
- Never commit `.env` — use `.env.example` with placeholder values.
- Client-exposed variables must use `NEXT_PUBLIC_` prefix.
- Never log secrets, tokens, or database URLs.

### 1.8 Content Security

```typescript
// ❌ WRONG — rendering user HTML
<div dangerouslySetInnerHTML={{ __html: userNotes }} />

// ✅ CORRECT — render as text
<p className="whitespace-pre-wrap">{userNotes}</p>
```

**Rules:**
- Never use `dangerouslySetInnerHTML` with user-supplied content.
- If rich HTML rendering is absolutely needed, sanitise with DOMPurify first.
- Never use `eval()`, `Function()`, or `new Function()` with any input.
- Notes and description fields render as plain text with `whitespace-pre-wrap`.

---

## 2. Database Rules

### 2.1 Prisma Client Singleton

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Rules:**
- Always import from `@/lib/prisma` — never instantiate `new PrismaClient()` elsewhere.
- The singleton prevents connection exhaustion in dev (hot reload creates new instances).
- Enable query logging in development only.

### 2.2 Query Performance

```typescript
// ❌ WRONG — N+1 queries
const opportunities = await prisma.opportunity.findMany()
for (const opp of opportunities) {
  opp.customer = await prisma.customer.findUnique({ where: { id: opp.customerId } })
}

// ✅ CORRECT — include related data
const opportunities = await prisma.opportunity.findMany({
  include: {
    customer: true,
    _count: { select: { deliverables: true } },
  },
})
```

```typescript
// ❌ WRONG — fetching everything
const opportunity = await prisma.opportunity.findUnique({
  where: { id },
  include: {
    customer: true,
    scope: true,
    rollouts: { include: { phases: { include: { allocations: true } } } },
    roleConfigs: true,
    deliverables: { include: { versions: true } },
    activities: true,
    teamMembers: true,
  },
})

// ✅ CORRECT — fetch only what the tab needs
// Overview tab
const opportunity = await prisma.opportunity.findUnique({
  where: { id },
  include: { customer: true, teamMembers: true, activities: { take: 20, orderBy: { createdAt: 'desc' } } },
})

// Estimation tab (separate query)
const estimation = await prisma.opportunity.findUnique({
  where: { id },
  include: { roleConfigs: { orderBy: { sortOrder: 'asc' } }, rollouts: { include: { phases: { include: { allocations: true }, orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } } },
})
```

**Rules:**
- Use `include` to fetch related data in one query — never loop with individual queries.
- Only `include` what the current view needs — don't fetch the entire object graph.
- Use `select` to limit returned fields on large tables.
- Use `orderBy` consistently — never rely on database insertion order.
- Use `take` to limit list results (activities, versions).
- Add `@@index` to the Prisma schema for frequently queried foreign keys.

### 2.3 Transactions for Multi-Step Operations

```typescript
// ✅ CORRECT — atomic operation
await prisma.$transaction(async (tx) => {
  const opportunity = await tx.opportunity.update({
    where: { id },
    data: { stage: newStage },
  })

  await tx.activity.create({
    data: {
      opportunityId: id,
      type: 'stage_change',
      description: `Stage changed from ${oldStage} to ${newStage}`,
      metadata: { from: oldStage, to: newStage },
      createdBy: userId,
    },
  })
})
```

**Rules:**
- Use `$transaction` when multiple writes must succeed or fail together.
- Stage changes must always create an activity record — wrap in a transaction.
- Document generation that also creates a deliverable record must use a transaction.

### 2.4 Migrations

```bash
# Development: push schema changes directly
npx prisma db push

# Production: use migrations
npx prisma migrate dev --name describe_the_change
npx prisma migrate deploy
```

**Rules:**
- POC uses `db push` for speed. Switch to migrations before production.
- Never edit migration files after they've been applied.
- Always run `npx prisma generate` after schema changes.
- Seed data goes in `prisma/seed.ts` and is idempotent (safe to run multiple times).

---

## 3. API Design Rules

### 3.1 Route Handler Pattern

Every API route follows this structure:

```typescript
// src/app/api/[resource]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// 1. Schema at the top
const createSchema = z.object({ /* ... */ })

// 2. GET — list
export async function GET(req: NextRequest) {
  const userId = await requireAuth()

  try {
    const data = await prisma.resource.findMany()
    return NextResponse.json(data)
  } catch (error) {
    console.error('GET /api/resource failed:', error)
    return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 })
  }
}

// 3. POST — create
export async function POST(req: NextRequest) {
  const userId = await requireAuth()

  try {
    const body = await req.json()
    const parsed = createSchema.parse(body)
    const created = await prisma.resource.create({ data: { ...parsed, createdBy: userId } })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('POST /api/resource failed:', error)
    return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 })
  }
}
```

**Rules:**
- Auth check is always the first line.
- Zod validation before any database operation.
- Try-catch on every handler — never let unhandled errors crash the route.
- ZodError returns 400 with details. Other errors return 500 with a generic message.
- Never expose internal error messages or stack traces in responses.
- Use correct status codes: 200 (GET/PATCH), 201 (POST), 204 (DELETE), 400, 401, 403, 404, 500.

### 3.2 RESTful Conventions

```
GET    /api/customers              → list customers
POST   /api/customers              → create customer
GET    /api/customers/[id]         → get single customer
PATCH  /api/customers/[id]         → update customer
DELETE /api/customers/[id]         → delete customer

GET    /api/opportunities/[id]/deliverables         → list deliverables for opportunity
POST   /api/opportunities/[id]/deliverables         → create deliverable
POST   /api/opportunities/[id]/generate/estimate    → generate estimate DOCX
```

**Rules:**
- Use plural nouns for resources (`/customers`, not `/customer`).
- Use PATCH for partial updates (not PUT).
- Nest sub-resources under their parent (`/opportunities/[id]/deliverables`).
- Action endpoints use POST with a verb path (`/generate/estimate`).
- Never use verbs in resource URLs (`/getCustomers` is wrong).

### 3.3 Pagination

```typescript
export async function GET(req: NextRequest) {
  const userId = await requireAuth()
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const skip = (page - 1) * limit

  const [data, total] = await Promise.all([
    prisma.customer.findMany({ skip, take: limit, orderBy: { name: 'asc' } }),
    prisma.customer.count(),
  ])

  return NextResponse.json({
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}
```

**Rules:**
- Paginate all list endpoints — never return unbounded results.
- Cap `limit` at 100. Default to 20.
- Validate `page` and `limit` as positive integers.
- Return `pagination` metadata with every list response.

### 3.4 Error Response Format

```typescript
// Success
{ data: [...] }
{ data: {...} }
{ data: [...], pagination: { page, limit, total, pages } }

// Error
{ error: "Customer not found" }
{ error: "Validation failed", details: [{ path: ["name"], message: "Required" }] }
```

**Rules:**
- Wrap list data in `data` key.
- Use `error` string for the message.
- Use `details` array for validation errors (Zod format).
- Keep the format consistent across every endpoint.

---

## 4. Frontend Rules

### 4.1 Component Structure

```
// ❌ WRONG — 800-line page component
// src/app/(app)/opportunities/[id]/page.tsx — everything inline

// ✅ CORRECT — orchestration + focused components
// src/app/(app)/opportunities/[id]/page.tsx — 50 lines, fetches data, renders tabs
// src/components/opportunity/workspace-tabs.tsx — tab navigation
// src/components/estimation/allocation-matrix.tsx — the grid
// src/components/estimation/cost-summary-cards.tsx — the stat cards
```

**Rules:**
- Page files (`page.tsx`) are orchestrators — they fetch data and compose components. Max 100 lines.
- Components are focused — one concern per file. Max 300 lines.
- If a component exceeds 300 lines, split it into sub-components.
- Hooks extract data fetching and business logic out of components.

### 4.2 Server Components vs Client Components

```typescript
// ✅ Server Component (default) — for data fetching, static rendering
// src/app/(app)/customers/page.tsx
import { prisma } from '@/lib/prisma'

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany()
  return <CustomerList customers={customers} />
}

// ✅ Client Component — for interactivity
// src/components/pipeline/kanban-board.tsx
'use client'
import { useState } from 'react'
import { DragDropContext } from '@hello-pangea/dnd'

export function KanbanBoard({ opportunities }: Props) {
  const [items, setItems] = useState(opportunities)
  // ...
}
```

**Rules:**
- Default to Server Components. Add `'use client'` only when needed.
- Client Components are needed for: event handlers, useState/useEffect, browser APIs, TanStack Query hooks, drag-and-drop, form inputs.
- Never import Prisma or server-only code in Client Components.
- Pass serialisable data (not Prisma models with methods) from Server to Client Components.

### 4.3 Data Fetching

```typescript
// ✅ Server Components: fetch directly with Prisma
export default async function Page() {
  const data = await prisma.customer.findMany()
  return <ClientComponent initialData={data} />
}

// ✅ Client Components: TanStack Query for mutations and re-fetching
'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function CustomerList({ initialData }: Props) {
  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => fetch('/api/customers').then(r => r.json()),
    initialData,
  })

  const queryClient = useQueryClient()
  const createMutation = useMutation({
    mutationFn: (data: CreateCustomerInput) =>
      fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => {
        if (!r.ok) throw new Error('Failed to create customer')
        return r.json()
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  })
}
```

**Rules:**
- Server Components use Prisma directly — no API calls to yourself.
- Client Components use TanStack Query for all data fetching and mutations.
- Use `initialData` to hydrate TanStack Query from server-fetched data (avoids loading flash).
- Always invalidate relevant queries after mutations.
- Handle fetch errors — check `r.ok` before parsing JSON.

### 4.4 Forms

```typescript
// ✅ CORRECT — controlled form with validation
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CreateCustomerForm({ onSubmit }: Props) {
  const [name, setName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    if (!name.trim()) {
      setErrors({ name: 'Customer name is required' })
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({ name: name.trim() })
    } catch (error) {
      setErrors({ form: 'Failed to create customer. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Label htmlFor="name">Customer name</Label>
      <Input id="name" value={name} onChange={e => setName(e.target.value)} />
      {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create customer'}
      </Button>
    </form>
  )
}
```

**Rules:**
- Every form must show a loading/disabled state during submission.
- Every form must display validation errors inline next to the relevant field.
- Every form must handle and display submission errors.
- Destructive actions (delete) must show a confirmation dialog first.
- Trim string inputs before submission.

### 4.5 Loading and Error States

```typescript
// ❌ WRONG — no loading or error state
export function CustomerList() {
  const { data } = useCustomers()
  return <ul>{data.map(c => <li key={c.id}>{c.name}</li>)}</ul>
}

// ✅ CORRECT — handle all states
export function CustomerList() {
  const { data, isLoading, error } = useCustomers()

  if (isLoading) return <Skeleton className="h-48 w-full" />
  if (error) return <ErrorMessage message="Failed to load customers" />
  if (!data?.length) return <EmptyState message="No customers yet" action="Create your first customer" />

  return <ul>{data.map(c => <li key={c.id}>{c.name}</li>)}</ul>
}
```

**Rules:**
- Every data-fetching component must handle: loading, error, and empty states.
- Use shadcn/ui `Skeleton` for loading states — not spinners (except for actions in progress).
- Empty states must include guidance on what to do next.

---

## 5. Styling Rules

### 5.1 Tailwind + shadcn/ui

```typescript
// ✅ CORRECT — shadcn/ui components + Tailwind utilities
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Pipeline</CardTitle>
  </CardHeader>
  <CardContent className="flex gap-4">
    <Button variant="outline" size="sm">Filter</Button>
  </CardContent>
</Card>
```

**Rules:**
- Use shadcn/ui components for all standard UI elements (buttons, inputs, dialogs, tables, cards, etc.).
- Use Tailwind utilities for layout, spacing, and custom styling.
- Never write custom CSS files unless absolutely necessary.
- Use `cn()` utility (from shadcn/ui) to merge class names conditionally.
- Arcwide magenta (`#E6007E`) is available as `magenta` in Tailwind config — use for primary brand accents.

### 5.2 Responsive Design

**Rules:**
- Mobile-first: base styles for mobile, `md:` and `lg:` for larger screens.
- The app is primarily desktop (1200px+). It must be functional on tablet (768px+).
- The sidebar collapses on screens below `lg`.
- Tables with many columns (allocation matrix) use horizontal scroll on smaller screens.
- Test on 1280px, 1024px, and 768px viewports.

### 5.3 Colour Usage

```typescript
// ✅ CORRECT — semantic colours from shadcn/ui theme
<p className="text-muted-foreground">Secondary text</p>
<div className="bg-destructive text-destructive-foreground">Error</div>

// ✅ CORRECT — brand magenta for key accents
<div className="bg-magenta text-white">Arcwide branded element</div>

// ❌ WRONG — hardcoded hex in components
<div style={{ color: '#E6007E' }}>Don't do this</div>
```

**Rules:**
- Use Tailwind/shadcn semantic tokens (`primary`, `secondary`, `destructive`, `muted`) for UI elements.
- Use the `magenta` colour for brand-specific accents (pipeline stage badge, logo, document headers).
- Never hardcode hex colours in components — define them in `tailwind.config.ts`.

---

## 6. Abstraction Layer Rules

These wrappers exist to keep the POC-to-production migration bounded. They are the ONLY files that import vendor SDKs directly.

### 6.1 Auth (`lib/auth.ts`)

- POC: imports from `@clerk/nextjs/server`
- Production: will import from Auth.js with Entra ID provider
- **No other file may import from `@clerk/nextjs/server` directly**, except Clerk's React components in the layout (which will be swapped during migration).

### 6.2 Storage (`lib/storage.ts`)

- POC: imports from `@vercel/blob`
- Production: will import from `@azure/storage-blob`
- **No other file may import from `@vercel/blob` directly.**

### 6.3 AI (`lib/ai.ts`) — Phase 1 only

- POC: not implemented (stub functions that return empty)
- Production: will import from Azure OpenAI SDK
- Prepare the interface now so Phase 1 is a drop-in.

**Rules:**
- If you need auth, import from `@/lib/auth`.
- If you need file upload/download, import from `@/lib/storage`.
- Violating this makes migration painful. No exceptions.

---

## 7. Document Generation Rules

### 7.1 DOCX (using `docx` npm package)

```typescript
// ✅ CORRECT — Arcwide branded document
const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 24 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: 'Arial', color: 'E6007E' },
        paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 } },
    ],
  },
  sections: [/* ... */],
})
```

**Rules:**
- All generated documents use Arial font.
- Heading 1 uses magenta (#E6007E). Heading 2 uses black (#1A1A1A).
- Tables use dual widths: `columnWidths` on the table AND `width` on each cell.
- Use `WidthType.DXA` for table widths — never `WidthType.PERCENTAGE` (breaks in Google Docs).
- Use `ShadingType.CLEAR` — never `ShadingType.SOLID` (causes black backgrounds).
- Never use `\n` for line breaks — use separate `Paragraph` elements.
- Never use unicode bullet characters — use `LevelFormat.BULLET` with numbering config.
- Generated files must open correctly in Microsoft Word.

### 7.2 PPTX (using `pptxgenjs`)

**Rules:**
- Use 16:9 layout (`LAYOUT_16x9`).
- Title slides: magenta text for title, black for subtitle.
- Slide background: white. No gradients or patterns.
- Font: Arial throughout.
- Generated files must open correctly in Microsoft PowerPoint.

---

## 8. Performance Rules

### 8.1 Database

- Use `include` and `select` to fetch only needed data.
- Add `@@index` in Prisma schema for foreign keys used in `where` clauses.
- Use `Promise.all` for independent parallel queries.
- Paginate all list endpoints (max 100 items per request).

### 8.2 Frontend

- Lazy-load heavy components (roadmap builder, document preview).
- Memoize expensive calculations (cost summaries) with `useMemo`.
- Memoize allocation matrix cells with `React.memo` to prevent re-renders on every keystroke.
- Use `startTransition` for non-urgent state updates (e.g. filter changes).
- Images (logos in generated docs) should be under 200 KB.

### 8.3 API Routes

- Never perform blocking operations (document generation, file processing) synchronously for large datasets.
- For document generation: generate, upload to Blob Storage, return URL. If generation takes >10s, consider a background job pattern.

---

## 9. Error Handling Rules

### 9.1 API Routes

```typescript
try {
  // operation
} catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Duplicate entry' }, { status: 409 })
    }
  }
  console.error(`[API Error] ${req.method} ${req.url}:`, error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
```

**Rules:**
- Catch Zod errors → 400.
- Catch Prisma P2025 (not found) → 404.
- Catch Prisma P2002 (unique constraint) → 409.
- Everything else → 500 with generic message.
- Log the actual error server-side. Never expose it in the response.

### 9.2 Client-Side

```typescript
// ✅ CORRECT — error boundary for unexpected failures
// src/app/(app)/error.tsx
'use client'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <p className="text-muted-foreground">Something went wrong.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
```

**Rules:**
- Every route group must have an `error.tsx` boundary.
- Mutation errors display as toast notifications (use shadcn/ui `Sonner` or `Toast`).
- Never show raw error messages to users — translate to user-friendly language.

---

## 10. Testing Rules

### 10.1 What to Test

| Priority | What | How |
|----------|------|-----|
| Critical | Auth wrapper (requireAuth, requireRole) | Unit test |
| Critical | Estimation calculations (working days, costs) | Unit test |
| Critical | API routes (CRUD + validation + auth) | Integration test with supertest or Next.js test utils |
| High | Document generation (valid DOCX/PPTX output) | Unit test (check buffer is non-empty, valid zip) |
| Medium | Component rendering (forms, tables) | React Testing Library |

### 10.2 Naming

```
__tests__/
  lib/
    auth.test.ts
    utils.test.ts
  api/
    customers.test.ts
    opportunities.test.ts
  components/
    allocation-matrix.test.tsx
```

**Rules:**
- Test files mirror the source structure under `__tests__/`.
- Use `.test.ts` (not `.spec.ts`) for consistency.
- Test both success and failure cases.
- Mock external services (Clerk, Vercel Blob) — never call real services in tests.

---

## 11. Logging Rules

```typescript
// ❌ WRONG
console.log('User data:', user)
console.log('DB URL:', process.env.DATABASE_URL)

// ✅ CORRECT
console.error(`[API Error] POST /api/customers:`, error.message)
// In production, replace with structured logger (Winston/Pino)
```

**Rules:**
- No `console.log` in production code — use `console.error` for actual errors only.
- Never log passwords, tokens, secrets, or full user objects.
- Never log environment variables.
- API errors log: method, path, error message. Not the full stack in production.
- When moving to production, replace console with a structured logger.

---

## 12. Git Rules

### 12.1 Commit Messages

```
feat: add allocation matrix to estimation tab
fix: correct working days calculation for cross-month phases
refactor: extract cost calculation into useMemo hook
chore: update Prisma schema with sortOrder field
docs: add API endpoint documentation
```

**Rules:**
- Use conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`, `style:`.
- Keep the subject under 72 characters.
- Reference the component or module: `feat(estimation): add XLSX export`.

### 12.2 Branch Strategy

```
main              ← production-ready, deploy triggers on push
feat/estimation   ← feature branches
fix/working-days  ← bug fix branches
```

**Rules:**
- `main` is always deployable.
- Feature branches merge via pull request (even if solo — habit for when the team grows).
- Delete branches after merge.

---

## 13. Anti-Patterns

| Anti-pattern | Correct alternative |
|-------------|---------------------|
| Importing Clerk directly in components | Use `@/lib/auth` wrapper |
| Importing `@vercel/blob` in routes | Use `@/lib/storage` wrapper |
| `req.body.userId` for ownership | `requireAuth()` returns userId |
| Raw `fetch` with manual headers in components | TanStack Query hooks |
| `console.log` in production | `console.error` for errors only |
| Hardcoded colours in components | Tailwind config + semantic tokens |
| `any` type in TypeScript | Define proper interfaces in `types/` |
| Spreading raw `req.body` into Prisma | Zod schema parse first |
| 500+ line page component | Split into orchestrator + sub-components + hooks |
| No loading/error/empty states | Handle all three in every data component |
| `dangerouslySetInnerHTML` with user input | Render as text or sanitise with DOMPurify |
| `$queryRawUnsafe` with user input | Use `$queryRaw` tagged template literal |
| Unbounded list queries | Always paginate with `take` and `skip` |
| Catching errors silently | Log server-side, show user-friendly message client-side |

---

## 14. Pre-Commit Checklist

Before pushing code:

- [ ] Every API route has `requireAuth()` or `requireRole()` as its first call
- [ ] Every API route validates input with Zod
- [ ] No Clerk or Vercel Blob imports outside `lib/auth.ts` and `lib/storage.ts`
- [ ] No hardcoded secrets, tokens, or database URLs
- [ ] No `any` types — proper interfaces defined
- [ ] No `console.log` — only `console.error` for actual errors
- [ ] No `dangerouslySetInnerHTML` without DOMPurify
- [ ] Every page component under 100 lines, every component under 300 lines
- [ ] Loading, error, and empty states handled in every data component
- [ ] Forms have validation, loading state, and error display
- [ ] Destructive actions have confirmation dialogs
- [ ] Monetary values formatted with currency symbol and thousands separator
- [ ] `npx tsc --noEmit` passes (no TypeScript errors)
- [ ] `npx next lint` passes
- [ ] Build succeeds (`npm run build`)

---

*Last updated: May 2026*
