import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

interface AccessDeniedProps {
  title?: string;
  message?: string;
}

export function AccessDenied({
  title = "403 — Access Restricted",
  message = "You do not have authorization to view this page or region scope. This security policy is enforced server-side.",
}: AccessDeniedProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="bg-white border border-[#E4E7EC] rounded-2xl p-8 max-w-md w-full text-center shadow-lg">
        <div className="w-14 h-14 bg-[#FFF1EE] border border-[#CF2E2E]/20 text-[#CF2E2E] rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-bold text-[#24252B] mb-2">{title}</h2>
        <p className="text-xs text-[#667085] leading-relaxed mb-6">{message}</p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#CF2E2E] text-white text-xs font-bold rounded-lg hover:bg-[#AA2227] transition-all shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to My Dashboard
        </Link>
      </div>
    </div>
  );
}
