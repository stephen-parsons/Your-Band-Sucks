# Backend server setup with NodeJS, Express, Prisma and Postgresql

## Basic Setup

1. `npm i` to install npm dependencies
2. Create a `.env` file in `/server` directory with your database url like: `DATABASE_URL={postgresql_db_url}`. The url for postgresql is usually in the format `postgresql://{username}:{password}@{host}:5432/{db}`. For local instances installed with homebrew `postgresql://localhost:5432/postgres` is usually sufficient.
3. `brew install postgresql@18` and `brew services start postgresql@18` to run the postgresql server. Check `brew services list | grep postgresql@18` and `psql -d postgres -U {username}` to verify the server is running and accesible. You can stop the server with `brew services stop postgresql@18`
4. `npm start` to start express server in `watch` mode

## Prisma setup

Make sure to run the following commands when starting the server!

This migrates the db schema and generates the `prisma` client.

```
npx prisma migrate dev --name init
npx prisma generate
```

## Troubleshooting

If unable to run `psql`, you may need to symlink the command to your homebrew installation. Add `export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH"` to your bashrc or zshrc and source the changes. Make sure to specify the correct postgresql version you installed form Homebrew.
