import { PrismaClient, AuditCategory } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});

// User IDs from DB
const RAJESH_KPT_ADMIN   = 4;  // admin@kpt.co.in       — KPT Admin (Rajesh Kulkarni)
const PRIYA_SALES_MGR    = 5;  // manager@kpt.co.in     — Sales Manager (Priya Sharma)
const SARAH_SALES        = 7;  // sarah.sales@example.com
const PRIYA_SALES        = 8;  // priya.sales@example.com
const RAJ_INNOVUN        = 11; // raj.s@innovunglobal.com — System Admin
const NISHA_INNOVUN      = 12; // nisha.d@innovunglobal.com — System Admin

function daysAgo(n: number, hour = 10, minute = 0): Date {
  const d = new Date("2026-08-10T00:00:00Z");
  d.setDate(d.getDate() - n);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log("🌱 Seeding KPT audit log entries...\n");

  const entries = [
    // ── System setup (Innovun team onboarding KPT, ~30 days ago) ──────────────
    {
      action: "integration.credential.update",
      changedBy: RAJ_INNOVUN,
      entityType: "Integration",
      entityId: 1,
      newValues: { service: "MSG91", status: "configured", note: "WhatsApp Business API connected for KPT dealer notifications" },
      category: AuditCategory.CAMPAIGN_MANAGEMENT,
      subCategory: "INTEGRATION",
      changedAt: daysAgo(28, 9, 15),
    },
    {
      action: "settings.update",
      changedBy: NISHA_INNOVUN,
      entityType: "GlobalSetting",
      entityId: 1,
      oldValues: { key: "OPPORTUNITY_DISCOUNT_THRESHOLD", value: "0" },
      newValues: { key: "OPPORTUNITY_DISCOUNT_THRESHOLD", value: "10", note: "KPT standard dealer discount ceiling set to 10%" },
      category: AuditCategory.SALES_MANAGEMENT,
      subCategory: "SETTINGS",
      changedAt: daysAgo(27, 11, 0),
    },

    // ── Segment & Campaign setup ───────────────────────────────────────────────
    {
      action: "segment.create",
      changedBy: RAJESH_KPT_ADMIN,
      entityType: "Segment",
      entityId: 1,
      newValues: { name: "West Maharashtra Distributors", criteria: "region=WEST_1, type=DISTRIBUTOR", count: 12 },
      category: AuditCategory.CAMPAIGN_MANAGEMENT,
      subCategory: "SEGMENT",
      changedAt: daysAgo(24, 10, 30),
    },
    {
      action: "segment.create",
      changedBy: RAJESH_KPT_ADMIN,
      entityType: "Segment",
      entityId: 2,
      newValues: { name: "Karnataka & Goa Dealers — Power Tools", criteria: "region=SOUTH, tier=SILVER,GOLD", count: 8 },
      category: AuditCategory.CAMPAIGN_MANAGEMENT,
      subCategory: "SEGMENT",
      changedAt: daysAgo(23, 14, 0),
    },
    {
      action: "whatsapp.template.create",
      changedBy: RAJESH_KPT_ADMIN,
      entityType: "WhatsAppTemplate",
      entityId: 1,
      newValues: { name: "kpt_new_product_launch", language: "en", category: "MARKETING", headline: "Introducing KPT SDS Plus Rotary Hammer — Built for Indian Construction Sites" },
      category: AuditCategory.CAMPAIGN_MANAGEMENT,
      subCategory: "WHATSAPP",
      changedAt: daysAgo(22, 9, 45),
    },
    {
      action: "whatsapp.campaign.create",
      changedBy: RAJESH_KPT_ADMIN,
      entityType: "WhatsAppCampaign",
      entityId: 1,
      newValues: { name: "Monsoon Power Tools Offer — Aug 2026", segment: "West Maharashtra Distributors", template: "kpt_new_product_launch", scheduledAt: "2026-08-05T08:00:00Z" },
      category: AuditCategory.CAMPAIGN_MANAGEMENT,
      subCategory: "WHATSAPP",
      changedAt: daysAgo(18, 16, 20),
    },
    {
      action: "whatsapp.campaign.send",
      changedBy: RAJESH_KPT_ADMIN,
      entityType: "WhatsAppCampaign",
      entityId: 1,
      newValues: { status: "SENT", recipientCount: 12, sentAt: "2026-08-05T08:00:00Z" },
      category: AuditCategory.CAMPAIGN_MANAGEMENT,
      subCategory: "WHATSAPP",
      changedAt: daysAgo(5, 8, 3),
    },

    // ── Lead activity ──────────────────────────────────────────────────────────
    {
      action: "lead.create",
      changedBy: SARAH_SALES,
      entityType: "Lead",
      entityId: 42,
      newValues: { firstName: "Ramesh", lastName: "Patil", company: "Maharashtra Hardware Depot, Pune", source: "TRADE_SHOW", status: "OPEN", note: "Met at ACETECH 2026, interested in KPT angle grinders for retail chain" },
      category: AuditCategory.SALES_MANAGEMENT,
      subCategory: "LEAD",
      changedAt: daysAgo(20, 13, 0),
    },
    {
      action: "lead.update",
      changedBy: SARAH_SALES,
      entityType: "Lead",
      entityId: 42,
      oldValues: { status: "OPEN" },
      newValues: { status: "QUALIFIED", note: "Confirmed budget for 200 units of KPT-AG4 grinders, Q3 purchase plan" },
      category: AuditCategory.SALES_MANAGEMENT,
      subCategory: "LEAD",
      changedAt: daysAgo(17, 11, 30),
    },
    {
      action: "lead.create",
      changedBy: PRIYA_SALES,
      entityType: "Lead",
      entityId: 78,
      newValues: { firstName: "Deepak", lastName: "Nair", company: "Konkan Construction Pvt Ltd, Ratnagiri", source: "MANUAL", status: "WORKING", note: "Enquiry for SDS Plus Rotary Hammers — upcoming highway project near Ratnagiri" },
      category: AuditCategory.SALES_MANAGEMENT,
      subCategory: "LEAD",
      changedAt: daysAgo(14, 10, 0),
    },
    {
      action: "lead.update",
      changedBy: PRIYA_SALES_MGR,
      entityType: "Lead",
      entityId: 78,
      oldValues: { ownerId: null, status: "WORKING" },
      newValues: { ownerId: PRIYA_SALES, status: "WORKING", note: "Assigned to Priya for follow-up — high-value construction lead" },
      category: AuditCategory.SALES_MANAGEMENT,
      subCategory: "LEAD",
      changedAt: daysAgo(13, 9, 0),
    },

    // ── Contact activity ───────────────────────────────────────────────────────
    {
      action: "contact.create",
      changedBy: SARAH_SALES,
      entityType: "Contact",
      entityId: 15,
      newValues: { name: "Suresh Ghosalkar", position: "Purchase Manager", company: "Shree Ganesh Industrial Tools, Pune", email: "suresh@sgtools.in", phone: "9823456789" },
      category: AuditCategory.SALES_MANAGEMENT,
      subCategory: "CONTACT",
      changedAt: daysAgo(16, 14, 45),
    },
    {
      action: "contact.update",
      changedBy: SARAH_SALES,
      entityType: "Contact",
      entityId: 15,
      oldValues: { email: null },
      newValues: { email: "suresh@sgtools.in", note: "Updated after visiting distributor office in Pune" },
      category: AuditCategory.SALES_MANAGEMENT,
      subCategory: "CONTACT",
      changedAt: daysAgo(15, 16, 0),
    },

    // ── Opportunity activity ───────────────────────────────────────────────────
    {
      action: "opportunity.create",
      changedBy: SARAH_SALES,
      entityType: "Opportunity",
      entityId: 7,
      newValues: { opportunityNumber: "OPP-2608-0007", name: "KPT Angle Grinder Bulk Supply — Maharashtra Hardware Depot", stage: "QUALIFICATION", amount: 570000, accountId: 5 },
      category: AuditCategory.SALES_MANAGEMENT,
      subCategory: "OPPORTUNITY",
      changedAt: daysAgo(15, 10, 0),
    },
    {
      action: "opportunity.update",
      changedBy: SARAH_SALES,
      entityType: "Opportunity",
      entityId: 7,
      oldValues: { stage: "QUALIFICATION" },
      newValues: { stage: "PROPOSAL", nextStep: "Share quote with revised pricing for 200-unit order" },
      category: AuditCategory.SALES_MANAGEMENT,
      subCategory: "OPPORTUNITY",
      changedAt: daysAgo(10, 11, 30),
    },
    {
      action: "opportunity.create",
      changedBy: PRIYA_SALES,
      entityType: "Opportunity",
      entityId: 11,
      newValues: { opportunityNumber: "OPP-2608-0011", name: "SDS Plus Rotary Hammer Supply — Konkan Construction", stage: "DISCOVERY", amount: 340000, accountId: 8 },
      category: AuditCategory.SALES_MANAGEMENT,
      subCategory: "OPPORTUNITY",
      changedAt: daysAgo(12, 9, 30),
    },
    {
      action: "opportunity.update",
      changedBy: PRIYA_SALES_MGR,
      entityType: "Opportunity",
      entityId: 11,
      oldValues: { stage: "DISCOVERY", amount: 340000 },
      newValues: { stage: "VALUE_PROPOSITION", amount: 425000, note: "Scope expanded — 50 SDS Plus + 20 Demolition Hammers for Phase 1 of highway project" },
      category: AuditCategory.SALES_MANAGEMENT,
      subCategory: "OPPORTUNITY",
      changedAt: daysAgo(7, 14, 0),
    },

    // ── Segment update ─────────────────────────────────────────────────────────
    {
      action: "segment.update",
      changedBy: RAJESH_KPT_ADMIN,
      entityType: "Segment",
      entityId: 1,
      oldValues: { count: 12 },
      newValues: { count: 15, note: "Added 3 new dealers from Kolhapur and Sangli belt after Aug field visit" },
      category: AuditCategory.CAMPAIGN_MANAGEMENT,
      subCategory: "SEGMENT",
      changedAt: daysAgo(6, 10, 0),
    },

    // ── Auth events ────────────────────────────────────────────────────────────
    {
      action: "DEVELOPER_LOGIN",
      changedBy: RAJ_INNOVUN,
      entityType: "Auth",
      entityId: RAJ_INNOVUN,
      newValues: { method: "developer_token", note: "System diagnostics check — audit log module deployment" },
      category: AuditCategory.SALES_MANAGEMENT,
      subCategory: "AUTH",
      changedAt: daysAgo(2, 9, 0),
    },
    {
      action: "DEVELOPER_LOGOUT",
      changedBy: RAJ_INNOVUN,
      entityType: "Auth",
      entityId: RAJ_INNOVUN,
      newValues: { note: "Diagnostics complete" },
      category: AuditCategory.SALES_MANAGEMENT,
      subCategory: "AUTH",
      changedAt: daysAgo(2, 9, 45),
    },

    // ── Recent: E3W product line addition ─────────────────────────────────────
    {
      action: "whatsapp.template.create",
      changedBy: NISHA_INNOVUN,
      entityType: "WhatsAppTemplate",
      entityId: 2,
      newValues: { name: "kpt_e3w_dealer_invite", language: "en", category: "MARKETING", headline: "KPT Electric Three Wheelers — Dealer Partnership Opportunity | Join India's Green Mobility Wave" },
      category: AuditCategory.CAMPAIGN_MANAGEMENT,
      subCategory: "WHATSAPP",
      changedAt: daysAgo(1, 15, 30),
    },
    {
      action: "segment.create",
      changedBy: NISHA_INNOVUN,
      entityType: "Segment",
      entityId: 3,
      newValues: { name: "E3W Prospective Dealers — PAN India", criteria: "interest=electric_vehicles, tier=BRONZE,SILVER", count: 0, note: "New segment for KPT Electric Three Wheeler dealer outreach programme" },
      category: AuditCategory.CAMPAIGN_MANAGEMENT,
      subCategory: "SEGMENT",
      changedAt: daysAgo(1, 16, 0),
    },
  ];

  let created = 0;
  for (const entry of entries) {
    const { changedAt, ...rest } = entry;
    await prisma.auditLog.create({
      data: {
        ...rest,
        changedAt,
        entityId: rest.entityId ?? 0,
        oldValues: rest.oldValues ? (rest.oldValues as any) : undefined,
        newValues: rest.newValues ? (rest.newValues as any) : undefined,
      },
    });
    console.log(`  ✓ [${entry.category?.replace("_MANAGEMENT", "")}] ${entry.action} — ${entry.entityType} #${entry.entityId}`);
    created++;
  }

  console.log(`\n✅ ${created} audit log entries added.\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
