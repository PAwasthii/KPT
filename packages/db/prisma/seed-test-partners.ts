/**
 * Seed three additional test KPT partner applications at different pipeline stages:
 *   KPT-CP-2026-00101  Stage 3 — Documents (3 of 6 uploaded, 3 pending)
 *   KPT-CP-2026-00102  Stage 4 — Pending Approval (all 6 docs uploaded & verified)
 *   KPT-CP-2026-00103  Stage 5 — Agreement unsigned, no signing request sent by admin
 *
 * Run: npx tsx packages/db/prisma/seed-test-partners.ts
 */
import { PrismaClient } from '@prisma/client';
// @ts-ignore — dotenv loaded by the prisma:seed script via dotenv-cli

const prisma = new PrismaClient();

const PARTNERS = [
  {
    crn: 'KPT-CP-2026-00101',
    mobile: '9876540001',
    ownerName: 'Priya Ramesh Naik',
    firmName: 'Priya Hardware & Electricals',
    email: 'priya.naik.kpttest@example.com',
    city: 'Sangli', district: 'Sangli', state: 'Maharashtra', pincode: '416416',
    shopSizeSqft: 320,
    existingBrands: 'Stanley, Taparia',
    yearsInBusiness: 4,
    turnoverRange: '10L - 25L',
    productInterest: ['Power Tools', 'Hand Tools'],
    currentStage: 3,
    status: 'field_verified',
    label: 'Stage 3 — Documents (partial)',
  },
  {
    crn: 'KPT-CP-2026-00102',
    mobile: '9876540002',
    ownerName: 'Mahesh Dattatray Kulkarni',
    firmName: 'Mahesh Industrial Supplies',
    email: 'mahesh.kulkarni.kpttest@example.com',
    city: 'Pune', district: 'Pune', state: 'Maharashtra', pincode: '411001',
    shopSizeSqft: 650,
    existingBrands: 'Bosch, Makita, DeWalt',
    yearsInBusiness: 12,
    turnoverRange: '50L - 1Cr',
    productInterest: ['Power Tools', 'Blowers', 'E-Vehicles', 'Accessories'],
    currentStage: 4,
    status: 'under_review',
    label: 'Stage 4 — Pending Approval',
  },
  {
    crn: 'KPT-CP-2026-00103',
    mobile: '9876540003',
    ownerName: 'Ravi Shankar Joshi',
    firmName: 'Ravi Power Equipment',
    email: 'ravi.joshi.kpttest@example.com',
    city: 'Nashik', district: 'Nashik', state: 'Maharashtra', pincode: '422001',
    shopSizeSqft: 540,
    existingBrands: 'Bosch, Hitachi',
    yearsInBusiness: 7,
    turnoverRange: '25L - 50L',
    productInterest: ['Power Tools', 'Blowers'],
    currentStage: 5,
    status: 'approved',
    label: 'Stage 5 — Agreement unsigned (no signing request sent)',
  },
] as const;

const ALL_DOCS = [
  { docType: 'gstin',              fileName: 'gstin-certificate.pdf' },
  { docType: 'pan',                fileName: 'pan-card.pdf' },
  { docType: 'shop_establishment', fileName: 'shop-establishment.pdf' },
  { docType: 'cancelled_cheque',   fileName: 'cancelled-cheque.jpg' },
  { docType: 'address_proof',      fileName: 'address-proof.pdf' },
  { docType: 'passport_photo',     fileName: 'passport-photo.jpg' },
] as const;

async function cleanPartner(crn: string) {
  await prisma.kptAgreement.deleteMany({ where: { crn } });
  await prisma.kptApprovalLog.deleteMany({ where: { crn } });
  await prisma.kptStatusHistory.deleteMany({ where: { crn } });
  await prisma.kptDocument.deleteMany({ where: { crn } });
  await prisma.kptFieldVerification.deleteMany({ where: { crn } });
  await prisma.kptPartner.deleteMany({ where: { crn } });
}

async function seedPartner101() {
  const p = PARTNERS[0];
  await cleanPartner(p.crn);
  await prisma.kptOtp.deleteMany({ where: { mobile: p.mobile } });

  await prisma.kptPartner.create({
    data: {
      crn: p.crn, ownerName: p.ownerName, firmName: p.firmName,
      mobile: p.mobile, email: p.email,
      city: p.city, district: p.district, state: p.state, pincode: p.pincode,
      shopSizeSqft: p.shopSizeSqft, existingBrands: p.existingBrands,
      yearsInBusiness: p.yearsInBusiness, turnoverRange: p.turnoverRange,
      productInterest: [...p.productInterest],
      currentStage: p.currentStage, status: p.status,
    },
  });

  await prisma.kptFieldVerification.create({
    data: {
      crn: p.crn,
      assignedExecName: 'Nitin Patil',
      shopDimensions: '20ft × 16ft',
      roadVisibility: 'Moderate',
      locationScore: 'Medium',
      existingLines: 'Stanley, Taparia',
      marketPotential: 'Medium',
      nearestDealer: 'Om Hardware, 2.1 km',
      execNotes: 'Small but well-organised shop. Good potential for hand tools segment.',
      geoLat: 16.8524, geoLng: 74.5815,
      scheduledDate: new Date('2026-08-18T10:00:00Z'),
      visitedAt: new Date('2026-08-18T11:00:00Z'),
      verifiedAt: new Date('2026-08-18T11:45:00Z'),
    },
  });

  // Only 3 of 6 documents uploaded
  for (const doc of ALL_DOCS.slice(0, 3)) {
    await prisma.kptDocument.create({
      data: {
        crn: p.crn, stage: 3,
        docType: doc.docType, fileName: doc.fileName,
        storagePath: `partner-docs/${p.crn}/stage3/${doc.docType}/${doc.fileName}`,
        verifyStatus: 'verified',
        verifiedAt: new Date('2026-08-22T09:00:00Z'),
      },
    });
  }

  await prisma.kptStatusHistory.create({ data: { crn: p.crn, fromStatus: 'enquiry_received', toStatus: 'field_verification', note: 'Field exec assigned' } });
  await prisma.kptStatusHistory.create({ data: { crn: p.crn, fromStatus: 'field_verification', toStatus: 'field_verified', note: 'Field verification completed' } });
}

async function seedPartner102() {
  const p = PARTNERS[1];
  await cleanPartner(p.crn);
  await prisma.kptOtp.deleteMany({ where: { mobile: p.mobile } });

  await prisma.kptPartner.create({
    data: {
      crn: p.crn, ownerName: p.ownerName, firmName: p.firmName,
      mobile: p.mobile, email: p.email,
      city: p.city, district: p.district, state: p.state, pincode: p.pincode,
      shopSizeSqft: p.shopSizeSqft, existingBrands: p.existingBrands,
      yearsInBusiness: p.yearsInBusiness, turnoverRange: p.turnoverRange,
      productInterest: [...p.productInterest],
      currentStage: p.currentStage, status: p.status,
    },
  });

  await prisma.kptFieldVerification.create({
    data: {
      crn: p.crn,
      assignedExecName: 'Suhas Deshpande',
      shopDimensions: '50ft × 26ft',
      roadVisibility: 'Excellent',
      locationScore: 'High',
      existingLines: 'Bosch, Makita, DeWalt',
      marketPotential: 'High',
      nearestDealer: 'Pune Tools Centre, 4.5 km',
      execNotes: 'Large established shop with strong brand presence. Highly recommended.',
      geoLat: 18.5204, geoLng: 73.8567,
      scheduledDate: new Date('2026-08-12T09:00:00Z'),
      visitedAt: new Date('2026-08-12T10:00:00Z'),
      verifiedAt: new Date('2026-08-12T10:30:00Z'),
    },
  });

  // All 6 documents uploaded and verified
  for (const doc of ALL_DOCS) {
    await prisma.kptDocument.create({
      data: {
        crn: p.crn, stage: 3,
        docType: doc.docType, fileName: doc.fileName,
        storagePath: `partner-docs/${p.crn}/stage3/${doc.docType}/${doc.fileName}`,
        verifyStatus: 'verified',
        verifiedAt: new Date('2026-08-16T09:00:00Z'),
      },
    });
  }

  await prisma.kptStatusHistory.create({ data: { crn: p.crn, fromStatus: 'enquiry_received', toStatus: 'field_verification', note: 'Field exec assigned' } });
  await prisma.kptStatusHistory.create({ data: { crn: p.crn, fromStatus: 'field_verification', toStatus: 'field_verified', note: 'Field verification completed' } });
  await prisma.kptStatusHistory.create({ data: { crn: p.crn, fromStatus: 'field_verified', toStatus: 'under_review', note: 'All 6 documents submitted by partner' } });

  await prisma.kptApprovalLog.create({ data: { crn: p.crn, action: 'docs_submitted', doneBy: 'system', doneByName: 'System', notes: 'Partner uploaded all 6 documents. Pending admin review.' } });
}

async function seedPartner103() {
  const p = PARTNERS[2];
  await cleanPartner(p.crn);
  await prisma.kptOtp.deleteMany({ where: { mobile: p.mobile } });

  await prisma.kptPartner.create({
    data: {
      crn: p.crn, ownerName: p.ownerName, firmName: p.firmName,
      mobile: p.mobile, email: p.email,
      city: p.city, district: p.district, state: p.state, pincode: p.pincode,
      shopSizeSqft: p.shopSizeSqft, existingBrands: p.existingBrands,
      yearsInBusiness: p.yearsInBusiness, turnoverRange: p.turnoverRange,
      productInterest: [...p.productInterest],
      currentStage: p.currentStage, status: p.status,
    },
  });

  await prisma.kptFieldVerification.create({
    data: {
      crn: p.crn,
      assignedExecName: 'Amit Shirke',
      shopDimensions: '36ft × 24ft',
      roadVisibility: 'Good',
      locationScore: 'High',
      existingLines: 'Bosch, Hitachi',
      marketPotential: 'High',
      nearestDealer: 'Nashik Power Tools, 6 km',
      execNotes: 'Prominent shop on Nashik-Pune highway. Strong sales history.',
      geoLat: 19.9975, geoLng: 73.7898,
      scheduledDate: new Date('2026-08-05T10:00:00Z'),
      visitedAt: new Date('2026-08-05T11:00:00Z'),
      verifiedAt: new Date('2026-08-05T11:30:00Z'),
    },
  });

  // All 6 documents uploaded and verified
  for (const doc of ALL_DOCS) {
    await prisma.kptDocument.create({
      data: {
        crn: p.crn, stage: 3,
        docType: doc.docType, fileName: doc.fileName,
        storagePath: `partner-docs/${p.crn}/stage3/${doc.docType}/${doc.fileName}`,
        verifyStatus: 'verified',
        verifiedAt: new Date('2026-08-09T09:00:00Z'),
      },
    });
  }

  // Agreement record — generated but admin has NOT sent it for signing (no signingUrl)
  await prisma.kptAgreement.create({
    data: {
      crn: p.crn,
      agreementPath: `agreements/${p.crn}/dealer-agreement.pdf`,
      esignRef: `MOCK-ESIGN-${p.crn}-0`,
      signStatus: 'pending',
      // signingUrl intentionally null — admin hasn't triggered "Send for Signing" yet
    },
  });

  await prisma.kptStatusHistory.create({ data: { crn: p.crn, fromStatus: 'enquiry_received', toStatus: 'field_verification', note: 'Field exec assigned' } });
  await prisma.kptStatusHistory.create({ data: { crn: p.crn, fromStatus: 'field_verification', toStatus: 'field_verified', note: 'Field verification completed' } });
  await prisma.kptStatusHistory.create({ data: { crn: p.crn, fromStatus: 'field_verified', toStatus: 'under_review', note: 'All 6 documents submitted' } });
  await prisma.kptStatusHistory.create({ data: { crn: p.crn, fromStatus: 'under_review', toStatus: 'approved', note: 'All documents verified. Agreement generated.' } });

  await prisma.kptApprovalLog.create({ data: { crn: p.crn, action: 'docs_all_approved', doneBy: 'admin', doneByName: 'KPT Admin', notes: 'All documents approved. Agreement generated. Awaiting admin to send for signing.' } });
}

async function main() {
  console.log('Seeding 3 test partner applications...\n');

  await seedPartner101();
  console.log(`✓ KPT-CP-2026-00101  Priya Hardware & Electricals  (Stage 3 — Documents partial)`);

  await seedPartner102();
  console.log(`✓ KPT-CP-2026-00102  Mahesh Industrial Supplies    (Stage 4 — Pending Approval)`);

  await seedPartner103();
  console.log(`✓ KPT-CP-2026-00103  Ravi Power Equipment          (Stage 5 — Agreement unsigned)`);

  console.log('\nDone. Run: npx tsx packages/db/prisma/seed-stage5.ts  to also seed the Stage-5 signing test partner (00099).');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
