import fs from 'fs';
const API_KEY = "AIzaSyASarnIcmLmWxvzoMrXG5I891al0GtXE2Y";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

// Simple fetch and log
fetch(url)
    .then(res => res.json())
    .then(data => {
        if (data.models) {
            console.log("FOUND MODELS:");
            // Print first 10 models that support generation
            const list = data.models
                .filter(m => m.supportedGenerationMethods.includes("generateContent"))
                .map(m => m.name.replace('models/', ''));

            list.forEach(name => console.log(name));
        } else {
            console.log("NO MODELS PROPERTY", data);
        }
    })
    .catch(err => console.error(err));
