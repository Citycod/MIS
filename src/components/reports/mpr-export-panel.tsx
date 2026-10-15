"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet, LoaderCircle, Presentation, Upload, X } from "lucide-react";

type Props = {
  teamId: string;
  teamName: string;
  cutoff: string;
  canImport: boolean;
};

function responseFilename(response: Response) {
  const disposition = response.headers.get("content-disposition") ?? "";
  return disposition.match(/filename="([^"]+)"/)?.[1] ?? "MIS-Demo-Monthly-Performance-Review.pptx";
}

export function MprExportPanel({ teamId, teamName, cutoff, canImport }: Props) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  async function generate() {
    setGenerating(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/mpr/export", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, cutoff, reportType: "monthly-performance-review", format: "pptx" }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error ?? "The PowerPoint could not be generated.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = responseFilename(response); anchor.click();
      URL.revokeObjectURL(url);
      setMessage("The scoped MPR PowerPoint was generated and downloaded.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The PowerPoint could not be generated."); }
    finally { setGenerating(false); }
  }

  async function upload(formData: FormData) {
    setImporting(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/mpr/import", { method: "POST", body: formData });
      const body = await response.json().catch(() => null) as { error?: string; message?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? "The source file could not be imported.");
      setMessage(body?.message ?? "The controlled source file was imported.");
      dialog.current?.close();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The source file could not be imported."); }
    finally { setImporting(false); }
  }

  return <section className="rounded-xl border border-[#E4E7EC] bg-white p-5 shadow-[0_1px_3px_rgba(101,16,21,0.05)]" aria-labelledby="mpr-export-title">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-3xl">
        <div className="mb-2 flex items-center gap-2 text-[#A51F27]"><Presentation size={19} /><span className="text-xs font-bold uppercase tracking-[0.08em]">Executive export</span></div>
        <h2 id="mpr-export-title" className="text-lg font-extrabold text-[#24252B]">Generate MPR PowerPoint</h2>
        <p className="mt-1 text-sm leading-6 text-[#667085]">Create an editable, team-scoped Monthly Performance Review deck from the authorized reporting views.</p>
      </div>
      {canImport && <button type="button" className="secondary-button gap-2" onClick={() => { setError(""); setMessage(""); dialog.current?.showModal(); }}><Upload size={15} /> Import source extract</button>}
    </div>

    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.1fr_1fr_1fr_0.7fr_auto] xl:items-end">
      <label className="text-xs font-semibold text-[#344054]">Reporting cutoff
        <input className="mt-2 h-11 w-full rounded-md border border-[#D0D5DD] bg-[#F8F9FA] px-3 text-sm text-[#475467]" type="date" value={cutoff} readOnly />
      </label>
      <label className="text-xs font-semibold text-[#344054]">Authorized team
        <select className="mt-2 h-11 w-full rounded-md border border-[#D0D5DD] bg-[#F8F9FA] px-3 text-sm text-[#475467]" value={teamId} disabled><option value={teamId}>{teamName}</option></select>
      </label>
      <label className="text-xs font-semibold text-[#344054]">Report type
        <select className="mt-2 h-11 w-full rounded-md border border-[#D0D5DD] bg-white px-3 text-sm" value="monthly-performance-review" disabled><option value="monthly-performance-review">Monthly Performance Review</option></select>
      </label>
      <label className="text-xs font-semibold text-[#344054]">Format
        <select className="mt-2 h-11 w-full rounded-md border border-[#D0D5DD] bg-white px-3 text-sm" value="pptx" disabled><option value="pptx">PowerPoint (.pptx)</option></select>
      </label>
      <button type="button" onClick={generate} disabled={generating} className="samtl-primary-button min-h-11 gap-2 disabled:cursor-not-allowed disabled:opacity-65">
        {generating ? <LoaderCircle className="animate-spin" size={16} /> : <Download size={16} />}{generating ? "Generating…" : "Generate"}
      </button>
    </div>
    <p className="mt-3 text-[11px] text-[#667085]">YTD only · Nigerian naira · Signed target gaps · Synthetic data is labelled in every generated deck.</p>
    {error && <p role="alert" className="mt-4 rounded-lg border border-[#E8D5D7] bg-[#FCF6F6] px-4 py-3 text-sm text-[#651015]">{error}</p>}
    {message && <p role="status" className="mt-4 rounded-lg border border-[#B7E0C2] bg-[#F0FAF3] px-4 py-3 text-sm text-[#216E39]">{message}</p>}

    {canImport && <dialog ref={dialog} className="m-auto w-[min(94vw,650px)] rounded-xl border border-[#E4E7EC] bg-white p-0 shadow-2xl backdrop:bg-black/35">
      <div className="flex items-start justify-between border-b border-[#E4E7EC] p-5">
        <div><h3 className="font-bold text-[#24252B]">Import controlled MPR source</h3><p className="mt-1 text-xs leading-5 text-[#667085]">Regional Managers may import validated CSV extracts. Live Odoo and Symplus APIs are not connected.</p></div>
        <button type="button" aria-label="Close import dialog" className="rounded-md p-2 hover:bg-[#F8F9FA]" onClick={() => dialog.current?.close()}><X size={18} /></button>
      </div>
      <form className="space-y-5 p-5" action={upload}>
        <label className="block text-xs font-semibold text-[#344054]">Source type
          <select name="type" className="mt-2 h-11 w-full rounded-md border border-[#D0D5DD] bg-white px-3 text-sm" defaultValue="odoo-targets">
            <option value="odoo-targets">Odoo target extract</option><option value="symplus-positions">Symplus position extract</option>
          </select>
        </label>
        <label className="block text-xs font-semibold text-[#344054]">CSV file
          <input name="file" type="file" accept=".csv,text/csv" required className="mt-2 block w-full rounded-md border border-[#D0D5DD] p-2 text-sm" />
        </label>
        <div className="flex flex-wrap gap-3 text-xs"><a className="font-semibold text-[#A51F27] hover:underline" href="/api/mpr/import?type=odoo-targets"><FileSpreadsheet className="mr-1 inline" size={14} />Odoo template</a><a className="font-semibold text-[#A51F27] hover:underline" href="/api/mpr/import?type=symplus-positions"><FileSpreadsheet className="mr-1 inline" size={14} />Symplus template</a></div>
        <p className="rounded-lg bg-[#F8F9FA] px-3 py-2 text-xs leading-5 text-[#667085]">Imports must use stable source IDs, NGN, the authorized team and officer IDs, an explicit target type, and a source version. Re-uploading the same source file is idempotent.</p>
        <div className="flex justify-end gap-3 border-t border-[#E4E7EC] pt-4"><button type="button" className="secondary-button" onClick={() => dialog.current?.close()}>Cancel</button><button type="submit" disabled={importing} className="samtl-primary-button min-h-10! gap-2">{importing && <LoaderCircle className="animate-spin" size={15} />}{importing ? "Importing…" : "Import CSV"}</button></div>
      </form>
    </dialog>}
  </section>;
}
