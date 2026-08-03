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

export function generateCCVPdf({ template, categories, meta, responses }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // ================= HEADER =================
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, PAGE_W, 30, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  const titleLines = doc.splitTextToSize(template.name.toUpperCase(), CONTENT_W - 4)
  doc.text(titleLines, MARGIN, 12)

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
  }

  footer(doc, template)
  doc.save(`${template.document_reference || 'CCV'}_${(meta.location || 'report').replace(/\s+/g, '_')}.pdf`)
}
