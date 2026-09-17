# Fawad Fabrics — AI Try-On Survey

A mobile-friendly survey form built with **Next.js 14** (App Router, TypeScript, Tailwind CSS) and **Supabase**. One person fills out the survey on a shared screen for everyone at the table.

---

## 1 — Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free project (or use an existing one).
2. Open the **SQL Editor** (left sidebar → SQL Editor).
3. Paste the contents of [`supabase_schema.sql`](supabase_schema.sql) and click **Run**.
   This creates the `survey_responses` table with RLS enabled and an anonymous-insert policy.

## 2 — Get your environment variables

In your Supabase project dashboard:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Settings → API → Project URL** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Settings → API → Project API keys → `anon` / `public`** |

Copy `.env.local.example` to `.env.local` and fill in both values:

```bash
cp .env.local.example .env.local
```

## 3 — Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your phone or browser.

## 4 — Deploy to Vercel

1. Push this repo to GitHub (public or private).
2. Go to [vercel.com/new](https://vercel.com/new) and **Import** the repository.
3. In the Vercel project **Settings → Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**. Vercel auto-detects Next.js — no extra config needed.

> **Tip:** Every push to `main` triggers a new deployment automatically.

---

## Project structure

```
app/
  layout.tsx          Root layout (metadata, global CSS)
  page.tsx            Renders <SurveyForm />
  globals.css         Tailwind directives + base styles
components/
  SurveyForm.tsx      Main survey form component
lib/
  questions/index.ts  Survey questions (edit this to change the survey)
  supabaseClient.ts   Supabase browser client
types/
  questions.ts        TypeScript types for Question / QuestionOption
supabase_schema.sql   SQL to create the survey_responses table
```

## Editing questions

Open `lib/questions/index.ts` and add, remove, or reorder questions.
The form automatically renders the right input type for each question.

Supported types: `yes_no`, `single_select`, `multi_select`, `text`, `rating`.
