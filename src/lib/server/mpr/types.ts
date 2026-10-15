export interface MprTeamRow {
  teamId: string;
  teamName: string;
  roId: string;
  roName: string;
  newTargetNgn: number;
  balanceSheetNgn: number;
  gapToMeetNgn: number;
  achievementPct: number | null;
  remainingFullMonths: number;
  requiredMonthlyRunRateNgn: number | null;
  targetSource: string;
  positionSource: string;
  targetDefinition: string;
  positionAsOfDate: string;
  dataClassification: string;
}

export interface MprProfitabilityRow {
  roId: string;
  roName: string;
  interestIncomeNgn: number;
  interestExpenseNgn: number;
  whtNgn: number;
  marginNgn: number;
  opexNgn: number;
  profitabilityNgn: number;
  status: string;
}

export interface MprProductRow { product: string; positionNgn: number }
export interface MprInflowRow { month: string; inflowNgn: number }

export interface MprReportData {
  teamId: string;
  teamName: string;
  reportingCutoff: string;
  reportingMonth: string;
  generatedAt: string;
  generatedBy: string;
  scopeLabel: string;
  rows: MprTeamRow[];
  totals: MprTeamRow;
  profitability: MprProfitabilityRow[];
  products: MprProductRow[];
  inflows: MprInflowRow[];
  accountOpeningAvailable: false;
  accountOpeningMessage: string;
  synthetic: boolean;
  sourceVersions: string[];
  methodology: string[];
}
