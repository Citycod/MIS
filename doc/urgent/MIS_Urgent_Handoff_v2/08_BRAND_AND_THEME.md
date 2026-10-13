# 08 — MIS brand tokens and theme proposal

The branding direction previously agreed is **Sterling Bank Nigeria–inspired**. It is not a certified corporate design guide or permission to reuse Sterling's protected logo. Continue to use the organization's approved MIS mark when available.

| Semantic token | Light | Dark (proposal) |
|---|---|---|
| `--brand-primary` | `#CF2E2E` | `#F05B5B` (contrast-adjusted interaction accent) |
| `--brand-burgundy` | `#741F24` | `#A84A51` |
| `--surface-app` | `#F8F9FA` | `#151515` |
| `--surface-card` | `#FFFFFF` | `#242424` |
| `--surface-nav` | `#333333` | `#101010` |
| `--text-primary` | `#262626` | `#F5F5F5` |
| `--text-secondary` | `#64748B` | `#BABABA` |
| `--border` | `#E5E7EB` | `#414141` |
| `--positive` | `#15803D` | `#4ADE80` |
| `--negative` | `#B91C1C` | `#FDA4AF` |

### Implementation rules, if approved

- Use CSS variables and semantic Tailwind tokens, not hardcoded color hex values throughout components.
- Theme control should offer Light, Dark, System; persist in user preference (or strictly client-side cosmetic local preference) without involving permissions.
- Preserve tabular numerals, readable finance tables and AA color contrast; red means navigation/action where appropriate, not necessarily negative financial performance.
- Superset **may require its own theme configuration**; a Next.js theme toggle alone will not recolor an embedded iframe. Verify installed Superset 6.1.0 theme support; acceptable fallback is a clearly framed light Superset analytics surface in dark shell.
- Existing approved dashboard screenshots are layout/density references, **not** approved brand asset downloads.
