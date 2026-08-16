import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { riskBand, LIKELIHOOD_LEVELS, CONSEQUENCE_LEVELS, CONTROL_HIERARCHY } from '../data/jsaContent'

const NAVY = [22, 37, 61]
const NAVY2 = [44, 74, 107]
const GOLD = [184, 134, 43]
const INK = [34, 38, 43]
const INK_SOFT = [91, 95, 102]
const LINE = [220, 214, 200]
const CONFORM = [230, 240, 234]
const CONFORM_TXT = [47, 110, 78]
const CONFORM_FULL = [47, 110, 78]
const MINOR = [251, 240, 219]
const MINOR_TXT = [192, 138, 30]
const MINOR_FULL = [192, 138, 30]
const MAJOR = [248, 231, 227]
const MAJOR_TXT = [168, 58, 44]

const MARGIN = 14
const PAGE_W = 210
const PAGE_H = 297
const CONTENT_W = PAGE_W - MARGIN * 2

// Colored section header band - matches the accent colors used in the
// live JSA editor, so the PDF reads consistently with the app.
function sectionBand(doc, title, y, color) {
  doc.setFillColor(...color)
  doc.roundedRect(MARGIN, y, CONTENT_W, 8, 1, 1, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(255, 255, 255)
  doc.text(title, MARGIN + 3, y + 5.5)
  return y + 12
}

function bandColors(color) {
  if (color === 'major') return { fill: MAJOR, text: MAJOR_TXT }
  if (color === 'minor') return { fill: MINOR, text: MINOR_TXT }
  return { fill: CONFORM, text: CONFORM_TXT }
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
  } catch { return null }
}
function imageFormat(src) {
  const s = src.toLowerCase()
  if (s.includes('png')) return 'PNG'
  if (s.includes('webp')) return 'WEBP'
  return 'JPEG'
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
    doc.text('Job Safety Analysis', MARGIN, PAGE_H - 9)
    doc.text(`Page ${i} of ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 9, { align: 'right' })
  }
}

export async function generateJSAPdf({ meta, companyId, companies, steps, signoffs, dailyReviews }) {
  const company = companies?.find((c) => c.id === companyId)
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  doc.setFillColor(...NAVY)
  doc.rect(0, 0, PAGE_W, 26, 'F')
  if (company?.logo_url) {
    const logoData = await toDataUrl(company.logo_url)
    if (logoData) {
      const dims = await loadImageDims(logoData)
      if (dims) {
        const maxH = 12, maxW = 32
        let w = maxW, h = (dims.h / dims.w) * w
        if (h > maxH) { h = maxH; w = (dims.w / dims.h) * h }
        doc.addImage(logoData, imageFormat(company.logo_url), PAGE_W - MARGIN - w, 7, w, h)
      }
    }
  }
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('JOB SAFETY ANALYSIS', MARGIN, 12)
  if (company?.name) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.text(company.name, MARGIN, 19)
  }

  let y = 33
  autoTable(doc, {
    startY: y, theme: 'grid', margin: { left: MARGIN, right: MARGIN }, styles: { fontSize: 8.5, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 32 }, 2: { fontStyle: 'bold', cellWidth: 32 } },
    body: [
      ['JSA No.', meta.jsaNo || '—', 'Work Order No.', meta.workOrderNo || '—'],
      ['Job/Task', meta.jobTask || '—', 'Date', meta.jsaDate || '—'],
      ['Plant/Area', meta.plantArea || '—', 'Location', meta.location || '—'],
      ['Senior Supervisor', meta.seniorSupervisorName || '—', 'Work Group Supervisor', meta.workGroupSupervisorName || '—'],
      ['Valid From', meta.validFrom || '—', 'Valid Until', meta.validUntil || '—'],
    ],
  })
  y = doc.lastAutoTable.finalY + 4

  const summaryRows = [
    ['Permits Required', (meta.permitsRequired || []).join(', ')],
    ['Additional PPE', meta.additionalPpe],
    ['Special Tools/Equipment', meta.specialTools],
    ['Fatal Risks', (meta.fatalRisks || []).join(', ')],
    ['Hazardous Materials', meta.hazardousMaterials],
    ['Fire/Emergency Equipment', meta.fireEmergencyEquipment],
    ['Supporting Documents', (meta.supportingDocuments || []).join(', ')],
    ['Potential Hazards', (meta.potentialHazards || []).join(', ')],
    ['Can become Safe Work Procedure', meta.canBecomeSop ? meta.canBecomeSop.toUpperCase() : ''],
  ].filter((r) => r[1])

  if (summaryRows.length) {
    autoTable(doc, {
      startY: y, theme: 'grid', margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 8, cellPadding: 2, valign: 'top', overflow: 'linebreak' },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 42, textColor: INK }, 1: { cellWidth: CONTENT_W - 42, textColor: INK_SOFT } },
      body: summaryRows,
    })
    y = doc.lastAutoTable.finalY + 6
  }

  // Job Safety Analysis Log
  if (y > PAGE_H - 40) { doc.addPage(); y = 20 }
  y = sectionBand(doc, 'JOB SAFETY ANALYSIS LOG', y, GOLD)

  const likelihoodLabel = (v) => LIKELIHOOD_LEVELS.find((l) => l.value === v)?.label || '—'
  const consequenceLabel = (v) => CONSEQUENCE_LEVELS.find((c) => c.value === v)?.label || '—'
  const hierarchyLabel = (k) => CONTROL_HIERARCHY.find((h) => h.key === k)?.label || '—'

  const rows = (steps || []).filter((s) => s.jobStep || s.jobStepHazard || s.currentControls)
  const bodyData = rows.map((s, i) => {
    const raw = s.likelihood && s.consequence ? s.likelihood * s.consequence : null
    const residual = s.residualLikelihood && s.residualConsequence ? s.residualLikelihood * s.residualConsequence : null
    return [
      i + 1,
      s.jobStep || '—',
      s.jobStepHazard || '—',
      `${s.currentControls || '—'}\n[${hierarchyLabel(s.controlHierarchy)}]`,
      raw ? `${raw} - ${riskBand(raw).label}\n(${likelihoodLabel(s.likelihood)} x ${consequenceLabel(s.consequence)})` : '—',
      s.requiredAdditionalActions || '—',
      residual ? `${residual} - ${riskBand(residual).label}\n(${likelihoodLabel(s.residualLikelihood)} x ${consequenceLabel(s.residualConsequence)})` : '—',
      raw ? riskBand(raw).color : null,
      residual ? riskBand(residual).color : null,
    ]
  })

  autoTable(doc, {
    startY: y, theme: 'grid', margin: { left: MARGIN, right: MARGIN, bottom: 18 },
    styles: { fontSize: 7, cellPadding: 1.5, valign: 'top', overflow: 'linebreak' },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 7 },
    columnStyles: { 0: { cellWidth: 6 }, 1: { cellWidth: 24 }, 2: { cellWidth: 24 }, 3: { cellWidth: 28 }, 4: { cellWidth: 22 }, 5: { cellWidth: 24 }, 6: { cellWidth: 22 } },
    head: [['#', 'Job Step', 'Hazard', 'Current Controls', 'Raw Risk', 'Additional Actions', 'Residual Risk']],
    body: bodyData.map((r) => r.slice(0, 7)),
    didParseCell: (data) => {
      if (data.section === 'body') {
        const rowColor = data.column.index === 4 ? bodyData[data.row.index][7] : data.column.index === 6 ? bodyData[data.row.index][8] : null
        if (rowColor) {
          const c = bandColors(rowColor)
          data.cell.styles.fillColor = c.fill
          data.cell.styles.textColor = c.text
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
  })
  y = doc.lastAutoTable.finalY + 8

  // Team Member Acknowledgement
  if (y > PAGE_H - 50) { doc.addPage(); y = 20 }
  y = sectionBand(doc, 'TEAM MEMBER ACKNOWLEDGEMENT', y, CONFORM_FULL)

  const teamSignoffs = (signoffs || []).filter((s) => s.role === 'team_member')
  if (!teamSignoffs.length) {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(...INK_SOFT)
    doc.text('No team member signatures recorded.', MARGIN, y); y += 8
  } else {
    autoTable(doc, {
      startY: y, theme: 'grid', margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
      head: [['Name', 'Employee ID', 'Signed At']],
      body: teamSignoffs.map((s) => [s.signatory_name, s.employee_id_no || '—', new Date(s.signed_at).toLocaleString()]),
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // Supervisor Acknowledgements
  if (y > PAGE_H - 50) { doc.addPage(); y = 20 }
  y = sectionBand(doc, 'SUPERVISOR ACKNOWLEDGEMENT', y, NAVY2)

  const signRow = async (label, signoff) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...INK)
    doc.text(label, MARGIN, y); y += 5
    if (!signoff) {
      doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(...INK_SOFT)
      doc.text('Not signed', MARGIN, y); y += 10; return
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
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...INK_SOFT)
    doc.text(`${signoff.signatory_name}${signoff.employee_id_no ? ` (${signoff.employee_id_no})` : ''} — signed ${new Date(signoff.signed_at).toLocaleString()} — consent recorded`, MARGIN, y)
    y += 10
  }
  await signRow('Senior Supervisor', (signoffs || []).find((s) => s.role === 'senior_supervisor'))
  await signRow('Work Group Supervisor', (signoffs || []).find((s) => s.role === 'work_group_supervisor'))

  // Daily reviews, if any
  if (dailyReviews && dailyReviews.length) {
    if (y > PAGE_H - 50) { doc.addPage(); y = 20 }
    y = sectionBand(doc, 'DAILY REVIEW (MULTI-SHIFT USE)', y, MINOR_FULL)
    autoTable(doc, {
      startY: y, theme: 'grid', margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
      head: [['Date', 'Name', 'Employee ID', 'Signed At']],
      body: dailyReviews.map((r) => [r.review_date, r.signatory_name, r.employee_id_no || '—', new Date(r.signed_at).toLocaleString()]),
    })
    y = doc.lastAutoTable.finalY + 8
  }

  footer(doc)
  doc.save(`JSA_${(meta.jsaNo || 'analysis').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`)
}
