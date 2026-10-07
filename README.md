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

*   **Frontend**: Vercel (point to `/client` directory, build command: `npm run build`, output: `dist`).
*   **Backend**: Render (point to `/server` directory, build command: `npm run build`, start command: `npm run start`).
