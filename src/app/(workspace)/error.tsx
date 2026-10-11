"use client";
import { ErrorPanel } from "@/components/ui/error-panel";
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div role="alert"><ErrorPanel title="Performance data unavailable" message="We couldn't load this dashboard. Your filters are preserved. Please retry." onRetry={reset} /></div>;
}
