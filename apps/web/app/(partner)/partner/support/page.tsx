export default function SupportPage() {
  return (
    <div className="p-6 max-w-2xl">
      <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-1">Partner Portal</p>
      <h1 className="text-[22px] font-bold text-slate-800 mb-6">Support</h1>
      <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-6 mb-4">
        <h2 className="text-[16px] font-semibold text-slate-800 mb-4">Contact KPT Network Development</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-[rgba(37,99,235,0.08)] rounded-[6px] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-0.5">Phone</p>
              <a href="tel:+912313528151" className="text-[16px] font-semibold text-slate-800 hover:text-[#2563EB]">+91-231-3528151</a>
              <p className="text-[12px] text-[#6B6B6B] mt-0.5">Mon – Sat, 9:00 AM – 5:00 PM</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-[rgba(37,99,235,0.08)] rounded-[6px] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-0.5">Email</p>
              <a href="mailto:dealers@kpt.co.in" className="text-[16px] font-semibold text-slate-800 hover:text-[#2563EB]">dealers@kpt.co.in</a>
              <p className="text-[12px] text-[#6B6B6B] mt-0.5">Response within 1 working day</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-[rgba(37,99,235,0.08)] rounded-[6px] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-0.5">Address</p>
              <p className="text-[14px] text-[#2D2D2D]">GAT No. 320, Mouje Agar</p>
              <p className="text-[14px] text-[#2D2D2D]">Shirol-416103, Kolhapur, Maharashtra</p>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white border border-slate-100 rounded-[8px] p-5 text-slate-800">
        <p className="text-[14px] font-semibold mb-1">KPT Industries Ltd.</p>
        <p className="text-[13px] text-slate-500">Manufacturer of Power Tools, Blowers &amp; E-Vehicles since 1978.</p>
      </div>
    </div>
  );
}
