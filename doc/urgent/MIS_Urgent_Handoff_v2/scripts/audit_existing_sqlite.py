#!/usr/bin/env python3
"""Read-only SQLite schema inventory; prints only table/view names, no customer records."""
import sqlite3,argparse
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('database_path');a=p.parse_args();path=Path(a.database_path).expanduser().resolve()
if not path.exists():p.error('Database file not found')
if not path.is_file():p.error('Database path must be a file')
con=sqlite3.connect(f'file:{path.as_posix()}?mode=ro',uri=True)
con.execute('PRAGMA query_only=ON')
for ty,name in con.execute("SELECT type,name FROM sqlite_master WHERE type IN ('view','table') AND name NOT LIKE 'sqlite_%' ORDER BY type,name"):
 print(ty, name)
con.close()
