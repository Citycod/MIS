import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import type { Session } from "@/types/auth";
import { resolveMprScope } from "./reporting";

export type MprImportType = "odoo-targets" | "symplus-positions";

export class MprImportError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

const TARGET_HEADERS = [
  "source_target_id", "reporting_year", "target_period_start", "target_period_end", "team_id", "ro_id",
  "target_type", "target_amount_ngn", "currency", "effective_date", "source_version",
];
const POSITION_HEADERS = [
  "source_position_id", "position_as_of_date", "team_id", "ro_id", "investment_account_id", "product",
  "currency", "balance_sheet_position_ngn", "source_version",
];

function splitCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell); cell = "";
      if (row.some(value => value.trim() !== "")) rows.push(row);
      row = [];
    } else cell += character;
  }
  if (quoted) throw new MprImportError("The CSV contains an unclosed quoted value.");
  row.push(cell);
  if (row.some(value => value.trim() !== "")) rows.push(row);
  return rows;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function amount(value: string, column: string, row: number): number {
  const parsed = Number(value.replace(/[₦,\s]/g, ""));
  if (!Number.isFinite(parsed)) throw new MprImportError(`${column} is invalid on row ${row}.`);
  return parsed;
}

function parse(fileText: string, headers: string[]) {
  const rows = splitCsv(fileText.replace(/^\uFEFF/, ""));
  if (rows.length < 2) throw new MprImportError("The import must contain a header and at least one data row.");
  const actual = rows[0].map(value => value.trim().toLowerCase());
  if (actual.length !== headers.length || actual.some((value, index) => value !== headers[index])) {
    throw new MprImportError(`Expected columns in this order: ${headers.join(", ")}.`);
  }
  return rows.slice(1).map((values, rowIndex) => {
    if (values.length !== headers.length) throw new MprImportError(`Row ${rowIndex + 2} has ${values.length} columns; expected ${headers.length}.`);
    return Object.fromEntries(headers.map((header, index) => [header, values[index].trim()]));
  });
}

function safeCell(value: string) {
  return value.replace(/[\r\n]/g, " ").slice(0, 240);
}

export function importTemplate(type: MprImportType, teamId: string, roId: string) {
  if (type === "odoo-targets") return `${TARGET_HEADERS.join(",")}\nODOO-TARGET-001,2026,2026-01-01,2026-12-31,${teamId},${roId},NEW_TARGET_ANNUAL,1200000000,NGN,2026-01-01,odoo-export-version\n`;
  return `${POSITION_HEADERS.join(",")}\nSYMPLUS-POSITION-001,2026-10-10,${teamId},${roId},ACCOUNT-REFERENCE,SESA without TAX,NGN,350000000,symplus-export-version\n`;
}

export async function importMprSource(session: Session, type: MprImportType, file: File) {
  if (session.user.role !== "REGIONAL_MANAGER") throw new MprImportError("Only authorized managers may import MPR source extracts.", 403);
  if (!file.name.toLowerCase().endsWith(".csv") || file.size === 0 || file.size > 2_000_000) {
    throw new MprImportError("Upload a non-empty CSV file no larger than 2 MB.");
  }
  const scope = resolveMprScope(session, session.scope.effectiveRegionId);
  const bytes = Buffer.from(await file.arrayBuffer());
  const digest = createHash("sha256").update(bytes).digest("hex");
  const records = parse(bytes.toString("utf8"), type === "odoo-targets" ? TARGET_HEADERS : POSITION_HEADERS);
  const authorizedRos = new Set(scope.roIds);
  const seenIds = new Set<string>();
  const seenGrains = new Map<string, string>();
  let sourceVersion = "";

  for (let index = 0; index < records.length; index += 1) {
    const rowNumber = index + 2, record = records[index];
    const idKey = type === "odoo-targets" ? "source_target_id" : "source_position_id";
    const sourceId = safeCell(record[idKey]);
    if (!sourceId || seenIds.has(sourceId)) throw new MprImportError(`Missing or duplicate ${idKey} on row ${rowNumber}.`);
    seenIds.add(sourceId);
    if (record.team_id !== scope.regionId || !authorizedRos.has(record.ro_id)) {
      throw new MprImportError(`Row ${rowNumber} is outside your authorized team scope.`, 403);
    }
    if (record.currency !== "NGN") throw new MprImportError(`Only NGN is supported until an exchange-rate policy is approved (row ${rowNumber}).`);
    if (!record.source_version) throw new MprImportError(`source_version is required on row ${rowNumber}.`);
    sourceVersion ||= record.source_version;
    if (sourceVersion !== record.source_version) throw new MprImportError("One import file must contain a single source_version.");
    if (type === "odoo-targets") {
      for (const column of ["target_period_start", "target_period_end", "effective_date"]) {
        if (!validDate(record[column])) throw new MprImportError(`${column} is invalid on row ${rowNumber}.`);
      }
      if (record.target_period_start > record.target_period_end) throw new MprImportError(`Target period is invalid on row ${rowNumber}.`);
      const year = Number(record.reporting_year);
      if (!Number.isInteger(year) || year < 2000 || year > 2200) throw new MprImportError(`reporting_year is invalid on row ${rowNumber}.`);
      if (!new Set(["NEW_TARGET_ANNUAL", "NEW_TARGET_PERIOD"]).has(record.target_type)) {
        throw new MprImportError(`target_type must explicitly be NEW_TARGET_ANNUAL or NEW_TARGET_PERIOD on row ${rowNumber}.`);
      }
      const value = amount(record.target_amount_ngn, "target_amount_ngn", rowNumber);
      if (value < 0) throw new MprImportError(`target_amount_ngn cannot be negative on row ${rowNumber}.`);
      const grain = [record.reporting_year, record.target_period_start, record.target_period_end, record.team_id, record.ro_id, record.target_type].join("|");
      const prior = seenGrains.get(grain);
      if (prior && prior !== record.target_amount_ngn) throw new MprImportError(`Conflicting targets exist for the same reporting grain on row ${rowNumber}.`);
      seenGrains.set(grain, record.target_amount_ngn);
    } else {
      if (!validDate(record.position_as_of_date)) throw new MprImportError(`position_as_of_date is invalid on row ${rowNumber}.`);
      if (!record.investment_account_id || !record.product) throw new MprImportError(`Account and product are required on row ${rowNumber}.`);
      amount(record.balance_sheet_position_ngn, "balance_sheet_position_ngn", rowNumber);
      const grain = [record.position_as_of_date, record.team_id, record.ro_id, record.investment_account_id, record.product].join("|");
      if (seenGrains.has(grain)) throw new MprImportError(`Duplicate position snapshot grain on row ${rowNumber}.`);
      seenGrains.set(grain, record.source_position_id);
    }
  }

  const database = new DatabaseSync(path.join(process.cwd(), ".local", "mis-financial-sample", "reporting.sqlite"));
  try {
    database.exec("PRAGMA foreign_keys = ON; BEGIN IMMEDIATE;");
    const sourceSystem = type === "odoo-targets" ? "ODOO_TARGETS" : "SYMPLUS_POSITIONS";
    const existing = database.prepare("SELECT import_id, row_count FROM mpr_source_imports WHERE source_system=? AND source_sha256=?").get(sourceSystem, digest) as { import_id: string; row_count: number } | undefined;
    if (existing) {
      database.exec("ROLLBACK;");
      return { importId: existing.import_id, rows: existing.row_count, idempotent: true, sourceVersion };
    }
    const importId = randomUUID(), importedAt = new Date().toISOString();
    database.prepare(`INSERT INTO mpr_source_imports(import_id,source_system,source_file,source_sha256,source_version,imported_by,imported_at,row_count,status,data_classification)
      VALUES (?,?,?,?,?,?,?,?, 'COMPLETED','CONTROLLED_SOURCE_IMPORT')`).run(
      importId, sourceSystem, safeCell(file.name), digest, sourceVersion, session.user.id, importedAt, records.length,
    );
    if (type === "odoo-targets") {
      const insert = database.prepare(`INSERT INTO mpr_odoo_targets VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
      for (const record of records) insert.run(importId, safeCell(record.source_target_id), Number(record.reporting_year), record.target_period_start,
        record.target_period_end, record.team_id, record.ro_id, record.target_type,
        amount(record.target_amount_ngn, "target_amount_ngn", 0), record.currency, record.effective_date, safeCell(record.source_version));
    } else {
      const insert = database.prepare(`INSERT INTO mpr_symplus_positions VALUES (?,?,?,?,?,?,?,?,?,?)`);
      for (const record of records) insert.run(importId, safeCell(record.source_position_id), record.position_as_of_date, record.team_id, record.ro_id,
        safeCell(record.investment_account_id), safeCell(record.product), record.currency,
        amount(record.balance_sheet_position_ngn, "balance_sheet_position_ngn", 0), safeCell(record.source_version));
    }
    database.exec("COMMIT;");
    return { importId, rows: records.length, idempotent: false, sourceVersion };
  } catch (error) {
    try { database.exec("ROLLBACK;"); } catch { /* transaction already closed */ }
    throw error;
  } finally {
    database.close();
  }
}
