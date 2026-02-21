## Description

[Reapp](https://github.com/ReappMobi/reappt) is an open-source social network server where users can follow, discover and donate to social institutions.

## Requirements

- Docker & Docker Compose (recommended for development)
- Node.js (recommended: 18.x/20.x)
- pnpm (the project uses pnpm as package manager)

## Installation (local)

```bash
pnpm install
```

## Environment variables

Create a `.env` file in the project root with the minimal variables. Example for development (DO NOT commit this file):

```env
NODE_ENV=development
PORT=3000

# Postgres (used by the dev container or a local Postgres)
POSTGRES_USER=reapp
POSTGRES_PASSWORD=secure_dev_password
POSTGRES_DB=reapp
DATABASE_URL=postgresql://reapp:secure_dev_password@localhost:5432/reapp?schema=public

# Redis (if using container)
REDIS_HOST=redis
REDIS_PORT=6379
```

For tests, create `.env.test.local` with `NODE_ENV=test` and a `DATABASE_URL` pointing to a test database.

## Development with Docker (recommended)

The project includes two compose files:

- `docker-compose.yml` — full stack (Traefik, backend, database, redis). This file builds the backend image defined by the `Dockerfile`.
- `compose-dev.yaml` — a reduced compose file intended for development (e.g. only `database` and `redis`).

Bring up only the database + redis (fast, does not build the backend):

```bash
docker-compose up -d
```

Bring up the full stack (includes backend build, Traefik etc):

```bash
docker-compose up -d
```

Notes:

- If you run `docker-compose up` without `-f compose-dev.yaml`, Compose will use `docker-compose.yml` (which contains a `build:` entry for the backend) — so the backend image may be built automatically.
- The `database` service uses `env_file: .env`. Make sure `POSTGRES_PASSWORD`, `POSTGRES_USER` and `POSTGRES_DB` are present in the `.env` before starting the container.

## Prisma — generate client, migrate and seed

After the database is up (or after pointing `DATABASE_URL` to an accessible Postgres), run:

```bash
# generate Prisma client
pnpm db:generate

# apply migrations (dev mode)
pnpm db:migrate

# (optional) run seeds
pnpm db:seed
```

Notes:

- If the database is running in a container and you run the commands from the host, use `localhost:5432` in the `DATABASE_URL` (compose maps the port). If you run commands from another container on the same compose network, use `database:5432` as the host.

## Run the application

Local (watch / development):

```bash
pnpm start:dev
```

Production (build + start):

```bash
pnpm build
pnpm start:prod
```

Or run the backend as a container (after `docker-compose up` / image is built):

```bash
docker-compose up -d backend
```

## Tests

The project uses a script to run tests that loads environment variables with `dotenvx`.

```bash
./scripts/run-test.sh

# coverage
pnpm test:cov
```

## License

Reapp is licensed under GPL-3.0 (see `LICENSE`).
