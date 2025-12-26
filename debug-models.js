const API_KEY = "AIzaSyCHduE9DFESs4OWpGPhcLtDKFqK1gbjHaA";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

console.log(`Fetching models from: ${url}`);

try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.models) {
        console.log("AVAILABLE MODELS:");
        data.models.forEach(m => {
            // Filter for generateContent support
            if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                console.log(`\nName: ${m.name}`);
                console.log(`DisplayName: ${m.displayName}`);
            }
        });
    } else {
        console.log("ERROR RESPONSE:", JSON.stringify(data, null, 2));
    }
} catch (error) {
    console.error("FETCH ERROR:", error);
}
