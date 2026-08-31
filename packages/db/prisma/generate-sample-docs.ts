/**
 * Generates sample document files for KPT partner application testing.
 * Creates minimal valid PDFs and JPEGs in packages/db/prisma/sample-documents/
 *
 * Run: npx tsx packages/db/prisma/generate-sample-docs.ts
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'sample-documents');
mkdirSync(OUT_DIR, { recursive: true });

// Escape special PDF string characters
const esc = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

/**
 * Builds a minimal valid single-page PDF with the given title and content lines.
 * Uses Helvetica (built-in Type1 font), no external dependencies.
 */
function buildPdf(title: string, lines: string[]): Buffer {
  const streamLines = [
    'BT',
    '/F1 16 Tf',
    '72 750 Td',
    `(${esc(title)}) Tj`,
    '0 -26 Td',
    '/F1 11 Tf',
    `(KPT Partner Application — Sample Document) Tj`,
    '0 -16 Td',
    `(This file is generated for development / testing purposes only.) Tj`,
    '0 -24 Td',
    '/F1 12 Tf',
    ...lines.flatMap(l => [`(${esc(l)}) Tj`, '0 -18 Td']),
    'ET',
  ];
  const stream = streamLines.join('\n');

  // Build body incrementally so we can compute exact byte offsets
  let body = '';
  const offsets: number[] = [];
  const HEADER = '%PDF-1.4\n';

  function addObj(num: number, dict: string, streamContent?: string) {
    offsets.push(HEADER.length + body.length);
    if (streamContent !== undefined) {
      body += `${num} 0 obj\n${dict}\nstream\n${streamContent}\nendstream\nendobj\n`;
    } else {
      body += `${num} 0 obj\n${dict}\nendobj\n`;
    }
  }

  addObj(1, '<</Type /Catalog /Pages 2 0 R>>');
  addObj(2, '<</Type /Pages /Kids [3 0 R] /Count 1>>');
  addObj(3, [
    '<</Type /Page /Parent 2 0 R',
    '/MediaBox [0 0 612 792]',
    '/Contents 4 0 R',
    '/Resources <</Font <</F1 5 0 R>>>>>>',
  ].join(' '));
  addObj(4, `<</Length ${Buffer.byteLength(stream, 'ascii')}>>`, stream);
  addObj(5, '<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>');

  const xrefOffset = HEADER.length + body.length;

  // Each xref entry is exactly 20 bytes: 10-digit offset, space, 5-digit gen, space, keyword, \r\n
  let xrefSection = 'xref\n0 6\n';
  xrefSection += '0000000000 65535 f\r\n';
  for (const off of offsets) {
    xrefSection += `${String(off).padStart(10, '0')} 00000 n\r\n`;
  }
  xrefSection += `trailer\n<</Size 6 /Root 1 0 R>>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(HEADER + body + xrefSection, 'ascii');
}

/**
 * Minimal valid JPEG — 1×1 white pixel (166 bytes).
 * Suitable as a placeholder for cancelled_cheque.jpg and passport_photo.jpg.
 */
const MINIMAL_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkS' +
  'Ew8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAAB' +
  'AAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/' +
  'xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=',
  'base64'
);

const DOCS = [
  {
    file: 'gstin-certificate.pdf',
    title: 'GST Registration Certificate',
    lines: [
      'GSTIN: 27AADCB2230M1ZP',
      'Legal Name: Deshmukh Hardware & Power Tools',
      'Trade Name: Deshmukh Hardware & Power Tools',
      'State: Maharashtra  |  Registration Date: 01-Jul-2019',
      'Business Type: Regular Taxpayer',
      'Principal Place: Main Road, Kolhapur, MH - 416003',
    ],
    jpeg: false,
  },
  {
    file: 'pan-card.pdf',
    title: 'Permanent Account Number (PAN) Card',
    lines: [
      'PAN: AADCB2230M',
      'Name: VIKRAM RAMESH DESHMUKH',
      'Date of Birth: 15-Mar-1985',
      'Father\'s Name: RAMESH DESHMUKH',
      'Issued by: Income Tax Department, Government of India',
    ],
    jpeg: false,
  },
  {
    file: 'shop-establishment.pdf',
    title: 'Shop & Establishment Registration Certificate',
    lines: [
      'Registration No: MH/KLP/2020/SHE/04521',
      'Name of Establishment: Deshmukh Hardware & Power Tools',
      'Employer Name: Vikram Ramesh Deshmukh',
      'Address: Shop No. 7, Main Road, Kolhapur - 416003',
      'Category: Hardware & Tools Retail',
      'Valid From: 01-Apr-2020   Valid Until: 31-Mar-2027',
      'Issued by: Municipal Corporation, Kolhapur',
    ],
    jpeg: false,
  },
  {
    file: 'cancelled-cheque.jpg',
    title: 'Cancelled Cheque',
    lines: [],
    jpeg: true,
  },
  {
    file: 'address-proof.pdf',
    title: 'Address Proof — Electricity Bill',
    lines: [
      'Utility: Maharashtra State Electricity Distribution Co. Ltd.',
      'Consumer No: MH-KLP-045678',
      'Account Holder: Vikram Ramesh Deshmukh',
      'Service Address: Shop No. 7, Main Road, Kolhapur - 416003',
      'Bill Date: 01-Aug-2026   Due Date: 15-Aug-2026',
      'Units Consumed: 240 kWh   Amount Due: INR 1,680',
    ],
    jpeg: false,
  },
  {
    file: 'passport-photo.jpg',
    title: 'Passport Size Photograph',
    lines: [],
    jpeg: true,
  },
];

for (const doc of DOCS) {
  const outPath = join(OUT_DIR, doc.file);
  if (doc.jpeg) {
    writeFileSync(outPath, MINIMAL_JPEG);
  } else {
    writeFileSync(outPath, buildPdf(doc.title, doc.lines));
  }
  console.log(`  created  ${doc.file}`);
}

console.log(`\nAll ${DOCS.length} sample documents written to:\n  ${OUT_DIR}`);
console.log('\nUpload these files via http://localhost:3000/partner/documents');
