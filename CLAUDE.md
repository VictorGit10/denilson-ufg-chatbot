# CLAUDE.md — contexto para a próxima IA

## O que é este projeto

Protótipo de assistente documental para a UFG, feito para o encontro individual de Denilson Silva (LAPIG/UFG, 06/11/2026). A página está em `index.html`; o corpus em `dados/`; os PDFs em `documentos/`; o código de extração, busca e avaliação em `codigo/` e `assets/`.

O objetivo não é “um chatbot que sabe tudo”. É um assistente que:
1. recupera poucos trechos de documentos públicos;
2. responde só com base neles;
3. cita documento, artigo/seção e página;
4. valida as citações;
5. diz “não encontrei” quando não há base.

## Ordem dos arquivos

- `codigo/ingerir.py` — lê os PDFs com `pdftotext -layout`, limpa, corta por artigo/página e grava `dados/documentos.json` e `dados/trechos.json`.
- `assets/busca.js` — índice BM25, tokenização, sinônimos, ajustes por tipo de pergunta e busca. Roda no navegador e no Node.
- `codigo/avaliar.mjs` — roda as 16 perguntas de `dados/avaliacao.json` e grava `dados/avaliacao_resultado.json`.
- `codigo/gerar_exemplos.mjs` — gera as 5 respostas gravadas com a Ollama local e grava `dados/exemplos.json`.
- `assets/app.js` — interface, exemplos, modo ao vivo, validação de citações, modal do PDF.
- `worker/worker.js` — proxy Cloudflare para o endpoint da Ollama (CORS).
- `index.html` — página do encontro.
- `assets/estilo.css` — estilo.
- `assets/config.js` — URL do proxy e modelos. **Nenhuma chave aqui.**
- `ROTEIRO-ENCONTRO.md` — roteiro de 40 minutos.

## Como rodar

```bash
python -m http.server 8000
# abrir http://localhost:8000
```

Não abra `index.html` direto no disco: o `fetch` dos JSON é bloqueado em `file://`.

Para regerar o corpus:

```bash
python codigo/ingerir.py
node codigo/avaliar.mjs
```

Para gerar exemplos (opcional, requer Ollama local autenticada):

```bash
node codigo/gerar_exemplos.mjs
```

## Armadilhas

- **Chave de API:** nunca commitar. O site usa a chave do usuário no modo ao vivo. O Worker só repassa; não guarda.
- **CORS:** `https://ollama.com/api/chat` não devolve CORS. Por isso existe o Worker. Se o site mudar de domínio, ajuste `ORIGENS` em `worker/worker.js`.
- **Modelos:** no Ollama local, o nome é `deepseek-v4.1-flash:cloud`; no proxy/ollama.com, é `deepseek-v4.1-flash` (sem `:cloud`). O `nomeModelo()` em `app.js` remove o sufixo para exibir.
- **Página do PDF:** o número da página é o do PDF (1-based), não necessariamente o número impresso no documento. O link usa `#page=N`.
- **Corte por artigo:** `ingerir.py` usa `pdftotext -layout`; sem `-layout`, listas e colunas quebram. O `contexto` de cada trecho guarda a abertura do artigo para que os pedaços do meio herdem o assunto.
- **Avaliação:** as 16 perguntas foram escritas depois da leitura dos documentos e a busca foi ajustada nelas. Não trate como teste independente.
- **Números fixos na página:** 8 documentos, 332 páginas, 1.159 trechos. Se mudar o corpus, atualize o texto do `index.html` e o `README.md`.
- **Exemplos gravados:** se mudar o corpus, gere de novo ou ajuste `dados/exemplos.json`; os IDs de citação precisam continuar válidos.
- **`docs/`:** não existe neste repositório; a página é root. O `.nojekyll` está na raiz.

## Como estender

- **Novo documento:** PDF em `documentos/` + bloco em `DOCUMENTOS` no `ingerir.py` + rodar a ingestão + avaliar + atualizar os números da página.
- **Busca semântica:** adicionar embeddings e um reranker, mantendo a validação de citação e o “não encontrei”.
- **Permissões:** indexar por coleção e filtrar antes de montar o contexto; nunca mandar trecho restrito para o modelo sem checar o usuário.
- **OCR:** para PDFs digitalizados, usar OCR e revisão humana; o protótipo atual não tem.
- **Produção:** SSO, ACL, atualização automática, cache, logs de auditoria, avaliação independente.

## Contato

Victor Amaral · LAPIG/UFG. A página e o repositório são públicos; os documentos pertencem à UFG e às fontes originais.
