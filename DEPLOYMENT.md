# Deploying NyayaDraft AI to Vercel

This is the full, ordered runbook for taking this repo from a local checkout to a working
production deployment on Vercel. Follow the steps in order — later steps (Inngest sync,
RLS policies) depend on the app already being live at its final URL.

> Quick reference only — see `README.md` for local setup and `CLAUDE.md` for architecture.

---

## 0. Before you start

Confirm the repo builds locally. This project has no CI yet, so a broken build is only
caught when Vercel tries to build it:

```bash
npm install
npm run build
```

If this fails locally, it will fail on Vercel too — fix it before pushing.

You'll need accounts for: **GitHub**, **Vercel**, **Supabase**, **Cloudflare** (R2),
**Google AI Studio** (Gemini), and **Inngest**. All have usable free tiers.

---

## 1. Push to GitHub

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

If the repo isn't initialized yet: `git init && git add . && git commit -m "initial commit"` first.

---

## 2. Create the Supabase project

1. [supabase.com](https://supabase.com) → **New project**. Pick region **ap-south-1 (Mumbai)**
   for lowest latency from India.
2. **Settings → API** — copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-side only, never exposed to the browser)
3. **Settings → Database → Connection string** — copy both:
   - **Transaction pooler** (port `6543`) → `DATABASE_URL` — this is what Vercel's serverless
     functions must use (a direct connection will exhaust Postgres connection limits under load)
   - **Direct connection** (port `5432`) → `DIRECT_URL` — used only for schema migrations

Keep this tab open; you'll come back to it in steps 6 and 7.

---

## 3. Import the project into Vercel

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → select your repo.
2. Framework preset: **Next.js** (auto-detected from `package.json`).
3. Build command: leave as default — `npm run build` already runs `prisma generate && next build`
   (see `package.json`).
4. **Root Directory**: leave as `.` (this is a single-app repo, not a monorepo).
5. Under **Settings → General → Node.js Version**, pin it to **20.x** to match the version this
   app is developed and tested against.
6. Don't click Deploy yet — add environment variables first (next step), otherwise the first
   build will fail on missing env vars.

---

## 4. Set environment variables

In **Project Settings → Environment Variables**, add every key below. Apply each to
**Production**, **Preview**, and **Development** unless noted otherwise.

| Variable | Value source | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | Mark **Sensitive** in Vercel |
| `DATABASE_URL` | Supabase → Connection string (Transaction, port 6543) | Must include `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Supabase → Connection string (Direct, port 5432) | Used for migrations, not at runtime |
| `GEMINI_API_KEY` | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) | Mark **Sensitive** |
| `R2_ACCOUNT_ID` | Cloudflare dashboard | |
| `R2_ACCESS_KEY_ID` | Cloudflare → R2 → Manage API Tokens | |
| `R2_SECRET_ACCESS_KEY` | Cloudflare → R2 → Manage API Tokens | Mark **Sensitive** |
| `R2_BUCKET_NAME` | e.g. `nyayadraft-documents` | |
| `INNGEST_EVENT_KEY` | app.inngest.com → Manage → Keys | Required in prod (dev server doesn't need it) |
| `INNGEST_SIGNING_KEY` | app.inngest.com → Manage → Keys | Mark **Sensitive** — required in prod |
| `ENABLED_CONNECTORS` | `india-code` | |
| `NEXT_PUBLIC_APP_URL` | see note below | |

**`NEXT_PUBLIC_APP_URL` chicken-and-egg:** you don't know your final URL until after the first
deploy. Set it to a placeholder (`https://placeholder.vercel.app`) for the first deploy, then
once Vercel assigns your real domain (or you attach a custom one), update this variable to the
real value and redeploy. Do this before wiring Inngest in step 7, since Inngest needs the real URL.

---

## 5. First deploy

Click **Deploy**. Vercel will run `npm install` then `npm run build`
(`prisma generate && next build`).

If it fails, check the build log first — the most common causes are a missing env var (Prisma
needs `DATABASE_URL`/`DIRECT_URL` at build time for `prisma generate`) or a Node version mismatch.

Once it succeeds, note the assigned URL (e.g. `nyayadraft-ai.vercel.app`) and go back to step 4
to set the real `NEXT_PUBLIC_APP_URL`, then redeploy (**Deployments → ⋯ → Redeploy**).

---

## 6. Set up the production database

Run these against the **production** Supabase project (use its `DIRECT_URL`, not local):

```bash
# From your local machine, pointed at production:
DATABASE_URL="<prod DATABASE_URL>" DIRECT_URL="<prod DIRECT_URL>" npm run db:push
```

> This repo currently has no versioned migrations in `prisma/migrations/` — schema changes are
> pushed directly with `prisma db push`. Use `npm run db:migrate` (`prisma migrate deploy`)
> instead only after you've generated your first migration with `prisma migrate dev`.

Then, in Supabase **SQL Editor**, run in order:

```sql
-- 1. Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
```

```sql
-- 2. Add the embedding column (after the extension is enabled)
ALTER TABLE authorities ADD COLUMN IF NOT EXISTS embedding vector(768);
CREATE INDEX IF NOT EXISTS authorities_embedding_idx ON authorities USING ivfflat (embedding vector_cosine_ops);
```

```sql
-- 3. Apply RLS policies (paste the full contents of prisma/sql/rls.sql)
```

Then in **Supabase Dashboard → Database → Replication**, enable Realtime on the `matters` table
(the pipeline progress tracker subscribes to it).

Finally, seed demo data if needed: `DATABASE_URL="<prod>" npm run db:seed`.

---

## 7. Wire up Inngest (background pipeline jobs)

The 8-stage pipeline runs entirely through Inngest functions — nothing in the pipeline works in
production until this step is done.

1. In [app.inngest.com](https://app.inngest.com) → **Apps** → **Sync new app**.
2. App URL: `https://<your-real-domain>/api/inngest` (this route is public — no auth required,
   see `middleware.ts`).
3. Inngest auto-discovers `pipeline/phase1.start`, `pipeline/phase2.start`, and
   `pipeline/manual.start` from `inngest/pipeline.ts`.
4. Confirm `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` are set in Vercel (step 4) — without
   them, Inngest Cloud can't authenticate against your deployed functions.

---

## 8. PDF export function limits

PDF export (`app/api/export/[draftId]/route.ts`) launches headless Chromium via
`@sparticuz/chromium` + `puppeteer-core` (see `lib/doc-gen/pdf.ts`). Cold-starting Chromium and
rendering a document can take longer than Vercel's default serverless function timeout,
especially on the first request after a deploy.

Add an explicit duration to the route to avoid intermittent timeouts:

```ts
// app/api/export/[draftId]/route.ts
export const maxDuration = 60; // seconds — check your Vercel plan's ceiling
```

Hobby-plan function duration and memory ceilings are lower than Pro's — if PDF export times out
or OOMs in production, check **Project Settings → Functions** and consider upgrading the plan.
DOCX export (`docx` library, no headless browser) is unaffected.

---

## 9. Custom domain (optional)

**Project Settings → Domains** → add your domain → follow Vercel's DNS instructions. Once it's
verified, update `NEXT_PUBLIC_APP_URL` and the Inngest app URL (step 7) to match, then redeploy.

---

## 10. Post-deploy smoke test

Walk through the full pipeline once against production before calling it done:

- [ ] Sign up / sign in (Supabase Auth)
- [ ] Create a matter, upload a document → Stage 1 (OCR) completes
- [ ] Facts, issues, and suggested authorities appear (Stages 2–5)
- [ ] Include/exclude authorities on the `authorities` page and trigger Phase 2
- [ ] Draft is generated with citations (Stages 7–8)
- [ ] Export as DOCX **and** PDF
- [ ] Check Inngest Cloud dashboard — all runs show `Completed`, none stuck in `Running`/`Failed`
- [ ] Check Supabase Realtime is pushing pipeline status updates to the UI live

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Build fails: `Cannot find module 'prisma'` or similar | Missing `package.json`/`package-lock.json` in the repo, or `npm run build` not resolving `prisma generate` — verify both files are committed |
| Build succeeds, all pages 500 | Missing/incorrect Supabase or `DATABASE_URL` env var |
| Pipeline never progresses past `awaiting Stage 1` | Inngest app not synced (step 7), or `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY` missing |
| `/api/inngest` returns 401/redirects to sign-in | `middleware.ts` `PUBLIC_PATHS` no longer includes `/api/inngest` — check for regressions |
| PDF export times out or 500s only in production | Function duration/memory ceiling — see step 8 |
| "too many connections" errors under load | `DATABASE_URL` pointed at the direct connection instead of the transaction pooler |
