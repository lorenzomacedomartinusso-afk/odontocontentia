const API_KEY = "AIzaSyCUPWONSV_ST_DuI8RxYx-7y2-oAS1ZuHU";
const MODEL = "gemini-2.0-flash";

async function test() {
    console.log(`Testing ${MODEL}...`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
    const body = { contents: [{ role: "user", parts: [{ text: "Hi" }] }] };

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        console.log(`STATUS: ${res.status}`);
        const txt = await res.text();
        console.log(`BODY: ${txt.substring(0, 200)}`);

    } catch (e) {
        console.log(`ERROR:`, e.message);
    }
}

test();
