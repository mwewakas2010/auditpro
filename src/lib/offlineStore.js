import { openDB } from 'idb'

const DB_NAME = 'auditpro-offline'
const DB_VERSION = 2
const AUDITS_STORE = 'audits'
const CCVS_STORE = 'ccvs'
const COMPANIES_CACHE_KEY = 'companies-cache'

let dbPromise = null
function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(AUDITS_STORE)) {
          db.createObjectStore(AUDITS_STORE, { keyPath: 'localId' })
        }
        if (!db.objectStoreNames.contains(CCVS_STORE)) {
          db.createObjectStore(CCVS_STORE, { keyPath: 'localId' })
        }
      },
    })
  }
  return dbPromise
}

// Saves the full working state of an audit under a local key. Called
// automatically as the auditor works, regardless of online/offline status,
// so nothing is ever lost if the tab closes or signal drops mid-edit.
export async function saveLocalAudit(localId, { audit, scope, checklist, signoffs, pendingSync, organizationId }) {
  const db = await getDB()
  await db.put(AUDITS_STORE, {
    localId,
    audit,
    scope,
    checklist,
    signoffs,
    organizationId: organizationId || null,
    pendingSync: !!pendingSync,
    savedAt: new Date().toISOString(),
  })
}

export async function getLocalAudit(localId) {
  const db = await getDB()
  return db.get(AUDITS_STORE, localId)
}

export async function deleteLocalAudit(localId) {
  const db = await getDB()
  await db.delete(AUDITS_STORE, localId)
}

// Returns every locally-saved audit that has changes not yet pushed to
// Supabase - used by the sync-on-reconnect routine.
export async function listPendingAudits() {
  const db = await getDB()
  const all = await db.getAll(AUDITS_STORE)
  return all.filter((a) => a.pendingSync)
}

// ---- Same pattern as above, for CCVs ----

export async function saveLocalCCV(localId, { templateId, companyId, meta, responses, pendingSync }) {
  const db = await getDB()
  await db.put(CCVS_STORE, {
    localId,
    templateId,
    companyId: companyId || null,
    meta,
    responses,
    pendingSync: !!pendingSync,
    savedAt: new Date().toISOString(),
  })
}

export async function getLocalCCV(localId) {
  const db = await getDB()
  return db.get(CCVS_STORE, localId)
}

export async function deleteLocalCCV(localId) {
  const db = await getDB()
  await db.delete(CCVS_STORE, localId)
}

export async function listPendingCCVs() {
  const db = await getDB()
  const all = await db.getAll(CCVS_STORE)
  return all.filter((c) => c.pendingSync)
}

// Simple localStorage cache of the companies list, so the Setup screen's
// Company/Department dropdowns aren't just empty if you open a new audit
// with no connection (uses whatever was last successfully fetched online).
export function cacheCompaniesList(companies) {
  try {
    localStorage.setItem(COMPANIES_CACHE_KEY, JSON.stringify(companies))
  } catch {
    // ignore quota errors - this is a convenience cache, not critical data
  }
}

export function getCachedCompaniesList() {
  try {
    const raw = localStorage.getItem(COMPANIES_CACHE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}
