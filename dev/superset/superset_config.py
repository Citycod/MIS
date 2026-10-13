"""Loopback-only synthetic development service. Not a production configuration."""
import json
from pathlib import Path
from cachelib.file import FileSystemCache

ROOT = Path(__file__).resolve().parents[2]
RUNTIME = ROOT / '.local' / 'superset'
SECRETS = json.loads((RUNTIME / 'secrets.json').read_text())
SECRET_KEY = SECRETS['secret_key']
SQLALCHEMY_DATABASE_URI = f'sqlite:///{RUNTIME / "metadata.db"}'
FEATURE_FLAGS = {'EMBEDDED_SUPERSET': True}
GUEST_TOKEN_JWT_SECRET = SECRETS['guest_secret']
GUEST_TOKEN_JWT_AUDIENCE = 'pis-local-synthetic'
GUEST_TOKEN_JWT_EXP_SECONDS = 300
GUEST_ROLE_NAME = 'MIS Embedded'
WTF_CSRF_ENABLED = True
SESSION_COOKIE_SAMESITE = 'Lax'
TALISMAN_ENABLED = True
TALISMAN_CONFIG = {
    'force_https': False,
    'frame_options': None,
    'content_security_policy': {
        'default-src': ["'self'"],
        'img-src': ["'self'", 'blob:', 'data:'],
        'worker-src': ["'self'", 'blob:'],
        'connect-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'script-src': ["'self'", "'strict-dynamic'"],
        'frame-ancestors': ['http://127.0.0.1:3000', 'http://127.0.0.1:3100', 'http://127.0.0.1:3200', 'http://localhost:3000', 'http://localhost:3100', 'http://localhost:3200'],
    },
    'content_security_policy_nonce_in': ['script-src'],
}
# SQLite is deliberately confined to this disposable, synthetic local environment.
PREVENT_UNSAFE_DB_CONNECTIONS = False
CACHE_CONFIG = {'CACHE_TYPE': 'SimpleCache', 'CACHE_DEFAULT_TIMEOUT': 300}
DATA_CACHE_CONFIG = {'CACHE_TYPE': 'SimpleCache', 'CACHE_DEFAULT_TIMEOUT': 300}
FILTER_STATE_CACHE_CONFIG = {'CACHE_TYPE': 'SimpleCache', 'CACHE_DEFAULT_TIMEOUT': 300}
EXPLORE_FORM_DATA_CACHE_CONFIG = {'CACHE_TYPE': 'SimpleCache', 'CACHE_DEFAULT_TIMEOUT': 300}
RESULTS_BACKEND = FileSystemCache(str(RUNTIME / 'results'))
ENABLE_PROXY_FIX = False
WEBDRIVER_BASEURL = 'http://127.0.0.1:8088'
SUPERSET_WEBSERVER_TIMEOUT = 60
EXTRA_CATEGORICAL_COLOR_SCHEMES = [{
    'id': 'sterling_synthetic', 'description': 'Sterling synthetic development',
    'label': 'SAMTL Burgundy',
    'colors': ['#A51F27', '#C13F48', '#D96B73', '#E49A9F', '#F0C2C5', '#651015', '#8E3037'],
}]
