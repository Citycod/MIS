import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorPanelProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorPanel({
  title = "Data Retrieval Error",
  message = "Failed to load performance metrics from the server-side DB repository.",
  onRetry,
}: ErrorPanelProps) {
  return (
    <div className="bg-[#FFF1EE] border border-[#CF2E2E]/30 rounded-xl p-6 text-center my-6">
      <div className="w-10 h-10 bg-[#CF2E2E]/10 text-[#CF2E2E] rounded-full flex items-center justify-center mx-auto mb-3">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <h3 className="font-bold text-sm text-[#24252B] mb-1">{title}</h3>
      <p className="text-xs text-[#667085] max-w-md mx-auto mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#CF2E2E] text-white text-xs font-bold rounded-lg hover:bg-[#AA2227] transition-all shadow-xs cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Operation
        </button>
      )}
    </div>
  );
}
