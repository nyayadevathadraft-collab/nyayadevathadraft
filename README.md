# NyayaDraft AI

Production-ready AI legal drafting platform for Indian advocates. Generates court-ready first drafts using a full 8-stage RAG pipeline with verified citations from official Indian legal sources.

> **Important:** All AI outputs are drafts only. They must be reviewed and verified by a qualified Indian advocate before filing. Nothing in this application constitutes legal advice.

---

## Architecture

| Layer | Technology |
|---|---|
| Frontend + API | Next.js 15 (App Router) on Vercel |
| Database | Supabase (PostgreSQL + pgvector + RLS) |
| Auth | Supabase Auth |
| File Storage | Cloudflare R2 (no egress fees) |
| AI / LLM | Google Gemini (Flash + Pro + text-embedding-004) |
| Background Jobs | Inngest |
| Document Export | docx.js (DOCX) + Puppeteer/Chromium (PDF) |

## 8-Stage AI Pipeline

1. **OCR & Extraction** — Gemini Files API reads PDFs/images natively
2. **Fact Normalisation** — Builds chronology, detects contradictions, flags gaps
3. **Issue Identification** — Identifies legal issues + BNS/BNSS/BSA transition analysis
4. **Statute Retrieval** — Fetches exact section text from India Code API
5. **Case-law Research** — Semantic search over indexed judgments (pgvector)
6. **⏸ Authority Selection** — User includes/excludes each suggested authority
7. **Draft Generation** — Gemini Pro drafts using *only* verified facts + retrieved sources
8. **Validation** — Citation check, format check, hallucination guard

---

## Local Setup

### Prerequisites
- Node.js 20+
- A Supabase project (free tier works)
- A Cloudflare R2 bucket
- A Google AI Studio API key
- An Inngest account (free tier)

### 1. Clone and install

```bash
cd nyayadraft-ai
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
# Fill in all values — see the API Keys section below
```

### 3. Set up the database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to Supabase (first time)
npm run db:push

# Run RLS policies — copy-paste prisma/sql/rls.sql into Supabase SQL Editor

# Seed demo data
npm run db:seed
```

### 4. Enable pgvector in Supabase

In Supabase SQL Editor, run:
```sql
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
```

Then add the embedding column (run once after enabling the extension):
```sql
ALTER TABLE authorities ADD COLUMN IF NOT EXISTS embedding vector(768);
CREATE INDEX IF NOT EXISTS authorities_embedding_idx ON authorities USING ivfflat (embedding vector_cosine_ops);
```

### 5. Enable Realtime on the matters table

In Supabase Dashboard → Database → Replication → enable the `matters` table.

### 6. Run the development server

Terminal 1 — Next.js:
```bash
npm run dev
```

Terminal 2 — Inngest Dev Server (processes background jobs locally):
```bash
npm run inngest:dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## API Keys — Where to Get Each One

### 1. Supabase (Free — required for database + auth + realtime)
1. [supabase.com](https://supabase.com) → New project → choose region **ap-south-1 (Mumbai)** for India
2. **Settings → API:**
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
3. **Settings → Database → Connection string:**
   - **Transaction** pooler (port 6543) → `DATABASE_URL` (used by Vercel serverless)
   - **Direct** connection (port 5432) → `DIRECT_URL` (used by Prisma migrations)

### 2. Google Gemini (Free tier — required for all AI)
1. [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Click **Create API key** → `GEMINI_API_KEY`

Free limits: Flash 1,500 req/day · Pro 50 req/day · Embeddings free

### 3. Cloudflare R2 (Free — required for document storage)
1. [dash.cloudflare.com](https://dash.cloudflare.com) → R2 → **Create bucket** → name: `nyayadraft-documents`
2. R2 → **Manage R2 API Tokens** → Create token (Object Read & Write permissions)
3. Copy: Account ID → `R2_ACCOUNT_ID`, Access Key ID → `R2_ACCESS_KEY_ID`, Secret → `R2_SECRET_ACCESS_KEY`
4. Set `R2_BUCKET_NAME=nyayadraft-documents`

### 4. Inngest (Free — required for background pipeline jobs)
1. [app.inngest.com](https://app.inngest.com) → sign up → **Manage → Keys**
2. Event Key → `INNGEST_EVENT_KEY`
3. Signing Key → `INNGEST_SIGNING_KEY`

> For local development, Inngest Dev Server (`npm run inngest:dev`) works without keys.

### 5. India Code API (Free — no key needed)
- Publicly available. No registration. No key.
- Automatically used by the `india-code` connector.

---

## Deploying to Vercel

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full, ordered runbook — Supabase project setup,
Vercel env vars, Inngest wiring, RLS/pgvector/Realtime setup, PDF-export function limits, and a
post-deploy smoke test checklist.

---

## Adding Legal Source Connectors

The connector interface is in `lib/connectors/base.ts`. To add a new source:

1. Create `lib/connectors/your-source.ts` implementing `LegalSourceConnector`
2. Add it to `AVAILABLE_CONNECTORS` in `lib/connectors/registry.ts`
3. Enable it by adding its id to the `ENABLED_CONNECTORS` env var

**Connectors to add next:**
| Source | Notes |
|---|---|
| eCourts | SC/HC judgment feed — public, needs scraping |
| SCC Online | Requires licence key from SCC |
| Manupatra | Requires licence key from Manupatra |
| DRT/CAT | Tribunal decisions — public portal |

---

## Privacy & Security

- Files encrypted at rest (R2 AES-256 default), TLS in transit
- Postgres Row-Level Security — one tenant cannot access another's data
- Audit log for every pipeline action, model call, and user decision
- No private case documents used for AI training
- Sensitive data (Aadhaar, PAN, minors, medical) flagged before inclusion
- Configurable matter deletion/retention policies (admin console)

---

## SaaS Scale-Up Path

| When | Action |
|---|---|
| First paying users | Add `subscriptions` table, wire Stripe (keys already in `.env.example`) |
| Multi-user law firms | Add `memberships` table; enable Supabase Auth Organizations |
| High volume | Upgrade Vercel Pro ($20/mo), Inngest paid, Supabase paid |
| Compliance (SOC2) | Migrate Gemini to Vertex AI (GCP) for enterprise data controls |

---

## Licence & Disclaimer

All AI-generated outputs display the mandatory disclaimer:

> "AI-generated draft. Verify facts, law, limitation, jurisdiction, court rules and citations with a qualified Indian advocate before filing."

This platform is intended for use by qualified Indian advocates only. It does not provide legal advice and is not a substitute for independent legal judgment.
