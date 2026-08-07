import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getStandardInfo } from '../data/standards'
import { badgeInfo, defaultScopeText, DEFAULT_METHODOLOGY_NARRATIVE, PROCESS_VERIFICATION_STATEMENT, DEFAULT_SAMPLING_DISCLAIMER, DEFAULT_CONFIDENTIALITY_STATEMENT } from '../data/schemes'

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
const NA_BG = [239, 237, 229]
const NA_TXT = [138, 135, 120]

const MARGIN = 14
const PAGE_W = 210
const PAGE_H = 297
const CONTENT_W = PAGE_W - MARGIN * 2

const METHOD_LABELS = {
  interviews: 'Interviews',
  document_review: 'Desktop / Document Review',
  field_visit: 'Field Visit',
}

function conclusionText(conclusion, systemName) {
  const map = {
    suitable_effective: `The ${systemName} is suitable, adequate and effective for the scope audited.`,
    adequate_not_effective: `The ${systemName} is adequate but not fully effective for the scope audited.`,
    not_suitable: `The ${systemName} is not suitable / not adequate for the scope audited.`,
  }
  return map[conclusion] || '—'
}

function rowStyle(status) {
  switch (status) {
    case 'conform': return { fill: CONFORM, text: CONFORM_TXT }
    case 'major': return { fill: MAJOR, text: MAJOR_TXT }
    case 'nc': return { fill: MAJOR, text: MAJOR_TXT }
    case 'minor': return { fill: MINOR, text: MINOR_TXT }
    case 'ofi': return { fill: OFI, text: OFI_TXT }
    case 'na': return { fill: NA_BG, text: NA_TXT }
    default: return { fill: [255, 255, 255], text: INK }
  }
}

function evidenceFileList(thumbs) {
  if (!thumbs || !thumbs.length) return 'No evidence files attached'
  return thumbs.map((t) => `${t.kind === 'photo' ? 'Photo' : 'File'}: ${t.label}`).join('\n')
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
  if (s.includes('image/jpeg') || s.includes('image/jpg') || s.endsWith('.jpg') || s.endsWith('.jpeg')) return 'JPEG'
  if (s.includes('image/webp') || s.endsWith('.webp')) return 'WEBP'
  return 'JPEG'
}

function footer(doc, standardLabel, brandName) {
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setDrawColor(...LINE)
    doc.line(MARGIN, PAGE_H - 14, PAGE_W - MARGIN, PAGE_H - 14)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...INK_SOFT)
    doc.text(`${brandName} — ${standardLabel} Audit Report`, MARGIN, PAGE_H - 9)
    doc.text(`Page ${i} of ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 9, { align: 'right' })
  }
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

async function addPhotoAppendix(doc, scopedClauses, checklist) {
  const CELL_W = 42, CELL_H = 32, GAP = 4, PER_ROW = 4

  const groups = []
  for (const c of scopedClauses) {
    const photos = (checklist[c.clause_code]?.thumbs || []).filter((t) => t.kind === 'photo' && (t.dataUrl || t.remoteUrl))
    if (photos.length) groups.push({ clause: c, photos })
  }
  console.log('[AuditPro PDF] Photo appendix groups:', groups.map((g) => `${g.clause.clause_code}: ${g.photos.length} photo(s)`))
  if (!groups.length) return

  doc.addPage()
  let y = 20
  y = sectionHeader(doc, 'Appendix — Photographic Evidence', y)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8.5)
  doc.setTextColor(...INK_SOFT)
  doc.text('Photographs captured in-app during the audit, grouped by clause.', MARGIN, y)
  y += 7

  for (const group of groups) {
    if (y + 10 + CELL_H > PAGE_H - 20) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...NAVY)
    doc.text(`${group.clause.clause_code} — ${group.clause.title}`, MARGIN, y)
    y += 5

    for (let i = 0; i < group.photos.length; i += PER_ROW) {
      const row = group.photos.slice(i, i + PER_ROW)
      if (y + CELL_H > PAGE_H - 20) { doc.addPage(); y = 20 }
      for (let j = 0; j < row.length; j++) {
        const photo = row[j]
        const x = MARGIN + j * (CELL_W + GAP)
        doc.setDrawColor(...LINE)
        doc.rect(x, y, CELL_W, CELL_H)
        const src = photo.dataUrl || photo.remoteUrl
        let drawn = false
        try {
          const dataSrc = await toDataUrl(src)
          if (dataSrc) {
            const dims = await loadImageDims(dataSrc)
            if (dims) {
              const scale = Math.min(CELL_W / dims.w, CELL_H / dims.h)
              const w = dims.w * scale, h = dims.h * scale
              doc.addImage(dataSrc, imageFormat(src), x + (CELL_W - w) / 2, y + (CELL_H - h) / 2, w, h)
              drawn = true
            }
          }
        } catch (err) {
          console.error('[AuditPro PDF] Failed to embed photo for', group.clause.clause_code, err)
        }
        if (!drawn) {
          console.warn('[AuditPro PDF] Photo unavailable for', group.clause.clause_code, photo.label)
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(7)
          doc.setTextColor(...INK_SOFT)
          const msg = doc.splitTextToSize('Image unavailable', CELL_W - 4)
          doc.text(msg, x + CELL_W / 2, y + CELL_H / 2, { align: 'center' })
        }
      }
      y += CELL_H + GAP
    }
    y += 4
  }
}

export async function generateAuditPdf({ audit, signoffs, checklist, scope, clauses, reportBrandName }) {
  const standardInfo = getStandardInfo(audit.standard)
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // ================= COVER PAGE =================
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, PAGE_W, 56, 'F')
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(1.2)
  doc.line(0, 56, PAGE_W, 56)
  doc.setLineWidth(0.2)

  if (audit.logo_url) {
    const logoData = await toDataUrl(audit.logo_url)
    if (logoData) {
      const dims = await loadImageDims(logoData)
      if (dims) {
        const maxH = 18, maxW = 42
        let w = maxW, h = (dims.h / dims.w) * w
        if (h > maxH) { h = maxH; w = (dims.w / dims.h) * h }
        doc.addImage(logoData, imageFormat(audit.logo_url), PAGE_W - MARGIN - w, 10, w, h)
      }
    }
  }

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(19)
  const titleLines = doc.splitTextToSize(standardInfo.system, 130)
  doc.text(titleLines, MARGIN, 26)
  doc.text('Audit Report', MARGIN, 26 + titleLines.length * 8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  doc.text(standardInfo.label, MARGIN, 26 + titleLines.length * 8 + 9)

  let y = 68
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...GOLD)
  doc.text(audit.status === 'final' ? 'FINAL REPORT' : 'DRAFT REPORT', MARGIN, y)
  y += 6

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 9.5, cellPadding: 1.6, textColor: INK },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: NAVY, cellWidth: 48 },
      1: { cellWidth: CONTENT_W - 48 },
    },
    body: [
      ['Client / Company', audit.client_name || '—'],
      ['Department / Section', audit.department || '—'],
      ['Process Owner', audit.process_owner || '—'],
      ['Other Participants', audit.other_participants || '—'],
      ['Lead Auditor', audit.lead_auditor || '—'],
      ['Audit Team', audit.audit_team || '—'],
      ['Audit Type', audit.audit_type || '—'],
      ['Audit Dates', `${audit.start_date || '—'} to ${audit.end_date || '—'}`],
      ['Field Visit Area(s)', audit.field_visit_areas || '—'],
    ],
  })

  // ================= PAGE 2: SCOPE / METHODOLOGY / STATEMENTS =================
  doc.addPage()
  y = 20
  y = sectionHeader(doc, 'Audit Scope & Objectives', y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...INK)
  let lines = doc.splitTextToSize(audit.scope_text || defaultScopeText(standardInfo.label, standardInfo.system), CONTENT_W)
  doc.text(lines, MARGIN, y)
  y += lines.length * 4.3 + 6

  y = sectionHeader(doc, 'Methodology', y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  lines = doc.splitTextToSize(audit.methodology_narrative || DEFAULT_METHODOLOGY_NARRATIVE, CONTENT_W)
  doc.text(lines, MARGIN, y)
  y += lines.length * 4.3 + 6

  y = sectionHeader(doc, 'Sampling Disclaimer', y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  lines = doc.splitTextToSize(audit.sampling_disclaimer || DEFAULT_SAMPLING_DISCLAIMER, CONTENT_W)
  doc.text(lines, MARGIN, y)
  y += lines.length * 4.3 + 6

  y = sectionHeader(doc, 'Confidentiality & Objectivity', y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  lines = doc.splitTextToSize(audit.confidentiality_statement || DEFAULT_CONFIDENTIALITY_STATEMENT, CONTENT_W)
  doc.text(lines, MARGIN, y)
  y += lines.length * 4.3 + 6

  const excluded = Object.entries(scope || {}).filter(([, v]) => !v.inScope)
  if (excluded.length) {
    y = sectionHeader(doc, 'Clauses Excluded from Audit Scope', y)
    autoTable(doc, {
      startY: y,
      theme: 'grid',
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 22, fontStyle: 'bold' }, 1: { cellWidth: CONTENT_W - 22 } },
      head: [['Clause', 'Reason for Exclusion']],
      body: excluded.map(([code, v]) => [code, v.exclusionReason || 'No reason recorded']),
    })
    y = doc.lastAutoTable.finalY + 6
  }

  if (audit.discontinued) {
    doc.setDrawColor(...MAJOR_TXT)
    doc.setFillColor(...MAJOR)
    const boxH = 22
    doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 1.5, 1.5, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...MAJOR_TXT)
    doc.text('AUDIT DISCONTINUED', MARGIN + 3, y + 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...INK)
    const discLines = doc.splitTextToSize(audit.discontinuation_comment || 'No reason recorded.', CONTENT_W - 6)
    doc.text(discLines.slice(0, 3), MARGIN + 3, y + 11)
  }

  // ================= PAGE 3+: EXECUTIVE SUMMARY, VERIFICATION, NC FINDINGS =================
  doc.addPage()
  y = 20
  y = sectionHeader(doc, 'Executive Summary', y)

  const counts = { conform: 0, major: 0, minor: 0, nc: 0, ofi: 0, na: 0 }
  clauses.forEach((c) => {
    const s = checklist[c.clause_code]?.status
    if (s && counts[s] !== undefined) counts[s]++
  })
  const isSimpleScheme = clauses.some((c) => checklist[c.clause_code]?.status === 'nc')
  const summaryBody = isSimpleScheme
    ? [['Conforming', String(counts.conform)], ['Nonconforming', String(counts.nc)], ['OFI', String(counts.ofi)], ['N/A', String(counts.na)]]
    : [['Conforming', String(counts.conform)], ['Major NC', String(counts.major)], ['Minor NC', String(counts.minor)], ['OFI', String(counts.ofi)], ['N/A', String(counts.na)]]

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 9.5, cellPadding: 2.5, halign: 'center', fontStyle: 'bold' },
    body: [summaryBody.map((r) => r[0]), summaryBody.map((r) => r[1])],
  })
  y = doc.lastAutoTable.finalY + 8

  y = sectionHeader(doc, 'Process Verification Statement', y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...INK)
  lines = doc.splitTextToSize(PROCESS_VERIFICATION_STATEMENT, CONTENT_W)
  doc.text(lines, MARGIN, y)
  y += lines.length * 4.3 + 8

  y = sectionHeader(doc, 'Findings — Nonconformances', y)
  const allScopedClauses = clauses.filter((c) => scope?.[c.clause_code]?.inScope !== false)
  const ncRows = allScopedClauses.filter((c) => ['nc', 'minor', 'major'].includes(checklist[c.clause_code]?.status))

  if (!ncRows.length) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9.5)
    doc.setTextColor(...INK_SOFT)
    doc.text('No nonconformances were identified during this audit.', MARGIN, y)
    y += 8
  } else {
    const ncBody = ncRows.map((c) => {
      const entry = checklist[c.clause_code]
      const b = badgeInfo(entry.status)
      return [
        `${c.clause_code}\n${c.title}`,
        b.label,
        entry.evidenceText || 'No finding text entered.',
        entry.evidenceAvailable ? 'Available' : 'Not available',
        entry.status,
      ]
    })
    autoTable(doc, {
      startY: y,
      theme: 'grid',
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 8.5, cellPadding: 2, valign: 'top', overflow: 'linebreak' },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      columnStyles: {
        0: { cellWidth: 34, fontStyle: 'bold' },
        1: { cellWidth: 26 },
        2: { cellWidth: 88 },
        3: { cellWidth: 26 },
      },
      head: [['Clause', 'Classification', 'Nonconformance Statement', 'Evidence']],
      body: ncBody.map((r) => r.slice(0, 4)),
      didParseCell: (data) => {
        if (data.section === 'body') {
          const status = ncBody[data.row.index][4]
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

  // ================= NEW PAGE: FULL CLAUSE-BY-CLAUSE RESULTS =================
  doc.addPage()
  y = 20
  sectionHeader(doc, 'Clause-by-Clause Audit Results', y)
  y += 2

  const scopedClauses = clauses.filter((c) => scope?.[c.clause_code]?.inScope !== false)
  const tableBody = scopedClauses.map((c) => {
    const entry = checklist[c.clause_code] || {}
    const b = badgeInfo(entry.status || 'na')
    const evidenceAvail = entry.status && entry.status !== 'na'
      ? (entry.evidenceAvailable ? 'Available' : 'Not available')
      : '—'
    return [
      `${c.clause_code}\n${c.title}`,
      entry.status ? b.label : 'Not audited',
      entry.evidenceText || (entry.status ? 'No finding text entered.' : '—'),
      evidenceFileList(entry.thumbs),
      evidenceAvail,
      entry.status,
    ]
  })

  autoTable(doc, {
    startY: y + 5,
    theme: 'grid',
    margin: { left: MARGIN, right: MARGIN, bottom: 18 },
    styles: { fontSize: 8, cellPadding: 2, valign: 'top', overflow: 'linebreak' },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: 'bold' },
      1: { cellWidth: 22 },
      2: { cellWidth: 58 },
      3: { cellWidth: 38 },
      4: { cellWidth: 24 },
    },
    head: [['Clause', 'Classification', 'Finding / Evidence Narrative', 'Evidence Files', 'Evidence']],
    body: tableBody.map((r) => r.slice(0, 5)),
    didParseCell: (data) => {
      if (data.section === 'body') {
        const status = tableBody[data.row.index][5]
        const style = rowStyle(status)
        if (data.column.index === 1) {
          data.cell.styles.fillColor = style.fill
          data.cell.styles.textColor = style.text
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
  })

  // ================= FINAL PAGE: CONCLUSION & SIGN-OFF =================
  doc.addPage()
  y = 20
  y = sectionHeader(doc, 'Audit Conclusion', y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  lines = doc.splitTextToSize(conclusionText(audit.conclusion, standardInfo.system.replace('Management System', 'management system')), CONTENT_W)
  doc.text(lines, MARGIN, y)
  y += lines.length * 4.6 + 10

  y = sectionHeader(doc, 'Sign-off', y)

  const signRow = async (label, signoff) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...INK)
    doc.text(label, MARGIN, y)
    y += 5
    if (!signoff) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.setTextColor(...INK_SOFT)
      doc.text('Not signed', MARGIN, y)
      y += 10
      return
    }
    if (signoff.signature_image) {
      const dims = await loadImageDims(signoff.signature_image)
      if (dims) {
        const maxH = 16, maxW = 50
        let w = maxW, h = (dims.h / dims.w) * w
        if (h > maxH) { h = maxH; w = (dims.w / dims.h) * h }
        doc.addImage(signoff.signature_image, 'PNG', MARGIN, y, w, h)
        y += h + 2
      }
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...INK_SOFT)
    doc.text(
      `${signoff.signatory_name} — signed ${new Date(signoff.signed_at).toLocaleString()} — consent recorded — hash ${(signoff.content_hash || '').slice(0, 16)}...`,
      MARGIN, y
    )
    y += 10
  }

  await signRow('Lead Auditor', signoffs.lead_auditor)
  await signRow('Auditee Representative', signoffs.auditee_rep)

  await addPhotoAppendix(doc, allScopedClauses, checklist)

  footer(doc, standardInfo.label, reportBrandName || 'SentinelPro Consultants')
  const standardSlug = audit.standard.replace(/[^A-Za-z0-9]+/g, '')
  doc.save(`${(audit.client_name || 'audit').replace(/\s+/g, '_')}_${standardSlug}_Report_${audit.status === 'final' ? 'FINAL' : 'DRAFT'}.pdf`)
}
