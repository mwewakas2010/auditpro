# AuditPro — ISO Audit Management (CCV Offline Sync)

Standalone app for SentinelPro Consultants. This pass brings Critical
Control Verifications to offline parity with ISO audits — same proven
pattern, adapted to the CCV data shape.

## New in this pass: CCV offline sync

- Open a CCV while online, then lose signal entirely — you can keep
  marking Yes/No, adding photos, filling in recommendations for "No"
  items, editing Setup fields, all with zero connection.
- Same **Online/Offline indicator** next to the save buttons.
- **Save CCV while offline** saves to the device and tells you clearly,
  rather than failing.
- **Syncs automatically the moment connectivity returns** — no button to
  press.
- If you open a CCV with no connection, falls back to the last version
  saved on this device, with the same clear banner explaining that.
- Real server errors (not just connectivity issues) are surfaced plainly
  rather than mislabeled as an offline save — same fix applied here as was
  applied to the ISO audit module earlier.

**How it's built**: a second, separate object store (`ccvs`) in the same
local IndexedDB database used for offline audits — additive, doesn't touch
your existing offline audit drafts. Bumped the local database version to
add it; this is a one-time, automatic upgrade the browser handles itself,
nothing you need to do.

### No new Supabase migration for this pass

This is entirely client-side (local browser storage) — nothing to run in
Supabase.

## What's built (from earlier passes)

### Company & logo on CCV reports

- CCV form now has a **Company** dropdown at the top of its metadata,
  pulling from the same company list used by ISO audits.
- The company's logo (already uploaded once in Manage Companies) now
  appears on the CCV's PDF cover, alongside the company name — same reuse
  pattern as ISO audit reports, no re-uploading needed per CCV.
- The My CCVs list now shows the linked company name next to each entry.
- This is a genuine link to the Company record (not a copied snapshot), so
  if you update a company's logo later, CCV reports generated afterward
  pick up the new one automatically — consistent with how ISO audits work.

### Required migration

Run `supabase/migration_007_ccv_company.sql` — adds one nullable column
(`company_id`) to `ccv_instances`. Additive, safe on existing data.

## What's built (from earlier passes)

### Critical Controls Verification (CCVs) module

**A new permanent nav item**, "Critical Controls," separate from My Audits.

**The general template system** (the actual foundation of this pass):
- `checklist_templates` → `checklist_template_categories` → `checklist_template_items`
  — a real, general data model, not hardcoded like the ISO clause files.
  Any future checklist type (equipment inspection, safety walkthrough, etc.)
  slots into this same structure.
- **In-app template authoring is deferred** — for this first slice, new
  templates get added as seed data (same as the Mobile Equipment CCV form
  below), not through a builder UI. The data model is already shaped for a
  builder to be added later without a schema change.

**The Mobile Equipment CCV** — seeded from your uploaded form, matching its
exact structure:
- Document control header (Document Reference, Revision Number, Total
  Pages, Date of Issue, Date of Next Review) — these belong to the
  *template*, not each completed instance, matching how the source form
  works (FM0635 Rev 01 stays fixed across every use)
- Its own metadata fields — Assessors, Date/Time, Location, Department,
  Section — **not** tied to your Company/Department model, since CCVs
  don't need the "which client am I auditing" concept
- Seven categories exactly as in the source form, each a **Yes/No**
  compliance checklist (not the ISO 5-state classification)
- **Auto-calculated summary score** per category (Yes count / total items),
  live as you work
- **Recommendations only triggered by "No" answers** — marking an item
  "No" reveals inline Action / Responsible Person / Due Date fields right
  there; the PDF report compiles every "No" item's recommendation into a
  single Recommendations table at the end, exactly like the source form
- **Real camera capture and file upload per item** — reuses the same
  camera component already built for ISO audits
- **Save / reopen / edit / delete**, same CRUD pattern as audits
- **PDF export** matching the source form's actual layout — header block,
  metadata, category tables with Yes/No highlighting, per-category summary
  scores, and the compiled Recommendations table

### Deliberately deferred from this pass

- **Word (.docx) export** — PDF only for now, per your call given the real
  cost of building a second document format
- **In-app template builder** — new templates still need to be added as
  seed data (send me a form, I translate it into the template structure)
- **Subscriber organization availability** — built for your consultant
  account only right now; extending to subscriber orgs is a natural, but
  separate, next step
- **Offline sync** — unlike the ISO audit module, CCVs don't yet have the
  local-first/offline-save behavior built in

### Required migration

Run `supabase/migration_006_ccv.sql`. Additive — creates six new tables and
seeds the Mobile Equipment CCV template. **Important**: this seed only runs
once — if you ever re-run this migration file, check `checklist_templates`
for an existing "Mobile Equipment Critical Control Verification" row first,
or you'll get a duplicate.

## What's built (from earlier passes)

### Mandatory document flags per clause

- Distinct from the general "evidence to check" hints, clauses where the
  standard **explicitly requires** a document to be maintained (like a
  policy) or a record to be retained (like management review minutes) now
  show a **"⚠️ Mandatory: ..."** line at the top of that same expandable
  hint — worded to describe exactly what the standard requires.
- Coverage: **17 of 27** clauses in ISO 45001:2018, **18 of 28** in ISO
  9001:2015, **13 of 26** in ISO 14001:2015 are flagged — roughly matching
  each standard's actual documented-information burden (9001 and 45001 are
  more document-heavy in clauses 6–10; 14001 somewhat less so).
- Same treatment as the evidence hints: **confirmed excluded from every
  report** — grepped both `pdfExport.js` and `consolidatedReport.js`, this
  field isn't referenced in either file at all.
- Worth a sanity check on your end: I mapped these from general ISO
  auditor knowledge of each standard's documented-information
  requirements, applied to this app's simplified (non-sub-sub-clause)
  clause structure. Worth spot-checking a handful against your own
  certification-body training materials before relying on it heavily.

## What's built (from earlier passes)

### "Evidence to check" guidance per clause

- Every clause across ISO 45001:2018, ISO 9001:2015, and ISO 14001:2015 now
  has a collapsible **"💡 Evidence to check"** hint in the Checklist tab —
  at least 3 example evidence sources (documents, records, or interview
  angles) an auditor might check for that specific requirement.
- This is purely a **working reference for the auditor** — click to expand,
  collapsed by default so it doesn't clutter the screen.
- **Confirmed excluded from every report**: neither `pdfExport.js` (the
  single-audit report) nor `consolidatedReport.js` (the multi-audit company
  report) reference this field anywhere — it's structurally impossible for
  it to leak into a report, not just something we're careful not to include.
- No database changes — this lives entirely in the clause library files
  (`src/data/iso45001Clauses.js`, `iso9001Clauses.js`, `iso14001Clauses.js`),
  so there's nothing to migrate.

## What's built (from earlier passes)

### Trial tracking & access gating

- Every new organization gets a **30-day free trial** automatically on
  sign-up.
- A trial countdown banner shows in the sidebar (and mobile top bar) once
  access is active.
- When the trial expires, the organization is switched to **read-only via
  the Billing screen** — they can't create or edit audits until choosing a
  plan, but nothing about their existing data is touched or lost.
- A **Billing & Plans** screen (new permanent nav item) shows the three
  proposed tiers — Starter, Growth, Pro — each with monthly/annual pricing
  in ZMW. The pricing shown is a starting proposal, easy to adjust later.
- The subscribe buttons are intentionally disabled right now (**"coming
  soon"**) — this pass is the state machine and gating logic only; actual
  checkout is next.
- Also modeled (state machine ready, no live trigger yet): a **past_due**
  status with a 7-day grace period after a failed/cancelled payment, before
  restricting access the same way trial expiry does.

### How to test the gating without waiting 30 days

In Supabase → Table Editor → `organizations`, you can manually edit a test
org's row to simulate any state:
- Set `trial_ends_at` to a date in the past → simulates trial expiry
- Set `subscription_status` to `'active'` → simulates a paying customer
- Set `subscription_status` to `'past_due'` and `grace_period_ends_at` to a
  future/past date → simulates the grace-period behavior

### Required migration

Run `supabase/migration_005_billing.sql` — additive only, adds the new
subscription/trial columns to `organizations`. Existing organizations
(including any test orgs from earlier passes) get a fresh 30-day trial
window starting from when you run it, so nobody gets abruptly cut off.

## Important context for the next pass (real payment)

**Stripe was ruled out** — it doesn't support payouts to a Zambian bank
account (its African coverage, inherited from acquiring Paystack, only
covers Ghana, Kenya, Nigeria, South Africa, and Côte d'Ivoire). **Flutterwave**
is the planned provider instead — it holds an actual Bank of Zambia payment
system license and supports ZMW payouts directly.

One real limitation to know about going in: Flutterwave's automatic
recurring billing (auto-charging on schedule without the customer coming
back) **only works reliably with card payments**, not mobile money — worth
knowing given how widely mobile money is used in Zambia. Subscribers can
still pay via mobile money, but true "set-and-forget" renewal is a
card-specific feature; this will need to be designed around in the next
pass, not silently overpromised.

## What's built (from earlier passes)

**Two account types now exist, sharing the same app:**
- **Consultant account (yours)** — exactly as before: Dashboard, My Audits,
  Manage Companies, full multi-client audit workflow. Nothing about how you
  use it has changed.
- **Subscriber organizations (new)** — a small organization signs up
  themselves, gets their own account, and runs their own internal
  audits/inspections using the existing ISO checklists — no consultant
  involvement, no "Companies" concept (the org *is* the entity auditing
  itself).

**What's included in this first slice:**
- Public sign-up (new "Sign up" link on the login screen) — creates a user
  account and an Organization in one step
- A simplified "Subscriber Shell" — just My Audits + the audit editor, no
  Companies/Dashboard analytics clutter
- Reuses all existing ISO 9001/14001/45001 checklists, the same PDF report
  generator, the same offline sync — all of it, unchanged
- Report branding automatically uses the organization's own name instead of
  "SentinelPro Consultants" for subscriber-mode reports

**Explicitly NOT in this first slice (deferred, as planned):**
- No billing/Stripe — sign-up is currently free
- No team invites — one user per organization for now (the person who signs
  up is that org's only member)
- No new checklist types beyond the existing three ISO standards
- No custom/build-your-own checklists

### Required migration

Run `supabase/migration_004_organizations.sql` in the Supabase SQL editor.
Additive only — creates `organizations` and `organization_members` tables,
adds an `organization_id` column to `audits`, and extends the existing RLS
policies to allow organization-member access **in addition to** the
existing owner-based access. Your consultant account's behavior is
completely unaffected — it has no organization membership, so none of the
new logic applies to it.

### A known rough edge worth knowing about

New sign-ups go through Supabase's default email confirmation flow, which
uses Supabase's built-in (rate-limited, generically-branded) transactional
email sender. Fine for testing with a handful of sign-ups, but if you start
getting real subscribers, configuring a custom SMTP provider in Supabase
(Settings → Auth → SMTP Settings) will be worth doing for reliable,
properly-branded delivery — not built in this pass.

## What's built (from earlier passes)

**What works offline now:**
- Once you've opened an audit while online, you can keep editing it —
  checklist entries, evidence photos, Setup fields — with **zero signal**.
  Everything saves to the device automatically as you work (a local
  safety-net copy, ~600ms after each change).
- An **Online/Offline indicator** sits next to the Save Audit button at all
  times, so you always know your current state.
- Clicking **Save Audit while offline** doesn't error out — it saves to the
  device and tells you clearly: *"📴 Offline — saved on this device. Will
  sync automatically once you're back online."*
- The moment connectivity returns, **all pending offline changes sync to
  Supabase automatically** — no button to press. You'll see a message like
  *"Back online — synced 2 pending audit(s)."*
- If you open an audit and there's no connection, it falls back to the last
  version saved on this device, with a clear banner explaining that's what
  you're looking at.
- The Setup screen's Company/Department dropdowns fall back to the last
  cached company list if you're offline — so you can still pick an existing
  company/department for field work, even with zero signal.

**What does NOT work offline (known, deliberate boundaries):**
- **Browsing your full "My Audits" history offline** — that list still
  needs a live connection.
- **Creating a brand-new company or department while fully offline** — that
  needs a live connection too (though picking an *existing* one from the
  cached list works fine).
- If you've never opened a given audit while online even once, there's
  nothing cached for it to fall back to offline.

**How it's built** (for reference): a local IndexedDB store keeps a working
copy of whatever audit is open, marked "pending sync" whenever there are
unsaved changes. A background sync routine fires automatically on
reconnect, pushing every pending audit to Supabase and clearing the pending
flag once confirmed. If a brand-new audit was created entirely offline, it
gets a temporary local ID until its first successful sync, at which point
it's reconciled with the real server ID so nothing gets duplicated.

## What's built (from earlier passes)

- **Grouped by Company, then by Standard** — audits nest under their
  company, then under the standard they were audited against, matching your
  requested hierarchy.
- **Company sections are collapsible** — click a company header to
  expand/collapse it.
- **Sort control** (top right of My Audits) — four modes:
  - Newest created first (default)
  - Oldest created first
  - Standard (A–Z)
  - Custom order
- **Custom order + manual reordering**: switch to "Custom order" and ↑/↓
  arrows appear on each audit row within its group, letting you move it
  up or down. I built this with simple up/down buttons rather than full
  drag-and-drop — same practical result, much more reliable to implement
  well. If you'd rather have true drag-and-drop later, that's a bigger
  addition we can do as its own step.
- Audits with no company linked yet show up under an "Unassigned" group at
  the end (shouldn't happen for anything created after the Company model
  was added, but covers any edge cases).

### Required migration

Run `supabase/migration_003_audit_sort_order.sql` in the Supabase SQL
editor — it only adds one column (`sort_order`) to `audits`, safe on
existing data, nothing gets dropped.

## What's built (from earlier passes)

- In **Manage Companies**, expand any company and click **"📄 Build
  Consolidated Report"**.
- Pick which of that company's audits to include (Final audits are
  pre-selected; drafts aren't, since they're still work-in-progress — but
  you can include anything).
- Generates one PDF covering multiple audits/departments/standards:
  - **Cover** — company logo, list of audits included (date, department,
    standard, type, conclusion, status)
  - **Executive summary** — aggregate conformance/NC/OFI counts across every
    selected audit
  - **Recurring Nonconformities** — clauses that show up as a nonconformity
    in more than one audit, called out specifically. This is the genuinely
    valuable bit for a repeat client — it surfaces systemic issues that a
    single-audit report would never show.
  - **Per-audit detailed findings** — one section per audit, each showing
    its own nonconformities and OFIs, correctly using that audit's own
    standard's clause library (since departments can be audited against
    different standards).
- Works across departments and across different standards in the same
  report — e.g. one department audited against 45001, another against 9001,
  both showing up correctly labelled in the same consolidated document.

## Company/Department Foundation (previous pass)

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
