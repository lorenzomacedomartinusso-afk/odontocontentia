const API_KEY = "AIzaSyBggDFT_VlnRgHoH5yzXa6mwvigh3nm7p0";
const MODELS = [
    "gemini-1.5-flash-8b",
    "gemini-1.5-flash-002",
    "gemini-1.5-flash-001",
    "gemini-1.5-flash"
];

async function testModel(model) {
    console.log(`\nTesting ${model}...`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
    const body = { contents: [{ role: "user", parts: [{ text: "Hi" }] }] };

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        const txt = await res.text();
        if (res.ok) {
            console.log(`SUCCESS with ${model}!`);
            return true;
        } else {
            console.log(`FAILED ${model}: ${res.status} ${res.statusText}`);
            // Log first 200 chars of error to see if it's 404 or 429 or other
            console.log(txt.substring(0, 200));
            return false;
        }
    } catch (e) {
        console.log(`ERROR ${model}:`, e.message);
        return false;
    }
}

async function run() {
    for (const model of MODELS) {
        await testModel(model);
    }
}

run();
