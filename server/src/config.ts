import dotenv from 'dotenv';
import path from 'path';

// This will resolve to the 'server' directory in both src/ and dist/
const envPath = path.resolve(__dirname, '..', '.env');
console.log('Loading config from:', envPath);
const result = dotenv.config({ path: envPath });
if (result.error) console.error('Error loading dotenv:', result.error);
console.log('Keys loaded in config.ts:', Object.keys(process.env).filter(k => k.startsWith('SUPA')));

// Optionally, export variables if desired, or let other files use process.env
