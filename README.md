# AuditPro — ISO Audit Management (Company/Department model)

Standalone app for SentinelPro Consultants. This pass adds real Company and
Department records — the foundation for consolidated company reports,
dashboards, and (later) client login access.

## New in this pass: Companies & Departments

- **"Manage Companies"** — new screen, linked from My Audits. Create a
  company (name + logo — the logo now lives here, not per-audit), add
  departments/sections under it, rename or delete.
- **Audit Setup** — "Company / Client" and "Department / Section" are now
  dropdowns tied to real records, not free text. You can create a new
  company or department inline without leaving Setup ("+ New company…" /
  "+ New department…" at the bottom of each dropdown).
- **Logo is now company-level.** Upload it once per client in Manage
  Companies, and every audit for that company — past and future — pulls the
  current logo automatically. If you update a company's logo later, older
  audits reopened afterward will show the new logo too (not the one that
  was current when the audit was first created).
- This is deliberately the **foundation**, not the full feature set —
  consolidated company reports and dashboards build on top of this next.

### Required one-time migration (do this before using the app after updating)

1. Open Supabase → **SQL Editor** → **+ New query**.
2. Paste and run the full contents of `supabase/migration_002_companies.sql`.
3. **This is safe to run on your existing data** — unlike the original
   `schema.sql`, this migration file does **not** drop any tables. It adds
   the new `companies`/`company_departments` tables and two new columns on
   `audits`, then automatically creates a Company (and Department, if set)
   for every distinct client name your existing audits already have, and
   links each audit to the right one. Your existing audits and their data
   are untouched.
4. After running it, existing audits will show up correctly linked in
   Manage Companies — open one and check its Setup tab shows the right
   company/department selected.

## What's built (from earlier phases)

- On the Conclusion & Sign-off tab, there's now an **"🔍 Review Report"**
  button.
- It sends all of the audit's nonconformities and OFIs (clause,
  classification, evidence note, evidence-available flag, follow-up flag),
  plus your draft conclusion, to the same OpenRouter free-model backend.
- It checks for:
  1. Nonconformities with no evidence note, or evidence marked unavailable
     with no explanation.
  2. Vague/subjective language ("seems fine", "generally okay") instead of
     objective observation.
  3. Contradictions — e.g. conclusion says "suitable and effective" while a
     Major NC exists.
  4. Nonconformities that probably should be flagged for field follow-up but
     aren't.
  5. Thin evidence on OFIs.
- Issues are shown as a color-coded list (high/medium/low), or a clear "no
  issues found" message if the checklist looks consistent.
- This is a **helper check, not a gate** — it doesn't block "Mark as Final";
  it's there to catch things before you commit to sending the report out.
- Uses the same `OPENROUTER_API_KEY` env var as the drafting assistant — no
  extra setup needed if that's already configured.

## New in the previous pass: AI Drafting Assistant

- Each clause's "Evidence / Observation" box has an **"✨ Improve Wording"**
  button. It sends your draft note (plus clause context) to Claude via a
  secure server-side function and suggests a clearer, more objective
  rewrite — you choose "Use this" or "Discard", nothing auto-overwrites.

### Setting up the API key (required for both AI features)

Uses **OpenRouter** (same provider as MineClosure360's AI assistant), routed
to its free-model tier — no cost.

1. Go to **openrouter.ai**, sign up (no credit card required for free
   models).
2. Go to **Keys** → **Create Key**, copy it (starts with `sk-or-...`).
3. In your **Vercel** project → **Settings** → **Environment Variables**,
   add:
   - Key: `OPENROUTER_API_KEY`
   - Value: the key you just copied
   (No `VITE_` prefix — it must stay server-side only, never exposed to the
   browser.)
4. Redeploy (Vercel → Deployments → ⋯ → Redeploy, or just push a commit).

The backend uses `openrouter/free`, OpenRouter's own auto-router that always
points at whatever free model is currently available — this matters because
specific free models (Llama, DeepSeek, etc.) rotate in and out without
notice. If you'd rather pin a specific model, edit `api/ai-assist.js` and
check **openrouter.ai/models** for current free-tier availability first.

Free tier rate limits (as of mid-2026): roughly 20 requests/minute and
50–1000 requests/day depending on whether you've ever added at least $10 in
OpenRouter credits (raises the daily cap even if you keep using free
models). Fine for solo consultant use; if you hit limits, adding a small
amount of credit removes the daily cap without forcing you onto paid models.

### Important: this feature only works once deployed to Vercel

The "Improve Wording" button calls `/api/ai-assist`, a **Vercel serverless
function**. Plain `npm run dev` (Vite) does not run serverless functions, so
this button will fail locally with a 404 unless you install the Vercel CLI
and run `vercel dev` instead. Simplest path: build/test other features
locally as usual, but test this specific feature on the live Vercel URL
after deploying.

## What's built (from Phase 1 & 2)

- **Login** — simple email/password auth (Supabase Auth). No public sign-up;
  you create your own account in the Supabase dashboard.
- **My Audits** — list of all saved audits (now showing which standard each
  is against), with status, open/edit, and delete.
- **Audit Setup** — choose the audit criteria (ISO 45001:2018, ISO 9001:2015,
  or ISO 14001:2015 — click to select, single-select). Switching standards
  on an audit that already has checklist data prompts for confirmation and
  resets the checklist/scope to the new standard's clauses. Client/logo,
  department/process owner/team, audit type (drives the classification
  scheme — see below), dates, scope (prepopulated narrative that adapts to
  the selected standard, editable), clause in/out-of-scope toggles with
  required exclusion reasons, methodology (prepopulated narrative, editable),
  sampling disclaimer & confidentiality statement (editable defaults), and
  discontinuation conditions (internal-only — never shown in the report
  unless the audit is actually marked discontinued).
- **Checklist** — full clause set for whichever standard is selected, with a
  classification scheme that automatically adapts to audit type:
  - Internal / Second-party → Conforming, Nonconforming, OFI, N/A
  - Stage 1 (Recommendation) / Stage 2 (Certification) → Conforming, Minor
    NC, Major NC, OFI, N/A
  - Real camera capture (`getUserMedia`) and real file upload, with actual
    image thumbnails.
- **Findings** — auto-derived register, live counts by classification.
- **Conclusion & Sign-off** — suitability/adequacy/effectiveness conclusion
  (wording adapts to the audited standard), click-to-sign, and a full PDF
  export: cover with embedded client logo and the correct standard/system
  name, scope/methodology/statements, executive summary, process
  verification statement, nonconformance findings, full clause-by-clause
  results (including conformances), conclusion & sign-off, and a final photo
  evidence appendix grouped by clause.
- **Persistence** — audits (including which standard), scope, checklist
  entries, evidence files, and sign-offs all save to and load from
  Supabase. Evidence photos and the client logo are uploaded to Supabase
  Storage (not stored as base64 in the database).

## What's still stubbed

- **Word (.docx) export** — button is present, not yet implemented.
- **AI help chatbot** — last piece of Phase 3, not yet built.
- **Closing meeting PPT generation** — Phase 3/4.
- **Autosave** — you need to click "Save Audit" explicitly.
- **Integrated/combined audits** (multiple standards in one audit) — by
  design decision, not planned; one standard per audit.

## Getting started locally

```bash
npm install
cp .env.example .env   # then fill in your Supabase project URL + anon key
npm run dev
```

## Setting up Supabase (do this before first run)

1. Create a new Supabase project (or reuse the one from earlier, but note
   the schema below replaces the earlier draft — rerunning it will drop and
   recreate the audit tables).
2. Open the SQL editor and run `supabase/schema.sql` in full.
3. **Create your login account**: Supabase dashboard → Authentication →
   Users → Add user → enter your email and a password. This is the account
   you'll sign in with — there's no self-signup screen in the app itself.
4. **Create two Storage buckets** (Storage tab → New bucket), both set to
   **Public**:
   - `evidence` — for in-app camera/file evidence
   - `logos` — for client logos
5. Run the storage policy statements at the bottom of `supabase/schema.sql`
   (they're commented out — uncomment and run them in the SQL editor) so
   only your authenticated account can upload/delete, while report
   generation can still read the public URLs.
6. Copy your project URL and anon key into `.env` (see `.env.example`).

## Deploying

Deploys to Vercel with zero config (`vercel.json` is intentionally empty —
same pattern as MineClosure360). Add `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` as environment variables in the Vercel project
settings before deploying.

```bash
git init
git add .
git commit -m "Phase 1: Supabase persistence, real camera/upload, full report"
git remote add origin https://github.com/mwewakas2010/auditpro.git
git push -u origin main
```

Then import the repo in Vercel and add the two environment variables above.

## Design tokens

Navy `#16253D` / gold `#B8862B` accent on a warm paper background, Fraunces
for display type, IBM Plex Sans for body copy, IBM Plex Mono for clause
codes and audit metadata.

## Project structure

```
src/
  data/
    iso45001Clauses.js   — clause library (title + requirement text)
    schemes.js           — classification scheme logic, discontinuation
                            conditions, default narratives/statements
  components/
    Login.jsx
    AuditList.jsx
    AuditEditor.jsx        — the four-tab editor shell, handles load/save
    AuditSetup.jsx
    Checklist.jsx
    CameraCapture.jsx      — getUserMedia camera modal
    Findings.jsx
    ReportSignoff.jsx
  utils/
    pdfExport.js            — jsPDF report generator (autoTable-based)
  lib/
    supabaseClient.js
    auditRepo.js            — all Supabase reads/writes + Storage uploads
  App.jsx                    — auth gate + routing between list and editor
supabase/
  schema.sql                 — database schema (RLS included) + storage
                                policy statements
```
