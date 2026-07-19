import { money } from '@/lib/currency'
import type { ReceiptPrintData } from '@/lib/services/fee'

export function buildReceiptHTML(data: ReceiptPrintData): string {
  const lines = data.lines.map(l =>
    `<tr><td style="padding:4px 8px">${l.componentName}</td><td style="padding:4px 8px;text-align:right">${money(l.amount)}</td></tr>`
  ).join('')

  return `<!DOCTYPE html><html><head><style>@media print { body { border: none !important; margin: 0 auto !important; } }</style></head><body style="font-family:sans-serif;max-width:480px;margin:40px auto;padding:24px;border:1px solid #ddd;border-radius:8px">
    <div style="text-align:center;margin-bottom:24px;border-bottom:1px solid #eee;padding-bottom:16px">
      <h2 style="margin:0">${data.tenant.name}</h2>
      ${data.tenant.address ? `<p style="margin:4px 0;font-size:13px">${data.tenant.address}</p>` : ''}
      ${data.tenant.phone ? `<p style="margin:4px 0;font-size:13px">${data.tenant.phone}</p>` : ''}
      ${data.tenant.email ? `<p style="margin:4px 0;font-size:13px">${data.tenant.email}</p>` : ''}
    </div>
    <h3 style="text-align:center;letter-spacing:2px">FEE RECEIPT</h3>
    <p style="text-align:center;color:#666;font-size:13px">Receipt No: ${data.receiptNo}</p>
    <table style="width:100%;margin:16px 0;background:#f9f9f9;border-radius:4px">
      <tr><td style="padding:4px 8px;font-weight:bold">Student</td><td style="padding:4px 8px">${data.student.fullName}</td></tr>
      <tr><td style="padding:4px 8px;font-weight:bold">Code</td><td style="padding:4px 8px">${data.student.userCode}</td></tr>
      ${data.student.className ? `<tr><td style="padding:4px 8px;font-weight:bold">Class</td><td style="padding:4px 8px">${data.student.className}</td></tr>` : ''}
      <tr><td style="padding:4px 8px;font-weight:bold">Invoice</td><td style="padding:4px 8px">${data.invoice.invoiceNo}</td></tr>
      <tr><td style="padding:4px 8px;font-weight:bold">Due Date</td><td style="padding:4px 8px">${data.invoice.dueDate}</td></tr>
    </table>
    ${lines ? `<table style="width:100%;margin:16px 0"><thead><tr style="border-bottom:1px solid #eee"><th style="text-align:left;padding:4px 8px">Component</th><th style="text-align:right;padding:4px 8px">Amount</th></tr></thead><tbody>${lines}</tbody></table>` : ''}
    <table style="width:100%;margin:16px 0;background:#e8f4fd;border-radius:4px">
      <tr><td style="padding:4px 8px;font-weight:bold">Payment Method</td><td style="padding:4px 8px">${data.payment.method}</td></tr>
      ${data.payment.referenceNo ? `<tr><td style="padding:4px 8px;font-weight:bold">Reference</td><td style="padding:4px 8px">${data.payment.referenceNo}</td></tr>` : ''}
      <tr><td style="padding:4px 8px;font-weight:bold">Payment Date</td><td style="padding:4px 8px">${data.payment.paymentDate}</td></tr>
      <tr style="border-top:2px solid #ccc"><td style="padding:8px;font-size:18px;font-weight:bold">Amount Paid</td><td style="padding:8px;font-size:18px;font-weight:bold;text-align:right">${money(data.payment.amount)}</td></tr>
    </table>
    <p style="text-align:center;font-size:11px;color:#999;margin-top:24px">Computer-generated receipt • Valid without signature<br>Issued: ${data.issuedAt}</p>
  </body></html>`
}

// Renders the receipt HTML in a hidden iframe and opens the browser's print
// dialog — no popup-blocker issues, page itself never navigates.
export function printReceipt(data: ReceiptPrintData) {
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow?.document
  if (!doc) { document.body.removeChild(iframe); return }
  doc.open()
  doc.write(buildReceiptHTML(data))
  doc.close()
  iframe.onload = () => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    // Give the print dialog time to grab the document before cleanup.
    setTimeout(() => document.body.removeChild(iframe), 60_000)
  }
}

export function downloadReceipt(data: ReceiptPrintData) {
  const html = buildReceiptHTML(data)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Receipt_${data.receiptNo}.html`
  a.click()
  URL.revokeObjectURL(url)
}
