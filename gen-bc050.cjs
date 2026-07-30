const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// BC-050 data from live API
const quote = {
  quoteNumber: "BC-050",
  quoteType: "agency_single",
  issueDate: "17 June 2026",
  validDays: 10,
  client: { name: "Coastal Property Agents", type: "Real Estate Agency" },
  property: { address: "704/30 Garrick Street, Coolangatta" },
  agent: { name: "Kate Gordon", email: "kate.gordon@coastal.com.au", phone: "0432673405" },
  scope: "Supply and Installation of new carpets to master bedroom only. We were able to get either an exact or similar match.",
  scopeOfWorks: [
    { title: "Removal & Disposal", description: "Removal and disposal of existing floor coverings" },
    { title: "Preparation", description: "Sub-floor inspection and smooth-edge check" },
    { title: "Installation", description: "Professional installation compliant with Australian Standards (AS/NZS 2455.1)" },
    { title: "Site Clean", description: "Vacuum on completion, scraps and packaging removed" }
  ],
  product: {
    productName: "Carramar",
    manufacturer: "Godfrey Hirst",
    fibre: "Wool",
    pileType: "Textured Loop Pile",
    colourName: "Dove Grey",
    price: 1900
  },
  customerNotes: "Bedroom 2 had stains also present when we did the measure, just for reference.",
  terms: ["Full payment due upon practical completion"],
  expiresAt: "27 June 2026"
};

const FONT_DIR = path.join(__dirname, 'server/fonts');
const FONT_REGULAR = path.join(FONT_DIR, 'EBGaramond-Variable.ttf');
const FONT_ITALIC = path.join(FONT_DIR, 'EBGaramond-Italic-Variable.ttf');
const LOGO_PATH = path.join(FONT_DIR, 'logo.jpg');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 0, left: 55, right: 55 },
  bufferPages: false,
  info: {
    Title: `Bell Carpets Quote ${quote.quoteNumber}`,
    Author: 'Bell Carpets',
  }
});

const output = fs.createWriteStream('/tmp/Bell-Carpets-Quote-BC-050-FINAL.pdf');
doc.pipe(output);

const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - 110;
let y = 50;

// --- HEADER ---
// Logo
if (fs.existsSync(LOGO_PATH)) {
  doc.image(LOGO_PATH, 55, y, { width: 140 });
}

// Quote number top right
doc.font(FONT_REGULAR).fontSize(10).fillColor('#666666');
doc.text(quote.quoteNumber, 400, y + 10, { width: 140, align: 'right' });
doc.text(quote.issueDate, 400, y + 24, { width: 140, align: 'right' });

y += 80;

// Divider
doc.moveTo(55, y).lineTo(PAGE_WIDTH - 55, y).strokeColor('#000000').lineWidth(0.5).stroke();
y += 25;

// --- CLIENT & PROPERTY ---
doc.font(FONT_REGULAR).fontSize(9).fillColor('#999999');
doc.text('PREPARED FOR', 55, y);
doc.text('PROPERTY', 320, y);
y += 14;

doc.font(FONT_REGULAR).fontSize(12).fillColor('#000000');
doc.text(quote.client.name, 55, y);
doc.text(quote.property.address, 320, y, { width: 220 });
y += 16;

doc.font(FONT_ITALIC).fontSize(10).fillColor('#555555');
doc.text(`Att: ${quote.agent.name}`, 55, y);
y += 30;

// --- PRODUCT ---
doc.font(FONT_REGULAR).fontSize(9).fillColor('#999999');
doc.text('PRODUCT', 55, y);
y += 14;

doc.font(FONT_REGULAR).fontSize(14).fillColor('#000000');
doc.text(`${quote.product.manufacturer} ${quote.product.productName}`, 55, y);
y += 20;

doc.font(FONT_REGULAR).fontSize(10).fillColor('#444444');
doc.text(`${quote.product.fibre} · ${quote.product.pileType} · ${quote.product.colourName}`, 55, y);
y += 35;

// --- PRICE ---
doc.moveTo(55, y).lineTo(PAGE_WIDTH - 55, y).strokeColor('#CCCCCC').lineWidth(0.3).stroke();
y += 20;

doc.font(FONT_REGULAR).fontSize(9).fillColor('#999999');
doc.text('TOTAL (INC GST)', 55, y);
y += 14;

doc.font(FONT_REGULAR).fontSize(28).fillColor('#000000');
doc.text(`$${quote.product.price.toLocaleString()}`, 55, y);
y += 40;

// Tax note
doc.font(FONT_ITALIC).fontSize(8).fillColor('#888888');
doc.text('All prices include GST. ABN 74 613 299 773', 55, y);
y += 25;

// --- SCOPE OF WORKS ---
doc.moveTo(55, y).lineTo(PAGE_WIDTH - 55, y).strokeColor('#CCCCCC').lineWidth(0.3).stroke();
y += 20;

doc.font(FONT_REGULAR).fontSize(9).fillColor('#999999');
doc.text('SCOPE OF WORKS', 55, y);
y += 18;

doc.font(FONT_REGULAR).fontSize(10).fillColor('#000000');
doc.text(quote.scope, 55, y, { width: CONTENT_WIDTH });
y += doc.heightOfString(quote.scope, { width: CONTENT_WIDTH }) + 15;

for (const item of quote.scopeOfWorks) {
  doc.font(FONT_REGULAR).fontSize(10).fillColor('#000000');
  doc.text(`•  ${item.title}`, 55, y, { width: CONTENT_WIDTH });
  y += 14;
  doc.font(FONT_ITALIC).fontSize(9).fillColor('#666666');
  doc.text(`   ${item.description}`, 65, y, { width: CONTENT_WIDTH - 10 });
  y += 16;
}

y += 10;

// --- CUSTOMER NOTES ---
if (quote.customerNotes) {
  doc.font(FONT_REGULAR).fontSize(9).fillColor('#999999');
  doc.text('NOTES', 55, y);
  y += 14;
  doc.font(FONT_ITALIC).fontSize(10).fillColor('#444444');
  doc.text(quote.customerNotes, 55, y, { width: CONTENT_WIDTH });
  y += doc.heightOfString(quote.customerNotes, { width: CONTENT_WIDTH }) + 20;
}

// --- VALIDITY ---
doc.font(FONT_REGULAR).fontSize(9).fillColor('#999999');
doc.text('VALID UNTIL', 55, y);
y += 14;
doc.font(FONT_REGULAR).fontSize(10).fillColor('#000000');
doc.text(quote.expiresAt, 55, y);
y += 30;

// --- BANKING ---
doc.moveTo(55, y).lineTo(PAGE_WIDTH - 55, y).strokeColor('#CCCCCC').lineWidth(0.3).stroke();
y += 20;

doc.font(FONT_REGULAR).fontSize(9).fillColor('#999999');
doc.text('PAYMENT', 55, y);
y += 14;

doc.font(FONT_REGULAR).fontSize(10).fillColor('#000000');
doc.text('Bell Spec Pty Ltd', 55, y);
y += 14;
doc.text('BSB: 124-022  |  Account: 2249 6442', 55, y);
y += 14;
doc.font(FONT_ITALIC).fontSize(9).fillColor('#666666');
doc.text('Reference: BC-050', 55, y);
y += 14;
doc.text('Full payment due upon practical completion', 55, y);
y += 30;

// --- FOOTER ---
doc.font(FONT_REGULAR).fontSize(8).fillColor('#AAAAAA');
doc.text('Bell Carpets  |  Gold Coast  |  hello@bellcarpets.com.au', 55, 800, { width: CONTENT_WIDTH, align: 'center' });

// --- PAGE 2: T&C ---
doc.addPage();
y = 50;

doc.font(FONT_REGULAR).fontSize(9).fillColor('#999999');
doc.text('TERMS & CONDITIONS', 55, y);
y += 20;

const tcSections = [
  { title: 'Acceptance', body: 'This quote is valid for 10 days from the issue date. Acceptance may be communicated verbally, in writing, or by selecting "Accept Quote" on the digital quote page.' },
  { title: 'Scheduling', body: 'Once accepted, works will be scheduled at a mutually agreed time. Bell Carpets will confirm the installation date in writing.' },
  { title: 'Access', body: 'The property must be accessible on the scheduled date. If access cannot be provided, 48 hours notice is required to reschedule without penalty.' },
  { title: 'Payment', body: 'Full payment is due upon practical completion unless otherwise agreed in writing. Payment may be made by bank transfer or card.' },
  { title: 'Warranty', body: 'All installations carry a 12-month workmanship warranty. Manufacturer product warranties apply as per their published terms.' },
  { title: 'Variations', body: 'Any variations to the quoted scope must be agreed in writing prior to commencement. Additional charges may apply.' },
  { title: 'Cancellation', body: 'If cancelled after acceptance, any materials ordered specifically for this job may be charged at cost.' },
  { title: 'Liability', body: 'Bell Carpets holds public liability insurance. We are not liable for pre-existing subfloor defects not visible at time of measure.' },
  { title: 'Furniture', body: 'This quote does not include furniture removal unless explicitly stated in the scope of works. The property should be cleared prior to installation.' },
];

for (const section of tcSections) {
  if (y > 740) {
    doc.addPage();
    y = 50;
  }
  doc.font(FONT_REGULAR).fontSize(10).fillColor('#000000');
  doc.text(section.title, 55, y, { width: CONTENT_WIDTH });
  y += 14;
  doc.font(FONT_ITALIC).fontSize(9).fillColor('#555555');
  doc.text(section.body, 55, y, { width: CONTENT_WIDTH });
  y += doc.heightOfString(section.body, { width: CONTENT_WIDTH, fontSize: 9 }) + 18;
}

// Footer on T&C page
doc.font(FONT_REGULAR).fontSize(8).fillColor('#AAAAAA');
doc.text('Bell Carpets  |  Gold Coast  |  hello@bellcarpets.com.au', 55, 800, { width: CONTENT_WIDTH, align: 'center' });

doc.end();

output.on('finish', () => {
  console.log('PDF generated: /tmp/Bell-Carpets-Quote-BC-050-FINAL.pdf');
});
