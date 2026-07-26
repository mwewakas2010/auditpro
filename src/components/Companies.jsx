import { useEffect, useState } from 'react'
import {
  listCompanies,
  createCompany,
  updateCompanyLogo,
  renameCompany,
  deleteCompany,
  createDepartment,
  deleteDepartment,
  getCompanyAuditsSummary,
  getAuditFindingsForReport,
} from '../lib/companyRepo'
import { generateConsolidatedReport } from '../utils/consolidatedReport'

export default function Companies() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newCompanyLogo, setNewCompanyLogo] = useState(null)
  const [newDeptName, setNewDeptName] = useState({})
  const [showNewCompany, setShowNewCompany] = useState(false)

  const [reportPanelFor, setReportPanelFor] = useState(null)
  const [reportAudits, setReportAudits] = useState([])
  const [selectedAuditIds, setSelectedAuditIds] = useState(new Set())
  const [reportLoading, setReportLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  const openReportPanel = async (company) => {
    setReportPanelFor(company.id)
    setReportLoading(true)
    try {
      const audits = await getCompanyAuditsSummary(company.id)
      setReportAudits(audits)
      // default to pre-selecting only Final audits, since drafts are still work-in-progress
      setSelectedAuditIds(new Set(audits.filter((a) => a.status === 'final').map((a) => a.id)))
    } catch (err) {
      setError(err.message)
    }
    setReportLoading(false)
  }

  const toggleAuditSelection = (id) => {
    const next = new Set(selectedAuditIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedAuditIds(next)
  }

  const handleGenerateReport = async (company) => {
    setGenerating(true)
    try {
      const selected = reportAudits.filter((a) => selectedAuditIds.has(a.id))
      const withFindings = await Promise.all(
        selected.map(async (a) => ({ ...a, findings: await getAuditFindingsForReport(a.id) }))
      )
      await generateConsolidatedReport({ companyName: company.name, companyLogoUrl: company.logo_url, audits: withFindings })
    } catch (err) {
      setError(err.message)
    }
    setGenerating(false)
  }

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
    <div className="p-9">
      <div className="max-w-3xl">
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

                  <div className="mt-4 pt-3 border-t border-line">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-[11px] font-semibold text-navy2 uppercase tracking-wide">
                        Consolidated Report
                      </label>
                      <button
                        onClick={() => (reportPanelFor === co.id ? setReportPanelFor(null) : openReportPanel(co))}
                        className="text-xs px-2.5 py-1 border border-gold text-gold rounded hover:bg-goldsoft"
                      >
                        {reportPanelFor === co.id ? 'Close' : '📄 Build Consolidated Report'}
                      </button>
                    </div>

                    {reportPanelFor === co.id && (
                      <div className="bg-white border border-line rounded p-3">
                        {reportLoading && <div className="text-xs text-inksoft">Loading audits…</div>}
                        {!reportLoading && reportAudits.length === 0 && (
                          <div className="text-xs text-inksoft">No audits recorded for this company yet.</div>
                        )}
                        {!reportLoading && reportAudits.length > 0 && (
                          <>
                            <div className="text-[11px] text-inksoft italic mb-2">
                              Select which audits to include. Final audits are pre-selected; drafts are not, since
                              they're still work-in-progress.
                            </div>
                            <div className="flex flex-col gap-1 mb-3 max-h-52 overflow-y-auto">
                              {reportAudits.map((a) => (
                                <label key={a.id} className="flex items-center gap-2 text-xs py-1 border-b border-line">
                                  <input
                                    type="checkbox"
                                    checked={selectedAuditIds.has(a.id)}
                                    onChange={() => toggleAuditSelection(a.id)}
                                  />
                                  <span className="font-mono">{a.start_date || 'No date'}</span>
                                  <span>{a.company_departments?.name || (Array.isArray(a.company_departments) ? a.company_departments[0]?.name : '') || 'No dept'}</span>
                                  <span className="text-inksoft">{a.standard}</span>
                                  <span className={`ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                    a.status === 'final' ? 'bg-conformbg text-conform' : 'bg-nabg text-na'
                                  }`}>
                                    {a.status === 'final' ? 'Final' : a.status === 'draft_issued' ? 'Draft' : 'In Progress'}
                                  </span>
                                </label>
                              ))}
                            </div>
                            <button
                              onClick={() => handleGenerateReport(co)}
                              disabled={generating || selectedAuditIds.size === 0}
                              className="bg-navy text-white px-3 py-1.5 rounded text-xs disabled:opacity-40"
                            >
                              {generating ? 'Generating…' : `Generate PDF (${selectedAuditIds.size} audit${selectedAuditIds.size === 1 ? '' : 's'})`}
                            </button>
                          </>
                        )}
                      </div>
                    )}
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
