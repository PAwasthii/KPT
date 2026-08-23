import {
  LeadStatus,
  PrismaClient,
  UserRole,
  LeadSource,
  Region,
  Contact as ContactModel,
  OpportunityStage,
  OpportunityType,
  OpportunityStatus,
  QuoteStatus,
  QuoteType,
  SalesOrderStatus,
  FinanceInvoiceStatus,
  FinanceBudgetType,
  FinanceBudgetDimension,
} from "@prisma/client";
import { PartnerType, PartnerTier, PartnerStatus, IncentiveStatus, StockStatus, AuditCategory, MovementType } from '@prisma/client';

// Use DIRECT_URL for seeding to avoid PgBouncer prepared statement issues
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

// -------------------------------
// Helpers
// -------------------------------
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

function randomDateWithin(days: number): Date {
  const now = new Date();
  const past = new Date(now);
  past.setDate(now.getDate() - randInt(0, days));
  past.setHours(randInt(0, 23), randInt(0, 59), randInt(0, 59), 0);
  return past;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildEmail(name: string, company: string): string {
  const n = slugify(name).replace(/-/g, ".");
  const c = slugify(company).replace(/-/g, "");
  return `${n}@${c}.com`;
}

async function main() {
  console.log("🌱 Seeding database (destructive reset, medium volume)...");

  // Destructive reset in FK-safe order (sequential to avoid prepared statement conflicts with connection poolers)
  // Opportunity-Quote-Order tables (delete in reverse dependency order)
  await prisma.financeInvoiceItem.deleteMany({});
  await prisma.financeInvoice.deleteMany({});
  await prisma.financeBudget.deleteMany({});
  await prisma.financeIntegrationLog.deleteMany({});
  await prisma.salesOrderLineItem.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.stockEntry.deleteMany({});
  await prisma.inventoryItem.deleteMany({});
  await prisma.partnerIncentive.deleteMany({});
  await prisma.channelPartner.deleteMany({});
  await prisma.kptApprovalLog.deleteMany({});
  await prisma.kptDocument.deleteMany({});
  await prisma.kptFieldVerification.deleteMany({});
  await prisma.kptStatusHistory.deleteMany({});
  await prisma.kptAgreement.deleteMany({});
  await prisma.kptPartner.deleteMany({});
  await prisma.incentiveSlab.deleteMany({});
  await prisma.salesOrder.deleteMany({});
  await prisma.quoteLineItem.deleteMany({});
  await prisma.quote.deleteMany({});
  await prisma.opportunityActivity.deleteMany({});
  await prisma.opportunityLineItem.deleteMany({});
  await prisma.opportunity.deleteMany({});

  await prisma.chatHistory.deleteMany({});
  await prisma.botSession.deleteMany({});
  await prisma.analyticsEvent.deleteMany({});
  await prisma.formSubmission.deleteMany({});
  await prisma.campaignMember.deleteMany({});
  await prisma.campaignChannel.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.leadAssignmentRule.deleteMany({});
  await prisma.customField.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.segmentRule.deleteMany({});
  await prisma.segment.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.contact.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.user.deleteMany({});

  // Currencies
  console.log("\n💰 Creating currencies...\n");
  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$', country: 'United States' },
    { code: 'EUR', name: 'Euro', symbol: '€', country: 'European Union' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', country: 'Japan' },
    { code: 'GBP', name: 'British Pound', symbol: '£', country: 'United Kingdom' },
    { code: 'AUD', name: 'Australian Dollar', symbol: '$', country: 'Australia' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: '$', country: 'Canada' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', country: 'Switzerland' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', country: 'China' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', country: 'India' },
  ];
    await prisma.currency.createMany({
    data: currencies,
    skipDuplicates: true,
  });

  // add default currency in global settings
  await prisma.globalSetting.upsert({
    where: { key: 'defaultCurrency' },
    update: { value: 'INR' },
    create: { key: 'defaultCurrency', value: 'INR' },
  });

  // add default opportunity discount threshold (0 = any discount requires approval)
  await prisma.globalSetting.upsert({
    where: { key: 'OPPORTUNITY_DISCOUNT_THRESHOLD' },
    update: {},
    create: { key: 'OPPORTUNITY_DISCOUNT_THRESHOLD', value: '0', description: 'Maximum discount % on line items allowed without manager approval' },
  });


  // Users with roles
  const passwordHash =
    "$2a$10$zkwJCafrQjcLn2.Z1bJA.OKYuQ/RVFL6w2pKEFWY5387H/ET4zmOu"; // "admin123"

  console.log("\n🔐 Creating user accounts...\n");

  // 1. SYSTEM_ADMIN User
  const superAdminUser = await prisma.user.upsert({
    where: { email: "superadmin@example.com" },
    update: { passwordHash, authProvider: 'PASSWORD' },
    create: {
      firstName: "Super",
      lastName: "Admin",
      email: "superadmin@example.com",
      passwordHash,
      role: UserRole.SYSTEM_ADMIN,
      region: null, // System admins don't need regions
      countryCode: "91",
    },
  });

  // 2. ADMIN User
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { passwordHash, authProvider: 'PASSWORD' },
    create: {
      firstName: "Admin",
      lastName: "User",
      email: "admin@example.com",
      passwordHash,
      role: UserRole.ADMIN,
      region: Region.NORTH,
      countryCode: "91",
    },
  });

  // 3. DEVELOPER User (matches .env credentials)
  // Note: Email and password should match your .env file for developer login
  const developerUser = await prisma.user.upsert({
    where: { email: "developer@example.com" },
    update: { passwordHash, authProvider: 'PASSWORD' },
    create: {
      firstName: "Developer",
      lastName: "Access",
      email: "developer@example.com",
      passwordHash, // "admin123" - but you should use DEVELOPER_LOGIN_PASSWORD from .env
      role: UserRole.SYSTEM_ADMIN,
      region: null,
      countryCode: "91",
    },
  });

  // Innov Global super-admins
  const innovHash = '$2a$10$F/GK8v0tQc.SUJnHm4SN/eq8fFZWzaVeWzG4p5XD1kycSqVLyVwZW'; // Innov@2026
  await prisma.user.upsert({
    where: { email: 'raj.s@innovunglobal.com' },
    update: { passwordHash: innovHash, authProvider: 'PASSWORD', role: UserRole.SYSTEM_ADMIN },
    create: {
      firstName: 'Raj',
      lastName: 'S',
      email: 'raj.s@innovunglobal.com',
      passwordHash: innovHash,
      role: UserRole.SYSTEM_ADMIN,
      region: null,
      countryCode: '91',
    },
  });
  await prisma.user.upsert({
    where: { email: 'nisha.d@innovunglobal.com' },
    update: { passwordHash: innovHash, authProvider: 'PASSWORD', role: UserRole.SYSTEM_ADMIN },
    create: {
      firstName: 'Nisha',
      lastName: 'D',
      email: 'nisha.d@innovunglobal.com',
      passwordHash: innovHash,
      role: UserRole.SYSTEM_ADMIN,
      region: null,
      countryCode: '91',
    },
  });

  const kptAdminHash = '$2a$10$9CtOl1aRnTY21.H3CDjiXuC6o38zojtV4DKSajSYDTBjvcZ4yMbja'; // KPT@Admin2026
  const kptAdminUser = await prisma.user.upsert({
    where: { email: 'admin@kpt.co.in' },
    update: { passwordHash: kptAdminHash, authProvider: 'PASSWORD' },
    create: {
      firstName: 'Rajesh',
      lastName: 'Kulkarni',
      email: 'admin@kpt.co.in',
      passwordHash: kptAdminHash,
      role: UserRole.ADMIN,
      region: Region.WEST_1,
      countryCode: '91',
    },
  });

  const kptManagerHash = '$2a$10$DaPCphdL/R.kQtC4isPyGeat12YtnInBHI6SViAxJWA/CA88h.TB.'; // KPT@Manager2026
  const kptManagerUser = await prisma.user.upsert({
    where: { email: 'manager@kpt.co.in' },
    update: { passwordHash: kptManagerHash, authProvider: 'PASSWORD' },
    create: {
      firstName: 'Priya',
      lastName: 'Sharma',
      email: 'manager@kpt.co.in',
      passwordHash: kptManagerHash,
      role: UserRole.SALES,
      region: Region.WEST_1,
      countryCode: '91',
    },
  });

  const salesUserProfiles = [
    { firstName: "Sarah", lastName: "Sales", email: "sarah.sales@example.com", region: Region.SOUTH },
    { firstName: "Liam", lastName: "Prospect", email: "liam.sales@example.com", region: Region.NORTH },
    { firstName: "Priya", lastName: "Closer", email: "priya.sales@example.com", region: Region.WEST_1 },
    { firstName: "Diego", lastName: "Hunter", email: "diego.sales@example.com", region: Region.WEST_2 },
  ];
  const salesUsers = await Promise.all(
    salesUserProfiles.map(profile =>
      prisma.user.upsert({
        where: { email: profile.email },
        update: { passwordHash, authProvider: 'PASSWORD' },
        create: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          passwordHash,
          role: UserRole.SALES,
          region: profile.region,
          countryCode: "91",
        },
      })
    )
  );
  const primarySalesUser = salesUsers[0];

  const marketingUser = await prisma.user.upsert({
    where: { email: "mike.marketing@example.com" },
    update: { passwordHash, authProvider: 'PASSWORD' },
    create: {
      firstName: "Mike",
      lastName: "Marketing",
      email: "mike.marketing@example.com",
      passwordHash,
      role: UserRole.ADMIN,
      region: Region.EAST,
      countryCode: "91",
    },
  });

  // Accounts
  const industries = [
    "Technology",
    "Marketing",
    "Consulting",
    "E-commerce",
    "Healthcare",
    "Education",
    "Finance",
    "Manufacturing",
  ];
  const companyNames = [
    "TechNova Labs",
    "MarketGenius",
    "BluePeak Consulting",
    "Orbit Retail",
    "HealthSync",
    "EduSphere",
    "FinEdge Capital",
    "ForgeWorks",
    "BrightPath",
    "CloudBridge",
    "VectorAI",
    "LuminaSoft",
    "GrowthFoundry",
    "PinnacleOps",
    "ApexMetrics",
    "SummitHub",
    "NeonByte",
    "QuantumWare",
    "AtlasGroup",
    "Zenith Systems",
  ];
  const accountCache = new Map<string, { id: number; name: string }>();
  async function getOrCreateAccount(name: string) {
    if (accountCache.has(name)) {
      return accountCache.get(name)!;
    }
    const created = await prisma.account.create({
      data: {
        name,
        industry: pick(industries),
        website: `https://www.${slugify(name)}.com`,
      },
    });
    const accountRecord = { id: created.id, name: created.name };
    accountCache.set(name, accountRecord);
    return accountRecord;
  }
  const contacts: {
    id: number;
    name: string;
    email: string;
    accountId?: number | null;
  }[] = [];
  const firstNames = [
    "John",
    "Sarah",
    "Mike",
    "Emily",
    "David",
    "Laura",
    "Adam",
    "Nina",
    "Chris",
    "Olivia",
    "Ethan",
    "Grace",
    "Liam",
    "Sophia",
    "Noah",
    "Ava",
  ];
  const lastNames = [
    "Smith",
    "Johnson",
    "Davis",
    "Brown",
    "Wilson",
    "Clark",
    "Lopez",
    "Taylor",
    "Lee",
    "Martin",
    "Walker",
    "Hall",
    "Young",
    "King",
  ];
  const positions = [
    "CTO",
    "CMO",
    "Marketing Director",
    "VP Sales",
    "CEO",
    "Growth Lead",
    "Head of Ops",
    "Product Manager",
  ];

  // Campaigns
  const landingCampaign = await prisma.campaign.create({
    data: {
      name: "Spring Landing Page Lead Gen",
      description: "Landing page campaign to capture demo requests",
      startDate: randomDateWithin(90),
      endDate: null,
      createdBy: marketingUser.id,
    },
  });
  await prisma.campaignChannel.create({
    data: {
      campaignId: landingCampaign.id,
      channelType: "landing-page-campaign",
      externalId: `lp-${landingCampaign.id}-${Date.now()}`,
    },
  });

  const whatsappCampaign = await prisma.campaign.create({
    data: {
      name: "WhatsApp Re-Engagement",
      description: "Follow-up with dormant leads via WhatsApp",
      startDate: randomDateWithin(60),
      endDate: null,
      createdBy: marketingUser.id,
    },
  });
  await prisma.campaignChannel.create({
    data: {
      campaignId: whatsappCampaign.id,
      channelType: "whatsapp-campaign",
      externalId: `wa-${whatsappCampaign.id}-${Date.now()}`,
    },
  });

  const emailCampaign = await prisma.campaign.create({
    data: {
      name: "Email Nurture Series",
      description: "Three-touch email sequence for product education",
      startDate: randomDateWithin(75),
      endDate: null,
      createdBy: marketingUser.id,
    },
  });
  await prisma.campaignChannel.create({
    data: {
      campaignId: emailCampaign.id,
      channelType: "email-marketing",
      externalId: `em-${emailCampaign.id}-${Date.now()}`,
    },
  });

  // Leads
  const leadSources = ["IMPORT", "LANDING_PAGE", "MANUAL"];
  const leadStatuses = [
    "OPEN",
    "WORKING",
    "QUALIFIED",
    "NURTURING",
    "CONVERTED",
    "UNQUALIFIED",
  ];

  const leads = [] as { id: number; email: string }[];
  const totalLeads = 500;
  const assignedLeadCount = 400;
  const unassignedLeadCount = totalLeads - assignedLeadCount;
  const assignmentPlan = [
    ...Array(assignedLeadCount).fill(true),
    ...Array(unassignedLeadCount).fill(false),
  ].sort(() => Math.random() - 0.5);
  const usedLeadEmails = new Set<string>();

  // Location data for seed data (Indian context)
  const cities = [
    "Mumbai",
    "Delhi",
    "Bengaluru",
    "Hyderabad",
    "Chennai",
    "Pune",
    "Ahmedabad",
    "Kolkata",
    "Jaipur",
    "Chandigarh",
  ];
  const states = [
    "Maharashtra",
    "Delhi",
    "Karnataka",
    "Telangana",
    "Tamil Nadu",
    "Maharashtra",
    "Gujarat",
    "West Bengal",
    "Rajasthan",
    "Punjab",
  ];
  const pincodes = [
    "400001",
    "110001",
    "560001",
    "500001",
    "600001",
    "411001",
    "380001",
    "700001",
    "302001",
    "160017",
  ];

  const generateIndianPhoneNumber = () => {
    const prefixes = ["6", "7", "8", "9"];
    const firstDigit = pick(prefixes);
    let remaining = "";
    for (let i = 0; i < 9; i++) {
      remaining += randInt(0, 9);
    }
    return `${firstDigit}${remaining}`;
  };

  for (let i = 0; i < totalLeads; i++) {
    const isAssigned = assignmentPlan[i];
    const owner = isAssigned ? pick(salesUsers) : null;
    const firstName = pick(firstNames);
    const lastName = pick(lastNames);
    const fullName = `${firstName} ${lastName}`;
    const company = pick(companyNames);
    let email = buildEmail(fullName, company);

    // Ensure unique email by adding suffix if needed
    let counter = 1;
    while (usedLeadEmails.has(email)) {
      email = email.replace("@", `+${counter}@`);
      counter++;
    }
    usedLeadEmails.add(email);

    // Pick location indices (same index for matching data)
    const statusPool = owner ? leadStatuses : leadStatuses.filter(s => s !== "CONVERTED");
    const status = pick(statusPool) as LeadStatus;

    let convertedContactId: number | null = null;
    if (status === "CONVERTED") {
      const existingContact = await prisma.contact.findUnique({
        where: { email },
      });
      const account = await getOrCreateAccount(company);
      let contactRecord: ContactModel;
      if (existingContact) {
        contactRecord = existingContact;
      } else {
        contactRecord = await prisma.contact.create({
          data: {
            name: fullName,
            email,
            phone: generateIndianPhoneNumber(),
            countryCode: "91",
            position: pick(positions),
            accountId: account.id,
          },
        });
      }
      convertedContactId = contactRecord.id;
      if (!contacts.some(c => c.id === contactRecord.id)) {
        contacts.push({
          id: contactRecord.id,
          name: contactRecord.name,
          email: contactRecord.email,
          accountId: contactRecord.accountId,
        });
      }
    }

    const created = await prisma.lead.create({
      data: {
        firstName,
        lastName,
        email: email,
        phone: generateIndianPhoneNumber(),
        countryCode: "91",
        companyName: company,
        city: pick(cities),
        state: pick(states),
        pincode: pick(pincodes),
        source: pick(leadSources) as LeadSource,
        status,
        ownerId: owner ? owner.id : null,
        assignedAt: owner ? randomDateWithin(60) : null,
        convertedToContactId: convertedContactId,
        score: randInt(10, 100),
      },
    });
    leads.push({ id: created.id, email: created.email });
  }

  // Campaign Members (contacts + leads)
  const memberStatuses = ["Invited", "Clicked", "Responded"];
  const allCampaigns = [landingCampaign, whatsappCampaign, emailCampaign];

  for (const c of allCampaigns) {
    const sampleContacts = contacts.slice(0, randInt(15, 25));
    for (const ct of sampleContacts) {
      try {
        await prisma.campaignMember.create({
          data: {
            campaignId: c.id,
            contactId: ct.id,
            status: pick(memberStatuses),
          },
        });
      } catch {}
    }
    const sampleLeads = leads.slice(0, randInt(20, 35));
    for (const ld of sampleLeads) {
      try {
        await prisma.campaignMember.create({
          data: {
            campaignId: c.id,
            leadId: ld.id,
            status: pick(memberStatuses),
          },
        });
      } catch {}
    }
  }

  // Analytics Events by channel
  type MemberRef = { campaignId: number; contactId?: number; leadId?: number };
  const membersLanding = await prisma.campaignMember.findMany({
    where: { campaignId: landingCampaign.id },
  });
  const membersWhatsApp = await prisma.campaignMember.findMany({
    where: { campaignId: whatsappCampaign.id },
  });
  const membersEmail = await prisma.campaignMember.findMany({
    where: { campaignId: emailCampaign.id },
  });

  const makeEvent = (
    ref: MemberRef,
    eventType: string,
    eventData: Record<string, any> = {}
  ) => ({
    campaignId: ref.campaignId,
    contactId: ref.contactId ?? null,
    leadId: ref.leadId ?? null,
    eventType,
    eventData,
    occurredAt: randomDateWithin(90),
  });

  const analyticsToCreate: any[] = [];
  // Landing page events
  for (const m of membersLanding) {
    const ref = {
      campaignId: m.campaignId,
      contactId: m.contactId ?? undefined,
      leadId: m.leadId ?? undefined,
    };
    analyticsToCreate.push(
      makeEvent(ref, "page_view", { path: "/", utm_source: "google" })
    );
    if (Math.random() < 0.6)
      analyticsToCreate.push(
        makeEvent(ref, "form_submit", { form: "demo", success: true })
      );
  }
  // WhatsApp events
  for (const m of membersWhatsApp) {
    const ref = {
      campaignId: m.campaignId,
      contactId: m.contactId ?? undefined,
      leadId: m.leadId ?? undefined,
    };
    analyticsToCreate.push(
      makeEvent(ref, "whatsapp_msg_sent", { template: "reengage_v1" })
    );
    if (Math.random() < 0.45)
      analyticsToCreate.push(
        makeEvent(ref, "whatsapp_reply", {
          sentiment: pick(["positive", "neutral", "negative"]),
        })
      );
  }
  // Email events
  for (const m of membersEmail) {
    const ref = {
      campaignId: m.campaignId,
      contactId: m.contactId ?? undefined,
      leadId: m.leadId ?? undefined,
    };
    analyticsToCreate.push(
      makeEvent(ref, "email_sent", { messageId: `m-${m.id}` })
    );
    if (Math.random() < 0.7)
      analyticsToCreate.push(
        makeEvent(ref, "email_open", { userAgent: "Mozilla" })
      );
    if (Math.random() < 0.4)
      analyticsToCreate.push(
        makeEvent(ref, "email_click", { url: "/pricing" })
      );
  }

  // Batch create analytics in chunks to avoid large payloads
  const chunkSize = 100;
  for (let i = 0; i < analyticsToCreate.length; i += chunkSize) {
    const slice = analyticsToCreate.slice(i, i + chunkSize);
    await prisma.analyticsEvent.createMany({ data: slice });
  }

  // Form Submissions (landing page)
  const formSubsToCreate: any[] = [];
  const landingMembers = [...membersLanding];
  for (let i = 0; i < randInt(30, 50) && i < landingMembers.length; i++) {
    const m = landingMembers[i];
    const name = m.contactId
      ? (contacts.find(c => c.id === m.contactId)?.name ?? "")
      : (leads
          .find(l => l.id === (m.leadId as number))
          ?.email.split("@")[0]
          .replace(".", " ") ?? "");
    formSubsToCreate.push({
      leadId: m.leadId ?? null,
      contactId: m.contactId ?? null,
      submittedAt: randomDateWithin(90),
      formData: {
        name,
        email: m.contactId
          ? contacts.find(c => c.id === m.contactId)?.email
          : leads.find(l => l.id === (m.leadId as number))?.email,
        utm_campaign: "spring-lp",
      },
    });
  }
  for (let i = 0; i < formSubsToCreate.length; i += 100) {
    await prisma.formSubmission.createMany({
      data: formSubsToCreate.slice(i, i + 100),
    });
  }

  // WhatsApp Bot Sessions + Chat History
  const whatsappContacts = membersWhatsApp
    .filter(m => m.contactId)
    .slice(0, randInt(10, 20));
  for (const m of whatsappContacts) {
    const startedAt = randomDateWithin(45);
    const ended = Math.random() < 0.6;
    const session = await prisma.botSession.create({
      data: {
        contactId: m.contactId as number,
        userId: marketingUser.id,
        startedAt,
        endedAt: ended
          ? new Date(startedAt.getTime() + randInt(10, 3600) * 1000)
          : null,
        status: ended ? "closed" : "open",
      },
    });
    const msgs = [
      { sender: "system", message: "Hello! Can we help with your evaluation?" },
      {
        sender: "contact",
        message: pick(["Yes, tell me more", "Maybe later", "What's pricing?"]),
      },
      {
        sender: "system",
        message: pick([
          "We offer flexible plans.",
          "We have a free trial.",
          "I'll connect you with sales.",
        ]),
      },
    ];
    for (const msg of msgs) {
      await prisma.chatHistory.create({
        data: {
          contactId: m.contactId as number,
          sessionId: session.id,
          message: msg.message,
          sender: msg.sender,
          createdAt: new Date(startedAt.getTime() + randInt(1, 1800) * 1000),
        },
      });
    }
  }

  // Lead Assignment Rules
  await prisma.leadAssignmentRule.createMany({
    data: [
      {
        name: "High Score Website Leads",
        criteria: { score_gte: 85, source: "Website" },
        assignedUserId: primarySalesUser.id,
        priority: 1,
        active: true,
        createdAt: new Date(),
      },
      {
        name: "WhatsApp Quick Replies",
        criteria: { source: "WhatsApp" },
        assignedUserId: salesUsers[1]?.id ?? primarySalesUser.id,
        priority: 2,
        active: true,
        createdAt: new Date(),
      },
    ],
  });

  // 1. default pricebook entry
  const standardPriceBook = await prisma.priceBook.upsert({
    where: { id: 1 }, // Assuming ID 1 for standard price book
    update: { name: 'Standard Price Book' },
    create: {
      id: 1, // Explicitly set ID for standard price book
      name: 'Standard Price Book',
      currencyCode: 'INR',
      description: 'Standard prices for all products.',
      isActive: true,
    },
  });

  // ============================================
  // OPPORTUNITY-QUOTE-ORDER SEED DATA
  // ============================================
  console.log("\n💼 Creating Opportunities, Quotes, and Sales Orders...\n");

  // First, create product categories and products for line items
  const powerToolsCategory = await prisma.productCategory.upsert({
    where: { name: 'Power Tools' },
    update: {},
    create: { name: 'Power Tools', description: 'KPT power tools - grinders, drills, hammers' },
  });
  const accessoriesCategory = await prisma.productCategory.upsert({
    where: { name: 'Accessories & Others' },
    update: {},
    create: { name: 'Accessories & Others', description: 'Saws, sanders, heat guns, wrenches' },
  });

  // Create products
  const productData = [
    // Grinders
    { name: 'KPT 100mm Angle Grinder KPT-AG4', code: 'KPT-AG4-001', categoryId: powerToolsCategory.id, price: 2850, active: true },
    { name: 'KPT 115mm Angle Grinder KPT-AG5', code: 'KPT-AG5-001', categoryId: powerToolsCategory.id, price: 3200, active: true },
    { name: 'KPT 180mm Angle Grinder KPT-AG7', code: 'KPT-AG7-001', categoryId: powerToolsCategory.id, price: 5400, active: true },
    { name: 'KPT 230mm Angle Grinder KPT-AG9', code: 'KPT-AG9-001', categoryId: powerToolsCategory.id, price: 7800, active: true },
    { name: 'KPT Die Grinder KPT-DG', code: 'KPT-DG-001', categoryId: powerToolsCategory.id, price: 4200, active: true },
    // Drills
    { name: 'KPT 13mm Impact Drill KPT-ID13', code: 'KPT-ID13-001', categoryId: powerToolsCategory.id, price: 3600, active: true },
    { name: 'KPT 13mm Rotary Hammer KPT-RH13', code: 'KPT-RH13-001', categoryId: powerToolsCategory.id, price: 5800, active: true },
    { name: 'KPT SDS Plus Rotary Hammer KPT-SDS', code: 'KPT-SDS-001', categoryId: powerToolsCategory.id, price: 8500, active: true },
    { name: 'KPT Cordless Drill 18V KPT-CD18', code: 'KPT-CD18-001', categoryId: powerToolsCategory.id, price: 6200, active: true },
    // Hammers
    { name: 'KPT Demolition Hammer KPT-DH', code: 'KPT-DH-001', categoryId: powerToolsCategory.id, price: 12500, active: true },
    { name: 'KPT Heavy Duty Demolition Hammer KPT-DHD', code: 'KPT-DHD-001', categoryId: powerToolsCategory.id, price: 18000, active: true },
    // Saws & Others
    { name: 'KPT 185mm Circular Saw KPT-CS7', code: 'KPT-CS7-001', categoryId: accessoriesCategory.id, price: 4800, active: true },
    { name: 'KPT Jigsaw 700W KPT-JS', code: 'KPT-JS-001', categoryId: accessoriesCategory.id, price: 3400, active: true },
    { name: 'KPT Orbital Sander KPT-OS', code: 'KPT-OS-001', categoryId: accessoriesCategory.id, price: 2600, active: true },
    { name: 'KPT Heat Gun 2000W KPT-HG', code: 'KPT-HG-001', categoryId: accessoriesCategory.id, price: 3100, active: true },
    { name: 'KPT Impact Wrench 1/2" KPT-IW', code: 'KPT-IW-001', categoryId: accessoriesCategory.id, price: 7200, active: true },
    { name: 'KPT Random Orbital Polisher KPT-RP', code: 'KPT-RP-001', categoryId: accessoriesCategory.id, price: 4500, active: true },
  ];

  const products: { id: number; name: string; code: string; price: number }[] = [];
  for (const p of productData) {
    const product = await prisma.product.upsert({
      where: { code: p.code },
      update: { active: p.active },
      create: {
        name: p.name,
        code: p.code,
        categoryId: p.categoryId,
        active: p.active,
        description: `${p.name} - Standard offering`,
      },
    });
    products.push({ id: product.id, name: product.name, code: product.code, price: p.price });
  }

  // Create price book entries for all products
  for (const p of products) {
    await prisma.priceBookEntry.upsert({
      where: {
        productId_priceBookId: {
          productId: p.id,
          priceBookId: standardPriceBook.id,
        },
      },
      update: { listPrice: p.price },
      create: {
        productId: p.id,
        priceBookId: standardPriceBook.id,
        listPrice: p.price,
        useStandardPrice: true,
        isActive: true,
      },
    });
  }

  // Get price book entries for creating line items
  const priceBookEntries = await prisma.priceBookEntry.findMany({
    where: { priceBookId: standardPriceBook.id },
    include: { product: true },
  });

  // Get accounts and contacts for opportunities (use existing ones)
  const allAccounts = await prisma.account.findMany({ take: 20 });
  const allContacts = await prisma.contact.findMany({
    where: { accountId: { not: null } },
    take: 50,
  });

  // Opportunity stages with probabilities
  const stageProbabilities: Record<OpportunityStage, number> = {
    [OpportunityStage.PROSPECT]: 10,
    [OpportunityStage.QUALIFICATION]: 20,
    [OpportunityStage.DISCOVERY]: 40,
    [OpportunityStage.VALUE_PROPOSITION]: 60,
    [OpportunityStage.PROPOSAL]: 75,
    [OpportunityStage.NEGOTIATION]: 90,
    [OpportunityStage.CLOSED_WON]: 100,
    [OpportunityStage.CLOSED_LOST]: 0,
  };

  const opportunityTypes = Object.values(OpportunityType);
  const opportunityStages = Object.values(OpportunityStage);

  // Generate opportunity number
  let oppCounter = 1;
  const generateOppNumber = () => {
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    return `OPP-${yy}${mm}-${(oppCounter++).toString().padStart(4, '0')}`;
  };

  // Generate quote number with version
  let quoteCounter = 1;
  const generateQuoteNumber = (version: number = 1) => {
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const versionLetter = String.fromCharCode(64 + version); // A, B, C...
    return `QUO-${yy}${mm}-${(quoteCounter++).toString().padStart(4, '0')}-${versionLetter}`;
  };

  // Generate order number
  let orderCounter = 1;
  const generateOrderNumber = () => {
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    return `ORD-${yy}${mm}-${(orderCounter++).toString().padStart(4, '0')}`;
  };

  // Create opportunities with varying stages and statuses
  const opportunityNames = [
    'Enterprise CRM Implementation',
    'Digital Transformation Project',
    'Cloud Migration Initiative',
    'Sales Automation Suite',
    'Customer Portal Development',
    'Data Analytics Platform',
    'Marketing Automation Setup',
    'Service Desk Solution',
    'ERP Integration Project',
    'Mobile App Development',
    'Business Intelligence Dashboard',
    'Workflow Automation System',
    'Customer Success Platform',
    'Partner Portal Implementation',
    'E-commerce Integration',
  ];

  const createdOpportunities: {
    id: number;
    opportunityNumber: string;
    stage: OpportunityStage;
    status: OpportunityStatus;
    accountId: number;
    contactId: number | null;
    ownerId: number;
  }[] = [];

  console.log("  Creating 15 opportunities with line items...");

  for (let i = 0; i < 15; i++) {
    const account = allAccounts[i % allAccounts.length];
    const contact = allContacts.find(c => c.accountId === account.id) || allContacts[i % allContacts.length];
    const owner = salesUsers[i % salesUsers.length];
    const stage = opportunityStages[Math.min(i % 8, 7)] as OpportunityStage;

    // Determine status based on stage
    let status: OpportunityStatus = OpportunityStatus.IN_PROGRESS;
    if (stage === OpportunityStage.PROSPECT) {
      status = OpportunityStatus.DRAFT;
    } else if (stage === OpportunityStage.CLOSED_WON || stage === OpportunityStage.CLOSED_LOST) {
      status = OpportunityStatus.QUOTE_CREATED;
    } else if (i % 3 === 0) {
      status = OpportunityStatus.QUOTE_CREATED;
    }

    const expectedClose = new Date();
    expectedClose.setDate(expectedClose.getDate() + randInt(30, 180));

    const opportunity = await prisma.opportunity.create({
      data: {
        opportunityNumber: generateOppNumber(),
        name: `${opportunityNames[i]} - ${account.name}`,
        description: `${opportunityNames[i]} opportunity for ${account.name}. This includes software licensing, implementation services, and ongoing support.`,
        stage,
        type: pick(opportunityTypes),
        status,
        amount: randInt(100000, 2000000),
        probability: stageProbabilities[stage],
        expectedCloseDate: expectedClose,
        actualCloseDate: stage === OpportunityStage.CLOSED_WON || stage === OpportunityStage.CLOSED_LOST
          ? randomDateWithin(30)
          : null,
        leadSource: pick(['Website', 'Referral', 'Trade Show', 'Cold Call', 'Partner']),
        nextStep: stage === OpportunityStage.CLOSED_WON || stage === OpportunityStage.CLOSED_LOST
          ? null
          : pick(['Schedule demo', 'Send proposal', 'Follow up call', 'Technical review', 'Contract negotiation']),
        lossReason: stage === OpportunityStage.CLOSED_LOST
          ? pick(['Budget constraints', 'Chose competitor', 'Project postponed', 'No decision'])
          : null,
        accountId: account.id,
        contactId: contact?.id || null,
        priceBookId: standardPriceBook.id,
        ownerId: owner.id,
        createdBy: owner.id,
      },
    });

    createdOpportunities.push({
      id: opportunity.id,
      opportunityNumber: opportunity.opportunityNumber,
      stage: opportunity.stage,
      status: opportunity.status,
      accountId: opportunity.accountId,
      contactId: opportunity.contactId,
      ownerId: opportunity.ownerId,
    });

    // Add 2-5 line items per opportunity
    const numLineItems = randInt(2, 5);
    const selectedProducts = priceBookEntries
      .sort(() => Math.random() - 0.5)
      .slice(0, numLineItems);

    let totalAmount = 0;
    for (let j = 0; j < selectedProducts.length; j++) {
      const pbe = selectedProducts[j];
      const quantity = randInt(1, 10);
      const discount = randInt(0, 15);
      const listPrice = Number(pbe.listPrice);
      const unitPrice = listPrice * (1 - discount / 100);
      const lineTotal = quantity * unitPrice;
      totalAmount += lineTotal;

      await prisma.opportunityLineItem.create({
        data: {
          opportunityId: opportunity.id,
          productId: pbe.productId,
          priceBookEntryId: pbe.id,
          quantity,
          listPrice,
          unitPrice,
          discount,
          totalPrice: lineTotal,
          description: `${pbe.product.name} for ${account.name}`,
          sortOrder: j + 1,
        },
      });
    }

    // Update opportunity amount with calculated total
    await prisma.opportunity.update({
      where: { id: opportunity.id },
      data: { amount: totalAmount },
    });

    // Add activity entries for the opportunity
    const activityTypes = ['STAGE_CHANGE', 'NOTE', 'FIELD_UPDATE', 'EMAIL_SENT', 'CALL_LOGGED', 'MEETING_SCHEDULED'];
    const numActivities = randInt(2, 6);

    for (let k = 0; k < numActivities; k++) {
      const actType = pick(activityTypes);
      let description = '';
      let oldValue: string | null = null;
      let newValue: string | null = null;

      switch (actType) {
        case 'STAGE_CHANGE':
          const oldStageIdx = Math.max(0, opportunityStages.indexOf(stage) - 1);
          oldValue = opportunityStages[oldStageIdx];
          newValue = stage;
          description = `Stage changed from ${oldValue} to ${newValue}`;
          break;
        case 'NOTE':
          description = pick([
            'Customer showed strong interest in the enterprise package.',
            'Decision maker confirmed budget approval.',
            'Technical team completed their evaluation.',
            'Competitor comparison document shared.',
            'Pricing discussion completed, moving forward.',
          ]);
          break;
        case 'FIELD_UPDATE':
          description = 'Updated expected close date based on customer feedback';
          break;
        case 'EMAIL_SENT':
          description = pick(['Sent proposal document', 'Sent follow-up email', 'Sent case study']);
          break;
        case 'CALL_LOGGED':
          description = pick(['Discovery call completed', 'Demo call scheduled', 'Pricing discussion call']);
          break;
        case 'MEETING_SCHEDULED':
          description = pick(['On-site meeting scheduled', 'Virtual presentation booked', 'Technical workshop planned']);
          break;
      }

      await prisma.opportunityActivity.create({
        data: {
          opportunityId: opportunity.id,
          userId: owner.id,
          activityType: actType,
          description,
          oldValue,
          newValue,
          metadata: actType === 'MEETING_SCHEDULED' ? { location: 'Virtual', duration: '60 mins' } : null,
          createdAt: randomDateWithin(60),
        },
      });
    }
  }

  console.log(`  ✓ Created ${createdOpportunities.length} opportunities with line items and activities`);

  // Create Quotes for opportunities that have QUOTE_CREATED status or are in later stages
  console.log("  Creating quotes from opportunities...");

  const opportunitiesForQuotes = createdOpportunities.filter(
    o => o.status === OpportunityStatus.QUOTE_CREATED ||
         o.stage === OpportunityStage.PROPOSAL ||
         o.stage === OpportunityStage.NEGOTIATION ||
         o.stage === OpportunityStage.CLOSED_WON
  );

  const createdQuotes: {
    id: number;
    quoteNumber: string;
    status: QuoteStatus;
    isPrimary: boolean;
    opportunityId: number;
    accountId: number;
    grandTotal: number;
  }[] = [];

  for (const opp of opportunitiesForQuotes) {
    // Get opportunity line items
    const oppLineItems = await prisma.opportunityLineItem.findMany({
      where: { opportunityId: opp.id },
      include: { product: true, priceBookEntry: true },
    });

    // Calculate totals
    const subtotal = oppLineItems.reduce((sum, li) => sum + Number(li.totalPrice), 0);
    const discountPercent = randInt(0, 10);
    const discount = subtotal * (discountPercent / 100);
    const taxPercent = 18; // GST
    const taxAmount = (subtotal - discount) * (taxPercent / 100);
    const shippingAmount = randInt(0, 5000);
    const grandTotal = subtotal - discount + taxAmount + shippingAmount;

    // Determine quote status based on opportunity stage
    let quoteStatus: QuoteStatus = QuoteStatus.DRAFT;
    if (opp.stage === OpportunityStage.CLOSED_WON) {
      quoteStatus = QuoteStatus.ACCEPTED;
    } else if (opp.stage === OpportunityStage.NEGOTIATION) {
      quoteStatus = pick([QuoteStatus.PRESENTED, QuoteStatus.APPROVED]);
    } else if (opp.stage === OpportunityStage.PROPOSAL) {
      quoteStatus = pick([QuoteStatus.IN_REVIEW, QuoteStatus.APPROVED, QuoteStatus.PRESENTED]);
    }

    const account = allAccounts.find(a => a.id === opp.accountId)!;
    const contact = opp.contactId ? allContacts.find(c => c.id === opp.contactId) : null;

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    const quote = await prisma.quote.create({
      data: {
        quoteNumber: generateQuoteNumber(1),
        name: `Quote for ${account.name}`,
        description: `Quotation based on opportunity requirements`,
        status: quoteStatus,
        type: QuoteType.QUOTE,
        version: 1,
        isPrimary: true,
        subtotal,
        discount,
        discountPercent,
        taxAmount,
        taxPercent,
        shippingAmount,
        grandTotal,
        validUntil,
        approvedAt: quoteStatus === QuoteStatus.APPROVED || quoteStatus === QuoteStatus.ACCEPTED || quoteStatus === QuoteStatus.PRESENTED
          ? randomDateWithin(14)
          : null,
        acceptedAt: quoteStatus === QuoteStatus.ACCEPTED ? randomDateWithin(7) : null,
        presentedAt: quoteStatus === QuoteStatus.PRESENTED || quoteStatus === QuoteStatus.ACCEPTED
          ? randomDateWithin(10)
          : null,
        billingName: account.name,
        billingStreet: '123 Business Park',
        billingCity: pick(cities),
        billingState: pick(states),
        billingPostalCode: pick(pincodes),
        billingCountry: 'India',
        shippingName: account.name,
        shippingStreet: '123 Business Park',
        shippingCity: pick(cities),
        shippingState: pick(states),
        shippingPostalCode: pick(pincodes),
        shippingCountry: 'India',
        paymentTerms: pick(['Net 30', 'Net 45', 'Net 60', '50% Advance, 50% on Delivery']),
        deliveryTerms: pick(['Within 2 weeks', 'Within 30 days', 'As per schedule']),
        notes: 'Thank you for your business. This quote is valid for 30 days.',
        internalNotes: 'Standard pricing applied with approved discount.',
        opportunityId: opp.id,
        accountId: opp.accountId,
        contactId: opp.contactId,
        preparedById: opp.ownerId,
        approvedById: quoteStatus !== QuoteStatus.DRAFT && quoteStatus !== QuoteStatus.IN_REVIEW
          ? adminUser.id
          : null,
      },
    });

    createdQuotes.push({
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      status: quote.status,
      isPrimary: quote.isPrimary,
      opportunityId: quote.opportunityId,
      accountId: quote.accountId,
      grandTotal: Number(quote.grandTotal),
    });

    // Copy line items from opportunity to quote
    for (let j = 0; j < oppLineItems.length; j++) {
      const oli = oppLineItems[j];
      await prisma.quoteLineItem.create({
        data: {
          quoteId: quote.id,
          productId: oli.productId,
          priceBookEntryId: oli.priceBookEntryId,
          quantity: oli.quantity,
          listPrice: oli.listPrice,
          unitPrice: oli.unitPrice,
          discount: oli.discount,
          totalPrice: oli.totalPrice,
          description: oli.description,
          sortOrder: oli.sortOrder,
        },
      });
    }
  }

  console.log(`  ✓ Created ${createdQuotes.length} quotes with line items`);

  // Create Sales Orders from ACCEPTED quotes
  console.log("  Creating sales orders from accepted quotes...");

  const acceptedQuotes = createdQuotes.filter(q => q.status === QuoteStatus.ACCEPTED);
  const createdOrders: { id: number; orderNumber: string; status: SalesOrderStatus }[] = [];

  for (const quote of acceptedQuotes) {
    const fullQuote = await prisma.quote.findUnique({
      where: { id: quote.id },
      include: { lineItems: { include: { product: true } } },
    });

    if (!fullQuote) continue;

    // Determine order status - some delivered, some in progress
    const orderStatus = pick([
      SalesOrderStatus.APPROVED,
      SalesOrderStatus.IN_FULFILLMENT,
      SalesOrderStatus.SHIPPED,
      SalesOrderStatus.DELIVERED,
    ]);

    const expectedShip = new Date();
    expectedShip.setDate(expectedShip.getDate() + randInt(7, 21));

    const expectedDelivery = new Date(expectedShip);
    expectedDelivery.setDate(expectedDelivery.getDate() + randInt(3, 7));

    const order = await prisma.salesOrder.create({
      data: {
        orderNumber: generateOrderNumber(),
        name: `Order - ${fullQuote.name}`,
        description: fullQuote.description,
        status: orderStatus,
        subtotal: fullQuote.subtotal,
        discount: fullQuote.discount,
        discountPercent: fullQuote.discountPercent,
        taxAmount: fullQuote.taxAmount,
        taxPercent: fullQuote.taxPercent,
        shippingAmount: fullQuote.shippingAmount,
        grandTotal: fullQuote.grandTotal,
        orderDate: randomDateWithin(14),
        expectedShipDate: expectedShip,
        actualShipDate: orderStatus === SalesOrderStatus.SHIPPED || orderStatus === SalesOrderStatus.DELIVERED
          ? randomDateWithin(7)
          : null,
        expectedDeliveryDate: expectedDelivery,
        actualDeliveryDate: orderStatus === SalesOrderStatus.DELIVERED
          ? randomDateWithin(3)
          : null,
        approvedAt: orderStatus !== SalesOrderStatus.DRAFT && orderStatus !== SalesOrderStatus.PENDING_APPROVAL
          ? randomDateWithin(10)
          : null,
        billingName: fullQuote.billingName,
        billingStreet: fullQuote.billingStreet,
        billingCity: fullQuote.billingCity,
        billingState: fullQuote.billingState,
        billingPostalCode: fullQuote.billingPostalCode,
        billingCountry: fullQuote.billingCountry,
        shippingName: fullQuote.shippingName,
        shippingStreet: fullQuote.shippingStreet,
        shippingCity: fullQuote.shippingCity,
        shippingState: fullQuote.shippingState,
        shippingPostalCode: fullQuote.shippingPostalCode,
        shippingCountry: fullQuote.shippingCountry,
        paymentTerms: fullQuote.paymentTerms,
        deliveryTerms: fullQuote.deliveryTerms,
        notes: fullQuote.notes,
        internalNotes: 'Order created from accepted quote.',
        quoteId: fullQuote.id,
        accountId: fullQuote.accountId,
        contactId: fullQuote.contactId,
        ownerId: fullQuote.preparedById,
        approvedById: adminUser.id,
      },
    });

    createdOrders.push({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
    });

    // Copy line items from quote to order
    for (const qli of fullQuote.lineItems) {
      await prisma.salesOrderLineItem.create({
        data: {
          salesOrderId: order.id,
          productId: qli.productId,
          quantity: qli.quantity,
          listPrice: qli.listPrice,
          unitPrice: qli.unitPrice,
          discount: qli.discount,
          totalPrice: qli.totalPrice,
          description: qli.description,
          sortOrder: qli.sortOrder,
        },
      });
    }
  }

  console.log(`  ✓ Created ${createdOrders.length} sales orders with line items`);

  console.log("\n✅ Opportunity-Quote-Order seed data complete!");
  console.log(`   - ${createdOpportunities.length} Opportunities`);
  console.log(`   - ${createdQuotes.length} Quotes`);
  console.log(`   - ${createdOrders.length} Sales Orders`);

  console.log('\n🤝 Seeding KPT Channel Partners, Stock & Incentives...\n');

  // KPT SKU master — single source of truth for all KPT products
  const kptSkus = [
    { productName: 'KPT 100mm Angle Grinder KPT-AG4', sku: 'KPT-AG4-001', category: 'Grinders', unitPrice: 2850 },
    { productName: 'KPT 115mm Angle Grinder KPT-AG5', sku: 'KPT-AG5-001', category: 'Grinders', unitPrice: 3200 },
    { productName: 'KPT 180mm Angle Grinder KPT-AG7', sku: 'KPT-AG7-001', category: 'Grinders', unitPrice: 5400 },
    { productName: 'KPT 13mm Impact Drill KPT-ID13', sku: 'KPT-ID13-001', category: 'Drills', unitPrice: 3600 },
    { productName: 'KPT SDS Plus Rotary Hammer KPT-SDS', sku: 'KPT-SDS-001', category: 'Drills', unitPrice: 8500 },
    { productName: 'KPT Demolition Hammer KPT-DH', sku: 'KPT-DH-001', category: 'Hammers', unitPrice: 12500 },
    { productName: 'KPT Cordless Drill 18V KPT-CD18', sku: 'KPT-CD18-001', category: 'Drills', unitPrice: 6200 },
    { productName: 'KPT Impact Wrench KPT-IW', sku: 'KPT-IW-001', category: 'Others', unitPrice: 7200 },
  ];

  // Incentive Slabs
  await prisma.incentiveSlab.createMany({
    data: [
      { tier: PartnerTier.BRONZE,   minSaleAmount: 0,       maxSaleAmount: 500000,  incentivePercent: 2.0, description: 'Bronze tier — up to ₹5L monthly sales',     isActive: true },
      { tier: PartnerTier.SILVER,   minSaleAmount: 500001,  maxSaleAmount: 1500000, incentivePercent: 3.5, description: 'Silver tier — ₹5L–₹15L monthly sales',      isActive: true },
      { tier: PartnerTier.GOLD,     minSaleAmount: 1500001, maxSaleAmount: 3000000, incentivePercent: 5.0, description: 'Gold tier — ₹15L–₹30L monthly sales',       isActive: true },
      { tier: PartnerTier.PLATINUM, minSaleAmount: 3000001, maxSaleAmount: null,    incentivePercent: 7.0, description: 'Platinum tier — above ₹30L monthly sales',  isActive: true },
    ],
  });

  const createdSlabs = await prisma.incentiveSlab.findMany({ orderBy: { minSaleAmount: 'asc' } });
  const slabByTier: Record<string, (typeof createdSlabs)[0] | undefined> = {
    BRONZE:   createdSlabs.find(s => s.tier === PartnerTier.BRONZE),
    SILVER:   createdSlabs.find(s => s.tier === PartnerTier.SILVER),
    GOLD:     createdSlabs.find(s => s.tier === PartnerTier.GOLD),
    PLATINUM: createdSlabs.find(s => s.tier === PartnerTier.PLATINUM),
  };

  // Channel Partners
  // KptPartner applications: 8 activated + 3 pending (stage 1-3) + 3 eligible (stage 4+)
  const kptApplicationData = [
    // 8 activated — linked to ChannelPartners via CRN
    { crn: 'KPT-CP-2026-00001', ownerName: 'Suresh Patil',   firmName: 'Shree Ganesh Industrial Tools', mobile: '9823456789', email: 'suresh@sgtools.in',          city: 'Pune',      state: 'Maharashtra', pincode: '411001', currentStage: 5, status: 'activated' },
    { crn: 'KPT-CP-2026-00002', ownerName: 'Ramesh Desai',   firmName: 'Mahalaxmi Hardware & Tools',    mobile: '9812345678', email: 'ramesh@mahalaxmitools.com',   city: 'Kolhapur',  state: 'Maharashtra', pincode: '416001', currentStage: 5, status: 'activated' },
    { crn: 'KPT-CP-2026-00003', ownerName: 'Kiran Hegde',    firmName: 'Kaveri Tools & Equipment',      mobile: '9876543210', email: 'kiran@kaveritools.co.in',     city: 'Belgaum',   state: 'Karnataka',   pincode: '590001', currentStage: 5, status: 'activated' },
    { crn: 'KPT-CP-2026-00004', ownerName: 'Anil Jadhav',    firmName: 'Aarav Engineering Supplies',    mobile: '9765432109', email: 'anil@aaraveng.com',           city: 'Satara',    state: 'Maharashtra', pincode: '415001', currentStage: 4, status: 'activated' },
    { crn: 'KPT-CP-2026-00005', ownerName: 'Vijay Shinde',   firmName: 'Vishwakarma Power Tools',       mobile: '9654321098', email: 'vijay@vkpowertools.com',      city: 'Sangli',    state: 'Maharashtra', pincode: '416416', currentStage: 4, status: 'activated' },
    { crn: 'KPT-CP-2026-00006', ownerName: 'Santosh More',   firmName: 'Om Sai Hardware Store',         mobile: '9543210987', email: 'santosh@omsaihardware.com',   city: 'Solapur',   state: 'Maharashtra', pincode: '413001', currentStage: 4, status: 'activated' },
    { crn: 'KPT-CP-2026-00007', ownerName: 'Ravi Kumar',     firmName: 'Siddharth Industrial Corp',     mobile: '9432109876', email: 'ravi@sidindustrials.in',      city: 'Hubli',     state: 'Karnataka',   pincode: '580020', currentStage: 4, status: 'activated' },
    { crn: 'KPT-CP-2026-00008', ownerName: 'Deepak Naik',    firmName: 'Konkan Power Equipment',        mobile: '9321098765', email: 'deepak@konkanpower.com',      city: 'Panaji',    state: 'Goa',         pincode: '403001', currentStage: 4, status: 'activated' },
    // 3 pending / in-progress (stage 1-3) — do NOT appear in eligible-applications dropdown
    { crn: 'KPT-CP-2026-00009', ownerName: 'Prashant Jagtap', firmName: 'Jagtap Tools & Hardware',     mobile: '9210987654', email: 'prashant@jagtaptools.com',    city: 'Nashik',    state: 'Maharashtra', pincode: '422001', currentStage: 2, status: 'visit_scheduled' },
    { crn: 'KPT-CP-2026-00010', ownerName: 'Meena Kulkarni',  firmName: 'Kulkarni Power Centre',       mobile: '9109876543', email: 'meena@kulkarnipowers.com',    city: 'Aurangabad', state: 'Maharashtra', pincode: '431001', currentStage: 1, status: 'enquiry_received' },
    { crn: 'KPT-CP-2026-00011', ownerName: 'Harish Gowda',    firmName: 'Gowda Industrial Suppliers',  mobile: '9098765432', email: 'harish@gowdaindustrial.in',   city: 'Mysore',    state: 'Karnataka',   pincode: '570001', currentStage: 3, status: 'docs_submitted' },
    // 3 approved but not yet activated (stage 4+) — appear in eligible-applications dropdown
    { crn: 'KPT-CP-2026-00012', ownerName: 'Bhaskar Rao',     firmName: 'Rao Engineering Works',       mobile: '8987654321', email: 'bhaskar@raoengworks.com',     city: 'Hyderabad', state: 'Telangana',   pincode: '500001', currentStage: 5, status: 'approved' },
    { crn: 'KPT-CP-2026-00013', ownerName: 'Sunita Pawar',    firmName: 'Pawar Industrial Hardware',   mobile: '8876543210', email: 'sunita@pawarindustrial.com',  city: 'Nanded',    state: 'Maharashtra', pincode: '431601', currentStage: 4, status: 'approved' },
    { crn: 'KPT-CP-2026-00014', ownerName: 'Girish Nair',     firmName: 'Nair Tools & Machinery',      mobile: '8765432109', email: 'girish@nairtools.in',          city: 'Kochi',     state: 'Kerala',      pincode: '682001', currentStage: 4, status: 'approved' },
  ];

  for (const app of kptApplicationData) {
    await prisma.kptPartner.create({ data: app });
  }

  const partnerData = [
    { crn: 'KPT-CP-2026-00001', code: 'DIST-MH-001', name: 'Shree Ganesh Industrial Tools', type: PartnerType.DISTRIBUTOR, tier: PartnerTier.GOLD,     contactName: 'Suresh Patil',  contactPhone: '9823456789', contactEmail: 'suresh@sgtools.in',        city: 'Pune',     state: 'Maharashtra', region: 'West',  targetAmount: 3600000 },
    { crn: 'KPT-CP-2026-00002', code: 'DIST-MH-002', name: 'Mahalaxmi Hardware & Tools',    type: PartnerType.DISTRIBUTOR, tier: PartnerTier.SILVER,   contactName: 'Ramesh Desai',  contactPhone: '9812345678', contactEmail: 'ramesh@mahalaxmitools.com', city: 'Kolhapur', state: 'Maharashtra', region: 'West',  targetAmount: 2400000 },
    { crn: 'KPT-CP-2026-00003', code: 'DIST-KA-001', name: 'Kaveri Tools & Equipment',       type: PartnerType.DISTRIBUTOR, tier: PartnerTier.GOLD,     contactName: 'Kiran Hegde',   contactPhone: '9876543210', contactEmail: 'kiran@kaveritools.co.in',  city: 'Belgaum',  state: 'Karnataka',   region: 'South', targetAmount: 2800000 },
    { crn: 'KPT-CP-2026-00004', code: 'DLRA-MH-001', name: 'Aarav Engineering Supplies',     type: PartnerType.DEALER,      tier: PartnerTier.SILVER,   contactName: 'Anil Jadhav',   contactPhone: '9765432109', contactEmail: null,                       city: 'Satara',   state: 'Maharashtra', region: 'West',  targetAmount: 1200000 },
    { crn: 'KPT-CP-2026-00005', code: 'DLRA-MH-002', name: 'Vishwakarma Power Tools',        type: PartnerType.DEALER,      tier: PartnerTier.BRONZE,   contactName: 'Vijay Shinde',  contactPhone: '9654321098', contactEmail: null,                       city: 'Sangli',   state: 'Maharashtra', region: 'West',  targetAmount: 600000  },
    { crn: 'KPT-CP-2026-00006', code: 'DLRA-MH-003', name: 'Om Sai Hardware Store',          type: PartnerType.DEALER,      tier: PartnerTier.BRONZE,   contactName: 'Santosh More',  contactPhone: '9543210987', contactEmail: null,                       city: 'Solapur',  state: 'Maharashtra', region: 'West',  targetAmount: 600000  },
    { crn: 'KPT-CP-2026-00007', code: 'DLRA-KA-001', name: 'Siddharth Industrial Corp',      type: PartnerType.DEALER,      tier: PartnerTier.SILVER,   contactName: 'Ravi Kumar',    contactPhone: '9432109876', contactEmail: 'ravi@sidindustrials.in',   city: 'Hubli',    state: 'Karnataka',   region: 'South', targetAmount: 1000000 },
    { crn: 'KPT-CP-2026-00008', code: 'DLRA-GOA-001', name: 'Konkan Power Equipment',         type: PartnerType.DEALER,      tier: PartnerTier.BRONZE,   contactName: 'Deepak Naik',   contactPhone: '9321098765', contactEmail: null,                       city: 'Panaji',   state: 'Goa',         region: 'West',  targetAmount: 500000  },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kptPartners: any[] = [];
  for (const p of partnerData) {
    const partner = await prisma.channelPartner.create({
      data: {
        code: p.code,
        name: p.name,
        type: p.type,
        tier: p.tier,
        status: PartnerStatus.ACTIVE,
        contactName: p.contactName,
        contactEmail: p.contactEmail,
        contactPhone: p.contactPhone,
        city: p.city,
        state: p.state,
        region: p.region,
        crn: p.crn,
        activatedAt: new Date(),
        creditLimit: p.type === PartnerType.DISTRIBUTOR ? 1000000 : 300000,
        outstandingPayment: 0,
        currentMonthSales: 0,
        ytdSales: 0,
        targetAmount: p.targetAmount,
      },
    });
    kptPartners.push({ ...p, id: partner.id });
  }

  // ── InventoryItems: warehouse master stock ────────────────────────────────
  const invItemMap = new Map<string, { id: number; totalQty: number }>();
  for (const sku of kptSkus) {
    const warehouseQty = randInt(200, 500);
    const invItem = await prisma.inventoryItem.create({
      data: {
        productName: sku.productName,
        sku: sku.sku,
        category: sku.category,
        totalQty: warehouseQty,
        minStockQty: 50,
        reorderQty: 100,
        unitPrice: sku.unitPrice,
        stockStatus: StockStatus.HEALTHY,
      },
    });
    invItemMap.set(sku.sku, { id: invItem.id, totalQty: warehouseQty });

    // Link to Product record if one exists with matching code
    const linkedProduct = products.find(p => p.code === sku.sku);
    if (linkedProduct) {
      await prisma.inventoryItem.update({
        where: { id: invItem.id },
        data: { productId: linkedProduct.id },
      });
    }
  }

  // ── Partner SalesOrders: 3–4 per partner, spread across Jan–Aug 2026 ─────
  const kptDistAccount = await prisma.account.create({
    data: { name: 'KPT Distribution Network' },
  });

  // Slice products array to get only KPT power tool products (first 8)
  const kptProducts = products.slice(0, 8);
  let partnerOrderNum = 1;

  interface PartnerOrderRec { partnerId: number; orderId: number; grandTotal: number; orderDate: Date }
  const partnerOrders: PartnerOrderRec[] = [];

  // Spread orders across 8 months: [month(1-based), day]
  const orderSlots = [
    [1,15],[2,10],[3,20],[4,5],[5,18],[6,12],[7,8],[8,3],
    [1,28],[2,25],[3,5],[4,22],[5,3],[6,28],[7,25],[8,15],
    [2,8],[3,28],[4,10],[5,25],[6,5],[7,18],[8,22],[1,5],
    [3,15],[4,28],[5,10],[6,20],[7,3],[8,28],[1,22],[2,18],
  ];
  let slotIdx = 0;

  for (const partner of kptPartners) {
    const numOrders = partner.type === PartnerType.DISTRIBUTOR ? 4 : 3;
    for (let oi = 0; oi < numOrders; oi++) {
      const [month, day] = orderSlots[slotIdx++ % orderSlots.length];
      const orderDate = new Date(2026, (month as number) - 1, day as number);
      const numItems = randInt(2, 4);
      const selectedProds = [...kptProducts].sort(() => Math.random() - 0.5).slice(0, numItems);

      let subtotal = 0;
      const lineItems = selectedProds.map((prod, idx) => {
        const qty = randInt(5, 30);
        const total = qty * prod.price;
        subtotal += total;
        return {
          productId: prod.id,
          quantity: qty,
          listPrice: prod.price,
          unitPrice: prod.price,
          discount: 0,
          totalPrice: total,
          sortOrder: idx,
        };
      });
      const taxAmount = Math.round(subtotal * 0.18);
      const grandTotal = subtotal + taxAmount;

      const orderStatus = oi === 0
        ? SalesOrderStatus.DELIVERED
        : oi === 1
          ? SalesOrderStatus.SHIPPED
          : SalesOrderStatus.APPROVED;

      const order = await prisma.salesOrder.create({
        data: {
          orderNumber: `KPT-26${String(month).padStart(2,'0')}-${String(partnerOrderNum++).padStart(4,'0')}`,
          name: `${partner.name} — Dist. Order ${oi + 1}`,
          status: orderStatus,
          subtotal,
          discount: 0,
          discountPercent: 0,
          taxAmount,
          taxPercent: 18,
          shippingAmount: 0,
          grandTotal,
          orderDate,
          expectedShipDate: new Date(orderDate.getTime() + 7 * 86400000),
          actualShipDate: orderStatus !== SalesOrderStatus.APPROVED ? new Date(orderDate.getTime() + 5 * 86400000) : null,
          expectedDeliveryDate: new Date(orderDate.getTime() + 14 * 86400000),
          actualDeliveryDate: orderStatus === SalesOrderStatus.DELIVERED ? new Date(orderDate.getTime() + 12 * 86400000) : null,
          approvedAt: new Date(orderDate.getTime() + 2 * 86400000),
          billingName: partner.name,
          billingCity: partner.city,
          billingState: partner.state,
          billingCountry: 'India',
          shippingName: partner.name,
          shippingCity: partner.city,
          shippingState: partner.state,
          shippingCountry: 'India',
          paymentTerms: 'Net 30',
          deliveryTerms: 'Within 2 weeks',
          accountId: kptDistAccount.id,
          ownerId: kptAdminUser.id,
          approvedById: kptAdminUser.id,
          channelPartnerId: partner.id,
          lineItems: { create: lineItems },
        },
      });

      partnerOrders.push({ partnerId: partner.id, orderId: order.id, grandTotal, orderDate });
    }
  }

  console.log(`  ✓ Created ${partnerOrders.length} partner-linked sales orders`);

  // Update ytdSales from actual orders (derived, not hardcoded)
  const ytdCutoff = new Date('2026-01-01');
  for (const partner of kptPartners) {
    const ytdOrders = partnerOrders.filter(o => o.partnerId === partner.id && o.orderDate >= ytdCutoff);
    const ytdSales = ytdOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const now = new Date();
    const monthOrders = partnerOrders.filter(o =>
      o.partnerId === partner.id &&
      o.orderDate.getFullYear() === now.getFullYear() &&
      o.orderDate.getMonth() === now.getMonth()
    );
    const currentMonthSales = monthOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    await prisma.channelPartner.update({
      where: { id: partner.id },
      data: { ytdSales, currentMonthSales },
    });
  }

  // ── Stock entries per partner (linked to InventoryItems) ──────────────────
  function getStockStatus(qty: number, minQty: number): StockStatus {
    if (qty === 0) return StockStatus.OUT_OF_STOCK;
    if (qty <= 5) return StockStatus.CRITICAL;
    if (qty < minQty) return StockStatus.LOW;
    return StockStatus.HEALTHY;
  }

  // Track running warehouse qty per SKU for movement records
  const warehouseQtyRemaining = new Map<string, number>(
    kptSkus.map(s => [s.sku, invItemMap.get(s.sku)!.totalQty])
  );

  for (const partner of kptPartners) {
    const numSkus = partner.type === PartnerType.DISTRIBUTOR ? 8 : randInt(4, 6);
    const selectedSkus = kptSkus.slice(0, numSkus);
    for (const sku of selectedSkus) {
      const minQty = partner.type === PartnerType.DISTRIBUTOR ? 20 : 10;
      const stockQty = randInt(0, 40);
      const invEntry = invItemMap.get(sku.sku);
      const stockEntry = await prisma.stockEntry.create({
        data: {
          partnerId: partner.id,
          inventoryItemId: invEntry?.id ?? null,
          productName: sku.productName,
          sku: sku.sku,
          category: sku.category,
          stockQty,
          minStockQty: minQty,
          reorderQty: minQty * 2,
          unitPrice: sku.unitPrice,
          stockStatus: getStockStatus(stockQty, minQty),
        },
      });

      // Create StockMovement (DISPATCH: warehouse → partner)
      if (invEntry && stockQty > 0) {
        const qtyBefore = warehouseQtyRemaining.get(sku.sku) ?? invEntry.totalQty;
        const qtyAfter = Math.max(0, qtyBefore - stockQty);
        warehouseQtyRemaining.set(sku.sku, qtyAfter);
        await prisma.stockMovement.create({
          data: {
            inventoryItemId: invEntry.id,
            stockEntryId: stockEntry.id,
            partnerId: partner.id,
            movementType: MovementType.DISPATCH,
            quantity: stockQty,
            qtyBefore,
            qtyAfter,
            reference: `DISP-${partner.code}-${sku.sku}`,
            notes: 'Initial stock dispatch to partner',
            createdBy: kptAdminUser.id,
          },
        });
      }
    }
  }

  // Update InventoryItem.totalQty to reflect actual warehouse stock after dispatches
  for (const [sku, remaining] of warehouseQtyRemaining.entries()) {
    const invEntry = invItemMap.get(sku);
    if (invEntry) {
      await prisma.inventoryItem.update({
        where: { id: invEntry.id },
        data: {
          totalQty: remaining,
          stockStatus: getStockStatus(remaining, 50),
        },
      });
    }
  }

  // Partner Incentives for last 3 months (with slab FK)
  const months = ['2026-05', '2026-06', '2026-07'];
  for (const partner of kptPartners) {
    const slab = slabByTier[partner.tier];
    const incentivePercent = slab?.incentivePercent ??
      (partner.tier === PartnerTier.GOLD || partner.tier === PartnerTier.PLATINUM ? 5.0 :
       partner.tier === PartnerTier.SILVER ? 3.5 : 2.0);

    for (const period of months) {
      // Derive salesAmount from partner orders for that month
      const [periodYear, periodMonth] = period.split('-').map(Number);
      const periodOrders = partnerOrders.filter(o =>
        o.partnerId === partner.id &&
        o.orderDate.getFullYear() === periodYear &&
        o.orderDate.getMonth() + 1 === periodMonth
      );
      const salesAmount = periodOrders.length > 0
        ? Math.round(periodOrders.reduce((sum, o) => sum + o.grandTotal, 0))
        : Math.round(partner.targetAmount / 8 * (0.7 + Math.random() * 0.5));

      const incentiveAmount = Math.floor(salesAmount * incentivePercent / 100);
      const statusChoices = period === '2026-05'
        ? [IncentiveStatus.PAID, IncentiveStatus.APPROVED]
        : period === '2026-06'
          ? [IncentiveStatus.APPROVED, IncentiveStatus.UNDER_REVIEW]
          : [IncentiveStatus.PENDING, IncentiveStatus.UNDER_REVIEW];
      const status = statusChoices[Math.floor(Math.random() * statusChoices.length)];

      await prisma.partnerIncentive.create({
        data: {
          partnerId: partner.id,
          slabId: slab?.id ?? null,
          period,
          salesAmount,
          incentivePercent,
          incentiveAmount,
          status,
          remarks: status === IncentiveStatus.PAID ? 'Payment processed via NEFT' : null,
          approvedAt: status === IncentiveStatus.APPROVED || status === IncentiveStatus.PAID ? new Date(`${period}-20`) : null,
          paidAt: status === IncentiveStatus.PAID ? new Date(`${period}-28`) : null,
        },
      });
    }
  }

  console.log(`  ✓ Seeded ${kptPartners.length} channel partners with linked orders, stock, movements & incentives`);

  // Fetch back actual IDs so audit logs reference real entities
  const kptPartnerIds = kptPartners.map(p => p.id);
  const [seedStockEntries, seedIncentives, seedSlabs] = await Promise.all([
    prisma.stockEntry.findMany({ where: { partnerId: { in: kptPartnerIds } }, orderBy: { id: 'asc' } }),
    prisma.partnerIncentive.findMany({ where: { partnerId: { in: kptPartnerIds } }, orderBy: [{ partnerId: 'asc' }, { period: 'asc' }] }),
    prisma.incentiveSlab.findMany({ orderBy: { id: 'asc' } }),
  ]);

  const incFor = (partnerId: number, period: string) =>
    seedIncentives.find(i => i.partnerId === partnerId && i.period === period);
  const stockFor = (partnerId: number, sku: string) =>
    seedStockEntries.find(s => s.partnerId === partnerId && s.sku === sku);

  // Build timestamp: N days ago at a specific hour:minute
  function ts(daysAgo: number, hour = 10, min = 0): Date {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, min, 0, 0);
    return d;
  }

  const p = kptPartners;
  const SALES = AuditCategory.SALES_MANAGEMENT;

  const kptAuditEntries: any[] = [

    // ── Day -30: All 8 partners onboarded by Rajesh Kulkarni (KPT Admin) ──
    ...p.map((partner, i) => ({
      entityType: 'ChannelPartner', entityId: partner.id,
      changedBy: kptAdminUser.id, action: 'PARTNER_CREATED',
      newValues: { code: partner.code, name: partner.name, type: partner.type, tier: partner.tier, city: partner.city, state: partner.state, contactName: partner.contactName },
      category: SALES, subCategory: 'Partner Onboarding',
      changedAt: ts(30, 9 + Math.floor(i / 3), (i % 3) * 15),
    })),

    // ── Day -28: Initial stock setup for GOLD distributors ──
    ...[
      stockFor(p[0].id, 'KPT-AG4-001'),
      stockFor(p[0].id, 'KPT-SDS-001'),
      stockFor(p[2].id, 'KPT-AG4-001'),
    ].filter(Boolean).map((s, i) => ({
      entityType: 'StockEntry', entityId: s!.id,
      changedBy: adminUser.id, action: 'STOCK_CREATED',
      newValues: { productName: s!.productName, sku: s!.sku, stockQty: s!.stockQty, minStockQty: s!.minStockQty, stockStatus: s!.stockStatus },
      category: SALES, subCategory: 'Initial Setup',
      changedAt: ts(28, 10 + i, 0),
    })),

    // ── Day -24: Credit limit revision for distributors ──
    { entityType: 'ChannelPartner', entityId: p[0].id, changedBy: kptAdminUser.id, action: 'PARTNER_UPDATED', oldValues: { creditLimit: 500000 }, newValues: { creditLimit: 1000000 }, category: SALES, subCategory: 'Credit Review', changedAt: ts(24, 11, 0) },
    { entityType: 'ChannelPartner', entityId: p[1].id, changedBy: kptAdminUser.id, action: 'PARTNER_UPDATED', oldValues: { creditLimit: 600000 }, newValues: { creditLimit: 1000000 }, category: SALES, subCategory: 'Credit Review', changedAt: ts(24, 11, 20) },
    { entityType: 'ChannelPartner', entityId: p[2].id, changedBy: kptAdminUser.id, action: 'PARTNER_UPDATED', oldValues: { creditLimit: 400000 }, newValues: { creditLimit: 1000000 }, category: SALES, subCategory: 'Credit Review', changedAt: ts(24, 11, 40) },

    // ── Day -21: Aarav Engineering tier upgrade SILVER → GOLD ──
    { entityType: 'ChannelPartner', entityId: p[3].id, changedBy: adminUser.id, action: 'PARTNER_UPDATED', oldValues: { tier: 'SILVER', targetAmount: 1000000 }, newValues: { tier: 'GOLD', targetAmount: 1200000 }, category: SALES, subCategory: 'Tier Upgrade', changedAt: ts(21, 14, 30) },

    // ── Day -17: May 2026 incentive records opened for top 5 partners ──
    ...[p[0], p[1], p[2], p[3], p[6]].map((partner, i) => {
      const inc = incFor(partner.id, '2026-05');
      if (!inc) return null;
      return { entityType: 'PartnerIncentive', entityId: inc.id, changedBy: kptAdminUser.id, action: 'INCENTIVE_CREATED', newValues: { partnerName: partner.name, period: '2026-05', salesAmount: inc.salesAmount, incentivePercent: inc.incentivePercent, incentiveAmount: inc.incentiveAmount, status: 'PENDING' }, category: SALES, subCategory: 'May 2026 Cycle', changedAt: ts(17, 10 + i, 0) };
    }).filter(Boolean),

    // ── Day -14: May incentives submitted for review ──
    ...[p[0], p[2], p[3]].map((partner, i) => {
      const inc = incFor(partner.id, '2026-05');
      if (!inc) return null;
      return { entityType: 'PartnerIncentive', entityId: inc.id, changedBy: adminUser.id, action: 'INCENTIVE_UPDATED', oldValues: { status: 'PENDING' }, newValues: { status: 'UNDER_REVIEW' }, category: SALES, subCategory: 'May 2026 Review', changedAt: ts(14, 11 + i, 15) };
    }).filter(Boolean),

    // ── Day -11: May incentives approved (Super Admin) ──
    ...[p[0], p[2]].map((partner, i) => {
      const inc = incFor(partner.id, '2026-05');
      if (!inc) return null;
      return { entityType: 'PartnerIncentive', entityId: inc.id, changedBy: superAdminUser.id, action: 'INCENTIVE_UPDATED', oldValues: { status: 'UNDER_REVIEW' }, newValues: { status: 'APPROVED', approvedAt: '2026-07-31' }, category: SALES, subCategory: 'May 2026 Approval', changedAt: ts(11, 15 + i, 0) };
    }).filter(Boolean),

    // ── Day -10: May incentives paid via NEFT ──
    ...[p[0], p[2]].map((partner, i) => {
      const inc = incFor(partner.id, '2026-05');
      if (!inc) return null;
      return { entityType: 'PartnerIncentive', entityId: inc.id, changedBy: superAdminUser.id, action: 'INCENTIVE_UPDATED', oldValues: { status: 'APPROVED' }, newValues: { status: 'PAID', paidAt: '2026-08-01', remarks: 'Payment processed via NEFT' }, category: SALES, subCategory: 'May 2026 Payment', changedAt: ts(10, 10 + i * 2, 30) };
    }).filter(Boolean),

    // ── Day -9: Silver incentive slab rate revised 3.5% → 4.0% ──
    seedSlabs[1] ? { entityType: 'IncentiveSlab', entityId: seedSlabs[1].id, changedBy: superAdminUser.id, action: 'INCENTIVE_SLAB_UPDATED', oldValues: { tier: 'SILVER', incentivePercent: 3.5 }, newValues: { tier: 'SILVER', incentivePercent: 4.0 }, category: SALES, subCategory: 'Slab Rate Revision', changedAt: ts(9, 14, 0) } : null,

    // ── Day -7: Restocking after Pune warehouse delivery ──
    ...[
      { s: stockFor(p[0].id, 'KPT-AG4-001'), oldQty: 5, newQty: 35 },
      { s: stockFor(p[1].id, 'KPT-ID13-001'), oldQty: 3, newQty: 25 },
      { s: stockFor(p[2].id, 'KPT-SDS-001'), oldQty: 2, newQty: 18 },
    ].filter(x => x.s).map(({ s, oldQty, newQty }, i) => ({
      entityType: 'StockEntry', entityId: s!.id, changedBy: kptManagerUser.id, action: 'STOCK_UPDATED',
      oldValues: { stockQty: oldQty, stockStatus: oldQty <= 5 ? 'CRITICAL' : 'LOW' },
      newValues: { stockQty: newQty, stockStatus: 'HEALTHY' },
      category: SALES, subCategory: 'Restocking', changedAt: ts(7, 9 + i, 0),
    })),

    // ── Day -5: Belgaum delivery batch ──
    ...[
      { s: stockFor(p[0].id, 'KPT-DH-001'), oldQty: 0, newQty: 12 },
      { s: stockFor(p[2].id, 'KPT-AG7-001'), oldQty: 4, newQty: 20 },
    ].filter(x => x.s).map(({ s, oldQty, newQty }, i) => ({
      entityType: 'StockEntry', entityId: s!.id, changedBy: kptManagerUser.id, action: 'STOCK_UPDATED',
      oldValues: { stockQty: oldQty, stockStatus: oldQty === 0 ? 'OUT_OF_STOCK' : 'CRITICAL' },
      newValues: { stockQty: newQty, stockStatus: 'HEALTHY' },
      category: SALES, subCategory: 'Restocking', changedAt: ts(5, 11 + i, 30),
    })),

    // ── Day -3: June 2026 incentive records opened ──
    ...[p[0], p[1], p[2], p[3]].map((partner, i) => {
      const inc = incFor(partner.id, '2026-06');
      if (!inc) return null;
      return { entityType: 'PartnerIncentive', entityId: inc.id, changedBy: kptAdminUser.id, action: 'INCENTIVE_CREATED', newValues: { partnerName: partner.name, period: '2026-06', salesAmount: inc.salesAmount, incentivePercent: inc.incentivePercent, incentiveAmount: inc.incentiveAmount, status: 'PENDING' }, category: SALES, subCategory: 'Jun 2026 Cycle', changedAt: ts(3, 10 + i, 0) };
    }).filter(Boolean),

    // ── Day -1: June incentives moved to review for GOLD partners ──
    ...[p[0], p[2]].map((partner, i) => {
      const inc = incFor(partner.id, '2026-06');
      if (!inc) return null;
      return { entityType: 'PartnerIncentive', entityId: inc.id, changedBy: adminUser.id, action: 'INCENTIVE_UPDATED', oldValues: { status: 'PENDING' }, newValues: { status: 'UNDER_REVIEW' }, category: SALES, subCategory: 'Jun 2026 Review', changedAt: ts(1, 15 + i, 0) };
    }).filter(Boolean),

    // ── Today: Vishwakarma Power Tools suspended — payment dispute ──
    { entityType: 'ChannelPartner', entityId: p[4].id, changedBy: kptAdminUser.id, action: 'PARTNER_UPDATED', oldValues: { status: 'ACTIVE' }, newValues: { status: 'SUSPENDED' }, category: SALES, subCategory: 'Account Suspension', changedAt: ts(0, 9, 15) },

    // ── Today: Morning delivery restocked Shree Ganesh AG5 ──
    (() => {
      const s = stockFor(p[0].id, 'KPT-AG5-001');
      if (!s) return null;
      return { entityType: 'StockEntry', entityId: s.id, changedBy: kptManagerUser.id, action: 'STOCK_UPDATED', oldValues: { stockQty: 6, stockStatus: 'LOW' }, newValues: { stockQty: 30, stockStatus: 'HEALTHY' }, category: SALES, subCategory: 'Restocking', changedAt: ts(0, 11, 45) };
    })(),

  ].filter(Boolean);

  for (const entry of kptAuditEntries) {
    await prisma.auditLog.create({ data: entry });
  }

  console.log(`  ✓ Seeded ${kptAuditEntries.length} KPT audit log entries across a 30-day timeline`);

  // ─── FINANCE MODULE SEED ──────────────────────────────────────────────────────
  console.log("\n  📊 Seeding Finance module data...");

  // Clear existing finance data
  await prisma.financeInvoiceItem.deleteMany({});
  await prisma.financeInvoice.deleteMany({});
  await prisma.financeBudget.deleteMany({});
  await prisma.financeIntegrationLog.deleteMany({});

  // Invoices — 14 invoices linked to the 8 channel partners
  const invoiceData = [
    { partnerId: kptPartners[0].id, partner: kptPartners[0], invoiceNumber: 'KPT-INV-00001', status: FinanceInvoiceStatus.PAID,           daysAgo: 150, totalAmount: 285000, paidAmount: 285000, region: kptPartners[0].region },
    { partnerId: kptPartners[2].id, partner: kptPartners[2], invoiceNumber: 'KPT-INV-00002', status: FinanceInvoiceStatus.PAID,           daysAgo: 140, totalAmount: 220000, paidAmount: 220000, region: kptPartners[2].region },
    { partnerId: kptPartners[1].id, partner: kptPartners[1], invoiceNumber: 'KPT-INV-00003', status: FinanceInvoiceStatus.PAID,           daysAgo: 110, totalAmount: 165000, paidAmount: 165000, region: kptPartners[1].region },
    { partnerId: kptPartners[3].id, partner: kptPartners[3], invoiceNumber: 'KPT-INV-00004', status: FinanceInvoiceStatus.PAID,           daysAgo: 95,  totalAmount: 92000,  paidAmount: 92000,  region: kptPartners[3].region },
    { partnerId: kptPartners[0].id, partner: kptPartners[0], invoiceNumber: 'KPT-INV-00005', status: FinanceInvoiceStatus.ISSUED,         daysAgo: 60,  totalAmount: 310000, paidAmount: 0,      region: kptPartners[0].region },
    { partnerId: kptPartners[2].id, partner: kptPartners[2], invoiceNumber: 'KPT-INV-00006', status: FinanceInvoiceStatus.ISSUED,         daysAgo: 45,  totalAmount: 195000, paidAmount: 0,      region: kptPartners[2].region },
    { partnerId: kptPartners[6].id, partner: kptPartners[6], invoiceNumber: 'KPT-INV-00007', status: FinanceInvoiceStatus.ISSUED,         daysAgo: 30,  totalAmount: 78000,  paidAmount: 0,      region: kptPartners[6].region },
    { partnerId: kptPartners[4].id, partner: kptPartners[4], invoiceNumber: 'KPT-INV-00008', status: FinanceInvoiceStatus.OVERDUE,        daysAgo: 75,  totalAmount: 38000,  paidAmount: 0,      region: kptPartners[4].region },
    { partnerId: kptPartners[5].id, partner: kptPartners[5], invoiceNumber: 'KPT-INV-00009', status: FinanceInvoiceStatus.OVERDUE,        daysAgo: 65,  totalAmount: 41000,  paidAmount: 0,      region: kptPartners[5].region },
    { partnerId: kptPartners[1].id, partner: kptPartners[1], invoiceNumber: 'KPT-INV-00010', status: FinanceInvoiceStatus.PARTIALLY_PAID, daysAgo: 50,  totalAmount: 180000, paidAmount: 80000,  region: kptPartners[1].region },
    { partnerId: kptPartners[0].id, partner: kptPartners[0], invoiceNumber: 'KPT-INV-00011', status: FinanceInvoiceStatus.PARTIALLY_PAID, daysAgo: 35,  totalAmount: 245000, paidAmount: 100000, region: kptPartners[0].region },
    { partnerId: kptPartners[7].id, partner: kptPartners[7], invoiceNumber: 'KPT-INV-00012', status: FinanceInvoiceStatus.DRAFT,          daysAgo: 5,   totalAmount: 29000,  paidAmount: 0,      region: kptPartners[7].region },
    { partnerId: kptPartners[3].id, partner: kptPartners[3], invoiceNumber: 'KPT-INV-00013', status: FinanceInvoiceStatus.CANCELLED,      daysAgo: 80,  totalAmount: 56000,  paidAmount: 0,      region: kptPartners[3].region },
    { partnerId: kptPartners[2].id, partner: kptPartners[2], invoiceNumber: 'KPT-INV-00014', status: FinanceInvoiceStatus.PAID,           daysAgo: 20,  totalAmount: 240000, paidAmount: 240000, region: kptPartners[2].region },
  ];

  const createdInvoices = [];
  for (const inv of invoiceData) {
    const invoiceDate = new Date();
    invoiceDate.setDate(invoiceDate.getDate() - inv.daysAgo);
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const subtotal = Math.round(Number(inv.totalAmount) / 1.18);
    const taxAmount = Number(inv.totalAmount) - subtotal;

    const created = await prisma.financeInvoice.create({
      data: {
        invoiceNumber: inv.invoiceNumber,
        invoiceDate,
        dueDate,
        status: inv.status,
        partnerId: inv.partnerId,
        billingName: inv.partner.name,
        billingAddress: `${inv.partner.city || ''}, ${inv.partner.state || ''}`.trim(),
        gstin: inv.partner.gstin || null,
        region: inv.region || null,
        subtotal,
        taxAmount,
        taxPercent: 18,
        discountAmount: 0,
        totalAmount: inv.totalAmount,
        paidAmount: inv.paidAmount,
        paymentDate: inv.status === FinanceInvoiceStatus.PAID ? dueDate : null,
        paymentMethod: inv.paidAmount > 0 ? 'NEFT' : null,
        createdBy: superAdminUser.id,
      },
    });

    // Add 2 line items per invoice
    await prisma.financeInvoiceItem.createMany({
      data: [
        { invoiceId: created.id, sku: 'KPT-AG5-001', description: 'KPT 115mm Angle Grinder KPT-AG5', quantity: Math.round(subtotal * 0.6 / 3200), unitPrice: 3200, lineTotal: Math.round(subtotal * 0.6) },
        { invoiceId: created.id, sku: 'KPT-ID13-001', description: 'KPT 13mm Impact Drill KPT-ID13', quantity: Math.round(subtotal * 0.4 / 3600), unitPrice: 3600, lineTotal: Math.round(subtotal * 0.4) },
      ],
    });

    createdInvoices.push(created);
  }
  console.log(`  ✓ Seeded ${createdInvoices.length} finance invoices with line items`);

  // Budgets — monthly REVENUE budgets Jan–Aug 2026 + regional + incentive
  const budgetData = [
    // Monthly revenue budgets (2026)
    { year: 2026, month: 1,  budgetType: FinanceBudgetType.REVENUE, dimensionType: FinanceBudgetDimension.TOTAL, budgetAmount: 2200000, notes: 'Jan 2026 revenue target' },
    { year: 2026, month: 2,  budgetType: FinanceBudgetType.REVENUE, dimensionType: FinanceBudgetDimension.TOTAL, budgetAmount: 2500000, notes: 'Feb 2026 revenue target' },
    { year: 2026, month: 3,  budgetType: FinanceBudgetType.REVENUE, dimensionType: FinanceBudgetDimension.TOTAL, budgetAmount: 2800000, notes: 'Mar 2026 — peak season' },
    { year: 2026, month: 4,  budgetType: FinanceBudgetType.REVENUE, dimensionType: FinanceBudgetDimension.TOTAL, budgetAmount: 2600000, notes: 'Apr 2026 revenue target' },
    { year: 2026, month: 5,  budgetType: FinanceBudgetType.REVENUE, dimensionType: FinanceBudgetDimension.TOTAL, budgetAmount: 2700000, notes: 'May 2026 revenue target' },
    { year: 2026, month: 6,  budgetType: FinanceBudgetType.REVENUE, dimensionType: FinanceBudgetDimension.TOTAL, budgetAmount: 2400000, notes: 'Jun 2026 revenue target' },
    { year: 2026, month: 7,  budgetType: FinanceBudgetType.REVENUE, dimensionType: FinanceBudgetDimension.TOTAL, budgetAmount: 2300000, notes: 'Jul 2026 revenue target' },
    { year: 2026, month: 8,  budgetType: FinanceBudgetType.REVENUE, dimensionType: FinanceBudgetDimension.TOTAL, budgetAmount: 2500000, notes: 'Aug 2026 revenue target' },
    // Annual REVENUE by region
    { year: 2026, month: null, budgetType: FinanceBudgetType.REVENUE, dimensionType: FinanceBudgetDimension.REGION, dimensionValue: 'West',  budgetAmount: 12000000, notes: 'West region annual target' },
    { year: 2026, month: null, budgetType: FinanceBudgetType.REVENUE, dimensionType: FinanceBudgetDimension.REGION, dimensionValue: 'South', budgetAmount: 8000000,  notes: 'South region annual target' },
    // Annual incentive budget
    { year: 2026, month: null, budgetType: FinanceBudgetType.INCENTIVE, dimensionType: FinanceBudgetDimension.TOTAL, budgetAmount: 1500000, notes: 'Total incentive payout budget 2026' },
  ];

  for (const b of budgetData) {
    await prisma.financeBudget.create({
      data: {
        year: b.year,
        month: b.month ?? null,
        budgetType: b.budgetType,
        dimensionType: b.dimensionType,
        dimensionValue: b.dimensionValue ?? null,
        budgetAmount: b.budgetAmount,
        notes: b.notes,
        createdBy: superAdminUser.id,
      },
    });
  }
  console.log(`  ✓ Seeded ${budgetData.length} finance budget records`);

  // Integration log stub
  await prisma.financeIntegrationLog.create({
    data: { provider: 'MANUAL', action: 'SYSTEM_INIT', status: 'SUCCESS', initiatedBy: superAdminUser.id },
  });

  // Log all created user credentials for easy reference
  console.log("\n" + "=".repeat(80));
  console.log("🎉 DATABASE SEEDED SUCCESSFULLY!");
  console.log("=".repeat(80));
  console.log("\n📋 USER ACCOUNTS CREATED - LOGIN CREDENTIALS:\n");

  console.log("┌─────────────────────────────────────────────────────────────────────────────┐");
  console.log("│ 1. SYSTEM ADMIN (Full System Access)                                       │");
  console.log("├─────────────────────────────────────────────────────────────────────────────┤");
  console.log(`│ Email:    ${superAdminUser.email.padEnd(64)} │`);
  console.log("│ Password: admin123                                                          │");
  console.log("│ Role:     SYSTEM_ADMIN                                                      │");
  console.log("└─────────────────────────────────────────────────────────────────────────────┘");

  console.log("\n┌─────────────────────────────────────────────────────────────────────────────┐");
  console.log("│ 2. ADMIN (Admin Access)                                                     │");
  console.log("├─────────────────────────────────────────────────────────────────────────────┤");
  console.log(`│ Email:    ${adminUser.email.padEnd(64)} │`);
  console.log("│ Password: admin123                                                          │");
  console.log("│ Role:     ADMIN                                                             │");
  console.log("└─────────────────────────────────────────────────────────────────────────────┘");

  console.log("\n┌─────────────────────────────────────────────────────────────────────────────┐");
  console.log("│ 3. DEVELOPER (Developer Access - Matches .env)                              │");
  console.log("├─────────────────────────────────────────────────────────────────────────────┤");
  console.log(`│ Email:    ${developerUser.email.padEnd(64)} │`);
  console.log("│ Password: admin123 (for seed) OR your DEVELOPER_LOGIN_PASSWORD from .env   │");
  console.log("│ Role:     SYSTEM_ADMIN                                                      │");
  console.log("│                                                                             │");
  console.log("│ ⚠️  IMPORTANT: For developer login to work, add these to your .env:         │");
  console.log("│     DEVELOPER_LOGIN_EMAIL=\"developer@example.com\"                           │");
  console.log("│     DEVELOPER_LOGIN_PASSWORD=\"admin123\"                         │");
  console.log("│     DEVELOPER_LOGIN_NAME=\"Developer Access\"                                 │");
  console.log("└─────────────────────────────────────────────────────────────────────────────┘");

  console.log("\n┌─────────────────────────────────────────────────────────────────────────────┐");
  console.log("│ 4. SALES USERS (Sales Access)                                               │");
  console.log("├─────────────────────────────────────────────────────────────────────────────┤");
  salesUsers.forEach((user, index) => {
    console.log(`│ Email:    ${user.email.padEnd(64)} │`);
    if (index === 0) {
      console.log("│ Password: admin123                                                          │");
      console.log("│ Role:     SALES                                                             │");
    }
    if (index < salesUsers.length - 1) {
      console.log("├─────────────────────────────────────────────────────────────────────────────┤");
    }
  });
  console.log("└─────────────────────────────────────────────────────────────────────────────┘");

  console.log("\n┌─────────────────────────────────────────────────────────────────────────────┐");
  console.log("│ KPT ADMIN (admin@kpt.co.in)                                                 │");
  console.log("├─────────────────────────────────────────────────────────────────────────────┤");
  console.log("│ Email:    admin@kpt.co.in                                                   │");
  console.log("│ Password: KPT@Admin2026                                                     │");
  console.log("│ Role:     ADMIN                                                             │");
  console.log("└─────────────────────────────────────────────────────────────────────────────┘");
  console.log("\n┌─────────────────────────────────────────────────────────────────────────────┐");
  console.log("│ KPT MANAGER (manager@kpt.co.in)                                             │");
  console.log("├─────────────────────────────────────────────────────────────────────────────┤");
  console.log("│ Email:    manager@kpt.co.in                                                 │");
  console.log("│ Password: KPT@Manager2026                                                   │");
  console.log("│ Role:     SALES                                                             │");
  console.log("└─────────────────────────────────────────────────────────────────────────────┘");

  console.log("\n" + "=".repeat(80));
  console.log("📍 QUICK START:");
  console.log("=".repeat(80));
  console.log("1. Start the app:    npm run dev");
  console.log("2. Open frontend:    http://localhost:3000");
  console.log("3. Login with any of the accounts above");
  console.log("\n💡 TIP: Use SYSTEM_ADMIN for full access during development");
  console.log("=".repeat(80) + "\n");
}

main()
  .catch(e => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
