import { badgeInfo } from '../data/schemes'

const badgeCls = {
  major: 'bg-majorbg text-major',
  minor: 'bg-minorbg text-minor',
  ofi: 'bg-ofibg text-ofi',
  na: 'bg-nabg text-na',
}

export default function Findings({ scheme, checklist, clauses }) {
  const rows = clauses.filter((c) => {
    const s = checklist[c.clause_code].status
    return s && s !== 'conform' && s !== 'na'
  })

  const counts = { major: 0, minor: 0, nc: 0, ofi: 0, conform: 0, na: 0 }
  clauses.forEach((c) => {
    const s = checklist[c.clause_code].status
    if (s && counts[s] !== undefined) counts[s]++
  })

  return (
    <div>
      <h2 className="font-display text-[17px] font-semibold text-navy mb-1">Findings Register</h2>
      <div className="text-[12.5px] text-inksoft mb-5">
        Auto-derived from checklist entries. Updates live as you audit.
      </div>

      <div className="flex gap-3.5 mb-5">
        {scheme === 'full' ? (
          <>
            <Stat n={counts.major} l="Major NC" color="text-major" />
            <Stat n={counts.minor} l="Minor NC" color="text-minor" />
            <Stat n={counts.ofi} l="OFI" color="text-ofi" />
            <Stat n={counts.conform} l="Conforming" color="text-conform" />
          </>
        ) : (
          <>
            <Stat n={counts.nc} l="Nonconforming" color="text-major" />
            <Stat n={counts.ofi} l="OFI" color="text-ofi" />
            <Stat n={counts.conform} l="Conforming" color="text-conform" />
            <Stat n={counts.na} l="N/A" color="text-ink" />
          </>
        )}
      </div>

      <div className="bg-white border border-line rounded-md overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-inksoft text-[13px]">
            No findings yet — mark checklist items in the Checklist tab.
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Clause', 'Requirement', 'Nonconformance / Finding', 'Evidence'].map((h) => (
                  <th key={h} className="text-left text-[11px] uppercase tracking-wide text-inksoft px-3 py-2.5 border-b-2 border-line">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const entry = checklist[c.clause_code]
                const b = badgeInfo(entry.status)
                return (
                  <tr key={c.clause_code}>
                    <td className="px-3 py-3 border-b border-line align-top">
                      <div className="font-mono text-[12.5px]">{c.clause_code}</div>
                      <div className="text-[10.5px] text-inksoft mt-0.5">{c.title}</div>
                    </td>
                    <td className="px-3 py-3 border-b border-line align-top text-[13px]">{c.requirement_text}</td>
                    <td className="px-3 py-3 border-b border-line align-top text-[13px]">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badgeCls[b.cls]}`}>
                        {b.label}
                      </span>
                      <div className="mt-1.5">
                        {entry.evidenceText || <em className="text-inksoft">No finding text entered yet</em>}
                      </div>
                    </td>
                    <td className="px-3 py-3 border-b border-line align-top text-xs">
                      {entry.evidenceAvailable ? (
                        <span className="text-conform font-semibold">✓ Available</span>
                      ) : (
                        <span className="text-major font-semibold">✕ Not available</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Stat({ n, l, color }) {
  return (
    <div className="flex-1 bg-white border border-line rounded-md px-4.5 py-4">
      <div className={`font-display text-[28px] font-bold ${color}`}>{n}</div>
      <div className="text-[11px] uppercase tracking-wide text-inksoft mt-0.5">{l}</div>
    </div>
  )
}
