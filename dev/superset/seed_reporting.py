"""Development-only reporting data. Copy precomputed fixtures, never CRM formulas."""
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RUNTIME = ROOT / '.local' / 'superset'
RUNTIME.mkdir(parents=True, exist_ok=True)
SNAPSHOTS = json.loads((ROOT / 'src/mocks/dashboard-snapshots.json').read_text())
NAMES = {'RO-001': 'Adebayo Sterling', 'RO-002': 'Chioma Okonkwo', 'RO-003': 'Emeka Nwosu'}
COMMON = 'region_id TEXT, scope_key TEXT, as_of_date TEXT, product_filter TEXT, period_mode TEXT'

def seed():
    db = sqlite3.connect(RUNTIME / 'synthetic-reporting.db')
    definitions = {
        'movement': 'month TEXT, inflows NUMERIC, withdrawals NUMERIC, net_movement NUMERIC',
        'position': 'month TEXT, closing_position NUMERIC, annual_target NUMERIC',
        'mix': 'product_code TEXT, product_name TEXT, allocated_amount NUMERIC, percentage_share NUMERIC',
        'comparison': 'ro_id TEXT, officer TEXT, closing_position NUMERIC, annual_target NUMERIC',
    }
    for name, columns in definitions.items():
        db.execute(f'DROP VIEW IF EXISTS dev_synthetic_{name}')
        db.execute(f'DROP TABLE IF EXISTS fixture_{name}')
        db.execute(f'CREATE TABLE fixture_{name} ({COMMON}, {columns})')
        signed = ', -withdrawals AS signed_withdrawals' if name == 'movement' else ''
        db.execute(f'CREATE VIEW dev_synthetic_{name} AS SELECT *{signed}, \'SYNTHETIC - NOT FINANCIAL REPORTING\' AS data_label FROM fixture_{name}')

    def insert(table, values):
        db.execute(f'INSERT INTO fixture_{table} VALUES ({",".join("?" for _ in values)})', values)

    for snapshot in SNAPSHOTS:
        scope_key = ','.join(sorted(snapshot['roIds']))
        for mode in ('MTD', 'YTD'):
            common = [snapshot['regionId'], scope_key, snapshot['date'], snapshot['productCode'], mode]
            history = [s for s in SNAPSHOTS if s['regionId'] == snapshot['regionId']
                       and sorted(s['roIds']) == sorted(snapshot['roIds'])
                       and s['productCode'] == snapshot['productCode']
                       and s['date'][:4] == snapshot['date'][:4]
                       and s['date'] <= snapshot['date']
                       and (s['date'] == snapshot['date'] or (not s['kpi']['provisional'] and s['date'][:7] < snapshot['date'][:7]))
                       and (mode == 'YTD' or s['date'][:7] == snapshot['date'][:7])]
            for row in sorted(history, key=lambda s: s['date']):
                m = row['movement']
                insert('movement', common + [m['month'], m['externalInflows'], m['outflowsLiquidations'], m['netMovement']])
                # Existing annual position target, explicitly not an invented monthly allocation.
                insert('position', common + [m['month'], m['closingPosition'], row['kpi']['portfolioTarget']])
            for item in snapshot['mix'][mode]:
                insert('mix', common + [item['productCode'], item['productName'], item['allocatedAmount'], item['percentageShare']])
            for ro_id in snapshot['roIds']:
                individual = next(s for s in SNAPSHOTS if s['roIds'] == [ro_id] and s['date'] == snapshot['date'] and s['productCode'] == snapshot['productCode'])
                insert('comparison', common + [ro_id, NAMES[ro_id], individual['kpi']['portfolioBalance'], individual['kpi']['portfolioTarget']])
    db.commit()
    counts = {name: db.execute(f'SELECT COUNT(*) FROM dev_synthetic_{name}').fetchone()[0] for name in definitions}
    db.close()
    print('Seeded deterministic synthetic reporting views:', counts)

if __name__ == '__main__':
    seed()
