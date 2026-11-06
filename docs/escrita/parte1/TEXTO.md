# Do documento à resposta com fonte

### Um protótipo que consulta documentos da UFG, responde com o artigo e a página e admite quando não encontra

Este material serve de apoio para o nosso encontro individual do Estágio Docência no LAPIG/UFG, em 06/11/2026, às 14h, com você, Denilson Silva. Durante a conversa de 40 minutos, vamos analisar um protótipo que montei para consultar 8 documentos públicos da UFG, somando 332 páginas e 1.159 trechos. O assistente responde apenas a partir desses trechos, sem usar conhecimento externo.

## O pedido: a dificuldade é encontrar a regra certa e confirmar a versão que vale

Você atua na UFG atendendo a um volume grande de demandas e dúvidas, tanto do público interno quanto do externo. A informação necessária existe, mas está dispersa em portais, portarias, editais e documentos textuais.

Localizar uma diretriz, regra ou dado específico exige buscas manuais exaustivas em vários lugares. Esse processo consome tempo e traz o desafio de conferir se o texto consultado é a versão que realmente está em vigor.

No formulário, você indicou como resultado esperado uma proposta de arquitetura ou protótipo conceitual de chatbot que consulte e sintetize as bases de conhecimento da UFG de forma integrada. O que preparei para o encontro é uma prova pequena desse conceito, feita com documentos públicos reais, e não o sistema completo da universidade.

## A proposta: respostas com artigo, página e aviso quando o dado não foi encontrado

Eu estruturei o protótipo sobre três princípios básicos:
- Responde apenas com base nos documentos recuperados.
- Mostra o artigo e a página de cada afirmação.
- Diz "não encontrei" quando a resposta não está no corpus.

As respostas não chegam como resumos soltos. Cada afirmação traz uma âncora clicável que abre o PDF na página certa. Quando perguntei se o estágio não obrigatório pode ser aproveitado como estágio obrigatório, o protótipo respondeu que não e citou o Art. 27 do Regulamento Geral dos Cursos de Graduação (RGCG), na página 10, e a pergunta 12 do Caderno de Dúvidas Frequentes, na página 11.

Quando o dado procurado não consta no material carregado, o sistema avisa que não encontrou em vez de tentar adivinhar. À pergunta "Qual o horário de funcionamento da Biblioteca Central?", ele informou que não encontrou o horário, porque o PDI apenas aponta para um apêndice ausente no corpus.

O assistente não decide a regra institucional. Ele apenas localiza o texto, cita a fonte e deixa a decisão com a pessoa responsável pelo atendimento.
