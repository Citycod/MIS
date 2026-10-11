#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
export UV_CACHE_DIR="$PWD/.local/uv-cache"
export UV_PYTHON_INSTALL_DIR="$PWD/.local/python"
export UV_HTTP_TIMEOUT=600
export UV_CONCURRENT_DOWNLOADS=2
export UV_PYTHON_BIN_DIR="$PWD/.local/bin"
mkdir -p .local/tools
if [[ ! -x .local/tools/bin/uv ]]; then
  python3 -m pip install --target .local/tools uv==0.13.0
fi
.local/tools/bin/uv python install 3.11.17
if [[ ! -x .local/superset-venv/bin/python ]]; then
  .local/tools/bin/uv venv --python 3.11.17 .local/superset-venv
fi
.local/tools/bin/uv pip install --python .local/superset-venv/bin/python -r dev/superset/requirements.lock.txt
python3 dev/superset/init_runtime.py
python3 dev/superset/seed_reporting.py
export SUPERSET_CONFIG_PATH="$PWD/dev/superset/superset_config.py"
export SUPERSET_HOME="$PWD/.local/superset"
export FLASK_APP=superset
.local/superset-venv/bin/superset db upgrade
.local/superset-venv/bin/superset init
.local/superset-venv/bin/python dev/superset/bootstrap.py
printf '\nSuperset is ready. Run bash dev/superset/run.sh.\n'
printf 'Enable PIS_SUPERSET_LOCAL_ENABLED=true in .env.local and restart Next.js.\n'
