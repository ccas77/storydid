# StoryDid

A runnable MVP that mines public historical archives, groups promising records into story candidates, scores them, and produces source-backed research dossiers for YouTube and Facebook planning.

## What works

- Live Library of Congress newspaper search
- Live Internet Archive text search
- Daily rotating search queries
- OpenAI structured extraction into dossiers
- Evidence-linked Postgres storage
- Manual research button
- Vercel daily cron endpoint
- Empty states when research has not produced real records yet

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local`
3. Add an OpenAI API key and a Postgres connection string, such as Neon
4. Run `npm run db:push`
5. Run `npm run dev`

Open `http://localhost:3000`.

## Environment variables

- `OPENAI_API_KEY`: required for AI dossier generation
- `DATABASE_URL`: Postgres connection string; without it the UI shows empty states
- `CRON_SECRET`: protects `/api/cron/daily`
- `RESEARCH_MODEL`: defaults to `gpt-5-mini`

## Deploying on Vercel

Import the repository, configure the environment variables, run `npm run db:push` against the production database, and deploy. `vercel.json` runs the research scheduler every 15 minutes.

## Research safeguards

The model is instructed to use only returned archive records, label allegations properly, and attach selected archive record IDs to each dossier. The current MVP uses archive metadata and descriptions. A production version should add OCR file retrieval, page-level excerpts, YouTube competition checks, source clustering, and a human approval state before script generation.
