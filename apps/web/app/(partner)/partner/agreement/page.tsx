'use client';
import { useState, useRef, useEffect } from 'react';
import { usePartnerAuth } from '@/contexts/PartnerAuthContext';

interface AgreementData {
  signStatus: string | null;
  signingUrl: string | null;
  signedAt: string | null;
}

const CLAUSES = [
  {
    id: 'c1',
    title: '1. Appointment & Territory',
    body: `KPT Industries Ltd. (hereinafter "the Company") hereby appoints the Dealer as its non-exclusive Authorised Channel Partner for the distribution and sale of KPT branded products within the designated territory of the city and district specified in this Agreement ("Territory"). The Dealer shall not actively solicit customers, establish sub-depots, or appoint sub-dealers outside the Territory without prior written consent from the Company. The Company reserves the right to modify the Territory by giving thirty (30) days' written notice.`,
  },
  {
    id: 'c2',
    title: '2. Authorised Product Lines',
    body: `The Dealer is authorised to sell only those KPT product lines explicitly listed in Schedule A of this Agreement ("Authorised Products"). Sale of any KPT product outside the Authorised Products list, including grey-market variants or unverified imports, is strictly prohibited. The Company may add or remove products from the Authorised list with thirty (30) days' notice. The Dealer shall prominently display the KPT Authorised Dealer certificate at the point of sale.`,
  },
  {
    id: 'c3',
    title: '3. Minimum Purchase Obligation',
    body: `The Dealer agrees to place a minimum purchase order of ₹2,00,000 (Rupees Two Lakhs) per calendar quarter ("Minimum Purchase Obligation"). Failure to meet the Minimum Purchase Obligation for two consecutive quarters shall constitute a material breach entitling the Company to revise the Territory or terminate this Agreement. The Company shall provide quarterly performance statements by the 10th of the following quarter.`,
  },
  {
    id: 'c4',
    title: '4. Pricing, Discounts & Margin Policy',
    body: `The Dealer shall sell all Authorised Products strictly at or above the Maximum Retail Price (MRP) printed on the product packaging. The Dealer shall not offer discounts exceeding the guidelines published in the Company's quarterly trade circular. Violation of the MRP / pricing policy, including online marketplace listing at below-MRP prices, constitutes a breach of this Agreement and may result in immediate termination and blacklisting (see Clause 9). The Company shall supply products at the Dealer Price List in force at the time of each order.`,
  },
  {
    id: 'c5',
    title: '5. Stock, Display & Brand Standards',
    body: `(a) The Dealer shall maintain a minimum of thirty (30) days' worth of stock for each Authorised Product SKU. (b) A dedicated KPT branded display area of not less than 15 sq ft shall be maintained at the principal place of business. (c) The Dealer shall use only Company-supplied or Company-approved signage and point-of-sale materials. (d) Unauthorised modification of KPT branding, product packaging, or labels is strictly prohibited. (e) The Company's field executives may conduct unannounced audits to verify compliance; the Dealer shall cooperate fully.`,
  },
  {
    id: 'c6',
    title: '6. Reporting & Audit Rights',
    body: `The Dealer shall submit a monthly stock-and-sales statement to the Company on or before the 5th day of the following month in the format prescribed by the Company. The Company reserves the right to audit the Dealer's books of account, inventory records, and POS system related to KPT products upon three (3) days' written notice. Refusal to cooperate with an audit shall be treated as a material breach of this Agreement.`,
  },
  {
    id: 'c7',
    title: '7. Intellectual Property',
    body: `The Dealer acknowledges that the KPT trademark, brand name, logo, product designs, and all associated intellectual property rights ("KPT IP") are the exclusive property of KPT Industries Ltd. The Dealer is granted a limited, non-exclusive, non-transferable licence to use KPT IP solely for the purpose of promoting and selling the Authorised Products within the Territory during the term of this Agreement. The Dealer shall not register, apply for, or otherwise claim any rights in or to KPT IP, and shall immediately notify the Company of any infringement or suspected infringement by third parties.`,
  },
  {
    id: 'c8',
    title: '8. Anti-Diversion & Grey Market Policy',
    body: `The Dealer shall not, directly or indirectly: (a) sell Authorised Products to parties who intend to resell them outside the Territory; (b) purchase KPT products from sources other than the Company or its authorised distributors; (c) export KPT products without prior written authorisation. Diversion of stock detected through serial-number tracking or trade intelligence shall be treated as a Category I breach resulting in immediate termination and blacklisting (see Clause 9).`,
  },
  {
    id: 'c9',
    title: '9. Breach of Policy & Blacklisting',
    highlight: true,
    body: `9.1 CATEGORY I BREACHES (Zero Tolerance) — Any of the following shall constitute a Category I breach and shall result in IMMEDIATE TERMINATION of this Agreement AND permanent blacklisting of the Dealer in the KPT National Partner Registry without any cure period:
(a) Sale of counterfeit, adulterated, or tampered KPT products;
(b) Below-MRP listing on any online or offline marketplace;
(c) Stock diversion outside the authorised Territory;
(d) Submission of falsified documents during onboarding or thereafter;
(e) Unauthorised sub-dealership or multi-brand stocking in violation of exclusivity terms;
(f) Non-cooperation or obstruction of a Company audit.

9.2 CATEGORY II BREACHES — The following shall result in a written notice with a 30-day cure period. Failure to cure within the period shall escalate to Category I consequences:
(a) Failure to meet Minimum Purchase Obligation for two consecutive quarters;
(b) Non-submission of monthly reports for two or more months;
(c) Non-maintenance of the mandatory KPT display area;
(d) Violation of the prescribed discount or trade credit terms.

9.3 BLACKLISTING CONSEQUENCES — A blacklisted entity (including its owners, directors, and associated firms) shall:
(i) Be ineligible to apply for any KPT dealership, franchise, or supply arrangement in perpetuity or for the period specified by the Company;
(ii) Have its name and CRN published in the KPT National Blacklist communicated to all authorised distributors and field offices;
(iii) Forfeit all outstanding credit notes, performance rebates, and security deposits;
(iv) Be liable for damages, recovery of products supplied on credit, and legal costs incurred by the Company.

9.4 NATURAL JUSTICE — Before blacklisting under Category II escalation, the Dealer shall be granted a single personal hearing before the KPT Dealer Relations Committee. No such hearing is available for Category I breaches.`,
  },
  {
    id: 'c10',
    title: '10. Term, Renewal & Termination',
    body: `This Agreement commences on the date of digital signing and shall remain in force for one (1) year ("Initial Term"). It shall automatically renew for successive one-year terms unless either party provides thirty (30) days' written notice of non-renewal before the expiry of the then-current term. Either party may terminate this Agreement without cause upon sixty (60) days' written notice. The Company may terminate immediately upon a Category I breach (Clause 9.1) or upon the Dealer's insolvency, winding up, or assignment for the benefit of creditors.`,
  },
  {
    id: 'c11',
    title: '11. Confidentiality',
    body: `The Dealer shall keep strictly confidential all pricing lists, dealer discount structures, trade credit terms, customer databases, sales analytics, and any other information marked confidential that is disclosed by the Company ("Confidential Information"). The Dealer shall not disclose Confidential Information to any competitor, third party, or employee without a need-to-know for a period of two (2) years following the termination of this Agreement. Breach of this clause shall entitle the Company to seek injunctive relief in addition to damages.`,
  },
  {
    id: 'c12',
    title: '12. Indemnification',
    body: `The Dealer agrees to indemnify, defend, and hold harmless KPT Industries Ltd., its directors, officers, and employees from and against any claims, damages, fines, penalties, or costs (including legal fees) arising from: (a) the Dealer's breach of this Agreement; (b) the Dealer's negligence, misrepresentation, or wilful misconduct; (c) product liability claims arising from improper storage, handling, or installation by the Dealer.`,
  },
  {
    id: 'c13',
    title: '13. Governing Law & Dispute Resolution',
    body: `This Agreement is governed by and construed in accordance with the laws of India. Any dispute, controversy, or claim arising out of or relating to this Agreement shall first be referred to mediation. If unresolved within forty-five (45) days, the dispute shall be submitted to binding arbitration in accordance with the Arbitration and Conciliation Act, 1996. The seat of arbitration shall be Kolhapur, Maharashtra. The courts of Kolhapur shall have exclusive jurisdiction for enforcement of arbitral awards.`,
  },
  {
    id: 'c14',
    title: '14. Entire Agreement & Amendments',
    body: `This Agreement (including all Schedules) constitutes the entire agreement between the parties relating to its subject matter and supersedes all prior negotiations, representations, warranties, or agreements, whether oral or written. No amendment, modification, or waiver of any provision shall be effective unless made in writing and signed by authorised representatives of both parties.`,
  },
];

export default function AgreementPage() {
  const { partner, refresh } = usePartnerAuth();
  const agreementRef = useRef<HTMLDivElement>(null);

  const [hasScrolled, setHasScrolled] = useState(false);
  const [agreement, setAgreement] = useState<AgreementData | null>(null);
  const [agreementLoading, setAgreementLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!partner) return;
    fetch('/api/partner/agreement', { credentials: 'include' })
      .then(r => r.json())
      .then((data: AgreementData | null) => setAgreement(data))
      .catch(() => setAgreement(null))
      .finally(() => setAgreementLoading(false));
  }, [partner]);

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    await refresh();
    try {
      const res = await fetch('/api/partner/agreement', { credentials: 'include' });
      const data = await res.json() as AgreementData | null;
      setAgreement(data);
    } catch { /* ignore */ }
    setRefreshing(false);
  };

  if (!partner) return null;
  if (agreementLoading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-7 h-7 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Stage < 5 — locked
  if (partner.currentStage < 5) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-[22px] font-bold text-slate-800 mb-6">Dealer Agreement</h1>
        <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-8 text-center">
          <div className="w-14 h-14 bg-[#FFFBEB] rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-[#92400E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <h2 className="text-[16px] font-semibold text-slate-800 mb-2">Agreement Not Yet Available</h2>
          <p className="text-[14px] text-[#6B6B6B] mb-1">Your dealer agreement will be issued once your documents are reviewed and approved by KPT (Stage 4).</p>
          <p className="text-[13px] text-[#9CA3AF]">You are currently at Stage {partner.currentStage} of 5.</p>
        </div>
      </div>
    );
  }

  // Stage 5 — already signed / active
  if (agreement?.signStatus === 'signed' || partner.status === 'active') {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-[22px] font-bold text-slate-800 mb-6">Dealer Agreement</h1>
        <div className="bg-white border border-[#A7F3D0] rounded-[8px] p-8 text-center bg-[#ECFDF5]/30">
          <div className="w-16 h-16 bg-[#ECFDF5] border-2 border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[#065F46]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-[22px] font-bold text-slate-800 mb-2">Agreement Signed Successfully</h2>
          <p className="text-[14px] text-[#6B6B6B] mb-5">You are now an authorised KPT Channel Partner. Welcome to the family!</p>
          <div className="bg-[#F7F7F5] border border-[#E8E8E6] rounded-[6px] p-4 mb-5 text-left">
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div>
                <p className="text-[11px] uppercase tracking-[0.06em] text-[#6B6B6B] mb-0.5">Dealer Code (CRN)</p>
                <p className="font-mono font-bold text-[#2563EB]">{partner.crn}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.06em] text-[#6B6B6B] mb-0.5">Signing Method</p>
                <p className="text-[#2D2D2D]">Digio eSign</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.06em] text-[#6B6B6B] mb-0.5">Firm Name</p>
                <p className="text-[#2D2D2D]">{partner.firmName}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.06em] text-[#6B6B6B] mb-0.5">Territory</p>
                <p className="text-[#2D2D2D]">{partner.city}, {partner.state}</p>
              </div>
            </div>
          </div>
          <p className="text-[13px] text-[#6B6B6B]">Your ClarityERP login credentials will be shared within 24 hours at <strong>{partner.mobile}</strong>. For queries, call <strong>+91-231-3528151</strong>.</p>
        </div>
      </div>
    );
  }

  const handleScroll = () => {
    const el = agreementRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) setHasScrolled(true);
  };

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-1">Stage 5 of 5</p>
        <h1 className="text-[22px] font-bold text-slate-800">Dealer Agreement</h1>
        <p className="text-[13px] text-[#6B6B6B] mt-0.5">Read the full agreement below, then sign digitally via Digio eSign.</p>
      </div>

      {/* Agreement metadata */}
      <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-5 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[13px]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.06em] text-[#6B6B6B] mb-0.5">Agreement No.</p>
            <p className="font-mono font-semibold text-[#2563EB]">{partner.crn}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.06em] text-[#6B6B6B] mb-0.5">Dealer</p>
            <p className="font-medium text-[#2D2D2D]">{partner.firmName}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.06em] text-[#6B6B6B] mb-0.5">Territory</p>
            <p className="text-[#2D2D2D]">{partner.city}, {partner.state}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.06em] text-[#6B6B6B] mb-0.5">Date</p>
            <p className="text-[#2D2D2D]">{new Date().toLocaleDateString('en-IN')}</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-[#E8E8E6]">
          <p className="text-[11px] uppercase tracking-[0.06em] text-[#6B6B6B] mb-1.5">Authorised Product Lines</p>
          <div className="flex flex-wrap gap-1.5">
            {partner.productInterest.map(p => (
              <span key={p} className="text-[11px] bg-[rgba(37,99,235,0.08)] text-[#2563EB] border border-[#BFDBFE] px-2 py-0.5 rounded">{p}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Agreement document — scrollable */}
      <div className="bg-white border border-[#E8E8E6] rounded-[8px] mb-4">
        <div className="px-5 py-3 border-b border-[#E8E8E6] flex items-center justify-between">
          <p className="text-[12px] font-semibold text-[#2D2D2D]">KPT AUTHORISED CHANNEL PARTNER AGREEMENT</p>
          {!hasScrolled && (
            <p className="text-[11px] text-[#E8651A] flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              Scroll to read
            </p>
          )}
          {hasScrolled && (
            <p className="text-[11px] text-emerald-600 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Read
            </p>
          )}
        </div>

        <div
          ref={agreementRef}
          onScroll={handleScroll}
          className="h-[420px] overflow-y-auto px-6 py-5 space-y-5 text-[13px] text-[#2D2D2D] leading-relaxed"
        >
          {/* Preamble */}
          <div>
            <p className="text-[14px] font-bold text-slate-800 mb-2">PREAMBLE</p>
            <p>This Authorised Channel Partner Agreement ("Agreement") is entered into on the date of digital signing between:</p>
            <div className="mt-2 pl-4 border-l-2 border-[#E8651A] space-y-2">
              <p><strong>KPT Industries Ltd.</strong><br />GAT No. 320, Mouje Agar, Shirol-416103, Kolhapur, Maharashtra<br />(hereinafter referred to as <em>"the Company"</em>)</p>
              <p className="font-semibold">AND</p>
              <p><strong>{partner.firmName}</strong><br />Represented by: {partner.ownerName}<br />{partner.city}, {partner.state}<br />CRN: {partner.crn}<br />(hereinafter referred to as <em>"the Dealer"</em>)</p>
            </div>
            <p className="mt-3">WHEREAS the Company is engaged in the manufacture and distribution of KPT-branded power tools and related products and desires to expand its authorised distribution network; and WHEREAS the Dealer desires to be appointed as an Authorised Channel Partner of the Company, the parties agree as follows:</p>
          </div>

          {/* Clauses */}
          {CLAUSES.map(clause => (
            <div
              key={clause.id}
              className={`rounded-[6px] p-4 ${clause.highlight
                ? 'bg-red-50 border border-red-200'
                : 'bg-[#F7F7F5] border border-[#E8E8E6]'
              }`}
            >
              <p className={`text-[13px] font-bold mb-2 ${clause.highlight ? 'text-red-800' : 'text-slate-800'}`}>
                {clause.highlight && (
                  <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded mr-2 font-semibold tracking-wide">
                    CRITICAL
                  </span>
                )}
                {clause.title}
              </p>
              <p className={`text-[12px] leading-relaxed whitespace-pre-line ${clause.highlight ? 'text-red-900' : 'text-[#2D2D2D]'}`}>
                {clause.body}
              </p>
            </div>
          ))}

          {/* Signature block preview */}
          <div className="border-t-2 border-[#E8E8E6] pt-4">
            <p className="text-[13px] font-semibold text-slate-800 mb-3">Execution</p>
            <div className="grid grid-cols-2 gap-6 text-[12px]">
              <div className="border border-[#E8E8E6] rounded p-3">
                <p className="text-[#6B6B6B] mb-1">For and on behalf of the Dealer</p>
                <p className="font-semibold">{partner.firmName}</p>
                <p>{partner.ownerName} (Proprietor/Authorised Signatory)</p>
                <p className="text-[#6B6B6B] mt-2">Signature: Digio eSign</p>
                <p className="text-[#6B6B6B]">Date: {new Date().toLocaleDateString('en-IN')}</p>
              </div>
              <div className="border border-[#E8E8E6] rounded p-3">
                <p className="text-[#6B6B6B] mb-1">For and on behalf of the Company</p>
                <p className="font-semibold">KPT Industries Ltd.</p>
                <p>Authorised Signatory, Kolhapur</p>
                <p className="text-[#6B6B6B] mt-2">Signature: Digital Seal</p>
                <p className="text-[#6B6B6B]">Date: {new Date().toLocaleDateString('en-IN')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* eSign panel */}
      <div className={`bg-white border rounded-[8px] p-5 transition-all ${hasScrolled ? 'border-[#2563EB]' : 'border-[#E8E8E6] opacity-60'}`}>
        <p className="text-[14px] font-semibold text-slate-800 mb-1">Sign with Digio eSign</p>

        {!agreement?.signingUrl ? (
          <div className="bg-[#FFFBEB] border border-[#FCD34D] rounded-[6px] px-4 py-3">
            <p className="text-[13px] text-[#92400E] font-medium mb-0.5">Agreement not yet sent for signing</p>
            <p className="text-[12px] text-[#92400E]">KPT will send the signing link to your email once the agreement is dispatched. You will receive an email from Digio with instructions.</p>
          </div>
        ) : (
          <>
            <p className="text-[13px] text-[#6B6B6B] mb-4">
              {hasScrolled
                ? 'You have read the agreement. Click below to open the Digio signing portal — you will receive an email link from Digio as well.'
                : 'Scroll through the full agreement above before signing.'}
            </p>
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-[6px] p-3 mb-4 flex items-start gap-2.5">
              <svg className="w-4 h-4 text-[#2563EB] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <p className="text-[12px] text-[#1E40AF]">Digio eSign is a legally valid electronic signature under the IT Act 2000. Clicking the link below will open the Digio portal where you can review and sign the agreement.</p>
            </div>
            <a
              href={agreement.signingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`block w-full text-center bg-[#2563EB] text-white text-[14px] font-semibold uppercase tracking-[0.05em] py-3 rounded-[4px] hover:bg-[#1D4ED8] transition-colors ${!hasScrolled ? 'pointer-events-none opacity-40' : ''}`}
            >
              Open Digio Signing Portal →
            </a>
            <div className="mt-4 pt-4 border-t border-[#E8E8E6] flex items-center justify-between">
              <p className="text-[12px] text-[#6B6B6B]">Already signed on Digio? Refresh to see updated status.</p>
              <button
                onClick={handleRefreshStatus}
                disabled={refreshing}
                className="text-[12px] text-[#2563EB] hover:underline disabled:opacity-50"
              >
                {refreshing ? 'Checking…' : 'Refresh status'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
