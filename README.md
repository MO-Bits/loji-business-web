# Loji Business Web

Loji Business is a responsive hospitality operations application built with Next.js, MUI and Supabase.

## Requirements

- Node.js 20.9 or newer
- A Supabase project
- Google Maps and Places API keys for property location selection

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add your Supabase and Google API values.
3. Install and run the application:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

```bash
npm run lint
npm run build
```

## Vercel deployment

Import this repository in Vercel, configure the variables from `.env.example`, and deploy using the default Next.js settings.

The production application uses `https://business.loji.co.tz`.
