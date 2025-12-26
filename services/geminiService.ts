import { NarrativeStructure, FinalAssets } from "../types";

// TODO: Voltaremos para variáveis de ambiente assim que estabilizar
const API_KEY = "AIzaSyCUPWONSV_ST_DuI8RxYx-7y2-oAS1ZuHU";
const MODEL = "gemini-2.0-flash";

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
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  const headers = {
    "Content-Type": "application/json"
  };

  const body: any = {
    contents: [{
      role: "user",
      parts: [{ text: prompt }]
    }],
    systemInstruction: {
      role: "user",
      parts: [{ text: SYSTEM_INSTRUCTION }]
    },
    generationConfig: {
      temperature: 0.7,
    }
  };

  if (isJson) {
    body.generationConfig.responseMimeType = "application/json";
    if (schema) {
      body.generationConfig.responseSchema = schema;
    }
  }

  // INFINITE RETRY LOGIC (The "Unlimited" Simulator)
  let attempt = 0;
  const maxRetries = 100; // Virtually infinite for user perception
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

        // Try to parse "retry in X s"
        const match = errorText.match(/retry in ([0-9.]+)s/);
        let waitTime = 5000 * attempt;

        if (match && match[1]) {
          waitTime = Math.ceil(parseFloat(match[1])) * 1000 + 2000; // time + 2s padding
          const msg = `⏳ Cota do Google atingida. Aguardando ${match[1]}s...`;
          console.warn(msg);
          if (onWait) onWait(msg);
        } else {
          // Default fallback wait if google doesn't say time
          waitTime = 30000; // 30s fixed wait
          const msg = `⏳ Cota atingida. Aguardando liberação do servidor (30s)...`;
          console.warn(msg);
          if (onWait) onWait(msg);
        }

        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    } catch (error: any) {
      console.error("Fetch error:", error);
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
    const data = JSON.parse(cleanText);
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
    return JSON.parse(cleanJson(text));
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
    return JSON.parse(cleanJson(text)) as NarrativeStructure;
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
    return JSON.parse(cleanJson(text)) as FinalAssets;
  } catch (error) {
    throw new Error("Falha nos ativos finais");
  }
};