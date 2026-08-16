import { supabase } from './supabaseClient'
import { uploadDataUrl } from './auditRepo'
import { listPendingCCVs, deleteLocalCCV } from './offlineStore'

// ---------- Templates ----------

export async function listTemplates() {
  const { data, error } = await supabase
    .from('checklist_templates')
    .select('id, name, document_reference, revision_number, total_pages, date_of_issue, date_of_next_review')
    .order('name')
  if (error) throw error
  return data
}

export async function loadTemplateStructure(templateId) {
  const { data: template, error: tErr } = await supabase
    .from('checklist_templates')
    .select('*')
    .eq('id', templateId)
    .single()
  if (tErr) throw tErr

  const { data: categories, error: cErr } = await supabase
    .from('checklist_template_categories')
    .select('*, checklist_template_items(*)')
    .eq('template_id', templateId)
    .order('sort_order')
  if (cErr) throw cErr

  categories.forEach((c) => {
    c.checklist_template_items.sort((a, b) => a.sort_order - b.sort_order)
  })

  return { template, categories }
}

// ---------- CCV instances (list) ----------

export async function listCCVs() {
  const { data, error } = await supabase
    .from('ccv_instances')
    .select('id, location, department, section, task, site, contractor, date_time, status, created_at, checklist_templates(name), companies(name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function deleteCCV(id) {
  const { error } = await supabase.from('ccv_instances').delete().eq('id', id)
  if (error) throw error
}

// ---------- Load a single CCV instance ----------

export async function loadCCV(id) {
  const { data: instance, error: iErr } = await supabase
    .from('ccv_instances')
    .select('*')
    .eq('id', id)
    .single()
  if (iErr) throw iErr

  const { template, categories } = await loadTemplateStructure(instance.template_id)

  const { data: responseRows, error: rErr } = await supabase
    .from('ccv_item_responses')
    .select('*, ccv_evidence_files(*)')
    .eq('ccv_instance_id', id)
  if (rErr) throw rErr

  const responses = {}
  responseRows.forEach((r) => {
    responses[r.template_item_id] = {
      responseId: r.id,
      compliance: r.compliance,
      actionText: r.action_text || '',
      responsiblePerson: r.responsible_person || '',
      dueDate: r.due_date || '',
      thumbs: (r.ccv_evidence_files || []).map((f) => ({
        kind: f.kind,
        label: f.file_name,
        dataUrl: null,
        remoteUrl: f.file_url,
        capturedAt: f.captured_at,
      })),
    }
  })

  return { instance, template, categories, responses }
}

// ---------- Save (insert or update) a CCV instance ----------

export async function saveCCV({ ccvId, templateId, companyId, meta, responses }) {
  const { data: userData } = await supabase.auth.getUser()
  const owner = userData?.user?.id

  const instancePayload = {
    owner,
    template_id: templateId,
    company_id: companyId || null,
    assessors: meta.assessors,
    date_time: meta.dateTime || null,
    location: meta.location,
    department: meta.department,
    section: meta.section,
    task: meta.task || null,
    site: meta.site || null,
    contractor: meta.contractor || null,
    is_unplanned: !!meta.isUnplanned,
    status: meta.status || 'in_progress',
    updated_at: new Date().toISOString(),
  }

  let id = ccvId
  if (id) {
    const { error } = await supabase.from('ccv_instances').update(instancePayload).eq('id', id)
    if (error) throw error
  } else {
    const { data, error } = await supabase.from('ccv_instances').insert(instancePayload).select('id').single()
    if (error) throw error
    id = data.id
  }

  for (const templateItemId of Object.keys(responses)) {
    const r = responses[templateItemId]
    if (!r.compliance && !r.thumbs?.length) continue // skip untouched items

    const { data: responseRow, error: respErr } = await supabase
      .from('ccv_item_responses')
      .upsert(
        {
          ccv_instance_id: id,
          template_item_id: templateItemId,
          compliance: r.compliance || null,
          action_text: r.compliance === 'no' ? r.actionText : null,
          responsible_person: r.compliance === 'no' ? r.responsiblePerson : null,
          due_date: r.compliance === 'no' && r.dueDate ? r.dueDate : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'ccv_instance_id,template_item_id' }
      )
      .select('id')
      .single()
    if (respErr) throw respErr

    for (let i = 0; i < (r.thumbs || []).length; i++) {
      const t = r.thumbs[i]
      if (t.dataUrl && !t.remoteUrl) {
        const ext = t.kind === 'photo' ? 'jpg' : (t.label.split('.').pop() || 'bin')
        const path = `${id}/${templateItemId}/${Date.now()}_${i}.${ext}`
        const publicUrl = await uploadDataUrl('evidence', path, t.dataUrl)
        await supabase.from('ccv_evidence_files').insert({
          ccv_item_response_id: responseRow.id,
          file_url: publicUrl,
          file_name: t.label,
          kind: t.kind,
          captured_at: t.capturedAt,
        })
      }
    }
  }

  return id
}

// Pushes every locally-queued (offline-created/edited) CCV up to Supabase,
// one at a time.
export async function syncPendingCCVs() {
  const pending = await listPendingCCVs()
  let succeeded = 0
  let failed = 0
  const synced = []
  for (const entry of pending) {
    try {
      const realCcvId = entry.localId.startsWith('local-') ? null : entry.localId
      const realId = await saveCCV({
        ccvId: realCcvId,
        templateId: entry.templateId,
        companyId: entry.companyId,
        meta: entry.meta,
        responses: entry.responses,
      })
      await deleteLocalCCV(entry.localId)
      synced.push({ localId: entry.localId, realId })
      succeeded++
    } catch (err) {
      failed++
      console.error('CCV sync failed for', entry.localId, err)
    }
  }
  return { succeeded, failed, total: pending.length, synced }
}
