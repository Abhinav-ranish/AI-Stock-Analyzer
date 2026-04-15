# Architecture Decisions

> Key decisions for the modernization of AI Stock Analyzer.

---

## Decision 1: Switch from Groq to Google Gemini API

**Status:** Decided (2026-04-14)

**Context:** The backend currently uses Groq SDK (Python) with `meta-llama/llama-4-scout-17b-16e-instruct` for AI analysis. As part of the Python-to-TS migration, we need a TS-native LLM provider.

**Decision:** Use Google Gemini API instead of Groq.

**Models:**
- **Text/Analysis:** `gemini-2.5-flash` — fast, cheap, strong reasoning for stock analysis prompts
- **Embeddings:** `gemini-embedding-2` — for vector similarity / peer stock discovery

**Rationale:**
- First-class TS/JS SDK (`@google/generative-ai`)
- Single provider for both LLM completions and embeddings simplifies the stack
- Gemini 2.5 Flash is fast and cost-effective for structured analysis tasks
- Gemini Embedding 2 is purpose-built for semantic similarity search
- Generous free tier

**Consequences:**
- Prompt format may need minor adjustments for Gemini vs Llama output style
- The `peer_utils.py` LLM call for similar stocks can be replaced with actual vector similarity once embeddings are set up
- `ai_summary.py` and `prompt_builder.py` logic ports to TS with Gemini SDK calls

---

## Decision 2: Full Vercel Deployment (eliminate Python backend)

**Status:** Decided (2026-04-14)

**Context:** The app currently requires two deployments: a Python Flask backend (hosted separately) and a Next.js frontend (Vercel-ready). Every Python dependency has a TS equivalent.

**Decision:** Port all backend logic to Next.js Route Handlers and deploy entirely on Vercel.

**Target architecture:**
```
stock-analyzer/              (Next.js 15 on Vercel)
  src/app/api/
    analyze/route.ts         # Main analysis endpoint
    fundamentals/route.ts    # yahoo-finance2
    technical/route.ts       # TS indicators
    insider/route.ts         # Finnhub REST
    news/route.ts            # NewsAPI REST
    search/route.ts          # Yahoo ticker search (existing)
  src/lib/
    indicators.ts            # RSI, MACD, SMA, ADX math
    scoring.ts               # Score algorithms
    prompt.ts                # Prompt builder
    supabase.ts              # Supabase client
    gemini.ts                # Gemini API client
```

**Python dependency replacements:**
| Python | TS Replacement |
|---|---|
| `yfinance` | `yahoo-finance2` |
| `pandas`/`numpy` (indicators) | Plain JS math |
| `ta` (ADX) | `technicalindicators` npm |
| `textblob` | Eliminate -- let the LLM handle sentiment |
| `groq` SDK | `@google/generative-ai` (Gemini 2.5 Flash) |
| `pytrends` | Eliminate -- unreliable, rate-limited |
| `beautifulsoup4` (scraping) | Eliminate -- brittle |
| `finnhub-python` | Direct REST calls via `fetch` |
| `supabase` (Python) | `@supabase/supabase-js` |
| `bcrypt` | Eliminated by Supabase Auth |
| `newsapi` | Direct REST calls via `fetch` |

---

## Decision 3: Bring back ML features via Supabase pgvector

**Status:** Planned (Phase 4)

**Context:** The original `stockbot.py` had a RAG pipeline using FAISS + SentenceTransformer for finding similar stocks via vector embeddings. This was dropped during the backend rewrite. The concept was sound but the implementation had issues (ephemeral storage, bad embedding inputs, local GPU dependency).

**Decision:** Rebuild the vector similarity feature using Supabase pgvector + Gemini Embedding 2.

**How it works:**
1. When a stock is analyzed, build a text description of its financial profile
2. Call Gemini Embedding 2 API to get a vector
3. Upsert the vector into Supabase `stock_embeddings` table
4. Query for the 5 most similar stocks using pgvector cosine similarity
5. Include peer context in the LLM prompt for richer analysis

**Improvements over original:**
- Persistent storage (not wiped on restart)
- Deduplication via unique constraint
- No cold start (no local model loading)
- Better embeddings (purpose-built API vs encoding numbers as text)
- Runs on Vercel (no GPU required)

---

## Decision 4: Replace custom auth with Supabase Auth

**Status:** Decided (Phase 2)

**Context:** Current auth uses custom bcrypt password hashing with the Supabase row UUID returned as a bearer token. No session expiry, no JWT signing, passwords are optional.

**Decision:** Use Supabase Auth (built-in, free).

**What this eliminates:**
- `backend/blueprints/auth.py` (entire file)
- Custom `hash_pw` / `verify_pw` functions
- UUID-as-token pattern
- The `users` table password column
- The `get_user_from_token()` function in `portfolio.py`

**What this provides:**
- JWT with proper signing and expiry
- Password reset flow
- OAuth providers (Google, GitHub, etc.) if desired later
- Row-level security in Supabase
- Client-side auth via `@supabase/supabase-js`
