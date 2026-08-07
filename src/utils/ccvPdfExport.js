import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

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

function footer(doc, template) {
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setDrawColor(...LINE)
    doc.line(MARGIN, PAGE_H - 14, PAGE_W - MARGIN, PAGE_H - 14)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...INK_SOFT)
    doc.text(`${template.document_reference} Rev ${template.revision_number} — ${template.name}`, MARGIN, PAGE_H - 9)
    doc.text(`Page ${i} of ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 9, { align: 'right' })
  }
}

async function addPhotoAppendix(doc, categories, responses) {
  const CELL_W = 42, CELL_H = 32, GAP = 4, PER_ROW = 4

  const groups = []
  categories.forEach((cat) => {
    cat.checklist_template_items.forEach((item) => {
      const r = responses[item.id]
      const photos = (r?.thumbs || []).filter((t) => t.kind === 'photo' && (t.dataUrl || t.remoteUrl))
      if (photos.length) groups.push({ item, categoryLabel: `${cat.category_number} ${cat.name}`, photos })
    })
  })
  if (!groups.length) return

  doc.addPage()
  let y = 20
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...NAVY)
  doc.text('Appendix — Photographic Evidence', MARGIN, y)
  doc.setDrawColor(184, 134, 43)
  doc.setLineWidth(0.6)
  doc.line(MARGIN, y + 1.5, MARGIN + 10, y + 1.5)
  doc.setLineWidth(0.2)
  y += 8
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8.5)
  doc.setTextColor(...INK_SOFT)
  doc.text('Photographs captured in-app during the verification, grouped by item.', MARGIN, y)
  y += 7

  for (const group of groups) {
    if (y + 12 + CELL_H > PAGE_H - 20) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...NAVY)
    doc.text(`${group.item.item_number} — ${group.categoryLabel}`, MARGIN, y)
    y += 4.5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...INK_SOFT)
    const reqLines = doc.splitTextToSize(group.item.requirement_text, CONTENT_W)
    doc.text(reqLines.slice(0, 2), MARGIN, y)
    y += Math.min(reqLines.length, 2) * 4 + 3

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
        } catch {
          drawn = false
        }
        if (!drawn) {
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(7)
          doc.setTextColor(...INK_SOFT)
          doc.text('Image unavailable', x + CELL_W / 2, y + CELL_H / 2, { align: 'center' })
        }
      }
      y += CELL_H + GAP
    }
    y += 4
  }
}

export async function generateCCVPdf({ template, categories, meta, responses, company, signoff }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // ================= HEADER =================
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, PAGE_W, 30, 'F')

  if (company?.logo_url) {
    const logoData = await toDataUrl(company.logo_url)
    if (logoData) {
      const dims = await loadImageDims(logoData)
      if (dims) {
        const maxH = 14, maxW = 34
        let w = maxW, h = (dims.h / dims.w) * w
        if (h > maxH) { h = maxH; w = (dims.w / dims.h) * h }
        doc.addImage(logoData, imageFormat(company.logo_url), PAGE_W - MARGIN - w, 8, w, h)
      }
    }
  }

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  const titleMaxWidth = company?.logo_url ? CONTENT_W - 40 : CONTENT_W - 4
  const titleLines = doc.splitTextToSize(template.name.toUpperCase(), titleMaxWidth)
  doc.text(titleLines, MARGIN, 12)
  if (company?.name) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.text(company.name, MARGIN, 12 + titleLines.length * 5.5 + 2)
  }

  let y = 36
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 8.5, cellPadding: 2, halign: 'center' },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
    head: [['Document Reference', 'Revision Number', 'Total Pages', 'Date of Issue', 'Date of Next Review']],
    body: [[
      template.document_reference || '—',
      template.revision_number || '—',
      template.total_pages || '—',
      template.date_of_issue || '—',
      template.date_of_next_review || '—',
    ]],
  })
  y = doc.lastAutoTable.finalY + 4

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 30 }, 2: { fontStyle: 'bold', cellWidth: 30 } },
    body: [
      ['Assessors', meta.assessors || '—', 'Date, Time', meta.dateTime ? new Date(meta.dateTime).toLocaleString() : '—'],
      ['Location', meta.location || '—', 'Department', meta.department || '—'],
      ['Section', meta.section || '—', '', ''],
    ],
  })
  y = doc.lastAutoTable.finalY + 8

  // ================= CATEGORIES =================
  const recommendations = []

  categories.forEach((cat) => {
    if (y > PAGE_H - 40) { doc.addPage(); y = 20 }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...NAVY)
    doc.text(`${cat.category_number} ${cat.name}`, MARGIN, y)
    y += 5

    const items = cat.checklist_template_items
    let yesCount = 0

    const body = items.map((item) => {
      const r = responses[item.id] || {}
      if (r.compliance === 'yes') yesCount++
      if (r.compliance === 'no') {
        recommendations.push({
          itemNumber: item.item_number,
          action: r.actionText || '(no action noted)',
          responsible: r.responsiblePerson || '—',
          dueDate: r.dueDate || '—',
        })
      }
      return [item.item_number, item.requirement_text, r.compliance === 'yes' ? 'Yes' : r.compliance === 'no' ? 'No' : '—', r.compliance]
    })

    autoTable(doc, {
      startY: y,
      theme: 'grid',
      margin: { left: MARGIN, right: MARGIN, bottom: 18 },
      styles: { fontSize: 8.5, cellPadding: 2, valign: 'top', overflow: 'linebreak' },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 14 }, 1: { cellWidth: CONTENT_W - 14 - 28 }, 2: { cellWidth: 28, halign: 'center' } },
      head: [['No.', 'Performance Requirement', 'Compliance']],
      body: body.map((r) => r.slice(0, 3)),
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          const compliance = body[data.row.index][3]
          if (compliance === 'yes') { data.cell.styles.fillColor = CONFORM; data.cell.styles.textColor = CONFORM_TXT; data.cell.styles.fontStyle = 'bold' }
          if (compliance === 'no') { data.cell.styles.fillColor = MAJOR; data.cell.styles.textColor = MAJOR_TXT; data.cell.styles.fontStyle = 'bold' }
        }
      },
    })
    y = doc.lastAutoTable.finalY + 3

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...INK)
    doc.text(`Summary score: ${yesCount} / ${items.length}`, MARGIN, y)
    y += 8
  })

  // ================= RECOMMENDATIONS =================
  if (y > PAGE_H - 50) { doc.addPage(); y = 20 }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...NAVY)
  doc.text('RECOMMENDATIONS', MARGIN, y)
  y += 6

  if (!recommendations.length) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9.5)
    doc.setTextColor(...INK_SOFT)
    doc.text('No non-compliant items were identified during this verification.', MARGIN, y)
    y += 8
  } else {
    autoTable(doc, {
      startY: y,
      theme: 'grid',
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 8.5, cellPadding: 2.5, valign: 'top' },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 90 }, 2: { cellWidth: 45 }, 3: { cellWidth: 30 } },
      head: [['No.', 'Action', 'Responsible Person', 'Due Date']],
      body: recommendations.map((r, i) => [i + 1, `[${r.itemNumber}] ${r.action}`, r.responsible, r.dueDate]),
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // ================= SIGN-OFF =================
  if (y > PAGE_H - 50) { doc.addPage(); y = 20 }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...NAVY)
  doc.text('SIGN-OFF', MARGIN, y)
  y += 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...INK)
  doc.text('Assessor', MARGIN, y)
  y += 5

  if (!signoff) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...INK_SOFT)
    doc.text('Not signed', MARGIN, y)
    y += 10
  } else {
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

  await addPhotoAppendix(doc, categories, responses)

  footer(doc, template)
  doc.save(`${template.document_reference || 'CCV'}_${(meta.location || 'report').replace(/\s+/g, '_')}.pdf`)
}
