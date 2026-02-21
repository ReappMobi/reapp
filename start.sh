#!/bin/sh

set -ex

echo "Applying migrations"
pnpm prisma migrate deploy

echo "Running reapp"

exec node dist/src/main.js