"""Provision the isolated synthetic CSV reporting dashboard without changing existing resources."""
import json
import sqlite3
from pathlib import Path

from superset.app import create_app

ROOT = Path(__file__).resolve().parents[2]
RUNTIME = ROOT / ".local" / "superset"
CSV_RUNTIME = ROOT / ".local" / "mis-csv-import"
DATABASE_PATH = CSV_RUNTIME / "reporting.sqlite"
REGISTRY_PATH = RUNTIME / "csv-import-registry.json"
ORIGINS = [
    "http://127.0.0.1:3000", "http://127.0.0.1:3100", "http://127.0.0.1:3200",
    "http://localhost:3000", "http://localhost:3100", "http://localhost:3200",
]

VIEW_SQL = """
CREATE VIEW IF NOT EXISTS v_csv_monthly_performance AS
WITH ro_product AS (
  SELECT reporting_date, region_id, MAX(region_name) region_name, ro_id scope_key,
    MAX(ro_name) scope_label, product, MAX(annual_target_ngn) annual_target,
    SUM(funds_mobilized_ngn) funds_mobilized, MAX(target_completion_pct) completion_rate
  FROM imported_performance GROUP BY reporting_date, region_id, ro_id, product
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
  annual_target, funds_mobilized, completion_rate, 'SYNTHETIC_CSV_IMPORT' data_classification
FROM ro_product
UNION ALL
SELECT p.reporting_date, p.region_id, p.region_name, p.region_id || ':ALL',
  'All Relationship Officers', p.product, m.annual_target, p.funds_mobilized, NULL,
  'SYNTHETIC_CSV_IMPORT'
FROM regional_product p JOIN regional_month m
  ON m.reporting_date=p.reporting_date AND m.region_id=p.region_id
"""


def ensure_database():
    CSV_RUNTIME.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.executescript("""
    CREATE TABLE IF NOT EXISTS imported_performance (
      reporting_date TEXT NOT NULL, region_id TEXT NOT NULL, region_name TEXT NOT NULL,
      ro_id TEXT NOT NULL, ro_name TEXT NOT NULL, product TEXT NOT NULL,
      annual_target_ngn REAL NOT NULL CHECK(annual_target_ngn >= 0),
      funds_mobilized_ngn REAL NOT NULL CHECK(funds_mobilized_ngn >= 0),
      target_completion_pct REAL CHECK(target_completion_pct BETWEEN 0 AND 100),
      data_classification TEXT NOT NULL CHECK(data_classification='SYNTHETIC_CSV_IMPORT')
    );
    """ + VIEW_SQL)
    connection.commit()
    assert connection.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
    connection.close()


def row_filter(kind):
    return [{"clause": "WHERE", "comparator": kind, "expressionType": "SIMPLE",
             "filterOptionName": f"filter_{kind}", "fromFormData": True,
             "operator": "==", "sqlExpression": None, "subject": "row_kind"}]


def chart_params(dataset_id, chart_id, key):
    common = {"datasource": f"{dataset_id}__table", "slice_id": chart_id, "time_range": "No filter",
              "row_limit": 10000, "color_scheme": "sterling_synthetic", "adhoc_filters": []}
    if key in ("annual_target", "funds_mobilized", "completion"):
        metric = {"annual_target": "Annual Target", "funds_mobilized": "Funds Mobilized", "completion": "Target Completion Rate"}[key]
        return {**common, "viz_type": "big_number_total", "metric": metric,
                "header_font_size": 0.28, "subheader_font_size": 0.11,
                "y_axis_format": ",.2f" if key != "completion" else ",.1%",
                "currency_format": {"symbol": "NGN", "symbolPosition": "prefix"} if key != "completion" else None,
                "main_color": "#A51F27", "subheader": "NGN billions" if key != "completion" else "Percent of annual target · unavailable when blank",
                "show_trend_line": False}
    if key == "mix":
        return {**common, "viz_type": "pie", "metric": "Eligible Investment", "groupby": ["product"],
                "donut": True, "innerRadius": 56, "outerRadius": 78, "show_legend": True,
                "legendOrientation": "right", "legendType": "plain", "show_labels": False,
                "label_type": "key_percent", "labels_outside": False, "number_format": ",.2s",
                "currency_format": {"symbol": "NGN", "symbolPosition": "prefix"}, "emit_filter": False}
    return {**common, "viz_type": "echarts_timeseries_line", "metrics": ["Funds Mobilized"],
            "x_axis": "reporting_date", "time_grain_sqla": "P1M", "show_legend": False,
            "rich_tooltip": True, "markerEnabled": True, "markerSize": 6, "x_axis_time_format": "%b",
            "y_axis_format": ",.2s", "currency_format": {"symbol": "NGN", "symbolPosition": "prefix"},
            "y_axis_title": "NGN", "y_axis_title_margin": 28, "area": True, "opacity": 0.18,
            "truncateYAxis": False, "emit_filter": False}


def provision():
    from superset import db, security_manager
    from superset.connectors.sqla.models import SqlaTable, SqlMetric
    from superset.models.core import Database
    from superset.models.dashboard import Dashboard
    from superset.models.embedded_dashboard import EmbeddedDashboard
    from superset.models.slice import Slice

    admin = security_manager.find_user(username="pis-local-admin")
    guest_role = security_manager.find_role("MIS Embedded")
    if not admin or not guest_role:
        raise SystemExit("Run the existing Superset bootstrap first.")
    database = db.session.query(Database).filter_by(database_name="MIS CSV Import Synthetic Development").one_or_none()
    if database is None:
        database = Database(database_name="MIS CSV Import Synthetic Development")
        db.session.add(database)
    database.set_sqlalchemy_uri(f"sqlite:///file:{DATABASE_PATH}?mode=ro&uri=true")
    database.expose_in_sqllab = False
    database.allow_dml = database.allow_ctas = database.allow_cvas = False
    db.session.commit()

    dataset = db.session.query(SqlaTable).filter_by(table_name="v_csv_monthly_performance", database_id=database.id).one_or_none()
    if dataset is None:
        dataset = SqlaTable(table_name="v_csv_monthly_performance", database_id=database.id, owners=[admin])
        db.session.add(dataset)
        db.session.commit()
    dataset.fetch_metadata()
    dataset.description = "SYNTHETIC CSV IMPORT ONLY. Separate development source; never CRM data."
    for column in dataset.columns:
        if column.column_name == "reporting_date":
            column.is_dttm = True
    metrics = {
        "Annual Target": ("MAX(annual_target) / 1000000000.0", ",.2f"),
        "Funds Mobilized": ("SUM(funds_mobilized) / 1000000000.0", ",.2f"),
        "Target Completion Rate": ("MAX(completion_rate) / 100.0", ",.1%"),
        "Eligible Investment": ("SUM(funds_mobilized)", ",.3s"),
    }
    for name, (expression, fmt) in metrics.items():
        metric = next((item for item in dataset.metrics if item.metric_name == name), None)
        if metric is None:
            metric = SqlMetric(metric_name=name, table=dataset)
            db.session.add(metric)
        metric.expression, metric.verbose_name, metric.d3format = expression, name, fmt
    permission = security_manager.add_permission_view_menu("datasource_access", dataset.perm)
    if permission not in guest_role.permissions:
        guest_role.permissions.append(permission)
    db.session.commit()

    definitions = [("annual_target", "Annual Target"), ("funds_mobilized", "Funds Mobilized"),
                   ("completion", "Target Completion"), ("mix", "Investment by Product"),
                   ("trend", "Monthly Inflow")]
    charts = []
    for key, title in definitions:
        name = f"CSV SYNTHETIC · {title}"
        chart = db.session.query(Slice).filter_by(slice_name=name).one_or_none()
        if chart is None:
            chart = Slice(slice_name=name, owners=[admin], datasource_id=dataset.id, datasource_type="table")
            db.session.add(chart)
            db.session.commit()
        chart.datasource_id, chart.datasource_type = dataset.id, "table"
        params = chart_params(dataset.id, chart.id, key)
        chart.viz_type, chart.params, chart.query_context = params["viz_type"], json.dumps(params), None
        charts.append(chart)
    db.session.commit()

    dashboard = db.session.query(Dashboard).filter_by(slug="mis-csv-synthetic-monthly-performance-review").one_or_none()
    if dashboard is None:
        dashboard = Dashboard(slug="mis-csv-synthetic-monthly-performance-review", owners=[admin])
        db.session.add(dashboard)
    dashboard.dashboard_title = "CSV Synthetic Performance Review"
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
    dashboard.json_metadata = json.dumps({"color_scheme": "sterling_synthetic", "refresh_frequency": 0,
        "native_filter_configuration": [], "cross_filters_enabled": False,
        "label_colors": {"Funds Mobilized": "#A51F27", "SESA without TAX": "#A51F27",
                         "SESA with TAX": "#C2444C", "SHYTA": "#D6787E", "SKET": "#D99A9F",
                         "SKIT": "#8E3037", "SIRA": "#E6B8BC", "SAMTL REIT": "#651015"}})
    dashboard.css = f"""
.dashboard-content, .dashboard-component-tabs-content {{ background: #fff; }}
.dashboard-component-chart-holder {{ border: 1px solid #E8E1E2; border-radius: 10px; box-shadow: 0 1px 2px rgb(101 16 21 / 4%); overflow: hidden; }}
.dashboard-component-chart-holder:has(.superset-legacy-chart-big-number) {{ border-top: 4px solid #A51F27; }}
.dashboard-component-chart-holder:has([data-test-chart-id=\"{charts[0].id}\"]) {{ background: linear-gradient(135deg, #A51F27, #651015); border-color: #861820; }}
[data-test-chart-id=\"{charts[0].id}\"], [data-test-chart-id=\"{charts[0].id}\"] * {{ background-color: transparent !important; color: white !important; }}
.chart-header {{ font-weight: 600; }} .grid-container {{ margin-top: 0; }}
"""
    db.session.commit()
    embed = db.session.query(EmbeddedDashboard).filter_by(dashboard_id=dashboard.id).one_or_none()
    if embed is None:
        embed = EmbeddedDashboard(dashboard_id=dashboard.id)
        db.session.add(embed)
    embed.allow_domain_list = ",".join(ORIGINS)
    db.session.commit()
    REGISTRY_PATH.write_text(json.dumps({"domain": "http://127.0.0.1:8088", "dashboards": {
        "csv_monthly_performance_review": {"uuid": str(embed.uuid), "dashboardId": dashboard.id,
                                            "chartIds": [chart.id for chart in charts], "datasetId": dataset.id}
    }}, indent=2))
    print(json.dumps({"uuid": str(embed.uuid), "dashboardId": dashboard.id,
                      "chartIds": [chart.id for chart in charts], "datasetId": dataset.id}))


ensure_database()
app = create_app()
with app.app_context():
    provision()
