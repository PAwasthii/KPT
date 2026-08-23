export default function ApplyLoading() {
  return (
    <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-[#6B6B6B]">Loading…</p>
      </div>
    </div>
  );
}
