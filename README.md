# AuditPro — ISO Audit Management (Phase 1 MVP)

Standalone app for SentinelPro Consultants. Phase 1 scope: single standard
(ISO 45001:2018), single consultant login, no AI assistant yet — see the
development plan for later phases.

## What's built

- **Login** — simple email/password auth (Supabase Auth). No public sign-up;
  you create your own account in the Supabase dashboard (step 3 below).
- **My Audits** — list of all saved audits, with status, open, and delete.
  Click "+ New Audit" to start one.
- **Audit Setup** — criteria selection, client/logo, department/process
  owner/team, audit type (drives the classification scheme — see below),
  dates, scope (prepopulated narrative, editable), clause in/out-of-scope
  toggles with required exclusion reasons, methodology (prepopulated
  narrative, editable), sampling disclaimer & confidentiality statement
  (editable defaults), and discontinuation conditions (internal-only — never
  shown in the report unless the audit is actually marked discontinued).
- **Checklist** — all 27 ISO 45001:2018 clauses, with a classification scheme
  that automatically adapts to audit type:
  - Internal / Second-party → Conforming, Nonconforming, OFI, N/A
  - Stage 1 (Recommendation) / Stage 2 (Certification) → Conforming, Minor
    NC, Major NC, OFI, N/A
  - Real camera capture (`getUserMedia`) and real file upload, with actual
    image thumbnails.
- **Findings** — auto-derived register, live counts by classification.
- **Conclusion & Sign-off** — suitability/adequacy/effectiveness conclusion,
  click-to-sign, and a full PDF export: cover with embedded client logo,
  scope/methodology/statements, executive summary, process verification
  statement, nonconformance findings, full clause-by-clause results
  (including conformances), conclusion & sign-off, and a final photo
  evidence appendix grouped by clause.
- **Persistence** — audits, scope, checklist entries, evidence files, and
  sign-offs all save to and load from Supabase. Evidence photos and the
  client logo are uploaded to Supabase Storage (not stored as base64 in the
  database).

## What's still stubbed for Phase 1

- **Word (.docx) export** — button is present, not yet implemented.
- **AI assistant / drafting help / report review / help chatbot** — Phase 3.
- **Closing meeting PPT generation** — Phase 3/4.
- **Autosave** — you need to click "Save Audit" explicitly; there's no
  autosave or offline queue yet (that's part of the later mobile/offline
  phase).

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
