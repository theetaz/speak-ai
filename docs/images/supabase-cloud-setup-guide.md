# Setting Up Supabase Cloud for the Realtime English Learning Assistant

> Step-by-step guide to create a Supabase Cloud project, run migrations, deploy edge functions, and configure all environment variables across the project.

---

## Prerequisites

- A [Supabase](https://supabase.com) account (free tier works)
- Supabase CLI installed locally
- Project codebase cloned and ready

---

## Step 1: Install the Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# npm (any OS)
npm install -g supabase

# Verify
supabase --version
```

---

## Step 2: Create a New Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in:
   - **Name:** `realtime-english-learning-assistant` (or your preferred name)
   - **Database Password:** generate a strong password and **save it securely**
   - **Region:** choose the closest region to your EC2 instance (e.g. `US East` if your EC2 is in `us-east-1`)
4. Click **"Create new project"**
5. Wait for the project to finish provisioning (~2 minutes)

---

## Step 3: Collect Your Project Credentials

Once the project is ready, go to **Project Settings → API Keys** and note down:

| Credential | Where to Find | Used By |
| --- | --- | --- |
| **Project URL** | `Settings → General → Project URL` | Mobile app, Agent, Edge Functions |
| **Publishable key** | `Settings → API Keys → Publishable key` (format: `sb_publishable_...`) | Mobile app |
| **Secret key** | `Settings → API Keys → Secret keys` (format: `sb_secret_...`) | Agent backend only |
| **Project ref** | The subdomain in your URL (e.g. `abcdefghijk` from `https://abcdefghijk.supabase.co`) | Supabase CLI linking |

> **Note on new API keys:** Supabase has transitioned from legacy `anon`/`service_role` JWT-based keys to new **publishable** (`sb_publishable_...`) and **secret** (`sb_secret_...`) keys. The new keys allow independent rotation without affecting each other. Both old and new keys work during the transition period.

> **Security:** The secret key (`sb_secret_...`) bypasses Row Level Security. Never expose it in client-side code or mobile apps. Only use it in the agent backend.

---

## Step 4: Link Your Local Project to Supabase Cloud

```bash
cd /path/to/realtime-english-learning-assistent

supabase login
```

This opens a browser for authentication. After logging in:

```bash
supabase link --project-ref <your-project-ref>
```

When prompted, enter the **database password** you set in Step 2.

Verify the link:

```bash
supabase projects list
```

---

## Step 5: Run Database Migrations

Push the migration file (`supabase/migrations/001_initial_schema.sql`) to your cloud project:

```bash
supabase db push
```

This creates all the tables, indexes, and RLS policies:

| Table | Purpose |
| --- | --- |
| `profiles` | User profiles (extends `auth.users`) |
| `conversations` | Conversation sessions with LiveKit room references |
| `messages` | Transcript messages per conversation |
| `conversation_feedback` | AI-generated grammar/pronunciation/vocabulary feedback |
| `daily_progress` | Aggregated daily learning stats |

**Verify in the dashboard:** Go to **Table Editor** in the Supabase dashboard and confirm all 5 tables exist with their columns.

---

## Step 6: Deploy the Edge Function

The project has one edge function (`livekit-token`) that generates LiveKit access tokens for authenticated users.

### Set Edge Function Secrets

These secrets are required by the `livekit-token` edge function:

```bash
supabase secrets set LIVEKIT_API_KEY=<your-livekit-api-key>
supabase secrets set LIVEKIT_API_SECRET=<your-livekit-api-secret>
supabase secrets set LIVEKIT_URL=wss://livekit.yourdomain.com
```

> `SUPABASE_URL` and `SUPABASE_ANON_KEY` are automatically injected into edge functions by Supabase — you do **not** need to set them manually.

Verify secrets are set:

```bash
supabase secrets list
```

### Deploy the Function

Since we use the new publishable key (`sb_publishable_...`) which is not JWT-based, deploy with `--no-verify-jwt`. The function handles user authentication internally via `supabase.auth.getUser()`:

```bash
supabase functions deploy livekit-token --no-verify-jwt
```

### Verify the Deployment

Go to **Edge Functions** in the Supabase dashboard. You should see `livekit-token` listed as deployed.

Quick test (should return an auth error, confirming the function is reachable):

```bash
curl -X POST \
  https://<your-project-ref>.supabase.co/functions/v1/livekit-token \
  -H "Content-Type: application/json" \
  -H "apikey: <your-publishable-key>" \
  -H "Authorization: Bearer <a-valid-user-access-token>" \
  -d '{"conversation_id": "test"}'
```

Expected response: `{"error":"Unauthorized"}` — this confirms the function is deployed and running (it rejects because there's no valid user session).

---

## Step 7: Configure Authentication

### Enable Email/Password Auth (Default)

1. Go to **Authentication → Providers** in the dashboard
2. Ensure **Email** provider is enabled
3. Recommended settings:
   - **Enable email confirmations:** OFF for development, ON for production
   - **Enable new user sign ups:** ON

### (Optional) Configure Email Templates

For production, set up a proper SMTP provider:

1. Go to **Project Settings → Authentication → SMTP Settings**
2. Enable **Custom SMTP**
3. Add your SMTP credentials (e.g. SendGrid, Resend, Mailgun)

---

## Step 8: Update Project Environment Variables

### Mobile App (`mobile/.env`)

Create `mobile/.env` from the example:

```bash
cp mobile/.env.example mobile/.env
```

Update with your Supabase Cloud values:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
```

### Agent Backend (`agent/.env.local`)

Update with both Supabase and LiveKit credentials:

```env
LIVEKIT_API_KEY=<your-livekit-api-key>
LIVEKIT_API_SECRET=<your-livekit-api-secret>
LIVEKIT_URL=wss://livekit.yourdomain.com
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SECRET_KEY=<your-secret-key>
```

---

## Step 9: Verify the Full Setup

### 1. Check Database

```bash
# List tables via CLI
supabase db execute "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"
```

Expected output: `profiles`, `conversations`, `messages`, `conversation_feedback`, `daily_progress`.

### 2. Check Edge Function

```bash
supabase functions list
```

Should show `livekit-token` with status `Active`.

### 3. Check Secrets

```bash
supabase secrets list
```

Should include: `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`.

### 4. Test User Signup (Optional)

```bash
curl -X POST \
  https://<your-project-ref>.supabase.co/auth/v1/signup \
  -H "apikey: <your-publishable-key>" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpassword123"}'
```

A successful response returns a `user` object with an `id`.

---

## Architecture Overview

```
┌───────────────┐         ┌──────────────────────────────────┐
│  Mobile App   │         │        Supabase Cloud            │
│  (Expo/RN)    │────────▶│                                  │
│               │         │  ┌────────────┐  ┌────────────┐  │
│  Uses:        │         │  │   Auth     │  │  Database  │  │
│  • SUPABASE_  │         │  │ (email/pw) │  │ (Postgres) │  │
│    URL        │         │  └────────────┘  └────────────┘  │
│  • SUPABASE_  │         │        │               │         │
│    PUBLISH-   │         │        ▼               ▼         │
│    ABLE_KEY   │
│               │         │  ┌─────────────────────────┐     │
│               │────────▶│  │  Edge Function          │     │
│               │         │  │  livekit-token           │     │
│               │         │  │                         │     │
│               │         │  │  Reads: LIVEKIT_API_KEY │     │
│               │         │  │         LIVEKIT_API_    │     │
│               │         │  │         SECRET          │     │
│               │         │  │         LIVEKIT_URL     │     │
│               │         │  └────────────┬────────────┘     │
│               │         └───────────────│──────────────────┘
│               │                         │
│               │◀────── {url, token} ────┘
│               │
│               │         ┌──────────────────────────────────┐
│               │────────▶│     Self-Hosted LiveKit          │
│  Connects via │  wss:// │     (EC2 + Nginx + Docker)       │
│  LiveKit SDK  │         │                                  │
└───────────────┘         └──────────────────────────────────┘

┌───────────────┐         ┌──────────────────────────────────┐
│  Agent        │────────▶│     Self-Hosted LiveKit          │
│  (Node.js)    │  wss:// │     (EC2 + Nginx + Docker)       │
│               │         └──────────────────────────────────┘
│  Uses:        │
│  • LIVEKIT_*  │         ┌──────────────────────────────────┐
│  • SUPABASE_  │────────▶│        Supabase Cloud            │
│    URL        │         │  (saves transcripts, feedback,   │
│  • SUPABASE_  │         │   progress via secret key)       │
│    SECRET_    │         └──────────────────────────────────┘
│    KEY        │
└───────────────┘
```

---

## Environment Variable Reference

| Variable | Value | Used In |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | `mobile/.env` |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key from dashboard (`sb_publishable_...`) | `mobile/.env` |
| `SUPABASE_URL` | `https://<ref>.supabase.co` | `agent/.env.local` |
| `SUPABASE_SECRET_KEY` | Secret key from dashboard (`sb_secret_...`) | `agent/.env.local` |
| `LIVEKIT_API_KEY` | Your LiveKit API key | `agent/.env.local` + Supabase secrets |
| `LIVEKIT_API_SECRET` | Your LiveKit API secret | `agent/.env.local` + Supabase secrets |
| `LIVEKIT_URL` | `wss://livekit.yourdomain.com` | `agent/.env.local` + Supabase secrets |

---

## Troubleshooting

| Issue | Solution |
| --- | --- |
| `supabase db push` fails | Ensure you ran `supabase link` first and the database password is correct |
| Edge function returns 500 | Check logs: `supabase functions logs livekit-token` |
| `Unauthorized` from edge function | Ensure the mobile app sends a valid auth session token |
| Secrets not taking effect | Redeploy the function: `supabase functions deploy livekit-token --no-verify-jwt` |
| CORS errors from mobile app | The edge function already sets `Access-Control-Allow-Origin: *` — if issues persist, check the Supabase dashboard under **Edge Functions → Settings** |
| RLS blocking queries | The agent uses the secret key which bypasses RLS. For user queries, ensure the user is authenticated and owns the data |
| Migration conflicts | If tables already exist: `supabase db reset` (warning: drops all data) |

---

## Useful Commands Reference

```bash
# Check project status
supabase status

# View edge function logs (live tail)
supabase functions logs livekit-token --tail

# Re-deploy edge function after changes
supabase functions deploy livekit-token --no-verify-jwt

# Push new migrations
supabase db push

# Generate types for TypeScript (optional)
supabase gen types typescript --linked > src/types/database.ts

# Reset remote database (DESTRUCTIVE — drops all data)
supabase db reset --linked
```
