# ScamShield

ScamShield is a full-stack scam detection assistant built for the Build to Ship hackathon. It allows users to submit suspicious messages, emails, or links for risk analysis using AI and programmed checks.

## Architecture

*   **Frontend**: React, Vite, TypeScript, Tailwind CSS (optional - but using custom CSS for dark navy theme as requested).
*   **Backend**: Node.js, Express, TypeScript.
*   **Database**: PostgreSQL via Supabase (accessed only from the server for security).
*   **AI Engine**: Gemini (via `@google/genai`) for text and URL analysis.
*   **Authentication**: Custom JWT authentication with sessions stored in the database.

## Environment Variables

Copy `.env.example` to `.env` in the root (or in `/server`) and fill in the values:

```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
PORT=3001
```

## Setup & Running Locally

1. Install dependencies:
   ```bash
   npm run install:all
   ```

2. Start the development servers (frontend on 5173, backend on 3001):
   ```bash
   npm run dev
   ```

## Deployment

### Frontend (Vercel)
1. Import the repository into Vercel.
2. Set the Framework Preset to **Vite**.
3. Set the Root Directory to `client`.
4. Add the environment variable: `VITE_API_URL` pointing to your backend URL (e.g., `https://scam-shield-server.onrender.com/api`).
5. Vercel is already configured with `vercel.json` for SPA routing (rewriting all requests to `/index.html`).

### Backend (Render)
1. Create a new Web Service on Render and connect the repository.
2. Set the Root Directory to `server`.
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`
5. Environment Variables:
   - `NODE_ENV`: `production`
   - `FRONTEND_URL`: Your Vercel frontend URL (e.g., `https://your-frontend.vercel.app`) - crucial for CORS.
   - `SUPABASE_URL`: Your Supabase URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key.
   - `JWT_SECRET`: Your custom JWT signing secret.
   - `GEMINI_API_KEY`: Your Google Gemini API key.
   - `PORT`: (Render provides this automatically).
Alternatively, use the included `render.yaml` as a blueprint.

## AI Security & Architecture Notes
- **Direct Database Access Denied**: The frontend never connects to Supabase. Supabase Row Level Security (RLS) is enabled and drops all client connections. The backend connects securely using the `service_role` key, ensuring total control over the query logic and business rules.
- **Tenant Isolation**: Backend endpoints strictly filter database records using the `user_id` authenticated via JWT, guaranteeing that User A cannot view, edit, or delete User B's cases or analysis history.
- **AI as Interpreter**: Gemini is used exclusively in JSON mode with strict Zod validation as an analysis engine. It has no tool-use capabilities, no access to external APIs, and no direct database access, minimizing prompt injection risks.
- **Hybrid Rule Engine**: Programmed rules act as a strict baseline overlay over AI analysis. Clear risk markers (like password requests) are flagged deterministically. The UI clarifies whether a finding came from AI inference or a rigid rule.
- **Quoted Evidence**: The AI is instructed to return exact substrings of the submitted content to justify its claims, preventing hallucination of non-existent threats.

## Demo Outline
1. **User Registration & Login**: Show secure onboarding without external OAuth dependencies.
2. **Dashboard Overview**: Demonstrate the dark-navy aesthetic and empty state.
3. **Submitting a Phishing Message**: Paste a standard "OTP verification" phishing message. Show the loading state while the backend combines rules and Gemini analysis.
4. **Evidence Board**: Display the analysis results. Highlight how the UI separates AI reasoning from strict programmed rule detections. Show the exact quotes matched from the text.
5. **Multi-language Support (Telugu)**: Submit a Telugu message and show that the AI accurately interprets the scam and outputs the summary and reasons in Telugu.
6. **Case History**: Switch to a second user account to prove that the first user's cases are completely invisible and isolated.
