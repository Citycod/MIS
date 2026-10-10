# UI Design System — Sterling Bank Nigeria–Inspired Direction

**Status:** Proposed design direction from user review, 09 October 2026. **NOT an official Sterling Bank brand guide.** Sterling Bank Nigeria's recognized visual identity is primarily red with charcoal and warm neutral accents. The application is called **Performance Information System (PIS)** and must not present itself as Sterling Bank, reuse a protected logo, or assume the user is licensed to use Sterling's brand assets. Obtain the organization's actual logo and approved brand guidelines before production branding sign-off.

## Brand goals

Premium Nigerian enterprise banking, precise, professional, restrained, functional and accessible. The earlier blue/navy mockups are **obsolete as color references** but may be reused as information-density and layout references. Avoid bright-red backgrounds behind every panel; use red selectively for the active navigation, primary actions, selection, links and chart highlights. Favor charcoal navigation, a soft warm-white application canvas and white surfaces.

## Proposed palette / semantic design tokens

| Token | Hex | Usage / note |
|---|---|---|
| `--brand-primary` | `#CF2E2E` | Sterling-inspired red identity; sourced as a *third-party reported* Sterling Bank color, **not verified official HEX** |
| `--brand-primary-hover` | `#AA2227` | Proposed darker hover/pressed state |
| `--brand-deep` | `#741F24` | Proposed burgundy for optional login hero and brand depth |
| `--brand-charcoal` | `#333333` | Reported Sterling charcoal; dark navigation and strong text |
| `--brand-gold` | `#CF8D4D` | Reported warm accent; sparing highlighting, never primary small text on white |
| `--brand-tint` | `#FFF1EE` | Light red-selected state or subtle highlight |
| `--canvas` | `#F8F9FA` | Main application background |
| `--surface` | `#FFFFFF` | Cards, tables, menus, overlays |
| `--text-primary` | `#24252B` | Content typography |
| `--text-muted` | `#667085` | Secondary copy and metadata |
| `--border` | `#E5E7EB` | Dividers, input outlines |
| `--positive` | `#16794A` | Positive financial movement (accompanied by sign/word) |
| `--negative` | `#B42318` | Negative financial movement (accompanied by sign/word); **not interchangeable with brand primary** |
| `--warning` | `#A96514` | Caution and unconfirmed KPI definitions |
| `--focus-ring` | `#CF2E2E` | Keyboard-visible outline on white surfaces |

Colors inspired by the general brand palette at `https://brandfetch.com/sterling.ng` (third-party) and Sterling Bank's public communications at `https://sterling.ng/`. Validate exact institutional HEX codes with the stakeholder's design/brand team. This palette is an original product UI interpretation, not a purported copy of proprietary bank guidelines.

### Usage priority

1. **Sidebar:** charcoal `#333333`, white navigation labels, active item indicated by a red marker and/or red-tinted selection. The active item needs a shape/weight cue, not color alone.
2. **Top bar:** white surface and thin divider. Reporting period, role and global Region / RO / Date / Product filters appear above all KPI cards.
3. **Primary buttons:** `#CF2E2E` with white accessible text, darken on hover, visible focus ring. Secondary buttons use neutral border and dark text.
4. **KPI cards:** white with charcoal headings, tabular numerals, small red primary emphasis only for interactive links/selected metrics.
5. **Login:** a restrained burgundy/red branding panel with a white sign-in surface; do not use Sterling's logo unless explicitly licensed.
6. **Tables:** alternating subtle neutral rows or row-hover tint; red should not be used to simulate an operational status.
7. **Dark mode:** optional; define separate accessible semantic equivalents and test all contrasts rather than inverting tokens automatically.

### Superset categorical chart palette

These are **proposed visualization colors**, not claimed institutional brand codes. Configure a coordinated Superset color scheme (and accessible legend labels) for the MTD/YTD investment-mix donut:

- `#CF2E2E` red
- `#CF8D4D` muted gold
- `#2F8F83` teal
- `#587598` slate-blue (chart category only, not primary brand UI)
- `#8163A7` muted violet
- `#959BA5` neutral gray/Other

Use **red only once** in most charts to create a clear brand anchor; use neutral bars for comparison and red highlight for selected/important series. Signed monthly portfolio movements should show positive/negative direction with axis, +/- sign, tooltips and a legend, not red/green alone. For negative financial values, use explicit sign and text; do not confuse the visual brand red with an error.

Charts are served by **Apache Superset**, not rendered with client-side chart libraries. Superset dashboard themes/chart palettes should be configured independently of frontend CSS so the embed feels seamless.

## Typography and layout

- Font: Inter (fallback system sans), with tabular numerals on financial amounts.
- Page title 26–30px semibold; KPI 22–28px; card headings 14–16px; dense table 13–14px; helper text 12–13px.
- 8px spacing scale; desktop sidebar 232–248px; content gutter 24–32px; card radius 10–12px; quiet shadows and subtle borders.
- Support high-density 1440px/1280px and responsive tablet/mobile layouts. Avoid tiny chart labels or nested horizontal scrollbars.

## Shared UI component inventory

`AppShell`, `NavigationSidebar`, `HeaderSearch`, `PageTitle`, `GlobalFilterBar`, `LockedFilter`, `PeriodSwitcher`, `ScopeBreadcrumb`, `KpiCard`, `CurrencyValue`, `PercentageValue`, `FinancialDelta`, `TargetProgress`, `MetricDefinitionTooltip`, `PeriodNotice`, `SupersetDashboardContainer`, `DataTable`, `SortableHeader`, `ExportMenu`, `Skeleton`, `ErrorPanel`, `EmptyState`, `AccessDenied`, `CustomerSummary`, `InvestmentDetails`, `MaturityTable`, `ProfilePanel`.

## Global filter bar — mandatory

**Order:** Region → RO → Date → Product → Apply → Reset. Controls must be **above the KPI cards and charts** on every board and data view. RO users see locked Region and RO selectors with explanation `Restricted to your assigned portfolio`; Regional Managers can select only authorized regions and relevant ROs.

## Chart and financial presentation

- Explicit month-grain x-axis for movement charts; MTD/YTD toggle clearly attached to investment composition donut. Do not imply a product-performance leaderboard.
- Every chart needs title, period, unit, as-of date, legend, and an empty/error state.
- Stock values (closing portfolio) must not be added across months; flow values (new inflow, withdrawals) may be summed only per approved definitions.
- Cards may use `₦800m`; details show `₦800,000,000` or `NGN 800,000,000.00` per approved institution policy.
- Negative money: `−₦5,000,000` with red treatment plus visible minus sign; never color alone.
- Percent: `66.67%`; interest and WACC: `p.a.` where relevant.
- No data: `—`; unavailable financial rule: `Pending definition`; actual zero: `0`.
- Do not mix unlike currencies into one sum without approved conversion rules.

## Interaction and accessibility

- All buttons, links, dialogs and filters must work and have loading/empty/error/disabled/focus states.
- WCAG 2.2 AA target; measure contrast on button text, small muted labels, form borders, red links and chart labels.
- Table views: sticky identifier column, sorting, pagination, controlled overflow and authorized exports.
- Keep Recent Activity, Account Opening, Product Performance scorecards, and RO Status dashboard badges **removed** per latest boss change control.

## Visual review checklist

- Does this look Sterling Bank Nigeria **inspired** (red/charcoal/white/warm accent), not the obsolete navy-and-blue exploration?
- Are Region, RO, Date, Product filters above all content and role-correct?
- Does the Product Investment Mix donut provide MTD/YTD and show its denominator?
- Are monthly portfolio movements and Regional Manager comparison charts readable and accurate?
- Have removed account-opening, daily activity, standalone product-performance and status dashboards stayed removed?
- Are there accessible non-color cues for signed movements, selection and focus?
