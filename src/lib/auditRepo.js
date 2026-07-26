import { supabase } from './supabaseClient'
import { getClauses } from '../data/standards'
import { listPendingAudits, deleteLocalAudit } from './offlineStore'

// ---------- Storage ----------

// Uploads a base64 data URL to a Supabase Storage bucket and returns its public URL.
export async function uploadDataUrl(bucket, path, dataUrl) {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    upsert: true,
    contentType: blob.type || 'image/jpeg',
  })
  if (error) throw error
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

// ---------- Audits list ----------

export async function listAudits() {
  const { data, error } = await supabase
    .from('audits')
    .select(
      'id, client_name, department, standard, audit_type, start_date, status, updated_at, created_at, sort_order, company_id, companies(name)'
    )
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function setAuditSortOrder(auditId, sortOrder) {
  const { error } = await supabase.from('audits').update({ sort_order: sortOrder }).eq('id', auditId)
  if (error) throw error
}

export async function deleteAudit(auditId) {
  const { error } = await supabase.from('audits').delete().eq('id', auditId)
  if (error) throw error
}

// ---------- Load a single audit into the app's state shape ----------

export async function loadAudit(auditId) {
  const { data: auditRow, error: auditErr } = await supabase
    .from('audits')
    .select('*')
    .eq('id', auditId)
    .single()
  if (auditErr) throw auditErr

  const { data: scopeRows, error: scopeErr } = await supabase
    .from('audit_scope')
    .select('*')
    .eq('audit_id', auditId)
  if (scopeErr) throw scopeErr

  const { data: entryRows, error: entryErr } = await supabase
    .from('checklist_entries')
    .select('*, evidence_files(*)')
    .eq('audit_id', auditId)
  if (entryErr) throw entryErr

  const { data: signoffRows, error: signoffErr } = await supabase
    .from('audit_signoffs')
    .select('*')
    .eq('audit_id', auditId)
  if (signoffErr) throw signoffErr

  let currentCompany = null
  if (auditRow.company_id) {
    const { data: companyRow } = await supabase
      .from('companies')
      .select('id, name, logo_url')
      .eq('id', auditRow.company_id)
      .maybeSingle()
    currentCompany = companyRow || null
  }

  const audit = {
    id: auditRow.id,
    client_name: currentCompany?.name || auditRow.client_name || '',
    company_id: auditRow.company_id || null,
    department_id: auditRow.department_id || null,
    logo_url: currentCompany?.logo_url || auditRow.logo_url || null,
    standard: auditRow.standard || 'ISO 45001:2018',
    department: auditRow.department || '',
    process_owner: auditRow.process_owner || '',
    other_participants: auditRow.other_participants || '',
    lead_auditor: auditRow.lead_auditor || '',
    audit_team: auditRow.audit_team || '',
    audit_type: auditRow.audit_type || 'internal',
    start_date: auditRow.start_date || '',
    end_date: auditRow.end_date || '',
    field_visit_areas: auditRow.field_visit_areas || '',
    scope_text: auditRow.scope_text || '',
    methodology: auditRow.methodology || ['interviews', 'document_review', 'field_visit'],
    methodology_narrative: auditRow.methodology_narrative || '',
    sampling_disclaimer: auditRow.sampling_disclaimer || '',
    confidentiality_statement: auditRow.confidentiality_statement || '',
    discontinued: auditRow.discontinued || false,
    discontinuation_conditions: auditRow.discontinuation_conditions || [],
    discontinuation_comment: auditRow.discontinuation_comment || '',
    conclusion: auditRow.conclusion || 'suitable_effective',
    status: auditRow.status || 'in_progress',
  }

  const clauses = getClauses(audit.standard)

  const scope = {}
  clauses.forEach((c) => {
    const row = scopeRows.find((r) => r.clause_code === c.clause_code)
    scope[c.clause_code] = row
      ? { inScope: row.in_scope, exclusionReason: row.exclusion_reason || '' }
      : { inScope: true, exclusionReason: '' }
  })

  const checklist = {}
  clauses.forEach((c) => {
    const row = entryRows.find((r) => r.clause_code === c.clause_code)
    checklist[c.clause_code] = row
      ? {
          entryId: row.id,
          status: row.status,
          evidenceText: row.evidence_text || '',
          evidenceAvailable: row.evidence_available,
          followUp: row.follow_up_flag || false,
          thumbs: (row.evidence_files || []).map((f) => ({
            kind: f.kind,
            label: f.file_name,
            dataUrl: null,
            remoteUrl: f.file_url,
            capturedAt: f.captured_at,
          })),
        }
      : { status: null, evidenceText: '', evidenceAvailable: null, followUp: false, thumbs: [] }
  })

  const signoffs = { lead_auditor: null, auditee_rep: null }
  signoffRows.forEach((r) => {
    signoffs[r.role] = { name: r.signatory_name, date: new Date(r.signed_at).toLocaleDateString() }
  })

  return { audit, scope, checklist, signoffs }
}

// ---------- Save (insert or update) ----------

export async function saveAudit({ auditId, audit, scope, checklist, signoffs }) {
  const { data: userData } = await supabase.auth.getUser()
  const owner = userData?.user?.id

  const auditPayload = {
    owner,
    client_name: audit.client_name,
    company_id: audit.company_id || null,
    department_id: audit.department_id || null,
    logo_url: audit.logo_url,
    standard: audit.standard,
    audit_type: audit.audit_type,
    department: audit.department,
    process_owner: audit.process_owner,
    other_participants: audit.other_participants,
    lead_auditor: audit.lead_auditor,
    audit_team: audit.audit_team,
    start_date: audit.start_date || null,
    end_date: audit.end_date || null,
    field_visit_areas: audit.field_visit_areas,
    scope_text: audit.scope_text,
    methodology: audit.methodology,
    methodology_narrative: audit.methodology_narrative,
    sampling_disclaimer: audit.sampling_disclaimer,
    confidentiality_statement: audit.confidentiality_statement,
    discontinued: audit.discontinued,
    discontinuation_conditions: audit.discontinuation_conditions,
    discontinuation_comment: audit.discontinuation_comment,
    conclusion: audit.conclusion,
    status: audit.status || 'in_progress',
    updated_at: new Date().toISOString(),
  }

  let id = auditId
  if (id) {
    const { error } = await supabase.from('audits').update(auditPayload).eq('id', id)
    if (error) throw error
  } else {
    const { data, error } = await supabase.from('audits').insert(auditPayload).select('id').single()
    if (error) throw error
    id = data.id
  }

  // Upload any logo that's still a local base64 data URL
  if (audit.logo_url && audit.logo_url.startsWith('data:')) {
    const publicUrl = await uploadDataUrl('logos', `${id}/logo.jpg`, audit.logo_url)
    await supabase.from('audits').update({ logo_url: publicUrl }).eq('id', id)
  }

  // Scope
  for (const clauseCode of Object.keys(scope)) {
    const s = scope[clauseCode]
    await supabase.from('audit_scope').upsert(
      {
        audit_id: id,
        clause_code: clauseCode,
        in_scope: s.inScope,
        exclusion_reason: s.exclusionReason,
      },
      { onConflict: 'audit_id,clause_code' }
    )
  }

  // Checklist entries + evidence files
  for (const clauseCode of Object.keys(checklist)) {
    const entry = checklist[clauseCode]
    if (!entry.status && !entry.evidenceText && !entry.thumbs.length) continue // skip untouched clauses

    const { data: entryRow, error: entryErr } = await supabase
      .from('checklist_entries')
      .upsert(
        {
          audit_id: id,
          clause_code: clauseCode,
          status: entry.status,
          evidence_text: entry.evidenceText,
          evidence_available: entry.evidenceAvailable,
          follow_up_flag: entry.followUp,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'audit_id,clause_code' }
      )
      .select('id')
      .single()
    if (entryErr) throw entryErr

    // Upload any evidence still held as local base64 data (new captures since last save)
    for (let i = 0; i < entry.thumbs.length; i++) {
      const t = entry.thumbs[i]
      if (t.dataUrl && !t.remoteUrl) {
        const ext = t.kind === 'photo' ? 'jpg' : (t.label.split('.').pop() || 'bin')
        const path = `${id}/${clauseCode}/${Date.now()}_${i}.${ext}`
        const publicUrl = await uploadDataUrl('evidence', path, t.dataUrl)
        await supabase.from('evidence_files').insert({
          checklist_entry_id: entryRow.id,
          file_url: publicUrl,
          file_name: t.label,
          kind: t.kind,
          captured_at: t.capturedAt,
        })
      }
    }
  }

  // Sign-offs
  for (const role of ['lead_auditor', 'auditee_rep']) {
    if (signoffs[role]) {
      await supabase.from('audit_signoffs').upsert(
        {
          audit_id: id,
          role,
          signatory_name: signoffs[role].name,
        },
        { onConflict: 'audit_id,role' }
      )
    }
  }

  return id
}

// Pushes every locally-queued (offline-created/edited) audit up to
// Supabase, one at a time. Called automatically when the app detects it's
// back online, and can also be triggered manually. Returns a summary so the
// UI can report what happened.
export async function syncPendingAudits() {
  const pending = await listPendingAudits()
  let succeeded = 0
  let failed = 0
  const synced = [] // { localId, realId } for the caller to reconcile open editors against
  for (const entry of pending) {
    try {
      // A brand-new audit created entirely offline has a "local-..." id,
      // not a real Supabase one - pass null so saveAudit inserts a fresh row.
      const realAuditId = entry.localId.startsWith('local-') ? null : entry.localId
      const realId = await saveAudit({
        auditId: realAuditId,
        audit: entry.audit,
        scope: entry.scope,
        checklist: entry.checklist,
        signoffs: entry.signoffs,
      })
      await deleteLocalAudit(entry.localId)
      synced.push({ localId: entry.localId, realId })
      succeeded++
    } catch (err) {
      failed++
      console.error('Sync failed for', entry.localId, err)
    }
  }
  return { succeeded, failed, total: pending.length, synced }
}
