import type { LucideIcon } from "lucide-react";

export function UnavailableReport({ title, message, icon: Icon }: { title: string; message: string; icon: LucideIcon }) {
  return <div className="space-y-5"><h2 className="text-xl font-semibold text-[#252525] sm:text-2xl">{title}</h2><section className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-[#E5E5E5] bg-white p-8 text-center"><div className="grid h-14 w-14 place-items-center rounded-full bg-[#FCF6F6] text-[#A51F27]"><Icon size={24} /></div><h3 className="mt-5 font-semibold text-[#252525]">Unavailable</h3><p className="mt-2 max-w-md text-sm leading-6 text-[#737373]">{message}</p></section></div>;
}
