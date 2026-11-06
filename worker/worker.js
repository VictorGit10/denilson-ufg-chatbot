/**
 * Proxy mínimo para o Ollama Cloud.
 *
 * Por que existe: ollama.com não devolve cabeçalhos CORS, então o navegador
 * bloqueia a chamada direta. Este Worker repassa a requisição e devolve o CORS
 * apenas para as origens permitidas. A chave do usuário vem no cabeçalho
 * Authorization e não é guardada nem registrada.
 *
 * Deploy:
 *   cd worker
 *   npx wrangler deploy
 */

const ORIGENS = new Set([
  "https://victorgit10.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
]);

const MODELOS = new Set([
  "deepseek-v4.1-flash",
  "glm-5.3-flash",
  "kimi-k3",
  "gpt-oss:120b",
  "minimax-m3.1-flash",
]);

function cors(origem) {
  return {
    "Access-Control-Allow-Origin": origem,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(corpo, status, origem) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: {
      ...cors(origem),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export default {
  async fetch(request) {
    const origem = request.headers.get("Origin") || "";
    const permitida = ORIGENS.has(origem);

    if (request.method === "OPTIONS") {
      if (!permitida) return new Response("Origem não permitida", { status: 403 });
      return new Response(null, { status: 204, headers: cors(origem) });
    }

    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return json({ ok: true, servico: "ufg-chatbot-proxy" }, 200, permitida ? origem : "null");
    }
    if (url.pathname !== "/api/chat") {
      return json({ error: "Rota não encontrada." }, 404, permitida ? origem : "null");
    }
    if (!permitida) {
      return json({ error: "Origem não permitida." }, 403, "null");
    }
    if (request.method !== "POST") {
      return json({ error: "Use POST." }, 405, origem);
    }

    const auth = request.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ") || auth.length < 20) {
      return json({ error: "Informe a chave da Ollama no cabeçalho Authorization." }, 401, origem);
    }

    const corpo = await request.text();
    if (corpo.length > 200_000) {
      return json({ error: "Requisição grande demais." }, 413, origem);
    }
    let dados;
    try {
      dados = JSON.parse(corpo);
    } catch {
      return json({ error: "JSON inválido." }, 400, origem);
    }
    if (!MODELOS.has(dados.model)) {
      return json({ error: "Modelo não permitido neste protótipo." }, 400, origem);
    }
    dados.stream = false;

    let resposta;
    try {
      resposta = await fetch("https://ollama.com/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": auth,
        },
        body: JSON.stringify(dados),
      });
    } catch {
      return json({ error: "Não consegui falar com a Ollama." }, 502, origem);
    }

    const headers = new Headers(cors(origem));
    headers.set("Content-Type", resposta.headers.get("Content-Type") || "application/json");
    headers.set("Cache-Control", "no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(resposta.body, { status: resposta.status, headers });
  },
};
