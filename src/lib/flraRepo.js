import { supabase } from './supabaseClient'
import { listPendingFLRAs, deleteLocalFLRA } from './offlineStore'

export async function listFLRAs() {
  const { data, error } = await supabase
    .from('flra_instances')
    .select('id, employee_name, mode, job_task_description, fatal_risks, status, created_at, companies(name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function deleteFLRA(id) {
  const { error } = await supabase.from('flra_instances').delete().eq('id', id)
  if (error) throw error
}

export async function loadFLRA(id) {
  const { data: instance, error: iErr } = await supabase.from('flra_instances').select('*').eq('id', id).single()
  if (iErr) throw iErr

  let company = null
  if (instance.company_id) {
    const { data: companyRow } = await supabase.from('companies').select('id, name, logo_url').eq('id', instance.company_id).maybeSingle()
    company = companyRow || null
  }

  const { data: hazardRows, error: hErr } = await supabase
    .from('flra_hazard_rows')
    .select('*')
    .eq('flra_id', id)
    .order('row_number')
  if (hErr) throw hErr

  const { data: safetyRows, error: sErr } = await supabase.from('flra_safety_checks').select('*').eq('flra_id', id)
  if (sErr) throw sErr
  const safetyChecks = {}
  safetyRows.forEach((r) => { safetyChecks[r.item_key] = r.response })

  const { data: riskControlRows, error: rcErr } = await supabase.from('flra_risk_controls').select('*').eq('flra_id', id)
  if (rcErr) throw rcErr
  const riskControls = {}
  riskControlRows.forEach((r) => {
    riskControls[r.control_key] = {
      fatalRisk: r.fatal_risk,
      controlText: r.control_text,
      status: r.status,
      actionText: r.action_text || '',
      responsiblePerson: r.responsible_person || '',
      dueDate: r.due_date || '',
      addressed: r.addressed,
    }
  })

  const { data: signoffRows, error: soErr } = await supabase.from('flra_signoffs').select('*').eq('flra_id', id)
  if (soErr) throw soErr
  const signoffs = {}
  signoffRows.forEach((r) => { signoffs[r.role] = r })

  const { data: hazardReportRows, error: hrErr } = await supabase.from('flra_hazard_reports').select('*').eq('flra_id', id).order('created_at')
  if (hrErr) throw hrErr
  const hazardReports = hazardReportRows.map((r) => r.hazard_text)

  const { data: nearMissRows, error: nmErr } = await supabase.from('flra_near_miss_reports').select('*').eq('flra_id', id).order('created_at')
  if (nmErr) throw nmErr
  const nearMissReports = nearMissRows.map((r) => r.description)

  return { instance, company, hazardRows, safetyChecks, riskControls, signoffs, hazardReports, nearMissReports }
}

export async function saveFLRA({ flraId, organizationId, companyId, meta, hazardRows, safetyChecks, riskControls, acknowledgedAt, hazardReports, nearMissReports }) {
  const { data: userData } = await supabase.auth.getUser()
  const owner = userData?.user?.id

  const instancePayload = {
    owner,
    organization_id: organizationId || null,
    company_id: companyId || null,
    mode: meta.mode,
    employee_name: meta.employeeName,
    employee_id_number: meta.employeeIdNumber,
    safety_topic: meta.safetyTopic,
    department_area: meta.departmentArea,
    job_task_description: meta.jobTaskDescription,
    fatal_risks: meta.fatalRisks || [],
    crew_members: meta.crewMembers || null,
    status: meta.status || 'in_progress',
    updated_at: new Date().toISOString(),
  }
  if (acknowledgedAt) {
    instancePayload.acknowledged_at = acknowledgedAt
    instancePayload.acknowledged_by = owner
  }

  let id = flraId
  if (id) {
    const { error } = await supabase.from('flra_instances').update(instancePayload).eq('id', id)
    if (error) throw error
  } else {
    const { data, error } = await supabase.from('flra_instances').insert(instancePayload).select('id').single()
    if (error) throw error
    id = data.id
  }

  // Hazard rows: simplest correct approach for a small, fully-replaced list - delete and reinsert
  await supabase.from('flra_hazard_rows').delete().eq('flra_id', id)
  const rowsToInsert = (hazardRows || [])
    .map((r, i) => ({ flra_id: id, row_number: i + 1, hazard_text: r.hazardText || '', control_text: r.controlText || '' }))
    .filter((r) => r.hazard_text || r.control_text)
  if (rowsToInsert.length) {
    const { error } = await supabase.from('flra_hazard_rows').insert(rowsToInsert)
    if (error) throw error
  }

  // Safety checks: upsert each answered item
  for (const [itemKey, response] of Object.entries(safetyChecks || {})) {
    if (!response) continue
    const { error } = await supabase
      .from('flra_safety_checks')
      .upsert({ flra_id: id, item_key: itemKey, response }, { onConflict: 'flra_id,item_key' })
    if (error) throw error
  }

  // Risk controls: upsert every control that has been given a status
  for (const [controlKey, rc] of Object.entries(riskControls || {})) {
    if (!rc || !rc.status) continue
    const { error } = await supabase.from('flra_risk_controls').upsert(
      {
        flra_id: id,
        fatal_risk: rc.fatalRisk,
        control_key: controlKey,
        control_text: rc.controlText,
        status: rc.status,
        action_text: rc.status === 'not_in_place' ? rc.actionText || null : null,
        responsible_person: rc.status === 'not_in_place' ? rc.responsiblePerson || null : null,
        due_date: rc.status === 'not_in_place' && rc.dueDate ? rc.dueDate : null,
        addressed: rc.status === 'not_in_place' ? !!rc.addressed : false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'flra_id,control_key' }
    )
    if (error) throw error
  }

  // Hazard reports and near-miss reports: simplest correct approach for
  // small, fully-replaced lists - delete and reinsert
  await supabase.from('flra_hazard_reports').delete().eq('flra_id', id)
  const hazardReportsToInsert = (hazardReports || []).filter((h) => h && h.trim()).map((h) => ({ flra_id: id, hazard_text: h }))
  if (hazardReportsToInsert.length) {
    const { error } = await supabase.from('flra_hazard_reports').insert(hazardReportsToInsert)
    if (error) throw error
  }

  await supabase.from('flra_near_miss_reports').delete().eq('flra_id', id)
  const nearMissToInsert = (nearMissReports || []).filter((n) => n && n.trim()).map((n) => ({ flra_id: id, description: n }))
  if (nearMissToInsert.length) {
    const { error } = await supabase.from('flra_near_miss_reports').insert(nearMissToInsert)
    if (error) throw error
  }

  return id
}

// Pushes every locally-queued (offline-created/edited) FLRA up to Supabase.
export async function syncPendingFLRAs() {
  const pending = await listPendingFLRAs()
  let succeeded = 0
  let failed = 0
  const synced = []
  for (const entry of pending) {
    try {
      const realFlraId = entry.localId.startsWith('local-') ? null : entry.localId
      const realId = await saveFLRA({
        flraId: realFlraId,
        organizationId: entry.instance.organizationId,
        companyId: entry.instance.companyId,
        meta: entry.instance.meta,
        hazardRows: entry.hazardRows,
        safetyChecks: entry.safetyChecks,
        riskControls: entry.riskControls,
        acknowledgedAt: entry.instance.acknowledgedAt,
        hazardReports: entry.hazardReports,
        nearMissReports: entry.nearMissReports,
      })
      await deleteLocalFLRA(entry.localId)
      synced.push({ localId: entry.localId, realId })
      succeeded++
    } catch (err) {
      failed++
      console.error('FLRA sync failed for', entry.localId, err)
    }
  }
  return { succeeded, failed, total: pending.length, synced }
}
