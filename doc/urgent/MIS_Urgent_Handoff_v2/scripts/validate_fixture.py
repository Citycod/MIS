#!/usr/bin/env python3
"""Offline QA for the MIS v2 CSV fixtures and provenance. No database connection."""
import csv,collections,datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def load(n):
 with (ROOT/n).open(encoding='utf-8',newline='') as f:return list(csv.DictReader(f))
e=load('mis_300_synthetic_events.csv');p=load('mis_synthetic_starting_positions.csv');t=load('mis_synthetic_ro_targets.csv');a=load('source_aliases.csv')
assert (len(e),len(p),len(t),len(a))==(300,72,12,10)
assert len({r['event_id'] for r in e})==300
assert len({r['customer_id'] for r in e})==40
assert len({r['customer_name'].split(' [Demo ')[0] for r in e})==10
assert len({r['source_sample_row'] for r in e})==10
lookup={r['source_sample_row']:r['source_customer_alias'] for r in a}
assert all(r['customer_name'].startswith(lookup[r['source_sample_row']]+' [Demo ') for r in e)
assert {r['region_id'] for r in e}=={'LAG','ABJ','PH'}
assert len({r['ro_id'] for r in e})==12
assert len({r['product'] for r in e})==6
assert set(r['data_classification'] for r in e)=={'SYNTHETIC_DEMO_ONLY'}
assert set(r['event_type'] for r in e)=={'NEW_INFLOW','ROLLOVER','WITHDRAWAL','MATURITY'}
assert all(float(r['transaction_amount_ngn'])>0 for r in e)
assert all(r['currency']=='NGN' for r in e)
assert collections.Counter(r['event_date'][:7] for r in e)=={f'2026-{m:02d}':30 for m in range(1,11)}
assert {r['source_sample_row'] for r in e}=={str(i) for i in range(3,13)}
assert all(1<=int(r['tenor_days'])<=365 for r in e)
assert len({(r['ro_id'],r['product']) for r in p})==72
assert len({r['ro_id'] for r in t})==12
assert all('calculation_base' not in r and 'pool_rate' not in r for r in e)
assert all(datetime.date.fromisoformat(r['event_date']).year==2026 for r in e)
print('PASS: 300 events; 40 demo customers with 10 distinct source aliases; 10 lineage rows; 3 regions; 12 ROs; 6 products; 10 months.')
print('REGIONS:',dict(sorted(collections.Counter(r['region'] for r in e).items())))
print('PRODUCTS:',dict(sorted(collections.Counter(r['product'] for r in e).items())))
