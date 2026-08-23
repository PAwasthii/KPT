'use server'; // hint only — actual enforcement via route runtime export

import PDFDocument from 'pdfkit';

const KPT_AGREEMENT_TERMS = `
1. APPOINTMENT
The Company hereby appoints the Dealer as its non-exclusive authorised channel partner
for the distribution and sale of KPT products in the designated territory.

2. TERRITORY
The Dealer's territory is limited to the city and district specified in this agreement.
The Dealer shall not actively solicit customers outside the designated territory.

3. PRODUCTS
The Dealer is authorised to sell the KPT product lines specified herein.
The Company reserves the right to add or remove products from the authorised list.

4. OBLIGATIONS OF THE DEALER
a) Maintain minimum stock levels as communicated by the Company from time to time.
b) Provide pre-sales and after-sales support to customers.
c) Adhere to the Company's retail pricing guidelines and promotional policies.
d) Report monthly sales figures by the 5th of each month.
e) Maintain a dedicated display area for KPT products.

5. OBLIGATIONS OF THE COMPANY
a) Provide product training and technical support.
b) Supply products at agreed dealer prices.
c) Offer marketing collateral and promotional support.
d) Process warranty claims within 15 working days.

6. TERM AND TERMINATION
This agreement is valid for one (1) year from the date of signing and shall
automatically renew unless either party provides 30 days written notice of termination.
The Company may terminate immediately for breach of agreement, non-payment, or
misrepresentation of credentials.

7. CONFIDENTIALITY
The Dealer shall keep confidential all pricing, discount structures, and business
information shared by the Company and shall not disclose such information to
competitors or third parties.
`;

export interface AgreementPartnerData {
  crn: string;
  ownerName: string;
  firmName: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  productInterest: string[];
  gstin?: string;
}

export async function generateKptAgreement(partner: AgreementPartnerData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    // Header
    doc.fontSize(16).font('Helvetica-Bold').text('KPT INDUSTRIES LTD.', { align: 'center' });
    doc.fontSize(13).font('Helvetica').text('Authorised Channel Partner Agreement', { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fontSize(11).text(`This agreement is entered into on ${today} between:`);
    doc.moveDown(0.5);

    // KPT block
    doc.font('Helvetica-Bold').text('KPT Industries Ltd.');
    doc.font('Helvetica').text('GAT No. 320, Mouje Agar, Shirol-416103, Kolhapur, Maharashtra');
    doc.text('(hereinafter referred to as "the Company")');
    doc.moveDown(0.5);

    doc.text('AND');
    doc.moveDown(0.5);

    // Dealer block
    doc.font('Helvetica-Bold').text(partner.firmName);
    doc.font('Helvetica').text(`Represented by: ${partner.ownerName}`);
    doc.text(`${partner.city}, ${partner.district}, ${partner.state} - ${partner.pincode}`);
    if (partner.gstin) doc.text(`GSTIN: ${partner.gstin}`);
    doc.text(`Channel Reference Number (CRN): ${partner.crn}`);
    doc.text('(hereinafter referred to as "the Dealer")');
    doc.moveDown(0.5);

    doc.text(`Products Authorised: ${partner.productInterest.join(', ')}`);
    doc.text(`Territory: ${partner.city}, ${partner.district}`);
    doc.moveDown(0.5);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // Terms
    doc.font('Helvetica').fontSize(10).text(KPT_AGREEMENT_TERMS.trim());
    doc.moveDown(1);

    // Signature block
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);
    const sigY = doc.y;
    doc.text('Dealer Signature', 50, sigY, { width: 200 });
    doc.text('For KPT Industries Ltd.', 345, sigY, { width: 200 });
    doc.moveDown(0.5);
    doc.text(partner.ownerName, 50, doc.y, { width: 200 });
    doc.text('Authorised Signatory', 345, doc.y, { width: 200 });
    doc.moveDown(0.5);
    doc.text('Date: ______________________', 50, doc.y, { width: 200 });
    doc.text('Date: ______________________', 345, doc.y, { width: 200 });

    // Footer
    doc.fontSize(8).text(`CRN: ${partner.crn} | Confidential | Page 1 of 1`, 50, 780, { align: 'center' });

    doc.end();
  });
}
