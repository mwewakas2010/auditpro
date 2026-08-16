import { supabase } from './supabaseClient'

export async function listCCVTargets(organizationId = null, companyId = null) {
  let query = supabase.from('ccv_targets').select('*').order('dimension_type').order('dimension_value')
  if (organizationId) query = query.eq('organization_id', organizationId)
  if (companyId) query = query.eq('company_id', companyId)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function upsertCCVTarget({ id, organizationId, companyId, dimensionType, dimensionValue, periodType, volumeTarget, complianceTargetPct }) {
  const { data: userData } = await supabase.auth.getUser()
  const payload = {
    owner: userData?.user?.id,
    organization_id: organizationId || null,
    company_id: companyId || null,
    dimension_type: dimensionType,
    dimension_value: dimensionType === 'overall' ? null : dimensionValue,
    period_type: periodType,
    volume_target: volumeTarget || null,
    compliance_target_pct: complianceTargetPct || null,
    updated_at: new Date().toISOString(),
  }
  if (id) {
    const { error } = await supabase.from('ccv_targets').update(payload).eq('id', id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('ccv_targets').insert(payload)
    if (error) throw error
  }
}

export async function deleteCCVTarget(id) {
  const { error } = await supabase.from('ccv_targets').delete().eq('id', id)
  if (error) throw error
}

export async function getCCVTargetPerformance(organizationId = null, companyId = null) {
  const { data, error } = await supabase.rpc('ccv_target_performance', { target_org_id: organizationId, target_company_id: companyId })
  if (error) throw error
  return data
}
