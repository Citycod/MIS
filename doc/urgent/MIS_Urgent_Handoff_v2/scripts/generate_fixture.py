#!/usr/bin/env python3
"""Generate isolated, explicitly synthetic MIS analytics data. Not a finance calculation engine."""
from __future__ import annotations
import csv, random, calendar
from datetime import date
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
rand=random.Random(20261012)
with (ROOT/'source_aliases.csv').open(newline='',encoding='utf-8') as f:
    aliases=list(csv.DictReader(f))
assert len(aliases)==10
regions=[('LAG','Lagos'),('ABJ','Abuja'),('PH','Port Harcourt')]
products=['Fixed Deposit','Treasury Bills','Sukuk Investments','Shyta','Sira','Commercial Paper']
event_types=['NEW_INFLOW','ROLLOVER','WITHDRAWAL','MATURITY']
ros=[(f'RO-{r[0]}-{i:02d}',f'Demo {r[1]} RO {i:02d}',r[0],r[1]) for r in regions for i in range(1,5)]
headers=['event_id','event_date','region_id','region','ro_id','ro_name','customer_id','customer_name',
'product','event_type','transaction_amount_ngn','customer_rate_pct','tenor_days','source_sample_row','currency','data_classification']
rows=[]
for month in range(1,11):
    for i in range(30):
        n=len(rows)
        # Balanced 3 regions; 10 rows/region/month, officer rotating, 40 distinct demo customer labels.
        reg_idx=i%3
        reg_code,reg_name=regions[reg_idx]
        ro_idx=(month+i//3)%4
        ro_id,ro_name,_,_=ros[reg_idx*4+ro_idx]
        customer_seq=(n*7+3)%40
        sample=aliases[customer_seq%10]
        demo_suffix=(customer_seq//10)+1
        event_date=date(2026,month,rand.randint(1,min(calendar.monthrange(2026,month)[1],10) if month==10 else calendar.monthrange(2026,month)[1]))
        product=products[(n*7+i//3)%6]
        kind=rand.choices(event_types,weights=[61,19,16,4],k=1)[0]
        amount=rand.randint(500,22000)*1000
        if kind=='MATURITY': amount=max(500000,round(amount*.75/1000)*1000)
        tenor=rand.choice([30,60,90,180,365])
        rate=rand.choice(['14.00','15.00','16.00','18.00','20.00'])
        rows.append([f'MIS-EVT-{n+1:04d}',event_date.isoformat(),reg_code,reg_name,ro_id,ro_name,
            f'CUST-DEMO-{customer_seq+1:03d}',f'{sample["source_customer_alias"]} [Demo {demo_suffix:02d}]',
            product,kind,f'{amount:.2f}',rate,str(tenor),sample['source_sample_row'],'NGN','SYNTHETIC_DEMO_ONLY'])
assert len(rows)==300
with (ROOT/'mis_300_synthetic_events.csv').open('w',newline='',encoding='utf-8') as f:
    w=csv.writer(f);w.writerow(headers);w.writerows(rows)
# independent assumption fixtures, not from CRM or approved financial calculations
opening=[]
for ro_index,(ro_id,ro_name,reg_code,reg_name) in enumerate(ros):
    for product_index,product in enumerate(products):
        # Demo-only opening snapshots between NGN 40m and NGN 70m, not CRM-derived.
        # The fixed seed and QA assert they cover all synthetic signed withdrawals.
        opening_amount=40_000_000 + ((ro_index*2+product_index)%7)*5_000_000
        opening.append(['2025-12-31',reg_code,reg_name,ro_id,ro_name,product,f'{opening_amount:.2f}','NGN','SYNTHETIC_DEMO_ONLY'])
with (ROOT/'mis_synthetic_starting_positions.csv').open('w',newline='',encoding='utf-8') as f:
    w=csv.writer(f);w.writerow(['as_of_date','region_id','region','ro_id','ro_name','product','opening_position_ngn','currency','data_classification']);w.writerows(opening)
targets=[]
for idx,(ro_id,_,reg_code,_) in enumerate(ros):
    targets.append(['2026',reg_code,ro_id,f'{(600+idx*50)*1000000:.2f}','NGN','SYNTHETIC_DEMO_ONLY'])
with (ROOT/'mis_synthetic_ro_targets.csv').open('w',newline='',encoding='utf-8') as f:
    w=csv.writer(f);w.writerow(['financial_year','region_id','ro_id','annual_portfolio_target_ngn','currency','data_classification']);w.writerows(targets)
print(f'Wrote {len(rows)} events, {len(opening)} product starting positions, {len(targets)} RO targets.')
print(f'Customer aliases {len(set(x[7].split(" [Demo ")[0] for x in rows))}; source row refs {sorted(set(x[13] for x in rows),key=int)}.')
