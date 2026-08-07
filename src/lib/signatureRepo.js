import { supabase } from './supabaseClient'

// A simple, canonical content hash for tamper-evidence: if the underlying
// record changes after signing, recomputing this later won't match. Uses
// the browser's built-in Web Crypto API - no extra dependency needed.
export async function hashContent(obj) {
  const json = JSON.stringify(obj, Object.keys(obj).sort())
  const data = new TextEncoder().encode(json)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function getSavedSignature() {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id
  if (!userId) return null
  const { data, error } = await supabase
    .from('saved_signatures')
    .select('signature_image, full_name')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function saveSignatureForReuse(signatureImage, fullName) {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id
  if (!userId) return
  await supabase.from('saved_signatures').upsert(
    { user_id: userId, signature_image: signatureImage, full_name: fullName, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )
}

export async function signAudit(auditId, role, { signatureImage, signatoryName, consentAccepted, userAgent, contentSnapshot }) {
  const { data: userData } = await supabase.auth.getUser()
  const contentHash = await hashContent(contentSnapshot)
  const { error } = await supabase.from('audit_signoffs').upsert(
    {
      audit_id: auditId,
      role,
      signatory_name: signatoryName,
      signature_image: signatureImage,
      consent_accepted: consentAccepted,
      user_agent: userAgent,
      content_hash: contentHash,
      signed_by_user_id: userData?.user?.id,
      signed_at: new Date().toISOString(),
    },
    { onConflict: 'audit_id,role' }
  )
  if (error) throw error
}

export async function loadAuditSignoffs(auditId) {
  const { data, error } = await supabase.from('audit_signoffs').select('*').eq('audit_id', auditId)
  if (error) throw error
  const result = {}
  data.forEach((r) => { result[r.role] = r })
  return result
}

export async function signCCV(ccvInstanceId, role, { signatureImage, signatoryName, consentAccepted, userAgent, contentSnapshot }) {
  const { data: userData } = await supabase.auth.getUser()
  const contentHash = await hashContent(contentSnapshot)
  const { error } = await supabase.from('ccv_signoffs').upsert(
    {
      ccv_instance_id: ccvInstanceId,
      role,
      signatory_name: signatoryName,
      signature_image: signatureImage,
      consent_accepted: consentAccepted,
      user_agent: userAgent,
      content_hash: contentHash,
      signed_by_user_id: userData?.user?.id,
      signed_at: new Date().toISOString(),
    },
    { onConflict: 'ccv_instance_id,role' }
  )
  if (error) throw error
}

export async function loadCCVSignoffs(ccvInstanceId) {
  const { data, error } = await supabase.from('ccv_signoffs').select('*').eq('ccv_instance_id', ccvInstanceId)
  if (error) throw error
  const result = {}
  data.forEach((r) => { result[r.role] = r })
  return result
}

export async function signFLRA(flraId, role, { signatureImage, signatoryName, consentAccepted, userAgent, contentSnapshot }) {
  const { data: userData } = await supabase.auth.getUser()
  const contentHash = await hashContent(contentSnapshot)
  const { error } = await supabase.from('flra_signoffs').upsert(
    {
      flra_id: flraId,
      role,
      signatory_name: signatoryName,
      signature_image: signatureImage,
      consent_accepted: consentAccepted,
      user_agent: userAgent,
      content_hash: contentHash,
      signed_by_user_id: userData?.user?.id,
      signed_at: new Date().toISOString(),
    },
    { onConflict: 'flra_id,role' }
  )
  if (error) throw error
}

export async function loadFLRASignoffs(flraId) {
  const { data, error } = await supabase.from('flra_signoffs').select('*').eq('flra_id', flraId)
  if (error) throw error
  const result = {}
  data.forEach((r) => { result[r.role] = r })
  return result
}
