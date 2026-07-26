import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getClauses } from '../data/standards'
import { badgeInfo } from '../data/schemes'

const NAVY = [22, 37, 61]
const GOLD = [184, 134, 43]
const INK = [34, 38, 43]
const INK_SOFT = [91, 95, 102]
const LINE = [220, 214, 200]
const CONFORM = [230, 240, 234]
const CONFORM_TXT = [47, 110, 78]
const MAJOR = [248, 231, 227]
const MAJOR_TXT = [168, 58, 44]
const MINOR = [251, 240, 219]
const MINOR_TXT = [192, 138, 30]
const OFI = [228, 238, 240]
const OFI_TXT = [46, 107, 120]

const MARGIN = 14
const PAGE_W = 210
const PAGE_H = 297
const CONTENT_W = PAGE_W - MARGIN * 2

function rowStyle(status) {
  switch (status) {
    case 'conform': return { fill: CONFORM, text: CONFORM_TXT }
    case 'major': return { fill: MAJOR, text: MAJOR_TXT }
    case 'nc': return { fill: MAJOR, text: MAJOR_TXT }
    case 'minor': return { fill: MINOR, text: MINOR_TXT }
    case 'ofi': return { fill: OFI, text: OFI_TXT }
    default: return { fill: [255, 255, 255], text: INK }
  }
}

function deptName(audit) {
  const d = audit.company_departments
  if (!d) return '—'
  return Array.isArray(d) ? d[0]?.name || '—' : d.name || '—'
}

function loadImageDims(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.width, h: img.height })
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

async function toDataUrl(src) {
  if (src.startsWith('data:')) return src
  try {
    const res = await fetch(src)
    const blob = await res.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function imageFormat(src) {
  const s = src.toLowerCase()
  if (s.includes('image/png') || s.endsWith('.png')) return 'PNG'
  if (s.includes('image/webp') || s.endsWith('.webp')) return 'WEBP'
  return 'JPEG'
}

function sectionHeader(doc, title, y) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11.5)
  doc.setTextColor(...NAVY)
  doc.text(title, MARGIN, y)
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.6)
  doc.line(MARGIN, y + 1.5, MARGIN + 10, y + 1.5)
  doc.setLineWidth(0.2)
  return y + 7
}

function footer(doc) {
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setDrawColor(...LINE)
    doc.line(MARGIN, PAGE_H - 14, PAGE_W - MARGIN, PAGE_H - 14)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...INK_SOFT)
    doc.text('SentinelPro Consultants — Consolidated Audit Report', MARGIN, PAGE_H - 9)
    doc.text(`Page ${i} of ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 9, { align: 'right' })
  }
}

// audits: array of { id, standard, audit_type, start_date, end_date, conclusion, status, lead_auditor, company_departments, findings: [...] }
export async function generateConsolidatedReport({ companyName, companyLogoUrl, audits }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // ================= COVER =================
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, PAGE_W, 56, 'F')
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(1.2)
  doc.line(0, 56, PAGE_W, 56)
  doc.setLineWidth(0.2)

  if (companyLogoUrl) {
    const logoData = await toDataUrl(companyLogoUrl)
    if (logoData) {
      const dims = await loadImageDims(logoData)
      if (dims) {
        const maxH = 18, maxW = 42
        let w = maxW, h = (dims.h / dims.w) * w
        if (h > maxH) { h = maxH; w = (dims.w / dims.h) * h }
        doc.addImage(logoData, imageFormat(companyLogoUrl), PAGE_W - MARGIN - w, 10, w, h)
      }
    }
  }

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(19)
  doc.text('Consolidated Audit Report', MARGIN, 30)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(companyName, MARGIN, 42)

  const dates = audits.map((a) => a.start_date).filter(Boolean).sort()
  const dateRange = dates.length ? `${dates[0]} to ${dates[dates.length - 1]}` : 'No dates recorded'

  let y = 68
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...GOLD)
  doc.text(`Period covered: ${dateRange}`, MARGIN, y)
  y += 8

  y = sectionHeader(doc, 'Audits Included in This Report', y)
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
    head: [['Date', 'Department', 'Standard', 'Type', 'Conclusion', 'Status']],
    body: audits.map((a) => [
      a.start_date || '—',
      deptName(a),
      a.standard,
      a.audit_type,
      (a.conclusion || '—').replace(/_/g, ' '),
      a.status === 'final' ? 'Final' : a.status === 'draft_issued' ? 'Draft Issued' : 'In Progress',
    ]),
  })

  // ================= EXECUTIVE SUMMARY =================
  doc.addPage()
  y = 20
  y = sectionHeader(doc, 'Executive Summary', y)

  const counts = { conform: 0, major: 0, minor: 0, nc: 0, ofi: 0 }
  audits.forEach((a) => {
    a.findings.forEach((f) => {
      if (counts[f.status] !== undefined) counts[f.status]++
    })
  })

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 9.5, cellPadding: 2.5, halign: 'center', fontStyle: 'bold' },
    body: [
      ['Audits', 'Conforming', 'Major NC', 'Minor NC', 'Nonconforming', 'OFI'],
      [String(audits.length), String(counts.conform), String(counts.major), String(counts.minor), String(counts.nc), String(counts.ofi)],
    ],
  })
  y = doc.lastAutoTable.finalY + 10

  // ================= RECURRING ISSUES =================
  y = sectionHeader(doc, 'Recurring Nonconformities Across Audits', y)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8.5)
  doc.setTextColor(...INK_SOFT)
  doc.text('Clauses that appear as a nonconformity in more than one audit in this report.', MARGIN, y)
  y += 6

  const clauseOccurrences = {}
  audits.forEach((a) => {
    a.findings
      .filter((f) => ['nc', 'minor', 'major'].includes(f.status))
      .forEach((f) => {
        const key = `${a.standard}::${f.clause_code}`
        if (!clauseOccurrences[key]) clauseOccurrences[key] = { standard: a.standard, clause_code: f.clause_code, audits: [] }
        clauseOccurrences[key].audits.push(`${deptName(a)} (${a.start_date || '—'})`)
      })
  })
  const recurring = Object.values(clauseOccurrences).filter((c) => c.audits.length > 1)

  if (!recurring.length) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...INK)
    doc.text('No clause recurred as a nonconformity across more than one audit.', MARGIN, y)
    y += 8
  } else {
    autoTable(doc, {
      startY: y,
      theme: 'grid',
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 8.5, cellPadding: 2 },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
      head: [['Standard', 'Clause', 'Occurred In']],
      body: recurring.map((r) => [r.standard, r.clause_code, r.audits.join('; ')]),
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // ================= PER-AUDIT DETAILED FINDINGS =================
  for (const a of audits) {
    const clauseLib = getClauses(a.standard)
    const findingsRows = a.findings.filter((f) => ['nc', 'minor', 'major', 'ofi'].includes(f.status))

    doc.addPage()
    y = 20
    y = sectionHeader(doc, `${deptName(a)} — ${a.standard}`, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...INK_SOFT)
    doc.text(
      `${a.start_date || '—'} to ${a.end_date || '—'}  •  ${a.audit_type}  •  Lead Auditor: ${a.lead_auditor || '—'}  •  Conclusion: ${(a.conclusion || '—').replace(/_/g, ' ')}`,
      MARGIN,
      y
    )
    y += 8

    if (!findingsRows.length) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9.5)
      doc.text('No nonconformances or opportunities for improvement recorded for this audit.', MARGIN, y)
      continue
    }

    const tableBody = findingsRows.map((f) => {
      const clause = clauseLib.find((c) => c.clause_code === f.clause_code)
      const b = badgeInfo(f.status)
      return [
        `${f.clause_code}\n${clause?.title || ''}`,
        b.label,
        f.evidence_text || 'No finding text entered.',
        f.evidence_available ? 'Available' : 'Not available',
        f.status,
      ]
    })

    autoTable(doc, {
      startY: y,
      theme: 'grid',
      margin: { left: MARGIN, right: MARGIN, bottom: 18 },
      styles: { fontSize: 8, cellPadding: 2, valign: 'top', overflow: 'linebreak' },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      columnStyles: {
        0: { cellWidth: 34, fontStyle: 'bold' },
        1: { cellWidth: 24 },
        2: { cellWidth: 92 },
        3: { cellWidth: 22 },
      },
      head: [['Clause', 'Classification', 'Finding', 'Evidence']],
      body: tableBody.map((r) => r.slice(0, 4)),
      didParseCell: (data) => {
        if (data.section === 'body') {
          const status = tableBody[data.row.index][4]
          const style = rowStyle(status)
          if (data.column.index === 1) {
            data.cell.styles.fillColor = style.fill
            data.cell.styles.textColor = style.text
            data.cell.styles.fontStyle = 'bold'
          }
        }
      },
    })
    y = doc.lastAutoTable.finalY + 6
  }

  footer(doc)
  doc.save(`${companyName.replace(/\s+/g, '_')}_Consolidated_Audit_Report.pdf`)
}
