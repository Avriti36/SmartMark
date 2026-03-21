# AI Bookmark Saver

Save any public link — YouTube, Instagram, Twitter/X, or any website — and search your saved bookmarks using **natural language**. Powered by Gemini, Grok, OpenAI Embeddings, and Pinecone.

---

## What makes it different

Regular bookmark managers match keywords. This one understands **meaning**. Save a TED video about habit-breaking techniques and search for *"that approach where you replace a bad habit with a trigger"* — it surfaces the right bookmark even if those exact words never appear in the title.

---

## Architecture Overview

```
User pastes URL
      │
      ▼
POST /api/bookmarks
      │
      ├── normaliseUrl()
      │
      ├─ Cache HIT (ProcessedContent exists & done)
      │     └── Create Bookmark → enqueueVectorUpsert → return immediately
      │
      └─ Cache MISS
            └── Create ProcessedContent + Bookmark → enqueueProcessContent → return
                      │
                      ▼
              BullMQ Worker (separate process)
                      │
              ┌───────┴──────────┐
          YouTube           Instagram        Twitter/X          Web
          Gemini            Apify + Gemini   xAI Grok           Defuddle + Gemini
              └───────┬──────────┘
                      ▼
              OpenAI Embeddings (1536-dim)
                      │
              Postgres (ProcessedContent) ←── stored forever
                      │
              Pinecone (one vector per Bookmark, per user)
```

### Two-table data model

| Table | Scope | Contains |
|-------|-------|----------|
| `ProcessedContent` | Global — one per URL | AI output, embedding values, thumbnail URL |
| `Bookmark` | Per-user | Personal note, collection, category override, status |

Processing happens **once per URL globally**. If 100 users save the same YouTube video, only the first triggers an AI job. Everyone else gets an instant result.

---

## Tech Stack

| Layer | Tool |
|-------|------|
| Framework | Next.js 14 (App Router) |
| ORM | Prisma + PostgreSQL |
| Queue | BullMQ + Redis |
| Vector DB | Pinecone |
| AI — YouTube | Google Gemini (native video understanding) |
| AI — Instagram | Apify scraper → Gemini |
| AI — Twitter/X | xAI Grok (`x_search` tool) |
| AI — Web | Defuddle/Readability + Gemini |
| Embeddings | OpenAI `text-embedding-3-small` |
| Storage | AWS S3 / Cloudflare R2 |
| Auth | NextAuth.js (Google OAuth + credentials) |

---

## Quick Start

### Prerequisites

- Node.js 20+
- Docker (for Postgres and Redis)
- Pinecone account (free tier works)

### 1. Clone and install

```bash
git clone <repo>
cd ai-bookmark-saver
npm install
```

### 2. Start local services

```bash
docker compose up -d
```

This starts Postgres on port 5432 and Redis on port 6379.

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in these required keys:

| Variable | Where to get it |
|----------|----------------|
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/) |
| `XAI_API_KEY` | [xAI Console](https://console.x.ai/) |
| `OPENAI_API_KEY` | [OpenAI Platform](https://platform.openai.com/) |
| `PINECONE_API_KEY` | [Pinecone Console](https://app.pinecone.io/) |
| `APIFY_API_TOKEN` | [Apify Console](https://console.apify.com/) |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_S3_BUCKET` | AWS Console |

### 4. Set up Pinecone index

In the Pinecone console, create an index named `bookmarks` with:
- Dimensions: `1536`
- Metric: `cosine`
- Cloud: `aws`, Region: `us-east-1`

### 5. Run database migrations

```bash
npm run db:migrate
```

### 6. Start the app

**Terminal 1 — Next.js dev server:**
```bash
npm run dev
```

**Terminal 2 — BullMQ worker (must be running for bookmarks to process):**
```bash
npm run worker
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
ai-bookmark-saver/
├── app/
│   ├── (auth)/login/           — Login page
│   ├── (dashboard)/            — Protected pages
│   │   ├── layout.tsx          — Sidebar layout
│   │   ├── page.tsx            — All bookmarks grid
│   │   ├── search/             — Semantic search results
│   │   └── collections/[id]/   — Single collection view
│   └── api/
│       ├── auth/[...nextauth]/ — NextAuth handlers
│       ├── bookmarks/          — Bookmark CRUD + search
│       └── collections/        — Collection CRUD
├── components/
│   ├── BookmarkCard.tsx         — Bookmark display card
│   ├── BookmarkGrid.tsx         — Responsive grid with loading states
│   ├── AddBookmarkForm.tsx      — URL input with note + collection picker
│   ├── ProcessingCard.tsx       — Skeleton card with status polling
│   ├── SearchBar.tsx            — Debounced semantic search input
│   ├── CategoryFilter.tsx       — Filter pills
│   ├── CollectionSidebar.tsx    — Left nav with collection management
│   └── CollectionPicker.tsx     — Dropdown for assigning bookmarks
├── lib/
│   ├── db.ts                   — Prisma singleton
│   ├── queue.ts                — BullMQ queue helpers
│   ├── embeddings.ts           — OpenAI embedding helper
│   ├── pinecone.ts             — Pinecone upsert/search/delete
│   ├── storage.ts              — S3/R2 upload helpers
│   ├── auth.ts                 — NextAuth session helper
│   ├── types.ts                — Shared BookmarkAIResult type
│   └── extractors/
│       ├── youtube.ts          — Gemini native video analysis
│       ├── twitter.ts          — xAI Grok x_search
│       ├── instagram.ts        — Apify + Gemini image/video
│       └── web.ts              — Defuddle/Readability + Gemini
├── worker/
│   ├── index.ts                — BullMQ worker entry point
│   └── processor.ts            — Platform router + DB/Pinecone updates
└── prisma/
    └── schema.prisma           — Database schema
```

---

## Supported Link Types

| Platform | Detection | AI Engine | Notes |
|----------|-----------|-----------|-------|
| YouTube | `youtube.com/watch`, `youtu.be/`, `youtube.com/shorts/` | Gemini (native video) | Falls back to Data API v3 for very long videos |
| Twitter/X | `twitter.com/` or `x.com/` | xAI Grok + `x_search` | Real-time X access, image & video understanding |
| Instagram | `instagram.com/p/`, `/reel/`, `/tv/` | Apify → Gemini | Downloads media before CDN expiry |
| Web | Everything else | Defuddle/Readability → Gemini | Extracts article text, falls back to OG tags |

---

## How Semantic Search Works

1. When you save a bookmark, an AI produces a `searchable_context` field — a dense paragraph of named concepts, techniques, people, and terminology
2. The text `title + summary + searchable_context` is embedded into a 1536-dimensional vector via OpenAI
3. Each user's bookmark gets its own Pinecone vector (so search is user-scoped)
4. When you search, your query is embedded the same way and cosine similarity finds the closest bookmarks

---

## Key Design Decisions

**Why one Pinecone vector per Bookmark (not per URL)?**
Pinecone metadata (`userId`, `collectionId`) is per-vector. Scoped search requires each user to have their own vector.

**Why store `embeddingValues` in Postgres?**
Cache-hit bookmarks need a Pinecone vector without re-calling OpenAI. Storing the floats allows reuse.

**Why BullMQ instead of serverless functions?**
Content extraction + AI can take 10–60 seconds. Serverless functions time out. The worker is always-on.

---

## Scripts

```bash
npm run dev          # Next.js dev server
npm run worker       # BullMQ worker (run in a second terminal)
npm run build        # Production build
npm run db:migrate   # Run Prisma migrations
npm run db:studio    # Open Prisma Studio
```
