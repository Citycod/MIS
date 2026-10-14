"""Provision a separate SAMTL-styled draft dashboard without replacing existing resources."""
import argparse
import json
from pathlib import Path

from superset.app import create_app

ROOT = Path(__file__).resolve().parents[2]
RUNTIME = ROOT / ".local" / "superset"
ORIGINS = [
    "http://127.0.0.1:3000", "http://127.0.0.1:3100", "http://127.0.0.1:3200",
    "http://localhost:3000", "http://localhost:3100", "http://localhost:3200",
]

# User-approved synthetic distribution for the seven SAMTL products. Each
# Region/RO/month keeps its existing all-product inflow total; only the demo
# product split is generated here.

PHASE2_SQL = """
WITH movement AS (
  SELECT m.* FROM dev_synthetic_movement m
  WHERE m.period_mode='YTD' AND m.product_filter='PROD-ALL' AND m.as_of_date=(
    SELECT MAX(m2.as_of_date) FROM dev_synthetic_movement m2
    WHERE m2.region_id=m.region_id AND m2.scope_key=m.scope_key
      AND m2.product_filter='PROD-ALL' AND m2.period_mode='YTD'
  )
), scopes AS (
  SELECT DISTINCT p.region_id,
    CASE p.region_id WHEN 'REG-01' THEN 'Lagos Region' WHEN 'REG-02' THEN 'Abuja Region' ELSE p.region_id END region_name,
    p.scope_key, CASE WHEN instr(p.scope_key, ',') > 0 THEN 'All Relationship Officers'
      WHEN p.scope_key='RO-001' THEN 'Adebayo Sterling' WHEN p.scope_key='RO-002' THEN 'Chioma Okonkwo'
      WHEN p.scope_key='RO-003' THEN 'Emeka Nwosu' ELSE p.scope_key END scope_label
  FROM dev_synthetic_position p
), products AS (
  SELECT 'All Products' product_filter UNION ALL SELECT 'SESA without TAX'
  UNION ALL SELECT 'SESA with TAX' UNION ALL SELECT 'SHYTA' UNION ALL SELECT 'SKET'
  UNION ALL SELECT 'SKIT' UNION ALL SELECT 'SIRA' UNION ALL SELECT 'SAMTL REIT'
), weights AS (
  SELECT 'SESA without TAX' product, 0.22 weight UNION ALL SELECT 'SESA with TAX', 0.18
  UNION ALL SELECT 'SHYTA', 0.16 UNION ALL SELECT 'SKET', 0.13
  UNION ALL SELECT 'SKIT', 0.11 UNION ALL SELECT 'SIRA', 0.10
  UNION ALL SELECT 'SAMTL REIT', 0.10
), product_movement AS (
  SELECT m.month, m.region_id, m.scope_key, w.product,
    m.inflows * w.weight external_inflow
  FROM movement m CROSS JOIN weights w
), base AS (
  SELECT 'kpi' row_kind, date(p.as_of_date) reporting_date, p.region_id,
    CASE p.region_id WHEN 'REG-01' THEN 'Lagos Region' WHEN 'REG-02' THEN 'Abuja Region' ELSE p.region_id END region_name,
    p.scope_key, CASE WHEN instr(p.scope_key, ',') > 0 THEN 'All Relationship Officers'
      WHEN p.scope_key='RO-001' THEN 'Adebayo Sterling' WHEN p.scope_key='RO-002' THEN 'Chioma Okonkwo'
      WHEN p.scope_key='RO-003' THEN 'Emeka Nwosu' ELSE p.scope_key END scope_label,
    'All Products' product_filter, NULL product, p.annual_target, NULL completion_rate,
    NULL external_inflow, 'SYNTHETIC_DEMO_ONLY' data_classification
  FROM dev_synthetic_position p
  WHERE p.period_mode='YTD' AND p.product_filter='PROD-ALL' AND p.month=substr(p.as_of_date,1,7)
  UNION ALL
  SELECT 'trend', date(m.month || '-01'), m.region_id,
    CASE m.region_id WHEN 'REG-01' THEN 'Lagos Region' WHEN 'REG-02' THEN 'Abuja Region' ELSE m.region_id END,
    m.scope_key, CASE WHEN instr(m.scope_key, ',') > 0 THEN 'All Relationship Officers'
      WHEN m.scope_key='RO-001' THEN 'Adebayo Sterling' WHEN m.scope_key='RO-002' THEN 'Chioma Okonkwo'
      WHEN m.scope_key='RO-003' THEN 'Emeka Nwosu' ELSE m.scope_key END,
    'All Products', NULL, NULL, NULL, m.inflows, 'SYNTHETIC_DEMO_ONLY'
  FROM movement m
  UNION ALL
  SELECT 'trend', date(pm.month || '-01'), pm.region_id,
    CASE pm.region_id WHEN 'REG-01' THEN 'Lagos Region' WHEN 'REG-02' THEN 'Abuja Region' ELSE pm.region_id END,
    pm.scope_key, CASE WHEN instr(pm.scope_key, ',') > 0 THEN 'All Relationship Officers'
      WHEN pm.scope_key='RO-001' THEN 'Adebayo Sterling' WHEN pm.scope_key='RO-002' THEN 'Chioma Okonkwo'
      WHEN pm.scope_key='RO-003' THEN 'Emeka Nwosu' ELSE pm.scope_key END,
    pm.product, NULL, NULL, NULL, pm.external_inflow, 'SYNTHETIC_DEMO_ONLY'
  FROM product_movement pm
  UNION ALL
  SELECT 'mix', date(pm.month || '-01'), pm.region_id,
    CASE pm.region_id WHEN 'REG-01' THEN 'Lagos Region' WHEN 'REG-02' THEN 'Abuja Region' ELSE pm.region_id END,
    pm.scope_key, CASE WHEN instr(pm.scope_key, ',') > 0 THEN 'All Relationship Officers'
      WHEN pm.scope_key='RO-001' THEN 'Adebayo Sterling' WHEN pm.scope_key='RO-002' THEN 'Chioma Okonkwo'
      WHEN pm.scope_key='RO-003' THEN 'Emeka Nwosu' ELSE pm.scope_key END,
    f.product_filter, pm.product, NULL, NULL, pm.external_inflow, 'SYNTHETIC_DEMO_ONLY'
  FROM product_movement pm CROSS JOIN (SELECT 'All Products' product_filter UNION ALL SELECT 'Selected Product') f
  UNION ALL
  SELECT 'filter-option', date('2026-09-30'), s.region_id, s.region_name, s.scope_key, s.scope_label,
    p.product_filter, NULL, NULL, NULL, NULL, 'SYNTHETIC_DEMO_ONLY'
  FROM scopes s CROSS JOIN products p
)
SELECT row_kind, reporting_date, region_id, region_name, scope_key, scope_label,
  CASE WHEN row_kind='mix' AND product_filter='Selected Product' THEN product ELSE product_filter END product_filter,
  product, annual_target, completion_rate, external_inflow, data_classification FROM base
"""

DEMO_SQL = """
WITH positions AS (
  SELECT reporting_month, region_id, region region_name, ro_id scope_key, ro_name scope_label,
    'All Products' product_filter, annual_portfolio_target_ngn annual_target,
    achievement_pct completion_rate, data_classification
  FROM v_demo_monthly_ro_position
  UNION ALL
  SELECT reporting_month, region_id, MAX(region), region_id || ':ALL', 'All Relationship Officers',
    'All Products', SUM(annual_portfolio_target_ngn), NULL, MAX(data_classification)
  FROM v_demo_monthly_ro_position GROUP BY reporting_month, region_id
), weights AS (
  SELECT 'SESA without TAX' product, 0.22 weight UNION ALL SELECT 'SESA with TAX', 0.18
  UNION ALL SELECT 'SHYTA', 0.16 UNION ALL SELECT 'SKET', 0.13
  UNION ALL SELECT 'SKIT', 0.11 UNION ALL SELECT 'SIRA', 0.10
  UNION ALL SELECT 'SAMTL REIT', 0.10
), movement AS (
  SELECT p.reporting_month, p.region_id, p.region region_name, p.ro_id scope_key, p.ro_name scope_label,
    w.product, p.external_inflows_ngn * w.weight external_inflows_ngn,
    p.data_classification
  FROM v_demo_monthly_ro_position p CROSS JOIN weights w
  UNION ALL
  SELECT reporting_month, region_id, MAX(region_name), region_id || ':ALL', 'All Relationship Officers',
    product,
    SUM(external_inflows_ngn), MAX(data_classification)
  FROM (
    SELECT p.reporting_month, p.region_id, p.region region_name, w.product,
      p.external_inflows_ngn * w.weight external_inflows_ngn, p.data_classification
    FROM v_demo_monthly_ro_position p CROSS JOIN weights w
  ) allocated
  GROUP BY reporting_month, region_id, product
), products AS (
  SELECT 'All Products' product_filter UNION ALL SELECT 'SESA without TAX'
  UNION ALL SELECT 'SESA with TAX' UNION ALL SELECT 'SHYTA' UNION ALL SELECT 'SKET'
  UNION ALL SELECT 'SKIT' UNION ALL SELECT 'SIRA' UNION ALL SELECT 'SAMTL REIT'
), scopes AS (
  SELECT DISTINCT region_id, region_name, scope_key, scope_label FROM positions
), base AS (
  SELECT 'kpi' row_kind, reporting_month reporting_date, region_id, region_name, scope_key, scope_label,
    product_filter, NULL product, annual_target, completion_rate, NULL external_inflow, data_classification
  FROM positions
  UNION ALL
  SELECT 'trend', reporting_month, region_id, region_name, scope_key, scope_label,
    'All Products', NULL, NULL, NULL, SUM(external_inflows_ngn), MAX(data_classification)
  FROM movement GROUP BY reporting_month, region_id, region_name, scope_key, scope_label
  UNION ALL
  SELECT 'trend', reporting_month, region_id, region_name, scope_key, scope_label,
    product, NULL, NULL, NULL, external_inflows_ngn, data_classification FROM movement
  UNION ALL
  SELECT 'mix', reporting_month, region_id, region_name, scope_key, scope_label,
    f.product_filter, product, NULL, NULL, external_inflows_ngn, data_classification
  FROM movement CROSS JOIN (SELECT 'All Products' product_filter UNION ALL SELECT 'Selected Product') f
  UNION ALL
  SELECT 'filter-option', date('2026-10-10'), s.region_id, s.region_name, s.scope_key, s.scope_label,
    p.product_filter, NULL, NULL, NULL, NULL, 'SYNTHETIC_DEMO_ONLY'
  FROM scopes s CROSS JOIN products p
)
SELECT row_kind, reporting_date, region_id, region_name, scope_key, scope_label,
  CASE WHEN row_kind='mix' AND product_filter='Selected Product' THEN product ELSE product_filter END product_filter,
  product, annual_target, completion_rate, external_inflow, data_classification FROM base
"""

def row_filter(kind):
    return [{"clause": "WHERE", "comparator": kind, "expressionType": "SIMPLE",
             "filterOptionName": f"filter_{kind}", "fromFormData": True,
             "operator": "==", "sqlExpression": None, "subject": "row_kind"}]

def chart_params(dataset_id, chart_id, key):
    common = {"datasource": f"{dataset_id}__table", "slice_id": chart_id, "time_range": "No filter",
              "row_limit": 10000, "color_scheme": "sterling_synthetic", "adhoc_filters": []}
    if key in ("annual_target", "fund_mobilized", "completion"):
        metric = {"annual_target": "Annual Target", "fund_mobilized": "Funds Mobilized", "completion": "Target Completion Rate"}[key]
        params = {**common, "viz_type": "big_number_total", "metric": metric,
                  "adhoc_filters": row_filter("trend" if key == "fund_mobilized" else "kpi"),
                  "header_font_size": 0.28, "subheader_font_size": 0.11,
                  "y_axis_format": ",.2f" if key != "completion" else ",.1%",
                  "currency_format": {"symbol": "NGN", "symbolPosition": "prefix"} if key != "completion" else None,
                  "main_color": "#A51F27",
                  "subheader": "NGN billions" if key != "completion" else "Percent of annual target · unavailable where not defined",
                  "show_trend_line": False}
    elif key == "mix":
        params = {**common, "viz_type": "pie", "metric": "Eligible Investment", "groupby": ["product"],
                  "adhoc_filters": row_filter("mix"), "donut": True, "innerRadius": 56, "outerRadius": 78,
                  "show_legend": True, "legendOrientation": "right", "legendType": "plain",
                  "show_labels": False, "label_type": "key_percent", "labels_outside": False,
                  "number_format": ",.2s", "currency_format": {"symbol": "NGN", "symbolPosition": "prefix"},
                  "emit_filter": False}
    else:
        params = {**common, "viz_type": "echarts_timeseries_line", "metrics": ["Funds Mobilized"],
                  "x_axis": "reporting_date", "time_grain_sqla": "P1M", "adhoc_filters": row_filter("trend"),
                  "show_legend": False, "rich_tooltip": True, "markerEnabled": True, "markerSize": 6,
                  "x_axis_time_format": "%b", "x_axis_label_rotation": 0,
                  "y_axis_format": ",.2s", "currency_format": {"symbol": "NGN", "symbolPosition": "prefix"},
                  "y_axis_title": "NGN", "y_axis_title_margin": 28,
                  "area": True, "opacity": 0.18, "truncateYAxis": False, "emit_filter": False}
    return params

def native_filter(filter_id, name, column, dataset_id, first=False):
    return {"id": filter_id, "name": name, "filterType": "filter_select",
            "targets": [{"column": {"name": column}, "datasetId": dataset_id}],
            "defaultDataMask": {"extraFormData": {}, "filterState": {}}, "cascadeParentIds": [],
            "scope": {"rootPath": ["ROOT_ID"], "excluded": []}, "type": "NATIVE_FILTER",
            "controlValues": {"enableEmptyFilter": False, "defaultToFirstItem": first,
                              "inverseSelection": False, "multiSelect": False, "searchAllOptions": False}}

def provision(mode):
    from superset import db, security_manager
    from superset.connectors.sqla.models import SqlaTable, SqlMetric
    from superset.models.core import Database
    from superset.models.dashboard import Dashboard
    from superset.models.embedded_dashboard import EmbeddedDashboard
    from superset.models.slice import Slice

    names = {"phase2": ("MIS Synthetic Development", "mis_samtl_monthly_review_phase2", PHASE2_SQL, "registry.json"),
             "demo-v2": ("MIS Demo-v2 Synthetic Development", "mis_samtl_monthly_review_demo_v2", DEMO_SQL, "demo-v2-registry.json")}
    database_name, table_name, sql, registry_name = names[mode]
    registry_path = RUNTIME / registry_name
    registry = json.loads(registry_path.read_text())
    resource = registry.get("dashboards", {}).get("monthly_performance_review")
    if not resource:
        raise SystemExit(f"Missing approved monthly dashboard registration in {registry_name}")
    database = db.session.query(Database).filter_by(database_name=database_name).one_or_none()
    if database is None:
        raise SystemExit(f"Missing existing database: {database_name}")
    admin = security_manager.find_user(username="pis-local-admin")
    guest_role = security_manager.find_role("MIS Embedded")
    if not admin or not guest_role:
        raise SystemExit("Run the existing Superset bootstrap first.")

    dataset = db.session.get(SqlaTable, resource["datasetId"])
    if dataset is None or dataset.table_name != table_name or dataset.database_id != database.id:
        raise SystemExit(f"Approved dataset registration is invalid for {mode}")
    dataset.sql = sql
    dataset.fetch_metadata()
    dataset.description = "SYNTHETIC DEVELOPMENT ONLY. Unified SAMTL dashboard presentation over existing reporting views."
    for column in dataset.columns:
        if column.column_name == "reporting_date":
            column.is_dttm = True
    metrics = {
        "Annual Target": ("MAX(annual_target) / 1000000000.0", ",.2f"),
        "Funds Mobilized": ("SUM(external_inflow) / 1000000000.0", ",.2f"),
        "Target Completion Rate": ("MAX(completion_rate) / 100.0", ",.1%"),
        "Eligible Investment": ("SUM(external_inflow)", ",.3s"),
    }
    for name, (expression, fmt) in metrics.items():
        metric = next((item for item in dataset.metrics if item.metric_name == name), None)
        if metric is None and name == "Funds Mobilized":
            metric = next((item for item in dataset.metrics if item.metric_name == "Fund Mobilized"), None)
            if metric is not None:
                metric.metric_name = name
        if metric is None:
            metric = SqlMetric(metric_name=name, table=dataset)
            db.session.add(metric)
        metric.expression, metric.verbose_name, metric.d3format = expression, name, fmt
    permission = security_manager.add_permission_view_menu("datasource_access", dataset.perm)
    if permission not in guest_role.permissions:
        guest_role.permissions.append(permission)
    db.session.commit()

    definitions = [
        ("annual_target", "Annual Target"), ("fund_mobilized", "Funds Mobilized"),
        ("completion", "Target Completion"), ("mix", "Investment by Product"),
        ("trend", "Monthly Inflow"),
    ]
    chart_ids = resource.get("chartIds", [])
    if len(chart_ids) != len(definitions):
        raise SystemExit(f"Approved chart registration is invalid for {mode}")
    charts = []
    for chart_id, (key, title) in zip(chart_ids, definitions):
        chart = db.session.get(Slice, chart_id)
        if chart is None:
            raise SystemExit(f"Missing approved chart {chart_id} for {mode}")
        chart.slice_name = title
        chart.datasource_id, chart.datasource_type = dataset.id, "table"
        params = chart_params(dataset.id, chart.id, key)
        chart.viz_type = params["viz_type"]
        chart.params = json.dumps(params)
        chart.query_context = None
        charts.append(chart)
    db.session.commit()

    dashboard = db.session.get(Dashboard, resource["dashboardId"])
    if dashboard is None:
        raise SystemExit(f"Missing approved dashboard {resource['dashboardId']} for {mode}")
    dashboard.dashboard_title = "Monthly Performance Review"
    dashboard.published = True
    dashboard.slices = charts
    chart_ids = [f"CHART-{chart.id}" for chart in charts]
    dashboard.position_json = json.dumps({
        "DASHBOARD_VERSION_KEY": "v2",
        "ROOT_ID": {"id": "ROOT_ID", "type": "ROOT", "children": ["GRID_ID"]},
        "GRID_ID": {"id": "GRID_ID", "type": "GRID", "children": ["ROW-KPI", "ROW-CHARTS"], "parents": ["ROOT_ID"]},
        "ROW-KPI": {"id": "ROW-KPI", "type": "ROW", "children": chart_ids[:3], "parents": ["ROOT_ID", "GRID_ID"], "meta": {"background": "BACKGROUND_TRANSPARENT"}},
        "ROW-CHARTS": {"id": "ROW-CHARTS", "type": "ROW", "children": chart_ids[3:], "parents": ["ROOT_ID", "GRID_ID"], "meta": {"background": "BACKGROUND_TRANSPARENT"}},
        **{chart_ids[index]: {"id": chart_ids[index], "type": "CHART", "children": [],
            "parents": ["ROOT_ID", "GRID_ID", "ROW-KPI" if index < 3 else "ROW-CHARTS"],
            "meta": {"chartId": chart.id, "width": 4 if index < 3 else 6,
                     "height": 16 if index < 3 else 36, "sliceName": chart.slice_name}}
           for index, chart in enumerate(charts)},
    })
    reporting_end = "2026-09-30" if mode == "phase2" else "2026-10-10"
    date_range = f"2026-01-01 : {reporting_end}"
    native = [
        {"id": "NATIVE_FILTER-DATE", "name": "Start Date / End Date", "filterType": "filter_time",
         "targets": [{}], "defaultDataMask": {"extraFormData": {"time_range": date_range},
         "filterState": {"value": date_range,
                         "label": f"Start Date: 1 Jan 2026 · End Date: {'30 Sep 2026' if mode == 'phase2' else '10 Oct 2026'}"}}, "cascadeParentIds": [],
         "scope": {"rootPath": ["ROOT_ID"], "excluded": []}, "type": "NATIVE_FILTER",
         "controlValues": {"enableEmptyFilter": False}},
        native_filter("NATIVE_FILTER-REGION", "Region", "region_name", dataset.id, True),
        native_filter("NATIVE_FILTER-RO", "Relationship Officer", "scope_label", dataset.id, True),
        native_filter("NATIVE_FILTER-PRODUCT", "Product", "product_filter", dataset.id, True),
    ]
    dashboard.json_metadata = json.dumps({"color_scheme": "sterling_synthetic", "refresh_frequency": 0,
        "native_filter_configuration": native, "cross_filters_enabled": False,
        "label_colors": {"Funds Mobilized": "#A51F27", "SESA without TAX": "#A51F27",
                         "SESA with TAX": "#651015", "SHYTA": "#D6787E", "SKET": "#D99A9F",
                         "SKIT": "#8E3037", "SIRA": "#C14D55", "SAMTL REIT": "#4D171B"}})
    dashboard.css = """
.dashboard-content, .dashboard-component-tabs-content { background: #fff; }
.dashboard-component-chart-holder { border: 1px solid #E8E1E2; border-radius: 10px; box-shadow: 0 1px 2px rgb(101 16 21 / 4%); overflow: hidden; }
.dashboard-component-chart-holder:has(.superset-legacy-chart-big-number) { border-top: 4px solid #A51F27; }
.dashboard-component-chart-holder:has([data-test-chart-id="__ANNUAL_TARGET_ID__"]) { background: linear-gradient(135deg, #A51F27, #651015); border-color: #861820; }
[data-test-chart-id="__ANNUAL_TARGET_ID__"], [data-test-chart-id="__ANNUAL_TARGET_ID__"] * { background-color: transparent !important; color: white !important; }
.chart-header { font-weight: 600; }
.filter-bar { background: #FCF6F6; border-right: 1px solid #E8D5D7; }
.grid-container { margin-top: 0; }
""".replace("__ANNUAL_TARGET_ID__", str(charts[0].id))
    db.session.commit()

    embed = db.session.query(EmbeddedDashboard).filter_by(dashboard_id=dashboard.id).one_or_none()
    if embed is None:
        embed = EmbeddedDashboard(dashboard_id=dashboard.id)
        db.session.add(embed)
    embed.allow_domain_list = ",".join(ORIGINS)
    db.session.commit()

    registry["dashboards"]["monthly_performance_review"] = {
        "uuid": str(embed.uuid), "dashboardId": dashboard.id,
        "chartIds": [chart.id for chart in charts], "datasetId": dataset.id,
    }
    registry_path.write_text(json.dumps(registry, indent=2))
    print(json.dumps({"mode": mode, "uuid": str(embed.uuid), "dashboardId": dashboard.id,
                      "chartIds": [chart.id for chart in charts], "datasetId": dataset.id}))

parser = argparse.ArgumentParser()
parser.add_argument("--mode", choices=("phase2", "demo-v2"), required=True)
args = parser.parse_args()
app = create_app()
with app.app_context():
    provision(args.mode)
