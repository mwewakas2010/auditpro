// Classification scheme depends on audit type, per Kasongo's spec:
// - Internal / Second-party audits: Conforming, Nonconforming, OFI, N/A (no major/minor split)
// - Stage 1 (Recommendation) / Stage 2 (Certification) audits: Conforming, Minor NC, Major NC, OFI, N/A

export const AUDIT_TYPES = [
  { value: 'internal', label: 'Internal' },
  { value: 'second-party', label: 'Second-party' },
  { value: 'stage1', label: 'Stage 1 — Recommendation Audit' },
  { value: 'stage2', label: 'Stage 2 — Certification Audit' },
  { value: 'followup', label: 'Follow-up' },
]

export const schemes = {
  simple: [
    { key: 'conform', label: 'Conforming' },
    { key: 'nc', label: 'Nonconforming' },
    { key: 'ofi', label: 'OFI' },
    { key: 'na', label: 'N/A' },
  ],
  full: [
    { key: 'conform', label: 'Conforming' },
    { key: 'minor', label: 'Minor NC' },
    { key: 'major', label: 'Major NC' },
    { key: 'ofi', label: 'OFI' },
    { key: 'na', label: 'N/A' },
  ],
}

export function schemeForAuditType(auditType) {
  return auditType === 'internal' || auditType === 'second-party' ? 'simple' : 'full'
}

// Remap a status when the audit type (and therefore scheme) changes.
export function remapStatus(oldStatus, newScheme) {
  if ((oldStatus === 'major' || oldStatus === 'minor') && newScheme === 'simple') return 'nc'
  if (oldStatus === 'nc' && newScheme === 'full') return null // ambiguous — must be re-classified
  return oldStatus
}

export function badgeInfo(status) {
  switch (status) {
    case 'major': return { cls: 'major', label: 'Major NC' }
    case 'minor': return { cls: 'minor', label: 'Minor NC' }
    case 'nc': return { cls: 'major', label: 'Nonconforming' }
    case 'ofi': return { cls: 'ofi', label: 'OFI' }
    case 'na': return { cls: 'na', label: 'N/A' }
    default: return { cls: 'na', label: status || '—' }
  }
}

// Standard, internal-only conditions for discontinuing an audit before completion.
// These are never written to the report unless the audit is actually marked discontinued.
export const DISCONTINUATION_CONDITIONS = [
  { key: 'access_denied', text: "Auditee denies access to areas, personnel, or records required to complete the audit" },
  { key: 'safety_hazard', text: "A safety hazard makes it unsafe for the audit team to continue on site" },
  { key: 'fraud', text: "Evidence of fraud, falsification of records, or obstruction is discovered" },
  { key: 'not_auditable', text: "The auditee's management system is not sufficiently implemented to be auditable" },
  { key: 'force_majeure', text: "Circumstances beyond the audit team's control prevent completion (e.g. site emergency, force majeure)" },
]

export const DEFAULT_SCOPE_TEXT =
  "This audit was conducted to determine the conformity of the audited department/section's occupational health and safety management system with the requirements of ISO 45001:2018, and to evaluate the extent to which the system has been effectively implemented and is being maintained.\n\nThe objective of the audit is to provide an independent, evidence-based assessment of the management system's suitability, adequacy and effectiveness within the defined scope, and to identify any nonconformances, risks or opportunities for improvement that require management attention."

export const DEFAULT_METHODOLOGY_NARRATIVE =
  "This audit was conducted using a combination of interviews with relevant personnel, desktop review of documented information and records, and field visits to observe work activities and conditions directly. Interviews were used to verify workers' and management's understanding and implementation of the management system; document review was used to confirm the existence, adequacy and currency of required documented information; and field visits were used to observe actual working conditions, practices and controls in place at the time of the audit."

export const PROCESS_VERIFICATION_STATEMENT =
  "The processes, practices and documented information described in this report were verified as being in place and in operation at the time of this audit. The findings reflect the status of the management system as observed during the audit period only; subsequent changes to personnel, procedures, equipment or site conditions may affect the continuing validity of these findings."

export const DEFAULT_SAMPLING_DISCLAIMER =
  "This audit was conducted using a representative sample of documents, records, sites, personnel and activities. Sample sizes were selected to provide a reasonable basis for conclusions on conformity across the audited scope, but sampling means that nonconformities may exist that were not identified during this audit. The findings reflect the state of the system at the time of the audit and for the sample examined, not a 100% verification of every record or activity."

export const DEFAULT_CONFIDENTIALITY_STATEMENT =
  "This audit was conducted with objectivity and independence. All information obtained during the audit is treated as confidential and will only be shared with the auditee organization and, where applicable, the certification body or other authorized parties. The audit team declares no conflict of interest with the auditee that would compromise the impartiality of this audit."
