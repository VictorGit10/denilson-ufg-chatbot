/* Busca lexical (BM25) do protótipo.
 *
 * Sem dependências: roda no navegador e no Node (para a avaliação).
 * A ideia é simples de auditar: tokenização, radicais leves, sinônimos e BM25.
 * O índice é montado no navegador a partir de dados/trechos.json (1.159 trechos).
 */

const STOPWORDS = new Set(`
a o as os um uma uns umas de do da dos das em no na nos nas por pelo pela pelos pelas
para pra com sem sob sobre entre e ou mas que se como quando onde qual quais quem cujo cuja
ao aos à às num numa deste desta destes destas nesse nessa nesses nessas
aquele aquela aqueles aquelas isto isso aquilo ja ainda tambem muito mais menos sim
foi foram ser estar esta estao tem ter ha haver pode podem poder deve devem dever
seu sua seus suas meu minha meus minhas teu tua teus tuas lhe lhes me te nos vos
`.split(/\s+/).filter(Boolean));

const SINONIMOS = {
  rgcg: ["regulamento", "geral", "cursos", "graduacao"],
  pdi: ["plano", "desenvolvimento", "institucional"],
  pos: ["pos", "graduacao", "stricto", "sensu"],
  "pos-graduacao": ["pos", "graduacao", "stricto", "sensu"],
  aprovacao: ["aprovar", "aprovado"],
  aprovado: ["aprovar", "aprovacao"],
  aproveitado: ["aproveitar", "aproveitamento"],
  aproveitar: ["aproveitamento", "aproveitado"],
  aproveitamento: ["aproveitar", "aproveitado"],
  validacao: ["validar", "valido"],
  valido: ["validacao", "validar"],
  preside: ["presidido", "presidente", "presidir"],
  presidido: ["preside", "presidente", "presidir"],
  presidente: ["preside", "presidido", "presidir"],
  documento: ["convenio", "comprovante", "termo", "plano"],
  documentos: ["convenio", "comprovante", "termo", "plano"],
  trancamento: ["trancar", "trancado"],
  competencia: ["atribuicao", "atribuicoes"],
  competencias: ["atribuicao", "atribuicoes"],
  composicao: ["membros", "compoe", "compor"],
  requisito: ["condicao", "exigencia"],
  requisitos: ["condicoes", "exigencias"],
  prazo: ["data", "cronograma", "periodo"],
  prazos: ["datas", "cronograma", "periodos"],
  bolsa: ["auxilio", "remuneracao"],
  bolsas: ["auxilios", "remuneracoes"],
  monitoria: ["monitor", "monitores"],
  estagio: ["estagiario", "supervisionado"],
  estagiario: ["estagio"],
  docente: ["professor", "professores"],
  discente: ["aluno", "estudante"],
  discentes: ["alunos", "estudantes"],
  servidor: ["tecnico", "administrativo"],
  acessibilidade: ["inclusao", "inclusivo"],
  "nao obrigatorio": ["extracurricular"],
  "nao-obrigatorio": ["extracurricular"],
};

function semAcento(texto) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizar(texto) {
  return semAcento(String(texto).toLowerCase())
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function radical(palavra) {
  let p = palavra;
  if (p.length <= 3) return p;
  if (p.endsWith("oes")) return p.slice(0, -3) + "ao";
  if (p.endsWith("aes")) return p.slice(0, -3) + "ao";
  if (p.endsWith("ais")) return p.slice(0, -3) + "al";
  if (p.endsWith("eis")) return p.slice(0, -3) + "el";
  if (p.endsWith("ois")) return p.slice(0, -3) + "ol";
  if (p.endsWith("ns")) return p.slice(0, -2) + "m";
  if (/(ores|ares|eres|ires)$/.test(p)) return p.slice(0, -2);
  if (p.endsWith("es") && p.length > 5) return p.slice(0, -1);
  if (p.endsWith("s") && !p.endsWith("ss") && p.length > 4) return p.slice(0, -1);
  return p;
}

export function tokenizar(texto, { expands = false } = {}) {
  const base = normalizar(texto)
    .split(" ")
    .filter((p) => p.length > 1 && !STOPWORDS.has(p));
  const tokens = base.map(radical);
  if (!expands) return tokens;
  const extras = [];
  for (const t of tokens) {
    const chave = Object.keys(SINONIMOS).find((k) => normalizar(k) === t);
    if (chave) {
      for (const s of SINONIMOS[chave]) {
        extras.push(...normalizar(s).split(" ").map(radical));
      }
    }
  }
  return [...new Set([...tokens, ...extras])];
}

function contar(tokens) {
  const tf = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  return tf;
}

/**
 * @param {Array<{id:string,doc:string,pagina:number,artigo:string,secao:string,texto:string}>} trechos
 * @param {Array<{id:string,titulo:string,subtitulo:string}>} documentos
 */
export function criarIndice(trechos, documentos) {
  const porId = new Map(documentos.map((d) => [d.id, d]));
  const docs = trechos.map((t) => {
    const d = porId.get(t.doc) || { titulo: "", subtitulo: "" };
    const titulo = `${d.titulo} ${d.subtitulo || ""}`;
    const meta = `${t.artigo} ${t.secao}`;
    // repetir título, artigo e seção dá um empurrão de roteamento sem esconder o texto
    const tokens = [
      ...tokenizar(t.texto),
      ...tokenizar(titulo),
      ...tokenizar(titulo),
      ...tokenizar(t.artigo),
      ...tokenizar(t.artigo),
      ...tokenizar(t.artigo),
      ...tokenizar(t.secao),
      ...tokenizar(t.secao),
      ...tokenizar(t.contexto || ""),
      ...tokenizar(meta),
    ];
    return {
      ...t,
      tf: contar(tokens),
      dl: tokens.length,
      textoNorm: normalizar(t.texto),
      contextoNorm: normalizar(t.contexto || ""),
      tituloNorm: normalizar(titulo),
    };
  });
  const df = new Map();
  for (const d of docs) {
    for (const termo of d.tf.keys()) df.set(termo, (df.get(termo) || 0) + 1);
  }
  const avgdl = docs.reduce((s, d) => s + d.dl, 0) / Math.max(docs.length, 1);
  return { docs, df, avgdl, N: docs.length, documentos, porId };
}

const K1 = 1.5;
const B = 0.75;

function idf(indice, termo) {
  const n = indice.df.get(termo) || 0;
  return Math.log(1 + (indice.N - n + 0.5) / (n + 0.5));
}

function pontuar(indice, doc, termos) {
  let score = 0;
  for (const termo of termos) {
    const f = doc.tf.get(termo);
    if (!f) continue;
    const denominador = f + K1 * (1 - B + (B * doc.dl) / indice.avgdl);
    score += idf(indice, termo) * ((f * (K1 + 1)) / denominador);
  }
  return score;
}

function detectarDoc(consulta) {
  const q = normalizar(consulta);
  const regras = [
    [/\bestatuto\b/, "estatuto"],
    [/\bregimento\b/, "regimento"],
    [/\brgcg\b|\bregulamento geral dos cursos de graduacao\b/, "rgcg"],
    [/\bpdi\b|\bplano de desenvolvimento institucional\b/, "pdi"],
    [/\bpos graduacao\b|\bpos-graduacao\b|\bstricto sensu\b/, "pos"],
    [/\bfaq\b|\bdividas frequentes\b|\bcaderno de duvidas\b/, "faq_estagio"],
    [/\bedital\b.*\bmonitoria\b|\bmonitoria\b.*\bedital\b/, "edital_monitoria"],
    [/\bretificacao\b.*\bmonitoria\b/, "edital_monitoria_retificacao"],
    [/\btranc(ar|amento)\b/, "rgcg"],
    [/\bconselho de integracao\b/, "estatuto"],
  ];
  for (const [re, id] of regras) if (re.test(q)) return id;
  return "";
}

function detectarArtigo(consulta) {
  const m = normalizar(consulta).match(/\bart(?:igo)?\.?\s*(\d{1,3})\b/);
  return m ? `Art. ${Number(m[1])}` : "";
}

function frasesDeInteresse(consulta) {
  const q = normalizar(consulta);
  const frases = [];
  for (const f of ["nao obrigatorio", "nao-obrigatorio", "estagio supervisionado", "pos graduacao"]) {
    if (q.includes(normalizar(f))) frases.push(normalizar(f));
  }
  if (q.includes("consuni")) frases.push("conselho universitario");
  if (q.includes("cepec")) frases.push("conselho de ensino pesquisa extensao e cultura");
  return frases;
}

function ajusteDeResposta(doc, consulta) {
  const q = normalizar(consulta);
  const t = doc.textoNorm;
  const ctx = doc.contextoNorm || "";
  let ajuste = 0;
  const pedeLista = /\b(quais|liste|elenque|competencias|atribuicoes)\b/.test(q);
  if (pedeLista) {
    // um trecho que apenas aponta para outro documento não responde "quais são"
    if (/(definidas no estatuto|definidas em lei|nos termos do estatuto|conforme o estatuto|estabelecidas no estatuto)/.test(t)) {
      ajuste -= 4;
    }
    if (/(tera por atribuicoes|sao atribuicoes|compete ao|compete a|cabe ao|cabe a)/.test(t + " " + ctx)) {
      ajuste += 3;
    }
    const marcadores = (t.match(/\b(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)-/g) || []).length;
    if (marcadores >= 3) ajuste += 2;
  }
  return ajuste;
}

function ajusteDeEntidade(doc, consulta) {
  const q = normalizar(consulta);
  const ctx = `${doc.contextoNorm || ""} ${doc.textoNorm}`;
  for (const e of ["consuni", "cepec", "conselho de curadores", "conselho gestor", "colegiado"]) {
    if (q.includes(e) && ctx.includes(e)) return 3;
  }
  return 0;
}

function ajustePorTipoDePergunta(doc, consulta) {
  const q = normalizar(consulta);
  const t = doc.textoNorm;
  const raw = doc.texto || "";
  let ajuste = 0;
  // a pergunta pede um valor: o trecho que traz R$ responde melhor
  if (/\b(valor|quanto|custa|preco|remuneracao|bolsa)\b/.test(q) && /R\$\s?\d/.test(raw)) ajuste += 3;
  // a pergunta pede um prazo: o trecho com data responde melhor
  if (/\b(prazo|prazos|quando|data|ate)\b/.test(q) && /\d{2}\/\d{2}\/\d{4}/.test(raw)) ajuste += 4;
  // a pergunta pede nota/aprovação: o trecho com a regra numérica responde melhor
  if (/\b(nota|media|aprovacao|aprovado)\b/.test(q) && /(seis virgula zero|6,0|nota final)/.test(raw.toLowerCase())) ajuste += 2;
  // a pergunta é sobre os objetivos do PDI: o trecho com a lista de OEs responde melhor
  if (/objetivos? estrategicos?/.test(q)) {
    const oes = (t.match(/objetivo estrategico/g) || []).length;
    if (oes >= 3) ajuste += 4;
  }
  // presencial x a distância: não misturar as duas regras
  if (/\bpresencia(l|is)\b/.test(q) && /(cursos? a distancia|modalidade a distancia)/.test(t)) ajuste -= 3;
  if (/\ba distancia\b/.test(q) && /presencia/.test(t) && !/a distancia/.test(t)) ajuste -= 2;
  // "quantos semestres" pede o limite, não a regra de validade de cada trancamento
  if (/\bquantos?\b/.test(q) && /\btranc/.test(q) && /(quatro 4 semestres|quatro semestres)/.test(t)) ajuste += 3;
  // documentos de estágio: o trecho que lista convênio, termo e plano responde melhor
  if (/\bdocumentos?\b/.test(q) && /(convenio|comprovante|termo de compromisso|plano de estagio)/.test(t)) ajuste += 2.5;
  // submissão com data: o cronograma responde melhor que a introdução
  if (/\bsubmissao\b/.test(q) && /submissao/.test(t) && /\d{2}\/\d{2}\/\d{4}/.test(raw)) ajuste += 2;
  // "banca examinadora" é uma regra específica; não deve vencer a regra geral
  if (/\bdisciplina\b/.test(q) && !/\bbanca\b/.test(q) && /banca examinadora/.test(`${t} ${doc.contextoNorm || ""}`)) ajuste -= 3;
  return ajuste;
}

/**
 * @param {ReturnType<typeof criarIndice>} indice
 * @param {string} consulta
 * @param {{limite?:number, porDocumento?:number}} [opcoes]
 */
export function buscar(indice, consulta, opcoes = {}) {
  const limite = opcoes.limite ?? 8;
  const porDocumento = opcoes.porDocumento ?? 3;
  const termosBase = tokenizar(consulta);
  const termos = tokenizar(consulta, { expands: true });
  if (!termos.length) return [];
  const docFiltro = detectarDoc(consulta);
  const artigoFiltro = detectarArtigo(consulta);
  const frases = frasesDeInteresse(consulta);
  const termosUnicos = [...new Set(termosBase)];

  const candidatos = indice.docs.map((doc) => {
    let score = pontuar(indice, doc, termos);
    // cobertura: um trecho que responde a todos os termos vale mais que um trecho curto
    // que só repete uma palavra comum da pergunta
    if (termosUnicos.length) {
      const cobertos = termosUnicos.filter((t) => doc.tf.has(t)).length;
      const cobertura = cobertos / termosUnicos.length;
      score *= 0.55 + 0.45 * cobertura;
    }
    score += ajusteDeResposta(doc, consulta);
    score += ajusteDeEntidade(doc, consulta);
    score += ajustePorTipoDePergunta(doc, consulta);
    if (docFiltro && doc.doc === docFiltro) score += 2.2;
    if (artigoFiltro && normalizar(doc.artigo) === normalizar(artigoFiltro)) score += 4.5;
    for (const f of frases) {
      if (doc.textoNorm.includes(f)) score += 1.8;
    }
    return { doc, score };
  });

  candidatos.sort((a, b) => b.score - a.score);

  // diversidade: no máximo N trechos por documento e por artigo
  const escolhidos = [];
  const porDoc = new Map();
  const porArtigo = new Map();
  for (const c of candidatos) {
    if (c.score <= 0) break;
    const chaveArtigo = `${c.doc.doc}|${c.doc.artigo || "p" + c.doc.pagina}`;
    if ((porArtigo.get(chaveArtigo) || 0) >= (opcoes.porArtigo ?? 3)) continue;
    if ((porDoc.get(c.doc.doc) || 0) >= porDocumento) continue;
    escolhidos.push(c);
    porArtigo.set(chaveArtigo, (porArtigo.get(chaveArtigo) || 0) + 1);
    porDoc.set(c.doc.doc, (porDoc.get(c.doc.doc) || 0) + 1);
    if (escolhidos.length >= limite) break;
  }
  // se a diversidade cortou demais, completa com os melhores restantes
  if (escolhidos.length < limite) {
    for (const c of candidatos) {
      if (escolhidos.includes(c)) continue;
      escolhidos.push(c);
      if (escolhidos.length >= limite) break;
    }
  }
  return escolhidos.map((c) => ({
    id: c.doc.id,
    doc: c.doc.doc,
    pagina: c.doc.pagina,
    artigo: c.doc.artigo,
    secao: c.doc.secao,
    texto: c.doc.texto,
    score: c.score,
  }));
}

/** Contexto numerado que vai no prompt do modelo. */
export function montarContexto(trechos, documentos) {
  const porId = new Map(documentos.map((d) => [d.id, d]));
  return trechos
    .map((t, i) => {
      const d = porId.get(t.doc);
      const local = [d?.titulo || t.doc, t.artigo, `p. ${t.pagina}`].filter(Boolean).join(" · ");
      const contexto = t.contexto ? `Contexto do artigo/seção: ${t.contexto}\n` : "";
      return `[${i + 1}] ${local}\n${contexto}${t.texto}`;
    })
    .join("\n\n---\n\n");
}
