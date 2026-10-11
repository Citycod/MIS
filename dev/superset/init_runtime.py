"""Generate local credentials once; never print or commit them."""
import json
import os
import secrets
from pathlib import Path
root = Path(__file__).resolve().parents[2]
runtime = root / '.local' / 'superset'
runtime.mkdir(parents=True, exist_ok=True)
os.chmod(runtime, 0o700)
path = runtime / 'secrets.json'
if not path.exists():
    values = {key: secrets.token_urlsafe(48) for key in ('secret_key', 'guest_secret', 'admin_password', 'broker_password')}
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as stream:
        json.dump(values, stream)
print('Local runtime credentials ready (not displayed).')
