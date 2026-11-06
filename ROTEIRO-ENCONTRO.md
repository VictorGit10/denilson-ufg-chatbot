# Roteiro do encontro — 40 minutos

**Denilson Silva · LAPIG/UFG · 06/11/2026 · 14h**

Página: <https://victorgit10.github.io/denilson-ufg-chatbot/>

## Antes de começar (5 min antes)

- Abrir a página no navegador e conferir se os 5 exemplos carregam.
- Clicar no exemplo 1 e conferir: resposta, chips de citação, cartões de fonte e o botão “Abrir no PDF”.
- Deixar a aba “Ao vivo com sua chave” pronta, se for testar. **Não** colar a chave na frente dele sem perguntar; a chave é sua.
- Se a internet falhar, os exemplos gravados funcionam; o PDF também é local.
- Se a página não abrir, rodar `python -m http.server 8000` na pasta e usar `http://localhost:8000`.

## 0–3 min · Abertura

“Você escreveu que a informação existe, mas está espalhada em portais, portarias, editais e documentos. O problema não é falta de informação; é o custo de encontrá-la e de saber qual versão vale. Eu montei uma prova pequena disso: um assistente que consulta 8 documentos públicos da UFG e responde com o artigo e a página.”

Não comece pela arquitetura. Comece pela pergunta que ele fez.

## 3–8 min · O pedido (seção 1)

- Mostrar o formulário dele na página.
- Ler em voz alta a frase “buscas manuais exaustivas em múltiplos locais”.
- Perguntar: “Quando você recebe uma dúvida hoje, qual é o caminho que você faz? Onde costuma travar?”
- Anotar as palavras que ele usar (portal, SEI, telefone, e-mail, planilha). Elas vão voltar na arquitetura.

## 8–15 min · A proposta (seção 2)

- Mostrar os três princípios: responde com base nos documentos; mostra o artigo e a página; admite quando não encontra.
- Contar o exemplo do estágio: “O estágio não obrigatório pode ser aproveitado como obrigatório?” → “Não”, com Art. 27 do RGCG, p. 10, e FAQ, p. 11.
- Contar o exemplo da biblioteca: “Qual o horário da Biblioteca Central?” → “Não encontrei”, porque o PDI só aponta um apêndice que não está no corpus.
- Frase para guardar: “O assistente não decide a regra; ele localiza, cita e deixa a decisão com você.”

## 15–22 min · Como funciona (seção 3)

- Mostrar o caminho de 5 passos: pergunta → busca → trechos → modelo → conferência.
- Mostrar a tabela do corpus: 8 documentos, 332 páginas, 1.159 trechos.
- Explicar em uma frase: “O modelo não lê a UFG inteira; ele recebe no máximo 10 trechos e só pode responder com base neles.”
- Mostrar o exemplo de trecho do Art. 27 e dizer que o corte guarda documento, artigo e página. É isso que permite a citação exata.
- Se ele perguntar por embeddings: “Esta versão é lexical, de propósito, para ser simples de auditar. A próxima camada é híbrida.”

## 22–30 min · Demonstração (seção 5)

Roteiro de cliques:

1. **Exemplo 1 — estágio não obrigatório.** Mostrar a resposta curta, os chips [2] e [3], os cartões de fonte e o botão “Abrir no PDF”. Abrir o PDF na página 10 e voltar.
2. **Exemplo 3 — retificação do Edital 258/2026.** Mostrar a comparação “ONDE SE LÊ” × “LEIA-SE” e a frase “vale a versão mais nova”.
3. **Exemplo 5 — horário da Biblioteca Central.** Mostrar o “não encontrei” e a explicação. É o controle de honestidade.
4. **Painel “Como a resposta foi montada”.** Abrir e mostrar que o modelo recebeu 10 trechos e citou 2; os não citados ficam visíveis.
5. **Ao vivo (opcional).** Se ele quiser, perguntar se pode usar a chave dele ou a sua. Fazer uma pergunta simples, por exemplo: “Qual a frequência mínima nas disciplinas presenciais de graduação?”. Mostrar o tempo e a resposta. Se der 401, explicar que a chave é inválida e que o proxy não guarda a chave.

Dicas:
- Não clique rápido demais; deixe ele ler.
- Se ele perguntar “e se o documento estiver errado?”, mostre o cartão de fonte e diga que a conferência é humana.
- Se ele perguntar “e se a resposta estiver errada?”, mostre o painel de montagem e diga que a citação é o que permite auditar.

## 30–36 min · O que o protótipo prova (seção 4)

- Mostrar os números: 15/16 no primeiro lugar, 16/16 nos três primeiros, MRR 0,97.
- Dizer imediatamente a ressalva: “O teste é pequeno, foi escrito depois da leitura dos documentos e a busca foi ajustada nele. Não é uma amostra independente.”
- Mostrar os três controles: honestidade, versão e citação.
- Limites: 8 documentos, sem OCR, sem permissão, sem avaliação com usuários, sem SEI.

## 36–40 min · Arquitetura, riscos e próximos passos (seções 6–8)

- Arquitetura em cinco camadas: ingestão, índice, orquestração, interface, governança.
- Frase: “O chatbot é a ponta; o trabalho de verdade é curadoria, versão e permissão.”
- Riscos: documento velho, PDF digitalizado, alucinação, permissão, LGPD, custo, avaliação.
- Próximos passos: 30/60/90 dias; começar com uma coleção e 30 perguntas.
- Perguntar a ele:
  - “Qual coleção você começaria?”
  - “Quem seria o dono dela?”
  - “O que contaria como resposta correta para você?”
  - “Onde as pessoas perguntam hoje: web, Teams, WhatsApp?”
  - “Tem documento restrito que não pode entrar?”
- Fechar com o que fica pronto: página, protótipo, código, proxy, roteiro.

## Contingências

- **Sem internet:** usar os exemplos gravados; os PDFs são locais.
- **Chave inválida ou sem cota:** mostrar o erro amigável e seguir com os exemplos gravados. O proxy está funcionando; o problema é a chave.
- **Página não carrega:** rodar `python -m http.server 8000` na pasta e abrir `http://localhost:8000`.
- **Pergunta fora do corpus:** usar a biblioteca; é o exemplo de “não encontrei”.
- **Ele quer ver o código:** abrir `assets/busca.js` (busca) ou `worker/worker.js` (proxy). O código é pequeno e legível.

## O que não prometer

- Não dizer que é produção.
- Não dizer que acerta 100%; o teste é pequeno e não independente.
- Não dizer que substitui a equipe; ele encurta a busca e organiza a fonte.
- Não dizer que já tem permissão, OCR ou integração com o SEI.
- Não pedir a chave dele em voz alta; se for testar, deixe ele digitar.

## O que levar embora

- A página publicada.
- O repositório com o corpus e o código.
- A proposta de piloto: uma coleção, 50 a 100 documentos, 30 perguntas, 10 a 20 pessoas, 60 dias.
- A pergunta que fica: “Qual é a primeira coleção que vale a pena?”
