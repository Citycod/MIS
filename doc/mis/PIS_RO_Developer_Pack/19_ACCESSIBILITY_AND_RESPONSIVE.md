# Accessibility, Responsive Design and UX Quality Checklist

## Target standard

Design and test to **WCAG 2.2 AA** where applicable. Financial data dense UIs need a stronger-than-default approach to keyboard, table and chart accessibility.

## Responsive breakpoints (proposed)

- ≥1440px: expanded 240px sidebar, four-filter strip + actions in one row, 4–6 KPI cards with readable value wrapping, charts side-by-side when legible.
- 1024–1439px: collapsible sidebar, filters can wrap two rows, cards 3 or 4 columns, charts often stacked.
- 768–1023px: sidebar drawer, 2-column KPIs, filter controls in 2×2 grid, table horizontal scroll.
- <768px: nav drawer, one-column KPI cards, stacked filters, charts resize/contain, priority table columns pinned, explicit horizontal scroll affordance.

## Filter placement and accessible behavior

`Region | RO | Date | Product` must remain **above** dashboard charts on all devices. Use semantic labels and selected-value announcements. If disabled for RO, show as readonly scope (`My Region`, `My RO`), not confusing unlabeled disabled placeholders. Announce Apply completion and result-count changes with polite live region where appropriate.

## Data display

- Every table: `<caption>`/accessible name, header associations, sort state, keyboard-accessible pagination, text alternatives for row menus.
- Superset charts require adjacent textual summaries or accessible data-table equivalents when chart itself is not fully accessible.
- Sign of movement should be in wording (+, −, Increase, Decrease), not only red/green.
- Keep amount+unit+currency visible; `₦` not sufficient for mixed-currency tables.
- Scale large financial digits sensibly: abbreviated cards, full values in tooltips/detail views.

## Interaction and form rules

- All controls keyboard operable and touch target sizes appropriate for WCAG.
- Modal/dialog focus trap, Escape close where expected, focus returns to trigger.
- Inline validation must be associated with label and not rely only on color.
- Focus ring visually clear across charcoal sidebar, red action controls and white surfaces; verify red/white contrast and do not rely on red/green color alone to communicate financial movement.
- Auth errors do not disclose whether staff identifier exists if authentication policy forbids it.

## Performance and chart usability

- Avoid microscopic legends or cramped side-by-side iframes; allow charts to stack.
- Show report period and last refresh without depending on a chart tooltip.
- Donut has a separate legend/table of product name, amount and percent, and indicates MTD/YTD selection.
- For manager >10 ROs, use horizontal sorted chart with virtual/paged table rather than compressed category labels.
- Error/loading states sized to avoid major layout shifts.

## QA accessibility cases

1. Keyboard from topbar to filters to cards to chart summary to table works in logical order.
2. Region/RO locked scope is announced to screen reader.
3. Date picker conveys month/year and partial-period status.
4. Chart alternative data table conveys numerical differences.
5. Mobile viewport can reach all table columns via scrolling and clear affordance.
6. Low contrast or dark-mode failure does not erase red negative movement meaning.
7. Superset iframe has meaningful title and loading state; focus does not become trapped.
8. 200% zoom retains all core navigation and filter operations.
