import { NarrativeStructure, FinalAssets } from "../types";

const getEnvVar = (key: string): string => {
  return (import.meta.env[key] || "").trim();
};

const API_KEY = getEnvVar("VITE_GROQ_API_KEY");
const BASE_URL = getEnvVar("VITE_GROQ_BASE_URL") || "https://api.groq.com/openai/v1";
const MODEL = getEnvVar("VITE_GROQ_MODEL") || "llama-3.3-70b-versatile";

const SYSTEM_INSTRUCTION = `
Você é uma IA estrategista de conteúdo e especialista em copywriting cultural. Seu público são dentistas que desejam se comunicar com pessoas comuns — pacientes, sociedade e audiência geral — e não com outros profissionais da saúde. 

Seu papel é transformar temas de saúde bucal, estética e comportamento em narrativas culturais claras, provocativas e humanas. Você não é porta-voz da técnica clínica, mas intérprete das tensões entre saúde, autoestima e cultura.

REGRAS DE OURO (RULES):
1. O conteúdo deve falar COM a sociedade, não SOBRE a Odontologia. Evite termos técnicos.
2. Cada narrativa deve revelar uma TENSÃO CULTURAL.
3. Toda tese deve conter uma imagem ou cena reconhecível.
4. A provocação deve vir de fatos, não de frases abstratas.
5. Mantenha tom observador, nunca moralista.
6. A estrutura de cada narrativa é: Título forte + Tese curta (2 a 3 frases).
7. Evite linguagem de marketing direto.
`;

async function callGemini(prompt: string, schema?: any, isJson = false, onWait?: (msg: string) => void): Promise<string> {
  // Use OpenRouter (OpenAI compatible) endpoint
  const url = `${BASE_URL}/chat/completions`;

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${API_KEY}`,
    "HTTP-Referer": "https://odontocontent.ai", // Required by OpenRouter
    "X-Title": "OdontoContent IA", // Optional: shows in OpenRouter dashboard
  };

  const messages = [
    { role: "system", content: SYSTEM_INSTRUCTION },
    { role: "user", content: prompt }
  ];

  /* 
    OpenRouter/OpenAI usually handles 'response_format' for JSON, 
    but for some models it might be better to just prompt for JSON 
    or check if the model supports structed outputs. 
    Gemini 2.0 Flash usually supports JSON mode well.
  */

  const body: any = {
    model: MODEL,
    messages: messages,
    temperature: 0.7,
  };

  if (isJson) {
    // OpenRouter standard for JSON
    body.response_format = { type: "json_object" };

    if (schema) {
      // Append schema to the prompt to guide the model
      messages[1].content += `\n\nResponda APENAS com um JSON válido seguindo este schema:\n\`\`\`json\n${JSON.stringify(schema, null, 2)}\n\`\`\``;
    }
  }

  // INFINITE RETRY LOGIC (Simulation Adjusted)
  let attempt = 0;
  const maxRetries = 5; // Reduced from 100 to prevent infinite hanging
  let response;

  while (attempt < maxRetries) {
    try {
      response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      });

      // If Rate Limit (429), wait and retry
      if (response.status === 429) {
        attempt++;
        const errorText = await response.text();
        const match = errorText.match(/retry in ([0-9.]+)s/);
        let waitTime = 5000 * attempt;

        if (match && match[1]) {
          waitTime = Math.ceil(parseFloat(match[1])) * 1000 + 2000;
          const msg = `⏳ Cota atingida. Aguardando ${match[1]}s...`;
          console.warn(msg);
          if (onWait) onWait(msg);
        } else {
          waitTime = 10000;
          const msg = `⏳ Cota atingida (OpenRouter). Aguardando liberação...`;
          console.warn(msg);
          if (onWait) onWait(msg);
        }

        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      // Stop retrying on client errors (4xx) except 429
      if (response.status >= 400 && response.status < 500) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API Error (${response.status}): ${errorData.error?.message || response.statusText} - DO NOT RETRY`);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API Error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";

    } catch (error: any) {
      console.error("Fetch error:", error);

      // If error is explicitly marked as DO NOT RETRY, throw immediately
      if (error.message.includes("DO NOT RETRY")) {
        throw error;
      }

      if (attempt === maxRetries - 1) throw error;

      const msg = `⚠️ Erro de conexão. Tentando novamente em 5s...`;
      if (onWait) onWait(msg);
      attempt++;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  return "";
}

// Helper para limpar JSON
const cleanJson = (text: string): string => {
  if (!text) return '{}';
  let clean = text.replace(/```json\n?|\n?```/g, '');
  const firstBrace = clean.indexOf('{');
  const firstBracket = clean.indexOf('[');
  if (firstBrace === -1 && firstBracket === -1) return clean;
  // Retorna a partir do primeiro { ou [
  const start = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;
  return clean.substring(start);
};

export const generateHooks = async (topic: string, onWait?: (msg: string) => void): Promise<string[]> => {
  const prompt = `Tema: "${topic}". Produza 5 narrativas culturais baseadas neste tema.`;

  try {
    // Definindo schema manualmente para a requisição REST
    const schema = {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          thesis: { type: "STRING" }
        },
        required: ["title", "thesis"]
      }
    };

    const text = await callGemini(prompt, schema, true, onWait);
    const cleanText = cleanJson(text);
    let data = JSON.parse(cleanText);

    // Handle wrapped arrays (common with json_object mode)
    if (!Array.isArray(data)) {
      const arrayValue = Object.values(data).find((v) => Array.isArray(v));
      if (arrayValue) data = arrayValue;
    }

    // Safety check
    if (!Array.isArray(data)) {
      console.error("Expected array, got:", data);
      return ["Erro: Formato de resposta inválido."];
    }

    return data.map((item: any) => `${item.title.toUpperCase()}: ${item.thesis}`);
  } catch (error: any) {
    console.error("Erro gerar hooks:", error);
    return [`ERRO: ${error.message}`];
  }
};

export const generateHeadlines = async (topic: string, selectedHook: string, onWait?: (msg: string) => void): Promise<string[]> => {
  const prompt = `Tema: "${topic}". Narrativa: "${selectedHook}". Gere 5 Headlines provocativas.`;

  try {
    const schema = {
      type: "ARRAY",
      items: { type: "STRING" }
    };
    const text = await callGemini(prompt, schema, true, onWait);
    const cleanText = cleanJson(text);
    let data = JSON.parse(cleanText);

    if (!Array.isArray(data)) {
      const arrayValue = Object.values(data).find((v) => Array.isArray(v));
      if (arrayValue) data = arrayValue;
    }

    return Array.isArray(data) ? data : ["Erro: Formato inválido."];
  } catch (error) {
    return ["Erro ao gerar manchetes."];
  }
};

export const generateNarrative = async (topic: string, hook: string, headline: string, onWait?: (msg: string) => void): Promise<NarrativeStructure> => {
  const prompt = `Construa a estrutura profunda. Tema: ${topic}. Narrativa: ${hook}. Manchete: ${headline}`;

  const schema = {
    type: "OBJECT",
    properties: {
      tension: { type: "STRING" },
      cause: { type: "STRING" },
      effect: { type: "STRING" },
      culture: { type: "STRING" },
      provocation: { type: "STRING" },
    },
    required: ["tension", "cause", "effect", "culture", "provocation"]
  };

  try {
    const text = await callGemini(prompt, schema, true, onWait);
    let data = JSON.parse(cleanJson(text));

    // If wrapped, try to unwrap if the expected keys are missing but present inside
    if (data && !data.tension && !data.cause) {
      const inner = Object.values(data).find((v: any) => v && v.tension && v.cause);
      if (inner) data = inner;
    }

    return data as NarrativeStructure;
  } catch (error) {
    throw new Error("Falha na narrativa");
  }
};

export const generateFinalAssets = async (topic: string, narrative: NarrativeStructure, onWait?: (msg: string) => void): Promise<FinalAssets> => {
  const prompt = `Produza ativos finais. Tema: ${topic}. Estratégia: ${JSON.stringify(narrative)}`;

  const schema = {
    type: "OBJECT",
    properties: {
      reelsScript: { type: "STRING" },
      carouselStructure: { type: "ARRAY", items: { type: "STRING" } },
      caption: { type: "STRING" }
    },
    required: ["reelsScript", "carouselStructure", "caption"]
  };

  try {
    const text = await callGemini(prompt, schema, true, onWait);
    let data = JSON.parse(cleanJson(text));

    // Unwrap if needed
    if (data && !data.reelsScript && !data.caption) {
      const inner = Object.values(data).find((v: any) => v && (v.reelsScript || v.caption));
      if (inner) data = inner;
    }

    return data as FinalAssets;
  } catch (error) {
    throw new Error("Falha nos ativos finais");
  }
};