"""Provision isolated Superset resources for the 1,000-event financial sample."""

import json
from pathlib import Path

from superset.app import create_app

ROOT = Path(__file__).resolve().parents[2]
RUNTIME = ROOT / ".local" / "superset"
DATABASE_PATH = ROOT / ".local" / "mis-financial-sample" / "reporting.sqlite"
REGISTRY_PATH = RUNTIME / "financial-sample-registry.json"
ORIGINS = [
    "http://127.0.0.1:3000", "http://127.0.0.1:3100", "http://127.0.0.1:3200",
    "http://localhost:3000", "http://localhost:3100", "http://localhost:3200",
]


def adhoc(column, value, operator="=="):
    return {
        "clause": "WHERE", "comparator": value, "expressionType": "SIMPLE",
        "filterOptionName": f"filter_{column}_{value}", "fromFormData": True,
        "operator": operator, "sqlExpression": None, "subject": column,
    }


def common(dataset_id, chart_id, filters):
    return {
        "datasource": f"{dataset_id}__table", "slice_id": chart_id,
        "time_range": "No filter", "row_limit": 10000,
        "color_scheme": "sterling_synthetic", "adhoc_filters": filters,
        "emit_filter": False,
    }


def big_number(dataset_id, chart_id, metric, subtitle):
    return {
        **common(dataset_id, chart_id, [adhoc("record_kind", "TARGET_RUN_RATE")]),
        "viz_type": "big_number_total", "metric": metric,
        "header_font_size": 0.25, "subheader_font_size": 0.1,
        "y_axis_format": ",.2f", "main_color": "#A51F27",
        "subheader": subtitle, "show_trend_line": False,
    }


def timeseries(dataset_id, chart_id, metrics, kind, chart_type="echarts_timeseries_line"):
    return {
        **common(dataset_id, chart_id, [adhoc("record_kind", kind), adhoc("mapping_status", "MAPPED_DEMO")]),
        "viz_type": chart_type, "metrics": metrics, "x_axis": "reporting_date",
        "time_grain_sqla": "P1M", "show_legend": True, "legendType": "plain",
        "legendOrientation": "bottom", "rich_tooltip": True,
        "markerEnabled": True, "markerSize": 5, "x_axis_time_format": "%b",
        "y_axis_format": ",.3s", "currency_format": {"symbol": "NGN", "symbolPosition": "prefix"},
        "y_axis_title": "NGN", "y_axis_title_margin": 30,
        "area": chart_type == "echarts_timeseries_line", "opacity": 0.15,
        "truncateYAxis": False,
    }


def pie(dataset_id, chart_id, groupby, kind, metric="Portfolio Position"):
    return {
        **common(dataset_id, chart_id, [adhoc("record_kind", kind), adhoc("mapping_status", "MAPPED_DEMO")]),
        "viz_type": "pie", "metric": metric, "groupby": [groupby],
        "donut": True, "innerRadius": 55, "outerRadius": 78,
        "show_legend": True, "legendOrientation": "right", "legendType": "plain",
        "show_labels": False, "label_type": "key_percent", "labels_outside": False,
        "number_format": ",.3s", "currency_format": {"symbol": "NGN", "symbolPosition": "prefix"},
    }


def bar(dataset_id, chart_id, metrics, kind, x_axis, horizontal=False):
    return {
        **common(dataset_id, chart_id, [adhoc("record_kind", kind), adhoc("mapping_status", "MAPPED_DEMO")]),
        "viz_type": "echarts_timeseries_bar", "metrics": metrics, "groupby": [],
        "x_axis": x_axis, "orientation": "horizontal" if horizontal else "vertical",
        "x_axis_sort": x_axis, "x_axis_sort_asc": True,
        "show_legend": True, "legendType": "plain", "legendOrientation": "bottom",
        "y_axis_format": ",.3s", "currency_format": {"symbol": "NGN", "symbolPosition": "prefix"},
        "show_value": False, "rich_tooltip": True,
    }


def raw_table(dataset_id, chart_id, columns, kind):
    return {
        **common(dataset_id, chart_id, [adhoc("record_kind", kind)]),
        "viz_type": "table", "all_columns": columns, "order_by_cols": [],
        "server_pagination": True, "server_page_length": 25,
        "include_search": True, "table_filter": True, "page_length": 25,
        "align_pn": False, "color_pn": False,
    }


def chart_params(dataset_id, chart_id, key):
    if key == "portfolio":
        return big_number(dataset_id, chart_id, "Current Portfolio", "NGN billions · as-of position")
    if key == "target":
        return big_number(dataset_id, chart_id, "Annual Target", "NGN billions · assumed demo target")
    if key == "achievement":
        params = big_number(dataset_id, chart_id, "Target Achievement", "Percent of annual target")
        params["y_axis_format"] = ",.1%"
        return params
    if key == "product_allocation":
        return pie(dataset_id, chart_id, "product", "CURRENT_POSITION")
    if key == "regional_allocation":
        return pie(dataset_id, chart_id, "region_name", "CURRENT_POSITION")
    if key == "customer_allocation":
        params = pie(dataset_id, chart_id, "customer_name", "EVENT", "Event Amount")
        params["adhoc_filters"].append(adhoc("event_type", "NEW_INFLOW"))
        return params
    if key == "monthly_inflow":
        return timeseries(dataset_id, chart_id, ["External Inflow"], "MONTHLY_MOVEMENT")
    if key == "inflow_outflow":
        return timeseries(dataset_id, chart_id, ["External Inflow", "Total Outflow"], "MONTHLY_MOVEMENT", "echarts_timeseries_bar")
    if key == "rates":
        return bar(dataset_id, chart_id, ["Recalculated WACC", "Weighted Pool Rate"], "RATE_SUMMARY", "product")
    if key == "income_expense":
        return timeseries(dataset_id, chart_id, ["Interest Income", "Interest Expense"], "MONTHLY_PROFITABILITY", "echarts_timeseries_bar")
    if key == "profitability":
        return timeseries(dataset_id, chart_id, ["Deal Margin", "Management Margin", "Final Profitability"], "MONTHLY_PROFITABILITY")
    if key == "actual_target":
        return bar(dataset_id, chart_id, ["Current Position", "Annual Target NGN"], "TARGET_RUN_RATE", "ro_name", True)
    if key == "run_rate":
        return bar(dataset_id, chart_id, ["Monthly Run Rate", "Daily Run Rate"], "TARGET_RUN_RATE", "ro_name", True)
    if key == "event_table":
        return raw_table(dataset_id, chart_id, [
            "reporting_date", "event_type", "region_name", "ro_name", "customer_id", "customer_name",
            "product", "source_product", "amount_ngn", "customer_rate_pct", "pool_rate_pct",
            "tenor_days", "maturity_date", "mapping_status", "calculation_status",
        ], "EVENT")
    if key == "profitability_table":
        return raw_table(dataset_id, chart_id, [
            "reporting_month", "region_name", "ro_name", "product", "interest_income_ngn",
            "interest_expense_ngn", "deal_margin_ngn", "illustrative_wht_ngn",
            "illustrative_management_margin_ngn", "illustrative_opex_ngn",
            "illustrative_final_profitability_ngn", "calculation_status",
        ], "MONTHLY_PROFITABILITY")
    raise KeyError(key)


CHARTS = [
    ("portfolio", "Current Portfolio"),
    ("target", "Annual Target"),
    ("achievement", "Target Achievement"),
    ("product_allocation", "Investment by Product"),
    ("regional_allocation", "Regional Allocation"),
    ("customer_allocation", "Customer Concentration"),
    ("monthly_inflow", "Monthly Inflow"),
    ("inflow_outflow", "Inflow and Outflow"),
    ("rates", "WACC and Pool Rate"),
    ("income_expense", "Interest Income and Expense"),
    ("profitability", "Margin and Profitability"),
    ("actual_target", "Actual and Target by Officer"),
    ("run_rate", "Required Run Rate"),
    ("event_table", "Investment Event Detail"),
    ("profitability_table", "Profitability Detail"),
]

DASHBOARDS = {
    "financial_sample_overview": (
        "Financial Performance Review",
        ["portfolio", "target", "achievement", "product_allocation", "monthly_inflow", "inflow_outflow", "rates", "income_expense", "profitability", "actual_target", "run_rate"],
    ),
    "financial_sample_investments": (
        "Investment Analysis",
        ["product_allocation", "monthly_inflow", "inflow_outflow", "event_table"],
    ),
    "financial_sample_customers": (
        "Customer Portfolio Analysis",
        ["customer_allocation", "product_allocation", "event_table"],
    ),
    "financial_sample_concentration": (
        "Concentration Risk Analysis",
        ["product_allocation", "customer_allocation", "regional_allocation", "event_table"],
    ),
    "financial_sample_profitability": (
        "Profitability Analysis",
        ["rates", "income_expense", "profitability", "profitability_table"],
    ),
    "financial_sample_targets": (
        "Targets and Required Run Rate",
        ["portfolio", "target", "achievement", "actual_target", "run_rate"],
    ),
    "financial_sample_export": (
        "Financial Reporting Data",
        ["event_table", "profitability_table"],
    ),
}


def native_filter(filter_id, name, column, dataset_id):
    return {
        "id": filter_id, "name": name, "filterType": "filter_select",
        "targets": [{"column": {"name": column}, "datasetId": dataset_id}],
        "defaultDataMask": {"extraFormData": {}, "filterState": {}},
        "cascadeParentIds": [], "scope": {"rootPath": ["ROOT_ID"], "excluded": []},
        "type": "NATIVE_FILTER",
        "controlValues": {"enableEmptyFilter": True, "defaultToFirstItem": False,
                          "inverseSelection": False, "multiSelect": False, "searchAllOptions": False},
    }


def position_json(charts):
    chart_keys = [f"CHART-{chart.id}" for chart in charts]
    rows = []
    index = 0
    if len(charts) >= 3 and [chart.slice_name for chart in charts[:3]] == ["Current Portfolio", "Annual Target", "Target Achievement"]:
        rows.append(("ROW-KPI", chart_keys[:3]))
        index = 3
    while index < len(charts):
        chunk = chart_keys[index:index + 2]
        rows.append((f"ROW-{len(rows) + 1}", chunk))
        index += 2
    payload = {
        "DASHBOARD_VERSION_KEY": "v2",
        "ROOT_ID": {"id": "ROOT_ID", "type": "ROOT", "children": ["GRID_ID"]},
        "GRID_ID": {"id": "GRID_ID", "type": "GRID", "children": [row_id for row_id, _ in rows], "parents": ["ROOT_ID"]},
    }
    for row_id, children in rows:
        payload[row_id] = {"id": row_id, "type": "ROW", "children": children,
                           "parents": ["ROOT_ID", "GRID_ID"], "meta": {"background": "BACKGROUND_TRANSPARENT"}}
        for key in children:
            chart = next(chart for chart in charts if key == f"CHART-{chart.id}")
            is_table = chart.viz_type == "table"
            width = 12 if len(children) == 1 else 4 if len(children) == 3 else 6
            payload[key] = {
                "id": key, "type": "CHART", "children": [],
                "parents": ["ROOT_ID", "GRID_ID", row_id],
                "meta": {"chartId": chart.id, "width": width,
                         "height": 42 if is_table else 16 if row_id == "ROW-KPI" else 34,
                         "sliceName": chart.slice_name},
            }
    return json.dumps(payload)


def provision():
    from superset import db, security_manager
    from superset.connectors.sqla.models import SqlaTable, SqlMetric
    from superset.models.core import Database
    from superset.models.dashboard import Dashboard
    from superset.models.embedded_dashboard import EmbeddedDashboard
    from superset.models.slice import Slice

    if not DATABASE_PATH.is_file():
        raise SystemExit("Import the isolated financial sample before provisioning Superset.")
    admin = security_manager.find_user(username="pis-local-admin")
    guest_role = security_manager.find_role("MIS Embedded")
    if not admin or not guest_role:
        raise SystemExit("Run the existing Superset bootstrap first.")

    database = db.session.query(Database).filter_by(database_name="MIS Financial Sample Synthetic Development").one_or_none()
    if database is None:
        database = Database(database_name="MIS Financial Sample Synthetic Development")
        db.session.add(database)
    database.set_sqlalchemy_uri(f"sqlite:///file:{DATABASE_PATH}?mode=ro&uri=true")
    database.expose_in_sqllab = False
    database.allow_dml = database.allow_ctas = database.allow_cvas = False
    db.session.commit()

    dataset = db.session.query(SqlaTable).filter_by(table_name="v_financial_superset", database_id=database.id).one_or_none()
    if dataset is None:
        dataset = SqlaTable(table_name="v_financial_superset", database_id=database.id, owners=[admin])
        db.session.add(dataset)
        db.session.commit()
    dataset.fetch_metadata()
    dataset.description = (
        "SYNTHETIC DEMONSTRATION ONLY. 1,000-event financial sample with source provenance, "
        "explicit cutoff and separately labelled illustrative policy calculations."
    )
    for column in dataset.columns:
        if column.column_name in {"reporting_date", "reporting_month", "maturity_date", "reporting_cutoff"}:
            column.is_dttm = True

    metrics = {
        "Current Portfolio": ("SUM(current_position_ngn) / 1000000000.0", ",.2f"),
        "Annual Target": ("SUM(annual_target_ngn) / 1000000000.0", ",.2f"),
        "Target Achievement": ("SUM(current_position_ngn) / NULLIF(SUM(annual_target_ngn), 0)", ",.1%"),
        "Portfolio Position": ("SUM(current_position_ngn)", ",.3s"),
        "Event Amount": ("SUM(amount_ngn)", ",.3s"),
        "External Inflow": ("SUM(inflow_ngn)", ",.3s"),
        "Total Outflow": ("SUM(outflow_ngn)", ",.3s"),
        "Recalculated WACC": ("SUM(amount_ngn * wacc_pct) / NULLIF(SUM(amount_ngn), 0)", ",.2f"),
        "Weighted Pool Rate": ("SUM(amount_ngn * pool_rate_pct) / NULLIF(SUM(amount_ngn), 0)", ",.2f"),
        "Interest Income": ("SUM(interest_income_ngn)", ",.3s"),
        "Interest Expense": ("SUM(interest_expense_ngn)", ",.3s"),
        "Deal Margin": ("SUM(deal_margin_ngn)", ",.3s"),
        "Management Margin": ("SUM(illustrative_management_margin_ngn)", ",.3s"),
        "Final Profitability": ("SUM(illustrative_final_profitability_ngn)", ",.3s"),
        "Current Position": ("SUM(current_position_ngn)", ",.3s"),
        "Annual Target NGN": ("SUM(annual_target_ngn)", ",.3s"),
        "Monthly Run Rate": ("SUM(required_monthly_run_rate_ngn)", ",.3s"),
        "Daily Run Rate": ("SUM(required_daily_run_rate_ngn)", ",.3s"),
    }
    for name, (expression, d3format) in metrics.items():
        metric = next((item for item in dataset.metrics if item.metric_name == name), None)
        if metric is None:
            metric = SqlMetric(metric_name=name, table=dataset)
            db.session.add(metric)
        metric.expression = expression
        metric.verbose_name = name
        metric.d3format = d3format
    permission = security_manager.add_permission_view_menu("datasource_access", dataset.perm)
    if permission not in guest_role.permissions:
        guest_role.permissions.append(permission)
    db.session.commit()

    charts = {}
    for key, title in CHARTS:
        chart = db.session.query(Slice).filter_by(slice_name=title, datasource_id=dataset.id).one_or_none()
        if chart is None:
            chart = Slice(slice_name=title, owners=[admin], datasource_id=dataset.id, datasource_type="table")
            db.session.add(chart)
            db.session.flush()
        params = chart_params(dataset.id, chart.id, key)
        chart.datasource_id = dataset.id
        chart.datasource_type = "table"
        chart.viz_type = params["viz_type"]
        chart.params = json.dumps(params)
        chart.query_context = None
        charts[key] = chart
    db.session.commit()

    native = [
        {
            "id": "NATIVE_FILTER-DATE", "name": "Reporting Period (cutoff 10 Oct 2026)",
            "filterType": "filter_time", "targets": [{}],
            "defaultDataMask": {"extraFormData": {"time_range": "2026-01-01 : 2026-10-10"},
                                "filterState": {"value": "2026-01-01 : 2026-10-10",
                                                "label": "Start Date: 1 Jan 2026 · End Date: 10 Oct 2026"}},
            "cascadeParentIds": [], "scope": {"rootPath": ["ROOT_ID"], "excluded": []},
            "type": "NATIVE_FILTER", "controlValues": {"enableEmptyFilter": False},
        },
        native_filter("NATIVE_FILTER-REGION", "Region", "region_name", dataset.id),
        native_filter("NATIVE_FILTER-RO", "Relationship Officer", "ro_name", dataset.id),
        native_filter("NATIVE_FILTER-PRODUCT", "Product", "product", dataset.id),
    ]
    registry = {"domain": "http://127.0.0.1:8088", "dashboards": {}}
    for key, (title, chart_keys) in DASHBOARDS.items():
        selected = [charts[chart_key] for chart_key in chart_keys]
        slug = "mis-financial-sample-" + key.removeprefix("financial_sample_").replace("_", "-")
        dashboard = db.session.query(Dashboard).filter_by(slug=slug).one_or_none()
        if dashboard is None:
            dashboard = Dashboard(slug=slug, owners=[admin])
            db.session.add(dashboard)
            db.session.flush()
        dashboard.dashboard_title = title
        dashboard.published = True
        dashboard.slices = selected
        dashboard.position_json = position_json(selected)
        dashboard.json_metadata = json.dumps({
            "color_scheme": "sterling_synthetic", "refresh_frequency": 0,
            "native_filter_configuration": native, "cross_filters_enabled": False,
            "label_colors": {
                "SESA without TAX": "#A51F27", "SESA with TAX": "#C2444C", "SHYTA": "#D6787E",
                "SKET": "#D99A9F", "SKIT": "#8E3037", "SIRA": "#E6B8BC", "SAMTL REIT": "#651015",
                "External Inflow": "#A51F27", "Total Outflow": "#525252",
                "Interest Income": "#A51F27", "Interest Expense": "#525252",
                "Deal Margin": "#A51F27", "Management Margin": "#8E3037", "Final Profitability": "#651015",
            },
        })
        dashboard.css = f"""
.dashboard-content, .dashboard-component-tabs-content {{ background: #fff; }}
.dashboard-component-chart-holder {{ border: 1px solid #E8E1E2; border-radius: 10px; box-shadow: 0 1px 2px rgb(101 16 21 / 4%); overflow: hidden; }}
.dashboard-component-chart-holder:has(.superset-legacy-chart-big-number) {{ border-top: 4px solid #A51F27; }}
.chart-header {{ font-weight: 600; }}
.filter-bar {{ background: #FCF6F6; border-right: 1px solid #E8D5D7; }}
.grid-container {{ margin-top: 0; }}
"""
        db.session.commit()
        embed = db.session.query(EmbeddedDashboard).filter_by(dashboard_id=dashboard.id).one_or_none()
        if embed is None:
            embed = EmbeddedDashboard(dashboard_id=dashboard.id)
            db.session.add(embed)
        embed.allow_domain_list = ",".join(ORIGINS)
        db.session.commit()
        registry["dashboards"][key] = {
            "uuid": str(embed.uuid), "dashboardId": dashboard.id,
            "chartIds": [chart.id for chart in selected], "datasetId": dataset.id,
        }
    REGISTRY_PATH.write_text(json.dumps(registry, indent=2))
    print(json.dumps({
        "database": database.id, "dataset": dataset.id,
        "charts": {key: chart.id for key, chart in charts.items()},
        "dashboards": registry["dashboards"],
    }, indent=2))


app = create_app()
with app.app_context():
    provision()
