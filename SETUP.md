# Setup & Go-Live Guide

Step-by-step instructions to get Arcwide Bid Manager running locally and deployed.
Everything is free-tier. Allow ~30–45 minutes the first time.

> The repo already builds and type-checks with placeholder values in `.env.local`,
> but **the app will not actually run** (sign-in, database, uploads) until you replace
> them with real keys from the three services below.

---

## 0. Accounts you need to create

| Service | What it's for | Sign-up | Free tier |
|---------|---------------|---------|-----------|
| **Clerk** | Authentication (sign-in/up, users, roles) | https://dashboard.clerk.com/sign-up | 10k monthly active users |
| **Neon** | PostgreSQL database | https://console.neon.tech/sign_up | 0.5 GB |
| **Vercel** | File storage (Blob) + hosting | https://vercel.com/signup | Hobby plan |
| **GitHub** | Source hosting for Vercel deploy (optional for local) | https://github.com/signup | Free |

Create all four now; the steps below assume you're signed in to each.

---

## 1. Clerk (authentication)

1. Go to the [Clerk dashboard](https://dashboard.clerk.com) → **Create application**.
2. Name it `Arcwide Bid Manager`. Under **Sign-in options**, enable at least
   **Email** (email + password, or email verification code — either is fine for a POC).
   Click **Create application**.
3. On the next screen choose **Next.js**. Clerk shows you two keys — copy both:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_test_…`)
   - `CLERK_SECRET_KEY` (starts with `sk_test_…`)
4. You'll paste these into `.env.local` in step 4. **Nothing else needs configuring in Clerk** —
   the app already ships the `/sign-in` and `/sign-up` pages and the auth middleware.

> The sign-in/up URLs (`/sign-in`, `/sign-up`) are already set via env vars and match the
> built pages. You don't need to set redirect URLs in Clerk for local development.

---

## 2. Neon (database)

1. Go to the [Neon console](https://console.neon.tech) → **Create project**.
2. Name it `arcwide-bid-manager`, pick a region close to you, leave Postgres version default.
   Click **Create**.
3. On the project dashboard, find **Connection string** (the **Connect** button / widget).
   Select the **Prisma** preset if offered, otherwise copy the **pooled** connection string.
   It looks like:
   ```
   postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require
   ```
4. Make sure it ends with `?sslmode=require`. This is your `DATABASE_URL`.

---

## 3. Vercel Blob (file storage)

1. Go to the [Vercel dashboard](https://vercel.com/dashboard) → **Storage** tab → **Create Database**
   → choose **Blob** → name it `arcwide-blob` → **Create**.
2. Open the store → **.env.local** / **Quickstart** tab → copy the value of
   `BLOB_READ_WRITE_TOKEN` (starts with `vercel_blob_rw_…`).

> File upload and document generation write to this store. Until it's configured, those
> features will error, but the rest of the app works.

---

## 4. Fill in `.env.local`

Open [`.env.local`](./.env.local) in the project root and replace the placeholders with the
real values you gathered:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...        # from Clerk (step 1)
CLERK_SECRET_KEY=sk_test_...                          # from Clerk (step 1)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in               # leave as-is
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up               # leave as-is
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require   # from Neon (step 2)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...             # from Vercel Blob (step 3)
```

`.env.local` is gitignored — your secrets stay local. (`.env.example` is the committed template.)

---

## 5. Initialise the database

From the project root:

```bash
npm run db:push     # creates all tables in your Neon database from prisma/schema.prisma
npm run db:seed     # loads demo data (10-role rate card, Acme customer, sample opportunity)
```

Verify it worked:

```bash
npm run db:studio   # opens Prisma Studio at http://localhost:5555 — you should see the seeded rows
```

> `db:seed` is idempotent — safe to re-run; it resets the sample opportunity each time.

---

## 6. Run the app locally

```bash
npm run dev
```

Open **http://localhost:3000**. You'll be redirected to `/sign-in`.

1. Click **Sign up**, create your account (the first real user).
2. After verifying, you land on the **Dashboard**.
3. You'll see the seeded **Acme Manufacturing Oy** customer and the **IFS Cloud ERP
   Implementation** opportunity already in the pipeline.

---

## 7. Give yourself the `admin` role

By default every new user is a **`contributor`**. Deleting customers/opportunities and managing
settings requires **`admin`** or **`bid_manager`**. To promote yourself:

1. Clerk dashboard → **Users** → click your user.
2. Find **Public metadata** → **Edit** → set:
   ```json
   { "role": "admin" }
   ```
3. Save. Sign out and back in (or refresh) so the new role is read.

Valid roles: `admin`, `bid_manager`, `contributor`.

---

## 8. End-to-end smoke test

Walk the full POC flow to confirm everything is wired:

1. **Customers** → create a customer.
2. **Pipeline** → **New opportunity** → pick the customer, save → drag its card between stages
   (an activity is logged).
3. Open the opportunity → **Estimation** tab → adjust role rates, add a rollout + phase, enter
   allocation %, watch the cost summary update → **Export XLSX**.
4. **Scope** tab → select modules, add a requirement and a risk → **Save scope**.
5. **Timeline** tab → see phases render as chevrons → **Export PNG**.
6. **Deliverables** tab → upload a PDF, then **Generate document** → pick *Resource Estimate* →
   download the branded `.docx` and open it in Word.

If all six work, the POC is fully operational.

---

## 9. Deploy to Vercel

1. Create a GitHub repo and push:
   ```bash
   git remote add origin https://github.com/<you>/arcwide-bid-manager.git
   git push -u origin main
   ```
2. Vercel dashboard → **Add New… → Project** → import the GitHub repo. Framework auto-detects as
   **Next.js**; leave build settings default.
3. Before the first deploy, add the **Environment Variables** (same names as `.env.local`):
   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`,
   `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`.
   - Tip: if you created the Blob store inside this same Vercel project, `BLOB_READ_WRITE_TOKEN`
     may already be linked automatically.
4. **Deploy**. After it builds, your app is live at `https://<project>.vercel.app`.
5. Run the schema push against your production database once (locally, with the same
   `DATABASE_URL`): `npm run db:push` (and `npm run db:seed` if you want demo data in prod).

> **Clerk production keys:** the `pk_test_`/`sk_test_` keys work fine for the demo. If you later
> promote to a Clerk *production* instance, swap in the `pk_live_`/`sk_live_` keys in Vercel and
> add your `vercel.app` domain to Clerk's allowed domains.

---

## 10. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Redirected to sign-in forever / "Invalid publishable key" | Clerk keys in `.env.local` are still placeholders or wrong — re-copy from Clerk, restart `npm run dev`. |
| `npm run db:push` hangs or errors on TLS | Ensure `DATABASE_URL` ends with `?sslmode=require` and uses the Neon **pooled** host. |
| Uploads / document generation return 500 | `BLOB_READ_WRITE_TOKEN` missing or invalid; check the Vercel Blob store. |
| "Forbidden" when deleting a customer/opportunity | Your Clerk user isn't `admin`/`bid_manager` — see step 7. |
| Env var changes not picked up | Restart the dev server; Next reads `.env.local` at startup. |
| Changed the Prisma schema | Re-run `npm run db:push` (it regenerates the Prisma client too), or run `npx prisma generate`. |

---

Questions on any step? See [`README.md`](./README.md) for architecture, and
[`PROJECT_RULES.md`](./PROJECT_RULES.md) for engineering standards.
