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

export async function getModuleCountsByDepartment(orgId) {
  const { data, error } = await supabase.rpc('analytics_module_counts_by_department', { target_org_id: orgId })
  if (error) throw error
  return data
}

export async function getJSARiskByDepartment(orgId) {
  const { data, error } = await supabase.rpc('analytics_jsa_risk_by_department', { target_org_id: orgId })
  if (error) throw error
  return data
}

export async function getFatalRiskByDepartment(orgId) {
  const { data, error } = await supabase.rpc('analytics_fatal_risk_by_department', { target_org_id: orgId })
  if (error) throw error
  return data
}

export async function getSafetyCultureScore(scopeMode = 'own', orgId = null, daysBack = 90) {
  const { data, error } = await supabase.rpc('analytics_safety_culture_score', { scope_mode: scopeMode, target_org_id: orgId, days_back: daysBack })
  if (error) throw error
  return data?.[0] || null
}

export async function getSafetyCultureByDepartment(orgId, daysBack = 90) {
  const { data, error } = await supabase.rpc('analytics_safety_culture_by_department', { target_org_id: orgId, days_back: daysBack })
  if (error) throw error
  return data
}

export async function getCcvByFatalRisk(orgId) {
  const { data, error } = await supabase.rpc('analytics_ccv_by_fatal_risk', { target_org_id: orgId })
  if (error) throw error
  return data
}

export async function getFlraFatalRiskFrequency(orgId) {
  const { data, error } = await supabase.rpc('analytics_flra_fatal_risk', { target_org_id: orgId })
  if (error) throw error
  return data
}

export async function getCcvLeaderboard(orgId) {
  const { data, error } = await supabase.rpc('analytics_ccv_leaderboard', { target_org_id: orgId })
  if (error) throw error
  return data
}

export async function getFlraLeaderboard(orgId) {
  const { data, error } = await supabase.rpc('analytics_flra_leaderboard', { target_org_id: orgId })
  if (error) throw error
  return data
}

export async function getNotConducting(orgId, daysBack = 90) {
  const { data, error } = await supabase.rpc('analytics_not_conducting', { target_org_id: orgId, days_back: daysBack })
  if (error) throw error
  return data
}

export async function getCcvScheduleSummary(orgId) {
  const { data, error } = await supabase.rpc('analytics_ccv_schedule_summary', { target_org_id: orgId })
  if (error) throw error
  return data?.[0] || null
}

export async function listCCVSchedule(orgId, onlyPending = false) {
  const { data, error } = await supabase.rpc('list_ccv_schedule', { target_org_id: orgId, only_pending: onlyPending })
  if (error) throw error
  return data
}

export async function scheduleCCV(templateId, plannedDate, organizationId, companyId = null, assignedTo = null, assignedSection = null) {
  const { data, error } = await supabase.rpc('schedule_ccv', { new_template_id: templateId, new_planned_date: plannedDate, new_organization_id: organizationId, new_company_id: companyId, new_assigned_to: assignedTo, new_assigned_section: assignedSection })
  if (error) throw error
  return data
}

export async function getNcSummary(orgId) {
  const { data, error } = await supabase.rpc('analytics_nc_summary', { target_org_id: orgId })
  if (error) throw error
  return data?.[0] || null
}

export async function getNcList(orgId, onlyOpen = true) {
  const { data, error } = await supabase.rpc('analytics_nc_list', { target_org_id: orgId, only_open: onlyOpen })
  if (error) throw error
  return data
}

export async function resolveNonconformity(ncId, notes = null) {
  const { error } = await supabase.rpc('resolve_nonconformity', { nc_id: ncId, notes })
  if (error) throw error
}

export async function listAuditsForOrg(orgId) {
  const { data, error } = await supabase.rpc('list_audits_for_org', { target_org_id: orgId })
  if (error) throw error
  return data
}

export async function createNonconformity(auditId, description, responsiblePerson = null, dueDate = null) {
  const { data, error } = await supabase.rpc('create_nonconformity', { target_audit_id: auditId, nc_description: description, nc_responsible_person: responsiblePerson, nc_due_date: dueDate })
  if (error) throw error
  return data
}

export async function getCcvByFatalRiskOwn(dateFrom = null, dateTo = null) {
  const { data, error } = await supabase.rpc('analytics_ccv_by_fatal_risk_own', { date_from: dateFrom, date_to: dateTo })
  if (error) throw error
  return data
}

export async function getFlraFatalRiskOwn(dateFrom = null, dateTo = null) {
  const { data, error } = await supabase.rpc('analytics_flra_fatal_risk_own', { date_from: dateFrom, date_to: dateTo })
  if (error) throw error
  return data
}

export async function getCcvScheduleSummaryOwn() {
  const { data, error } = await supabase.rpc('analytics_ccv_schedule_summary_own')
  if (error) throw error
  return data?.[0] || null
}

export async function listCCVScheduleOwn(onlyPending = false) {
  const { data, error } = await supabase.rpc('list_ccv_schedule_own', { only_pending: onlyPending })
  if (error) throw error
  return data
}

export async function getNcSummaryOwn() {
  const { data, error } = await supabase.rpc('analytics_nc_summary_own')
  if (error) throw error
  return data?.[0] || null
}

export async function getNcListOwn(onlyOpen = true) {
  const { data, error } = await supabase.rpc('analytics_nc_list_own', { only_open: onlyOpen })
  if (error) throw error
  return data
}

export async function listAuditsOwn() {
  const { data, error } = await supabase.rpc('list_audits_own')
  if (error) throw error
  return data
}

export async function getSafetyCultureByCompany(daysBack = 90) {
  const { data, error } = await supabase.rpc('analytics_safety_culture_by_company', { days_back: daysBack })
  if (error) throw error
  return data
}

export async function getModuleCountsByCompanyOwn() {
  const { data, error } = await supabase.rpc('analytics_module_counts_by_company_own')
  if (error) throw error
  return data
}

export async function getJSARiskByCompanyOwn() {
  const { data, error } = await supabase.rpc('analytics_jsa_risk_by_company_own')
  if (error) throw error
  return data
}

export async function getFatalRiskByCompanyOwn() {
  const { data, error } = await supabase.rpc('analytics_fatal_risk_by_company_own')
  if (error) throw error
  return data
}

export async function getUnifiedActions(scopeMode = 'own', orgId = null, onlyOpen = true) {
  const { data, error } = await supabase.rpc('analytics_unified_actions', { scope_mode: scopeMode, target_org_id: orgId, only_open: onlyOpen })
  if (error) throw error
  return data
}

export async function resolveCcvAction(responseId) {
  const { error } = await supabase.rpc('resolve_ccv_action', { response_id: responseId })
  if (error) throw error
}

export async function resolveFlraControl(controlId) {
  const { error } = await supabase.rpc('resolve_flra_control', { control_id: controlId })
  if (error) throw error
}

export async function resolveHazardReport(reportId) {
  const { error } = await supabase.rpc('resolve_hazard_report', { report_id: reportId })
  if (error) throw error
}

export async function resolveJsaAction(stepId) {
  const { error } = await supabase.rpc('resolve_jsa_action', { step_id: stepId })
  if (error) throw error
}

export async function resolveNearMissReport(reportId) {
  const { error } = await supabase.rpc('resolve_near_miss_report', { report_id: reportId })
  if (error) throw error
}
