"use client";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import type { MonthlyMovement } from "@/types/repository";
export function MonthlyMovementTable({ rows }: { rows: MonthlyMovement[] }) {
  const [ascending, setAscending] = useState(false);
  const ordered = [...rows].sort((a, b) => ascending ? a.month.localeCompare(b.month) : b.month.localeCompare(a.month));
  return <section className="panel">
    <div className="p-5"><h2 className="text-base font-semibold">Monthly Portfolio Movement</h2><p className="mt-1 text-xs text-[#667085]">Opening and closing are snapshots. Inflows and withdrawals are period flows. All values in NGN.</p></div>
    <div className="table-scroll" tabIndex={0} role="region" aria-label="Monthly movement table; scroll horizontally for more columns"><table className="financial-table">
      <caption className="sr-only">Monthly movement reconciliation</caption>
      <thead><tr><th scope="col" aria-sort={ascending ? "ascending" : "descending"}><button className="min-h-8 cursor-pointer" onClick={() => setAscending(!ascending)}>Month {ascending ? "↑" : "↓"}</button></th>{["Opening position", "External inflows", "Withdrawals", "Net movement", "Closing position"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
      <tbody>{ordered.map(row => <tr key={row.month}><td className="font-medium">{new Date(`${row.month}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })}</td>{(["openingPosition", "externalInflows", "outflowsLiquidations", "netMovement", "closingPosition"] as const).map(key => <td key={key} className={key === "closingPosition" ? "font-semibold" : ""}>{key === "netMovement" && Number(row[key]) > 0 ? "+" : ""}{formatCurrency(row[key])}</td>)}</tr>)}</tbody>
    </table></div>
  </section>;
}
