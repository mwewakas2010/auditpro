import { useEffect, useState } from 'react'
import {
  listCompanies,
  createCompany,
  updateCompanyLogo,
  renameCompany,
  deleteCompany,
  createDepartment,
  deleteDepartment,
} from '../lib/companyRepo'

export default function Companies({ onBack }) {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newCompanyLogo, setNewCompanyLogo] = useState(null)
  const [newDeptName, setNewDeptName] = useState({})
  const [showNewCompany, setShowNewCompany] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      setCompanies(await listCompanies())
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  const handleLogoFile = (e, setter) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setter(reader.result)
    reader.readAsDataURL(file)
  }

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) return
    try {
      await createCompany(newCompanyName.trim(), newCompanyLogo)
      setNewCompanyName('')
      setNewCompanyLogo(null)
      setShowNewCompany(false)
      refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleAddDepartment = async (companyId) => {
    const name = (newDeptName[companyId] || '').trim()
    if (!name) return
    try {
      await createDepartment(companyId, name)
      setNewDeptName({ ...newDeptName, [companyId]: '' })
      refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleLogoChange = async (companyId, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        await updateCompanyLogo(companyId, reader.result)
        refresh()
      } catch (err) {
        setError(err.message)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleDeleteCompany = async (companyId, name) => {
    if (!confirm(`Delete "${name}" and all its departments? Audits already linked to it are NOT deleted, but will lose their company link.`)) return
    try {
      await deleteCompany(companyId)
      refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteDept = async (deptId) => {
    if (!confirm('Delete this department?')) return
    try {
      await deleteDepartment(deptId)
      refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="bg-navy text-white px-8 py-5 flex justify-between items-center">
        <div>
          <div className="font-display text-xl font-bold">AuditPro</div>
          <div className="text-[10.5px] font-mono text-[#9FB0C9] uppercase tracking-wide mt-0.5">
            SentinelPro Consultants
          </div>
        </div>
        <button onClick={onBack} className="text-xs border border-white/30 px-3 py-1.5 rounded hover:bg-white/10">
          ← My Audits
        </button>
      </div>

      <div className="max-w-3xl mx-auto p-8">
        <div className="flex justify-between items-center mb-5">
          <h1 className="font-display text-xl font-semibold text-navy">Companies</h1>
          <button
            onClick={() => setShowNewCompany(!showNewCompany)}
            className="bg-navy text-white px-4 py-2 rounded text-sm font-medium"
          >
            + New Company
          </button>
        </div>

        {error && <div className="text-sm text-major bg-majorbg border border-major rounded p-3 mb-4">{error}</div>}

        {showNewCompany && (
          <div className="bg-white border border-line rounded-md p-5 mb-4">
            <label className="block text-[11.5px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">
              Company Name
            </label>
            <input
              type="text"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              className="w-full px-3 py-2 border border-line rounded text-sm mb-3"
              placeholder="e.g. Mining Haulage Company Ltd"
            />
            <label className="block text-[11.5px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">
              Logo (optional — used on every audit report for this company)
            </label>
            <input type="file" accept="image/*" onChange={(e) => handleLogoFile(e, setNewCompanyLogo)} className="text-sm mb-3" />
            <div className="flex gap-2">
              <button onClick={handleCreateCompany} className="bg-navy text-white px-4 py-2 rounded text-sm">
                Create
              </button>
              <button
                onClick={() => { setShowNewCompany(false); setNewCompanyName(''); setNewCompanyLogo(null) }}
                className="border border-line px-4 py-2 rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading && <div className="text-sm text-inksoft">Loading…</div>}

        {!loading && companies.length === 0 && !showNewCompany && (
          <div className="bg-white border border-line rounded-md p-10 text-center text-inksoft text-sm">
            No companies yet. Click "+ New Company" to add your first client.
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {companies.map((co) => (
            <div key={co.id} className="bg-white border border-line rounded-md overflow-hidden">
              <div
                className="px-5 py-4 flex justify-between items-center cursor-pointer"
                onClick={() => setExpanded(expanded === co.id ? null : co.id)}
              >
                <div className="flex items-center gap-3">
                  {co.logo_url ? (
                    <img src={co.logo_url} alt="" className="h-8 w-8 object-contain rounded border border-line" />
                  ) : (
                    <div className="h-8 w-8 rounded border border-line bg-nabg" />
                  )}
                  <div>
                    <div className="font-display font-semibold text-[15px]">{co.name}</div>
                    <div className="text-xs text-inksoft">
                      {co.company_departments?.length || 0} department(s)
                    </div>
                  </div>
                </div>
                <div className="text-xs text-inksoft">{expanded === co.id ? '▲' : '▼'}</div>
              </div>

              {expanded === co.id && (
                <div className="border-t border-line px-5 py-4 bg-paper">
                  <div className="mb-4">
                    <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">
                      Company Logo
                    </label>
                    <input type="file" accept="image/*" onChange={(e) => handleLogoChange(co.id, e)} className="text-xs" />
                  </div>

                  <div className="mb-3">
                    <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">
                      Departments / Sections
                    </label>
                    {(co.company_departments || []).length === 0 && (
                      <div className="text-xs text-inksoft mb-2">No departments added yet.</div>
                    )}
                    {(co.company_departments || []).map((d) => (
                      <div key={d.id} className="flex justify-between items-center py-1.5 border-b border-line text-sm">
                        {d.name}
                        <button onClick={() => handleDeleteDept(d.id)} className="text-[11px] text-major">
                          Remove
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        placeholder="New department name"
                        value={newDeptName[co.id] || ''}
                        onChange={(e) => setNewDeptName({ ...newDeptName, [co.id]: e.target.value })}
                        className="flex-1 px-2.5 py-1.5 border border-line rounded text-sm"
                      />
                      <button
                        onClick={() => handleAddDepartment(co.id)}
                        className="bg-navy text-white px-3 py-1.5 rounded text-xs"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-line flex justify-between items-center">
                    <button
                      onClick={() => {
                        const name = prompt('Rename company:', co.name)
                        if (name && name.trim()) renameCompany(co.id, name.trim()).then(refresh)
                      }}
                      className="text-xs text-navy2"
                    >
                      Rename Company
                    </button>
                    <button
                      onClick={() => handleDeleteCompany(co.id, co.name)}
                      className="text-xs text-major"
                    >
                      Delete Company
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
