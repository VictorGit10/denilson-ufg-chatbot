# AGENTS.md

Leia `CLAUDE.md` antes de mexer no projeto. Ele explica o corpus, a ordem dos scripts, o proxy e as armadilhas (CORS, sufixo `:cloud`, página do PDF, avaliação não independente).

Resumo:
- `python codigo/ingerir.py` reconstrói o corpus.
- `node codigo/avaliar.mjs` roda a avaliação.
- `python -m http.server 8000` serve a página.
- Nenhuma chave de API no repositório.
