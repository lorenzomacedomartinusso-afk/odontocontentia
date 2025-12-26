import { GoogleGenAI } from "@google/genai";

// Hardcoded for testing script only
const apiKey = "AIzaSyCHduE9DFESs4OWpGPhcLtDKFqK1gbjHaA";

const genAI = new GoogleGenAI({ apiKey });

async function main() {
    console.log("Testing Gemini API connection...");

    try {
        // 1. Try a simple generation with a very standard model
        console.log("\nAttempting generation with 'gemini-1.5-flash'...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello, are you working?");
        console.log("SUCCESS! Response:", result.response.text());
    } catch (error) {
        console.error("FAILED with gemini-1.5-flash:", error.message);

        try {
            // 2. Fallback check for gemini-pro
            console.log("\nAttempting generation with 'gemini-pro' (1.0)...");
            const model2 = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result2 = await model2.generateContent("Hello?");
            console.log("SUCCESS with gemini-pro! Response:", result2.response.text());
        } catch (err2) {
            console.error("FAILED with gemini-pro:", err2.message);
        }
    }
}

main();
