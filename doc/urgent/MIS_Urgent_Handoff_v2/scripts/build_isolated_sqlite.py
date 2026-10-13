#!/usr/bin/env python3
"""Make a NEW throwaway SQLite demo file; refuse to overwrite ANY existing file."""
import argparse,csv,sqlite3
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description='Create a new isolated MIS synthetic SQLite database; never run on a CRM database')
parser.add_argument('--output',default=str(ROOT/'mis_synthetic_demo_v2.sqlite'))
a=parser.parse_args()
out=Path(a.output).expanduser().resolve()
if out.exists():parser.error(f'Output already exists: {out}. Refusing to overwrite.')
if out.is_dir():parser.error('Output is a directory')
if out.suffix!='.sqlite':parser.error('Output must end in .sqlite')
out.parent.mkdir(parents=True,exist_ok=True)
con=sqlite3.connect(str(out))
try:
    con.executescript('''
    PRAGMA foreign_keys=ON;
    CREATE TABLE demo_investment_events (
      event_id TEXT PRIMARY KEY,event_date TEXT NOT NULL,region_id TEXT NOT NULL,region TEXT NOT NULL,
      ro_id TEXT NOT NULL,ro_name TEXT NOT NULL,customer_id TEXT NOT NULL,customer_name TEXT NOT NULL,
      product TEXT NOT NULL,event_type TEXT NOT NULL,transaction_amount_ngn TEXT NOT NULL,
      customer_rate_pct TEXT NOT NULL,tenor_days INTEGER NOT NULL,source_sample_row INTEGER NOT NULL,
      currency TEXT NOT NULL,data_classification TEXT NOT NULL);
    CREATE TABLE demo_starting_positions (
      as_of_date TEXT,region_id TEXT,region TEXT,ro_id TEXT,ro_name TEXT,product TEXT,
      opening_position_ngn TEXT,currency TEXT,data_classification TEXT,PRIMARY KEY(ro_id,product));
    CREATE TABLE demo_ro_targets (
      financial_year INTEGER,region_id TEXT,ro_id TEXT,annual_portfolio_target_ngn TEXT,
      currency TEXT,data_classification TEXT,PRIMARY KEY(financial_year,ro_id));
    ''')
    for filename,table in [('mis_300_synthetic_events.csv','demo_investment_events'),
        ('mis_synthetic_starting_positions.csv','demo_starting_positions'),
        ('mis_synthetic_ro_targets.csv','demo_ro_targets')]:
        with (ROOT/filename).open(newline='',encoding='utf-8') as f:
            rdr=csv.DictReader(f);cols=rdr.fieldnames;rows=list(rdr)
        col_sql=','.join('"'+c+'"' for c in cols)
        con.executemany(f'INSERT INTO {table} ({col_sql}) VALUES ({",".join("?" for _ in cols)})',
            [[r[c] for c in cols] for r in rows])
    con.executescript((ROOT/'mis_demo_views.sql').read_text(encoding='utf-8'))
    con.commit()
    assert con.execute('SELECT COUNT(*) FROM demo_investment_events').fetchone()[0]==300
    assert con.execute('SELECT COUNT(*) FROM v_demo_monthly_ro_product_movement').fetchone()[0]==720
    assert con.execute('SELECT COUNT(*) FROM v_demo_monthly_ro_position').fetchone()[0]==120
    assert con.execute('SELECT COUNT(*) FROM v_demo_investment_mix').fetchone()[0]>0
    negatives=con.execute('SELECT COUNT(*) FROM v_demo_monthly_ro_product_movement WHERE closing_position_ngn<0').fetchone()[0]
    assert negatives==0, negatives
    print('NEW demo SQLite created:',out,'| 300 events | 720 monthly product snapshots | 120 RO monthly positions')
except Exception:
    con.close();out.unlink(missing_ok=True);raise
else: con.close()
