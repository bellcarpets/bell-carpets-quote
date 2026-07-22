const mysql = require('mysql2/promise');
const fs = require('fs');

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Get existing quote numbers in new DB
  const [existing] = await conn.execute('SELECT quoteNumber FROM quotes');
  const existingNums = new Set(existing.map(r => r.quoteNumber));
  console.log('Existing quotes in new DB:', existingNums.size, [...existingNums].sort().join(', '));

  // Load old data
  const oldQuotesRaw = JSON.parse(fs.readFileSync('/home/ubuntu/old_quotes_full.json'));
  const oldQuotes = oldQuotesRaw.result?.data?.json || [];
  
  const oldInvoicesRaw = JSON.parse(fs.readFileSync('/home/ubuntu/old_invoices_full.json'));
  const oldInvoices = oldInvoicesRaw.result?.data?.json || [];
  
  const oldContactsRaw = JSON.parse(fs.readFileSync('/home/ubuntu/old_contacts_full.json'));
  const oldContacts = oldContactsRaw.result?.data?.json || [];

  // Find new quotes not in new DB
  const newQuotes = oldQuotes.filter(q => !existingNums.has(q.quoteNumber));
  console.log(`New quotes to import: ${newQuotes.length}`, newQuotes.map(q => q.quoteNumber).join(', '));

  // Get existing contacts in new DB
  const [existingContacts] = await conn.execute('SELECT email FROM contacts');
  const existingEmails = new Set(existingContacts.map(r => r.email?.toLowerCase()).filter(Boolean));

  // Get existing invoices in new DB
  const [existingInvoices] = await conn.execute('SELECT invoiceNumber FROM invoices');
  const existingInvNums = new Set(existingInvoices.map(r => r.invoiceNumber));

  let quotesImported = 0, invoicesImported = 0, contactsImported = 0;

  // Import new quotes
  for (const q of newQuotes) {
    const configJson = q.configJson ? (typeof q.configJson === 'string' ? q.configJson : JSON.stringify(q.configJson)) : '{}';
    await conn.execute(`
      INSERT INTO quotes (
        quoteNumber, slug, quoteType, configJson, jobStatus, acceptedTier, acceptedColour,
        acceptedTotal, acceptedAgentName, acceptedAgentEmail, acceptedAgentPhone,
        acceptedAt, acceptedNotes, expiresAt, agentName, agentEmail, agentPhone,
        quoteLinkEmailSent, reminderSentAt, reminderSmsSentAt, scheduledDate, completedAt,
        agentPropertyManager, isInsuranceAssessment, linkedQuoteSlug, internalNotes,
        depositPaidAmount, discountAmount, acceptanceEmailSent, depositPaidNotificationSent,
        scheduledNotificationSent, completedNotificationSent, paymentTermsDays,
        followUpSentAt, expiryReminderSmsSentAt, reviewStatus, reviewRequestedAt,
        reviewReceivedAt, isTest, deletedAt, createdAt, updatedAt
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      q.quoteNumber, q.slug || q.quoteNumber?.toLowerCase().replace('bc-', 'bc-'),
      q.quoteType || 'real_estate', configJson, q.jobStatus || 'draft',
      q.acceptedTier || null, q.acceptedColour || null,
      q.acceptedTotal || null, q.acceptedAgentName || null, q.acceptedAgentEmail || null, q.acceptedAgentPhone || null,
      q.acceptedAt ? new Date(q.acceptedAt) : null, q.acceptedNotes || null,
      q.expiresAt ? new Date(q.expiresAt) : null,
      q.agentName || null, q.agentEmail || null, q.agentPhone || null,
      q.quoteLinkEmailSent ? 1 : 0, q.reminderSentAt ? new Date(q.reminderSentAt) : null,
      q.reminderSmsSentAt ? new Date(q.reminderSmsSentAt) : null,
      q.scheduledDate ? new Date(q.scheduledDate) : null,
      q.completedAt ? new Date(q.completedAt) : null,
      q.agentPropertyManager || null, q.isInsuranceAssessment ? 1 : 0,
      q.linkedQuoteSlug || null, q.internalNotes || null,
      q.depositPaidAmount ?? 0, q.discountAmount ?? 0,
      q.acceptanceEmailSent ? 1 : 0, q.depositPaidNotificationSent ? 1 : 0,
      q.scheduledNotificationSent ? 1 : 0, q.completedNotificationSent ? 1 : 0,
      q.paymentTermsDays || 14,
      q.followUpSentAt ? new Date(q.followUpSentAt) : null,
      q.expiryReminderSmsSentAt ? new Date(q.expiryReminderSmsSentAt) : null,
      q.reviewStatus || null, q.reviewRequestedAt ? new Date(q.reviewRequestedAt) : null,
      q.reviewReceivedAt ? new Date(q.reviewReceivedAt) : null,
      q.isTest ? 1 : 0, q.deletedAt ? new Date(q.deletedAt) : null,
      q.createdAt ? new Date(q.createdAt) : new Date(),
      q.updatedAt ? new Date(q.updatedAt) : new Date()
    ]);
    quotesImported++;
    console.log(`Imported quote: ${q.quoteNumber}`);
  }

  // Import new invoices
  const newInvoiceQuoteNums = new Set(newQuotes.map(q => q.quoteNumber));
  for (const inv of oldInvoices) {
    if (existingInvNums.has(inv.invoiceNumber)) continue;
    // Only import invoices for new quotes OR invoices missing from new DB entirely
    const lineItemsJson = inv.lineItemsJson ? (typeof inv.lineItemsJson === 'string' ? inv.lineItemsJson : JSON.stringify(inv.lineItemsJson)) : '[]';
    await conn.execute(`
      INSERT INTO invoices (
        invoiceNumber, quoteSlug, quoteNumber, quoteType, recipientName, recipientEmail,
        recipientPhone, propertyAddress, lineItemsJson, subtotal, gst, totalAmount,
        depositAmount, paymentStatus, pdfUrl, pdfKey, emailSent, emailSentAt, notes,
        paymentTermsDays, paidInFullNotificationSent, overdueReminderSentAt,
        overdueReminderSmsSentAt, createdAt, updatedAt
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      inv.invoiceNumber, inv.quoteSlug || null, inv.quoteNumber || null,
      inv.quoteType || null, inv.recipientName || null, inv.recipientEmail || null,
      inv.recipientPhone || null, inv.propertyAddress || null,
      lineItemsJson, inv.subtotal || 0, inv.gst || 0, inv.totalAmount || 0,
      inv.depositAmount || null, inv.paymentStatus || 'unpaid',
      inv.pdfUrl || null, inv.pdfKey || null,
      inv.emailSent ? 1 : 0, inv.emailSentAt ? new Date(inv.emailSentAt) : null,
      inv.notes || null, inv.paymentTermsDays || 14,
      inv.paidInFullNotificationSent ? 1 : 0,
      inv.overdueReminderSentAt ? new Date(inv.overdueReminderSentAt) : null,
      inv.overdueReminderSmsSentAt ? new Date(inv.overdueReminderSmsSentAt) : null,
      inv.createdAt ? new Date(inv.createdAt) : new Date(),
      inv.updatedAt ? new Date(inv.updatedAt) : new Date()
    ]);
    invoicesImported++;
    console.log(`Imported invoice: ${inv.invoiceNumber}`);
  }

  // Import new contacts
  for (const c of oldContacts) {
    const email = c.email?.toLowerCase();
    if (email && existingEmails.has(email)) continue;
    await conn.execute(`
      INSERT INTO contacts (name, email, phone, agency, role, createdAt, updatedAt)
      VALUES (?,?,?,?,?,?,?)
    `, [
      c.name || null, c.email || null, c.phone || null,
      c.agency || c.agencyName || null, c.role || null,
      c.createdAt ? new Date(c.createdAt) : new Date(),
      c.updatedAt ? new Date(c.updatedAt) : new Date()
    ]);
    contactsImported++;
    console.log(`Imported contact: ${c.name} (${c.email})`);
  }

  console.log(`\n=== IMPORT COMPLETE ===`);
  console.log(`Quotes imported: ${quotesImported}`);
  console.log(`Invoices imported: ${invoicesImported}`);
  console.log(`Contacts imported: ${contactsImported}`);

  // Final count
  const [finalQuotes] = await conn.execute('SELECT COUNT(*) as cnt FROM quotes');
  const [finalInvoices] = await conn.execute('SELECT COUNT(*) as cnt FROM invoices');
  const [finalContacts] = await conn.execute('SELECT COUNT(*) as cnt FROM contacts');
  console.log(`\nNew DB totals: ${finalQuotes[0].cnt} quotes, ${finalInvoices[0].cnt} invoices, ${finalContacts[0].cnt} contacts`);

  await conn.end();
}

run().catch(console.error);
