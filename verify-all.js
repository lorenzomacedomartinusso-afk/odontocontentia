const API_KEY = "AIzaSyBggDFT_VlnRgHoH5yzXa6mwvigh3nm7p0";
const MODELS = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro",
    "gemini-1.5-pro-latest",
    "gemini-1.0-pro"
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
            const txt = await res.text();
            console.log(`FAILED ${model}: ${res.status} ${res.statusText}`);
            if (res.status === 429) console.log("Rate Limit Hit");
            else if (res.status === 404) console.log("Model Not Found");
            else console.log(txt.substring(0, 100));
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
