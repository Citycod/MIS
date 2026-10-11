"""Create the six real embedded dashboards in the isolated Superset metadata DB."""
import json
from pathlib import Path
from superset.app import create_app

ROOT = Path(__file__).resolve().parents[2]
RUNTIME = ROOT / '.local' / 'superset'
ORIGINS = ['http://127.0.0.1:3000', 'http://127.0.0.1:3100', 'http://localhost:3000', 'http://localhost:3100']
METRICS = {
    'movement': [('inflows', 'External inflows'), ('signed_withdrawals', 'Withdrawals'), ('net_movement', 'Net movement')],
    'position': [('closing_position', 'Closing position'), ('annual_target', 'Annual target reference')],
    'mix': [('allocated_amount', 'Eligible investment')],
    'comparison': [('closing_position', 'Closing position'), ('annual_target', 'Annual target')],
}
CATALOG = {
    'ro_overview:movement': ('movement', 'Monthly portfolio movement'),
    'ro_overview:position': ('position', 'Closing position and annual target reference'),
    'regional_overview:movement': ('movement', 'Regional monthly movement'),
    'regional_overview:position': ('position', 'Regional closing position'),
    'regional_overview:ro_position_target': ('comparison', 'RO position and annual target'),
    'investment_mix': ('mix', 'Product investment mix'),
}

app = create_app()
with app.app_context():
    from superset import db, security_manager
    from superset.models.core import Database
    from superset.models.dashboard import Dashboard
    from superset.models.slice import Slice
    from superset.models.embedded_dashboard import EmbeddedDashboard
    from superset.connectors.sqla.models import SqlaTable, SqlMetric
    secrets = json.loads((RUNTIME / 'secrets.json').read_text())
    admin = security_manager.find_user(username='pis-local-admin') or security_manager.add_user(
        'pis-local-admin', 'Synthetic', 'Administrator', 'admin@pis.invalid', security_manager.find_role('Admin'), secrets['admin_password'])
    broker_role = security_manager.add_role('MIS Token Broker')
    # SecurityRestApi keeps its class permission name instead of the lower-case
    # resource name. Materialize only the two permissions required by the broker.
    security_manager.add_permission_view_menu('can_grant_guest_token', 'SecurityRestApi')
    security_manager.add_permission_view_menu('can_read', 'SecurityRestApi')
    broker_role.permissions = [security_manager.find_permission_view_menu(permission, 'SecurityRestApi')
                               for permission in ('can_grant_guest_token', 'can_read')]
    assert all(broker_role.permissions), 'Guest token permission must exist'
    broker = security_manager.find_user(username='pis-token-broker') or security_manager.add_user(
        'pis-token-broker', 'Token', 'Broker', 'broker@pis.invalid', broker_role, secrets['broker_password'])
    broker.roles = [broker_role]
    guest_role = security_manager.add_role('MIS Embedded')
    # No data/database-wide grants, SQL Lab, exports, editing, exploration or token issuance.
    allowed = {('can_read', 'Chart'), ('can_read', 'Dashboard'), ('can_read', 'Dataset'),
               ('can_read', 'CurrentUserRestApi'),
               ('can_dashboard', 'Superset'), ('can_explore_json', 'Superset'), ('can_log', 'Superset'),
               ('can_time_range', 'Api')}
    guest_role.permissions = [p for p in security_manager.find_role('Gamma').permissions
                              if (p.permission.name, p.view_menu.name) in allowed]
    db.session.commit()
    database = db.session.query(Database).filter(Database.database_name.in_(['MIS Synthetic Development', 'PIS Synthetic Development'])).one_or_none()
    if database is None:
        database = Database(database_name='MIS Synthetic Development')
        db.session.add(database)
    database.database_name = 'MIS Synthetic Development'
    database.set_sqlalchemy_uri(f'sqlite:///file:{RUNTIME / "synthetic-reporting.db"}?mode=ro&uri=true')
    database.expose_in_sqllab = False
    database.allow_dml = False
    database.allow_ctas = False
    database.allow_cvas = False
    db.session.commit()
    datasets = {}
    for name, metrics in METRICS.items():
        table_name = f'dev_synthetic_{name}'
        dataset = db.session.query(SqlaTable).filter_by(table_name=table_name, database_id=database.id).one_or_none()
        if dataset is None:
            dataset = SqlaTable(table_name=table_name, database_id=database.id, owners=[admin])
            db.session.add(dataset)
            db.session.commit()
        dataset.fetch_metadata()
        dataset.description = 'SYNTHETIC DEVELOPMENT ONLY. Precomputed fixture outputs; not an approved CRM reporting view.'
        for column, label in metrics:
            metric = next((m for m in dataset.metrics if m.metric_name == label), None)
            if metric is None:
                metric = SqlMetric(metric_name=label, table=dataset)
                db.session.add(metric)
            # MAX selects one existing value per exact scope/month/product/officer;
            # it never adds balances across months or recomputes a financial definition.
            metric.expression = f'MAX({column})'
            metric.verbose_name = label
            metric.d3format = ',.2f'
        datasets[name] = dataset
    db.session.commit()
    registry = {'domain': 'http://127.0.0.1:8088', 'dashboards': {}}
    for key, (kind, title) in CATALOG.items():
        dataset = datasets[kind]
        dataset_id = dataset.id
        slug = 'pis-synthetic-' + key.replace(':', '-').replace('_', '-')
        chart_name = f'SYNTHETIC · {title}'
        chart = db.session.query(Slice).filter_by(slice_name=chart_name).one_or_none()
        if chart is None:
            chart = Slice(slice_name=chart_name, owners=[admin], datasource_id=dataset_id, datasource_type='table')
            db.session.add(chart)
        chart.datasource_id = dataset_id
        chart.datasource_type = 'table'
        chart.viz_type = 'pie' if kind == 'mix' else 'echarts_timeseries_line' if kind == 'position' else 'echarts_timeseries_bar'
        metrics = [label for _, label in METRICS[kind]]
        if key == 'regional_overview:position':
            metrics = ['Closing position']
        x_axis = 'product_name' if kind == 'mix' else 'officer' if kind == 'comparison' else 'month'
        params = {
            'datasource': f'{dataset_id}__table', 'viz_type': chart.viz_type,
            'metrics': metrics, 'adhoc_filters': [], 'row_limit': 100,
            'time_range': 'No filter', 'color_scheme': 'sterling_synthetic',
            'show_legend': True, 'legendType': 'scroll', 'legendOrientation': 'bottom',
            'y_axis_format': '.3s', 'x_axis_time_format': '%b', 'y_axis_title': 'NGN',
            'rich_tooltip': True, 'show_value': False, 'truncate_metric': False,
            'x_axis': x_axis, 'x_axis_sort_asc': True, 'x_axis_sort': x_axis,
            'groupby': [], 'orientation': 'horizontal' if kind == 'comparison' else 'vertical',
            'markerEnabled': True, 'markerSize': 7, 'showTooltipTotal': False,
            'emit_filter': False,
        }
        if kind == 'mix':
            params.update({'groupby': ['product_name'], 'metric': metrics[0], 'donut': True,
                           'innerRadius': 60, 'outerRadius': 85, 'show_labels': True,
                           'label_type': 'percent', 'labels_outside': False, 'number_format': ',.2f'})
        query = {'columns': [x_axis], 'metrics': metrics, 'filters': [], 'time_range': 'No filter',
                 'orderby': [[x_axis, True]], 'row_limit': 100, 'is_timeseries': False,
                 'extras': {'having': '', 'where': ''}}
        chart.params = json.dumps(params)
        chart.query_context = json.dumps({'datasource': {'id': dataset_id, 'type': 'table'},
            'queries': [query], 'result_format': 'json', 'result_type': 'full'})
        db.session.commit()
        params['slice_id'] = chart.id
        chart.params = json.dumps(params)
        dashboard = db.session.query(Dashboard).filter_by(slug=slug).one_or_none()
        if dashboard is None:
            dashboard = Dashboard(slug=slug, owners=[admin])
            db.session.add(dashboard)
        dashboard.dashboard_title = chart_name
        dashboard.published = True
        dashboard.slices = [chart]
        chart_key = f'CHART-{chart.id}'
        dashboard.position_json = json.dumps({
            'DASHBOARD_VERSION_KEY': 'v2',
            'ROOT_ID': {'id': 'ROOT_ID', 'type': 'ROOT', 'children': ['GRID_ID']},
            'GRID_ID': {'id': 'GRID_ID', 'type': 'GRID', 'children': ['ROW-1'], 'parents': ['ROOT_ID']},
            'ROW-1': {'id': 'ROW-1', 'type': 'ROW', 'children': [chart_key], 'parents': ['ROOT_ID', 'GRID_ID'], 'meta': {'background': 'BACKGROUND_TRANSPARENT'}},
            chart_key: {'id': chart_key, 'type': 'CHART', 'children': [], 'parents': ['ROOT_ID', 'GRID_ID', 'ROW-1'], 'meta': {'chartId': chart.id, 'width': 12, 'height': 36, 'sliceName': chart_name}},
        })
        dashboard.json_metadata = json.dumps({'color_scheme': 'sterling_synthetic', 'refresh_frequency': 0,
            'label_colors': {'Closing position': '#CF2E2E', 'Annual target reference': '#333333', 'Annual target': '#333333',
                             'External inflows': '#CF2E2E', 'Withdrawals': '#333333', 'Net movement': '#CF8D4D',
                             'Fixed Deposit': '#CF2E2E', 'Treasury Bills': '#333333', 'Sukuk Investments': '#CF8D4D'},
            'native_filter_configuration': [], 'cross_filters_enabled': False})
        dashboard.css = '.dashboard-content { background: #fff; } .dashboard-component-chart-holder { border: 0; box-shadow: none; } .chart-header { display: none; }'
        db.session.commit()
        embed = db.session.query(EmbeddedDashboard).filter_by(dashboard_id=dashboard.id).one_or_none()
        if embed is None:
            embed = EmbeddedDashboard(dashboard_id=dashboard.id)
            db.session.add(embed)
        embed.allow_domain_list = ','.join(ORIGINS)
        db.session.commit()
        registry['dashboards'][key] = {'uuid': str(embed.uuid), 'dashboardId': dashboard.id, 'chartId': chart.id, 'datasetId': dataset_id}
    (RUNTIME / 'registry.json').write_text(json.dumps(registry, indent=2))
    print('Provisioned six synthetic embedded dashboards, four reporting datasets, and restricted viewer/broker roles.')
