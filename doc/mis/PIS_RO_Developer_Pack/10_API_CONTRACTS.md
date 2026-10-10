# Next.js BFF and DTO Contracts — Direct CRM Database + SQL Views

**Version:** 1.4 (10 October 2026). The CRM REST API is **not** a source in the current architecture. This document defines **proposed HTTP contracts exposed by the PIS application itself**, chiefly optional Next.js Route Handlers for browser-originating table queries, filters, exports and Superset tokens. They are **not** external CRM API URLs. Next.js Server Components can query a `server-only` database repository directly; there is no need to create an internal HTTP route solely to call another local Server Component.

## Trusted data boundary

`Browser → authenticated Next.js Server Components and narrowly scoped BFF → read-only parameterized SQL against existing CRM tables/approved finance SQL views`. For BI: `Superset (separate self-hosted server) → read-only reporting views`, with a trusted Next.js guest-token broker for embedding.

- The database engine, schema and exact SQL view names remain **unknown** until `24` is signed off.
- Financial KPIs must be read from approved SQL view results and **never independently calculated in React, Route Handlers, or Superset SQL Lab**.
- Keep database connection strings and credentials server-only. Do not use database drivers in browser code or Next.js Edge runtime.
- All filter/record queries must intersect request parameters with session-bound Region/RO entitlements.
- Request and response payload examples below are **synthetic draft contracts**, not proof of existing DB columns or official monthly definitions.
- Optional BFF route naming `/api/bff/*` is preferred over a public-looking `/api/v1/*` namespace; choose actual URLs once implementing the repository and UI needs.

## Common conventions

- Example prefix `/api/bff` (if a browser-facing Route Handler is needed). HTTPS required. Cookie-backed session or OIDC bearer strategy consistent with identity architecture; no long-lived token in localStorage.
- Dates ISO `YYYY-MM-DD`; timestamps ISO 8601 with offset/UTC. Currency as ISO 4217.
- Money and precise rates encoded as decimal **strings**.
- Pagination via `page`, `pageSize`, `sort`, `direction`; server validates fields.
- Filters: `regionId`, `roId`, `period`, `from`, `to`, `asOf`, `productId`. RO `roId` is implicitly bound to auth user; regional manager `roId` optional.
- Auth scope is enforced server-side; forbidden requested scope returns `403`, not silent broader datasets.
- `dataVersion`, `metricVersion`, `reportingAsOf`, `isProvisional` provided whenever needed for reconcilability.

## Endpoint distinction: actual CRM paths vs proposed PIS paths

The table below contains **proposed application-owned endpoints**, not CRM REST URLs. Data is resolved through Next.js server-side repositories from approved database objects. Authentication details, view mappings and physical columns are discovered from the actual database/identity system (`23`, `24`). Do not implement `/api/v1` just because these examples exist.

## Endpoints

| Method | Endpoint | Use |
|---|---|---|
| `GET` | `/auth/me` | identity, role, scoped regions/RO, feature entitlements |
| `GET` | `/filters/options?regionId=&asOf=` | region/RO/product permitted options |
| `POST` | `/filters/resolve` | validate/normalize applied role-safe filter context |
| `GET` | `/dashboards/ro` | RO headline KPIs and dataset metadata |
| `GET` | `/dashboards/regional` | Regional Manager KPI summary |
| `GET` | `/portfolio/movement` | monthly movement ledger |
| `GET` | `/portfolio/positions` | paged customer/deal positions |
| `GET` | `/relationship-officers` | region-scoped RO table |
| `GET` | `/relationship-officers/{roId}` | assigned/authorized RO detail |
| `GET` | `/customers` | authorized customer directory |
| `GET` | `/customers/{id}` | customer context |
| `GET` | `/investments` | authorized deal list |
| `GET` | `/investments/{id}` | deal and calculation view |
| `GET` | `/profitability` | approved financial summary/details |
| `GET` | `/targets` | approved position and run-rate targets |
| `GET` | `/maturities` | month-grain schedule and rollovers |
| `GET` | `/reports/catalog` | allowed report templates |
| `POST` | `/reports/exports` | server-scoped export job |
| `GET` | `/reports/exports/{jobId}` | state and expiring download entitlement |
| `GET` | `/analytics/registry` | configured Superset embedded IDs/manifest |
| `POST` | `/analytics/guest-token` | secure short-lived scoped Superset token |

## 1. `/auth/me` example

```json
{
  "userId": "USR-RM-001",
  "displayName": "Regional Manager Example",
  "roles": ["REGIONAL_MANAGER"],
  "regions": [{"id": "REG-01", "name": "Lagos Region"}],
  "defaultRegionId": "REG-01",
  "roId": null,
  "capabilities": ["regional:read", "ro:read", "reports:export"]
}
```

RO response instead has `roles:["RO"]`, one fixed `roId` and authorized region mapping; never use client-supplied roles for authorization.

## 2. `/filters/resolve` request/response

```json
{
  "regionId": "REG-01",
  "roId": null,
  "period": "YTD",
  "from": "2026-01-01",
  "to": "2026-10-08",
  "asOf": "2026-10-08",
  "productId": null
}
```

```json
{
  "effectiveFilters": {
    "regionId": "REG-01",
    "roId": null,
    "allowedRoIds": ["RO-001", "RO-002"],
    "period": "YTD",
    "from": "2026-01-01",
    "to": "2026-10-08",
    "asOf": "2026-10-08",
    "productId": null
  },
  "scopeId": "opaque-scope-reference",
  "dataVersion": "snapshot-2026-10-08-v3",
  "isProvisional": true
}
```

`scopeId` is opaque, expires and must be validated against session/role on every use; it is **not** a bearer authorization substitute.

## 3. RO dashboard example

```json
{
  "effectiveFilters": {"regionId":"REG-01","roId":"RO-001","productId":null,"period":"YTD","asOf":"2026-10-08"},
  "dataVersion": "snapshot-2026-10-08-v3",
  "currency": "NGN",
  "metrics": {
    "closingPortfolio": {"value":"800000000","definitionId":"CLOSING_POSITION_V1","status":"available"},
    "annualTarget": {"value":"1200000000","definitionId":"ANNUAL_POSITION_TARGET_V1","status":"available"},
    "achievementPct": {"value":"66.6667","definitionId":"ACHIEVEMENT_V1","status":"available"},
    "remainingGap": {"value":"400000000","definitionId":"POSITION_GAP_V1","status":"available"},
    "monthlyRequiredPace": {"value":"100000000","definitionId":"MONTHLY_PACE_V1","status":"available"}
  },
  "reportingAsOf": "2026-10-08T17:00:00Z",
  "isProvisional": true
}
```

This deliberately synthetic worked example comes from the source case and assumes four remaining months; date chosen for UI illustration is **not** a complete accounting reconciliation. Do not use these values as asserted actuals.

## 4. Monthly portfolio movement example

```json
{
  "currency": "NGN",
  "periodGrain": "MONTH",
  "definitionVersion": "MOVEMENT_RECONCILIATION_PENDING_APPROVAL",
  "months": [
    {
      "month": "2026-09",
      "openingPosition": "710000000",
      "newExternalInflow": "120000000",
      "externalOutflow": "30000000",
      "valuationAccrualAdjustment": "0",
      "otherAdjustment": "0",
      "netExternalMovement": "90000000",
      "closingPosition": "800000000",
      "reconciled": true
    }
  ]
}
```

## 5. Regional comparison example

```json
{
  "regionId": "REG-01",
  "month": "2026-09",
  "currency": "NGN",
  "rows": [
    {
      "roId":"RO-001", "roName":"RO Example A",
      "closingPosition":"800000000", "approvedTarget":"1200000000",
      "achievementPct":"66.6667", "remainingGap":"400000000",
      "monthlyNetMovement":"90000000", "monthlyRequiredPace":"100000000"
    }
  ],
  "page": 1, "total": 1
}
```

No `status` field for performance comparisons.

## 6. Investment mix donut example

The data must come from approved BI semantic views, not be calculated by client; possible API counterpart for parity/debugging:

```json
{
  "metricId":"ELIGIBLE_INVESTMENT_FLOW_AMOUNT_V1",
  "period":"MTD",
  "currency":"NGN",
  "denominator":"50000000",
  "slices":[
    {"productId":"FIXED_DEP","productName":"Fixed Deposit","amount":"30000000","percentage":"60.00"},
    {"productId":"T_BILL","productName":"Treasury Bills","amount":"20000000","percentage":"40.00"}
  ]
}
```

**The selected denominator is provisional until business signs off** (see `08` and `15`).

## 7. Superset token flow

`POST /analytics/guest-token` with a *server-registered* dashboard key + validated opaque `scopeId`; backend checks authorized dashboard + session + effective filters and mints a short-lived Superset guest token. Response includes `token`, `expiresAt` and `dashboardUuid`. Do not allow client to send raw RLS SQL clauses or arbitrary Superset resource ID.

## 8. Standard errors

```json
{
  "error": {
    "code": "SCOPE_NOT_ALLOWED",
    "message": "You do not have access to the requested region or officer.",
    "requestId": "req-example-123"
  }
}
```

Other codes: `AUTH_REQUIRED`, `INVALID_PERIOD`, `METRIC_NOT_APPROVED`, `DATA_NOT_READY`, `REPORT_EXPORT_NOT_SUPPORTED`, `SUPERSET_UNAVAILABLE`, `RATE_LIMITED`.

## CRM-aware response normalization requirements

- Map verified database columns and signed-off SQL view values to stable DTOs **inside server-only data access**.
- Every row and detail lookup must be independently scoped by verified Region / RO membership; client-controlled filters cannot broaden DB query scope.
- Preserve approved money/percentage precision as decimal strings, distinguish null from zero and carry currency, reporting `asOf`, calculation/view version and provisional status where available.
- Database table/views missing required attributes produce a documented contract gap. No invented source columns, fallback calculations, shadow CRM or client-side financial formulas.
- Use bound parameters and allowlists for queryable sort fields, selected columns and filter options; guard against SQL injection and unbounded result sets.
- No database credentials/SQL query strings in client bundles, stack traces, Superset iframe, logs or export metadata.
- Superset accesses authorized reporting SQL views via its own least-privilege principal, with independently tested regional RLS.

## Anti-contracts

- Do **not** add `/account-opening`, `/accounts/today`, `/product-performance` or daily account-opening endpoints in this release.
- Do **not** trust UI-hidden controls, `scopeId`, or URL alone for user access.
- Do **not** expose admin-only maintenance endpoints to RO/manager routes.
