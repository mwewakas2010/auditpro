import { supabase } from './supabaseClient'
import { uploadDataUrl } from './auditRepo'

export async function listCompanies() {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, logo_url, created_at, company_departments(id, name)')
    .order('name')
  if (error) throw error
  return data
}

export async function createCompany(name, logoDataUrl) {
  const { data: userData } = await supabase.auth.getUser()
  const owner = userData?.user?.id
  const { data, error } = await supabase
    .from('companies')
    .insert({ owner, name })
    .select('id')
    .single()
  if (error) throw error

  if (logoDataUrl) {
    const publicUrl = await uploadDataUrl('logos', `company-${data.id}/logo.jpg`, logoDataUrl)
    await supabase.from('companies').update({ logo_url: publicUrl }).eq('id', data.id)
  }
  return data.id
}

export async function updateCompanyLogo(companyId, logoDataUrl) {
  const publicUrl = await uploadDataUrl('logos', `company-${companyId}/logo.jpg`, logoDataUrl)
  const { error } = await supabase.from('companies').update({ logo_url: publicUrl }).eq('id', companyId)
  if (error) throw error
  return publicUrl
}

export async function renameCompany(companyId, name) {
  const { error } = await supabase.from('companies').update({ name }).eq('id', companyId)
  if (error) throw error
}

export async function deleteCompany(companyId) {
  const { error } = await supabase.from('companies').delete().eq('id', companyId)
  if (error) throw error
}

export async function createDepartment(companyId, name) {
  const { data, error } = await supabase
    .from('company_departments')
    .insert({ company_id: companyId, name })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function getCompanyAuditsSummary(companyId) {
  const { data, error } = await supabase
    .from('audits')
    .select('id, standard, audit_type, start_date, end_date, conclusion, status, lead_auditor, department_id, company_departments(name)')
    .eq('company_id', companyId)
    .order('start_date', { ascending: true })
  if (error) throw error
  return data
}

export async function getAuditFindingsForReport(auditId) {
  const { data, error } = await supabase
    .from('checklist_entries')
    .select('clause_code, status, evidence_text, evidence_available, follow_up_flag')
    .eq('audit_id', auditId)
  if (error) throw error
  return data
}

export async function deleteDepartment(departmentId) {
  const { error } = await supabase.from('company_departments').delete().eq('id', departmentId)
  if (error) throw error
}
