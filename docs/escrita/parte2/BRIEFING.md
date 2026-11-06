# Briefing: parte 2 da página do encontro com Denilson

## Quem lê e em que situação
Denilson Silva, servidor da UFG/LAPIG. Ele quer entender como o protótipo funciona e o que ele já prova. Não é especialista em recuperação de informação nem em LLMs. Vai ler a página durante um encontro individual de 40 minutos, no LAPIG, em 06/11/2026, às 14h. A seção da demonstração é interativa; o texto deve preparar o que ele vai ver e testar.
Voz: Victor ("eu montei", "eu testei"); com Denilson ("você"). Tom direto, sem venda.

## Formato
Texto para três seções de uma página HTML. Títulos que dizem a conclusão. Parágrafos curtos. Pode usar uma lista curta e uma tabela pequena. Use só os fatos abaixo; não acrescente número, nome, data ou promessa.

## Seção 4: como funciona
O que o leitor precisa sair sabendo: o caminho é recuperar poucos trechos certos e só então pedir a resposta ao modelo; a citação é o que torna isso auditável.
Fatos:
- Corpus do protótipo: 8 documentos públicos, 332 páginas, 1.159 trechos.
- Documentos: Estatuto da UFG (58 páginas), Regimento Geral (45), Regulamento Geral dos Cursos de Graduação (36), PDI 2023-2027 (141), Regulamento da Pós-Graduação (28), Caderno de Dúvidas de Estágio (14), Edital de Monitoria 258/2026 (8) e Retificação 302/2026 (2).
- O texto é extraído dos PDFs e cortado em trechos que guardam documento, artigo ou seção e página.
- A busca é lexical (BM25), com sinônimos e ajustes por tipo de pergunta. Não há embeddings nesta versão.
- O modelo recebe no máximo 10 trechos numerados e a pergunta. Ele não vê o corpus inteiro.
- A resposta é pedida em JSON, com a resposta, os IDs dos trechos citados, um campo "encontrado" e uma observação.
- O site confere se cada citação existe no conjunto recuperado. Citação fora do conjunto é descartada.
- Cada citação vira um cartão com documento, artigo ou seção, página e link para o PDF naquela página.
- O modelo usado nos exemplos gravados é o deepseek-v4.1-flash, da Ollama Cloud, em 05/11/2026. O usuário pode escolher outro modelo na demonstração ao vivo.
- A chave da API é do usuário; o site não guarda a chave no código nem no repositório. A chamada passa por um proxy Cloudflare Worker que não registra a chave.

## Seção 5: o que o protótipo prova
O que o leitor precisa sair sabendo: o ciclo completo funciona em pequena escala, mas o teste é pequeno e não é independente.
Fatos:
- Foram escritas 16 perguntas de teste a partir dos documentos, com a fonte esperada.
- Resultado da busca: 15 das 16 perguntas tiveram a fonte certa no primeiro lugar; 16 das 16 nos três primeiros; 100% dos documentos certos nos três primeiros; MRR 0,97.
- O teste foi escrito depois da leitura dos documentos e a busca foi ajustada nele. Não é um conjunto independente; serve para mostrar o mecanismo, não para prometer acurácia.
- Controle de honestidade: a pergunta sobre o horário da Biblioteca Central não está no corpus e o protótipo responde "não encontrei".
- Controle de versão: a pergunta sobre a retificação do Edital 258/2026 é respondida comparando "ONDE SE LÊ" e "LEIA-SE" e citando a versão que vale.
- Controle de citação: o modelo não pode citar um trecho que não recebeu; o site valida e descarta citações inválidas.
- Limites: 8 documentos, sem OCR, sem permissões, sem avaliação com usuários reais, sem integração com SEI ou portais.

## Seção 6: a demonstração
O que o leitor precisa sair sabendo: ele pode testar sem chave nos exemplos gravados e, se quiser, com a chave dele no modo ao vivo.
Fatos:
- A página tem dois modos: "Exemplos gravados" e "Ao vivo com sua chave".
- Nos exemplos gravados, as respostas foram geradas pelo modelo e ficam salvas; funcionam sem internet e sem chave.
- No modo ao vivo, o usuário cola a chave da Ollama Cloud, escolhe o modelo e faz a pergunta. A chave fica só no navegador; se marcar "lembrar nesta aba", vai para o sessionStorage, não para o localStorage.
- O modo ao vivo usa um proxy Cloudflare Worker para contornar a falta de CORS da Ollama. O proxy não guarda a chave.
- O que testar: uma pergunta factual ("Qual o valor da bolsa de monitoria?"), uma pergunta que exige cruzar documentos ("O estágio não obrigatório pode ser aproveitado como estágio obrigatório?"), uma pergunta de versão ("O que mudou na retificação do Edital 258/2026?") e uma pergunta fora do corpus ("Qual o horário de funcionamento da Biblioteca Central?").
- O que olhar na resposta: o cartão de fonte, o artigo, a página, o botão que abre o PDF e o painel "como a resposta foi montada".

## Entrega
Grave TEXTO.md com:
- a seção "Como funciona" com 3 ou 4 parágrafos e uma lista curta do caminho;
- a seção "O que o protótipo prova" com 2 ou 3 parágrafos e uma tabela pequena de resultados;
- a seção "A demonstração" com 2 ou 3 parágrafos e uma lista curta do que testar.
Não altere nenhum outro arquivo.
