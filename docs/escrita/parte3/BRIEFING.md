# Briefing: parte 3 da página do encontro com Denilson

## Quem lê e em que situação
Denilson Silva, servidor da UFG/LAPIG. Ele quer saber o que seria necessário para levar o protótipo a um piloto real na UFG, quais são os riscos e o que fica pronto. Não é especialista em infraestrutura nem em LGPD. Vai ler a página durante um encontro individual de 40 minutos, no LAPIG, em 06/11/2026, às 14h.
Voz: Victor ("eu montei", "eu testei"); com Denilson ("você"). Tom direto, sem venda, sem prometer produção.

## Formato
Texto para as últimas seções de uma página HTML. Títulos que dizem a conclusão. Parágrafos curtos. Pode usar uma lista curta, uma tabela de riscos e uma lista de próximos passos. Use só os fatos abaixo; não acrescente número, nome, data ou promessa.

## Seção 7: arquitetura para a UFG
O que o leitor precisa sair sabendo: o chatbot é a ponta; o trabalho de verdade é curadoria, versão e permissão.
Fatos:
- O protótipo é uma prova de conceito local: 8 PDFs públicos, busca lexical, um modelo de linguagem e citações.
- Para a UFG, a arquitetura precisa de cinco camadas: (1) ingestão; (2) índice; (3) orquestração da resposta; (4) interface; (5) governança.
- Ingestão: conectores para portais, SEI, Google Drive e pastas departamentais; extração de PDF, HTML e DOCX; OCR para digitalizados; metadados de órgão, tipo, data, vigência, público e permissão.
- Índice: busca lexical e semântica, reranker, corte por artigo ou seção, versão vigente e marcação de documento revogado ou retificado.
- Orquestração: o modelo recebe poucos trechos, responde com citações, o sistema valida as citações e devolve "não encontrei" quando não há base.
- Interface: chat, cartão de fonte, visualizador do PDF na página, feedback e histórico.
- Governança: cada coleção tem um dono; curadoria humana; SSO e permissão por documento; LGPD; logs de auditoria; avaliação contínua.
- O que muda do protótipo para produção: autenticação, permissões, atualização automática, OCR, testes com usuários, monitoramento e um conjunto de avaliação independente.

## Seção 8: riscos e limites
O que o leitor precisa sair sabendo: os riscos são conhecidos e têm mitigação; o maior é responder com confiança sobre documento velho ou fora de permissão.
Fatos:
- Documento desatualizado ou revogado: metadados de vigência, aviso na resposta e rotina de atualização.
- PDF digitalizado ou tabela: OCR e extração de tabelas, com revisão humana.
- Alucinação: resposta só com trechos recuperados, citação obrigatória, validação de citação e "não encontrei".
- Permissão: indexar por coleção e respeitar o acesso de quem pergunta; não misturar documento restrito com índice público.
- LGPD: não indexar dados pessoais sem base legal; anonimizar logs; definir retenção.
- Custo e latência: recuperar antes de gerar, cachear perguntas frequentes e escolher o modelo por tarefa.
- Avaliação: conjunto de perguntas com fonte esperada, revisão humana e medida de citação correta.
- O protótipo não tem OCR, não tem permissão, não tem avaliação com usuários e não está integrado ao SEI.

## Seção 9: próximos passos
O que o leitor precisa sair sabendo: começar pequeno, com uma coleção e um conjunto de perguntas, e medir antes de expandir.
Fatos:
- 30 dias: escolher uma secretaria ou coleção; separar 50 a 100 documentos; definir o dono da coleção; escrever 30 perguntas com fonte esperada.
- 60 dias: rodar um piloto com 10 a 20 pessoas; medir tempo de resposta, taxa de "não encontrei", citação correta e satisfação; revisar os erros.
- 90 dias: decidir se vai para produção; se sim, integrar SSO, permissões, atualização e monitoramento.
- O que Denilson decide: qual coleção começa, quem cuida dela, o que conta como resposta correta e quais canais importam (web, Teams, WhatsApp).
- O que fica pronto: a página, o protótipo, o código de ingestão, a busca, o proxy e o roteiro do encontro.
- O repositório é público e não contém chave de API. Quem quiser testar ao vivo usa a própria chave.

## Entrega
Grave TEXTO.md com:
- a seção "Arquitetura para a UFG" com 3 ou 4 parágrafos e uma lista curta das cinco camadas;
- a seção "Riscos e limites" com uma tabela de risco e mitigação (5 a 7 linhas);
- a seção "Próximos passos" com uma lista de 30/60/90 dias e um parágrafo do que fica pronto.
Não altere nenhum outro arquivo.
