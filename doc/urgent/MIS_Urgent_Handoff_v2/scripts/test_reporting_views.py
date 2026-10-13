#!/usr/bin/env python3
"""Read-only consistency tests for the BUNDLED ISOLATED MIS demo SQLite database.

Never points to production or existing Superset metadata; accepts only the exact demo
filename beside this script's parent. This is not a certification of Finance formulas.
"""
from __future__ import annotations
import sqlite3
import argparse
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description='Test selected isolated MIS synthetic demo SQLite views (read-only)')
parser.add_argument('--db', type=Path, default=ROOT / 'mis_synthetic_demo_v2.sqlite', help='Specific isolated demo SQLite file to test; defaults to bundled file')
args=parser.parse_args()
DB = args.db.resolve()
assert DB.is_file(), f'Missing selected demo DB: {DB}'
conn=sqlite3.connect(f'file:{DB.as_posix()}?mode=ro', uri=True)
conn.execute('PRAGMA query_only=ON')
expected_tables={'demo_investment_events','demo_starting_positions','demo_ro_targets'}
actual_tables={r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
assert expected_tables.issubset(actual_tables), f'Not an isolated MIS synthetic demo database: {DB}'
def num(x):return float(x or 0)
def close(a,b, label):
    assert abs(num(a)-num(b)) < .02, f'{label}: {a} vs {b}'
try:
    assert conn.execute('SELECT COUNT(*) FROM demo_investment_events').fetchone()[0] == 300
    assert conn.execute('SELECT COUNT(*) FROM demo_starting_positions').fetchone()[0] == 72
    assert conn.execute('SELECT COUNT(*) FROM demo_ro_targets').fetchone()[0] == 12
    assert conn.execute('SELECT COUNT(*) FROM v_demo_monthly_ro_product_movement').fetchone()[0] == 720
    assert conn.execute('SELECT COUNT(*) FROM v_demo_monthly_ro_position').fetchone()[0] == 120
    months=[r[0] for r in conn.execute('SELECT DISTINCT reporting_month FROM v_demo_monthly_ro_position ORDER BY reporting_month')]
    assert months == [f'2026-{m:02d}-01' for m in range(1,11)], months
    movements=conn.execute('SELECT reporting_month,ro_id,product,opening_position_ngn,external_inflows_ngn,withdrawals_ngn,net_external_movement_ngn,closing_position_ngn FROM v_demo_monthly_ro_product_movement').fetchall()
    assert len(movements)==720
    positions={}
    for month,ro,prod,opening,inf,wd,net,closing in movements:
        close(num(inf)-num(wd),net,f'net {month}/{ro}/{prod}')
        close(num(opening)+num(net),closing,f'close {month}/{ro}/{prod}')
        assert num(closing)>=0, f'negative {month}/{ro}/{prod}'
        positions.setdefault((month,ro),0.0)
        positions[(month,ro)]+=num(closing)
    summary=conn.execute('SELECT reporting_month,ro_id,closing_position_ngn,approved_monthly_run_rate_ngn,approved_profitability_ngn,approved_wacc_pct FROM v_demo_monthly_ro_position').fetchall()
    assert len(summary)==120
    for m,r,c,pace,profit,wacc in summary:
        close(c,positions[(m,r)],f'RO total {m}/{r}')
        assert pace is None and profit is None and wacc is None, 'Unapproved KPI must be null'
    # October is an incomplete month. No event may be later than the demo as-of 10 Oct.
    assert conn.execute('SELECT MAX(event_date) FROM demo_investment_events').fetchone()[0] <= '2026-10-10'
    for period,start in [('MTD','2026-10-01'),('YTD','2026-01-01')]:
        eligible=conn.execute("SELECT SUM(external_inflow_ngn) FROM v_demo_events WHERE event_date>=? AND event_date<='2026-10-10'",(start,)).fetchone()[0] or 0
        direct=conn.execute("SELECT SUM(CAST(transaction_amount_ngn AS NUMERIC)) FROM demo_investment_events WHERE event_type='NEW_INFLOW' AND event_date>=? AND event_date<='2026-10-10'",(start,)).fetchone()[0] or 0
        close(eligible,direct,period+' event inflow')
    mix=conn.execute('SELECT reporting_month,ro_id,product,eligible_inflow_ngn FROM v_demo_investment_mix').fetchall()
    assert mix
    for mon,ro,prod,amt in mix:
        direct=conn.execute("SELECT SUM(CAST(transaction_amount_ngn AS NUMERIC)) FROM demo_investment_events WHERE event_type='NEW_INFLOW' AND substr(event_date,1,7)=substr(?,1,7) AND ro_id=? AND product=?",(mon,ro,prod)).fetchone()[0] or 0
        close(amt,direct,f'product mix {mon}/{ro}/{prod}')
    print('PASS: isolated demo SQL views reconcile: 300 events, 720 product/month rows, 120 RO/month rows, signed movement, as-of MTD/YTD, mix and pending KPIs.')
finally:
    conn.close()
