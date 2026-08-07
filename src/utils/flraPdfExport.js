import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { SAFETY_CHECK_ITEMS } from '../data/flraContent'

const NAVY = [22, 37, 61]
const INK = [34, 38, 43]
const INK_SOFT = [91, 95, 102]
const LINE = [220, 214, 200]
const CONFORM = [230, 240, 234]
const CONFORM_TXT = [47, 110, 78]
const MAJOR = [248, 231, 227]
const MAJOR_TXT = [168, 58, 44]

const MARGIN = 14
const PAGE_W = 210
const PAGE_H = 297
const CONTENT_W = PAGE_W - MARGIN * 2

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

function footer(doc) {
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setDrawColor(...LINE)
    doc.line(MARGIN, PAGE_H - 14, PAGE_W - MARGIN, PAGE_H - 14)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...INK_SOFT)
    doc.text('Field Level Risk Assessment', MARGIN, PAGE_H - 9)
    doc.text(`Page ${i} of ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 9, { align: 'right' })
  }
}

export async function generateFLRAPdf({ meta, companyId, companies, hazardRows, safetyChecks, signoffs }) {
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
  doc.text('FIELD LEVEL RISK ASSESSMENT', MARGIN, 12)
  if (company?.name) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.text(company.name, MARGIN, 19)
  }

  let y = 33
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 34 }, 2: { fontStyle: 'bold', cellWidth: 34 } },
    body: [
      ['Employee Name', meta.employeeName || '—', 'Safety Topic', meta.safetyTopic || '—'],
      ['Department/Area', meta.departmentArea || '—', 'Employee ID', meta.employeeIdNumber || '—'],
      ['Mode', meta.mode === 'group' ? 'Group' : 'Individual', 'Date', new Date().toLocaleDateString()],
    ],
  })
  y = doc.lastAutoTable.finalY + 4

  if (meta.mode === 'group' && meta.crewMembers) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...INK)
    doc.text('Crew Members:', MARGIN, y)
    y += 4
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...INK_SOFT)
    const crewLines = doc.splitTextToSize(meta.crewMembers, CONTENT_W)
    doc.text(crewLines, MARGIN, y)
    y += crewLines.length * 4 + 4
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...INK)
  doc.text('Job/Task Description:', MARGIN, y)
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...INK_SOFT)
  const taskLines = doc.splitTextToSize(meta.jobTaskDescription || '—', CONTENT_W)
  doc.text(taskLines, MARGIN, y)
  y += taskLines.length * 4 + 4

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...INK)
  doc.text('Fatal Risk(s) Identified:', MARGIN, y)
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...INK_SOFT)
  doc.text((meta.fatalRisks || []).join(', ') || 'None selected', MARGIN, y)
  y += 8

  // Hazard / Control table
  const rows = (hazardRows || []).filter((r) => r.hazardText || r.controlText)
  if (rows.length) {
    autoTable(doc, {
      startY: y,
      theme: 'grid',
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 8.5, cellPadding: 2, valign: 'top', overflow: 'linebreak' },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: (CONTENT_W - 10) / 2 }, 2: { cellWidth: (CONTENT_W - 10) / 2 } },
      head: [['#', 'Hazard / What could go wrong?', 'Control / How did I control the hazard?']],
      body: rows.map((r, i) => [i + 1, r.hazardText || '—', r.controlText || '—']),
    })
    y = doc.lastAutoTable.finalY + 8
  }

  if (y > PAGE_H - 60) { doc.addPage(); y = 20 }

  // Safety Responsibility Checks
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...NAVY)
  doc.text('My Safety Responsibility Checks', MARGIN, y)
  y += 5

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 8.5, cellPadding: 2, valign: 'top', overflow: 'linebreak' },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: CONTENT_W - 26 }, 1: { cellWidth: 26, halign: 'center' } },
    head: [['Item', 'Response']],
    body: SAFETY_CHECK_ITEMS.map((item) => [item.text, (safetyChecks[item.key] || '—').toUpperCase()]),
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const val = data.cell.raw
        if (val === 'NO') { data.cell.styles.fillColor = MAJOR; data.cell.styles.textColor = MAJOR_TXT; data.cell.styles.fontStyle = 'bold' }
        if (val === 'YES') { data.cell.styles.fillColor = CONFORM; data.cell.styles.textColor = CONFORM_TXT; data.cell.styles.fontStyle = 'bold' }
      }
    },
  })
  y = doc.lastAutoTable.finalY + 4

  const hasNo = Object.values(safetyChecks).some((v) => v === 'no')
  if (hasNo) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...MAJOR_TXT)
    const warnLines = doc.splitTextToSize(
      'STOP! Contact your supervisor immediately - answered NO in one or more blocks. Do not continue until adequate controls have been put in place.',
      CONTENT_W
    )
    doc.text(warnLines, MARGIN, y)
    y += warnLines.length * 4 + 4
  }

  if (y > PAGE_H - 60) { doc.addPage(); y = 20 }

  // Sign-off
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...NAVY)
  doc.text('SIGN-OFF', MARGIN, y)
  y += 8

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

  await signRow('Employee', signoffs.employee)
  await signRow('Supervisor', signoffs.supervisor)

  footer(doc)
  doc.save(`FLRA_${(meta.employeeName || 'assessment').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`)
}
