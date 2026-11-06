import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { criarIndice, buscar } from "../assets/busca.js";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const trechos = JSON.parse(fs.readFileSync(path.join(raiz, "dados", "trechos.json"), "utf8"));
const documentos = JSON.parse(fs.readFileSync(path.join(raiz, "dados", "documentos.json"), "utf8"));
const avaliacao = JSON.parse(fs.readFileSync(path.join(raiz, "dados", "avaliacao.json"), "utf8"));
const indice = criarIndice(trechos, documentos);

function ehAcerto(item, q) {
  if (!q.doc || item.doc !== q.doc) return false;
  if (q.artigo) return item.artigo === q.artigo;
  if (!q.paginas.length) return false;
  return q.paginas.some((p) => Math.abs(item.pagina - p) <= 1);
}

const linhas = [];
const resumo = { n: 0, top1: 0, top3: 0, top5: 0, top8: 0, docTop3: 0, mrr: 0 };
for (const q of avaliacao) {
  if (q.tipo === "fora-do-corpus") continue;
  const r = buscar(indice, q.pergunta, { limite: 8 });
  const rank = r.findIndex((x) => ehAcerto(x, q)) + 1;
  const docRank = r.findIndex((x) => x.doc === q.doc) + 1;
  resumo.n += 1;
  if (rank === 1) resumo.top1 += 1;
  if (rank >= 1 && rank <= 3) resumo.top3 += 1;
  if (rank >= 1 && rank <= 5) resumo.top5 += 1;
  if (rank >= 1 && rank <= 8) resumo.top8 += 1;
  if (docRank >= 1 && docRank <= 3) resumo.docTop3 += 1;
  if (rank >= 1) resumo.mrr += 1 / rank;
  linhas.push({
    id: q.id,
    pergunta: q.pergunta,
    esperado: `${q.doc}${q.artigo ? " " + q.artigo : ""} p.${q.paginas.join(",")}`,
    rank,
    docRank,
    topo: r[0] ? `${r[0].doc} ${r[0].artigo} p.${r[0].pagina}` : "—",
    topoTexto: r[0] ? r[0].texto.slice(0, 120).replace(/\n/g, " ") : "",
  });
}

resumo.mrr = Number((resumo.mrr / resumo.n).toFixed(2));
for (const k of ["top1", "top3", "top5", "top8", "docTop3"]) {
  resumo[k] = Number(((resumo[k] / resumo.n) * 100).toFixed(1));
}

console.log("\nPerguntas avaliadas:", resumo.n);
console.log(`Top 1: ${resumo.top1}% · Top 3: ${resumo.top3}% · Top 5: ${resumo.top5}% · Top 8: ${resumo.top8}%`);
console.log(`Documento certo no Top 3: ${resumo.docTop3}% · MRR: ${resumo.mrr}\n`);
for (const l of linhas) {
  console.log(`${l.rank ? "✓" : "✗"} ${l.id} rank=${l.rank || "—"} docRank=${l.docRank || "—"} | ${l.pergunta}`);
  console.log(`   esperado: ${l.esperado} | topo: ${l.topo}`);
  if (!l.rank) console.log(`   topo: ${l.topoTexto}`);
}

const saida = {
  gerado_em: new Date().toISOString().slice(0, 10),
  modelo: "BM25 + sinônimos + ajustes de tipo de pergunta",
  resumo,
  perguntas: linhas,
};
fs.writeFileSync(path.join(raiz, "dados", "avaliacao_resultado.json"), JSON.stringify(saida, null, 2));
console.log("\nGravado dados/avaliacao_resultado.json");
