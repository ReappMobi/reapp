#!/bin/sh

set -ex

echo "Applying migrations"
./node_modules/prisma/node_modules/.bin/prisma generate
./node_modules/prisma/node_modules/.bin/prisma migrate deploy

echo "Running reapp"

exec node dist/src/main.js