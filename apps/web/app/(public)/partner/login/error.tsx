'use client';
export default function LoginError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center p-6">
      <div className="bg-white border border-[#E8E8E6] rounded-[8px] p-8 max-w-md text-center">
        <div className="w-12 h-12 bg-[rgba(37,99,235,0.08)] rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-[#2563EB] text-[20px]">!</span>
        </div>
        <h2 className="text-[18px] font-bold text-slate-800 mb-2">Something went wrong</h2>
        <p className="text-[14px] text-[#6B6B6B] mb-6">{error.message}</p>
        <button onClick={reset} className="bg-[#2563EB] text-white text-[13px] uppercase tracking-[0.05em] px-6 py-2.5 rounded-[4px] hover:bg-[#1D4ED8]">Try again</button>
      </div>
    </div>
  );
}
