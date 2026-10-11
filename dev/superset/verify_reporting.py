"""Verify every imported reporting slice against the existing fixture contract."""
import sqlite3
from decimal import Decimal
from seed_reporting import RUNTIME, SNAPSHOTS

def money(value):
    return None if value is None else Decimal(str(value)).quantize(Decimal('.01'))

db = sqlite3.connect(f'file:{RUNTIME / "synthetic-reporting.db"}?mode=ro', uri=True)
checks = 0
for s in SNAPSHOTS:
    for mode in ('MTD', 'YTD'):
        key = (s['regionId'], ','.join(sorted(s['roIds'])), s['date'], s['productCode'], mode)
        where = 'region_id=? AND scope_key=? AND as_of_date=? AND product_filter=? AND period_mode=?'
        positions = db.execute(f'SELECT month, closing_position, annual_target FROM dev_synthetic_position WHERE {where} ORDER BY month', key).fetchall()
        assert money(positions[-1][1]) == money(s['kpi']['portfolioBalance'])
        assert money(positions[-1][2]) == money(s['kpi']['portfolioTarget'])
        assert len(positions) == (int(s['date'][5:7]) if mode == 'YTD' else 1)
        movements = db.execute(f'SELECT inflows, withdrawals, net_movement FROM dev_synthetic_movement WHERE {where} ORDER BY month DESC LIMIT 1', key).fetchone()
        assert tuple(map(money, movements)) == tuple(money(s['movement'][k]) for k in ('externalInflows', 'outflowsLiquidations', 'netMovement'))
        mix = db.execute(f'SELECT product_code, allocated_amount, percentage_share FROM dev_synthetic_mix WHERE {where} ORDER BY product_code', key).fetchall()
        expected = sorted(s['mix'][mode], key=lambda item: item['productCode'])
        assert mix == [(r['productCode'], float(r['allocatedAmount']), float(r['percentageShare'])) for r in expected]
        officers = db.execute(f'SELECT ro_id, closing_position FROM dev_synthetic_comparison WHERE {where}', key).fetchall()
        assert sorted(row[0] for row in officers) == sorted(s['roIds'])
        checks += 1
try:
    db.execute('DELETE FROM fixture_mix')
    raise AssertionError('Reporting connection must be read only')
except sqlite3.OperationalError as error:
    assert 'readonly' in str(error)
print(f'PASS: {checks} complete reporting scopes reconcile; read-only database connection rejects writes.')
