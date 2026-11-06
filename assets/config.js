/* Configuração pública do protótipo. Nenhuma chave de API fica aqui. */
window.UFG_CONFIG = {
  // Proxy Cloudflare Worker que repassa a chamada para https://ollama.com/api/chat.
  // Troque pelo endereço do seu Worker se publicar em outra conta/origem.
  proxyUrl: "https://ufg-chatbot-proxy.observatorio-ufg-ia.workers.dev/api/chat",
  modelos: [
    { id: "deepseek-v4.1-flash", nome: "DeepSeek V4.1 Flash" },
    { id: "glm-5.3-flash", nome: "GLM 5.3 Flash" },
    { id: "kimi-k3", nome: "Kimi K3" },
    { id: "gpt-oss:120b", nome: "GPT-OSS 120B" },
    { id: "minimax-m3.1-flash", nome: "MiniMax M3.1 Flash" },
  ],
  modeloPadrao: "deepseek-v4.1-flash",
};
