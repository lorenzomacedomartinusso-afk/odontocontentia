import { GoogleGenAI, Type } from "@google/genai";
import { NarrativeStructure, FinalAssets } from "../types";

const getApiKey = () => {
  // TODO: Move back to env variables after verification
  return "AIzaSyCHduE9DFESs4OWpGPhcLtDKFqK1gbjHaA";
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

const MODEL_NAME = 'gemini-1.5-pro';

// Configuração da Persona: Estrategista Cultural e Copywriter
const SYSTEM_INSTRUCTION = `
Você é uma IA estrategista de conteúdo e especialista em copywriting cultural. Seu público são dentistas que desejam se comunicar com pessoas comuns — pacientes, sociedade e audiência geral — e não com outros profissionais da saúde. 

Seu papel é transformar temas de saúde bucal, estética e comportamento em narrativas culturais claras, provocativas e humanas. Você não é porta-voz da técnica clínica, mas intérprete das tensões entre saúde, autoestima e cultura.

REGRAS DE OURO (RULES):
1. O conteúdo deve falar COM a sociedade, não SOBRE a Odontologia. Evite termos técnicos (como periodontite, endodontia), jargões clínicos ou tom de 'palestra de consultório'. Escreva como um jornalista cultural que observa o impacto do sorriso e da saúde bucal na vida real.
2. Cada narrativa deve revelar uma TENSÃO CULTURAL: um contraste entre o que as pessoas acreditam (ou desejam) e o que realmente acontece. Ex: o desejo por dentes perfeitos de filtro de Instagram vs. a realidade da saúde biológica. É nessa fricção que nasce o interesse.
3. Toda tese deve conter uma imagem ou cena reconhecível (o café manchando o dente, a mão cobrindo a boca ao rir, o som do motorzinho, a luz do refletor, o primeiro encontro). Clareza nasce de visualização concreta.
4. A provocação deve vir de fatos, não de frases abstratas. Evite generalizações do tipo 'sorrir é importante'; prefira algo como 'o silêncio de quem tem vergonha do próprio sorriso fala mais que qualquer palavra'.
5. Mantenha tom observador, nunca moralista. O dentista aparece como quem interpreta o comportamento humano e a relação da sociedade com o corpo, não como quem dá 'bronca' no paciente por não usar fio dental.
6. A estrutura de cada narrativa é: Título forte + Tese curta (2 a 3 frases). O título deve capturar o conflito central, e a tese deve expor o paradoxo humano ou coletivo.
7. Evite linguagem de marketing direto. Nenhuma narrativa deve parecer 'venda de tratamento' ou 'agende sua consulta'. Ela deve gerar valor intelectual e emocional, fazendo o leitor pensar: 'eu sinto isso, mas nunca tinha analisado por esse ângulo'.
`;

// Helper para limpar JSON vindo da IA (remove markdown ```json ... ```)
const cleanJson = (text: string): string => {
  if (!text) return '{}';
  // Remove blocos de código markdown se existirem
  let clean = text.replace(/```json\n?|\n?```/g, '');
  // Remove qualquer texto antes ou depois do primeiro { ou [
  const firstBrace = clean.indexOf('{');
  const firstBracket = clean.indexOf('[');

  if (firstBrace === -1 && firstBracket === -1) return clean;

  const start = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket))
    ? firstBrace
    : firstBracket;

  return clean.substring(start);
};

export const generateHooks = async (topic: string): Promise<string[]> => {
  const prompt = `
  Tema: "${topic}"
  
  Produza 5 narrativas culturais baseadas neste tema seguindo estritamente as regras de estilo definidas.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Título forte e curto, estilo manchete de revista cultural." },
              thesis: { type: Type.STRING, description: "Tese curta (2 a 3 frases) revelando o paradoxo/tensão." }
            },
            required: ["title", "thesis"]
          }
        }
      }
    });

    const cleanText = cleanJson(response.text || '[]');
    const data = JSON.parse(cleanText);

    return data.map((item: { title: string, thesis: string }) => `${item.title.toUpperCase()}: ${item.thesis}`);

  } catch (error: any) {
    console.error("Erro ao gerar narrativas:", error);
    if (!getApiKey()) {
      return ["ERRO: API Key não configurada. Verifique se VITE_GEMINI_API_KEY ou VITE_API_KEY está no arquivo .env.local"];
    }
    return [`ERRO: ${error.message || 'Erro desconhecido'}`];
  }
};

export const generateHeadlines = async (topic: string, selectedHook: string): Promise<string[]> => {
  const prompt = `
  Tema: "${topic}"
  Narrativa Cultural Base: "${selectedHook}"

  Com base nessa tensão cultural, gere 5 Headlines (Manchetes) provocativas para o topo de um post.
  Elas devem soar como títulos de artigos de revista (Vogue, GQ, Piaui) ou documentários, e não como panfletos de dentista.
  Foque na curiosidade e na identificação humana imediata.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    const cleanText = cleanJson(response.text || '[]');
    return JSON.parse(cleanText) as string[];
  } catch (error) {
    console.error("Erro ao gerar headlines:", error);
    return ["Erro ao gerar manchetes."];
  }
};

export const generateNarrative = async (topic: string, hook: string, headline: string): Promise<NarrativeStructure> => {
  const prompt = `
  Construa a estrutura profunda do conteúdo.
  Tema: "${topic}"
  Narrativa/Tensão: "${hook}"
  Manchete: "${headline}"

  Preencha os 5 campos com texto denso, rico e observacional:
  1. Tensão: O conflito emocional ou social que o paciente vive (sem falar de técnica).
  2. Causa: A explicação (biológica ou comportamental) traduzida para linguagem de 'bar', simples e direta.
  3. Efeito: A consequência na autoimagem ou nas relações sociais.
  4. Cultura: Desconstrua um mito ou crença popular sobre isso.
  5. Provocação: Uma frase final que faça a pessoa repensar sua relação com o próprio corpo (sem chamar para agendar consulta).
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      tension: { type: Type.STRING },
      cause: { type: Type.STRING },
      effect: { type: Type.STRING },
      culture: { type: Type.STRING },
      provocation: { type: Type.STRING },
    },
    required: ["tension", "cause", "effect", "culture", "provocation"]
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });
    const cleanText = cleanJson(response.text || '{}');
    return JSON.parse(cleanText) as NarrativeStructure;
  } catch (error) {
    console.error("Erro narrativa:", error);
    throw new Error("Falha na geração da narrativa");
  }
};

export const generateFinalAssets = async (topic: string, narrative: NarrativeStructure): Promise<FinalAssets> => {
  const prompt = `
  Produza os ativos finais para redes sociais com base nessa estratégia cultural.
  Tema: ${topic}
  Estratégia: ${JSON.stringify(narrative)}

  1. Roteiro de Reels: Descreva cenas visuais cinematográficas/estéticas (nada de boca aberta com sangue). O texto falado deve ser narrado como uma reflexão.
  2. Carrossel: 7 slides que contam essa história. Texto curto, impactante, design minimalista.
  3. Legenda: Texto de apoio que aprofunda a discussão. Use emojis sóbrios (nada exagerado). Finalize com o disclaimer ético obrigatório.
  
  IMPORTANTE: O tom deve ser 'High-End', sofisticado e acolhedor.
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      reelsScript: { type: Type.STRING, description: "Roteiro com sugestão de áudio, cena visual (B-Roll) e texto falado/legendado" },
      carouselStructure: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Texto exato para cada lâmina do carrossel" },
      caption: { type: Type.STRING, description: "Legenda completa pronta para postar" }
    },
    required: ["reelsScript", "carouselStructure", "caption"]
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });
    const cleanText = cleanJson(response.text || '{}');
    return JSON.parse(cleanText) as FinalAssets;
  } catch (error) {
    console.error("Erro final assets:", error);
    throw new Error("Falha nos ativos finais");
  }
};