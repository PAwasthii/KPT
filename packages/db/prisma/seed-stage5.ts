import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CRN = 'KPT-CP-2026-00099';
const MOBILE = '9988776655';
const ESIGN_REF = `MOCK-ESIGN-${CRN}-0`;

async function main() {
  console.log('Seeding Stage 5 test partner...');

  // Clean up existing test partner if present
  await prisma.kptAgreement.deleteMany({ where: { crn: CRN } });
  await prisma.kptApprovalLog.deleteMany({ where: { crn: CRN } });
  await prisma.kptStatusHistory.deleteMany({ where: { crn: CRN } });
  await prisma.kptDocument.deleteMany({ where: { crn: CRN } });
  await prisma.kptFieldVerification.deleteMany({ where: { crn: CRN } });
  await prisma.kptPartner.deleteMany({ where: { crn: CRN } });
  await prisma.kptOtp.deleteMany({ where: { mobile: MOBILE } });

  // Create partner at Stage 5
  await prisma.kptPartner.create({
    data: {
      crn: CRN,
      ownerName: 'Vikram Deshmukh',
      firmName: 'Deshmukh Hardware & Power Tools',
      mobile: MOBILE,
      email: 'vikram.deshmukh.kpttest@example.com',
      city: 'Kolhapur',
      district: 'Kolhapur',
      state: 'Maharashtra',
      pincode: '416003',
      shopSizeSqft: 480,
      existingBrands: 'Bosch, Stanley',
      yearsInBusiness: 8,
      turnoverRange: '25L - 50L',
      productInterest: ['Power Tools', 'Blowers', 'E-Vehicles'],
      currentStage: 5,
      status: 'approved',
    },
  });

  // Field verification record
  await prisma.kptFieldVerification.create({
    data: {
      crn: CRN,
      assignedExecName: 'Rahul Patil',
      shopDimensions: '40ft × 20ft',
      roadVisibility: 'Good',
      locationScore: 'High',
      existingLines: 'Bosch, Stanley, Milwaukee',
      marketPotential: 'High',
      nearestDealer: 'Shree Tools, 3.2 km',
      execNotes: 'Well-established shop on main road. Good footfall. Recommended for onboarding.',
      geoLat: 16.7049,
      geoLng: 74.2433,
      scheduledDate: new Date('2026-08-01T10:00:00Z'),
      visitedAt: new Date('2026-08-01T11:30:00Z'),
      verifiedAt: new Date('2026-08-01T12:00:00Z'),
    },
  });

  // 6 verified documents
  const docs = [
    { docType: 'gstin',            label: 'GST Certificate',         fileName: 'gstin-certificate.pdf' },
    { docType: 'pan',              label: 'PAN Card',                fileName: 'pan-card.pdf' },
    { docType: 'shop_establishment', label: 'Shop & Establishment',  fileName: 'shop-estab.pdf' },
    { docType: 'cancelled_cheque', label: 'Cancelled Cheque',        fileName: 'cancelled-cheque.jpg' },
    { docType: 'address_proof',    label: 'Address Proof',           fileName: 'address-proof.pdf' },
    { docType: 'passport_photo',   label: 'Passport Photo',          fileName: 'passport-photo.jpg' },
  ];
  for (const doc of docs) {
    await prisma.kptDocument.create({
      data: {
        crn: CRN,
        stage: 3,
        docType: doc.docType,
        fileName: doc.fileName,
        storagePath: `partner-docs/${CRN}/stage3/${doc.docType}/${doc.fileName}`,
        verifyStatus: 'verified',
        verifiedAt: new Date('2026-08-10T09:00:00Z'),
      },
    });
  }

  // Agreement — generated but not yet sent for signing
  await prisma.kptAgreement.create({
    data: {
      crn: CRN,
      agreementPath: `agreements/${CRN}/dealer-agreement.pdf`,
      esignRef: ESIGN_REF,
      signStatus: 'pending',
    },
  });

  // Status history
  const statuses = [
    { fromStatus: 'enquiry_received', toStatus: 'field_verification', note: 'Field exec assigned' },
    { fromStatus: 'field_verification', toStatus: 'field_verified', note: 'Field verification completed' },
    { fromStatus: 'field_verified', toStatus: 'stage_4', note: 'Partner submitted documents' },
    { fromStatus: 'stage_4', toStatus: 'approved', note: 'All 6 documents verified by admin — agreement sent for signing' },
  ];
  for (const s of statuses) {
    await prisma.kptStatusHistory.create({ data: { crn: CRN, ...s } });
  }

  // Approval logs
  const logs = [
    { action: 'field_report_submitted', doneBy: 'admin', doneByName: 'Rahul Patil', notes: 'Field verification completed' },
    { action: 'doc_approved', doneBy: 'admin', doneByName: 'KPT Admin', notes: 'GST Certificate verified' },
    { action: 'doc_approved', doneBy: 'admin', doneByName: 'KPT Admin', notes: 'PAN Card verified' },
    { action: 'docs_all_approved', doneBy: 'admin', doneByName: 'KPT Admin', notes: 'All documents approved. Partner advanced to Stage 5.' },
  ];
  for (const log of logs) {
    await prisma.kptApprovalLog.create({ data: { crn: CRN, ...log } });
  }

  console.log(`\n✓ Stage 5 test partner created`);
  console.log(`  CRN    : ${CRN}`);
  console.log(`  Mobile : ${MOBILE}`);
  console.log(`  Login  : http://localhost:3000/partner/login`);
  console.log(`  OTP    : 123456 (dev mode)`);
  console.log(`  Status : approved | Stage 5 — ready to sign agreement`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
