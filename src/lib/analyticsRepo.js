import { supabase } from './supabaseClient'

export async function getModuleCounts(scopeMode = 'own', orgId = null, dateFrom = null, dateTo = null) {
  const { data, error } = await supabase.rpc('analytics_module_counts', { scope_mode: scopeMode, target_org_id: orgId, date_from: dateFrom, date_to: dateTo })
  if (error) throw error
  return data
}

export async function getJSARiskAnalytics(scopeMode = 'own', orgId = null, dateFrom = null, dateTo = null) {
  const { data, error } = await supabase.rpc('analytics_jsa_risk', { scope_mode: scopeMode, target_org_id: orgId, date_from: dateFrom, date_to: dateTo })
  if (error) throw error
  return data?.[0] || null
}

export async function getJSARiskTransition(scopeMode = 'own', orgId = null, dateFrom = null, dateTo = null) {
  const { data, error } = await supabase.rpc('analytics_jsa_risk_transition', { scope_mode: scopeMode, target_org_id: orgId, date_from: dateFrom, date_to: dateTo })
  if (error) throw error
  return data
}

export async function getOutstandingFLRAControls(scopeMode = 'own', orgId = null) {
  const { data, error } = await supabase.rpc('analytics_outstanding_flra_controls', { scope_mode: scopeMode, target_org_id: orgId })
  if (error) throw error
  return data
}

export async function getOverdueCCVItems(scopeMode = 'own', orgId = null) {
  const { data, error } = await supabase.rpc('analytics_overdue_ccv_items', { scope_mode: scopeMode, target_org_id: orgId })
  if (error) throw error
  return data
}

export async function getJSAActionsNoted(scopeMode = 'own', orgId = null) {
  const { data, error } = await supabase.rpc('analytics_jsa_actions_noted', { scope_mode: scopeMode, target_org_id: orgId })
  if (error) throw error
  return data
}

export async function getFatalRiskFrequency(scopeMode = 'own', orgId = null) {
  const { data, error } = await supabase.rpc('analytics_fatal_risk_frequency', { scope_mode: scopeMode, target_org_id: orgId })
  if (error) throw error
  return data
}

export async function getActivityByCompany(scopeMode = 'own', orgId = null) {
  const { data, error } = await supabase.rpc('analytics_activity_by_company', { scope_mode: scopeMode, target_org_id: orgId })
  if (error) throw error
  return data
}

export async function getHazardNearMissCounts(scopeMode = 'own', orgId = null, dateFrom = null, dateTo = null) {
  const { data, error } = await supabase.rpc('analytics_hazard_near_miss_counts', { scope_mode: scopeMode, target_org_id: orgId, date_from: dateFrom, date_to: dateTo })
  if (error) throw error
  return data
}

export async function getControlHierarchyUsage(scopeMode = 'own', orgId = null) {
  const { data, error } = await supabase.rpc('analytics_control_hierarchy_usage', { scope_mode: scopeMode, target_org_id: orgId })
  if (error) throw error
  return data
}

export async function getTimeToClose(scopeMode = 'own', orgId = null, dateFrom = null, dateTo = null) {
  const { data, error } = await supabase.rpc('analytics_time_to_close', { scope_mode: scopeMode, target_org_id: orgId, date_from: dateFrom, date_to: dateTo })
  if (error) throw error
  return data?.[0] || null
}

export async function getObservationTrend(scopeMode = 'own', orgId = null, weeksBack = 12) {
  const { data, error } = await supabase.rpc('analytics_observation_trend', { scope_mode: scopeMode, target_org_id: orgId, weeks_back: weeksBack })
  if (error) throw error
  return data
}

export async function getDailyObservationTrend(scopeMode = 'own', orgId = null, daysBack = 30, dateFrom = null, dateTo = null) {
  const { data, error } = await supabase.rpc('analytics_daily_observation_trend', { scope_mode: scopeMode, target_org_id: orgId, days_back: daysBack, date_from: dateFrom, date_to: dateTo })
  if (error) throw error
  return data
}

export async function getDailyReviewCompletion(scopeMode = 'own', orgId = null, dateFrom = null, dateTo = null) {
  const { data, error } = await supabase.rpc('analytics_daily_review_completion', { scope_mode: scopeMode, target_org_id: orgId, date_from: dateFrom, date_to: dateTo })
  if (error) throw error
  return data?.[0] || null
}

export async function getHazardClosureRate(scopeMode = 'own', orgId = null, dateFrom = null, dateTo = null) {
  const { data, error } = await supabase.rpc('analytics_hazard_closure_rate', { scope_mode: scopeMode, target_org_id: orgId, date_from: dateFrom, date_to: dateTo })
  if (error) throw error
  return data
}

export async function getUnresolvedHazardReports(scopeMode = 'own', orgId = null) {
  const { data, error } = await supabase.rpc('analytics_unresolved_hazard_reports', { scope_mode: scopeMode, target_org_id: orgId })
  if (error) throw error
  return data
}

export async function getUnresolvedNearMissReports(scopeMode = 'own', orgId = null) {
  const { data, error } = await supabase.rpc('analytics_unresolved_near_miss_reports', { scope_mode: scopeMode, target_org_id: orgId })
  if (error) throw error
  return data
}

export async function getModuleStatusCounts(scopeMode = 'own', orgId = null, overdueThresholdDays = 14) {
  const { data, error } = await supabase.rpc('analytics_module_status_counts', { scope_mode: scopeMode, target_org_id: orgId, overdue_threshold_days: overdueThresholdDays })
  if (error) throw error
  return data
}

export async function getSafetyCultureScore(scopeMode = 'own', orgId = null, daysBack = 90) {
  const { data, error } = await supabase.rpc('analytics_safety_culture_score', { scope_mode: scopeMode, target_org_id: orgId, days_back: daysBack })
  if (error) throw error
  return data?.[0] || null
}

export async function resolveHazardReport(reportId) {
  const { error } = await supabase.rpc('resolve_hazard_report', { report_id: reportId })
  if (error) throw error
}

export async function resolveNearMissReport(reportId) {
  const { error } = await supabase.rpc('resolve_near_miss_report', { report_id: reportId })
  if (error) throw error
}
