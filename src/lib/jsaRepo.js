import { supabase } from './supabaseClient'
import { listPendingJSAs, deleteLocalJSA } from './offlineStore'

export async function listJSAs() {
  const { data, error } = await supabase
    .from('jsa_instances')
    .select('id, jsa_no, job_task, plant_area, location, fatal_risks, status, valid_from, valid_until, created_at, companies(name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function deleteJSA(id) {
  const { error } = await supabase.from('jsa_instances').delete().eq('id', id)
  if (error) throw error
}

export async function loadJSA(id) {
  const { data: instance, error: iErr } = await supabase.from('jsa_instances').select('*').eq('id', id).single()
  if (iErr) throw iErr

  let company = null
  if (instance.company_id) {
    const { data: companyRow } = await supabase.from('companies').select('id, name, logo_url').eq('id', instance.company_id).maybeSingle()
    company = companyRow || null
  }

  const { data: steps, error: sErr } = await supabase.from('jsa_steps').select('*').eq('jsa_id', id).order('step_number')
  if (sErr) throw sErr

  const { data: signoffs, error: soErr } = await supabase.from('jsa_signoffs').select('*').eq('jsa_id', id).order('signed_at')
  if (soErr) throw soErr

  const { data: dailyReviews, error: drErr } = await supabase.from('jsa_daily_reviews').select('*').eq('jsa_id', id).order('review_date')
  if (drErr) throw drErr

  return { instance, company, steps, signoffs, dailyReviews }
}

export async function saveJSA({ jsaId, organizationId, companyId, meta, steps }) {
  const { data: userData } = await supabase.auth.getUser()
  const owner = userData?.user?.id

  const instancePayload = {
    owner,
    organization_id: organizationId || null,
    company_id: companyId || null,
    jsa_no: meta.jsaNo,
    work_order_no: meta.workOrderNo,
    job_task: meta.jobTask,
    plant_area: meta.plantArea,
    location: meta.location,
    jsa_date: meta.jsaDate || null,
    senior_supervisor_name: meta.seniorSupervisorName,
    work_group_supervisor_name: meta.workGroupSupervisorName,
    permits_required: meta.permitsRequired || [],
    additional_ppe: meta.additionalPpe,
    special_tools: meta.specialTools,
    fatal_risks: meta.fatalRisks || [],
    hazardous_materials: meta.hazardousMaterials,
    fire_emergency_equipment: meta.fireEmergencyEquipment,
    supporting_documents: meta.supportingDocuments || [],
    can_become_sop: meta.canBecomeSop || null,
    potential_hazards: meta.potentialHazards || [],
    valid_from: meta.validFrom || null,
    valid_until: meta.validUntil || null,
    status: meta.status || 'in_progress',
    updated_at: new Date().toISOString(),
  }

  let id = jsaId
  if (id) {
    const { error } = await supabase.from('jsa_instances').update(instancePayload).eq('id', id)
    if (error) throw error
  } else {
    const { data, error } = await supabase.from('jsa_instances').insert(instancePayload).select('id').single()
    if (error) throw error
    id = data.id
  }

  // Steps: simplest correct approach for a small, fully-replaced ordered list
  await supabase.from('jsa_steps').delete().eq('jsa_id', id)
  const stepsToInsert = (steps || [])
    .map((s, i) => ({
      jsa_id: id,
      step_number: i + 1,
      job_step: s.jobStep || '',
      job_step_hazard: s.jobStepHazard || '',
      current_controls: s.currentControls || '',
      control_hierarchy: s.controlHierarchy || null,
      likelihood: s.likelihood || null,
      consequence: s.consequence || null,
      required_additional_actions: s.requiredAdditionalActions || '',
      residual_likelihood: s.residualLikelihood || null,
      residual_consequence: s.residualConsequence || null,
    }))
    .filter((s) => s.job_step || s.job_step_hazard || s.current_controls)
  if (stepsToInsert.length) {
    const { error } = await supabase.from('jsa_steps').insert(stepsToInsert)
    if (error) throw error
  }

  return id
}

export async function syncPendingJSAs() {
  const pending = await listPendingJSAs()
  let succeeded = 0
  let failed = 0
  const synced = []
  for (const entry of pending) {
    try {
      const realJsaId = entry.localId.startsWith('local-') ? null : entry.localId
      const realId = await saveJSA({
        jsaId: realJsaId,
        organizationId: entry.instance.organizationId,
        companyId: entry.instance.companyId,
        meta: entry.instance.meta,
        steps: entry.steps,
      })
      await deleteLocalJSA(entry.localId)
      synced.push({ localId: entry.localId, realId })
      succeeded++
    } catch (err) {
      failed++
      console.error('JSA sync failed for', entry.localId, err)
    }
  }
  return { succeeded, failed, total: pending.length, synced }
}
