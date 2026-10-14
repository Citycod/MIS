import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, chmod } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { User } from "@/types/auth";
import { getActiveDataCatalog } from "@/lib/server/repository/data-catalog";
import { validDate } from "@/lib/filters";

export const CSV_HEADERS = [
  "reporting_date", "region_id", "region_name", "ro_id", "ro_name", "product",
  "annual_target_ngn", "funds_mobilized_ngn", "target_completion_pct",
] as const;

type CsvRow = {
  reportingDate: string;
  regionId: string;
  regionName: string;
  roId: string;
  roName: string;
  product: string;
  annualTarget: number;
  fundsMobilized: number;
  targetCompletion: number | null;
};

export class CsvImportError extends Error {}

function parseCells(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') { cell += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else cell += character;
      continue;
    }
    if (character === '"' && cell.length === 0) quoted = true;
    else if (character === ",") { row.push(cell.trim()); cell = ""; }
    else if (character === "\n") {
      row.push(cell.trim().replace(/\r$/, ""));
      if (row.some(value => value !== "")) rows.push(row);
      row = []; cell = "";
    } else cell += character;
  }
  if (quoted) throw new CsvImportError("The CSV contains an unclosed quoted field.");
  row.push(cell.trim().replace(/\r$/, ""));
  if (row.some(value => value !== "")) rows.push(row);
  return rows;
}

function amount(value: string, label: string, rowNumber: number, percentage = false): number {
  let normalized = value.trim()
    .replace(/^NGN\s*/i, "")
    .replace(/^₦\s*/, "")
    .replace(/[\s,]/g, "");
  if (percentage) normalized = normalized.replace(/%$/, "");
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(normalized)) throw new CsvImportError(`${label} must be a non-negative number on row ${rowNumber}.`);
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed > 1_000_000_000_000_000) throw new CsvImportError(`${label} is outside the supported range on row ${rowNumber}.`);
  return parsed;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function parseAuthorizedCsv(input: string, user: User): CsvRow[] {
  const records = parseCells(input.replace(/^\uFEFF/, ""));
  if (records.length < 2) throw new CsvImportError("The CSV must contain a header and at least one data row.");
  if (records.length > 10_001) throw new CsvImportError("A development import may contain at most 10,000 rows.");
  const headers = records[0].map(normalizeHeader);
  const duplicates = headers.filter((header, index) => header && headers.indexOf(header) !== index);
  if (duplicates.length) throw new CsvImportError(`The CSV header contains duplicate columns: ${[...new Set(duplicates)].join(", ")}.`);
  const missing = CSV_HEADERS.filter(header => !headers.includes(header));
  if (missing.length) {
    const eventColumns = ["event_id", "event_date", "reporting_month", "event_type", "transaction_amount_ngn"];
    if (eventColumns.some(header => headers.includes(header))) {
      throw new CsvImportError("This is an investment-event CSV. Dashboard import needs summarized performance rows with annual target and funds mobilized. Download and use the CSV template shown in this dialog.");
    }
    throw new CsvImportError(`The CSV header is missing: ${missing.join(", ")}. Download the CSV template and keep its nine dashboard columns.`);
  }
  const column = Object.fromEntries(CSV_HEADERS.map(header => [header, headers.indexOf(header)])) as Record<typeof CSV_HEADERS[number], number>;
  const catalog = getActiveDataCatalog();
  const products = new Map<string, string>();
  for (const product of catalog.products.filter(item => item.code !== "PROD-ALL")) {
    products.set(product.code.toLowerCase(), product.name);
    products.set(product.name.toLowerCase(), product.name);
    if (product.sourceName) products.set(product.sourceName.toLowerCase(), product.name);
  }
  const regions = new Map(catalog.regions.map(region => [region.id, region]));
  const officers = new Map(Object.values(catalog.users).filter(item => item.role === "RO" && item.roId).map(item => [item.roId!, item]));
  return records.slice(1).map((values, recordIndex) => {
    const rowNumber = recordIndex + 2;
    if (values.length < headers.length) values = [...values, ...Array(headers.length - values.length).fill("")];
    const reportingDate = values[column.reporting_date];
    const regionId = values[column.region_id];
    const roId = values[column.ro_id];
    const productValue = values[column.product];
    const targetValue = values[column.annual_target_ngn];
    const fundsValue = values[column.funds_mobilized_ngn];
    const completionValue = values[column.target_completion_pct];
    if (!validDate(reportingDate)) throw new CsvImportError(`reporting_date is invalid on row ${rowNumber}.`);
    const region = regions.get(regionId);
    if (!region || !user.allowedRegionIds.includes(regionId) || regionId !== user.regionId) throw new CsvImportError(`region_id is outside your authorized scope on row ${rowNumber}.`);
    const officer = officers.get(roId);
    if (!officer || officer.regionId !== regionId || !user.allowedRoIds.includes(roId) || (user.role === "RO" && user.roId !== roId)) {
      throw new CsvImportError(`ro_id is outside your authorized scope on row ${rowNumber}.`);
    }
    const product = products.get(productValue.toLowerCase());
    if (!product) throw new CsvImportError(`product is not in the approved development catalog on row ${rowNumber}.`);
    const completion = completionValue === "" ? null : amount(completionValue, "target_completion_pct", rowNumber, true);
    if (completion !== null && completion > 100) throw new CsvImportError(`target_completion_pct must be between 0 and 100 on row ${rowNumber}.`);
    return {
      reportingDate, regionId, regionName: region.name, roId, roName: officer.name, product,
      annualTarget: amount(targetValue, "annual_target_ngn", rowNumber),
      fundsMobilized: amount(fundsValue, "funds_mobilized_ngn", rowNumber),
      targetCompletion: completion,
    };
  });
}

const VIEW_SQL = `
CREATE VIEW v_csv_monthly_performance AS
WITH ro_product AS (
  SELECT reporting_date, region_id, MAX(region_name) region_name, ro_id scope_key,
    MAX(ro_name) scope_label, product, MAX(annual_target_ngn) annual_target,
    SUM(funds_mobilized_ngn) funds_mobilized, MAX(target_completion_pct) completion_rate
  FROM imported_performance
  GROUP BY reporting_date, region_id, ro_id, product
), ro_month AS (
  SELECT reporting_date, region_id, scope_key, MAX(annual_target) annual_target
  FROM ro_product GROUP BY reporting_date, region_id, scope_key
), regional_month AS (
  SELECT reporting_date, region_id, SUM(annual_target) annual_target
  FROM ro_month GROUP BY reporting_date, region_id
), regional_product AS (
  SELECT reporting_date, region_id, MAX(region_name) region_name, product,
    SUM(funds_mobilized) funds_mobilized
  FROM ro_product GROUP BY reporting_date, region_id, product
)
SELECT reporting_date, region_id, region_name, scope_key, scope_label, product,
  annual_target, funds_mobilized, completion_rate,
  'SYNTHETIC_CSV_IMPORT' data_classification
FROM ro_product
UNION ALL
SELECT p.reporting_date, p.region_id, p.region_name, p.region_id || ':ALL',
  'All Relationship Officers', p.product, m.annual_target, p.funds_mobilized, NULL,
  'SYNTHETIC_CSV_IMPORT'
FROM regional_product p
JOIN regional_month m ON m.reporting_date=p.reporting_date AND m.region_id=p.region_id;
`;

export async function replaceCsvReportingDatabase(rows: CsvRow[]) {
  const directory = path.join(process.cwd(), ".local", "mis-csv-import");
  const target = path.join(directory, "reporting.sqlite");
  const temporary = path.join(directory, `reporting-${randomUUID()}.sqlite`);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const database = new DatabaseSync(temporary);
  try {
    database.exec("PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; BEGIN IMMEDIATE;");
    database.exec(`CREATE TABLE imported_performance (
      reporting_date TEXT NOT NULL, region_id TEXT NOT NULL, region_name TEXT NOT NULL,
      ro_id TEXT NOT NULL, ro_name TEXT NOT NULL, product TEXT NOT NULL,
      annual_target_ngn REAL NOT NULL CHECK(annual_target_ngn >= 0),
      funds_mobilized_ngn REAL NOT NULL CHECK(funds_mobilized_ngn >= 0),
      target_completion_pct REAL CHECK(target_completion_pct BETWEEN 0 AND 100),
      data_classification TEXT NOT NULL CHECK(data_classification='SYNTHETIC_CSV_IMPORT')
    );`);
    const insert = database.prepare(`INSERT INTO imported_performance VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNTHETIC_CSV_IMPORT')`);
    for (const row of rows) insert.run(row.reportingDate, row.regionId, row.regionName, row.roId, row.roName, row.product, row.annualTarget, row.fundsMobilized, row.targetCompletion);
    database.exec("CREATE INDEX imported_scope_date ON imported_performance(region_id, ro_id, reporting_date, product);");
    database.exec(VIEW_SQL);
    database.exec("COMMIT;");
    const integrity = database.prepare("PRAGMA integrity_check").get();
    if (integrity?.integrity_check !== "ok") throw new CsvImportError("The development reporting database failed its integrity check.");
  } catch (error) {
    try { database.exec("ROLLBACK;"); } catch { /* no active transaction */ }
    throw error;
  } finally {
    database.close();
  }
  await chmod(temporary, 0o444);
  try { await rename(temporary, target); }
  catch (error) { await rm(temporary, { force: true }); throw error; }
  const dates = rows.map(row => row.reportingDate).sort();
  return {
    rows: rows.length,
    targetCompletionRows: rows.filter(row => row.targetCompletion !== null).length,
    startDate: dates[0],
    endDate: dates.at(-1)!,
    database: "MIS CSV Import Synthetic Development",
  };
}

export function csvTemplate(user: User): string {
  const catalog = getActiveDataCatalog();
  const region = catalog.regions.find(item => item.id === user.regionId)!;
  const officer = Object.values(catalog.users).find(item => item.role === "RO" && item.roId === user.allowedRoIds[0])!;
  const product = catalog.products.find(item => item.code !== "PROD-ALL")!;
  return `${CSV_HEADERS.join(",")}\n2026-01-31,${region.id},${region.name},${officer.roId},${officer.name},${product.name},1200000000,50000000,4.17\n`;
}
