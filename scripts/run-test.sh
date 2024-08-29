#!/usr/bin/sh

# Prepare the environment
npx dotenvx run --env-file ./.env.test.local -- npx prisma migrate reset --force

# Run the tests
npx dotenvx run --env-file ./.env.test.local -- npm run test # Unit tests
npx dotenvx run --env-file ./.env.test.local -- npm run test:e2e # E2E tests
