# YourBandSucks CDK

AWS CDK (TypeScript) for the backend: Express on Fargate, Postgres, Redis, plus imported Cognito/S3 and cross-account DNS for api.

## Architecture

```
Mobile / clients
       │ HTTPS
       ▼
Route53 (DNS account) ──► ALB (HTTPS) ──► ECS Fargate (Express)
                                              │
                         ┌────────────────────┼────────────────────┐
                         ▼                    ▼                    ▼
                   RDS Postgres            ElastiCache          Cognito / S3
                   (private)               Redis (private)      (imported)
```

| Piece | Notes |
| --- | --- |
| **Stack** | `YourBandSucksBackend` in `bin/cdk.ts` |
| **S3 / Cognito** | Imported by ID (not created/destroyed by this stack) |
| **Networking** | VPC, ALB, Fargate (Docker image from `../server`), RDS, Redis |
| **DNS / TLS** | ACM in the app account; validation + alias via assume-role into the DNS account |
| **Config** | Resource IDs loaded from `../server/.env` (`lib/env.ts`) |

App container: entrypoint runs Prisma generate/migrate, then `node ./bin/www`. ALB health check is `/ping`; `/health` reports DB/Redis.

## Prerequisites

1. AWS SSO credentials for the app account (`aws sts get-caller-identity`).
2. Bootstrap once per account/region: `npx cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_REGION`
3. `../server/.env` populated (see CDK identifiers at the bottom of that file).
4. From this directory: `npm i`

## Commands

```bash
cd cdk
npm run build          # type-check
npx cdk synth          # CloudFormation template
npx cdk diff           # pending changes vs deployed stack
npx cdk deploy YourBandSucksBackend --require-approval never
npx cdk destroy YourBandSucksBackend   # tear down (termination protection may need disabling first)
```

Useful flags: `--progress events`, `--exclusively` (single stack).

## Deploy lifecycle

1. **Synth** — CDK loads `server/.env`, builds the app construct tree, packages the server Docker asset (linux/amd64).
2. **Diff** — Review creates/updates; confirm S3/Cognito are not destroyed (imports only).
3. **Deploy** — CloudFormation creates/updates VPC → RDS/Redis → ALB/cert/DNS → ECS service. First RDS create is the long pole (~10–15+ min).
4. **Rollout** — New task definition ships a new image; ECS drains old tasks. Entry point migrates DB before listen.
5. **Verify** — `/ping` and `/health`.

RDS uses a custom parameter group with `rds.force_ssl=0` so the app can connect without `sslmode` in the URL. Changing that parameter may require a reboot.

## Layout

- `bin/cdk.ts` — app entry, account/region
- `lib/main-backend-stack.ts` — stack wiring
- `lib/s3.ts` / `lib/cognito.ts` — imports
- `lib/networking.ts` — VPC, data stores, Fargate
- `lib/cross-account-dns.ts` — ACM + Route53 alias helpers
- `lambda/cross-account-dns/` — custom resource handlers
