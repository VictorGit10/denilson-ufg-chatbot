# Como funciona: a busca seleciona trechos específicos para o modelo responder com fontes auditáveis

Eu montei a base do protótipo com 8 documentos públicos da UFG, que somam 332 páginas e 1.159 trechos: Estatuto da UFG (58 páginas), Regimento Geral (45), Regulamento Geral dos Cursos de Graduação (36), PDI 2023-2027 (141), Regulamento da Pós-Graduação (28), Caderno de Dúvidas de Estágio (14), Edital de Monitoria 258/2026 (8) e Retificação 302/2026 (2). O texto foi extraído dos PDFs e dividido em trechos que guardam o documento de origem, o artigo ou seção e a página.

A busca é lexical (BM25), com sinônimos e ajustes por tipo de pergunta. Não há embeddings nesta versão. Quando você faz uma pergunta, o sistema recupera no máximo 10 trechos numerados e passa esses trechos ao modelo junto com a pergunta. O modelo não vê o corpus inteiro.

A resposta é pedida em JSON, com o texto da resposta, os IDs dos trechos citados, um campo "encontrado" e uma observação. Em seguida, o site confere se cada citação existe no conjunto recuperado e descarta qualquer citação fora dele. Cada citação aceita vira um cartão com documento, artigo ou seção, página e link para o PDF naquela página.

Nos exemplos gravados, usei o modelo deepseek-v4.1-flash, da Ollama Cloud, em 05/11/2026. Na demonstração ao vivo, você pode escolher outro modelo. A chave da API é sua; o site não guarda a chave no código nem no repositório. A chamada passa por um proxy Cloudflare Worker que contorna a falta de CORS da Ollama e não registra a chave.

O caminho de cada consulta segue quatro passos:
1. Busca lexical BM25 no corpus a partir da pergunta.
2. Envio de até 10 trechos numerados e da pergunta ao modelo.
3. Validação das citações devolvidas no JSON contra os trechos recuperados.
4. Exibição da resposta com cartões e links diretos para a página do PDF.

# O que o protótipo prova: o ciclo funciona em pequena escala, mas o teste não é independente

Eu escrevi 16 perguntas de teste a partir dos documentos, com a fonte esperada para cada uma. Esse teste serviu para verificar o mecanismo, mas não serve para prometer acurácia: elaborei as perguntas depois de ler os documentos e ajustei a busca com base nelas, sem usar um conjunto independente de avaliação. Os resultados da busca foram:

| Métrica | Resultado |
| :--- | :--- |
| Fonte esperada no 1º lugar | 15 de 16 perguntas |
| Fonte esperada nos 3 primeiros lugares | 16 de 16 perguntas |
| Documentos certos nos 3 primeiros lugares | 100% |
| MRR | 0,97 |

O protótipo conta com três controles práticos. O controle de honestidade respondeu "não encontrei" para a pergunta sobre o horário da Biblioteca Central, que não está no corpus. O controle de versão tratou a retificação do Edital 258/2026 comparando "ONDE SE LÊ" com "LEIA-SE" e citou a versão que vale. O controle de citação impede o modelo de inventar trechos: o site valida as citações recebidas e descarta as que forem inválidas.

O protótipo tem limites claros nesta etapa: trabalha com 8 documentos, não faz OCR, não tem gestão de permissões, não passou por avaliação com usuários reais e não tem integração com o SEI ou com outros portais.

# A demonstração: você pode ver os exemplos salvos sem chave ou testar ao vivo com a sua

A página tem dois modos: "Exemplos gravados" e "Ao vivo com sua chave". Nos exemplos gravados, as respostas já foram geradas pelo modelo e ficam salvas. Elas funcionam sem internet e sem chave.

No modo ao vivo, você cola a chave da Ollama Cloud, escolhe o modelo e faz a pergunta. A chave fica só no seu navegador. Se marcar "lembrar nesta aba", o valor vai para o sessionStorage, não para o localStorage. A consulta usa um proxy Cloudflare Worker para contornar a falta de CORS da Ollama, e esse proxy também não guarda a chave.

Ao receber a resposta, você pode conferir o cartão de fonte, o artigo, a página, o botão que abre o PDF e o painel "como a resposta foi montada".

Perguntas para testar na demonstração:
- Pergunta factual: "Qual o valor da bolsa de monitoria?"
- Pergunta que exige cruzar documentos: "O estágio não obrigatório pode ser aproveitado como estágio obrigatório?"
- Pergunta de versão: "O que mudou na retificação do Edital 258/2026?"
- Pergunta fora do corpus: "Qual o horário de funcionamento da Biblioteca Central?"
