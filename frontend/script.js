const API_URL = "https://nutriflux-1.onrender.com/gerar";

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
      <div class="loading-title">⚡ Criando seu plano NutriFlux...</div>
      <div class="loading-bar"><span></span></div>
      <div class="loading-note">
        Analisando seu perfil e montando um plano alimentar premium.
      </div>
    </div>
  `;
}

function restaurarUltimaDieta() {
  const resultado = document.getElementById("resultado");
  const ultima = localStorage.getItem("nutriflux_ultima_dieta");

  if (!ultima) return;
  resultado.innerHTML = ultima;
}

async function gerarDieta() {
  const nome = document.getElementById("nome").value.trim();
  const peso = document.getElementById("peso").value.trim();
  const altura = document.getElementById("altura").value.trim();
  const idade = document.getElementById("idade").value.trim();
  const objetivo = document.getElementById("objetivo").value;
  const resultado = document.getElementById("resultado");
  const gerarBtn = document.getElementById("gerarBtn");

  if (!nome || !peso || !altura || !idade || !objetivo) {
    resultado.innerHTML = `
      <div class="placeholder">
        <div class="placeholder-icon">⚠️</div>
        <h3>Dados incompletos</h3>
        <p>Preencha nome, peso, altura, idade e objetivo antes de gerar o plano.</p>
      </div>
    `;
    return;
  }

  gerarBtn.disabled = true;
  gerarBtn.textContent = "Gerando...";
  resultado.innerHTML = mostrarLoading();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 100000);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        nome,
        peso,
        altura,
        idade,
        objetivo
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

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

    const htmlFinal = formatarTexto(texto);
    resultado.innerHTML = htmlFinal;
    localStorage.setItem("nutriflux_ultima_dieta", htmlFinal);
  } catch (erro) {
    console.error("ERRO DE CONEXÃO:", erro);

    if (erro.name === "AbortError") {
      resultado.innerHTML = `
        <div class="placeholder">
          <div class="placeholder-icon">⏳</div>
          <h3>A requisição demorou demais</h3>
          <p>Tente novamente em alguns segundos.</p>
        </div>
      `;
    } else {
      resultado.innerHTML = `
        <div class="placeholder">
          <div class="placeholder-icon">🌐</div>
          <h3>Erro de conexão</h3>
          <p>Não consegui falar com o backend do NutriFlux.</p>
        </div>
      `;
    }
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

window.addEventListener("DOMContentLoaded", restaurarUltimaDieta);