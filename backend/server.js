const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.send("Backend NutriFlux online");
});

app.post("/gerar", async (req, res) => {
  const startedAt = Date.now();

  try {
    const { nome, peso, altura, idade, objetivo } = req.body || {};

    console.log("➡️ Nova requisição /gerar recebida");

    if (!nome || !peso || !altura || !idade || !objetivo) {
      return res.status(400).json({
        erro: "Preencha nome, peso, altura, idade e objetivo."
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        erro: "GEMINI_API_KEY não configurada."
      });
    }

    const idadeNumero = Number(idade);
    const menorDeIdade = !Number.isNaN(idadeNumero) && idadeNumero < 18;

    const prompt = menorDeIdade
      ? `
Você é o NutriFlux, uma IA nutricional premium.

Crie uma resposta SEGURA, ÚTIL e COMPLETA para um usuário menor de idade.

Dados:
Nome: ${nome}
Peso: ${peso}kg
Altura: ${altura}cm
Idade: ${idade}
Objetivo: ${objetivo}

REGRAS:
- Responda em português do Brasil.
- Não escreva saudação.
- Não escreva introdução longa.
- Não faça prescrição agressiva.
- Não monte dieta restritiva.
- Foque em orientações gerais, hábitos saudáveis, regularidade alimentar e alimentos acessíveis.
- Oriente procurar nutricionista/responsável se quiser algo totalmente individualizado.
- Comece DIRETAMENTE na estrutura abaixo.
- Não pare no meio.

ESTRUTURA EXATA:

🔥 FOCO PRINCIPAL
- Objetivo informado: ...
- Estratégia segura: ...
- Prioridade nutricional: ...

🥗 ORIENTAÇÕES ALIMENTARES DO DIA
Café da manhã:
- ...
- ...

Almoço:
- ...
- ...

Jantar:
- ...
- ...

Lanches:
- ...
- ...

💡 DICAS
- ...
- ...
- ...

📌 AJUSTE FINAL
- ...
`
      : `
Você é o NutriFlux, uma IA nutricional premium.

Tarefa:
Crie um plano alimentar COMPLETO, direto e totalmente preenchido.

Dados do usuário:
Nome: ${nome}
Peso: ${peso}kg
Altura: ${altura}cm
Idade: ${idade}
Objetivo: ${objetivo}

REGRAS OBRIGATÓRIAS:
- Responda em português do Brasil.
- Não escreva introdução.
- Não escreva saudação.
- Não use frases como "Vamos estruturar", "Vamos começar", "Olá".
- Comece DIRETAMENTE em "🔥 CALORIAS DIÁRIAS".
- Não pare no meio.
- Preencha TODAS as seções.
- Use alimentos reais e acessíveis.
- Seja objetivo.
- Não escreva nada fora da estrutura abaixo.

ESTRUTURA EXATA DA RESPOSTA:

🔥 CALORIAS DIÁRIAS
- Faixa estimada: ...
- Proteína diária: ...
- Estratégia: ...

🥗 PLANO ALIMENTAR

Café da manhã:
- ...
- ...

Almoço:
- ...
- ...

Jantar:
- ...
- ...

Lanches:
- ...
- ...

💡 DICAS
- ...
- ...
- ...

📌 AJUSTE ESTRATÉGICO
- ...
`;

    const controller = new AbortController();
    const timeoutMs = 90000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    console.log("⏳ Chamando Gemini...");

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2200
          }
        }),
        signal: controller.signal
      }
    );

    clearTimeout(timeout);

    console.log(`📡 Gemini respondeu com status ${response.status}`);

    const data = await response.json();

    if (!response.ok) {
      console.log("❌ Erro retornado pelo Gemini:", JSON.stringify(data));
      return res.status(response.status).json({
        erro: data?.error?.message || "Erro ao consultar o Gemini",
        detalhes: data
      });
    }

    const texto = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("\n")
      .trim();

    const respostaValidaMenor =
      texto &&
      texto.includes("🔥 FOCO PRINCIPAL") &&
      texto.includes("🥗 ORIENTAÇÕES ALIMENTARES DO DIA") &&
      texto.includes("💡 DICAS") &&
      texto.includes("📌 AJUSTE FINAL");

    const respostaValidaAdulto =
      texto &&
      texto.includes("🔥 CALORIAS DIÁRIAS") &&
      texto.includes("🥗 PLANO ALIMENTAR") &&
      texto.includes("💡 DICAS") &&
      texto.includes("📌 AJUSTE ESTRATÉGICO");

    if ((menorDeIdade && !respostaValidaMenor) || (!menorDeIdade && !respostaValidaAdulto)) {
      console.log("❌ Gemini respondeu de forma incompleta");
      return res.status(502).json({
        erro: "A IA respondeu de forma incompleta. Tente novamente."
      });
    }

    console.log(`✅ Resposta gerada em ${Date.now() - startedAt}ms`);

    return res.json(data);
  } catch (error) {
    console.error("ERRO NO BACKEND:", error);

    if (error.name === "AbortError") {
      return res.status(504).json({
        erro: "A IA demorou demais para responder."
      });
    }

    return res.status(500).json({
      erro: "Erro interno no servidor."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🔥 Servidor rodando na porta ${PORT}`);
});