import { openDB } from 'idb'

const DB_NAME = 'auditpro-offline'
const DB_VERSION = 4
const AUDITS_STORE = 'audits'
const CCVS_STORE = 'ccvs'
const FLRAS_STORE = 'flras'
const JSAS_STORE = 'jsas'
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
        if (!db.objectStoreNames.contains(FLRAS_STORE)) {
          db.createObjectStore(FLRAS_STORE, { keyPath: 'localId' })
        }
        if (!db.objectStoreNames.contains(JSAS_STORE)) {
          db.createObjectStore(JSAS_STORE, { keyPath: 'localId' })
        }
      },
    })
  }
  return dbPromise
}

// ---- Audits ----

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

export async function listPendingAudits() {
  const db = await getDB()
  const all = await db.getAll(AUDITS_STORE)
  return all.filter((a) => a.pendingSync)
}

// ---- CCVs ----

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

// ---- FLRAs ----

export async function saveLocalFLRA(localId, { instance, hazardRows, safetyChecks, riskControls, hazardReports, nearMissReports, pendingSync }) {
  const db = await getDB()
  await db.put(FLRAS_STORE, {
    localId,
    instance,
    hazardRows,
    safetyChecks,
    riskControls,
    hazardReports,
    nearMissReports,
    pendingSync: !!pendingSync,
    savedAt: new Date().toISOString(),
  })
}

export async function getLocalFLRA(localId) {
  const db = await getDB()
  return db.get(FLRAS_STORE, localId)
}

export async function deleteLocalFLRA(localId) {
  const db = await getDB()
  await db.delete(FLRAS_STORE, localId)
}

export async function listPendingFLRAs() {
  const db = await getDB()
  const all = await db.getAll(FLRAS_STORE)
  return all.filter((f) => f.pendingSync)
}

// Simple localStorage cache of the companies list, so the Setup screen's
// company dropdown still has something to show when opened with no signal.
// ---- JSAs ----

export async function saveLocalJSA(localId, { instance, steps, pendingSync }) {
  const db = await getDB()
  await db.put(JSAS_STORE, {
    localId,
    instance,
    steps,
    pendingSync: !!pendingSync,
    savedAt: new Date().toISOString(),
  })
}

export async function getLocalJSA(localId) {
  const db = await getDB()
  return db.get(JSAS_STORE, localId)
}

export async function deleteLocalJSA(localId) {
  const db = await getDB()
  await db.delete(JSAS_STORE, localId)
}

export async function listPendingJSAs() {
  const db = await getDB()
  const all = await db.getAll(JSAS_STORE)
  return all.filter((j) => j.pendingSync)
}

export function cacheCompaniesList(companies) {
  try {
    localStorage.setItem(COMPANIES_CACHE_KEY, JSON.stringify(companies))
  } catch {
    // ignore - non-critical
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
