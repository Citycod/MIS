# Security, Roles, Region Scoping and Superset Row-Level Security

## Principle: deny by default, enforce at every layer

**Frontend gates are not security gates.** Enforce authorization in source/reporting APIs, report jobs, database/reporting views and Apache Superset guest tokens. Source originally described RO, Manager, Executive, Admin; new boss direction adds explicit **Regional Manager** and regional scope. Executive/Admin UI not in current release.

## Access matrix

| Resource / action | RO | Regional Manager |
|---|---|---|
| Own dashboard/KPIs | Own RO | ROs in assigned region(s) |
| Region filter | Locked to authorized region | Select only assigned region(s) |
| RO filter | Locked to own RO | All authorized ROs in selected region or one assigned RO |
| Date/Product filter | Own data | Region-scoped data |
| Customer/deal details | Only own historical/approved assignments | Only region-scoped authorized records |
| Regional comparison | No | Yes, own region only |
| Export | If policy allows, own scope | If policy allows, own region scope |
| Edit customers/investments | Not approved | Not approved |
| Account opening | Not in release | Not in release |
| Admin/security/rate settings | No | No |

## Permission effective-dating

- RO identity maps to `ro_id` and effective-dated region membership.
- Regional manager identity maps to a set of approved region assignments.
- Historical view policy: **pending sign-off** (historic RO reassignment and manager visibility). Until approved, prefer conservative current authorized scope with historical row attribution retained and no unauthorized exposure.
- Customer-to-RO attribution must preserve history; event cutoff and `valid_from/to` used for joins.
- Return permitted RO options from backend per region + as-of; revalidate every data request.

## Database and application authorization policy

- All database access happens from **trusted Next.js Node server code** (or approved internal server infrastructure). No browser driver, direct DB hostname, credential or raw SQL.
- DBA provides read-only DB accounts with minimum privileges: the application may read only approved tables/views; Superset receives an **independent read-only** BI principal limited to approved views.
- Bind every request to a verified staff/user → region/RO entitlement mapping and effective reporting date, **not** client filter values. Authorize nested record IDs with scope predicates in parameterized SQL queries.
- Use `server-only` database repository methods; allowlist columns/sorts/object identifiers, bind values, bound result size/timeouts and add query/audit correlation IDs.
- Confirm underlying DB view execution privileges, SQL security mode and optional DB-native row-level security with DBA. If one broad service account is used, every repository path must correctly enforce effective scope; this is an additional security burden, not a reason to filter after fetching all records.
- DB scope checks and **Superset RLS/dataset grants** are independent, both mandatory. A BI dashboard cannot expose unauthorized rows by changing a native filter or chart query.
- Financial calculated values come from approved SQL views, not user-controlled SQL or Next.js arithmetic.
- Never return a 200/empty result for a DB outage that would misrepresent zero portfolio. Handle actual 401/403/404/DB timeout separately.
- Audit denied scope, sensitive record reads and exports without logging bank data or SQL containing values.

## Superset embed security — baseline

Official embedded SDK expects a backend `fetchGuestToken` flow; backend talks to Superset's guest-token API with trusted credentials. Guest token resources must be dashboard-scoped, and RLS clauses generated **server-side** from verified authorized region/RO membership. Explicit allowed embedding origins, TLS and CSP/frame-ancestor settings are required. Token expiration/refresh tested.

**Required defenses:**
1. Superset `EMBEDDED_SUPERSET` flag enabled and embedding allowed domains explicitly configured (empty domain allow-list may be unsafe; verify deployed version).
2. Scoped account permitted only to mint guest tokens for authorized dashboard resources.
3. RLS on every dataset used by all displayed charts and native filter queries, not just the headline chart.
4. Dashboard/chart metadata access locked down to required permissions.
5. Users cannot choose an arbitrary dashboard UUID or inject their own RLS statement.
6. Any Superset in-dashboard filters are additionally constrained by secured dataset rows.
7. End-to-end test across charts, downloads and API under region/RO tampering.

**Important version caveat:** Superset has evolving SQL dataset/semantic-view behaviors. RLS enforcement for semantic views is version-dependent; do not assume guest SQL rules cover every data source type. Use the documented and tested security model of the deployed version and do not expose unsafe semantic views. Official docs: https://superset.apache.org/user-docs/using-superset/embedding/ and https://superset.apache.org/developer-docs/api/schemas/guesttokencreate/.

## Authentication

Use existing institutional SSO/OIDC if available; password signin only if provisioned and agreed. Backend session should use `HttpOnly`, `Secure`, appropriate SameSite and CSRF protections. Avoid browser localStorage for long-lived credentials. Support idle/session expiry and secure logout with cache clearance.

## Data privacy

- Customer names/accounts and banking positions are confidential; least privilege throughout.
- Redact account numbers where policy requires, including search and screenshots.
- Store fixture data as synthetic identifiers only.
- Keep connection secrets out of repo, dashboards and frontend build artifacts.
- Export links expire, require permission check and include audit records.

## Next.js App Router security enforcement

- The secured `(workspace)/layout.tsx` loads the authenticated principal and rejects missing or unauthorized sessions. **Do not consider this layout check sufficient for record-level authorization:** every protected page data fetch, nested dynamic ID, Next.js Route Handler and database read must independently validate scope.
- Validate `searchParams`, dynamic `[roId]` / `[customerId]` / `[investmentId]`, report IDs and session context before querying; a region-swapped deep link must not render RSC or stream a fragment with unauthorized data.
- Optional Next.js middleware/proxy may redirect anonymous users for UX, but cannot replace database-level/source RLS where supported, Route Handler verification or permission checks.
- Confidential data and guest token BFF responses set private/no-store caching, and server-only secrets never use `NEXT_PUBLIC_`.
- Ensure appropriate CSRF/origin protections for unsafe Route Handler methods and secure cookie sessions. Consider subdomain/session/cross-site policies when embedding Superset.
- On logout/session switch, invalidate client query caches, and do not let browser back or server-side caching reveal previous user data.

## Negative security tests

1. RO swaps URL `roId` to another RO; zero data disclosed.
2. Manager selects unauthorized `regionId`; 403 and no chart.
3. Manager tries known other-region customer/investment ID; forbidden.
4. Embedded guest token for one region cannot query another by native filters/crossfilter/chart link.
5. Superset dashboard modified to add chart from unauthorized dataset; permission/RLS prevents disclosure.
6. Report export and cached report cannot cross scope boundaries.
7. Browser back after logout doesn't show sensitive cached state.
8. Role/region assignment changed mid-session invalidates old scope and guest tokens on next access.
