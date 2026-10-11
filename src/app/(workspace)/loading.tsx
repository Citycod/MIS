export default function Loading() {
  return <div role="status" aria-label="Loading performance dashboard" className="space-y-6"><span className="sr-only">Loading performance dashboard…</span><div className="h-16 animate-pulse rounded-xl bg-[#E4E7EC]" /><div className="h-36 animate-pulse rounded-xl bg-[#E4E7EC]" /><div className="grid grid-cols-2 gap-4 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-[#E4E7EC]" />)}</div></div>;
}
