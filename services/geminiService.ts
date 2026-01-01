import { NarrativeStructure, FinalAssets } from "../types";

const getEnvVar = (key: string): string => {
  return (import.meta.env[key] || "").trim();
};

const API_KEY = getEnvVar("VITE_GROQ_API_KEY");
const BASE_URL = getEnvVar("VITE_GROQ_BASE_URL") || "https://api.groq.com/openai/v1";
const MODEL = getEnvVar("VITE_GROQ_MODEL") || "llama-3.3-70b-versatile";

const SYSTEM_INSTRUCTION = `
Você é uma IA estrategista de conteúdo e especialista em copywriting cultural para o nicho odontológico. Seu público são dentistas que desejam criar conteúdo magnético para redes sociais que conecte com pessoas comuns — pacientes, sociedade e audiência geral.

Seu papel é transformar temas de saúde bucal, estética e comportamento em NARRATIVAS CULTURAIS PROFUNDAS, provocativas e humanas que prendam a atenção nas redes sociais e gerem engajamento real.

## FILOSOFIA DE CRIAÇÃO:
- Você NÃO cria conteúdo clínico ou educativo tradicional. Você cria REFLEXÕES CULTURAIS que usam a odontologia como lente para observar comportamentos humanos.
- Cada narrativa deve parecer um mini-ensaio cultural, não um post de "dicas de dentista".
- O conteúdo deve fazer o leitor parar o scroll e pensar: "isso é sobre mim."

## REGRAS DE OURO:
1. **Tensão Cultural**: Toda narrativa começa com um CONFLITO entre expectativas sociais e realidade humana. Ex: a pressão por dentes perfeitos vs. o café da manhã.
2. **Cenas Reconhecíveis**: Use imagens mentais específicas (a xícara de café na mão depois do clareamento, o sorriso contido na foto).
3. **Tom Observador**: Você é um pensador cultural, não um vendedor. Observe, não empurre.
4. **Profundidade**: Cada frase deve adicionar uma camada de reflexão. Evite frases vazias ou genéricas.
5. **Linguagem Humana**: Escreva como alguém que conversa de igual para igual, não como especialista falando para leigos.
6. **Gancho Emocional**: A primeira frase deve criar curiosidade imediata ou identificação instantânea.

## ESTRUTURA DE QUALIDADE:
- **TESE CENTRAL**: Um parágrafo denso (4-6 frases) que apresenta o conflito cultural, cria uma imagem mental vívida e estabelece a tensão narrativa.
- **ARGUMENTO-MÃE**: Uma frase de impacto que sintetiza a provocação central — algo que o leitor vai querer compartilhar.
- **SEQUÊNCIA NARRATIVA**: 5 pontos que constroem uma jornada de pensamento, do problema à reflexão final.

## EXEMPLOS DE TOM IDEAL:
❌ "Clareamento dental é importante para sua autoestima."
✅ "Você acabou de fazer clareamento dental e, no dia seguinte, não resiste ao café da manhã — sabendo que cada gole pode desfazer o sorriso que você pagou para ter."

❌ "O bruxismo pode ser causado por estresse."
✅ "É curioso: dormimos para descansar, mas nosso corpo escolhe a noite para ranger os dentes — como se os problemas do dia precisassem ser mastigados até virar pó."

Sempre entregue conteúdo rico, provocativo e de alta qualidade para redes sociais.
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
  const prompt = `
TEMA ODONTOLÓGICO: "${topic}"

Crie 3 NARRATIVAS CULTURAIS poderosas para redes sociais de dentistas.

CADA NARRATIVA DEVE:
1. Ter um TÍTULO provocativo e magnético (4-8 palavras) que gere curiosidade
2. Ter uma TESE desenvolvida (3-5 frases) que:
   - Comece com uma cena reconhecível do cotidiano
   - Revele uma tensão entre comportamento e consequência
   - Use linguagem observadora, como um ensaísta cultural
   - Faça o leitor se identificar e querer ler até o final

EXEMPLO DE QUALIDADE:
"O PREÇO DO SORRISO: A busca por um sorriso perfeito leva muitos a optarem pelo clareamento dental, mas o hábito de beber café pode ser um obstáculo constante nessa jornada. Imagine uma cena: você acaba de fazer um clareamento dental e, no dia seguinte, não resiste ao seu café da manhã favorito, sabendo que cada gole pode estar desfazendo o trabalho realizado."

Responda com narrativas ricas e provocativas que prendam atenção.`;


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
  const prompt = `
TEMA: "${topic}"
NARRATIVA SELECIONADA: "${selectedHook}"

Crie 3 HEADLINES MAGNÉTICAS para redes sociais de dentistas.

CADA HEADLINE DEVE:
- Ter 5-10 palavras
- Gerar curiosidade IMEDIATA
- Usar linguagem provocadora, não técnica
- Fazer o leitor querer saber mais

EXEMPLOS DE QUALIDADE:
✅ "O Café: Inimigo Silencioso do Sorriso Perfeito"
✅ "Por Que Seu Sorriso Esconde Mais do Que Você Imagina"
✅ "A Batalha Invisível Entre Vaidade e Vício"

Responda apenas com as headlines, sem explicações.`;

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
  const prompt = `
CONSTRUA UMA ESTRUTURA NARRATIVA PROFUNDA E CATIVANTE.

## CONTEXTO:
- Tema: "${topic}"  
- Narrativa escolhida: "${hook}"
- Headline: "${headline}"

## O QUE VOCÊ DEVE ENTREGAR:

### 1. TESE CENTRAL (campo: tension)
Um parágrafo RICO e DESENVOLVIDO (4-6 frases) que:
- Apresente o conflito cultural de forma envolvente
- Crie uma imagem mental vívida e reconhecível
- Mostre a tensão entre expectativas e realidade
- Faça o leitor se identificar profundamente

EXEMPLO DE QUALIDADE:
"Uma família se reúne para discutir o futuro, mas o tema da herança em vida é rapidamente silenciado — como se pronunciar a palavra 'morte' pudesse antecipá-la. Por trás desse silêncio, mora a crença de que planejar é desafiar o destino, e não proteger quem fica. Essa recusa em encarar a finitude reflete uma cultura que prefere adiar o desconforto a praticar o cuidado. Ironicamente, ao temer a morte, acabamos negligenciando a vida que ainda temos para administrar juntos."

### 2. ARGUMENTO-MÃE (campo: cause)
Uma FRASE DE IMPACTO poderosa que sintetiza a provocação central.
Deve ser algo memorável, compartilhável, que faça as pessoas pararem.

EXEMPLO:
"Temer a morte é fácil; difícil é perceber que evitar o assunto é o que realmente nos separa dos vivos."

### 3. SEQUÊNCIA NARRATIVA (campos: effect, culture, provocation)

PARA CADA UM DOS 3 CAMPOS, escreva UMA FRASE que desenvolva a narrativa:

- **effect**: Revelação - O que acontece quando ignoramos o tema? (1-2 frases reveladoras)
- **culture**: Ampliação - Qual padrão cultural está em jogo? (1-2 frases sobre a sociedade)
- **provocation**: Provocação - Qual reflexão final você deixa? (1-2 frases que provoquem pensamento)

Responda com conteúdo RICO, PROFUNDO e que PRENDA A ATENÇÃO nas redes sociais.
`;

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
  const prompt = `
PRODUZA UM ROTEIRO COMPLETO E PROFUNDO para redes sociais de dentistas.

## CONTEXTO DA NARRATIVA:
- Tema: "${topic}"
- Tese Central: "${narrative.tension}"
- Argumento-Mãe: "${narrative.cause}"
- Revelação: "${narrative.effect}"
- Cultura: "${narrative.culture}"
- Provocação: "${narrative.provocation}"

## INSTRUÇÕES PARA O ROTEIRO (campo: reelsScript)

Produza um ROTEIRO LONGO E DESENVOLVIDO (mínimo 600 palavras) no seguinte formato:

### ESTRUTURA OBRIGATÓRIA:

**LINHA 1 - TÍTULO EM CAIXA ALTA:**
Uma frase provocativa que funcione como título do conteúdo.
Exemplo: "O TABU DA HERANÇA EM VIDA: QUANDO O SILÊNCIO CUSTA MAIS QUE O TESTAMENTO"

**SEPARADOR:** ---

**PARÁGRAFO 1 - ABERTURA (3-4 frases):**
Crie uma cena reconhecível do cotidiano que introduza a tensão.
Use linguagem sensorial e imagética.
Exemplo: "Numa sala de jantar qualquer, o assunto surge e morre rápido: 'Melhor não falar disso agora.' O silêncio instala-se como um móvel pesado, herdado antes da hora. O desconforto é tão profundo que o gesto de evitar já é, por si, uma forma de repartir — o medo entre todos."

**SEPARADOR:** ---

**PARÁGRAFO 2 - ORIGEM DO PROBLEMA (3-4 frases):**
Explique de onde vem esse comportamento cultural.
Conecte com crenças populares ou medos ancestrais.

**SEPARADOR:** ---

**PARÁGRAFO 3 - CONSEQUÊNCIA (3-4 frases):**
Mostre o que acontece quando ignoramos o tema.
Use exemplos concretos e humanos.

**SEPARADOR:** ---

**PARÁGRAFO 4 - CONTEXTO SOCIAL (3-4 frases):**
Amplie para uma reflexão sobre a sociedade atual.
Conecte com comportamentos das redes sociais ou da vida moderna.

**SEPARADOR:** ---

**PARÁGRAFO 5 - PARADOXO CULTURAL (3-4 frases):**
Revele uma contradição interessante sobre o tema.
Faça o leitor pensar "nunca tinha visto por esse ângulo".

**SEPARADOR:** ---

**PARÁGRAFO 6 - O QUE NÃO DIZEMOS (3-4 frases):**
Explore o não-dito, o silêncio, o tabu.
Use metáforas sobre temperatura, peso, distância.

**SEPARADOR:** ---

**PARÁGRAFO 7 - ALTERNATIVA (3-4 frases):**
Sugira uma forma diferente de encarar o tema.
Não seja moralista, seja provocador.

**SEPARADOR:** ---

**PARÁGRAFO 8 - FECHO PROVOCATIVO (2-3 frases):**
Termine com uma reflexão que fique na mente.
Pode ser uma pergunta, um paradoxo ou uma afirmação marcante.

## TOM E ESTILO:
- Escreva como um ensaísta cultural observando comportamentos humanos
- Use linguagem poética mas acessível
- Evite termos técnicos odontológicos
- Cada parágrafo deve adicionar uma camada de reflexão
- O texto deve parecer um mini-ensaio que faz pensar

## ESTRUTURA DE CARROSSEL (campo: carouselStructure)
Array com 5-7 strings, cada uma sendo o texto de um slide:
- Slide 1: Gancho provocativo
- Slides 2-5: Desenvolvimento da narrativa
- Slide 6: Reflexão final
- Slide 7: CTA sutil

## LEGENDA (campo: caption)
Uma legenda completa com 2-3 parágrafos desenvolvidos + hashtags relevantes (5-10) ao final.

IMPORTANTE: O roteiro deve ser LONGO e DESENVOLVIDO, com pelo menos 8 parágrafos separados por "---". Mínimo de 600 palavras.
`;

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