function formatarTexto(texto) {
  const linhas = texto.split("\n");
  let html = "";
  let emLista = false;

  for (const linhaBruta of linhas) {
    const linha = linhaBruta.trim();

    if (!linha) {
      if (emLista) {
        html += "</ul>";
        emLista = false;
      }
      continue;
    }

    if (
      linha.startsWith("🔥") ||
      linha.startsWith("🥗") ||
      linha.startsWith("💡") ||
      linha.startsWith("📌")
    ) {
      if (emLista) {
        html += "</ul>";
        emLista = false;
      }
      html += `<h2>${linha}</h2>`;
      continue;
    }

    if (linha.startsWith("- ")) {
      if (!emLista) {
        html += "<ul>";
        emLista = true;
      }
      html += `<li>${linha.replace("- ", "")}</li>`;
      continue;
    }

    if (emLista) {
      html += "</ul>";
      emLista = false;
    }

    if (linha.endsWith(":")) {
      html += `<h3>${linha}</h3>`;
    } else {
      html += `<p>${linha}</p>`;
    }
  }

  if (emLista) {
    html += "</ul>";
  }

  return html;
}

function mostrarLoading() {
  return `
    <div class="loading-wrap">
      <div class="loading-title">Gerando seu plano NutriFlux...</div>
      <div class="loading-bar"><span></span></div>
      <div class="loading-note">
        A IA está montando um plano alimentar com estrutura premium.
      </div>
    </div>
  `;
}

async function gerarDieta() {
  const peso = document.getElementById("peso").value.trim();
  const altura = document.getElementById("altura").value.trim();
  const idade = document.getElementById("idade").value.trim();
  const objetivo = document.getElementById("objetivo").value;
  const resultado = document.getElementById("resultado");
  const gerarBtn = document.getElementById("gerarBtn");

  if (!peso || !altura || !idade || !objetivo) {
    resultado.innerHTML = `
      <div class="placeholder">
        <div class="placeholder-icon">⚠️</div>
        <h3>Dados incompletos</h3>
        <p>Preencha peso, altura, idade e objetivo antes de gerar o plano.</p>
      </div>
    `;
    return;
  }

  gerarBtn.disabled = true;
  gerarBtn.textContent = "Gerando...";
  resultado.innerHTML = mostrarLoading();

  try {
    const response = await fetch("https://nutriflux-1.onrender.com/gerar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        peso,
        altura,
        idade,
        objetivo
      })
    });

    const data = await response.json();

    if (!response.ok) {
      resultado.innerHTML = `
        <div class="placeholder">
          <div class="placeholder-icon">❌</div>
          <h3>Erro ao gerar plano</h3>
          <p>${data?.erro || "O backend retornou um erro."}</p>
        </div>
      `;
      return;
    }

    const texto = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("\n")
      .trim();

    if (!texto) {
      resultado.innerHTML = `
        <div class="placeholder">
          <div class="placeholder-icon">❌</div>
          <h3>Resposta vazia</h3>
          <p>A IA respondeu sem texto utilizável.</p>
        </div>
      `;
      return;
    }

    resultado.innerHTML = formatarTexto(texto);
  } catch (erro) {
    console.error("ERRO DE CONEXÃO:", erro);
    resultado.innerHTML = `
      <div class="placeholder">
        <div class="placeholder-icon">🌐</div>
        <h3>Erro de conexão</h3>
        <p>Não consegui falar com o backend em https://nutriflux-1.onrender.com/gerar.</p>
      </div>
    `;
  } finally {
    gerarBtn.disabled = false;
    gerarBtn.textContent = "Gerar plano NutriFlux";
  }
}

async function copiarResultado() {
  const resultado = document.getElementById("resultado");
  const texto = resultado.innerText.trim();

  if (!texto || texto.includes("Seu plano vai aparecer aqui")) {
    return;
  }

  try {
    await navigator.clipboard.writeText(texto);
    const botao = document.getElementById("copiarBtn");
    const original = botao.textContent;
    botao.textContent = "Copiado";
    setTimeout(() => {
      botao.textContent = original;
    }, 1200);
  } catch (erro) {
    console.error("Erro ao copiar:", erro);
  }
}