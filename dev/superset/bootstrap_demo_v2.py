"""Register isolated demo-v2 Superset resources without touching Phase 2 records."""
import json
from pathlib import Path

from superset.app import create_app

ROOT = Path(__file__).resolve().parents[2]
RUNTIME = ROOT / ".local" / "superset"
DEMO_DB = ROOT / ".local" / "mis-demo-v2" / "reporting.sqlite"
ORIGINS = [
    "http://127.0.0.1:3000", "http://127.0.0.1:3100", "http://127.0.0.1:3200",
    "http://localhost:3000", "http://localhost:3100", "http://localhost:3200",
]

# The position and comparison datasets add a reporting-grain label only. They
# never calculate a financial result: values come directly from the supplied
# views, and product-level targets remain NULL because none was approved.
POSITION_SQL = """
SELECT reporting_month, region_id, region, ro_id, ro_name,
       'All Products' AS product, closing_position_ngn,
       annual_portfolio_target_ngn, currency, data_classification
FROM v_demo_monthly_ro_position
UNION ALL
SELECT reporting_month, region_id, region, ro_id, ro_name, product,
       closing_position_ngn, NULL AS annual_portfolio_target_ngn,
       currency, data_classification
FROM v_demo_monthly_ro_product_movement
"""

DATASETS = {
    "movement": {
        "table": "v_demo_monthly_ro_product_movement",
        "sql": None,
        "metrics": [
            ("External inflows", "SUM(external_inflows_ngn)"),
            ("Withdrawals", "SUM(withdrawals_ngn)"),
            ("Net movement", "SUM(net_external_movement_ngn)"),
        ],
    },
    "position": {
        "table": "mis_demo_v2_position",
        "sql": POSITION_SQL,
        "metrics": [
            ("Closing position", "SUM(closing_position_ngn)"),
            ("Annual target reference", "SUM(annual_portfolio_target_ngn)"),
        ],
    },
    "mix": {
        "table": "v_demo_investment_mix",
        "sql": None,
        "metrics": [("Eligible investment", "SUM(eligible_inflow_ngn)")],
    },
    "comparison": {
        "table": "mis_demo_v2_comparison",
        "sql": POSITION_SQL,
        "metrics": [
            ("Closing position", "MAX(closing_position_ngn)"),
            ("Annual target", "MAX(annual_portfolio_target_ngn)"),
        ],
    },
}

CATALOG = {
    "ro_overview:movement": ("movement", "Monthly portfolio movement"),
    "ro_overview:position": ("position", "Portfolio position and target reference"),
    "regional_overview:movement": ("movement", "Regional monthly portfolio movement"),
    "regional_overview:position": ("position", "Regional portfolio position and target reference"),
    "regional_overview:ro_position_target": ("comparison", "Regional relationship officer comparison"),
    "investment_mix": ("mix", "Product investment mix"),
}


def chart_definition(kind, dataset_id, chart_id):
    metrics = [name for name, _ in DATASETS[kind]["metrics"]]
    x_axis = "product" if kind == "mix" else "ro_name" if kind == "comparison" else "reporting_month"
    viz_type = "pie" if kind == "mix" else "echarts_timeseries_line" if kind == "position" else "echarts_timeseries_bar"
    if kind == "comparison":
        viz_type = "dist_bar"
    params = {
        "datasource": f"{dataset_id}__table", "viz_type": viz_type, "metrics": metrics,
        "adhoc_filters": [], "row_limit": 100, "time_range": "No filter",
        "color_scheme": "sterling_synthetic", "show_legend": True,
        "legendType": "scroll", "legendOrientation": "bottom", "y_axis_format": ".3s",
        "y_axis_title": "NGN", "rich_tooltip": True, "show_value": False,
        "truncate_metric": False, "x_axis": x_axis, "x_axis_sort_asc": True,
        "x_axis_sort": x_axis, "groupby": [], "markerEnabled": True, "markerSize": 7,
        "showTooltipTotal": False, "emit_filter": False, "slice_id": chart_id,
    }
    if kind == "mix":
        params.update({"groupby": ["product"], "metric": "Eligible investment", "donut": True,
                       "innerRadius": 60, "outerRadius": 85, "show_labels": True,
                       "label_type": "percent", "labels_outside": False, "number_format": ",.2f"})
    if kind == "comparison":
        params.update({"columns": [x_axis], "groupby": [x_axis], "orientation": "horizontal"})
    query = {
        "columns": [x_axis], "metrics": metrics, "filters": [], "time_range": "No filter",
        "orderby": [[x_axis, True]], "row_limit": 100, "is_timeseries": False,
        "extras": {"having": "", "where": ""},
    }
    return viz_type, params, {"datasource": {"id": dataset_id, "type": "table"}, "queries": [query], "result_format": "json", "result_type": "full"}


def add_permission(security_manager, role, permission, view_menu):
    item = security_manager.add_permission_view_menu(permission, view_menu)
    if item not in role.permissions:
        role.permissions.append(item)


app = create_app()
with app.app_context():
    from superset import db, security_manager
    from superset.connectors.sqla.models import SqlaTable, SqlMetric
    from superset.models.core import Database
    from superset.models.dashboard import Dashboard
    from superset.models.embedded_dashboard import EmbeddedDashboard
    from superset.models.slice import Slice

    if not DEMO_DB.is_file():
        raise SystemExit(f"Missing staged demo-v2 reporting database: {DEMO_DB}")
    if DEMO_DB.stat().st_mode & 0o222:
        raise SystemExit("The demo-v2 reporting database must be staged read-only before provisioning.")
    secrets = json.loads((RUNTIME / "secrets.json").read_text())
    admin = security_manager.find_user(username="pis-local-admin")
    if admin is None:
        raise SystemExit("Run the existing Phase 2 Superset bootstrap before demo-v2 provisioning.")
    guest_role = security_manager.find_role("MIS Embedded")
    if guest_role is None:
        raise SystemExit("The existing restricted MIS Embedded role is required.")

    database = db.session.query(Database).filter_by(database_name="MIS Demo-v2 Synthetic Development").one_or_none()
    if database is None:
        database = Database(database_name="MIS Demo-v2 Synthetic Development")
        db.session.add(database)
    database.set_sqlalchemy_uri(f"sqlite:///file:{DEMO_DB}?mode=ro&uri=true")
    database.expose_in_sqllab = False
    database.allow_dml = False
    database.allow_ctas = False
    database.allow_cvas = False
    db.session.commit()

    datasets = {}
    for kind, definition in DATASETS.items():
        dataset = db.session.query(SqlaTable).filter_by(table_name=definition["table"], database_id=database.id).one_or_none()
        if dataset is None:
            dataset = SqlaTable(table_name=definition["table"], database_id=database.id, owners=[admin])
            db.session.add(dataset)
            db.session.flush()
        dataset.sql = definition["sql"]
        dataset.fetch_metadata()
        dataset.description = "SYNTHETIC DEVELOPMENT ONLY. Demo-v2 reporting view; not an approved CRM reporting view."
        for name, expression in definition["metrics"]:
            metric = next((candidate for candidate in dataset.metrics if candidate.metric_name == name), None)
            if metric is None:
                metric = SqlMetric(metric_name=name, table=dataset)
                db.session.add(metric)
            metric.expression = expression
            metric.verbose_name = name
            metric.d3format = ",.2f"
        add_permission(security_manager, guest_role, "datasource_access", dataset.perm)
        datasets[kind] = dataset
    db.session.commit()

    registry = {"domain": "http://127.0.0.1:8088", "dashboards": {}}
    for key, (kind, title) in CATALOG.items():
        dataset = datasets[kind]
        slug = "mis-demo-v2-" + key.replace(":", "-").replace("_", "-")
        chart_name = f"SYNTHETIC DEMO-V2 · {title}"
        chart = db.session.query(Slice).filter_by(slice_name=chart_name).one_or_none()
        if chart is None:
            chart = Slice(slice_name=chart_name, owners=[admin], datasource_id=dataset.id, datasource_type="table")
            db.session.add(chart)
            db.session.flush()
        chart.datasource_id = dataset.id
        chart.datasource_type = "table"
        chart.viz_type, params, query_context = chart_definition(kind, dataset.id, chart.id)
        chart.params = json.dumps(params)
        chart.query_context = json.dumps(query_context)

        dashboard = db.session.query(Dashboard).filter_by(slug=slug).one_or_none()
        if dashboard is None:
            dashboard = Dashboard(slug=slug, owners=[admin])
            db.session.add(dashboard)
            db.session.flush()
        dashboard.dashboard_title = chart_name
        dashboard.published = True
        dashboard.slices = [chart]
        chart_key = f"CHART-{chart.id}"
        dashboard.position_json = json.dumps({
            "DASHBOARD_VERSION_KEY": "v2", "ROOT_ID": {"id": "ROOT_ID", "type": "ROOT", "children": ["GRID_ID"]},
            "GRID_ID": {"id": "GRID_ID", "type": "GRID", "children": ["ROW-1"], "parents": ["ROOT_ID"]},
            "ROW-1": {"id": "ROW-1", "type": "ROW", "children": [chart_key], "parents": ["ROOT_ID", "GRID_ID"], "meta": {"background": "BACKGROUND_TRANSPARENT"}},
            chart_key: {"id": chart_key, "type": "CHART", "children": [], "parents": ["ROOT_ID", "GRID_ID", "ROW-1"], "meta": {"chartId": chart.id, "width": 12, "height": 36, "sliceName": chart_name}},
        })
        dashboard.json_metadata = json.dumps({"color_scheme": "sterling_synthetic", "refresh_frequency": 0,
            "label_colors": {"Closing position": "#CF2E2E", "Annual target reference": "#333333", "Annual target": "#333333",
                             "External inflows": "#CF2E2E", "Withdrawals": "#333333", "Net movement": "#CF8D4D"},
            "native_filter_configuration": [], "cross_filters_enabled": False})
        dashboard.css = ".dashboard-content { background: #fff; } .dashboard-component-chart-holder { border: 0; box-shadow: none; } .chart-header { display: none; }"
        # Dashboard access is governed by the existing restricted role's
        # Dashboard read permission plus the one dashboard UUID in the token.
        # Superset 6 Dashboard has no per-object ``perm`` property.
        db.session.commit()

        embed = db.session.query(EmbeddedDashboard).filter_by(dashboard_id=dashboard.id).one_or_none()
        if embed is None:
            embed = EmbeddedDashboard(dashboard_id=dashboard.id)
            db.session.add(embed)
        embed.allow_domain_list = ",".join(ORIGINS)
        db.session.commit()
        registry["dashboards"][key] = {"uuid": str(embed.uuid), "dashboardId": dashboard.id, "chartId": chart.id, "datasetId": dataset.id}

    (RUNTIME / "demo-v2-registry.json").write_text(json.dumps(registry, indent=2))
    print("Provisioned isolated demo-v2 resources: 1 database, 4 datasets, 6 embedded dashboards.")
