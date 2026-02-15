# Horizon Energy South — Admin Dashboard

Next.js admin companion to the iOS field inspection app. Manages jobs, reviews photos, tracks rebates, and exports training data.

## Setup

### 1. Install dependencies

```bash
cd web
npm install
```

### 2. Firebase credentials

Copy the example env file and fill in your values:

```bash
cp .env.local.example .env.local
```

**Server-side (Admin SDK):**
- Go to Firebase Console → Project Settings → Service Accounts
- Click "Generate new private key"
- Copy `project_id`, `client_email`, and `private_key` into `.env.local`

**Client-side (Auth):**
- Go to Firebase Console → Project Settings → General → Your apps
- Copy `apiKey`, `authDomain`, and `projectId`

### 3. Create an admin user

In Firebase Console → Authentication → Users → Add user with email/password.

Or via Firebase Admin SDK:

```js
const admin = require('firebase-admin');
admin.auth().createUser({
  email: 'admin@horizonenergy.com',
  password: 'your-secure-password',
});
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Set root directory to `web`
4. Add all environment variables from `.env.local`
5. Deploy

## Features

| Page | Description |
|------|-------------|
| **Dashboard** | Metrics cards, charts (jobs over time, issues by category, rebate breakdown), recent activity |
| **Jobs** | Searchable/filterable table with pagination, bulk delete, CSV export |
| **Job Detail** | Hero card, photo lightbox, stage/rebate editing, dataset value breakdown |
| **Photos** | Grid of all photos across jobs, filterable by type and severity, lightbox |
| **Analytics** | Charts for stages, issues, photos trend, top inspectors, materials |
| **Export** | JSONL or CSV export with rebate filter and PII anonymization |
| **Settings** | Firebase status, inspector list, environment check |

## Tech Stack

- Next.js 16 (App Router, TypeScript)
- Firebase Admin SDK (server) + Firebase Client SDK (auth)
- Tailwind CSS
- Recharts
- Lucide Icons
