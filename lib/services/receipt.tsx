import { storage, STORAGE_KEYS } from './storage'
import type { Receipt, Payment } from '../types'
import { generateId } from '../utils'
import { tenantService } from './tenant'
import { studentService } from './student'

export const receiptService = {
  generateReceiptNumber(tenantId: string): string {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const randomNum = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')
    return `RCP-${year}${month}${day}-${randomNum}`
  },

  async createReceipt(
    tenantId: string,
    paymentId: string,
    payment: Payment,
    studentName: string,
    studentId: string,
    className: string,
    amount: number
  ): Promise<Receipt> {
    const tenant = await tenantService.getById(tenantId)
    if (!tenant) throw new Error('Tenant not found')

    const receiptNumber = this.generateReceiptNumber(tenantId)

    const receipt: Receipt = {
      id: generateId(),
      tenantId,
      receiptNumber,
      paymentId,
      studentName,
      studentId,
      className,
      amount,
      paymentMethod: payment.paymentMethod,
      reference: payment.reference,
      receivedBy: payment.receivedBy,
      receivedByName: payment.receivedByName,
      schoolName: tenant.name,
      schoolLogo: tenant.logo,
      schoolAddress: tenant.contactInfo?.address
        ? `${tenant.contactInfo.address.street}, ${tenant.contactInfo.address.city}, ${tenant.contactInfo.address.state} ${tenant.contactInfo.address.postalCode}`
        : undefined,
      schoolEmail: tenant.contactInfo?.email,
      schoolPhone: tenant.contactInfo?.phone,
      issuedDate: new Date().toISOString(),
    }

    const receipts = storage.get<Receipt[]>(STORAGE_KEYS.RECEIPTS) || []
    receipts.push(receipt)
    storage.set(STORAGE_KEYS.RECEIPTS, receipts)

    return receipt
  },

  async getReceiptById(receiptId: string): Promise<Receipt | null> {
    const receipts = storage.get<Receipt[]>(STORAGE_KEYS.RECEIPTS) || []
    return receipts.find(r => r.id === receiptId) || null
  },

  async getReceiptByNumber(receiptNumber: string): Promise<Receipt | null> {
    const receipts = storage.get<Receipt[]>(STORAGE_KEYS.RECEIPTS) || []
    return receipts.find(r => r.receiptNumber === receiptNumber) || null
  },

  async getReceiptsByPayment(paymentId: string): Promise<Receipt[]> {
    const receipts = storage.get<Receipt[]>(STORAGE_KEYS.RECEIPTS) || []
    return receipts.filter(r => r.paymentId === paymentId)
  },

  async getReceiptsByStudent(tenantId: string, studentId: string): Promise<Receipt[]> {
    const receipts = storage.get<Receipt[]>(STORAGE_KEYS.RECEIPTS) || []
    return receipts
      .filter(r => r.tenantId === tenantId && r.studentId === studentId)
      .sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime())
  },

  async getReceiptsByDateRange(
    tenantId: string,
    startDate: string,
    endDate: string
  ): Promise<Receipt[]> {
    const receipts = storage.get<Receipt[]>(STORAGE_KEYS.RECEIPTS) || []
    const start = new Date(startDate).getTime()
    const end = new Date(endDate).getTime()

    return receipts
      .filter(r => {
        const receiptDate = new Date(r.issuedDate).getTime()
        return r.tenantId === tenantId && receiptDate >= start && receiptDate <= end
      })
      .sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime())
  },

  getAllReceiptsByTenant(tenantId: string): Receipt[] {
    const receipts = storage.get<Receipt[]>(STORAGE_KEYS.RECEIPTS) || []
    return receipts
      .filter(r => r.tenantId === tenantId)
      .sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime())
  },

  async getReceiptHTML(receipt: Receipt): Promise<string> {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
        .receipt-container { 
            max-width: 600px; 
            margin: auto; 
            background: white; 
            padding: 40px; 
            border: 1px solid #ddd;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #333; padding-bottom: 20px; }
        .logo { width: 80px; height: auto; margin-bottom: 10px; }
        .school-name { font-size: 24px; font-weight: bold; margin: 10px 0; }
        .school-contact { font-size: 12px; color: #666; line-height: 1.6; }
        .receipt-title { 
            font-size: 28px; 
            font-weight: bold; 
            margin: 20px 0; 
            text-align: center;
            color: #333;
        }
        .receipt-number { text-align: center; font-size: 12px; color: #999; margin-bottom: 20px; }
        .details-section { margin: 25px 0; }
        .detail-row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
        .detail-label { font-weight: bold; color: #333; }
        .detail-value { color: #666; }
        .student-info { background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .amount-section { 
            background: #f0f0f0; 
            padding: 20px; 
            border-radius: 5px; 
            margin: 20px 0; 
            text-align: right;
        }
        .total-amount { 
            font-size: 24px; 
            font-weight: bold; 
            color: #2c3e50; 
            margin-top: 10px;
        }
        .payment-method { font-size: 12px; margin-top: 10px; color: #666; }
        .footer { 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 1px solid #ddd; 
            font-size: 11px; 
            color: #999;
            text-align: center;
        }
        .stamp-area { margin-top: 30px; text-align: right; }
        .received-by { margin-top: 20px; text-align: right; font-size: 12px; }
        .print-date { font-size: 11px; color: #999; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="receipt-container">
        <div class="header">
            ${receipt.schoolLogo ? `<img src="${receipt.schoolLogo}" alt="School Logo" class="logo">` : ''}
            <div class="school-name">${receipt.schoolName}</div>
            <div class="school-contact">
                ${receipt.schoolAddress ? `<div>${receipt.schoolAddress}</div>` : ''}
                ${receipt.schoolEmail ? `<div>Email: ${receipt.schoolEmail}</div>` : ''}
                ${receipt.schoolPhone ? `<div>Phone: ${receipt.schoolPhone}</div>` : ''}
            </div>
        </div>

        <div class="receipt-title">FEE RECEIPT</div>
        <div class="receipt-number">Receipt No: <strong>${receipt.receiptNumber}</strong> | Date: <strong>${new Date(receipt.issuedDate).toLocaleDateString()}</strong></div>

        <div class="student-info">
            <div class="detail-row">
                <span class="detail-label">Student Name:</span>
                <span class="detail-value">${receipt.studentName}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Class:</span>
                <span class="detail-value">${receipt.className}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Received By:</span>
                <span class="detail-value">${receipt.receivedByName}</span>
            </div>
        </div>

        <div class="details-section">
            <div class="detail-row">
                <span class="detail-label">Payment Method:</span>
                <span class="detail-value">${receipt.paymentMethod.toUpperCase()}</span>
            </div>
            ${receipt.reference ? `
            <div class="detail-row">
                <span class="detail-label">Reference/Cheque #:</span>
                <span class="detail-value">${receipt.reference}</span>
            </div>
            ` : ''}
        </div>

        <div class="amount-section">
            <div class="detail-row">
                <span class="detail-label">Amount Received:</span>
                <span class="total-amount">₹ ${receipt.amount.toFixed(2)}</span>
            </div>
            <div class="payment-method">For Fee Payment</div>
        </div>

        <div class="received-by">
            Received By: ________________________<br>
            ${receipt.receivedByName}<br>
            <span class="print-date">Date: ${new Date(receipt.issuedDate).toLocaleDateString()}</span>
        </div>

        <div class="footer">
            <p>This is a computer-generated receipt and is valid without signature.</p>
            <p>Thank you for your payment!</p>
        </div>
    </div>
</body>
</html>
    `
  },
}
