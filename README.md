# ScamShield

ScamShield is an advanced AI-powered platform for detecting and analyzing potential scams, phishing attempts, and suspicious links. Built with security-first architecture, it ensures complete user data isolation using Supabase Row Level Security (RLS) and gracefully falls back to programmatic rule checks if AI models are unavailable due to quotas or high demand.

## Architecture

- **Frontend**: React + Vite (SPA)
- **Backend**: Node.js + Express (TypeScript)
- **Database**: PostgreSQL (via Supabase) with strict RLS enforcement
- **AI Integration**: Google Gemini API for multilingual intent analysis and scam detection

## Key Features

1. **Multilingual Support**: Can analyze phishing attempts natively in English and Telugu.
2. **AI-Powered Detection**: Leverages Google Gemini to extract quotes and provide structured reasoning about suspicious patterns.
3. **Resilient Fallback Engine**: If the Gemini API experiences 429 (Quota Exhausted) or 503 (High Demand), the backend automatically falls back to a deterministic programmatic rules engine, explicitly reporting `Limited analysis — AI unavailable`.
4. **Strict Data Isolation**: No user can see, modify, or analyze another user's cases. Unauthenticated requests are completely rejected by database-level policies.

## AI Security & Validation Notes

ScamShield implements multiple layers of safety regarding its AI outputs:
- **Exact Quotation**: The backend validates that any "evidence" quoted by the AI is an exact substring of the originally submitted content, preventing hallucination.
- **Quota Resilience**: The API client intelligently distinguishes between temporary `503 Service Unavailable` errors (applying bounded exponential backoff) and hard `429 Quota Exhausted` errors (skipping immediately to the fallback engine).
- **Rule Alignment**: AI findings are merged with deterministic rule findings. If the rule engine flags a severe credential request, the overall assessment will never be downgraded to "low risk" by an overconfident or unaligned AI response.

## Deployment Outline

### Frontend (Vercel)
The React frontend is built as a Single Page Application (SPA). The `client/vercel.json` ensures proper routing for React Router by rewriting all paths to `index.html`. 
Set `VITE_API_URL` to point to the Render backend.

### Backend (Render)
The Express backend is configured via `render.yaml`. 
Required Environment Variables:
- `FRONTEND_URL` (for CORS)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (e.g., `gemini-2.5-flash`)

## Demo Outline

1. **User Registration & Isolation**: Create two users. Submit a case as User A. Log in as User B and attempt to access or modify User A's case to demonstrate strict database isolation.
2. **Ordinary vs. Phishing OTPs**: Submit a safe OTP message and a phishing OTP message. ScamShield will correctly identify the context and intent rather than blindly flagging the word "OTP".
3. **Fallback Mode Demo**: When Gemini API quotas are exhausted, the app instantly switches to deterministic rules, identifying severe phishing in English while honestly reporting lack of support for Telugu.
