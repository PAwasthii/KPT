# KPT Channel Partner Onboarding Module

Digital 5-stage onboarding system for KPT Industries Ltd. (Kulkarni Power Tools) channel partners. Replaces the 100% offline process with a fully digital flow covering application, field verification, document upload, approval, and e-sign.

This module is a pure **additive layer** on top of the existing `innocrm-staging` CRM. Zero existing files were removed or restructured. Two existing files received minimal additive patches.

---

## Architecture Overview

```
innocrm-staging/
├── apps/web/
│   ├── app/
│   │   ├── (public)/partner/          ← Public-facing pages (no auth)
│   │   ├── (partner)/partner/         ← Partner dashboard (kpt_partner_token)
│   │   ├── (kpt-admin)/kpt-admin/     ← Staff admin (auth_token)
│   │   └── api/
│   │       ├── partner/               ← Partner-facing API routes
│   │       ├── admin/                 ← Staff admin API routes
│   │       └── webhooks/esign/        ← Esign webhook receiver
│   ├── components/kpt/                ← KPT-specific UI components
│   ├── contexts/PartnerAuthContext.tsx
│   └── lib/kpt/                       ← Utilities + third-party API wrappers
└── packages/db/prisma/schema.prisma   ← 8 new models appended
```

Route groups `(public)`, `(partner)`, `(kpt-admin)` are transparent to URLs — they are Next.js App Router organizational folders only.

---

## New Routes

### Public (no authentication)

| URL | Description |
|-----|-------------|
| `/partner` | Landing page — hero, why KPT, how it works, products, CRN tracker |
| `/partner/apply` | Application form (Stage 1 — submit enquiry, receive CRN) |
| `/partner/login` | OTP login using CRN + mobile |
| `/partner/track/[crn]` | Public CRN tracker — shows stage + doc status without login |

### Partner Dashboard (requires `kpt_partner_token` cookie)

| URL | Description |
|-----|-------------|
| `/partner/dashboard` | Home — current stage banner, progress stepper, stage-aware quick actions |
| `/partner/application` | Read-only view of submitted Stage 1 application data |
| `/partner/documents` | Upload 6 required documents; submit for review when all verified |
| `/partner/agreement` | View and sign the partnership agreement (Stage 5) |
| `/partner/support` | Contact information for KPT support team |

### KPT Admin (requires `auth_token` cookie — existing CRM staff session)

| URL | Description |
|-----|-------------|
| `/kpt-admin/partners` | Paginated partner list with table/kanban toggle, filters, CSV export |
| `/kpt-admin/partners/[crn]` | 3-column detail: info + history / field report + docs / approval panel |
| `/kpt-admin/field/[crn]` | Mobile-optimized field exec verification form with GPS + photo upload |

---

## New API Endpoints

### Partner Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/partner/auth/login` | public | Send OTP to partner (CRN + mobile) |
| POST | `/api/partner/auth/verify-otp` | public | Verify OTP → set `kpt_partner_token` cookie |
| POST | `/api/partner/auth/logout` | partner | Clear `kpt_partner_token` cookie |
| GET | `/api/partner/auth/me` | partner | Return current partner session |

### Partner Operations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/partner/apply` | public | Submit Stage 1 application → generate CRN |
| GET | `/api/partner/track/[crn]` | public | Public CRN status tracker |
| POST | `/api/partner/upload` | partner | Generate Supabase Storage signed upload URL |
| POST | `/api/partner/verify/[docType]` | internal | Trigger API verification for a document |
| POST | `/api/partner/stage/advance` | partner | Advance partner to next stage |
| POST | `/api/partner/field-report` | field_exec | Submit field verification report |

`[docType]` values: `gstin`, `pan`, `bank`, `shop_photo`, `trade_license`, `address_proof`

### Admin Operations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/partners` | admin | Paginated list with filters (`stage`, `status`, `city`, `search`, `page`, `limit`) |
| GET | `/api/admin/partners/[crn]` | admin | Full partner detail including approval log |
| POST | `/api/admin/partners/[crn]/approve` | admin | Approve / reject / request more info |
| GET | `/api/admin/stats` | admin | Dashboard stats (counts per stage + status) |
| POST | `/api/admin/auth/logout` | admin | Clear `auth_token` cookie |

### Webhooks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/webhooks/esign` | webhook | Esign completion callback → activate partner |

---

## The 5 Onboarding Stages

| Stage | Name | Who Acts | What Happens |
|-------|------|----------|--------------|
| 1 | Enquiry Received | Partner | Submits application → gets CRN → SMS/email confirmation |
| 2 | Field Visit Scheduled | KPT field exec | Field exec visits, submits verification report via mobile form |
| 3 | Documents Requested | Partner | Uploads 6 documents; each auto-verified via API |
| 4 | Under Review | KPT sales head | Approves / rejects / requests more info via admin panel |
| 5 | Agreement / E-Sign | Partner | Signs PDF agreement via Leegality (or mock in dev) |
| — | Active | — | Partner is now an active KPT channel partner |

---

## Status Flow

```
enquiry_received
  → field_visit_scheduled (Stage 2)
  → field_verified (Stage 3 — after field exec submits report)
  → documents_requested (partner starts uploading)
  → under_review (Stage 4 — all docs submitted)
  → approved (sales head approves)
  → agreement_sent (PDF generated + Leegality link sent)
  → active (esign webhook received)

At any point:
  → rejected
  → on_hold
  → more_info_requested (sales head requests clarification)
```

---

## New Prisma Models

Eight models were appended to `packages/db/prisma/schema.prisma`. Run `npx prisma db push` or `npx prisma migrate dev` to apply.

| Model | Purpose |
|-------|---------|
| `KptPartner` | Master onboarding record (CRN, stage, status, all business fields) |
| `KptFieldVerification` | Field exec visit report (geo coordinates, scores, photos) |
| `KptDocument` | Per-document upload + verification status |
| `KptApprovalLog` | Admin action audit trail |
| `KptAgreement` | E-sign reference + activation timestamp |
| `KptStatusHistory` | Full status transition log |
| `KptAdmin` | KPT staff with roles (`kpt_manager`, `field_exec`, `sales_head`) |
| `KptOtp` | Mobile OTP store (hashed SHA-256 + CRN salt, TTL=10min) |

---

## Supabase SQL — Run After `prisma db push`

After pushing the schema, execute this SQL in the Supabase SQL editor to create the required database functions and storage bucket.

```sql
-- 1. CRN generator function
CREATE OR REPLACE FUNCTION generate_kpt_crn()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  seq_num INT;
  year_part TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(crn, '-', 4) AS INT)
  ), 0) + 1
  INTO seq_num
  FROM "KptPartner"
  WHERE crn LIKE 'KPT-CP-' || year_part || '-%';

  RETURN 'KPT-CP-' || year_part || '-' || LPAD(seq_num::TEXT, 5, '0');
END;
$$;

-- 2. Storage bucket for KPT documents (run once)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kpt-documents',
  'kpt-documents',
  false,
  10485760,  -- 10 MB max per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS: partners can upload to their own CRN prefix
CREATE POLICY "Partners upload own docs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'kpt-documents'
  AND (storage.foldername(name))[1] LIKE 'KPT-CP-%'
);

-- 4. Storage RLS: service role can read all (for admin + PDF generation)
CREATE POLICY "Service role read all"
ON storage.objects FOR SELECT
USING (bucket_id = 'kpt-documents');
```

---

## Environment Variables

Add these to your `.env` file (root of monorepo). The app reads them via `dotenv.config({ path: '../../.env' })` in `next.config.js`.

```env
# KPT Public Config
NEXT_PUBLIC_APP_NAME="KPT Partner Portal"
NEXT_PUBLIC_KPT_PHONE="+91-231-3528151"
NEXT_PUBLIC_KPT_ADDRESS="GAT No. 320, Mouje Agar, Shirol-416103, Kolhapur, Maharashtra"

# KPT JWT (partner sessions — separate from CRM auth_token)
KPT_JWT_SECRET=your-random-256-bit-secret-here

# Supabase (server-side only)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # NEVER use NEXT_PUBLIC_ for this

# Production API Keys (leave empty in dev — mocks activate automatically)
FAST2SMS_API_KEY=          # SMS delivery
LEEGALITY_API_KEY=         # E-sign
SANDBOX_API_KEY=           # Penny drop + PAN verification
PERFIOS_API_KEY=           # GST verification
WHITEBOOKS_API_KEY=        # GST verification (alternate)
EKO_API_KEY=               # PAN verification (alternate)
```

Generate `KPT_JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Dev vs Prod: Switching from Mocks to Real APIs

All third-party integrations default to console-logged mocks when `NODE_ENV !== 'production'`. Switching to real APIs requires **only env vars** — zero code changes.

| Service | Mock behavior | Prod activation |
|---------|--------------|-----------------|
| SMS (Fast2SMS) | `console.log` the OTP | Set `FAST2SMS_API_KEY` |
| Email (Resend) | `console.log` the email | Set `RESEND_API_KEY` |
| GST verification | 2.5s delay → `verified` | Set `PERFIOS_API_KEY` or `WHITEBOOKS_API_KEY` |
| PAN verification | 2.5s delay → `verified` | Set `SANDBOX_API_KEY` or `EKO_API_KEY` |
| Bank penny drop | 2.5s delay → `verified` | Set `SANDBOX_API_KEY` |
| E-sign (Leegality) | Returns `MOCK-ESIGN-{crn}-{timestamp}` | Set `LEEGALITY_API_KEY` |

**Dev OTP**: In development, the `/api/partner/auth/login` response includes `devOtp: "123456"` for easy testing. This field is absent in production.

---

## File Structure Reference

```
apps/web/
├── app/
│   ├── (public)/partner/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    ← Landing page
│   │   ├── loading.tsx / error.tsx
│   │   ├── apply/
│   │   │   ├── page.tsx               ← Application form
│   │   │   └── loading.tsx / error.tsx
│   │   ├── login/
│   │   │   ├── page.tsx               ← OTP login
│   │   │   └── loading.tsx / error.tsx
│   │   └── track/[crn]/
│   │       ├── page.tsx               ← Public CRN tracker
│   │       └── loading.tsx / error.tsx
│   ├── (partner)/partner/
│   │   ├── layout.tsx                 ← PartnerAuthContext + KptSidebar
│   │   ├── dashboard/page.tsx
│   │   ├── application/page.tsx
│   │   ├── documents/page.tsx
│   │   ├── agreement/page.tsx
│   │   └── support/page.tsx
│   ├── (kpt-admin)/kpt-admin/
│   │   ├── layout.tsx                 ← auth_token check + AdminLayoutClient
│   │   ├── partners/
│   │   │   ├── page.tsx              ← Partner list + kanban
│   │   │   ├── loading.tsx / error.tsx
│   │   │   └── [crn]/
│   │   │       ├── page.tsx          ← Partner detail + approval panel
│   │   │       └── loading.tsx / error.tsx
│   │   └── field/[crn]/
│   │       ├── page.tsx              ← Field exec verification form
│   │       └── loading.tsx / error.tsx
│   └── api/
│       ├── partner/
│       │   ├── apply/route.ts
│       │   ├── auth/login / verify-otp / logout / me
│       │   ├── track/[crn]/route.ts
│       │   ├── upload/route.ts
│       │   ├── verify/[docType]/route.ts
│       │   ├── stage/advance/route.ts
│       │   └── field-report/route.ts
│       ├── admin/
│       │   ├── auth/logout/route.ts
│       │   ├── partners/route.ts
│       │   ├── partners/[crn]/route.ts
│       │   ├── partners/[crn]/approve/route.ts
│       │   └── stats/route.ts
│       └── webhooks/esign/route.ts
├── components/kpt/
│   ├── AdminLayoutClient.tsx          ← Admin sidebar + layout (client)
│   ├── CrnBadge.tsx                   ← Copyable CRN pill
│   ├── CrnTrackerWidget.tsx           ← Landing page CRN search widget
│   ├── DocUploadZone.tsx              ← Document upload + verify card
│   ├── KptFooter.tsx                  ← Navy footer
│   ├── KptNav.tsx                     ← White sticky nav
│   ├── KptSidebar.tsx                 ← Partner dashboard sidebar
│   ├── LeafletMapPreview.tsx          ← SSR-safe Leaflet map (use dynamic import)
│   ├── StageStepper.tsx               ← 5-step horizontal progress bar
│   └── StatusBadge.tsx                ← Status pill badges
├── contexts/
│   └── PartnerAuthContext.tsx         ← Partner session context
└── lib/kpt/
    ├── agreement.ts                   ← pdfkit PDF generator
    ├── auth.ts                        ← jose JWT sign/verify + cookie helpers
    ├── crn.ts                         ← CRN regex validator
    ├── email.ts                       ← Email sender (mock/Resend)
    ├── pincode.ts                     ← Pincode → city/district/state lookup
    ├── sms.ts                         ← SMS sender (mock/Fast2SMS)
    └── apis/
        ├── bank.ts                    ← Penny drop (mock/Sandbox)
        ├── esign.ts                   ← E-sign (mock/Leegality)
        ├── gstin.ts                   ← GST verification (mock/Perfios)
        └── pan.ts                     ← PAN verification (mock/Sandbox/Eko)
```

---

## Existing Files Patched (additive only)

**`apps/web/components/AppLayoutWrapper.tsx`** — Added 2 lines so `/partner/*` and `/kpt-admin/*` bypass the CRM sidebar/header:
```tsx
const publicPrefixes = ['/partner', '/kpt-admin'];
const isAuthPage = authPages.includes(pathname) || publicPrefixes.some(p => pathname.startsWith(p));
```

**`apps/web/next.config.js`** — Added `kpt.co.in` to `images.remotePatterns` for logo assets.

**`packages/db/prisma/schema.prisma`** — 8 new models appended after existing models. No existing models modified.

---

## Auth Separation

| Cookie | Audience | Signed by | Verified by |
|--------|----------|-----------|-------------|
| `auth_token` | CRM staff + KPT admin | Express API | Express `/api/auth/me` |
| `kpt_partner_token` | Channel partners | `lib/kpt/auth.ts` (jose JWT) | `getPartnerFromRequest()` in API routes |

The two auth systems are completely independent. A partner cannot access admin routes, and staff cannot access partner-only routes.

---

## Running Locally

```bash
# From monorepo root
npm install

# Push KPT schema changes to your database
cd packages/db
npx prisma db push      # or: npx prisma migrate dev --name kpt-onboarding

# Run the Supabase SQL above in your project's SQL editor

# Set env vars in root .env (copy the block from above)

# Start dev server
cd ../..
npm run dev
```

After starting, visit:
- `http://localhost:3000/partner` — Partner landing page
- `http://localhost:3000/partner/apply` — Apply as a new dealer
- `http://localhost:3000/kpt-admin/partners` — Admin panel (requires CRM login first)
