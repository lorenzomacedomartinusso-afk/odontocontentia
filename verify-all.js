const API_KEY = "AIzaSyBggDFT_VlnRgHoH5yzXa6mwvigh3nm7p0";
const MODELS = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-2.0-flash-exp",
    "gemini-2.5-flash",
    "gemini-2.5-pro"
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

        if (res.ok) {
            console.log(`SUCCESS with ${model}!`);
            return true;
        } else {
            console.log(`FAILED ${model}: ${res.status} ${res.statusText}`);
            return false;
        }
    } catch (e) {
        console.log(`ERROR ${model}:`, e.message);
        return false;
    }
}

async function run() {
    for (const model of MODELS) {
        const success = await testModel(model);
        if (success) {
            console.log(`\n>>> WINNER: ${model} <<<`);
            break;
        }
    }
}

run();
