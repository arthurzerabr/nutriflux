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
Você é o NutriFlux.

Crie uma resposta CURTA, COMPLETA e SEGURA para um usuário menor de idade.

Dados:
Nome: ${nome}
Peso: ${peso}kg
Altura: ${altura}cm
Idade: ${idade}
Objetivo: ${objetivo}

REGRAS:
- Responda em português do Brasil.
- Sem saudação.
- Sem introdução.
- Sem texto motivacional.
- Seja curto e direto.
- Não pare no meio.
- Use no máximo 2 itens por seção.
- Comece direto na estrutura abaixo.

ESTRUTURA EXATA:

🔥 FOCO PRINCIPAL
- Objetivo: ...
- Estratégia segura: ...

🥗 ORIENTAÇÕES DO DIA
Café da manhã:
- ...
- ...

Almoço:
- ...
- ...

Jantar:
- ...
- ...

💡 DICAS
- ...
- ...

📌 AJUSTE FINAL
- ...
`
      : `
Você é o NutriFlux.

Crie um plano alimentar CURTO, COMPLETO e DIRETO.

Dados:
Nome: ${nome}
Peso: ${peso}kg
Altura: ${altura}cm
Idade: ${idade}
Objetivo: ${objetivo}

REGRAS:
- Responda em português do Brasil.
- Sem saudação.
- Sem introdução.
- Sem texto motivacional.
- Não use frases como "Vamos estruturar".
- Comece direto em "🔥 CALORIAS DIÁRIAS".
- Não pare no meio.
- Use no máximo 2 itens por seção.
- Seja curto e objetivo.
- Não escreva nada fora da estrutura abaixo.

ESTRUTURA EXATA:

🔥 CALORIAS DIÁRIAS
- Faixa estimada: ...
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

💡 DICAS
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
            temperature: 0.2,
            maxOutputTokens: 1800
          }
        }),
        signal: controller.signal
      }
    );

    clearTimeout(timeout);

    console.log(`📡 Gemini respondeu com status ${response.status}`);

    const data = await response.json();

    console.log("🧾 finishReason:", data?.candidates?.[0]?.finishReason || "sem finishReason");

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
      texto.includes("🥗 ORIENTAÇÕES DO DIA") &&
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
      console.log("📝 Texto recebido:", texto);
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