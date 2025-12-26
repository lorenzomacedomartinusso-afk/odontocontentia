const API_KEY = "AIzaSyBggDFT_VlnRgHoH5yzXa6mwvigh3nm7p0";
const MODEL = "gemini-2.0-flash-001";

async function test() {
    console.log(`Testing generation with ${MODEL}...`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

    const body = {
        contents: [{
            role: "user",
            parts: [{ text: "Hello, say 'Working' if you can hear me." }]
        }]
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            console.error("HTTP ERROR:", response.status, response.statusText);
            const err = await response.json();
            console.error("DETAILS:", JSON.stringify(err, null, 2));
        } else {
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            console.log("SUCCESS! Output:", text);
        }
    } catch (e) {
        console.error("EXCEPTION:", e);
    }
}

test();
