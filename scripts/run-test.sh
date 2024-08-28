#!/usr/bin/sh

# Prepare the environment
dotenvx run --env-file ./.env.test.local -- npx prisma migrate reset --force

# Run the tests
dotenvx run --env-file ./.env.test.local -- npm run test # Unit tests
dotenvx run --env-file ./.env.test.local -- npm run test:e2e # E2E tests
