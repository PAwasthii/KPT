'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Partner {
  crn: string; ownerName: string; firmName: string; city: string; state: string;
  currentStage: number; status: string; createdAt: string;
  fieldReport: { scheduledDate: string | null; assignedExecName: string | null; scheduleNote: string | null; visitedAt: string | null } | null;
}

const STATUS_COLORS: Record<string, string> = {
  enquiry_received: 'bg-[#FFFBEB] text-[#92400E] border-[#FCD34D]',
  field_visit_scheduled: 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]',
};

export default function FieldVisitsPage() {
  const [stage1, setStage1] = useState<Partner[]>([]);
  const [stage2, setStage2] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch('/api/admin/partners?stage=1'),
        fetch('/api/admin/partners?stage=2'),
      ]);
      if (r1.ok) { const d = await r1.json() as { partners: Partner[] }; setStage1(d.partners); }
      if (r2.ok) { const d = await r2.json() as { partners: Partner[] }; setStage2(d.partners); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fmt = (d: string) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  const daysSince = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-1">KPT Admin</p>
        <h1 className="text-[24px] font-bold text-slate-800">Field Visits</h1>
      </div>

      {/* Pending scheduling */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-[14px] font-semibold text-slate-800">Awaiting Scheduling</h2>
          <span className="text-[11px] bg-[#FFFBEB] text-[#92400E] border border-[#FCD34D] px-2 py-0.5 rounded-full">{stage1.length}</span>
        </div>
        {stage1.length === 0 ? (
          <div className="bg-white border border-[#E8E8E6] rounded-[8px] px-5 py-8 text-center">
            <p className="text-[13px] text-[#6B6B6B]">No pending applications. All enquiries have been assigned.</p>
          </div>
        ) : (
          <div className="bg-white border border-[#E8E8E6] rounded-[8px] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#F7F7F5] border-b border-[#E8E8E6]">
                <tr>
                  {['CRN', 'Firm / Owner', 'City', 'Waiting', 'Action'].map(h => (
                    <th key={h} className="text-left text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stage1.map(p => (
                  <tr key={p.crn} className="border-b border-[#E8E8E6] last:border-0 hover:bg-[#FFFBEB]/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-[12px] text-[#2563EB]">{p.crn}</td>
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-medium text-[#2D2D2D]">{p.firmName}</p>
                      <p className="text-[11px] text-[#6B6B6B]">{p.ownerName}</p>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[#2D2D2D]">{p.city}, {p.state}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[12px] font-medium ${daysSince(p.createdAt) > 3 ? 'text-[#2563EB]' : 'text-[#6B6B6B]'}`}>
                        {daysSince(p.createdAt)}d
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/kpt-admin/partners/${p.crn}`} className="text-[12px] text-[#1E40AF] hover:underline">Schedule Visit →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Scheduled visits */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-[14px] font-semibold text-slate-800">Scheduled Visits</h2>
          <span className="text-[11px] bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] px-2 py-0.5 rounded-full">{stage2.length}</span>
        </div>
        {stage2.length === 0 ? (
          <div className="bg-white border border-[#E8E8E6] rounded-[8px] px-5 py-8 text-center">
            <p className="text-[13px] text-[#6B6B6B]">No visits currently scheduled.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stage2.map(p => {
              const isOverdue = p.fieldReport?.scheduledDate && new Date(p.fieldReport.scheduledDate) < new Date();
              return (
                <div key={p.crn} className={`bg-white border rounded-[8px] p-4 ${isOverdue ? 'border-[#FED7AA]' : 'border-[#BFDBFE]'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-mono text-[12px] text-[#2563EB]">{p.crn}</p>
                      <p className="text-[14px] font-semibold text-slate-800">{p.firmName}</p>
                      <p className="text-[12px] text-[#6B6B6B]">{p.city}, {p.state}</p>
                    </div>
                    {isOverdue && (
                      <span className="text-[10px] bg-[#FEF3E8] text-[#2563EB] border border-[#FED7AA] px-1.5 py-0.5 rounded-full shrink-0">Overdue</span>
                    )}
                  </div>
                  {p.fieldReport?.scheduledDate && (
                    <div className="bg-[#F7F7F5] rounded-[4px] px-3 py-2 mb-3">
                      <p className="text-[12px] font-medium text-slate-800">{fmt(p.fieldReport.scheduledDate)}</p>
                      {p.fieldReport.assignedExecName && (
                        <p className="text-[11px] text-[#6B6B6B] mt-0.5">Executive: {p.fieldReport.assignedExecName}</p>
                      )}
                      {p.fieldReport.scheduleNote && (
                        <p className="text-[11px] text-[#6B6B6B] mt-0.5 italic">"{p.fieldReport.scheduleNote}"</p>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Link href={`/kpt-admin/field/${p.crn}`}
                      className="flex-1 text-center text-[12px] bg-[#2563EB] text-white py-2 rounded-[4px] hover:bg-[#1D4ED8] transition-colors">
                      Submit Report
                    </Link>
                    <Link href={`/kpt-admin/partners/${p.crn}`}
                      className="px-3 text-[12px] border border-[#E8E8E6] text-[#6B6B6B] py-2 rounded-[4px] hover:border-[#2D2D2D] hover:text-[#2D2D2D] transition-colors">
                      View
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
