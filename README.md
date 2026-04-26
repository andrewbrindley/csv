# ingestr

> Clean data, ready to ingest.

ingestr is a staging layer between messy customer CSVs and your API. It takes
inconsistent uploads — wrong headers, broken dates, missing required fields,
out-of-enum values — and turns them into validated, developer-ready records
your engineering team can ingest with confidence.

## Why

When SaaS customers onboard, their data is rarely clean. The "import script"
ends up being weeks of glue code, retry logic, error reporting, and audit
plumbing — all to get one CSV into one database. ingestr removes that work
from your team.

You don't replace anyone's database. You hand them:

- A predictable, validated payload
- A schema and contract their devs can implement once
- A clear delivery log
- Failed records and *why* they failed
- Sample handler code

## Highlights

- **Template-driven schemas** with PII flags, references, and enum validation
- **AI + algorithmic header mapping** with per-tenant alias learning
- **Selective AI cleaning** with strict per-request cost caps
- **Multi-tenant** with role-based access (Auth0)
- **Async ingestion** with full per-record audit logs and rollback
- **Webhooks** per template
- **API keys** + Swagger docs

## Architecture

- **Frontend:** React 19, styled-components, Auth0 SPA
- **Backend:** Flask 3, MongoDB / DocumentDB
- **Async:** in-process MongoDB-polling worker (and an alternative SQS path
  for AWS production)
- **Infra:** AWS ECS + CloudFront + DocumentDB, provisioned with Terraform
- **CI/CD:** GitHub Actions to ECS + S3

## Running locally

See [LOCAL_DEV.md](./LOCAL_DEV.md) for the full setup. Short version:

```bash
# Terminal 1 — backend
cd flask
pip install -r requirements.txt
cp .env.example .env  # fill in Mongo, Auth0, OpenAI
py main.py

# Terminal 2 — frontend
cp .env.example .env.local  # fill in Auth0
npm install
npm start
```

App: http://localhost:3000 — API: http://localhost:5000

## Deploying

The GitHub Actions workflow at `.github/workflows/deploy.yml` builds Docker
images, pushes them to ECR, force-deploys ECS services, and syncs the React
build to S3 behind CloudFront. AWS credentials and environment variables come
from the ECS task definition, not from `flask/.env`.
