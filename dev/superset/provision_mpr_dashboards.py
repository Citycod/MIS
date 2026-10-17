"""Provision the three embedded MPR dashboards without replacing existing resources."""

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


def adhoc(column, value):
    return {
        "clause": "WHERE", "comparator": value, "expressionType": "SIMPLE",
        "filterOptionName": f"filter_{column}_{value}", "fromFormData": True,
        "operator": "==", "sqlExpression": None, "subject": column,
    }


def common(dataset_id, chart_id, record_kind):
    return {
        "datasource": f"{dataset_id}__table", "slice_id": chart_id,
        "time_range": "No filter", "row_limit": 10000,
        "color_scheme": "sterling_synthetic",
        "adhoc_filters": [adhoc("record_kind", record_kind)],
        "emit_filter": False,
    }


def big_number(dataset_id, chart_id, metric, subtitle, record_kind):
    return {
        **common(dataset_id, chart_id, record_kind),
        "viz_type": "big_number_total", "metric": metric,
        "header_font_size": 0.23, "subheader_font_size": 0.1,
        "y_axis_format": ",.2f", "main_color": "#A51F27",
        "subheader": subtitle, "show_trend_line": False,
    }


def bar(dataset_id, chart_id, metrics, x_axis, record_kind, horizontal=False):
    return {
        **common(dataset_id, chart_id, record_kind),
        "viz_type": "echarts_timeseries_bar", "metrics": metrics,
        "groupby": [], "x_axis": x_axis,
        "orientation": "horizontal" if horizontal else "vertical",
        "x_axis_sort": x_axis, "x_axis_sort_asc": True,
        "show_legend": True, "legendType": "plain", "legendOrientation": "bottom",
        "y_axis_format": ",.3s", "currency_format": {"symbol": "₦", "symbolPosition": "prefix"},
        "show_value": False, "rich_tooltip": True,
    }


def line(dataset_id, chart_id, metrics, record_kind):
    return {
        **common(dataset_id, chart_id, record_kind),
        "viz_type": "echarts_timeseries_line", "metrics": metrics,
        "x_axis": "reporting_date", "time_grain_sqla": "P1M",
        "show_legend": True, "legendType": "plain", "legendOrientation": "bottom",
        "rich_tooltip": True, "markerEnabled": True, "markerSize": 5,
        "x_axis_time_format": "%b", "y_axis_format": ",.3s",
        "currency_format": {"symbol": "₦", "symbolPosition": "prefix"},
        "truncateYAxis": False,
    }


def pie(dataset_id, chart_id, metric, groupby, record_kind):
    return {
        **common(dataset_id, chart_id, record_kind),
        "viz_type": "pie", "metric": metric, "groupby": [groupby],
        "donut": True, "innerRadius": 52, "outerRadius": 76,
        "show_legend": True, "legendOrientation": "right", "legendType": "plain",
        "show_labels": False, "label_type": "key_percent", "labels_outside": False,
        "number_format": ",.3s", "currency_format": {"symbol": "₦", "symbolPosition": "prefix"},
    }


def table(dataset_id, chart_id, columns, record_kind):
    money = {
        name: {"d3NumberFormat": ",.0f", "d3SmallNumberFormat": ",.0f", "horizontalAlign": "right"}
        for name in columns if name.endswith("_ngn")
    }
    if "achievement_pct" in columns:
        money["achievement_pct"] = {"d3NumberFormat": ",.1f", "horizontalAlign": "right"}
    return {
        **common(dataset_id, chart_id, record_kind),
        "viz_type": "table", "all_columns": columns, "order_by_cols": [],
        "server_pagination": False, "include_search": True, "table_filter": True,
        "page_length": 50, "align_pn": False, "color_pn": False,
        "column_config": money,
    }


def aggregate_table(dataset_id, chart_id, metrics, record_kind):
    return {
        **common(dataset_id, chart_id, record_kind),
        "viz_type": "table", "query_mode": "aggregate",
        "groupby": ["ro_name"], "metrics": metrics,
        "order_by_cols": [], "server_pagination": False,
        "include_search": True, "table_filter": True, "page_length": 50,
        "align_pn": False, "color_pn": False,
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


def date_filter():
    return {
        "id": "NATIVE_FILTER-DATE", "name": "Reporting Period",
        "filterType": "filter_time", "targets": [{}],
        "defaultDataMask": {
            "extraFormData": {"time_range": "2026-01-01 : 2026-10-10"},
            "filterState": {"value": "2026-01-01 : 2026-10-10",
                            "label": "Start Date: 1 Jan 2026 · End Date: 10 Oct 2026"},
        },
        "cascadeParentIds": [], "scope": {"rootPath": ["ROOT_ID"], "excluded": []},
        "type": "NATIVE_FILTER", "controlValues": {"enableEmptyFilter": False},
    }


def position_json(charts):
    groups = [charts[0:3], charts[3:6]]
    index = 6
    while index < len(charts):
        next_is_table = index + 1 < len(charts) and charts[index + 1].viz_type == "table"
        size = 1 if charts[index].viz_type == "table" or next_is_table else 2
        groups.append(charts[index:index + size])
        index += len(groups[-1])
    rows = [(f"ROW-{index + 1}", group) for index, group in enumerate(groups) if group]
    payload = {
        "DASHBOARD_VERSION_KEY": "v2",
        "ROOT_ID": {"id": "ROOT_ID", "type": "ROOT", "children": ["GRID_ID"]},
        "GRID_ID": {"id": "GRID_ID", "type": "GRID", "children": [row_id for row_id, _ in rows], "parents": ["ROOT_ID"]},
    }
    for row_id, row_charts in rows:
        payload[row_id] = {"id": row_id, "type": "ROW", "children": [f"CHART-{c.id}" for c in row_charts],
                           "parents": ["ROOT_ID", "GRID_ID"], "meta": {"background": "BACKGROUND_TRANSPARENT"}}
        for chart in row_charts:
            is_table = chart.viz_type == "table"
            width = 12 if is_table or len(row_charts) == 1 else 4 if len(row_charts) == 3 else 6
            payload[f"CHART-{chart.id}"] = {
                "id": f"CHART-{chart.id}", "type": "CHART", "children": [],
                "parents": ["ROOT_ID", "GRID_ID", row_id],
                "meta": {"chartId": chart.id, "width": width,
                         "height": 42 if is_table else 16 if len(rows) <= 2 else 32,
                         "sliceName": chart.slice_name},
            }
    return json.dumps(payload)


REPORTS = {
    "financial_sample_mpr_profitability": {
        "title": "RO Profitability Summary", "table": "v_financial_superset",
        "metrics": {
            "Interest Income (NGN bn)": ("SUM(interest_income_ngn) / 1000000000.0", ",.2f"),
            "Interest Expense (NGN bn)": ("SUM(interest_expense_ngn) / 1000000000.0", ",.2f"),
            "Deal Margin (NGN bn)": ("SUM(deal_margin_ngn) / 1000000000.0", ",.2f"),
            "Weighted Funding Rate": ("SUM(amount_ngn * wacc_pct) / NULLIF(SUM(amount_ngn), 0)", ",.2f"),
            "Management Margin (NGN bn)": ("SUM(illustrative_management_margin_ngn) / 1000000000.0", ",.2f"),
            "Final Profitability (NGN bn)": ("SUM(illustrative_final_profitability_ngn) / 1000000000.0", ",.2f"),
            "Interest Income": ("SUM(interest_income_ngn)", ",.3s"),
            "Interest Expense": ("SUM(interest_expense_ngn)", ",.3s"),
            "Profitability": ("SUM(illustrative_final_profitability_ngn)", ",.3s"),
            "WHT": ("SUM(illustrative_wht_ngn)", ",.3s"),
            "Margin": ("SUM(illustrative_management_margin_ngn)", ",.3s"),
            "OPEX": ("SUM(illustrative_opex_ngn)", ",.3s"),
            "WACC": ("SUM(amount_ngn * wacc_pct) / NULLIF(SUM(amount_ngn), 0)", ",.2f"),
            "Pool Rate": ("SUM(amount_ngn * pool_rate_pct) / NULLIF(SUM(amount_ngn), 0)", ",.2f"),
        },
        "charts": [
            ("Interest Income", "big", "Interest Income (NGN bn)", "NGN billions · illustrative", "MONTHLY_PROFITABILITY"),
            ("Interest Expense", "big", "Interest Expense (NGN bn)", "NGN billions · illustrative", "MONTHLY_PROFITABILITY"),
            ("Deal Margin", "big", "Deal Margin (NGN bn)", "NGN billions", "MONTHLY_PROFITABILITY"),
            ("Weighted Funding Rate", "big", "Weighted Funding Rate", "Percent · amount weighted", "RATE_SUMMARY"),
            ("Management Margin", "big", "Management Margin (NGN bn)", "NGN billions · illustrative", "MONTHLY_PROFITABILITY"),
            ("Final Profitability", "big", "Final Profitability (NGN bn)", "NGN billions · illustrative", "MONTHLY_PROFITABILITY"),
            ("Profitability by RO", "barh", ["Profitability"], "ro_name", "MONTHLY_PROFITABILITY"),
            ("Interest Income vs Interest Expense", "bar", ["Interest Income", "Interest Expense"], "reporting_month", "MONTHLY_PROFITABILITY"),
            ("Monthly Profitability Trend", "line", ["Profitability"], None, "MONTHLY_PROFITABILITY"),
            ("Profitability by Product", "barh", ["Profitability"], "product", "MONTHLY_PROFITABILITY"),
            ("WACC vs Pool Rate", "bar", ["WACC", "Pool Rate"], "product", "RATE_SUMMARY"),
            ("RO Profitability Summary Table", "aggregate_table", ["Interest Income", "Interest Expense", "WHT", "Margin", "OPEX", "Profitability"], None, "MONTHLY_PROFITABILITY"),
        ],
        "filters": [("TEAM", "Team", "region_name"), ("REGION", "Region", "region_name"), ("RO", "Relationship Officer", "ro_name"), ("PRODUCT", "Product", "product")],
    },
    "financial_sample_mpr_accounts": {
        "title": "YTD Account Opening Summary", "table": "v_mpr_account_opening_dashboard",
        "metrics": {
            "Current YTD Accounts": ("SUM(current_ytd_accounts)", ",d"),
            "Previous YTD Accounts": ("SUM(previous_ytd_accounts)", ",d"),
            "Account Opening Target": ("SUM(account_target)", ",d"),
            "Account Achievement": ("SUM(current_ytd_accounts) * 1.0 / NULLIF(SUM(account_target), 0)", ",.1%"),
            "Year-on-Year Variance": ("SUM(variance)", "+,d"),
            "Current YTD": ("SUM(current_ytd_accounts)", ",d"),
            "Previous YTD": ("SUM(previous_ytd_accounts)", ",d"),
            "Current Month": ("SUM(current_month_accounts)", ",d"),
            "Previous Month": ("SUM(previous_month_accounts)", ",d"),
            "Target": ("SUM(account_target)", ",d"),
        },
        "charts": [
            ("Current YTD Accounts Opened", "big", "Current YTD Accounts", "Unique synthetic accounts", "ACCOUNT_SUMMARY"),
            ("Previous YTD Accounts Opened", "big", "Previous YTD Accounts", "Comparable prior-year window", "ACCOUNT_SUMMARY"),
            ("Account Opening Target", "big", "Account Opening Target", "Annual account target", "ACCOUNT_SUMMARY"),
            ("Account Target Achievement", "big", "Account Achievement", "Percent of annual target", "ACCOUNT_SUMMARY"),
            ("Year-on-Year Variance", "big", "Year-on-Year Variance", "Current YTD less previous YTD", "ACCOUNT_SUMMARY"),
            ("Current YTD vs Previous YTD", "bar", ["Current YTD", "Previous YTD"], "ro_name", "ACCOUNT_SUMMARY"),
            ("Monthly Account Opening Trend", "line", ["Current Month", "Previous Month"], None, "ACCOUNT_MONTHLY"),
            ("Account Openings by Team", "pie", "Current YTD", "team_name", "ACCOUNT_SUMMARY"),
            ("RO Account Opening Performance", "barh", ["Current YTD"], "ro_name", "ACCOUNT_SUMMARY"),
            ("Actual vs Account Target", "bar", ["Current YTD", "Target"], "ro_name", "ACCOUNT_SUMMARY"),
            ("YTD Account Opening Summary Table", "table", ["ro_name", "account_target", "current_ytd_accounts", "previous_ytd_accounts", "variance", "achievement_pct"], None, "ACCOUNT_SUMMARY"),
        ],
        "filters": [("TEAM", "Team", "team_name"), ("REGION", "Region", "region_name"), ("RO", "Relationship Officer", "ro_name")],
    },
    "financial_sample_mpr_position": {
        "title": "RO Position Summary", "table": "v_mpr_position_dashboard_v2",
        "metrics": {
            "New Target (NGN bn)": ("SUM(new_target_ngn) / 1000000000.0", ",.2f"),
            "Balance Sheet (NGN bn)": ("SUM(balance_sheet_ngn) / 1000000000.0", ",.2f"),
            "Gap to Target (NGN bn)": ("SUM(gap_to_meet_ngn) / 1000000000.0", ",.2f"),
            "Target Achievement": ("SUM(balance_sheet_ngn) / NULLIF(SUM(new_target_ngn), 0)", ",.1%"),
            "Monthly Run Rate (NGN bn)": ("SUM(required_monthly_run_rate_ngn) / 1000000000.0", ",.2f"),
            "New Target": ("SUM(new_target_ngn)", ",.3s"),
            "Balance Sheet": ("SUM(balance_sheet_ngn)", ",.3s"),
            "Gap to Meet Target": ("SUM(gap_to_meet_ngn)", ",.3s"),
            "Run Rate": ("SUM(required_monthly_run_rate_ngn)", ",.3s"),
            "Achievement": ("SUM(balance_sheet_ngn) / NULLIF(SUM(new_target_ngn), 0)", ",.1%"),
        },
        "charts": [
            ("Total New Target", "big", "New Target (NGN bn)", "NGN billions", "POSITION_SUMMARY"),
            ("Total Balance Sheet", "big", "Balance Sheet (NGN bn)", "NGN billions · as of cutoff", "POSITION_SUMMARY"),
            ("Gap to Meet Target", "big", "Gap to Target (NGN bn)", "NGN billions · signed", "POSITION_SUMMARY"),
            ("Target Achievement", "big", "Target Achievement", "Percent of new target", "POSITION_SUMMARY"),
            ("Required Monthly Run Rate", "big", "Monthly Run Rate (NGN bn)", "NGN billions · signed", "POSITION_SUMMARY"),
            ("New Target vs Balance Sheet", "barh", ["New Target", "Balance Sheet"], "ro_name", "POSITION_SUMMARY"),
            ("Target Achievement by RO", "barh", ["Achievement"], "ro_name", "POSITION_SUMMARY"),
            ("Gap to Meet Target by RO", "barh", ["Gap to Meet Target"], "ro_name", "POSITION_SUMMARY"),
            ("Monthly Run Rate by RO", "barh", ["Run Rate"], "ro_name", "POSITION_SUMMARY"),
            ("Portfolio Position Trend", "line", ["Balance Sheet"], None, "POSITION_MONTHLY"),
            ("Investment by Product", "pie", "Balance Sheet", "product", "PRODUCT_POSITION"),
            ("TEAM PERFORMANCE SUMMARY", "table", ["serial_no", "ro_name", "new_target_display", "balance_sheet_display", "gap_to_meet_display", "run_rate_display"], None, "POSITION_SUMMARY"),
        ],
        "filters": [("TEAM", "Team", "team_name"), ("REGION", "Region", "region_name"), ("RO", "Relationship Officer", "ro_name")],
    },
}


VERBOSE_COLUMNS = {
    "serial_no": "S/N", "ro_name": "Name", "new_target_ngn": "New Target",
    "balance_sheet_ngn": "Balance Sheet", "gap_to_meet_ngn": "Gap to Meet Target",
    "required_monthly_run_rate_ngn": "Run Rate", "interest_income_ngn": "Interest Income",
    "new_target_display": "New Target", "balance_sheet_display": "Balance Sheet",
    "gap_to_meet_display": "Gap to Meet Target", "run_rate_display": "Run Rate",
    "interest_expense_ngn": "Interest Expense", "illustrative_wht_ngn": "WHT",
    "deal_margin_ngn": "Margin", "illustrative_opex_ngn": "OPEX",
    "illustrative_final_profitability_ngn": "Profitability", "account_target": "Account Target",
    "current_ytd_accounts": "Current YTD", "previous_ytd_accounts": "Previous YTD",
    "variance": "Variance", "achievement_pct": "Achievement %",
}


def chart_params(dataset_id, chart_id, config):
    title, kind, first, second, record_kind = config
    if kind == "big":
        result = big_number(dataset_id, chart_id, first, second, record_kind)
        if "Achievement" in first:
            result["y_axis_format"] = ",.1%"
        elif "Rate" in first:
            result["y_axis_format"] = ",.2f"
        return result
    if kind in {"bar", "barh"}:
        return bar(dataset_id, chart_id, first, second, record_kind, kind == "barh")
    if kind == "line":
        return line(dataset_id, chart_id, first, record_kind)
    if kind == "pie":
        return pie(dataset_id, chart_id, first, second, record_kind)
    if kind == "table":
        return table(dataset_id, chart_id, first, record_kind)
    if kind == "aggregate_table":
        return aggregate_table(dataset_id, chart_id, first, record_kind)
    raise KeyError(kind)


def provision():
    from superset import db, security_manager
    from superset.connectors.sqla.models import SqlaTable, SqlMetric
    from superset.models.core import Database
    from superset.models.dashboard import Dashboard
    from superset.models.embedded_dashboard import EmbeddedDashboard
    from superset.models.slice import Slice

    admin = security_manager.find_user(username="pis-local-admin")
    guest_role = security_manager.find_role("MIS Embedded")
    database = db.session.query(Database).filter_by(database_name="MIS Financial Sample Synthetic Development").one_or_none()
    if not admin or not guest_role or not database or not DATABASE_PATH.is_file():
        raise SystemExit("Import the financial sample and run the existing Superset bootstrap first.")

    registry = json.loads(REGISTRY_PATH.read_text())
    for dashboard_key, report in REPORTS.items():
        dataset = db.session.query(SqlaTable).filter_by(table_name=report["table"], database_id=database.id).one_or_none()
        if dataset is None:
            dataset = SqlaTable(table_name=report["table"], database_id=database.id, owners=[admin])
            db.session.add(dataset)
            db.session.commit()
        dataset.fetch_metadata()
        dataset.description = "SYNTHETIC DEMONSTRATION ONLY. MPR reporting source with an explicit 10 October 2026 cutoff."
        for column in dataset.columns:
            if column.column_name in {"reporting_date", "reporting_month", "reporting_cutoff"}:
                column.is_dttm = True
            if column.column_name in VERBOSE_COLUMNS:
                column.verbose_name = VERBOSE_COLUMNS[column.column_name]
        for name, (expression, d3format) in report["metrics"].items():
            metric = next((item for item in dataset.metrics if item.metric_name == name), None)
            if metric is None:
                metric = SqlMetric(metric_name=name, table=dataset)
                db.session.add(metric)
            metric.expression, metric.verbose_name, metric.d3format = expression, name, d3format
        permission = security_manager.add_permission_view_menu("datasource_access", dataset.perm)
        if permission not in guest_role.permissions:
            guest_role.permissions.append(permission)
        db.session.commit()

        charts = []
        for config in report["charts"]:
            title = config[0]
            chart = db.session.query(Slice).filter_by(slice_name=title, datasource_id=dataset.id).one_or_none()
            if chart is None:
                chart = Slice(slice_name=title, owners=[admin], datasource_id=dataset.id, datasource_type="table")
                db.session.add(chart)
                db.session.flush()
            params = chart_params(dataset.id, chart.id, config)
            chart.datasource_id, chart.datasource_type = dataset.id, "table"
            chart.viz_type, chart.params, chart.query_context = params["viz_type"], json.dumps(params), None
            charts.append(chart)
        db.session.commit()

        slug = "mis-" + dashboard_key.removeprefix("financial_sample_mpr_").replace("_", "-")
        dashboard = db.session.query(Dashboard).filter_by(slug=slug).one_or_none()
        if dashboard is None:
            dashboard = Dashboard(slug=slug, owners=[admin])
            db.session.add(dashboard)
            db.session.flush()
        dashboard.dashboard_title, dashboard.published, dashboard.slices = report["title"], True, charts
        dashboard.position_json = position_json(charts)
        native = [date_filter()] + [native_filter(f"NATIVE_FILTER-{fid}", name, column, dataset.id) for fid, name, column in report["filters"]]
        dashboard.json_metadata = json.dumps({
            "color_scheme": "sterling_synthetic", "refresh_frequency": 0,
            "native_filter_configuration": native, "cross_filters_enabled": False,
            "label_colors": {"Current YTD": "#A51F27", "Previous YTD": "#D99A9F",
                             "New Target": "#D99A9F", "Balance Sheet": "#A51F27",
                             "Interest Income": "#A51F27", "Interest Expense": "#525252"},
        })
        dashboard.css = """
.dashboard-content, .dashboard-component-tabs-content { background: #fff; }
.dashboard-component-chart-holder { border: 1px solid #E8E1E2; border-radius: 10px; box-shadow: 0 1px 2px rgb(101 16 21 / 4%); overflow: hidden; }
.dashboard-component-chart-holder:has(.superset-legacy-chart-big-number) { border-top: 4px solid #A51F27; }
.chart-header { font-weight: 600; } .filter-bar { background: #FCF6F6; border-right: 1px solid #E8D5D7; }
.grid-container { margin-top: 0; }
"""
        db.session.commit()
        embed = db.session.query(EmbeddedDashboard).filter_by(dashboard_id=dashboard.id).one_or_none()
        if embed is None:
            embed = EmbeddedDashboard(dashboard_id=dashboard.id)
            db.session.add(embed)
        embed.allow_domain_list = ",".join(ORIGINS)
        db.session.commit()
        registry["dashboards"][dashboard_key] = {
            "uuid": str(embed.uuid), "dashboardId": dashboard.id,
            "chartIds": [chart.id for chart in charts], "datasetId": dataset.id,
        }

    REGISTRY_PATH.write_text(json.dumps(registry, indent=2))
    print(json.dumps({key: registry["dashboards"][key] for key in REPORTS}, indent=2))


app = create_app()
with app.app_context():
    provision()
