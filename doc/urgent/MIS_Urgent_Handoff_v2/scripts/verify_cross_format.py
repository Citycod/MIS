#!/usr/bin/env python3
"""Fail-closed CSV vs workbook vs bundled/selected isolated demo SQLite equality audit.
Only reads files; no writes, no live CRM access, no Superset metadata access.
Uses Python standard-library OOXML XML parser to avoid optional spreadsheet dependencies.
"""
from __future__ import annotations
import argparse,csv,re,sqlite3,sys,zipfile
from collections import Counter
from decimal import Decimal,InvalidOperation
from pathlib import Path
from xml.etree import ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
SHEETS={
 'Events':('mis_300_synthetic_events.csv','demo_investment_events',['event_id']),
 'Starting Positions':('mis_synthetic_starting_positions.csv','demo_starting_positions',['ro_id','product']),
 'RO Targets':('mis_synthetic_ro_targets.csv','demo_ro_targets',['financial_year','ro_id']),
 'Source Aliases':('source_aliases.csv',None,['source_sample_row']),
}
NUMERIC={'transaction_amount_ngn','opening_position_ngn','annual_portfolio_target_ngn','customer_rate_pct','tenor_days','financial_year','source_sample_row'}
NS={'x':'http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
RELNS='{http://schemas.openxmlformats.org/package/2006/relationships}'
def fail(msg): raise AssertionError(msg)
def load_csv(f):
 with (ROOT/f).open(encoding='utf-8-sig',newline='') as fd:
  reader=csv.DictReader(fd)
  return reader.fieldnames,list(reader)
def normalize(r,headers):
 out={}
 for h in headers:
  v=r.get(h)
  if v is None:fail(f'missing column {h}')
  v=str(v).strip()
  if h in NUMERIC:
   try: v=str(Decimal(v).normalize())
   except InvalidOperation: fail(f'non-numeric {h}: {v!r}')
  out[h]=v
 return out
def colidx(address):
 s=re.match(r'[A-Z]+',address).group();n=0
 for c in s:n=n*26+ord(c)-64
 return n-1
def workbook_data(path):
 with zipfile.ZipFile(path) as z:
  workbook=ET.fromstring(z.read('xl/workbook.xml'))
  rels=ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
  targets={e.attrib['Id']:e.attrib['Target'].lstrip('/') for e in rels if 'worksheet' in e.attrib.get('Type','')}
  shared=[]
  if 'xl/sharedStrings.xml' in z.namelist():
   ss=ET.fromstring(z.read('xl/sharedStrings.xml'))
   shared=[''.join(t.text or '' for t in e.findall('.//x:t',NS)) for e in ss.findall('x:si',NS)]
  result={}
  for sheet in workbook.findall('.//x:sheet',NS):
   name=sheet.attrib['name']
   if name not in SHEETS: continue
   target=targets[sheet.attrib[f'{{{NS["r"]}}}id']]
   if not target.startswith('xl/'):target='xl/'+target
   xml=ET.fromstring(z.read(target))
   allrows=[]
   for row in xml.findall('.//x:sheetData/x:row',NS):
    cells={}
    for c in row.findall('x:c',NS):
     idx=colidx(c.attrib['r'])
     if c.attrib.get('t')=='inlineStr':txt=''.join(x.text or '' for x in c.findall('.//x:t',NS))
     else:
      val=c.find('x:v',NS);txt='' if val is None or val.text is None else val.text
      if c.attrib.get('t')=='s':txt=shared[int(txt)]
     cells[idx]=txt
    allrows.append(cells)
   hdrs=[allrows[0].get(i,'') for i in range(max(allrows[0])+1)]
   result[name]=(hdrs,[dict(zip(hdrs,[r.get(i,'') for i in range(len(hdrs))])) for r in allrows[1:]])
 return result
def indexed(rows,keys,label):
 d={}
 for r in rows:
  k=tuple(r[x] for x in keys)
  if k in d:fail(f'{label}: duplicate business key {k}')
  d[k]=r
 return d
def compare(a,b,headers,keys,label):
 a=indexed([normalize(r,headers) for r in a],keys,label+' left')
 b=indexed([normalize(r,headers) for r in b],keys,label+' right')
 if a.keys()!=b.keys():fail(f'{label}: key mismatch: missing={list(a.keys()-b.keys())[:3]} extra={list(b.keys()-a.keys())[:3]}')
 for k in a:
  for h in headers:
   if a[k][h]!=b[k][h]:fail(f'{label}: {k}, {h}: CSV={a[k][h]!r}, other={b[k][h]!r}')
 return len(a)
def main():
 ap=argparse.ArgumentParser(description='Verify all four CSVs match XLSX and demo DB; no writes')
 ap.add_argument('--db',type=Path,default=ROOT/'mis_synthetic_demo_v2.sqlite')
 a=ap.parse_args()
 db=a.db.resolve()
 if not db.is_file():fail(f'Missing demo db: {db}')
 book=workbook_data(ROOT/'MIS_300_Synthetic_Demo_Data_v2.xlsx')
 c=sqlite3.connect(f'file:{db.as_posix()}?mode=ro',uri=True)
 c.execute('PRAGMA query_only=ON')
 try:
  tables={r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'")}
  expected={'demo_investment_events','demo_starting_positions','demo_ro_targets'}
  if not expected.issubset(tables):fail(f'Not a MIS synthetic demo DB; missing {expected-tables}')
  for name,(fn,table,keys) in SHEETS.items():
   hdr,rows=load_csv(fn)
   wh,wr=book[name]
   if hdr!=wh:fail(f'{name}: workbook columns differ from {fn}: {wh} vs {hdr}')
   if len(rows)!=len(wr):fail(f'{name}: CSV {len(rows)} rows, workbook {len(wr)} rows')
   compare(rows,wr,hdr,keys,name+' CSV vs workbook')
   if table:
    dbr=[dict(zip(hdr,r)) for r in c.execute('SELECT '+','.join('"'+x+'"' for x in hdr)+' FROM '+table)]
    if len(rows)!=len(dbr):fail(f'{name}: CSV {len(rows)} rows, DB {len(dbr)} rows')
    compare(rows,dbr,hdr,keys,name+' CSV vs SQLite')
   print(f'PASS: {name}: {len(rows)} records; all columns match CSV ↔ XLSX'+(' ↔ SQLite' if table else ''))
  h,p=load_csv('mis_synthetic_starting_positions.csv')
  sumcsv=sum(Decimal(r['opening_position_ngn']) for r in p)
  sumdb=sum(Decimal(str(r[0])) for r in c.execute('SELECT opening_position_ngn FROM demo_starting_positions'))
  assert sumcsv==sumdb==Decimal('3960000000.00'),(sumcsv,sumdb)
  assert len({r['opening_position_ngn'] for r in p})>1,'All positions suspiciously equal'
  print(f'PASS: opening position totals = NGN {sumcsv:,.2f}; cross-format equality verified for all 72 records')
 finally:c.close()
if __name__=='__main__':
 try:main()
 except (AssertionError,KeyError,ValueError,FileNotFoundError,sqlite3.Error,zipfile.BadZipFile) as e:
  print('FAIL:',e,file=sys.stderr);sys.exit(1)
