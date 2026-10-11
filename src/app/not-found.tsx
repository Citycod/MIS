import Link from "next/link";
import { FileQuestion, ArrowLeft, Info } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center items-center p-6 text-center">
      <div className="bg-white border border-[#E4E7EC] rounded-2xl p-8 max-w-md w-full shadow-lg">
        <div className="w-12 h-12 bg-[#F8F9FA] border border-[#E4E7EC] text-[#667085] rounded-full flex items-center justify-center mx-auto mb-4">
          <FileQuestion className="w-6 h-6" />
        </div>

        <h2 className="text-xl font-bold text-[#24252B] mb-2">404 — Page Not Found</h2>
        <p className="text-xs text-[#667085] leading-relaxed mb-4">
          The requested page or route does not exist in the Management Information System.
        </p>

        {/* Removed features explanation box */}
        <div className="bg-[#FFF1EE] border border-[#CF2E2E]/20 rounded-lg p-3 text-left mb-6 text-xs text-[#24252B]">
          <div className="flex items-center gap-1.5 font-bold text-[#CF2E2E] mb-1">
            <Info className="w-3.5 h-3.5" />
            Notice on Removed Features
          </div>
          <p className="text-[11px] text-[#667085] leading-snug">
            Per executive review, <strong>Account Opening</strong>, <strong>Daily Performance</strong>, and standalone <strong>Product Scorecards</strong> have been explicitly removed from this release.
          </p>
        </div>

        <Link
          href="/ro/dashboard"
          className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-[#CF2E2E] text-white text-xs font-bold rounded-lg hover:bg-[#AA2227] transition-all shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
