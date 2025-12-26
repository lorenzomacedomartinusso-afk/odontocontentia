import { NarrativeStructure, FinalAssets } from "../types";

// TODO: Voltaremos para variáveis de ambiente assim que estabilizar
const API_KEY = "AIzaSyCHduE9DFESs4OWpGPhcLtDKFqK1gbjHaA";
const MODEL = "gemini-pro";

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

async function callGemini(prompt: string, schema?: any, isJson = false): Promise<string> {
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

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
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

export const generateHooks = async (topic: string): Promise<string[]> => {
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

    const text = await callGemini(prompt, schema, true);
    const cleanText = cleanJson(text);
    const data = JSON.parse(cleanText);
    return data.map((item: any) => `${item.title.toUpperCase()}: ${item.thesis}`);
  } catch (error: any) {
    console.error("Erro gerar hooks:", error);
    return [`ERRO: ${error.message}`];
  }
};

export const generateHeadlines = async (topic: string, selectedHook: string): Promise<string[]> => {
  const prompt = `Tema: "${topic}". Narrativa: "${selectedHook}". Gere 5 Headlines provocativas.`;

  try {
    const schema = {
      type: "ARRAY",
      items: { type: "STRING" }
    };
    const text = await callGemini(prompt, schema, true);
    return JSON.parse(cleanJson(text));
  } catch (error) {
    return ["Erro ao gerar manchetes."];
  }
};

export const generateNarrative = async (topic: string, hook: string, headline: string): Promise<NarrativeStructure> => {
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
    const text = await callGemini(prompt, schema, true);
    return JSON.parse(cleanJson(text)) as NarrativeStructure;
  } catch (error) {
    throw new Error("Falha na narrativa");
  }
};

export const generateFinalAssets = async (topic: string, narrative: NarrativeStructure): Promise<FinalAssets> => {
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
    const text = await callGemini(prompt, schema, true);
    return JSON.parse(cleanJson(text)) as FinalAssets;
  } catch (error) {
    throw new Error("Falha nos ativos finais");
  }
};