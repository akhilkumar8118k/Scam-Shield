require('./server/node_modules/dotenv').config({ path: __dirname + '/server/.env' });
const { GoogleGenAI } = require('./server/node_modules/@google/genai');

async function listModels() {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.list();
        for await (const model of response) {
            console.log(model.name);
        }
    } catch (e) {
        console.error('Error listing models:', e.message);
    }
}
listModels();
