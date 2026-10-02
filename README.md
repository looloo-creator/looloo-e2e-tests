# Looloo E2E Tests

Playwright tests for the Looloo web app and API through the Kong-backed web
entrypoint.

## Run Locally

From the workspace root, start the Minikube app:

```bash
./looloo-deploy/scripts/start-app.sh
```

Then, from this repository:

```bash
npm ci
npx playwright install chromium
npm run test:chromium
```

Defaults use the web service at `http://localhost:18080` and API path
`http://localhost:18080/api`. Override `BASE_URL` and `API_BASE` in the ignored
`.env` file to test another deployment. A sanitized template is in
`.env.example`.

Authenticated tests use `/api/users/test-token`. The local development Helm
values enable this endpoint only with `NODE_ENV=development`; production values
keep it disabled. When the endpoint explicitly returns `404`, authenticated
journeys are skipped while the public login-page test still runs.

## GitHub Actions

The workflow runs against an existing deployment only when the repository
variable `BASE_URL` is configured. `API_BASE` is optional and defaults to
`${BASE_URL}/api`. The endpoint must be reachable from GitHub-hosted runners.
Authenticated journeys require an isolated non-production API with
`ENABLE_TEST_TOKEN=true`; never enable that flag in production.# Looloo E2E Tests

Playwright tests for the deployed Looloo web app and API.

## Run Against Local Minikube

Start the app from the workspace root:

```bash
./looloo-deploy/scripts/start-app.sh
```

The app chart's development values enable `/users/test-token` only in the
development environment. The route is disabled in production. From this
directory, install dependencies and run Chromium tests:

```bash
npm ci
npx playwright install chromium
npm run test:chromium
```

The default URLs route browser traffic and API requests through the local web
Service and Kong:

```text
BASE_URL=http://localhost:18080
API_BASE=http://localhost:18080/api
```

Override them in an ignored `.env` file when testing another deployment. Never
put credentials in this repository.

## GitHub Actions

The workflow runs only when the repository variable `BASE_URL` is configured;
`API_BASE` is optional and defaults to `${BASE_URL}/api`. Configure these to
point at an E2E deployment reachable from the GitHub-hosted runner. The target
API must run in development mode with `ENABLE_TEST_TOKEN=true` for authenticated
journeys; do not enable that endpoint in production.