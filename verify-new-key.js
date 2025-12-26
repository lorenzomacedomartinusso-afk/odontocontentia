const API_KEY = "AIzaSyCUPWONSV_ST_DuI8RxYx-7y2-oAS1ZuHU";
const MODELS = [
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash-exp",
    "gemini-2.5-flash"
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
