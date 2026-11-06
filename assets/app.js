import { criarIndice, buscar, montarContexto } from "./busca.js";

const CONFIG = window.UFG_CONFIG || {};
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

const estado = {
  documentos: [],
  trechos: [],
  exemplos: [],
  indice: null,
  modo: "exemplos",
  exemploAtual: null,
  docsPorId: new Map(),
  vivo: null,
  carregando: false,
};

const SISTEMA = `Você é o assistente de consulta documental da UFG. Responde a perguntas sobre documentos institucionais e mostra exatamente de onde tirou cada informação.

Regras:
1. Use exclusivamente os trechos fornecidos. Não use conhecimento externo.
2. Se os trechos não contiverem a resposta, diga que não encontrou nos documentos e explique o que faltou. Não invente.
3. Cite cada afirmação com o número do trecho entre colchetes, por exemplo [1] ou [2].
4. Prefira o trecho que responde diretamente à pergunta; ignore trechos tangenciais.
5. Se houver versão retificada, revista ou revogada, use a versão vigente e avise.
6. Não invente artigo, página, data, valor ou nome.
7. Responda em português, em no máximo quatro parágrafos curtos ou uma lista curta.
8. Se a pergunta pedir uma lista, liste os itens.
9. Se a lista for longa e os trechos não a contiverem inteira, resuma o que está disponível e diga que a lista completa está no artigo citado.
10. Em uma retificação, compare o que estava antes ("ONDE SE LÊ") com o que passa a valer ("LEIA-SE").
11. Quando a pergunta for sobre um órgão, confira se o trecho fala do órgão certo; não use trechos sobre outro conselho.

Formato de saída (JSON válido, sem texto fora do JSON):
{
  "resposta": "texto da resposta em português",
  "citacoes": [{"id": 1, "frase": "trecho curto e literal que sustenta a resposta"}],
  "encontrado": true,
  "observacao": "alerta de vigência, limite ou dúvida; string vazia se não houver"
}`;

function escapar(texto) {
  return String(texto ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function dedupeCitacoes(citacoes) {
  const vistos = new Set();
  const saida = [];
  for (const c of Array.isArray(citacoes) ? citacoes : []) {
    const id = typeof c === "number" ? c : Number(c?.id);
    if (!Number.isInteger(id) || vistos.has(id)) continue;
    vistos.add(id);
    saida.push({ id, frase: String(c?.frase || "") });
  }
  return saida;
}

function substituirCitacoes(seguro, idsValidos) {
  return seguro.replace(/\[(\d+(?:\s*[,;]\s*\d+)*)\]/g, (_, grupo) => {
    return grupo.split(/\s*[,;]\s*/).map((n) => {
      const id = Number(n);
      if (idsValidos.has(id)) {
        return `<button type="button" class="cite" data-cite="${id}" aria-label="Ir para a fonte ${id}">${id}</button>`;
      }
      return `<span class="cite-invalid" title="Citação fora do conjunto recuperado">${id}</span>`;
    }).join("");
  });
}

function inline(seguro, idsValidos) {
  let s = seguro.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = substituirCitacoes(s, idsValidos);
  return s;
}

function renderTexto(texto, idsValidos) {
  const seguro = escapar(texto).trim();
  if (!seguro) return '<p class="small">Sem texto de resposta.</p>';
  const blocos = seguro.split(/\n{2,}/);
  return blocos.map((bloco) => {
    const linhas = bloco.split("\n").map((l) => l.trim()).filter(Boolean);
    if (linhas.length && linhas.every((l) => /^[-*•]\s+/.test(l))) {
      return `<ul>${linhas.map((l) => `<li>${inline(l.replace(/^[-*•]\s+/, ""), idsValidos)}</li>`).join("")}</ul>`;
    }
    return `<p>${inline(bloco, idsValidos).replace(/\n/g, "<br>")}</p>`;
  }).join("");
}

function tagStatus(d) {
  const status = (d.status || "").toLowerCase();
  if (status.includes("retifica")) return '<span class="tag blue">retificação</span>';
  if (status.includes("orienta")) return '<span class="tag warn">orientação</span>';
  if (status.includes("vigente")) return '<span class="tag">vigente</span>';
  return `<span class="tag">${escapar(d.status || "—")}</span>`;
}

function nomeModelo(id) {
  const base = String(id || "").replace(/:cloud$/i, "");
  const m = (CONFIG.modelos || []).find((x) => x.id === base);
  return m ? m.nome : String(id || "");
}

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function urlPdf(doc, pagina) {
  if (!doc?.arquivo) return "#";
  return `documentos/${encodeURIComponent(doc.arquivo)}#page=${pagina}`;
}

function fonteHTML(t, i, citados, docsPorId, frases = new Map()) {
  const d = docsPorId.get(t.doc) || {};
  const titulo = d.titulo || t.doc;
  const local = [t.artigo, t.secao].filter(Boolean).join(" · ");
  const citado = citados.has(i);
  const url = urlPdf(d, t.pagina);
  const oficial = d.url_oficial || "#";
  const longo = (t.texto || "").length > 260;
  const texto = escapar(t.texto || "");
  const citacao = [titulo, t.artigo, `p. ${t.pagina}`].filter(Boolean).join(" · ");
  const frase = String(frases.get(i) || "").trim();
  return `<article class="fonte" id="fonte-${i}">
    <div class="fnum">${i}</div>
    <div>
      <div class="ftitulo">${escapar(titulo)} ${tagStatus(d)}</div>
      <div class="fmeta">${escapar(local || "Trecho")} · p. ${t.pagina}${d.data ? ` · ${escapar(d.data)}` : ""}</div>
      ${frase ? `<div class="frase-citada"><span>Trecho citado pelo modelo</span>“${escapar(frase)}”</div>` : ""}
      <div class="ftrecho${longo ? " longo" : ""}">${texto}</div>
      ${d.observacao ? `<p class="note">${escapar(d.observacao)}</p>` : ""}
      <div class="acoes">
        <a href="${escapar(url)}" data-pdf="${escapar(url)}" data-titulo="${escapar(titulo)}" data-pagina="${t.pagina}" data-oficial="${escapar(oficial)}">Abrir no PDF</a>
        <button type="button" data-acao="copiar" data-texto="${escapar(citacao)}">Copiar citação</button>
        ${longo ? '<button type="button" data-acao="expandir">Ver trecho completo</button>' : ""}
      </div>
    </div>
    <div class="nao-citado">${citado ? '<span class="tag">citado</span>' : "recuperado, não citado"}</div>
  </article>`;
}

function renderResultado(r) {
  const resultado = $("#demo-resultado");
  const vazio = $("#demo-vazio");
  if (!r) {
    resultado.hidden = true;
    vazio.hidden = false;
    return;
  }
  vazio.hidden = true;
  resultado.hidden = false;

  const recuperados = r.recuperados || [];
  const idsValidos = new Set(recuperados.map((_, i) => i + 1));
  const citacoes = dedupeCitacoes(r.citacoes);
  const citados = new Set(citacoes.map((c) => c.id).filter((id) => idsValidos.has(id)));
  const frases = new Map(citacoes.map((c) => [c.id, c.frase]));
  const invalidas = citacoes.filter((c) => !idsValidos.has(c.id)).length;
  const encontrado = r.encontrado !== false;

  $("#demo-pergunta").textContent = r.pergunta || "";
  const rotulo = r.carregando
    ? "Consultando o modelo…"
    : encontrado
      ? (r.fonte === "vivo" ? "Resposta ao vivo" : "Resposta gravada")
      : "Não encontrado no corpus";
  $("#demo-rotulo").textContent = rotulo;
  const card = $("#demo-resposta-card");
  card.classList.toggle("nao-encontrado", !encontrado && !r.carregando);

  if (r.carregando) {
    $("#demo-resposta").innerHTML = '<span class="carregando"><i></i><i></i><i></i> procurando nos trechos e redigindo…</span>';
  } else {
    $("#demo-resposta").innerHTML = renderTexto(r.resposta || "", idsValidos);
  }

  const obs = [];
  if (!encontrado && !r.carregando) {
    obs.push('<div class="alerta"><b>O assistente não encontrou a resposta nos documentos.</b> Isso é o comportamento esperado quando a informação não está no corpus. Confira as fontes recuperadas abaixo.</div>');
  }
  if (r.observacao) {
    obs.push(`<div class="alerta">${escapar(r.observacao)}</div>`);
  }
  $("#demo-observacao").innerHTML = obs.join("");

  const docsUnicos = new Set(recuperados.map((t) => t.doc));
  const chips = [];
  if (!r.carregando) {
    chips.push(`<span class="conf-item ${invalidas ? "warn" : "ok"}">Citações válidas: ${citacoes.length - invalidas}/${citacoes.length || 0}${invalidas ? ` · ${invalidas} inválida(s)` : ""}</span>`);
  }
  chips.push(`<span class="conf-item">Trechos recuperados: ${recuperados.length}</span>`);
  chips.push(`<span class="conf-item">Documentos: ${docsUnicos.size}</span>`);
  chips.push(`<span class="conf-item">Baseada em: ${citados.size} trecho(s)</span>`);
  chips.push(`<span class="conf-item">${r.fonte === "vivo" ? "Ao vivo" : "Gravada em " + (r.gerado_em || "—")}</span>`);
  if (r.modelo) chips.push(`<span class="conf-item">${escapar(nomeModelo(r.modelo))}</span>`);
  if (recuperados.some((t) => (estado.docsPorId.get(t.doc)?.status || "").includes("orienta"))) {
    chips.push('<span class="conf-item warn">Inclui material de apoio de 2015</span>');
  }
  if (recuperados.some((t) => (estado.docsPorId.get(t.doc)?.status || "").includes("retifica"))) {
    chips.push('<span class="conf-item warn">Inclui retificação: vale a versão mais nova</span>');
  }
  $("#demo-conferencia").innerHTML = chips.join("");

  $("#demo-fontes").innerHTML = `<h3>Fontes recuperadas, na ordem em que o modelo as viu</h3>` +
    recuperados.map((t, i) => fonteHTML(t, i + 1, citados, estado.docsPorId, frases)).join("");

  const contexto = r.contexto || (recuperados.length ? montarContexto(recuperados, estado.documentos) : "");
  $("#demo-contexto").textContent = contexto || "Sem contexto.";
  const baseNota = r.fonte === "vivo"
    ? "Trechos enviados ao modelo nesta pergunta, na ordem em que ele os viu. A busca aconteceu no seu navegador."
    : `Trechos enviados ao modelo em ${r.gerado_em || "—"}. A resposta foi gravada para funcionar sem chave.`;
  $("#demo-montagem-nota").textContent = `${baseNota} O modelo recebeu ${recuperados.length} trecho(s) e citou ${citados.size}; os não citados ficam visíveis para auditoria.`;
}

function selecionarExemplo(i, rolar = false) {
  const ex = estado.exemplos[i];
  if (!ex) return;
  estado.exemploAtual = i;
  $$("#lista-exemplos .example-btn").forEach((b, k) => b.classList.toggle("on", k === i));
  renderResultado({ ...ex, fonte: "gravado" });
  if (rolar && window.innerWidth < 960) {
    $("#demo-resultado").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function montarExemplos() {
  const lista = $("#lista-exemplos");
  lista.innerHTML = estado.exemplos.map((e, i) =>
    `<button type="button" class="example-btn" data-exemplo="${i}">
      <span class="n">${String(i + 1).padStart(2, "0")}</span>
      <span>${escapar(e.pergunta)}</span>
    </button>`
  ).join("");
  lista.addEventListener("click", (e) => {
    const b = e.target.closest("[data-exemplo]");
    if (b) selecionarExemplo(Number(b.dataset.exemplo), true);
  });
  if (estado.exemplos.length) {
    const primeiro = estado.exemplos[0];
    $("#nota-exemplos").textContent = `Respostas geradas em ${primeiro.gerado_em || "—"} com ${nomeModelo(primeiro.modelo)} e salvas na página.`;
    selecionarExemplo(0);
  }
}

function montarTabelaCorpus() {
  const tbody = $("#corpus-tbody");
  if (!tbody || !estado.documentos.length) return;
  const totalPaginas = estado.documentos.reduce((s, d) => s + (d.paginas || 0), 0);
  const totalTrechos = estado.documentos.reduce((s, d) => s + (d.trechos || 0), 0);
  tbody.innerHTML = estado.documentos.map((d) => {
    const url = d.arquivo ? `documentos/${encodeURIComponent(d.arquivo)}` : "#";
    return `<tr>
      <td><a href="${escapar(url)}" target="_blank" rel="noopener">${escapar(d.titulo)}</a><br><span class="small">${escapar(d.subtitulo || "")}</span></td>
      <td>${escapar(d.tipo || "")}</td>
      <td class="num-cell">${d.paginas || 0}</td>
      <td class="num-cell">${d.trechos || 0}</td>
      <td>${tagStatus(d)}</td>
    </tr>`;
  }).join("") + `<tr>
    <td><b>Total</b></td><td></td><td class="num-cell"><b>${totalPaginas}</b></td>
    <td class="num-cell"><b>${totalTrechos}</b></td><td></td>
  </tr>`;
}

function montarModelos() {
  const sel = $("#modelo");
  if (!sel) return;
  const modelos = CONFIG.modelos || [{ id: "deepseek-v4.1-flash", nome: "DeepSeek V4.1 Flash" }];
  sel.innerHTML = modelos.map((m) => `<option value="${escapar(m.id)}">${escapar(m.nome)}</option>`).join("");
  sel.value = CONFIG.modeloPadrao && modelos.some((m) => m.id === CONFIG.modeloPadrao)
    ? CONFIG.modeloPadrao
    : modelos[0].id;
}

function configurarChave() {
  const input = $("#chave");
  const lembrar = $("#lembrar");
  let salva = "";
  try { salva = sessionStorage.getItem("ufg.chave") || ""; } catch { /* modo privado */ }
  if (salva) {
    input.value = salva;
    lembrar.checked = true;
  }
  const guardar = () => {
    try {
      if (lembrar.checked && input.value.trim()) sessionStorage.setItem("ufg.chave", input.value.trim());
      else sessionStorage.removeItem("ufg.chave");
    } catch { /* sem sessionStorage */ }
  };
  input.addEventListener("input", guardar);
  lembrar.addEventListener("change", guardar);
  const limpar = document.createElement("button");
  limpar.type = "button";
  limpar.className = "btn secondary small";
  limpar.textContent = "limpar chave";
  limpar.style.marginTop = "6px";
  limpar.addEventListener("click", () => {
    input.value = "";
    lembrar.checked = false;
    try { sessionStorage.removeItem("ufg.chave"); } catch { /* ok */ }
    $("#status-live").textContent = "Chave apagada desta aba.";
    input.focus();
  });
  $(".field #chave").insertAdjacentElement("afterend", limpar);
}

function configurarTabs() {
  $$(".demo-tabs button").forEach((b) => {
    b.addEventListener("click", () => {
      estado.modo = b.dataset.modo;
      $$(".demo-tabs button").forEach((x) => {
        x.classList.toggle("on", x === b);
        x.setAttribute("aria-selected", x === b ? "true" : "false");
      });
      $("#painel-exemplos").hidden = estado.modo !== "exemplos";
      $("#painel-vivo").hidden = estado.modo !== "vivo";
      if (estado.modo === "vivo") {
        if (estado.vivo) {
          renderResultado(estado.vivo);
        } else {
          $("#demo-vazio").hidden = false;
          $("#demo-resultado").hidden = true;
          $("#demo-vazio").innerHTML = "<b>Cole a sua chave e faça uma pergunta.</b>A busca acontece no seu navegador; só a pergunta e os trechos recuperados vão para o modelo.";
        }
      } else if (estado.exemploAtual !== null) {
        renderResultado({ ...estado.exemplos[estado.exemploAtual], fonte: "gravado" });
      }
    });
  });
}

function erroAmigavel(status, corpo) {
  if (status === 401) return "Chave inválida ou sem permissão. Confira a chave em ollama.com/settings/keys.";
  if (status === 403) return "O proxy recusou a origem desta página. Confira as origens permitidas no Worker.";
  if (status === 429) return "Limite de uso atingido na Ollama. Tente outro modelo ou espere alguns minutos.";
  if (status >= 500) return "A Ollama ou o proxy estão indisponíveis agora. Tente de novo em instantes.";
  try {
    const j = JSON.parse(corpo);
    return j.error || `Erro ${status}.`;
  } catch {
    return `Erro ${status}.`;
  }
}

function extrairJSON(texto) {
  const limpo = String(texto || "").trim();
  try { return JSON.parse(limpo); } catch { /* tenta abaixo */ }
  const semCerca = limpo.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(semCerca); } catch { /* tenta abaixo */ }
  const ini = semCerca.indexOf("{");
  const fim = semCerca.lastIndexOf("}");
  if (ini >= 0 && fim > ini) {
    try { return JSON.parse(semCerca.slice(ini, fim + 1)); } catch { /* desiste */ }
  }
  return null;
}

async function perguntarVivo(pergunta) {
  const chave = $("#chave").value.trim().replace(/^Bearer\s+/i, "");
  const modelo = $("#modelo").value;
  const status = $("#status-live");
  const botao = $("#btn-perguntar");
  if (!chave) {
    status.className = "status-live erro";
    status.textContent = "Coloque a sua chave da Ollama Cloud antes de perguntar.";
    $("#chave").focus();
    return;
  }
  if (!CONFIG.proxyUrl || CONFIG.proxyUrl.includes("SEU-WORKER")) {
    status.className = "status-live erro";
    status.textContent = "O modo ao vivo está desativado: configure o proxy em assets/config.js.";
    return;
  }

  const recuperados = buscar(estado.indice, pergunta, { limite: 10, porDocumento: 6, porArtigo: 6 });
  if (!recuperados.length) {
    status.className = "status-live erro";
    status.textContent = "Não encontrei nem um trecho com essa pergunta. Tente reformular.";
    return;
  }
  const contexto = montarContexto(recuperados, estado.documentos);
  estado.vivo = {
    pergunta,
    resposta: "",
    citacoes: [],
    encontrado: null,
    observacao: "",
    recuperados,
    contexto,
    modelo,
    gerado_em: hoje(),
    fonte: "vivo",
    carregando: true,
  };
  renderResultado(estado.vivo);
  if (window.innerWidth < 960) $("#demo-resultado").scrollIntoView({ behavior: "smooth", block: "start" });

  botao.disabled = true;
  botao.textContent = "Consultando…";
  status.className = "status-live";
  status.textContent = "Buscando trechos e consultando o modelo…";
  const aviso = setTimeout(() => {
    if (estado.carregando) status.textContent = "Ainda consultando. O modelo pode levar até um minuto.";
  }, 15000);

  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), 120000);
  try {
    const r = await fetch(CONFIG.proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${chave}`,
      },
      body: JSON.stringify({
        model: modelo,
        messages: [
          { role: "system", content: SISTEMA },
          { role: "user", content: `Pergunta: ${pergunta}\n\nTrechos recuperados:\n\n${contexto}` },
        ],
        stream: false,
        format: "json",
        options: { temperature: 0.1, num_ctx: 8192 },
      }),
      signal: controle.signal,
    });
    const corpo = await r.text();
    if (!r.ok) throw new Error(erroAmigavel(r.status, corpo));
    let dados;
    try { dados = JSON.parse(corpo); } catch { throw new Error("O proxy devolveu uma resposta que não é JSON."); }
    const texto = dados?.message?.content || "";
    const json = extrairJSON(texto);
    if (!json) {
      estado.vivo = {
        ...estado.vivo,
        resposta: texto || "O modelo não devolveu texto.",
        citacoes: [],
        encontrado: null,
        observacao: "A resposta não veio no formato JSON pedido. Mostrando o texto bruto.",
        carregando: false,
      };
    } else {
      const marcadoFalso = json.encontrado === false || String(json.encontrado).toLowerCase() === "false";
      estado.vivo = {
        ...estado.vivo,
        resposta: String(json.resposta || "").trim(),
        citacoes: dedupeCitacoes(json.citacoes),
        encontrado: !marcadoFalso,
        observacao: String(json.observacao || "").trim(),
        carregando: false,
      };
    }
    renderResultado(estado.vivo);
    status.textContent = "Resposta concluída. Confira as fontes abaixo.";
  } catch (e) {
    const msg = e.name === "AbortError"
      ? "A consulta demorou mais de 2 minutos e foi cancelada. Tente de novo."
      : (e.message || "Não consegui falar com o proxy.");
    estado.vivo = {
      ...estado.vivo,
      resposta: "",
      encontrado: null,
      carregando: false,
      observacao: "",
    };
    renderResultado(estado.vivo);
    $("#demo-resposta").innerHTML = `<p><b>Não foi possível concluir a resposta.</b></p><p>${escapar(msg)}</p><p class="small">Os trechos recuperados continuam abaixo: a busca funcionou; a falha foi na chamada ao modelo.</p>`;
    $("#demo-rotulo").textContent = "Falha na consulta";
    status.className = "status-live erro";
    status.textContent = msg;
  } finally {
    clearTimeout(timer);
    clearTimeout(aviso);
    estado.carregando = false;
    botao.disabled = false;
    botao.textContent = "Perguntar";
  }
}

function configurarFormulario() {
  $("#form-pergunta").addEventListener("submit", (e) => {
    e.preventDefault();
    const pergunta = $("#pergunta").value.trim();
    if (pergunta.length < 3) {
      $("#status-live").className = "status-live erro";
      $("#status-live").textContent = "Escreva uma pergunta com pelo menos 3 caracteres.";
      return;
    }
    if (estado.carregando) return;
    estado.carregando = true;
    perguntarVivo(pergunta).finally(() => { estado.carregando = false; });
  });
}

function configurarModal() {
  const modal = $("#modal");
  const iframe = $("#modal-iframe");
  const titulo = $("#modal-titulo");
  const pagina = $("#modal-pagina");
  const link = $("#modal-link");
  const oficial = $("#modal-oficial");
  const fechar = () => {
    modal.hidden = true;
    iframe.src = "about:blank";
  };
  $("#modal-fechar").addEventListener("click", fechar);
  modal.addEventListener("click", (e) => { if (e.target === modal) fechar(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) fechar(); });
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-pdf]");
    if (!a) return;
    e.preventDefault();
    titulo.textContent = a.dataset.titulo || "Documento";
    pagina.textContent = `p. ${a.dataset.pagina}`;
    iframe.src = a.dataset.pdf;
    link.href = a.dataset.pdf;
    oficial.href = a.dataset.oficial || "#";
    modal.hidden = false;
    $("#modal-fechar").focus();
  });
}

function configurarAcoesDemo() {
  $("#demo").addEventListener("click", async (e) => {
    const cite = e.target.closest(".cite[data-cite]");
    if (cite) {
      const alvo = document.getElementById(`fonte-${cite.dataset.cite}`);
      if (alvo) {
        alvo.scrollIntoView({ behavior: "smooth", block: "center" });
        alvo.classList.add("flash");
        setTimeout(() => alvo.classList.remove("flash"), 1800);
      }
      return;
    }
    const expandir = e.target.closest('[data-acao="expandir"]');
    if (expandir) {
      const trecho = expandir.closest(".fonte")?.querySelector(".ftrecho");
      if (trecho) {
        trecho.classList.remove("longo");
        expandir.remove();
      }
      return;
    }
    const copiar = e.target.closest('[data-acao="copiar"]');
    if (copiar) {
      const texto = copiar.dataset.texto || "";
      try {
        await navigator.clipboard.writeText(texto);
        const antes = copiar.textContent;
        copiar.textContent = "copiado";
        setTimeout(() => { copiar.textContent = antes; }, 1400);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = texto;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch { /* sem cópia */ }
        ta.remove();
      }
    }
  });
}

function configurarNav() {
  const secoes = $$("section");
  const links = $$("nav a");
  const atual = () => {
    const y = window.scrollY + 120;
    let i = 0;
    secoes.forEach((s, k) => { if (s.offsetTop <= y) i = k; });
    return i;
  };
  const marcar = () => {
    const i = atual();
    links.forEach((a, k) => a.classList.toggle("on", k === i));
  };
  window.addEventListener("scroll", marcar, { passive: true });
  marcar();
  document.addEventListener("keydown", (e) => {
    if (!["ArrowRight", "ArrowLeft", "PageDown", "PageUp"].includes(e.key)) return;
    const alvo = e.target;
    if (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return;
    if (!$("#modal").hidden) return;
    const i = atual();
    const j = (e.key === "ArrowRight" || e.key === "PageDown")
      ? Math.min(i + 1, secoes.length - 1)
      : Math.max(i - 1, 0);
    e.preventDefault();
    secoes[j].scrollIntoView({ behavior: "smooth" });
  });
}

function mostrarErroCarregamento(msg) {
  const vazio = $("#demo-vazio");
  if (!vazio) return;
  vazio.hidden = false;
  vazio.innerHTML = `<b>Não consegui carregar o corpus.</b>${escapar(msg)}<br><br>
    Se você abriu o arquivo direto no disco, rode um servidor local na pasta:<br>
    <code>python -m http.server 8000</code><br>e acesse <code>http://localhost:8000</code>.`;
}

async function iniciar() {
  configurarNav();
  configurarTabs();
  configurarChave();
  configurarFormulario();
  configurarModal();
  configurarAcoesDemo();
  montarModelos();

  if (!CONFIG.proxyUrl || CONFIG.proxyUrl.includes("SEU-WORKER")) {
    $("#aviso-proxy").hidden = false;
    $("#aviso-proxy").innerHTML = "<b>Modo ao vivo desativado.</b> Configure o endereço do proxy em <code>assets/config.js</code>.";
  }

  try {
    const [rd, rt, re] = await Promise.all([
      fetch("dados/documentos.json"),
      fetch("dados/trechos.json"),
      fetch("dados/exemplos.json"),
    ]);
    if (!rd.ok || !rt.ok || !re.ok) throw new Error("Arquivos de dados não encontrados.");
    estado.documentos = await rd.json();
    estado.trechos = await rt.json();
    estado.exemplos = await re.json();
    estado.docsPorId = new Map(estado.documentos.map((d) => [d.id, d]));
    estado.indice = criarIndice(estado.trechos, estado.documentos);
    montarTabelaCorpus();
    montarExemplos();
  } catch (e) {
    mostrarErroCarregamento(e.message || String(e));
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciar);
} else {
  iniciar();
}
