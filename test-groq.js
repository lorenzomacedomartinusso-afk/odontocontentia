
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (!fs.existsSync(envPath)) return {};
        const envFile = fs.readFileSync(envPath, 'utf8');
        const envVars = {};
        envFile.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                envVars[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
            }
        });
        return envVars;
    } catch (e) {
        console.error("Could not read .env.local", e);
        return {};
    }
}

const env = loadEnv();
const API_KEY = env.VITE_GROQ_API_KEY;
const BASE_URL = env.VITE_GROQ_BASE_URL || "https://api.groq.com/openai/v1";
const MODEL = env.VITE_GROQ_MODEL || "llama-3.3-70b-versatile";

console.log(`Using Key: ${API_KEY ? API_KEY.slice(0, 5) + '...' : 'MISSING'}`);
console.log(`Using Model: ${MODEL}`);
console.log(`Using URL: ${BASE_URL}`);

if (!API_KEY) {
    console.error("ERROR: No API Key found in .env.local");
    process.exit(1);
}

async function testGroq() {
    const url = `${BASE_URL}/chat/completions`;

    // Groq supports checking simple messages
    const body = {
        model: MODEL,
        messages: [
            { role: "user", content: "Olá, responda com um JSON: {\"status\": \"ok\"}" }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" } // Check if Groq supports this for Llama
    };

    try {
        console.log("Sending request...");
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`API Error ${response.status}: ${err}`);
        }

        const data = await response.json();
        console.log("\n--- SUCCESS ---");
        console.log("Response:", data.choices?.[0]?.message?.content);
        console.log("-----------------");

    } catch (error) {
        console.error("\n--- FAILED ---");
        console.error(error.message);
        console.error("----------------");
    }
}

testGroq();
