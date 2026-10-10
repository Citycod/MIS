import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";

export default function SessionExpiredPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center items-center p-6 text-center">
      <div className="bg-white border border-[#E4E7EC] rounded-2xl p-8 max-w-md w-full shadow-lg">
        <div className="w-12 h-12 bg-[#FFF1EE] border border-[#CF2E2E]/20 text-[#CF2E2E] rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-6 h-6" />
        </div>

        <h2 className="text-xl font-bold text-[#24252B] mb-2">Session Expired</h2>
        <p className="text-xs text-[#667085] leading-relaxed mb-6">
          Your active banking session has timed out due to inactivity. Please sign in again to resume work.
        </p>

        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-[#CF2E2E] text-white text-xs font-bold rounded-lg hover:bg-[#AA2227] transition-all shadow-xs"
        >
          Sign In Again
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
