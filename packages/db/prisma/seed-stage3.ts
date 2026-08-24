import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CRN = 'KPT-CP-2026-00088';
const MOBILE = '9876543210';

async function main() {
  console.log('Seeding Stage 3 (Document Upload) test partner...');

  // Clean up if re-running
  await prisma.kptApprovalLog.deleteMany({ where: { crn: CRN } });
  await prisma.kptStatusHistory.deleteMany({ where: { crn: CRN } });
  await prisma.kptDocument.deleteMany({ where: { crn: CRN } });
  await prisma.kptFieldVerification.deleteMany({ where: { crn: CRN } });
  await prisma.kptPartner.deleteMany({ where: { crn: CRN } });
  await prisma.kptOtp.deleteMany({ where: { mobile: MOBILE } });

  // Partner at Stage 3 — field visit done, ready to upload documents
  await prisma.kptPartner.create({
    data: {
      crn: CRN,
      ownerName: 'Suresh Kamble',
      firmName: 'Kamble Tools & Hardware',
      mobile: MOBILE,
      email: 'suresh.kamble.kpttest@example.com',
      city: 'Pune',
      district: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      shopSizeSqft: 320,
      existingBrands: 'Bosch, DeWalt',
      yearsInBusiness: 5,
      turnoverRange: '10L - 25L',
      productInterest: ['Power Tools', 'Agricultural Tools'],
      currentStage: 3,
      status: 'field_verified',
    },
  });

  // Completed field verification
  await prisma.kptFieldVerification.create({
    data: {
      crn: CRN,
      assignedExecName: 'Nitin Shinde',
      shopDimensions: '30ft × 18ft',
      roadVisibility: 'Good',
      locationScore: 'Medium',
      existingLines: 'Bosch, DeWalt',
      marketPotential: 'High',
      nearestDealer: 'Pune Tools Mart, 4.5 km',
      execNotes: 'Established hardware shop in a busy market. Good potential for KPT products.',
      geoLat: 18.5204,
      geoLng: 73.8567,
      scheduledDate: new Date('2026-08-15T11:00:00Z'),
      visitedAt: new Date('2026-08-15T11:45:00Z'),
      verifiedAt: new Date('2026-08-15T12:30:00Z'),
    },
  });

  // Status history
  const statuses = [
    { fromStatus: 'enquiry_received', toStatus: 'field_verification', note: 'Field exec Nitin Shinde assigned' },
    { fromStatus: 'field_verification', toStatus: 'field_verified', note: 'Field visit completed — partner cleared for document upload' },
  ];
  for (const s of statuses) {
    await prisma.kptStatusHistory.create({ data: { crn: CRN, ...s } });
  }

  await prisma.kptApprovalLog.create({
    data: {
      crn: CRN,
      action: 'field_report_submitted',
      doneBy: 'admin',
      doneByName: 'Nitin Shinde',
      notes: 'Field verification completed. Partner recommended for onboarding.',
    },
  });

  console.log(`\n✓ Stage 3 test partner created`);
  console.log(`  CRN    : ${CRN}`);
  console.log(`  Mobile : ${MOBILE}`);
  console.log(`  Login  : http://localhost:3000/partner/login`);
  console.log(`  OTP    : 123456 (dev mode)`);
  console.log(`  Status : field_verified | Stage 3 — Document Upload unlocked`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
