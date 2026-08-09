# Backend server setup with NodeJS, Express, Prisma and Postgresql

## Basic Setup

1. `npm i` to install npm dependencies
2. Create a `.env` file in `/server` directory with your database url like: `DB_URL={postgresql_db_url}`. The url for postgresql is usually in the format `postgresql://{username}:{password}@{host}:5432/{db}`. For local instances installed with homebrew `postgresql://localhost:5432/postgres` is usually sufficient.
3. `brew install postgresql@18` and `brew services start postgresql@18` to run the postgresql database server. Check `brew services list | grep postgresql@18` and `psql -d postgres -U {username}` to verify the server is running and accesible. You can stop the server with `brew services stop postgresql@18`
4. `npm watch` to build the server code in `watch` mode
5. `npm start` to start express server in `watch` mode
6. **(Optional)** `brew install redis` and `brew services start redis` will install a local redis server and start the server. This application makes use of a redis caching layer, but it is not required. Make sure to add `REDIS_URL` in your .env file (will also default to localhost which should work for brew installations).

## Logging

To disable color outputs, use FORCE_COLOR=0 (this should be enabled in production by default) to turn off Chalk.

## Prisma setup

Make sure to run the following commands when starting the server!

This migrates the db schema and generates the `prisma` client.

```
npx prisma migrate deploy
npx prisma generate
```

To apply a new migration run:

```
npx prisma migrate dev --name <migration_name>
```

To reset the db:

```
npnx prisma migrate reset
```

For more info:
https://www.prisma.io/docs/cli/migrate

## Docker setup

This app can be run using Docker. It is recommended to install Docker Desktop. You can install Docker with Homebrew via `brew install docker`.

From the server folder run `docker compose up -d`. Make sure that your local postgres or redis instances are NOT running prior to composing the Docker container.

WARN: local development/hot reloading is not enabled yet for Docker.

To reload the server run `docker compose up -d --build server`. This rebuilds and restarts ONLY the server in the running container.

Add the following env vars to support a Docker based postgres connection:

```
DB_PASSWORD
DB_USER
DB_NAME
```

## AWS

AWS access is needed for certain operations, like generating pre-signed urls. Contact your administrator (me) to get a development account. After that follow these steps:

1. Install the aws-cli brew install `awscli`. Run `which aws` to verify installation.
2. Run `aws configure sso` with your account details to setup sso.
3. Run `aws sso login --profile {your-profile}` in order to login through the aws portal. Alternatively modify `~/.aws/config` to use a default acccount.
4. Run `aws sts get-caller-identity` to verify your sso was successful.

### Deployments

Production/backend infrastructure (Fargate, RDS, Redis, ALB, DNS) is managed with AWS CDK. See **[../cdk/README.md](../cdk/README.md)** for architecture, commands, and the deploy lifecycle.

### Service Credentials

Service credentials for this server to perform AWS operations is powered by an IAM User called `local-api-service`. The long rnning credentials for this IAM User must obtained through the AWS console.

### Env variables

The following nev variables are needed for AWS Services. Add them to your .env file:

```
# AWS env vars
COGNITO_USER_POOL_ID="pool-id"
COGNITO_CLIENT_ID="client-id"
COGNITO_IDENTITY_POOL_ID="pool-id"
S3_IMAGES_BUCKET="bucket"
S3_AUDIO_FILES_BUCKET="bucket"
AWS_REGION="us-west-1"

# AWS IAM user
IAM_USER_AWS_ACCESS_KEY_ID="access_key_id"
IAM_USER_AWS_SECRET_ACCESS_KEY="access_key"
```

## API Testing

Run `npm run ping -- --path=/path/to/api` to execute a request against any api endpoint. Proper authentication is required, make sure to provide the variables from above as well as:

```
//username and password for the test user
COGNITO_TEST_USER_NAME,
COGNITO_TEST_USER_PASSWORD,
```

in your local `.env` file.

Example POST request:

```
npm run ping -- --path=/posts/like --method=POST --body='{"liked":true,"songId": 3}'
```

## Troubleshooting

If unable to run `psql`, you may need to symlink the command to your homebrew installation. Add `export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH"` to your bashrc or zshrc and source the changes. Make sure to specify the correct postgresql version you installed form Homebrew.

### Rollbacks

To mitigate issues with rolling back cdk deploys on initial resources setup, you may need to manually delete the postgres instance (Which has a RETAIN policy).

Run

```
aws rds modify-db-instance \
    --db-instance-identifier your-db-identifier \
    --no-deletion-protection \
    --apply-immediately
```

and

```
aws rds delete-db-instance \
    --db-instance-identifier your-db-identifier \
    --skip-final-snapshot
```

to manually delete the db.
