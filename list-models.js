import fs from 'fs';
const API_KEY = "AIzaSyCHduE9DFESs4OWpGPhcLtDKFqK1gbjHaA";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

const response = await fetch(url);
const data = await response.json();
const names = data.models
    .filter(m => m.supportedGenerationMethods.includes("generateContent"))
    .map(m => m.name.replace('models/', ''));

fs.writeFileSync('models.txt', names.join(', '));
console.log("Wrote models to models.txt");
