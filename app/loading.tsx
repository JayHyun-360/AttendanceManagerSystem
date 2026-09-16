export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center px-4">
      <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm">
        <span className="h-4 w-4 rounded-full border-2 border-slate-200 border-t-emerald-500 animate-spin" />
        Loading Adesse...
      </div>
    </div>
  );
}
