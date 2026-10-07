# ScamShield Architecture & AI Security Notes

## Architecture Overview

ScamShield follows a standard modern web stack (React frontend + Node.js backend) decoupled from direct client-to-database communication. This offers a higher level of security, particularly because AI-assisted scam analysis needs a safe, server-side context to execute.

### Frontend (Client)
- **Framework**: React via Vite, using TypeScript.
- **Styling**: Vanilla CSS implementing a custom dark navy aesthetic with cyan accents, minimizing dependency bloat while still providing a premium look.
- **State & Auth**: `Context API` used for global user authentication. Tokens are stored in `sessionStorage` preventing XSS vulnerabilities that might persist across tabs or sessions.
- **Routing**: `react-router-dom` handles views natively.
- **Deployment**: Configured for Vercel pointing to the `/client` directory.

### Backend (Server)
- **Framework**: Express with TypeScript.
- **Database**: PostgreSQL (via Supabase). The server acts as a middleware and uses the Supabase `service_role` key to interact with the database. **Note that service-role requests bypass RLS by design**. RLS is enabled at the table level and explicitly configured to deny any direct anonymous or public client-side access. Data isolation is manually enforced by the backend routing (e.g. `user_id = req.user.id`).
- **Auth**: JWT-based authentication. Sessions are tracked in the database to allow for explicit revocation and logout functionality. Passwords are hashed using `bcrypt` (10 rounds).
- **Deployment**: Configured for Render pointing to the `/server` directory.

---

## AI & Security Model

The AI integration focuses specifically on bounding the LLM's authority and sanitizing its inputs.

### 1. Zero-Execution Context
Gemini acts purely as an interpreter. It is not granted any function calling or tool use capabilities. The `submitted_content` is passed as raw string data within the prompt and explicitly flagged as untrusted.

### 2. Output Constraint via Zod & JSON Mode
We leverage `@google/genai` with `responseMimeType: "application/json"` and provide a strict `responseSchema`. After receiving the response, we parse it and pass it through a Zod schema (`AnalysisSchema`) for runtime validation. If Gemini hallucinates keys or types, it is caught immediately.

### 3. Rules Fallback
AI isn't perfect. We process basic heuristic patterns (e.g., suspicious URL lengths, requests for passwords/OTPs) *before* AI analysis. Both the AI findings and the programmed findings are saved and distinctly categorized by source ("Rule: Credentials" vs "AI").

### 4. Database Isolation
- All tables (`cases`, `analyses`) require `user_id`.
- The Express routes strictly enforce `eq('user_id', req.user.id)` on every query.
- No user can access or manipulate data owned by another, even if they guess UUIDs.

### 5. Data Privacy
- `.gitignore` and `.env.example` ensure secrets are not committed.
- API keys (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`) are loaded securely via `dotenv` and never exposed to the frontend.
