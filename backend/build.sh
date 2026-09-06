#!/usr/bin/env bash
set -o errexit

echo "==> Installing Python dependencies"
pip install -r requirements.txt

echo "==> Collecting Django static files"
python manage.py collectstatic --no-input

echo "==> Applying database migrations"
python manage.py migrate

if [ "${SEED_STAGING:-0}" = "1" ]; then
    echo "==> Creating/updating staging demo data"
    python manage.py seed_staging
fi

echo "==> Backend build completed"
