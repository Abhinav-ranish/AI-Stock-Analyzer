# AI Stock Analyzer — Refactor Plan

> Generated: 2026-04-14
> Verdict: **Patch + Targeted Refactor** (not a rewrite)

---

## Phase 1: Quick Wins / Bug Fixes (1-2 days)

| Task | Impact | Difficulty | Risk |
|---|---|---|---|
| Fix XSS: replace `dangerouslySetInnerHTML` with `react-markdown` + `rehype-sanitize` | Critical security fix | Easy | Low |
| Fix render loop (`cleanTicker` logic in `stock-analyzer.tsx:123-124`) | Fixes UI freeze bug | Easy | Low |
| Restrict CORS to actual frontend domain (`app.py:17`) | Security fix | Easy | Low |
| Delete `stockbot.py`, `old-stock-ui/`, `Unused/`, root `requirements.txt`, root `package.json` | Removes ~500 lines dead code, removes PyTorch dep | Easy | None |
| Delete `lib/api.ts` and unused `renderMarkdown` function | Cleanup | Easy | None |
| Remove API key logging in `sentiment.py:145` | Security | Easy | None |
| Require password in auth registration (`auth.py:34`) | Security | Easy | Low |
| Use Next.js `<Link>` in Navbar instead of raw `<a>` tags | Fixes full-page reloads | Easy | None |

**Worth doing now? Yes -- all of these.**

---

## Phase 2: Architecture Cleanup (3-5 days)

| Task | Impact | Difficulty | Risk |
|---|---|---|---|
| Replace custom auth with Supabase Auth | Eliminates the worst security flaw | Medium | Medium -- needs frontend auth flow rewrite |
| Add error handling to all API calls (frontend) | Prevents silent failures | Medium | Low |
| Add response validation in `usePortfolio` | Fixes potential crash | Easy | Low |
| Extract data functions from Flask route handlers | Separates business logic from HTTP | Medium | Low |
| Add basic input validation (zod) on frontend forms | Security hardening | Easy | Low |

**Worth doing now? Yes.**

---

## Phase 3: Stack Modernization -- Python to TS (1-2 weeks)

| Task | Impact | Difficulty | Risk |
|---|---|---|---|
| Port technical indicators to TS (`indicators.ts`) | Enables Python removal | Medium | Medium -- need to verify math |
| Port scoring algorithms to TS | Enables Python removal | Easy | Low |
| Port prompt builder to TS | Enables Python removal | Easy | Low |
| Create `/api/analyze` Route Handler using `yahoo-finance2` + Gemini 2.5 Flash | Replaces entire Flask backend | Hard | Medium -- most complex migration |
| Port insider data to direct Finnhub REST call in TS | Small | Easy | Low |
| Port news/sentiment to TS | Small | Easy | Low |
| Remove Python backend entirely | Massive simplification | Easy (after above) | Low |
| Deploy fully on Vercel | Single deployment target | Easy | Low |

**Worth doing now? Yes, high ROI.**

---

## Phase 4: Optional Deeper Refactors

| Task | Impact | Difficulty | Risk |
|---|---|---|---|
| Add test suite (vitest) | Long-term maintainability | Medium | None |
| Add CI/CD (GitHub Actions) | Quality gates | Easy | None |
| Add rate limiting on API routes | Security | Easy | Low |
| Add response caching for stock data (5-min TTL) | Performance, cost reduction | Medium | Low |
| Add OpenTelemetry / Vercel observability | Production monitoring | Medium | None |
| Streaming AI responses via Vercel AI SDK | Better UX (real-time output) | Medium | Low |
| Bring back ML features: vector embeddings + similarity search via Supabase pgvector | Richer analysis, peer stock discovery | Medium | Low |

**Worth doing now? Optional -- do after Phase 3.**

---

## ML Feature Revival Plan (Phase 4)

The original `stockbot.py` had a RAG pipeline (FAISS + SentenceTransformer + Ollama) for finding similar stocks via vector similarity. This was dropped when the backend was rewritten to use cloud APIs.

**Plan to bring it back in TS:**

| Original (Python) | TS Replacement |
|---|---|
| FAISS (in-memory vector index) | Supabase pgvector (persistent, queryable with SQL) |
| SentenceTransformer (local PyTorch model) | Gemini Embedding 2 API |
| VectorStore class (custom FAISS wrapper) | 3 lines of SQL: `SELECT * FROM stocks ORDER BY embedding <=> $1 LIMIT 5` |
| `store_stock_data()` | Route Handler: call embeddings API + Supabase upsert |
| `retrieve_similar_stocks()` | Supabase RPC with cosine similarity operator |
| Ollama (local LLM) | Gemini 2.5 Flash |

**Supabase setup needed:**

```sql
create extension if not exists vector;

create table stock_embeddings (
  id bigserial primary key,
  ticker text not null,
  embedding vector(3072),  -- matches Gemini Embedding 2 output size
  metadata jsonb,
  updated_at timestamptz default now(),
  unique(ticker)
);

create index on stock_embeddings using ivfflat (embedding vector_cosine_ops);
```

**Advantages over the original Python version:**
- Persistent (survives restarts)
- Deduplicated (unique constraint)
- No cold start (no loading a 90MB model)
- Runs on Vercel (just HTTP calls + SQL)
- Costs almost nothing
