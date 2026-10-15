import "server-only";

import pptxgen from "pptxgenjs";
import type { MprReportData, MprTeamRow } from "./types";

const BURGUNDY = "981B2A";
const RED = "B4232C";
const PALE_RED = "F8E9EB";
const INK = "20242C";
const MUTED = "667085";
const LINE = "E4E7EC";
const WHITE = "FFFFFF";
const SOFT = "F7F8FA";
const SYNTHETIC_LABEL = "SYNTHETIC DEMONSTRATION DATA — NOT ACTUAL SAMTL FINANCIAL PERFORMANCE";

function money(value: number | null, decimals = 1) {
  if (value === null || !Number.isFinite(value)) return "Unavailable";
  const absolute = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (absolute >= 1_000_000_000) return `${sign}NGN ${(absolute / 1_000_000_000).toFixed(decimals)}bn`;
  if (absolute >= 1_000_000) return `${sign}NGN ${(absolute / 1_000_000).toFixed(decimals)}m`;
  return `${sign}NGN ${absolute.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

function percent(value: number | null) {
  return value === null ? "Unavailable" : `${value.toFixed(1)}%`;
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T00:00:00Z`));
}

function monthLabel(value: string) {
  const isoDate = value.length === 7 ? `${value}-01` : value;
  return new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(new Date(`${isoDate}T00:00:00Z`));
}

function addChrome(pptx: pptxgen, slide: pptxgen.Slide, title: string, data: MprReportData, slideNumber: number) {
  slide.background = { color: WHITE };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.16, line: { color: BURGUNDY, transparency: 100 }, fill: { color: BURGUNDY } });
  slide.addText("SAMTL", { x: 0.42, y: 0.28, w: 1.25, h: 0.3, color: BURGUNDY, bold: true, fontFace: "Aptos Display", fontSize: 20, margin: 0 });
  slide.addText(title, { x: 0.42, y: 0.8, w: 9.8, h: 0.45, color: INK, bold: true, fontFace: "Aptos Display", fontSize: 24, margin: 0 });
  slide.addText(`${data.teamName}  |  Cutoff ${shortDate(data.reportingCutoff)}`, { x: 9.55, y: 0.35, w: 3.35, h: 0.25, color: MUTED, fontSize: 9, align: "right", margin: 0 });
  slide.addShape(pptx.ShapeType.line, { x: 0.42, y: 7.12, w: 12.48, h: 0, line: { color: LINE, width: 1 } });
  slide.addText(data.synthetic ? SYNTHETIC_LABEL : "CONTROLLED SOURCE IMPORT", { x: 0.42, y: 7.2, w: 6.6, h: 0.16, color: data.synthetic ? RED : MUTED, bold: true, fontSize: 6.5, charSpacing: 0.35, margin: 0, fit: "shrink" });
  slide.addText(`Generated ${new Date(data.generatedAt).toLocaleString("en-GB", { timeZone: "Africa/Lagos" })}  |  ${slideNumber}`, { x: 8.8, y: 7.2, w: 4.1, h: 0.16, color: MUTED, fontSize: 7.5, align: "right", margin: 0 });
}

function addKpi(pptx: pptxgen, slide: pptxgen.Slide, x: number, title: string, value: string, detail: string, featured = false) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y: 1.45, w: 3.92, h: 1.18, rectRadius: 0.06,
    line: { color: featured ? BURGUNDY : LINE, width: 1 }, fill: { color: featured ? BURGUNDY : WHITE },
  });
  slide.addText(title, { x: x + 0.2, y: 1.66, w: 3.45, h: 0.2, color: featured ? "F6DADD" : MUTED, fontSize: 10, bold: true, margin: 0 });
  slide.addText(value, { x: x + 0.2, y: 1.93, w: 3.45, h: 0.34, color: featured ? WHITE : INK, fontSize: 22, bold: true, margin: 0, fit: "shrink" });
  slide.addText(detail, { x: x + 0.2, y: 2.34, w: 3.45, h: 0.15, color: featured ? "F6DADD" : MUTED, fontSize: 7.5, margin: 0, fit: "shrink" });
}

function tableMoney(value: number | null) {
  return value === null ? "Unavailable" : money(value, 2);
}

function tableRows(values: string[][]): pptxgen.TableRow[] {
  return values.map(row => row.map(text => ({ text })));
}

function summaryTable(pptx: pptxgen, slide: pptxgen.Slide, rows: MprTeamRow[], totals: MprTeamRow, y = 1.5) {
  const header = ["Name", "New Target", "Balance Sheet", "Gap to Meet", "Run Rate"];
  const body = rows.map(row => [row.roName, tableMoney(row.newTargetNgn), tableMoney(row.balanceSheetNgn), tableMoney(row.gapToMeetNgn), tableMoney(row.requiredMonthlyRunRateNgn)]);
  body.push(["Team Total", tableMoney(totals.newTargetNgn), tableMoney(totals.balanceSheetNgn), tableMoney(totals.gapToMeetNgn), tableMoney(totals.requiredMonthlyRunRateNgn)]);
  slide.addTable(tableRows([header, ...body]), {
    x: 0.42, y, w: 12.48, h: Math.min(4.9, 0.48 * (body.length + 1)),
    border: { type: "solid", color: LINE, pt: 0.7 },
    fill: { color: WHITE }, color: INK, fontFace: "Aptos", fontSize: 10,
    margin: 0.09, rowH: 0.46, colW: [2.5, 2.45, 2.45, 2.45, 2.63],
    valign: "middle",
    bold: false,
  });
  slide.addShape(pptx.ShapeType.rect, { x: 0.42, y, w: 12.48, h: 0.46, line: { color: BURGUNDY }, fill: { color: BURGUNDY, transparency: 0 } });
  header.forEach((label, index) => {
    const widths = [2.5, 2.45, 2.45, 2.45, 2.63];
    const x = 0.42 + widths.slice(0, index).reduce((sum, width) => sum + width, 0);
    slide.addText(label, { x: x + 0.09, y: y + 0.11, w: widths[index] - 0.18, h: 0.2, color: WHITE, bold: true, fontSize: 9.5, margin: 0, align: index === 0 ? "left" : "right" });
  });
}

function addCover(pptx: pptxgen, data: MprReportData) {
  const slide = pptx.addSlide();
  slide.background = { color: BURGUNDY };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 4.5, h: 7.5, line: { color: "7D1320", transparency: 100 }, fill: { color: "7D1320" } });
  slide.addText("SAMTL", { x: 0.6, y: 0.55, w: 2, h: 0.48, color: WHITE, bold: true, fontSize: 26, margin: 0 });
  slide.addText("SAMTL Monthly Performance Review", { x: 0.6, y: 2.1, w: 10.8, h: 0.46, color: "F2C8CD", fontSize: 18, bold: true, charSpacing: 0.8, margin: 0 });
  slide.addText(data.teamName, { x: 0.6, y: 2.62, w: 10.7, h: 0.85, color: WHITE, fontFace: "Aptos Display", fontSize: 34, bold: true, margin: 0, breakLine: false, fit: "shrink" });
  slide.addText(`Year to date through ${shortDate(data.reportingCutoff)}`, { x: 0.6, y: 3.65, w: 7.5, h: 0.35, color: "F8E9EB", fontSize: 16, margin: 0 });
  slide.addShape(pptx.ShapeType.roundRect, { x: 0.6, y: 5.38, w: 6.25, h: 0.55, rectRadius: 0.05, line: { color: "F2C8CD" }, fill: { color: "7D1320" } });
  slide.addText(data.synthetic ? SYNTHETIC_LABEL : "CONTROLLED SOURCE IMPORT", { x: 0.82, y: 5.57, w: 5.81, h: 0.15, color: WHITE, fontSize: 7.4, bold: true, align: "center", margin: 0, charSpacing: 0.2, fit: "shrink" });
  slide.addText(`Prepared from ${data.scopeLabel.toLowerCase()}\nGenerated ${new Date(data.generatedAt).toLocaleString("en-GB", { timeZone: "Africa/Lagos" })}`, { x: 0.6, y: 6.3, w: 7.4, h: 0.5, color: "F2C8CD", fontSize: 9, breakLine: false, margin: 0 });
}

function addTeamSummary(pptx: pptxgen, data: MprReportData, startIndex: number, slideNumber: number) {
  const slide = pptx.addSlide();
  const isContinuation = startIndex > 0;
  const rows = data.rows.slice(startIndex, startIndex + 9);
  addChrome(pptx, slide, isContinuation ? "TEAM SUMMARY (continued)" : "TEAM SUMMARY", data, slideNumber);
  summaryTable(pptx, slide, rows, data.totals);
  slide.addText("Signed values are retained: a negative gap or run rate means the position is above target.", { x: 0.42, y: 6.58, w: 8.6, h: 0.22, color: MUTED, fontSize: 8.5, italic: true, margin: 0 });
}

function addPositionVsTarget(pptx: pptxgen, data: MprReportData, slideNumber: number) {
  const slide = pptx.addSlide();
  addChrome(pptx, slide, "Position vs Target", data, slideNumber);
  addKpi(pptx, slide, 0.42, "New Target", money(data.totals.newTargetNgn), data.totals.targetDefinition, true);
  addKpi(pptx, slide, 4.7, "Balance Sheet", money(data.totals.balanceSheetNgn), `As of ${shortDate(data.totals.positionAsOfDate)}`);
  addKpi(pptx, slide, 8.98, "Target Achievement", percent(data.totals.achievementPct), `${data.totals.remainingFullMonths} full months remaining`);
  slide.addChart(pptx.ChartType.bar, [
    { name: "New Target", labels: data.rows.map(row => row.roName), values: data.rows.map(row => row.newTargetNgn / 1_000_000) },
    { name: "Balance Sheet", labels: data.rows.map(row => row.roName), values: data.rows.map(row => row.balanceSheetNgn / 1_000_000) },
  ], {
    x: 0.42, y: 2.95, w: 8.1, h: 3.7, catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
    showLegend: true, legendPos: "b", showTitle: false,
    catAxisLabelRotate: data.rows.length > 6 ? -25 : 0, valAxisTitle: "NGN millions",
    chartColors: [BURGUNDY, "D46B75"], showSerName: false,
    showValue: false, valGridLine: { color: LINE },
  });
  slide.addShape(pptx.ShapeType.roundRect, { x: 8.85, y: 2.95, w: 4.05, h: 3.7, rectRadius: 0.04, line: { color: LINE }, fill: { color: SOFT } });
  slide.addText("Required run rate", { x: 9.15, y: 3.25, w: 3.4, h: 0.25, color: MUTED, fontSize: 11, bold: true, margin: 0 });
  slide.addText(money(data.totals.requiredMonthlyRunRateNgn), { x: 9.15, y: 3.7, w: 3.4, h: 0.52, color: BURGUNDY, fontSize: 27, bold: true, margin: 0, fit: "shrink" });
  slide.addText("per remaining full month", { x: 9.15, y: 4.28, w: 3.4, h: 0.2, color: MUTED, fontSize: 9, margin: 0 });
  slide.addText(`Gap to Meet\n${money(data.totals.gapToMeetNgn)}`, { x: 9.15, y: 5.05, w: 3.4, h: 0.75, color: INK, fontSize: 15, bold: true, breakLine: false, margin: 0.02 });
}

function addProfitability(pptx: pptxgen, data: MprReportData, slideNumber: number) {
  const slide = pptx.addSlide();
  addChrome(pptx, slide, "RO Profitability", data, slideNumber);
  slide.addShape(pptx.ShapeType.roundRect, { x: 0.42, y: 1.35, w: 12.48, h: 0.55, rectRadius: 0.03, line: { color: "E8D5D7" }, fill: { color: PALE_RED } });
  slide.addText("Illustrative / unapproved: WHT, OPEX, management margin and final profitability require Finance approval before production use.", { x: 0.68, y: 1.54, w: 11.95, h: 0.18, color: BURGUNDY, fontSize: 8.5, bold: true, margin: 0 });
  if (!data.profitability.length) {
    slide.addText("Profitability data is unavailable for this authorized scope.", { x: 1, y: 3.1, w: 11.3, h: 0.55, color: MUTED, fontSize: 20, align: "center", margin: 0 });
    return;
  }
  const rows = [
    ["Relationship Officer", "Interest Income", "Interest Expense", "Illustrative WHT", "Illustrative Margin", "Illustrative OPEX", "Illustrative Result"],
    ...data.profitability.map(row => [row.roName, money(row.interestIncomeNgn), money(row.interestExpenseNgn), money(row.whtNgn), money(row.marginNgn), money(row.opexNgn), money(row.profitabilityNgn)]),
  ];
  slide.addTable(tableRows(rows), {
    x: 0.42, y: 2.18, w: 12.48, border: { type: "solid", color: LINE, pt: 0.7 },
    fill: { color: WHITE }, color: INK, fontSize: 7.5, fontFace: "Aptos", margin: 0.055,
    rowH: 0.43, colW: [2.2, 1.75, 1.75, 1.55, 1.7, 1.55, 1.98],
    bold: false,
  });
  slide.addShape(pptx.ShapeType.rect, { x: 0.42, y: 2.18, w: 12.48, h: 0.43, line: { color: BURGUNDY }, fill: { color: BURGUNDY } });
  rows[0].forEach((label, index) => {
    const widths = [2.2, 1.75, 1.75, 1.55, 1.7, 1.55, 1.98];
    const x = 0.42 + widths.slice(0, index).reduce((sum, width) => sum + width, 0);
    slide.addText(label, { x: x + 0.055, y: 2.31, w: widths[index] - 0.11, h: 0.14, color: WHITE, bold: true, fontSize: 6.8, margin: 0, align: index ? "right" : "left", fit: "shrink" });
  });
  slide.addChart(pptx.ChartType.bar, [
    { name: "Interest Income", labels: data.profitability.map(row => row.roName), values: data.profitability.map(row => row.interestIncomeNgn / 1_000_000) },
    { name: "Interest Expense", labels: data.profitability.map(row => row.roName), values: data.profitability.map(row => row.interestExpenseNgn / 1_000_000) },
    { name: "Illustrative Result", labels: data.profitability.map(row => row.roName), values: data.profitability.map(row => row.profitabilityNgn / 1_000_000) },
  ], {
    x: 0.42, y: 4.05, w: 12.48, h: 2.45, showLegend: true, legendPos: "b", showTitle: false,
    chartColors: [BURGUNDY, "D46B75", "717680"], catAxisLabelFontSize: 8, valAxisLabelFontSize: 8,
    valAxisTitle: "NGN millions", showValue: false, valGridLine: { color: LINE },
  });
}

function addAccountOpening(pptx: pptxgen, data: MprReportData, slideNumber: number) {
  const slide = pptx.addSlide();
  addChrome(pptx, slide, "YTD Account Opening", data, slideNumber);
  slide.addShape(pptx.ShapeType.roundRect, { x: 1.55, y: 2.1, w: 10.25, h: 3.1, rectRadius: 0.06, line: { color: LINE, width: 1 }, fill: { color: SOFT } });
  slide.addText("DATA UNAVAILABLE", { x: 2.05, y: 2.68, w: 9.25, h: 0.3, color: BURGUNDY, fontSize: 12, bold: true, align: "center", charSpacing: 1.4, margin: 0 });
  slide.addText(data.accountOpeningMessage, { x: 2.25, y: 3.35, w: 8.85, h: 1.1, color: INK, fontSize: 17, align: "center", valign: "middle", breakLine: false, margin: 0.05, fit: "shrink" });
}

function addRoPosition(pptx: pptxgen, data: MprReportData, slideNumber: number) {
  const slide = pptx.addSlide();
  addChrome(pptx, slide, "RO Position Summary", data, slideNumber);
  const header = ["Relationship Officer", "Target", "Position", "Achievement", "Signed Gap", "Monthly Run Rate"];
  const body = data.rows.map(row => [row.roName, money(row.newTargetNgn), money(row.balanceSheetNgn), percent(row.achievementPct), money(row.gapToMeetNgn), money(row.requiredMonthlyRunRateNgn)]);
  slide.addTable(tableRows([header, ...body]), {
    x: 0.42, y: 1.48, w: 12.48, border: { type: "solid", color: LINE, pt: 0.7 }, fill: { color: WHITE },
    color: INK, fontSize: 8.5, fontFace: "Aptos", margin: 0.07, rowH: 0.46,
    colW: [2.35, 2.05, 2.05, 1.55, 2.05, 2.43], bold: false,
  });
  slide.addShape(pptx.ShapeType.rect, { x: 0.42, y: 1.48, w: 12.48, h: 0.46, line: { color: BURGUNDY }, fill: { color: BURGUNDY } });
  header.forEach((label, index) => {
    const widths = [2.35, 2.05, 2.05, 1.55, 2.05, 2.43];
    const x = 0.42 + widths.slice(0, index).reduce((sum, width) => sum + width, 0);
    slide.addText(label, { x: x + 0.07, y: 1.62, w: widths[index] - 0.14, h: 0.16, color: WHITE, bold: true, fontSize: 7.8, margin: 0, align: index ? "right" : "left" });
  });
  slide.addChart(pptx.ChartType.bar, [
    { name: "Target", labels: data.rows.map(row => row.roName), values: data.rows.map(row => row.newTargetNgn / 1_000_000) },
    { name: "Position", labels: data.rows.map(row => row.roName), values: data.rows.map(row => row.balanceSheetNgn / 1_000_000) },
  ], {
    x: 0.42, y: 3.55, w: 12.48, h: 2.72, showLegend: true, legendPos: "b", showTitle: false,
    chartColors: [BURGUNDY, "D46B75"], catAxisLabelFontSize: 8, valAxisLabelFontSize: 8,
    valAxisTitle: "NGN millions", showValue: false, valGridLine: { color: LINE },
  });
  slide.addText("The Balance Sheet is the position snapshot for the report cutoff. Targets and positions retain their source labels in the methodology slide.", { x: 0.42, y: 6.55, w: 11.7, h: 0.27, color: MUTED, fontSize: 8.5, italic: true, margin: 0 });
}

function addInvestment(pptx: pptxgen, data: MprReportData, slideNumber: number) {
  const slide = pptx.addSlide();
  addChrome(pptx, slide, "Product Position and Monthly Inflow", data, slideNumber);
  if (data.products.length) {
    slide.addChart(pptx.ChartType.doughnut, [{ name: "Position", labels: data.products.map(row => row.product), values: data.products.map(row => row.positionNgn) }], {
      x: 0.42, y: 1.45, w: 5.9, h: 4.95, showLegend: true, legendPos: "b", showPercent: true,
      showValue: false, showTitle: false, holeSize: 58, chartColors: [BURGUNDY, "B52C38", "C94C56", "D97179", "E69A9F", "F0C7CA"],
      dataLabelColor: WHITE, dataLabelPosition: "bestFit",
    });
  } else {
    slide.addText("Product position is unavailable.", { x: 0.42, y: 3.3, w: 5.9, h: 0.4, color: MUTED, fontSize: 16, align: "center" });
  }
  if (data.inflows.length) {
    slide.addChart(pptx.ChartType.line, [{ name: "Monthly inflow", labels: data.inflows.map(row => monthLabel(row.month)), values: data.inflows.map(row => row.inflowNgn / 1_000_000) }], {
      x: 6.65, y: 1.62, w: 6.25, h: 4.62, showLegend: false, showTitle: false,
      chartColors: [BURGUNDY], lineSize: 2.5, lineDataSymbol: "circle", lineDataSymbolSize: 6,
      valAxisTitle: "NGN millions", catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
      showValue: false, valGridLine: { color: LINE },
    });
  } else {
    slide.addText("Monthly inflow is unavailable.", { x: 6.65, y: 3.3, w: 6.25, h: 0.4, color: MUTED, fontSize: 16, align: "center" });
  }
  slide.addText(`Total position: ${money(data.totals.balanceSheetNgn)}`, { x: 0.68, y: 6.46, w: 4.7, h: 0.24, color: INK, fontSize: 11, bold: true, align: "center", margin: 0 });
  slide.addText("Monthly inflows are presented as reported; source spikes were not smoothed or altered.", { x: 6.75, y: 6.46, w: 6.05, h: 0.24, color: MUTED, fontSize: 8.5, italic: true, align: "center", margin: 0 });
}

function addMethodology(pptx: pptxgen, data: MprReportData, slideNumber: number) {
  const slide = pptx.addSlide();
  addChrome(pptx, slide, "Methodology and Data Sources", data, slideNumber);
  slide.addText("Data sources", { x: 0.42, y: 1.45, w: 3.5, h: 0.3, color: BURGUNDY, fontSize: 14, bold: true, margin: 0 });
  slide.addText(data.sourceVersions.map(source => `• ${source}`).join("\n"), { x: 0.42, y: 1.92, w: 5.95, h: 2.05, color: INK, fontSize: 10, breakLine: false, margin: 0.02, paraSpaceAfter: 9, fit: "shrink" });
  slide.addText("Definitions and conventions", { x: 6.82, y: 1.45, w: 5.4, h: 0.3, color: BURGUNDY, fontSize: 14, bold: true, margin: 0 });
  slide.addText(data.methodology.map(item => `• ${item}`).join("\n"), { x: 6.82, y: 1.92, w: 5.9, h: 2.6, color: INK, fontSize: 10, breakLine: false, margin: 0.02, paraSpaceAfter: 9, fit: "shrink" });
  slide.addShape(pptx.ShapeType.roundRect, { x: 0.42, y: 4.68, w: 12.48, h: 1.38, rectRadius: 0.04, line: { color: "E8D5D7" }, fill: { color: PALE_RED } });
  slide.addText("Production dependency", { x: 0.7, y: 4.97, w: 2.3, h: 0.22, color: BURGUNDY, fontSize: 11, bold: true, margin: 0 });
  slide.addText("Odoo target and Symplus position data are supported through controlled CSV imports. Live API integration, account-opening data, and Finance-approved WHT/OPEX/profitability policies are not yet connected.", { x: 3.05, y: 4.9, w: 9.48, h: 0.62, color: INK, fontSize: 10.5, breakLine: false, margin: 0.02, fit: "shrink" });
}

export async function generateMprPresentation(data: MprReportData): Promise<Buffer> {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "SAMTL Management Information System";
  pptx.company = "SAMTL";
  pptx.subject = `Monthly Performance Review for ${data.teamName}`;
  pptx.title = `${data.teamName} Monthly Performance Review`;
  pptx.theme = {
    headFontFace: "Aptos Display", bodyFontFace: "Aptos",
  };
  pptx.defineSlideMaster({
    title: "BLANK_SAMTL", background: { color: WHITE }, objects: [],
    slideNumber: { x: 12.35, y: 7.15, w: 0.5, h: 0.2, color: MUTED, fontSize: 8, align: "right" },
  });

  addCover(pptx, data);
  let slideNumber = 2;
  for (let index = 0; index < data.rows.length; index += 9) addTeamSummary(pptx, data, index, slideNumber++);
  addPositionVsTarget(pptx, data, slideNumber++);
  addProfitability(pptx, data, slideNumber++);
  addAccountOpening(pptx, data, slideNumber++);
  addRoPosition(pptx, data, slideNumber++);
  addInvestment(pptx, data, slideNumber++);
  addMethodology(pptx, data, slideNumber);

  const output = await pptx.write({ outputType: "nodebuffer", compression: true });
  if (typeof output === "string" || output instanceof Blob) throw new Error("Unexpected PowerPoint output type.");
  if (output instanceof ArrayBuffer) return Buffer.from(new Uint8Array(output));
  return Buffer.from(output);
}
