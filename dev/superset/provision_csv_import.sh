#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
export SUPERSET_CONFIG_PATH="$PWD/dev/superset/superset_config.py"
export SUPERSET_HOME="$PWD/.local/superset"
export FLASK_APP=superset
.local/superset-venv/bin/python dev/superset/provision_csv_import.py
