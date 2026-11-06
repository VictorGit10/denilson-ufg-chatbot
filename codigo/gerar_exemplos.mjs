import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { criarIndice, buscar, montarContexto } from "../assets/busca.js";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const trechos = JSON.parse(fs.readFileSync(path.join(raiz, "dados", "trechos.json"), "utf8"));
const documentos = JSON.parse(fs.readFileSync(path.join(raiz, "dados", "documentos.json"), "utf8"));
const indice = criarIndice(trechos, documentos);

const MODELO = "deepseek-v4.1-flash:cloud";
const PERGUNTAS = [
  "Quais são as competências do CONSUNI?",
  "O estágio não obrigatório pode ser aproveitado como estágio obrigatório?",
  "Qual o valor da bolsa de monitoria?",
  "O que mudou na retificação do Edital 258/2026?",
  "Qual o horário de funcionamento da Biblioteca Central?",
];

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

async function perguntar(pergunta) {
  const recuperados = buscar(indice, pergunta, { limite: 10, porDocumento: 6, porArtigo: 6 });
  const contexto = montarContexto(recuperados, documentos);
  const usuario = `Pergunta: ${pergunta}\n\nTrechos recuperados:\n\n${contexto}`;
  const corpo = {
    model: MODELO,
    messages: [
      { role: "system", content: SISTEMA },
      { role: "user", content: usuario },
    ],
    stream: false,
    format: "json",
    options: { temperature: 0.1, num_ctx: 8192 },
  };
  const r = await fetch("http://127.0.0.1:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  if (!r.ok) throw new Error(`Ollama ${r.status}: ${await r.text()}`);
  const data = await r.json();
  const texto = data.message?.content || "";
  let json;
  try {
    json = JSON.parse(texto);
  } catch {
    json = { resposta: texto, citacoes: [], encontrado: null, observacao: "resposta não veio em JSON" };
  }
  // normaliza citações e confere se os ids existem
  const citacoes = (Array.isArray(json.citacoes) ? json.citacoes : [])
    .map((c) => (typeof c === "number" ? { id: c, frase: "" } : c))
    .filter((c) => Number.isInteger(c.id) && c.id >= 1 && c.id <= recuperados.length);
  const marcadoFalso = json.encontrado === false || String(json.encontrado).toLowerCase() === "false";
  return {
    pergunta,
    modelo: MODELO,
    gerado_em: new Date().toISOString().slice(0, 10),
    recuperados,
    contexto,
    resposta: String(json.resposta || "").trim(),
    citacoes,
    encontrado: !marcadoFalso,
    observacao: String(json.observacao || "").trim(),
    citacoes_invalidas: (Array.isArray(json.citacoes) ? json.citacoes : []).length - citacoes.length,
  };
}

const saida = [];
for (const pergunta of PERGUNTAS) {
  console.log("\n###", pergunta);
  const r = await perguntar(pergunta);
  console.log(r.resposta.slice(0, 500));
  console.log("citações:", r.citacoes.map((c) => c.id).join(", "), "| encontrado:", r.encontrado);
  saida.push(r);
}
fs.writeFileSync(path.join(raiz, "dados", "exemplos.json"), JSON.stringify(saida, null, 2));
console.log("\nGravado dados/exemplos.json");
