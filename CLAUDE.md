# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
# Development
npm run dev           # Next.js dev server on :3000
npm run inngest:dev   # Inngest local job processor (run in a second terminal)
npm run build         # prisma generate + next build
npm run lint          # ESLint

# Database (Prisma + Supabase)
npm run db:generate   # Regenerate Prisma client after schema changes
npm run db:push       # Push schema to DB (no migration file — use in dev)
npm run db:migrate    # Deploy versioned migrations (production)
npm run db:studio     # Open Prisma Studio UI
npm run db:seed       # Seed demo data via seed/index.ts
```

After every `prisma/schema.prisma` change, run `npm run db:generate` so the Prisma client types stay in sync.

## Architecture

**NyayaDraft AI** is an AI legal drafting platform for Indian advocates. It generates court-ready document drafts using an 8-stage RAG pipeline that fetches verified citations from official Indian legal sources.

### Stack

| Layer | Technology |
|---|---|
| Frontend + API | Next.js 15+ (App Router) on Vercel |
| Database | Supabase (PostgreSQL + pgvector + RLS) — multi-tenant via `tenant_id` on every row |
| Auth | Supabase Auth; middleware enforces session on all non-public paths |
| File Storage | Cloudflare R2 (`lib/storage/r2.ts`) |
| AI | Google Gemini Flash (OCR, extraction) + Pro (drafting) + text-embedding-004 (vector search) |
| Background Jobs | Inngest v4 (`inngest/`) |
| Document Export | `docx` library (DOCX) + Puppeteer/Chromium (PDF) via `lib/doc-gen/` |

### Multi-tenancy

Every Prisma model carries `tenant_id`. Supabase RLS enforces row isolation at the DB layer (`prisma/sql/rls.sql`). The `Tenant → User → Matter` hierarchy is the ownership chain; all other models are scoped under a `Matter`.

### 8-Stage Pipeline

The pipeline runs as two Inngest functions (`inngest/pipeline.ts`) split by a user decision point at Stage 6:

- **`pipeline/phase1.start`** → Stages 1–5 (automated): OCR → fact extraction → issue identification → statute retrieval → case-law search. Ends with `awaiting_selection`.
- **Stage 6** (user action): User includes/excludes suggested authorities on the `/matters/[id]/authorities` page, then triggers Phase 2.
- **`pipeline/phase2.start`** → Stages 7–8: draft generation → citation validation.
- **`pipeline/manual.start`** → Alternative flow skipping Stage 1 (OCR); user types facts directly.

Each stage is a discrete file in `lib/ai/pipeline/stage{N}-*.ts`. Stages communicate via a `PipelineAccumulator` object (`lib/ai/pipeline/types.ts`) that accumulates typed outputs (`Stage1Output` through `Stage8Output`). The accumulator is serialized as JSON and passed between Inngest function runs.

The `matter.pipelineStage` integer (0–8) and `matter.status` enum track progress. Supabase Realtime on the `matters` table pushes live updates to the UI (`components/pipeline/progress-tracker.tsx`).

### Legal Source Connectors

`lib/connectors/base.ts` defines the `LegalSourceConnector` interface. Each connector implements statute search, section fetch, case-law search, and judgment fetch. Active connectors are controlled by the `ENABLED_CONNECTORS` env var (comma-separated IDs). `lib/connectors/registry.ts` is the central registry.

Current connector: `india-code` (India Code API — no key required).  
To add a connector: implement the interface, add to `AVAILABLE_CONNECTORS` in `registry.ts`, and add its ID to `ENABLED_CONNECTORS`.

### Route Structure

```
app/
  (auth)/           # sign-in, sign-up (public)
  dashboard/        # matter list
  matters/
    new/            # matter creation wizard
    [id]/
      upload/       # document upload or manual entry
      facts/        # review extracted facts
      issues/       # review legal issues
      authorities/  # Stage 6 — include/exclude authorities
      draft/        # draft editor (TipTap)
      review-draft/ # validation flags
      export/       # DOCX/PDF export
      history/      # audit log
  admin/            # tenant management
  api/
    matters/        # CRUD
    documents/      # upload to R2, trigger pipeline
    facts/          # per-matter facts
    authorities/    # per-matter authority selection
    drafts/         # draft CRUD
    pipeline/       # trigger phase 2, check status
    export/         # generate DOCX or PDF
    inngest/        # Inngest webhook (must be public)
    auth/           # Supabase auth callback
```

### Key Conventions

- **Supabase clients**: `lib/supabase/server.ts` for Server Components and API routes; `lib/supabase/client.ts` for Client Components. Never use the service role key client-side.
- **Prisma**: singleton at `lib/prisma.ts`. Always include `tenantId` in queries — RLS is a safety net, not the primary guard.
- **i18n**: `next-intl` with messages in `messages/en.json`. All user-visible strings go through the translation key system.
- **Types**: Shared domain types (enums, wizard data, UI constants) live in `types/index.ts`. Pipeline-internal types live in `lib/ai/pipeline/types.ts`.
- **UI components**: Radix UI primitives styled with Tailwind v4; toast notifications via Sonner.
- **Draft editor**: TipTap v3 (`components/draft/editor.tsx`). The draft content is stored as JSON in `drafts.content`.

### Environment Variables

Copy `.env.example` to `.env.local`. Required for local dev:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (Transaction pooler, port 6543), `DIRECT_URL` (Direct, port 5432)
- `GEMINI_API_KEY`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` (optional for local dev — Inngest Dev Server auto-discovers)
- `ENABLED_CONNECTORS=india-code`
