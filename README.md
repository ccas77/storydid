# StoryDid

A runnable autonomous research pipeline that mines public historical archives, filters and researches promising leads, and produces source-backed story scripts for YouTube and Facebook planning.

## What works

- Live Library of Congress newspaper search
- Live Internet Archive text search
- Daily rotating search queries
- OpenAI structured extraction into dossiers
- OpenAI story generation grounded in saved dossier sources, guaranteed to reach a publish-ready 2000+ word article
- Evidence-linked Postgres storage
- Research brief intake with autonomous stage advancement
- Vercel cron endpoint for scheduled research work
- Empty states when research has not produced real records yet

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local`
3. Add an OpenAI API key and a Postgres connection string, such as Neon
4. Run `npm run db:push`
5. Check runtime configuration: `npm run research:diagnose`
6. Run one research stage from the terminal: `npm run research:run`
7. Run the app: `npm run dev`

Open `http://localhost:3000`.

## Environment variables

- `OPENAI_API_KEY`: required for AI dossier generation
- `DATABASE_URL`: Postgres connection string; without it the UI shows empty states
- `CRON_SECRET`: protects `/api/cron/daily`
- `RESEARCH_MODEL`: defaults to `gpt-5-mini`
- `STORY_MODEL`: optional override for story script generation

## Deploying on Vercel

Import the repository, configure the environment variables, run `npm run db:push` against the production database, and deploy. `vercel.json` runs the research scheduler every 15 minutes.

To verify a deployment, confirm `npm run research:diagnose` reports `canRunPipeline: true`, then trigger `/api/research/run` or `/api/cron/daily` with `Authorization: Bearer $CRON_SECRET` until a queued brief reaches a generated story.

## Research safeguards

The model is instructed to use only returned archive records, label allegations properly, and attach selected archive record IDs to each dossier and story segment. The current MVP uses archive metadata and descriptions. A production version should add OCR file retrieval, page-level excerpts, YouTube competition checks, stronger source clustering, and editorial export formats.

## Story generation reliability

Story generation is designed to always finish a publish-ready article rather than fail when a single model call comes back short:

- The generator asks for a long-form article, runs with a 120s timeout and automatic retries, and then enters an expansion loop that keeps requesting additional source-grounded segments until the article clears the 2000-word target. Appending segments only ever increases length, so it converges instead of hard-failing at 2000 words.
- Every readiness-approved lead now produces a dossier and a generated story: the dossier step no longer silently drops approved leads, and story creation always runs the generator.
- A story counts as "completed" once its generated, source-cited script is ready and long enough. A finished article is never hidden behind pre-script heuristics, and its detail page always renders.
