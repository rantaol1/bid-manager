# Arcwide Bid Manager (POC)

Platform for IFS implementation consultants to manage prospects, scope implementations,
estimate resources/costs, visualise timelines, and generate branded proposal documents.

Built per [`CLAUDE.md`](./CLAUDE.md) (what to build) and [`PROJECT_RULES.md`](./PROJECT_RULES.md) (how to build).

## Stack

- Next.js 16 (App Router, Turbopack) · React 19 · TypeScript (strict)
- Tailwind CSS 4 · shadcn/ui (Base UI primitives)
- Clerk auth · Neon PostgreSQL via Prisma 6 · Vercel Blob storage
- TanStack Query + Table · @hello-pangea/dnd · recharts · date-fns · zod
- `docx` + `pptxgenjs` (documents) · `exceljs` (XLSX export) · `html-to-image` (roadmap PNG)

## Getting started

1. **Install** (already done if cloned with `node_modules`):
   ```bash
   npm install
   ```
2. **Configure environment** — copy `.env.example` to `.env.local` and fill in real values:
   ```bash
   cp .env.example .env.local
   ```
   You need accounts on [Clerk](https://dashboard.clerk.com), [Neon](https://neon.tech),
   and [Vercel Blob](https://vercel.com/dashboard/stores). The repo ships with a placeholder
   `.env.local` so the app type-checks and builds, but live auth/DB/storage need real keys.
3. **Set up the database**:
   ```bash
   npm run db:push      # push the Prisma schema to Neon
   npm run db:seed      # idempotent demo data (rate card, Acme customer, sample opportunity)
   npm run db:studio    # inspect data
   ```
4. **Run**:
   ```bash
   npm run dev          # http://localhost:3000
   ```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:push` / `db:seed` / `db:studio` | Prisma helpers |

## Features (build steps 1–12)

Customers (CRUD + search) · Opportunities & pipeline (kanban drag-to-stage + sortable table) ·
Dashboard (KPIs, value-by-stage chart, activity feed) · Opportunity workspace (Overview, Scope,
Estimation, Timeline, Deliverables) · Estimation engine (roles, rollouts/phases, allocation
matrix, live costing, XLSX export) · Scope (module picker, requirements, fit-gap, risks) ·
Timeline (chevron roadmap, go-lives, PNG export) · Deliverables (drag-drop upload, version
history) · Document generation (branded DOCX + PPTX, auto-saved as versioned deliverables).

## Architecture notes

- **Abstraction layers** — all Clerk access goes through `src/lib/auth.ts`; all blob storage
  through `src/lib/storage.ts` (per `PROJECT_RULES.md` §6) to keep the POC→production migration bounded.
- **Estimation engine** — `src/lib/estimation.ts` is a pure, deterministic calculator reused by
  the UI, the XLSX export, and document generation.
- **API routes** — every handler calls `requireAuth()`/`requireRole()` first, validates input
  with Zod, and funnels errors through `src/lib/api.ts` (consistent 400/401/403/404/409/500).

## Deviations from the original spec

These were forced by the current toolchain (knowledge cutoff vs. May 2026 package versions) and
are noted for transparency:

- **Next.js 16** (spec assumed 15). `create-next-app@latest` installs 16; it is backward
  compatible with all App Router patterns the spec uses. Route handler `params` are awaited
  (Promise), as required by Next 15+.
- **shadcn/ui on Base UI** (spec examples assumed Radix `asChild`). The current shadcn CLI emits
  Base UI primitives, which use a `render={<El/>}` prop instead of `asChild`. Functionally
  equivalent; all components use the `render` pattern.
- **Prisma pinned to v6 / Zod pinned to v3** — the spec's provided `schema.prisma`, `prisma.ts`,
  and validation/error patterns target these majors. Latest (Prisma 7 / Zod 4) have breaking
  changes that would invalidate the spec-provided foundation code.

## Deployment

Push to a GitHub repo and import into Vercel (Git integration). Set the same environment
variables in the Vercel project. The build command is `next build`; no extra config needed.
