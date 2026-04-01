const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend NutriFlux online");
});

app.post("/gerar", async (req, res) => {
  try {
    const { peso, altura, idade, objetivo } = req.body;

    if (!peso || !altura || !idade || !objetivo) {
      return res.status(400).json({
        erro: "Dados incompletos. Envie peso, altura, idade e objetivo."
      });
    }

    const prompt = `
Você é um nutricionista premium, moderno e prático.

Monte um plano alimentar claro, bonito e objetivo com base nestes dados:

Peso: ${peso}kg
Altura: ${altura}cm
Idade: ${idade}
Objetivo: ${objetivo}

Regras:
- Responda em português do Brasil.
- Seja útil e direto.
- Use alimentos reais e acessíveis.
- Não use texto genérico.
- Estruture de forma bonita.

Formato exato da resposta:

🔥 CALORIAS DIÁRIAS
(valor estimado + breve observação)

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
(uma recomendação final curta)
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": "AIzaSyAEqpASb3cX6G8LsHonigbMs-_uoPrFVy0"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        erro: data?.error?.message || "Erro ao consultar o Gemini"
      });
    }

    return res.json(data);
  } catch (error) {
    console.error("ERRO NO BACKEND:", error);
    return res.status(500).json({
      erro: "Erro interno no servidor"
    });
  }
});

app.listen(3000, () => {
  console.log("🔥 Servidor rodando na porta 3000");
});