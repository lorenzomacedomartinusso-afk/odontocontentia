import { NarrativeStructure, FinalAssets } from "../types";

const getEnvVar = (key: string): string => {
  return (import.meta.env[key] || "").trim();
};

const API_KEY = getEnvVar("VITE_GROQ_API_KEY");
const BASE_URL = getEnvVar("VITE_GROQ_BASE_URL") || "https://api.groq.com/openai/v1";
const MODEL = getEnvVar("VITE_GROQ_MODEL") || "llama-3.3-70b-versatile";

// ========================================
// SYSTEM INSTRUCTION - FILOSOFIA ADV CONTENT ADAPTADA PARA ODONTOLOGIA
// ========================================
const SYSTEM_INSTRUCTION = `
Você é uma IA estrategista de conteúdo e especialista em copywriting cultural. Seu público são dentistas que desejam se comunicar com pessoas comuns — pacientes, sociedade e audiência geral — e não com outros profissionais da saúde.

Seu papel é transformar temas de saúde bucal, estética e comportamento em narrativas culturais claras, provocativas e humanas. Você não é porta-voz da técnica clínica, mas intérprete das tensões entre saúde, autoestima, vaidade e cultura.

Produza sempre 5 narrativas por tema, em formato JSON.

REGRAS DE OURO:

1. O conteúdo deve falar COM a sociedade, não SOBRE a Odontologia. Evite termos técnicos, jargões clínicos ou tom professoral. Escreva como um jornalista cultural que observa o impacto da saúde bucal na vida real.

2. Cada narrativa deve revelar uma TENSÃO CULTURAL: um contraste entre o que as pessoas acreditam e o que realmente acontece. É nessa fricção que nasce o interesse.

3. Toda tese deve conter uma imagem ou cena reconhecível (espelho do banheiro, selfie, primeiro encontro, reunião de trabalho, xícara de café). Clareza nasce de visualização concreta.

4. A provocação deve vir de fatos, não de frases abstratas. Evite generalizações do tipo 'a sociedade mudou'; prefira algo como 'você esconde o sorriso na foto, mas ninguém te perguntou por quê'.

5. Mantenha tom observador, nunca moralista. O dentista aparece como quem interpreta o mundo, não como quem o julga.

6. A estrutura de cada narrativa é: Título forte + Tese curta (4 a 6 frases). O título deve capturar o conflito central, e a tese deve expor o paradoxo humano ou coletivo.

7. Evite linguagem de marketing. Nenhuma narrativa deve parecer autopromoção do dentista. Ela deve gerar valor intelectual e emocional, fazendo o leitor pensar: 'nunca tinha visto assim'.
`;

// ========================================
// KNOWLEDGE BASE (CÉREBRO)
// ========================================
const loadKnowledgeBase = (): string => {
  try {
    // Import all .txt, .md (raw strings) and .pdf (modules via plugin)
    const rawFiles = import.meta.glob('../knowledge/*.{txt,md}', { as: 'raw', eager: true });
    const pdfFiles = import.meta.glob('../knowledge/*.pdf', { eager: true });

    let context = "";

    // Process Raw Files (TXT/MD)
    const rawPaths = Object.keys(rawFiles);
    if (rawPaths.length > 0) {
      context += "\n\n========================================\n";
      context += "CONTEXTO ADICIONAL (DOCUMENTOS DE TEXTO):\n";
      context += "========================================\n\n";
      rawPaths.forEach((path) => {
        const fileName = path.split('/').pop();
        const content = rawFiles[path] as string;
        context += `--- ARQUIVO: ${fileName} ---\n${content}\n----------------\n\n`;
      });
    }

    // Process PDF Files
    const pdfPaths = Object.keys(pdfFiles);
    if (pdfPaths.length > 0) {
      context += "\n\n========================================\n";
      context += "CONTEXTO ADICIONAL (DOCUMENTOS PDF):\n";
      context += "========================================\n\n";
      pdfPaths.forEach((path) => {
        const fileName = path.split('/').pop();
        // The PDF plugin returns a module with a default export containing the text
        const module = pdfFiles[path] as { default: string };
        const content = module.default;
        context += `--- ARQUIVO: ${fileName} ---\n${content}\n----------------\n\n`;
      });
    }

    return context;
  } catch (error) {
    console.warn("Erro ao carregar base de conhecimento:", error);
    return "";
  }
};

const FULL_SYSTEM_INSTRUCTION = SYSTEM_INSTRUCTION + loadKnowledgeBase();

async function callGroq(prompt: string, schema?: any, isJson = false, onWait?: (msg: string) => void): Promise<string> {
  const url = `${BASE_URL}/chat/completions`;

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${API_KEY}`,
    "HTTP-Referer": "https://odontocontent.ai",
    "X-Title": "OdontoContent IA",
  };

  const messages = [
    { role: "system", content: FULL_SYSTEM_INSTRUCTION },
    { role: "user", content: prompt }
  ];

  const body: any = {
    model: MODEL,
    messages: messages,
    temperature: 0.7,
  };

  if (isJson) {
    body.response_format = { type: "json_object" };
    if (schema) {
      messages[1].content += `\n\nResponda APENAS com um JSON válido seguindo este schema:\n\`\`\`json\n${JSON.stringify(schema, null, 2)}\n\`\`\``;
    }
  }

  let attempt = 0;
  const maxRetries = 5;
  let response;

  while (attempt < maxRetries) {
    try {
      response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      });

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
          const msg = `⏳ Cota atingida. Aguardando liberação...`;
          console.warn(msg);
          if (onWait) onWait(msg);
        }

        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (response.status >= 400 && response.status < 500) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API Error (${response.status}): ${errorData.error?.message || response.statusText} - DO NOT RETRY`);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";

    } catch (error: any) {
      console.error("Fetch error:", error);
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

const cleanJson = (text: string): string => {
  if (!text) return '{}';
  let clean = text.replace(/```json\n?|\n?```/g, '');
  const firstBrace = clean.indexOf('{');
  const firstBracket = clean.indexOf('[');
  if (firstBrace === -1 && firstBracket === -1) return clean;
  const start = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;
  return clean.substring(start);
};

// ========================================
// GENERATE HOOKS - 5 NARRATIVAS CULTURAIS
// ========================================
export const generateHooks = async (topic: string, onWait?: (msg: string) => void): Promise<string[]> => {
  const prompt = `
TEMA ODONTOLÓGICO: "${topic}"

IMPORTANTE: Você DEVE produzir EXATAMENTE 5 narrativas. Nem mais, nem menos. 5 narrativas.

Produza 5 NARRATIVAS CULTURAIS sobre este tema para redes sociais de dentistas.

CADA NARRATIVA DEVE TER:
1. TÍTULO FORTE (4-8 palavras): Captura o conflito central, gera curiosidade imediata
2. TESE DESENVOLVIDA (4-6 frases): Expõe o paradoxo humano, contém cena reconhecível do cotidiano

EXEMPLOS DE QUALIDADE:

TÍTULO: "O Tabu do Sorriso Imperfeito"
TESE: "Muitos evitam sorrir em fotos por medo de expor dentes que consideram imperfeitos. Essa negação cultural transforma um ato de alegria em um gesto de autocensura — até que o silêncio visual custe mais caro do que qualquer tratamento. A sociedade celebra sorrisos, mas pune os que não se encaixam no padrão."

TÍTULO: "A Ilusão do Clareamento Eterno"
TESE: "A maioria acredita que 'depois do clareamento, está resolvido', mas a ausência de um cuidado contínuo revela uma armadilha. O clareamento não é um destino, é uma manutenção — e poucos estão dispostos a abrir mão do café da manhã pelo sorriso da selfie."

TÍTULO: "O Mito do Sorriso Natural"
TESE: "Muitos acreditam que dentes bonitos são apenas genética. Mas sem estratégia, sorrisos se perdem em hábitos, manchas e descuidos — provando que o natural não é o que nasce pronto, mas o que se preserva."

REGRA OBRIGATÓRIA: Retorne EXATAMENTE 5 narrativas no array JSON. Não 3, não 4, EXATAMENTE 5.`;

  try {
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

    const text = await callGroq(prompt, schema, true, onWait);
    const cleanText = cleanJson(text);
    let data = JSON.parse(cleanText);

    if (!Array.isArray(data)) {
      const arrayValue = Object.values(data).find((v) => Array.isArray(v));
      if (arrayValue) data = arrayValue;
    }

    if (!Array.isArray(data)) {
      console.error("Expected array, got:", data);
      return ["Erro: Formato de resposta inválido."];
    }

    return data.map((item: any) => `${item.title}: ${item.thesis}`);
  } catch (error: any) {
    console.error("Erro gerar hooks:", error);
    return [`ERRO: ${error.message}`];
  }
};

// ========================================
// GENERATE HEADLINES - 5 MANCHETES FORMATO "TÍTULO : SUBTÍTULO"
// ========================================
export const generateHeadlines = async (topic: string, selectedHook: string, onWait?: (msg: string) => void): Promise<string[]> => {
  const prompt = `
TEMA: "${topic}"
NARRATIVA SELECIONADA: "${selectedHook}"

Produza exatamente 5 HEADLINES no formato "TÍTULO EM CAIXA ALTA : SUBTÍTULO EM CAIXA ALTA"

CADA HEADLINE DEVE:
- Ter formato: "PARTE 1 : PARTE 2" (com dois pontos separando)
- A primeira parte captura a tensão (4-6 palavras)
- A segunda parte revela o paradoxo (6-10 palavras)
- Gerar curiosidade IMEDIATA
- Fazer o leitor querer saber mais

EXEMPLOS DE FORMATO CORRETO:
"O TABU DA HERANÇA EM VIDA : QUANDO O SILÊNCIO CUSTA MAIS QUE O TESTAMENTO"
"A MORTE QUE NÃO SE CONVERSA : COMO O MEDO DESORGANIZA AS FAMÍLIAS VIVAS"
"O PREÇO DO MAU AGOURO : POR QUE EVITAR O ASSUNTO VIROU UM RISCO FINANCEIRO"
"QUANDO O FUTURO VIROU ASSUNTO PROIBIDO : O LEGADO DA FUGA DAS CONVERSAS DIFÍCEIS"
"HERDAR EM VIDA : COMO O DIÁLOGO PODE DESARMAR OS CONFLITOS PÓS-MORTE"

Responda com exatamente 5 headlines neste formato.`;

  try {
    const schema = {
      type: "ARRAY",
      items: { type: "STRING" }
    };
    const text = await callGroq(prompt, schema, true, onWait);
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

// ========================================
// GENERATE NARRATIVE - TESE CENTRAL + ARGUMENTO-MÃE + SEQUÊNCIA 5 PONTOS
// ========================================
export const generateNarrative = async (topic: string, hook: string, headline: string, onWait?: (msg: string) => void): Promise<NarrativeStructure> => {
  const prompt = `
CONSTRUA A ESTRUTURA NARRATIVA COMPLETA.

CONTEXTO:
- Tema: "${topic}"
- Narrativa escolhida: "${hook}"
- Headline: "${headline}"

PRODUZA EXATAMENTE:

## 1. TESE CENTRAL (campo: tension)
Um parágrafo RICO e DESENVOLVIDO com 4-6 frases que:
- Apresente o conflito cultural de forma envolvente
- Crie uma imagem mental vívida e reconhecível (uma cena do cotidiano)
- Mostre a tensão entre expectativas sociais e realidade humana
- Faça o leitor se identificar profundamente
- Termine com uma reflexão que conecte o individual ao coletivo

EXEMPLO DE TESE CENTRAL DE QUALIDADE:
"Uma família se reúne para discutir o futuro, mas o tema da herança em vida é rapidamente silenciado — como se pronunciar a palavra 'morte' pudesse antecipá-la. Por trás desse silêncio, mora a crença de que planejar é desafiar o destino, e não proteger quem fica. Essa recusa em encarar a finitude reflete uma cultura que prefere adiar o desconforto a praticar o cuidado. Ironicamente, ao temer a morte, acabamos negligenciando a vida que ainda temos para administrar juntos."

## 2. ARGUMENTO-MÃE (campo: cause)
UMA FRASE DE IMPACTO poderosa (1-2 linhas) que sintetiza a provocação central.
Deve ser memorável, compartilhável, o tipo de frase que faz parar o scroll.

EXEMPLO:
"Temer a morte é fácil; difícil é perceber que evitar o assunto é o que realmente nos separa dos vivos."

## 3. SEQUÊNCIA NARRATIVA (5 pontos)
Cada campo deve ter 1-2 frases que desenvolvem a narrativa:

- **tension** (já preenchido acima): Abertura - A cena inicial que introduz o conflito
- **cause**: O Argumento-Mãe (já descrito acima)
- **effect**: Revelação - O que acontece quando ignoramos o tema? Qual a consequência visível?
- **culture**: Ampliação - Qual padrão cultural está em jogo? Como a sociedade reforça esse comportamento?
- **provocation**: Provocação/Fecho - Qual reflexão final você deixa? O que faz pensar diferente?

Responda com conteúdo RICO, PROFUNDO e que PRENDA A ATENÇÃO.`;

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
    const text = await callGroq(prompt, schema, true, onWait);
    let data = JSON.parse(cleanJson(text));

    if (data && !data.tension && !data.cause) {
      const inner = Object.values(data).find((v: any) => v && v.tension && v.cause);
      if (inner) data = inner;
    }

    return data as NarrativeStructure;
  } catch (error) {
    throw new Error("Falha na narrativa");
  }
};

// ========================================
// GENERATE FINAL ASSETS - ROTEIRO COMPLETO COM PARÁGRAFOS SEPARADOS
// ========================================
export const generateFinalAssets = async (topic: string, narrative: NarrativeStructure, onWait?: (msg: string) => void): Promise<FinalAssets> => {
  const prompt = `
PRODUZA O ROTEIRO FINAL COMPLETO.

CONTEXTO DA NARRATIVA:
- Tema: "${topic}"
- Tese Central: "${narrative.tension}"
- Argumento-Mãe: "${narrative.cause}"
- Revelação: "${narrative.effect}"
- Cultura: "${narrative.culture}"
- Provocação: "${narrative.provocation}"

## ROTEIRO (campo: reelsScript)

Produza um ROTEIRO LONGO E DESENVOLVIDO no seguinte formato EXATO:

LINHA 1: Título em CAIXA ALTA que capture a tensão central
Exemplo: "O TABU DA HERANÇA EM VIDA: QUANDO O SILÊNCIO CUSTA MAIS QUE O TESTAMENTO"

---

PARÁGRAFO 1 (3-4 frases): Abertura com cena do cotidiano
Exemplo: "Numa sala de jantar qualquer, o assunto surge e morre rápido: 'Melhor não falar disso agora.' O silêncio instala-se como um móvel pesado, herdado antes da hora. O desconforto é tão profundo que o gesto de evitar já é, por si, uma forma de repartir — o medo entre todos."

---

PARÁGRAFO 2 (3-4 frases): Origem do problema cultural

---

PARÁGRAFO 3 (3-4 frases): Consequência quando ignoramos

---

PARÁGRAFO 4 (3-4 frases): Contexto social/redes/modernidade

---

PARÁGRAFO 5 (3-4 frases): Paradoxo cultural revelado

---

PARÁGRAFO 6 (3-4 frases): O não-dito, o silêncio, o tabu

---

PARÁGRAFO 7 (3-4 frases): Alternativa provocadora

---

PARÁGRAFO 8 (2-3 frases): Fecho que fica na mente

IMPORTANTE: 
- Use "---" para separar CADA parágrafo
- Mínimo 8 parágrafos desenvolvidos
- Mínimo 500 palavras
- Escreva como ensaísta cultural, não como vendedor
- Cada parágrafo adiciona uma camada de reflexão

## CARROSSEL (campo: carouselStructure)
Array com 5-7 strings para slides:
- Slide 1: Gancho provocativo
- Slides 2-5: Desenvolvimento
- Slide 6: Reflexão
- Slide 7: CTA sutil

## LEGENDA (campo: caption)
2-3 parágrafos + hashtags relevantes (5-10) ao final.`;

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
    const text = await callGroq(prompt, schema, true, onWait);
    console.log('Raw API response:', text);

    const cleanText = cleanJson(text);
    console.log('Cleaned JSON:', cleanText);

    let data = JSON.parse(cleanText);
    console.log('Parsed data:', data);

    // Unwrap if the data is wrapped in an outer object
    if (data && !data.reelsScript && !data.caption) {
      const inner = Object.values(data).find((v: any) => v && (v.reelsScript || v.caption));
      if (inner) {
        data = inner;
        console.log('Unwrapped data:', data);
      }
    }

    // Helper function to extract actual value from schema-wrapped format
    const extractValue = (val: any): any => {
      if (val === null || val === undefined) return null;
      // If it's a schema-wrapped value like {type: "STRING", value: "..."} or {type: "ARRAY", items: {value: [...]}}
      if (typeof val === 'object' && val.type) {
        if (val.value !== undefined) return val.value;
        if (val.items && val.items.value !== undefined) return val.items.value;
        if (val.items && Array.isArray(val.items)) return val.items.map(extractValue);
      }
      return val;
    };

    // Extract the actual values from the response
    let reelsScript = extractValue(data.reelsScript) || data.reelsScript;
    let carouselStructure = extractValue(data.carouselStructure) || data.carouselStructure;
    let caption = extractValue(data.caption) || data.caption;

    // Validate and set fallbacks
    if (!reelsScript || typeof reelsScript !== 'string') {
      console.error('Missing or invalid reelsScript in response:', reelsScript);
      reelsScript = 'Erro ao gerar roteiro. Por favor, tente novamente.';
    }
    if (!carouselStructure || !Array.isArray(carouselStructure)) {
      console.error('Missing or invalid carouselStructure in response:', carouselStructure);
      carouselStructure = ['Erro ao gerar carrossel'];
    }
    if (!caption || typeof caption !== 'string') {
      console.error('Missing or invalid caption in response:', caption);
      caption = 'Erro ao gerar legenda.';
    }

    return { reelsScript, carouselStructure, caption } as FinalAssets;
  } catch (error: any) {
    console.error('Error in generateFinalAssets:', error);
    // Return fallback instead of throwing
    return {
      reelsScript: `Erro ao gerar conteúdo: ${error.message}. Por favor, tente novamente.`,
      carouselStructure: ['Erro ao gerar carrossel'],
      caption: 'Erro ao gerar legenda.'
    } as FinalAssets;
  }
};