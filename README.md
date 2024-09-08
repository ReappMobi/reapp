## Description

[Reapp](https://github.com/ReappMobi/reappt) is a free, open-source social network server where users can follow and donate to social institutions discover new ones.

## Installation

```bash
$ npm install
```

## Running the app

Create a .env file with the following content:
```yaml
NODE_ENV=test

# Database
POSTGRES_USER=<your_user>
POSTGRES_PASSWORD=<your_password>
DATABASE_HOST=localhost
DATABASE_DB=test
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${DATABASE_HOST}:5433/${DATABASE_DB}?schema=public"
```

Run prisma migrations:
```bash
$ npx prisma migrate dev
```

Run the app:
```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test
Create a .env.test.local file with the following content:
```yaml
NODE_ENV=test

# Database
POSTGRES_USER=<your_user>
POSTGRES_PASSWORD=<your_password>
DATABASE_HOST=localhost
DATABASE_DB=test
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${DATABASE_HOST}:5433/${DATABASE_DB}?schema=public"
```


To run tests you need the [dotenvx](https://dotenvx.com/) package to load the environment variables from the .env file.

```bash
$ ./scripts/run-test.sh

# test coverage
$ npm run test:cov
```

## License

Reapp is [GPL-3.0 license](LICENSE).
