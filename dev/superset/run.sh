#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
export SUPERSET_CONFIG_PATH="$PWD/dev/superset/superset_config.py"
export SUPERSET_HOME="$PWD/.local/superset"
export FLASK_APP=superset
exec .local/superset-venv/bin/superset run --host 127.0.0.1 --port 8088 --with-threads
