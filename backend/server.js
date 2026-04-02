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
      console.log("❌ Dados incompletos");
      return res.status(400).json({
        erro: "Preencha nome, peso, altura, idade e objetivo."
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.log("❌ GEMINI_API_KEY não configurada");
      return res.status(500).json({
        erro: "GEMINI_API_KEY não configurada."
      });
    }

    const prompt = `
Você é o NutriFlux, uma IA nutricional premium, prática e moderna.

Crie um plano alimentar personalizado para o usuário abaixo:

Nome: ${nome}
Peso: ${peso}kg
Altura: ${altura}cm
Idade: ${idade}
Objetivo: ${objetivo}

Regras:
- Responda em português do Brasil.
- Seja objetivo e útil.
- Use alimentos reais e acessíveis.
- Não use linguagem genérica.
- Organize de forma bonita.
- Faça parecer uma consultoria premium.

Formato exato da resposta:

🔥 CALORIAS DIÁRIAS
(valor estimado + observação curta)

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
(uma recomendação final curta e inteligente)
`;

    const controller = new AbortController();
    const timeoutMs = 90000;
    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

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
            temperature: 0.8,
            maxOutputTokens: 1200
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

    if (!texto) {
      console.log("❌ Gemini respondeu sem texto útil");
      return res.status(502).json({
        erro: "A IA respondeu sem conteúdo."
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