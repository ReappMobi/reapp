## Description

[Reapp](https://github.com/ReappMobi/reappt) é um servidor de rede social open-source onde usuários podem seguir, descobrir e doar para instituições sociais.

## Requisitos

- Docker & Docker Compose (recomendado para desenvolvimento)
- Node.js (recomendado: 18.x/20.x)
- pnpm (o projeto usa pnpm como gerenciador de pacotes)

## Instalação (local)

```bash
pnpm install
```

## Variáveis de ambiente

Crie um arquivo `.env` na raiz com as variáveis mínimas. Exemplo para desenvolvimento (NÃO comitar este arquivo):

```env
NODE_ENV=development
PORT=3000

# Postgres (usado pelo container de dev ou por um Postgres local)
POSTGRES_USER=reapp
POSTGRES_PASSWORD=senha_dev_segura
POSTGRES_DB=reapp
DATABASE_URL=postgresql://reapp:senha_dev_segura@localhost:5432/reapp?schema=public

# Redis (se usar container)
REDIS_HOST=redis
REDIS_PORT=6379
```

Para testes, crie `.env.test.local` com `NODE_ENV=test` e a `DATABASE_URL` apontando para um banco de testes.

## Desenvolvimento com Docker (recomendado)

O projeto inclui dois arquivos de compose:

- `docker-compose.yml` — stack completa (Traefik, backend, database, redis). Esse arquivo builda a imagem do backend definida pelo `Dockerfile`.
- `compose-dev.yaml` — compose reduzido pensado para desenvolvimento (ex.: apenas `database` e `redis`).

Subir apenas banco + redis (rápido, não builda o backend):

```bash
docker-compose -f compose-dev.yaml up -d
```

Subir toda a stack (inclui build do backend, Traefik etc):

```bash
docker-compose up -d
```

Observações:

- Se usar `docker-compose up` sem `-f compose-dev.yaml`, o Compose usará `docker-compose.yml` (que contém a instrução `build:` para o backend) — por isso a imagem do backend pode ser construída automaticamente.
- O serviço `database` usa `env_file: .env`. Garanta que `POSTGRES_PASSWORD`, `POSTGRES_USER` e `POSTGRES_DB` estejam presentes no `.env` antes de subir o container.

## Prisma — gerar client, migrar e seed

Depois de subir o banco (ou apontar `DATABASE_URL` para um Postgres acessível), execute:

```bash
# gera o client do Prisma
pnpm db:generate

# aplica migrações (modo dev)
pnpm db:migrate

# (opcional) rodar seeds
pnpm db:seed
```

Notas:

- Se o banco estiver rodando em container e você executar os comandos a partir do host, use `localhost:5432` na `DATABASE_URL` (o compose mapeia a porta). Se executar comandos dentro de um container na mesma rede do compose, use `database:5432` como host.

## Rodar a aplicação

Local (watch / desenvolvimento):

```bash
pnpm start:dev
```

Produção (build + start):

```bash
pnpm build
pnpm start:prod
```

Ou rode o backend como container (após `docker-compose up` / imagem construída):

```bash
docker-compose up -d backend
```

## Testes

O projeto utiliza um script para testes que carrega variáveis de ambiente com `dotenvx`.

```bash
./scripts/run-test.sh

# cobertura
pnpm test:cov
```

## License

Reapp é licenciado sob GPL-3.0 (ver `LICENSE`).
