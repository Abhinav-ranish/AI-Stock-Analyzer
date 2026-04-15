# Top 10 Highest ROI Fixes

> Ordered by impact-to-effort ratio. Do these first.

---

### 1. Fix XSS vulnerability
- **File:** `stock-analyzer/src/components/stock-analyzer.tsx:276-304`
- **What:** Replace `dangerouslySetInnerHTML` + `marked()` with `react-markdown` + `rehype-sanitize`
- **Time:** 30 minutes
- **Why:** AI-generated markdown is rendered as raw HTML. Prompt injection via stock ticker names or news headlines can inject arbitrary JS into user sessions.

### 2. Fix render loop
- **File:** `stock-analyzer/src/components/stock-analyzer.tsx:123-124`
- **What:** Move `cleanTicker` logic into the `onChange` handler or a `useEffect` instead of running it during render
- **Time:** 5 minutes
- **Why:** Calling `setTicker` during render causes infinite re-render loops when ticker contains lowercase or spaces. Browser freezes.

### 3. Restrict CORS
- **File:** `backend/app.py:17`
- **What:** Change `CORS(app, supports_credentials=True)` to specify `origins=["https://yourdomain.com"]`
- **Time:** 2 minutes
- **Why:** Currently any website can make credentialed requests to the backend. Combined with UUID-as-token auth, this enables CSRF attacks.

### 4. Require password in auth
- **File:** `backend/blueprints/auth.py:34`
- **What:** Add `if not password: return jsonify({"error": "Password required"}), 400`
- **Time:** 5 minutes
- **Why:** Users can register without a password, then anyone can login as them with just their email.

### 5. Delete dead code
- **Files:** `stockbot.py`, `old-stock-ui/`, `Unused/`, root `requirements.txt`, root `package.json`
- **What:** Delete all of these
- **Time:** 15 minutes
- **Why:** ~1000 lines of abandoned code that confuses anyone inheriting the project. Root `requirements.txt` pulls in PyTorch/CUDA/FAISS for nothing.

### 6. Replace auth with Supabase Auth
- **Files:** `backend/blueprints/auth.py`, `stock-analyzer/src/hooks/useAuth.ts`, login/register pages
- **What:** Use Supabase's built-in auth (JWT, session management, password reset, OAuth) instead of custom bcrypt + UUID-as-token
- **Time:** 1 day
- **Why:** The current auth is fundamentally broken: no session expiry, no JWT signing, UUID as bearer token, optional passwords. Supabase Auth is free and handles all of this.

### 7. Port backend to Next.js Route Handlers
- **Files:** Entire `backend/` directory -> `stock-analyzer/src/app/api/`
- **What:** Rewrite Flask endpoints as Next.js Route Handlers. Replace `yfinance` with `yahoo-finance2`, `groq` with Google Gemini SDK.
- **Time:** 1 week
- **Why:** Eliminates Python dependency entirely. Single Vercel deployment. Hosting cost drops to ~$0 on hobby tier.

### 8. Add error handling to frontend API calls
- **Files:** `stock-analyzer/src/hooks/usePortfolio.ts`, `stock-analyzer/src/components/portfolio.tsx`
- **What:** Check response status before parsing JSON. Show user-facing error messages.
- **Time:** 2 hours
- **Why:** Currently a 401/500 response gets parsed as JSON and rendered as table rows, causing silent failures or crashes.

### 9. Use Next.js Link in Navbar
- **File:** `stock-analyzer/src/components/Navbar.tsx`
- **What:** Replace `<a href="/portfolio">` with `<Link href="/portfolio">` (from `next/link`)
- **Time:** 10 minutes
- **Why:** Raw `<a>` tags cause full page reloads, losing all client-side state. Next.js `<Link>` does client-side navigation.

### 10. Switch to react-markdown
- **File:** `stock-analyzer/src/components/stock-analyzer.tsx`
- **What:** Replace all `dangerouslySetInnerHTML={{ __html: marked(...) }}` with `<ReactMarkdown rehypePlugins={[rehypeSanitize]}>{content}</ReactMarkdown>`
- **Time:** Covered by fix #1
- **Why:** Safer rendering, no XSS surface, better React integration, no need to call `marked()` manually.
