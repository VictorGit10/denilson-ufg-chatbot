import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { criarIndice, buscar } from "../assets/busca.js";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const trechos = JSON.parse(fs.readFileSync(path.join(raiz, "dados", "trechos.json"), "utf8"));
const documentos = JSON.parse(fs.readFileSync(path.join(raiz, "dados", "documentos.json"), "utf8"));
const indice = criarIndice(trechos, documentos);

const perguntas = process.argv.slice(2);
for (const pergunta of perguntas) {
  console.log("\n###", pergunta);
  const r = buscar(indice, pergunta, { limite: 8, porDocumento: 5, porArtigo: 4 });
  for (const x of r) {
    console.log(`  ${x.score.toFixed(2)}  ${x.doc} p.${x.pagina} ${x.artigo} | ${x.texto.slice(0, 110).replace(/\n/g, " ")}`);
  }
}
