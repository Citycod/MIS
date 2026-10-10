# Brand Direction and Design Handoff — Sterling Bank Nigeria–Inspired

**Stakeholder statement:** “the brand colour palette is similar to sterling bank color pelette” (09 October 2026). Interpreted as a request to shift the PIS UI **away from navy/royal blue** into a professional **red / charcoal / white / warm-neutral** design family. This is a **visual direction**, not permission to use Sterling Bank Nigeria's logo or assert its official color specifications.

## Reference and verification status

- Nigerian institution: **Sterling Bank Nigeria** (`https://sterling.ng/`), **NOT Starling Bank UK**.
- Third-party brand reference (`https://brandfetch.com/sterling.ng`) reports red `#CF2E2E`, warm sienna `#CF8D4D`, dark gray `#333333`.
- Their HEX accuracy has **not been verified against a current official Sterling brand manual**. Use these as inspiration and request the product owner's actual brand files for final approval.
- Product name and identity remain **PIS — Performance Information System**.

## Proposed UI design tokens

| Role | HEX | Implementation guidance |
|---|---|---|
| Brand primary | `#CF2E2E` | selected navigation / key CTA / links; check WCAG contrast |
| Primary hover | `#AA2227` | button hover/pressed |
| Brand dark | `#741F24` | restrained login-hero gradient |
| Sidebar / charcoal | `#333333` | sidebar background, dark surfaces |
| Warm accent | `#CF8D4D` | limited highlights; not small foreground text on white |
| Pale brand tint | `#FFF1EE` | selected table/list state |
| Canvas | `#F8F9FA` | application background |
| Surface | `#FFFFFF` | card/table surfaces |
| Primary text | `#24252B` | headings, values |
| Secondary text | `#667085` | supporting labels |
| Border | `#E5E7EB` | field and panel outlines |
| Positive | `#16794A` | positive financial movement only |
| Negative | `#B42318` | negative financial movement, *always* with a sign / text |
| Warning | `#A96514` | warning, missing metric definitions |

### Suggested layouts

- **Login:** visual PIS brand pane in deep burgundy/red; sign-in white surface, clear focus and error states.
- **RO dashboard:** charcoal sidebar, white topbar, neutral canvas, red Apply action, filters before KPIs, monthly movement and portfolio-vs-target charts, MTD/YTD investment mix donut.
- **Regional Manager dashboard:** identical shell; regional and RO selector active within assigned authorization; comparatives use neutral + red emphasis, not traffic-light RO rating/status badges.
- **Reports:** mostly neutral financial tables; red used for links and active selection; avoid turning every table cell into a colored metric.

## Apache Superset theme

- Synchronize chart font, background, border and categorical palette with the app theme.
- Suggested six-category palette: `#CF2E2E`, `#CF8D4D`, `#2F8F83`, `#587598`, `#8163A7`, `#959BA5`.
- Labels and tooltip values must identify month / MTD or YTD / metric denominator / currency.
- Investment mix donut is **composition**, not ranking product performance.
- Ensure status indicators are not reintroduced through chart colors.

## Scope precedence

Boss's revised functional instructions still supersede earlier screenshots. The brand direction changes **color/visual identity only**, not the approved or pending KPI formulas, frontend stack (**Next.js App Router**), roles (**RO and Regional Manager**), or Superset architecture.

## Brand sign-off checklist

- [ ] Product owner confirms whether PIS is simply **inspired by** Sterling or belongs to an institution with its own actual brand guideline.
- [ ] Actual corporate logo and permitted usage supplied; never copy the Sterling logo without rights.
- [ ] Primary color and exact HEX values confirmed from stakeholder brand file.
- [ ] UX review of login, RO dashboard and Regional Manager dashboard in this theme.
- [ ] WCAG 2.2 AA contrast and chart accessibility verified.
- [ ] Superset and Next.js themes visually match.

**Do not claim or advertise this palette as an official Sterling Bank design system.**
