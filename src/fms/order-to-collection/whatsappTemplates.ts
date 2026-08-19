/**
 * WhatsApp Message Templates for Order-to-Collection (O2C) FMS
 * Company: Ketan Aditya Textiles LLP
 */

export interface O2CMessageData {
  customerName?: string;
  orderNumber?: string;
  totalQuantity?: number | string;
  dispatchedQuantity?: number | string;
  dispatchPercent?: number | string;
  billNumber?: string;
  billAmount?: number | string;
  leadTimeDays?: number | string;
  actualDays?: number | string;
  dueDate?: string;
  lrNumber?: string;
  transportName?: string;
  agentName?: string;
  productCategory?: string;
}

export const whatsappTemplates = {
  // Step 2: Order Confirmation
  orderConfirmation: (data: O2CMessageData) => 
    `Dear ${data.customerName || 'Customer'},\n\n` +
    `🙏 Greetings from Ketan Aditya Textiles LLP!\n\n` +
    `Your order has been successfully booked.\n` +
    `📋 *Order No:* ${data.orderNumber || ''}\n` +
    `📦 *Total Quantity:* ${data.totalQuantity || 0} Pcs\n` +
    `⏱️ *Committed Lead Time:* ${data.leadTimeDays || ''} Days\n` +
    (data.transportName ? `🚚 *Transport:* ${data.transportName}\n` : '') +
    `\nWe will keep you updated as your order is prepared and dispatched.\n` +
    `Thank you for your business!`,

  // Step 5: 25% Dispatch Update
  dispatch25: (data: O2CMessageData) =>
    `Dear ${data.customerName || 'Customer'},\n\n` +
    `📦 *Order Dispatch Update (25% Milestone)*\n` +
    `Order No: ${data.orderNumber || ''}\n` +
    `Dispatched: ${data.dispatchedQuantity || 0} / ${data.totalQuantity || 0} Pcs (${data.dispatchPercent || 25}%)\n` +
    (data.billNumber ? `📄 Bill No: ${data.billNumber}\n` : '') +
    (data.transportName ? `🚚 Transport: ${data.transportName}\n` : '') +
    (data.lrNumber ? `📑 LR / Bilty No: ${data.lrNumber}\n` : '') +
    `\nThank you! — Ketan Aditya Textiles LLP`,

  // Step 6: 50% Dispatch Update
  dispatch50: (data: O2CMessageData) =>
    `Dear ${data.customerName || 'Customer'},\n\n` +
    `📦 *Order Dispatch Update (50% Milestone)*\n` +
    `Order No: ${data.orderNumber || ''}\n` +
    `Dispatched: ${data.dispatchedQuantity || 0} / ${data.totalQuantity || 0} Pcs (${data.dispatchPercent || 50}%)\n` +
    (data.billNumber ? `📄 Bill No: ${data.billNumber}\n` : '') +
    (data.transportName ? `🚚 Transport: ${data.transportName}\n` : '') +
    (data.lrNumber ? `📑 LR / Bilty No: ${data.lrNumber}\n` : '') +
    `\nThank you! — Ketan Aditya Textiles LLP`,

  // Step 7: 70% Dispatch Update
  dispatch70: (data: O2CMessageData) =>
    `Dear ${data.customerName || 'Customer'},\n\n` +
    `📦 *Order Dispatch Update (70% Milestone)*\n` +
    `Order No: ${data.orderNumber || ''}\n` +
    `Dispatched: ${data.dispatchedQuantity || 0} / ${data.totalQuantity || 0} Pcs (${data.dispatchPercent || 70}%)\n` +
    (data.billNumber ? `📄 Bill No: ${data.billNumber}\n` : '') +
    (data.transportName ? `🚚 Transport: ${data.transportName}\n` : '') +
    (data.lrNumber ? `📑 LR / Bilty No: ${data.lrNumber}\n` : '') +
    `\nThank you! — Ketan Aditya Textiles LLP`,

  // Step 9: Order Completion Report
  completionReport: (data: O2CMessageData) =>
    `Dear ${data.customerName || 'Customer'},\n\n` +
    `🎉 *Order Completed!*\n` +
    `Order No: ${data.orderNumber || ''}\n` +
    `Total Ordered: ${data.totalQuantity || 0} Pcs\n` +
    `Total Dispatched: ${data.dispatchedQuantity || 0} Pcs\n` +
    `Promised Lead Time: ${data.leadTimeDays || ''} Days\n` +
    (data.actualDays ? `Actual Completion: ${data.actualDays} Days\n` : '') +
    `\nThank you for choosing Ketan Aditya Textiles LLP! 🙏`,

  // Step 11: Quality Approval Thank You + Payment Notice
  qualityThankYou: (data: O2CMessageData) =>
    `Dear ${data.customerName || 'Customer'},\n\n` +
    `🙏 Thank you for approving the quality of goods for Order *${data.orderNumber || ''}*.\n\n` +
    (data.billAmount ? `💵 *Total Bill Amount:* ₹${Number(data.billAmount).toLocaleString('en-IN')}\n` : '') +
    `📅 *Payment Due Date:* ${data.dueDate || 'As per payment terms'}\n\n` +
    `Kindly process the payment on or before the due date.\n` +
    `Thank you! — Ketan Aditya Textiles LLP`,

  // Step 12: Pre-Due Reminder (e.g. 7 days before due date)
  preDueReminder: (data: O2CMessageData) =>
    `Dear ${data.customerName || 'Customer'},\n\n` +
    `⏰ *Payment Reminder*\n` +
    `This is a gentle reminder that payment for Order *${data.orderNumber || ''}* ` +
    (data.billAmount ? `(₹${Number(data.billAmount).toLocaleString('en-IN')}) ` : '') +
    `is due in a few days on *${data.dueDate || ''}*.\n\n` +
    `Please arrange to release the payment on time.\n` +
    `Thank you! — Ketan Aditya Textiles LLP`,

  // Step 13: D-Day Message (Payment Due Today)
  dDayMessage: (data: O2CMessageData) =>
    `Dear ${data.customerName || 'Customer'},\n\n` +
    `🔔 *Payment Due Today*\n` +
    `Payment for Order *${data.orderNumber || ''}* ` +
    (data.billAmount ? `(₹${Number(data.billAmount).toLocaleString('en-IN')}) ` : '') +
    `is due today (${data.dueDate || 'Today'}).\n\n` +
    `Kindly share the transaction UTR / receipt once transferred.\n` +
    `Thank you! — Ketan Aditya Textiles LLP`,

  // Step 14: Follow-up 1 (Overdue)
  followUp1: (data: O2CMessageData) =>
    `Dear ${data.customerName || 'Customer'},\n\n` +
    `⚠️ *Payment Follow-up*\n` +
    `Payment for Order *${data.orderNumber || ''}* ` +
    (data.billAmount ? `(₹${Number(data.billAmount).toLocaleString('en-IN')}) ` : '') +
    `was due on ${data.dueDate || ''}.\n\n` +
    `We request you to kindly check and release the payment at the earliest.\n` +
    `Thank you! — Ketan Aditya Textiles LLP`,

  // Step 15: Follow-up 2
  followUp2: (data: O2CMessageData) =>
    `Dear ${data.customerName || 'Customer'},\n\n` +
    `⚠️ *2nd Payment Follow-up*\n` +
    `Kindly note that payment for Order *${data.orderNumber || ''}* is overdue.\n` +
    `Please expedite the clearance so we can ensure seamless processing of your future orders.\n\n` +
    `Thank you! — Ketan Aditya Textiles LLP`,

  // Step 16: Follow-up 3 (Urgent Escalation)
  followUp3: (data: O2CMessageData) =>
    `Dear ${data.customerName || 'Customer'},\n\n` +
    `🚨 *Urgent: Outstanding Payment Reminder*\n` +
    `Despite multiple reminders, payment for Order *${data.orderNumber || ''}* remains outstanding.\n` +
    `Kindly clear this immediately or connect with our accounts team.\n\n` +
    `Ketan Aditya Textiles LLP`,

  // Step 18: Full Payment Receipt Thank You
  paymentReceipt: (data: O2CMessageData) =>
    `Dear ${data.customerName || 'Customer'},\n\n` +
    `🎉 *Payment Received with Thanks!*\n\n` +
    `We have received full payment for Order *${data.orderNumber || ''}*.\n` +
    `Thank you so much for your partnership and prompt payment!\n\n` +
    `Do let us know if you have any fresh requirements. We look forward to serving you again! 🙏\n` +
    `— Ketan Aditya Textiles LLP`
};

export function generateWhatsAppUrl(phone: string, text: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('91') && cleanPhone.length === 12 
    ? cleanPhone 
    : cleanPhone.length === 10 
      ? `91${cleanPhone}` 
      : cleanPhone;
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${formattedPhone}?text=${encodedText}`;
}
