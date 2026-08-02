# 10Trials Admin

Standalone role-based operations dashboard for 10Trials. It uses independent
backend-managed administrator records and sessions. Administrators can start
sign-in with their admin password or a verified Google identity, but both paths
must finish with a one-time code delivered to the administrator email through
Brevo. The same email can exist in both account stores without sharing
passwords, sessions, roles, or permissions.

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

The admin development server uses `http://localhost:3001` so it can run beside
the learner frontend on port 3000.

Before the first sign-in, provision an owner from the backend repository:

```bash
.venv/bin/python scripts/provision_admin.py \
  --email owner@example.com \
  --display-name "Root Owner" \
  --role owner
```

The command prompts for the initial owner password. Later administrators are
created from the Administrators screen with a name, email, password, and role.

Add the admin development and production origins to the backend
`CORS_ORIGINS`. Do not change the backend `FRONTEND_URL`; it remains the learner
application URL for billing callbacks and transactional email links.

For Google sign-in, create a Google Identity Services Web client and set its
client ID as `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in this project and
`ADMIN_GOOGLE_CLIENT_ID` in the backend. Add the admin localhost and production
origins as authorized JavaScript origins. This public client ID is compiled
into the browser bundle; the backend still verifies every returned ID token.

The backend also requires Brevo delivery and a private `ADMIN_OTP_SECRET` of at
least 32 characters. The secret belongs only in the backend environment and
must never use a `NEXT_PUBLIC_` name.

## Verification

```bash
npm run lint
npm run typecheck
npm run build
```
