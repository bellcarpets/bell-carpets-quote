// Invoice import script — imports missing invoices from old system
'use strict';
require('dotenv').config();
const mysql = require('./node_modules/.pnpm/mysql2@3.15.1/node_modules/mysql2/promise');
const fs = require('fs');

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // Load old invoices
  const raw = JSON.parse(fs.readFileSync('/home/ubuntu/old_invoices_v2.json', 'utf8'));
  const oldInvoices = raw.result?.data?.json || [];
  console.log('Old system invoices:', oldInvoices.length);

  // Get existing invoice quote numbers in new DB
  const [existing] = await conn.execute('SELECT quoteNumber FROM invoices');
  const existingNums = new Set(existing.map(r => r.quoteNumber));
  console.log('Existing invoices in new DB:', existingNums.size, [...existingNums].sort().join(', '));

  // Find missing invoices
  const missing = oldInvoices.filter(inv => !existingNums.has(inv.quoteNumber));
  console.log('Missing invoices to import:', missing.length);
  missing.forEach(i => console.log(' ', i.quoteNumber, i.invoiceNumber, i.paymentStatus));

  let imported = 0;
  for (const inv of missing) {
    await conn.execute(`
      INSERT INTO invoices (
        invoiceNumber, quoteSlug, quoteNumber, quoteType,
        recipientName, recipientEmail, recipientPhone, propertyAddress,
        lineItemsJson, subtotal, gst, totalAmount, depositAmount,
        paymentStatus, pdfUrl, pdfKey, emailSent, emailSentAt,
        notes, paymentTermsDays, paidInFullNotificationSent,
        overdueReminderSentAt, overdueReminderSmsSentAt,
        createdAt, updatedAt,
        xeroInvoiceId, xeroContactId, xeroSyncedAt, xeroSyncError
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      inv.invoiceNumber,
      inv.quoteSlug || inv.quoteNumber?.toLowerCase().replace('bc-', 'bc-'),
      inv.quoteNumber,
      inv.quoteType || 'real_estate',
      inv.recipientName || null,
      inv.recipientEmail || null,
      inv.recipientPhone || null,
      inv.propertyAddress || null,
      inv.lineItemsJson || '[]',
      inv.subtotal ?? 0,
      inv.gst ?? 0,
      inv.totalAmount ?? 0,
      inv.depositAmount ?? 0,
      inv.paymentStatus || 'unpaid',
      inv.pdfUrl || null,
      inv.pdfKey || null,
      inv.emailSent ? 1 : 0,
      inv.emailSentAt ? new Date(inv.emailSentAt) : null,
      inv.notes || null,
      inv.paymentTermsDays ?? 30,
      inv.paidInFullNotificationSent ? 1 : 0,
      inv.overdueReminderSentAt ? new Date(inv.overdueReminderSentAt) : null,
      inv.overdueReminderSmsSentAt ? new Date(inv.overdueReminderSmsSentAt) : null,
      inv.createdAt ? new Date(inv.createdAt) : new Date(),
      inv.updatedAt ? new Date(inv.updatedAt) : new Date(),
      inv.xeroInvoiceId || null,
      inv.xeroContactId || null,
      inv.xeroSyncedAt ? new Date(inv.xeroSyncedAt) : null,
      inv.xeroSyncError || null,
    ]);
    console.log('Imported invoice:', inv.invoiceNumber, 'for', inv.quoteNumber);
    imported++;
  }

  const [totals] = await conn.execute('SELECT COUNT(*) as cnt FROM invoices');
  console.log('\n=== IMPORT COMPLETE ===');
  console.log('Invoices imported:', imported);
  console.log('New DB total invoices:', totals[0].cnt);

  await conn.end();
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
