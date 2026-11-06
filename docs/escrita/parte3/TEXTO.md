# Arquitetura para a UFG, riscos e próximos passos

## O chatbot é a ponta: o trabalho na UFG está na curadoria, nas versões e nas permissões

Eu montei o protótipo como uma prova de conceito local, com 8 PDFs públicos, busca lexical, um modelo de linguagem e citações nas respostas. Ele serve para demonstrar a interação em um computador, mas tem escopo restrito.

O chatbot é apenas a ponta do sistema. O trabalho central para a universidade está na curadoria, no controle de versão e nas regras de permissão.

A mudança do protótipo para um ambiente de produção exige requisitos ausentes no teste local: autenticação, permissões, atualização automática, OCR, testes com usuários, monitoramento e um conjunto de avaliação independente.

A arquitetura completa precisa de cinco camadas:
- Ingestão: conectores para portais, SEI, Google Drive e pastas departamentais; extração de PDF, HTML e DOCX; OCR para digitalizados; metadados de órgão, tipo, data, vigência, público e permissão.
- Índice: busca lexical e semântica, reranker, corte por artigo ou seção, versão vigente e marcação de documento revogado ou retificado.
- Orquestração da resposta: o modelo recebe poucos trechos, responde com citações, o sistema valida as citações e devolve "não encontrei" quando não há base.
- Interface: chat, cartão de fonte, visualizador do PDF na página, feedback e histórico.
- Governança: cada coleção tem um dono; curadoria humana; SSO e permissão por documento; LGPD; logs de auditoria; avaliação contínua.

## Os riscos têm mitigação, e a atenção maior fica em documento desatualizado ou restrito

Os riscos de adotar o sistema na universidade são conhecidos e têm mitigação. O maior perigo é responder com confiança sobre documento velho ou fora de permissão. Hoje, o protótipo não tem OCR, não tem permissão, não tem avaliação com usuários e não está integrado ao SEI.

| Risco | Mitigação |
| :--- | :--- |
| Documento desatualizado ou revogado | Metadados de vigência, aviso na resposta e rotina de atualização. |
| PDF digitalizado ou tabela | OCR e extração de tabelas, com revisão humana. |
| Alucinação | Resposta só com trechos recuperados, citação obrigatória, validação de citação e "não encontrei". |
| Permissão | Indexar por coleção e respeitar o acesso de quem pergunta; não misturar documento restrito com índice público. |
| LGPD | Não indexar dados pessoais sem base legal; anonimizar logs; definir retenção. |
| Custo e latência | Recuperar antes de gerar, cachear perguntas frequentes e escolher o modelo por tarefa. |
| Falta de avaliação | Conjunto de perguntas com fonte esperada, revisão humana e medida de citação correta. |

## Começar pequeno com uma coleção e medir antes de expandir

Para avançar com segurança, o passo inicial é começar pequeno: testar uma única coleção com um conjunto fechado de perguntas e medir os resultados antes de expandir. Cabe a você decidir qual coleção começa, quem cuida dela, o que conta como resposta correta e quais canais importam (web, Teams, WhatsApp).

Cronograma sugerido:
- 30 dias: escolher uma secretaria ou coleção; separar 50 a 100 documentos; definir o dono da coleção; escrever 30 perguntas com fonte esperada.
- 60 dias: rodar um piloto com 10 a 20 pessoas; medir tempo de resposta, taxa de "não encontrei", citação correta e satisfação; revisar os erros.
- 90 dias: decidir se vai para produção; se sim, integrar SSO, permissões, atualização e monitoramento.

Da minha parte, deixo prontos a página, o protótipo, o código de ingestão, a busca, o proxy e o roteiro do encontro. O repositório é público e não contém chave de API. Quem quiser testar ao vivo usa a própria chave.
