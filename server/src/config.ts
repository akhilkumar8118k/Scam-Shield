import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// This will resolve to the 'server' directory in both src/ and dist/
const envPath = path.resolve(__dirname, '..', '.env');

// Treat the local .env file as optional.
if (fs.existsSync(envPath)) {
    // dotenv.config does not override pre-existing process.env variables by default.
    const result = dotenv.config({ path: envPath });
    if (result.error) {
        console.error('Error loading .env file:', result.error.message);
    }
}

// Validate required variables regardless of their source
const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
    'GEMINI_API_KEY'
];

const missingVars = requiredVars.filter(v => !process.env[v]);

if (missingVars.length > 0) {
    console.error('CRITICAL ERROR: Missing required environment variables:', missingVars.join(', '));
}
