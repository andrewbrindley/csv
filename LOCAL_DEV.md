# Running Locally

This app deploys to AWS (ECS + CloudFront + DocumentDB), but for local development
you don't need any AWS resources. The active import flow runs synchronously
through Flask, and the in-process job worker polls MongoDB — not SQS.

## Prerequisites

- Python 3.11+
- Node.js 18+
- A MongoDB connection string (Atlas or local)
- An Auth0 application (SPA) with `http://localhost:3000` whitelisted under
  Allowed Callback URLs, Allowed Logout URLs, and Allowed Web Origins
- An Auth0 API with an identifier (audience), e.g. `https://csv-import-api/`
- An OpenAI API key

## One-time setup

1. **Backend env**
   ```bash
   cp flask/.env.example flask/.env
   # Edit flask/.env with your real values
   ```

2. **Frontend env**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your real values
   ```

3. **Install dependencies**
   ```bash
   # Frontend
   npm install

   # Backend
   cd flask
   pip install -r requirements.txt
   cd ..
   ```

## Run

In two terminals:

```bash
# Terminal 1 — backend
cd flask
python main.py
# Listens on http://localhost:5000
```

```bash
# Terminal 2 — frontend
npm start
# Opens http://localhost:3000
```

The Flask process spawns its own MongoDB-polling worker thread (see
`processing_worker.py`), so import jobs are processed without any external queue.

## What about AWS?

`flask/aws_services.py` and `flask/worker.py` (SQS poller) are only used in
production for an alternative direct-to-S3 upload path. They are **not**
exercised by the wizard UI today. Locally:

- `aws_services.py` is imported lazily inside two unused endpoints
  (`/api/import/presign`, `/api/import/enqueue-aws`). Boot is unaffected.
- `worker.py` is **not run** locally. Don't start it. It will fail without
  `SQS_QUEUE_URL`, which is intentional.

When deploying to AWS, the ECS task definition supplies `AWS_REGION`,
`S3_UPLOAD_BUCKET`, and `SQS_QUEUE_URL` — and the existing GitHub Actions
pipeline keeps working unchanged.

## Optional: Docker

`docker-compose.yml` has been simplified to just the Flask API:

```bash
docker compose up flask-api
```

Run the frontend natively (`npm start`) — there's no frontend Dockerfile and
hot-reload-in-Docker is more friction than it's worth for CRA.

## Auth0 dashboard checklist

Make sure your Auth0 SPA application has:

- **Allowed Callback URLs**: `http://localhost:3000`
- **Allowed Logout URLs**: `http://localhost:3000`
- **Allowed Web Origins**: `http://localhost:3000`

And your Auth0 API has:

- **Identifier (audience)**: matches `REACT_APP_AUTH0_AUDIENCE` in `.env.local`
  and `AUTH0_AUDIENCE` in `flask/.env`

## Troubleshooting

- **`STARTUP: Attempting connection to Database: …` followed by silence**
  Mongo connection is hanging. Check the URI, that your IP is whitelisted in
  Atlas, and that the password is URL-encoded (`$` → `%24`, etc).

- **CORS errors in the browser**
  Confirm Flask is on `http://localhost:5000` and `REACT_APP_API_URL` in
  `.env.local` matches. CRA must be restarted after editing `.env.local`.

- **Auth0 redirect loop or "Callback URL mismatch"**
  Recheck the Auth0 dashboard URLs above.

- **`AWS credentials not found` or boto3 errors**
  You triggered one of the unused AWS endpoints (`/api/import/presign` or
  `/api/import/enqueue-aws`), or you started `worker.py`. Don't run `worker.py`
  locally; the wizard doesn't use those endpoints.
