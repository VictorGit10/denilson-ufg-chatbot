"""Extrai texto dos PDFs, limpa, corta em trechos e grava o corpus do protótipo.

Requer: pdftotext (Poppler) no PATH.
    python codigo/ingerir.py
Saídas: dados/documentos.json, dados/trechos.json

O corte respeita o artigo (quando existe): cada trecho sabe a que artigo e a que
página do PDF pertence. Isso é o que permite a resposta citar "Art. 21, p. 11"
em vez de dizer apenas "está no Estatuto".
"""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent
DOCS = RAIZ / "documentos"
DADOS = RAIZ / "dados"

DOCUMENTOS = [
    {
        "id": "estatuto",
        "arquivo": "estatuto.pdf",
        "titulo": "Estatuto da UFG",
        "subtitulo": "Resolução CONSUNI/CEPEC/CC nº 02/2013, reeditada pela Resolução nº 01/2021",
        "orgao": "Conselho Universitário · CEPEC · Conselho de Curadores",
        "tipo": "Estatuto",
        "data": "2021-01-29",
        "status": "vigente",
        "url_oficial": "https://files.cercomp.ufg.br/weby/up/1/o/Resolucao_TresConselhos_2013_0002R.pdf",
        "descricao": "Princípios, finalidades, autonomia e estrutura dos conselhos superiores da UFG.",
        "publico": "Comunidade universitária e público externo",
    },
    {
        "id": "regimento",
        "arquivo": "regimento.pdf",
        "titulo": "Regimento Geral da UFG",
        "subtitulo": "Resolução Conjunta CONSUNI/CEPEC/Conselho de Curadores nº 01/2015",
        "orgao": "Conselhos superiores",
        "tipo": "Regimento",
        "data": "2015-04-17",
        "status": "vigente",
        "url_oficial": "https://files.cercomp.ufg.br/weby/up/1/o/RESOLUCAO-3CO-01-2015.pdf",
        "descricao": "Organização e funcionamento da universidade, das unidades acadêmicas e dos órgãos colegiados.",
        "publico": "Comunidade universitária",
    },
    {
        "id": "rgcg",
        "arquivo": "rgcg.pdf",
        "titulo": "Regulamento Geral dos Cursos de Graduação (RGCG)",
        "subtitulo": "Resolução CEPEC nº 1.122/2012",
        "orgao": "CEPEC",
        "tipo": "Resolução",
        "data": "2012-11-09",
        "status": "vigente",
        "url_oficial": "https://sistemas.ufg.br/consultas_publicas/resolucoes/arquivos/Resolucao_CEPEC_2012_1122.pdf",
        "descricao": "Matrícula, avaliação, aprovação, trancamento, aproveitamento de estudos e estágio na graduação.",
        "publico": "Estudantes de graduação e coordenações",
        "observacao": "Texto de 2012; alterações posteriores do CEPEC devem ser conferidas na versão consolidada.",
    },
    {
        "id": "pdi",
        "arquivo": "pdi.pdf",
        "titulo": "Plano de Desenvolvimento Institucional (PDI 2023–2027)",
        "subtitulo": "Versão final aprovada pelo CONSUNI",
        "orgao": "SECPLAN",
        "tipo": "Plano",
        "data": "2022-12-30",
        "status": "vigente",
        "url_oficial": "https://files.cercomp.ufg.br/weby/up/1/o/PDI_2023-2027_final.pdf",
        "descricao": "Perfil institucional, projeto pedagógico, objetivos estratégicos, infraestrutura e avaliação.",
        "publico": "Gestão, comunidade universitária e público externo",
    },
    {
        "id": "pos",
        "arquivo": "pos_1847.pdf",
        "titulo": "Regulamento Geral dos Programas de Pós-Graduação Stricto Sensu",
        "subtitulo": "Resolução CEPEC nº 1.847/2023",
        "orgao": "CEPEC",
        "tipo": "Resolução",
        "data": "2023-12-08",
        "status": "vigente",
        "url_oficial": "https://files.cercomp.ufg.br/weby/up/237/o/PPGZ2024_Resolucao_CEPEC_N%C2%BA_1847_Aprova_novo_Regulamento_Geral_dos_Programas_de_P%C3%B3s-Gradua%C3%A7%C3%A3o_Stricto_Sensu.pdf",
        "descricao": "Bolsas, créditos, qualificação, defesa, orientação e estágio docência na pós-graduação.",
        "publico": "Estudantes e docentes da pós-graduação",
    },
    {
        "id": "faq_estagio",
        "arquivo": "faq_estagio.pdf",
        "titulo": "Caderno de Dúvidas Frequentes — Estágio",
        "subtitulo": "Perguntas e respostas da PROGRAD",
        "orgao": "PROGRAD",
        "tipo": "Material de apoio",
        "data": "2015-07-30",
        "status": "orientação",
        "url_oficial": "https://files.cercomp.ufg.br/weby/up/90/o/CADERNO_DE_D%C3%9AVIDAS_FREQUENTES.pdf",
        "descricao": "Respostas curtas sobre estágio obrigatório, não obrigatório, orientador, supervisor e documentação.",
        "publico": "Estudantes, coordenações e concedentes",
        "observacao": "Material de apoio de 2015; prevalecem a Resolução CEPEC e a legislação vigente.",
    },
    {
        "id": "edital_monitoria",
        "arquivo": "edital_monitoria_258_2026.pdf",
        "titulo": "Edital PROGRAD nº 258/2026 — Monitoria Acadêmica",
        "subtitulo": "Seleção para o período letivo 2026/2027",
        "orgao": "PROGRAD",
        "tipo": "Edital",
        "data": "2026-04-27",
        "status": "vigente",
        "url_oficial": "https://files.cercomp.ufg.br/weby/up/99/o/SEI_6153032_Edital_258.pdf",
        "descricao": "Regras, cronograma e critérios do Programa de Monitoria Acadêmica.",
        "publico": "Estudantes de graduação, docentes e unidades acadêmicas",
    },
    {
        "id": "edital_monitoria_retificacao",
        "arquivo": "edital_monitoria_302_retificacao.pdf",
        "titulo": "Retificação do Edital PROGRAD nº 258/2026 — Monitoria",
        "subtitulo": "Edital PROGRAD nº 302/2026",
        "orgao": "PROGRAD",
        "tipo": "Retificação",
        "data": "2026-05-14",
        "status": "retificação",
        "url_oficial": "https://files.cercomp.ufg.br/weby/up/90/o/SEI_6189509_Edital_302.pdf",
        "descricao": "Altera os pesos dos critérios de avaliação dos projetos de ensino do Edital 258/2026.",
        "publico": "Docentes e unidades acadêmicas",
        "observacao": "Prevalece sobre os itens retificados do Edital 258/2026.",
    },
]

RUIDO = [
    r"^SERVIÇO PÚBLICO FEDERAL$",
    r"^UNIVERSIDADE FEDERAL DE GOIÁS$",
    r"^Universidade Federal de Goiás$",
    r"^PDI 2023 - 2027$",
    r"^PDI 2023 – 2027$",
    r"^MINISTÉRIO DA EDUCAÇÃO$",
    r"^\s*\d{1,3}\s*$",
    r"^Edital \d+ \(\d+\) SEI .* / pg\. \d+$",
    r"^Edital \d+ \(\d+\) SEI .* / pg\. \d+\s*$",
    r"^R E S O L V E M[:\s]*$",
]

RE_ARTIGO = re.compile(r"^\s*Art\.?\s*(\d+)\s*(?:[º°o])?\s*[\.\-–—]?\s*", re.MULTILINE)
RE_ARTIGO_QUALQUER = re.compile(r"\bArt\.?\s*(\d+)\s*(?:[º°o])?", re.IGNORECASE)
RE_HEADING = re.compile(
    r"^\s*(TÍTULO|TITULO|CAPÍTULO|CAPITULO|SEÇÃO|SECAO|SUBSEÇÃO|SUBSEÇÃO|PARTE)\b",
    re.IGNORECASE,
)
RE_NUM_HEADING = re.compile(r"^\s*\d+(?:\.\d+)*\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ]")
RE_PERGUNTA = re.compile(r"^\s*\d*\s*.{8,180}\?\s*$")


def normalizar_espacos(texto: str) -> str:
    texto = texto.replace("\r", "\n")
    texto = re.sub(r"[ \t]+", " ", texto)
    texto = re.sub(r"\n{3,}", "\n\n", texto)
    return texto.strip()


def limpar_pagina(texto: str) -> str:
    linhas = []
    for linha in texto.split("\n"):
        limpa = linha.strip()
        if not limpa:
            linhas.append("")
            continue
        if any(re.match(p, limpa, re.IGNORECASE) for p in RUIDO):
            continue
        linhas.append(limpa)
    return normalizar_espacos("\n".join(linhas))


def extrair_paginas(pdf: Path) -> list[str]:
    r = subprocess.run(
        ["pdftotext", "-enc", "UTF-8", "-layout", str(pdf), "-"],
        capture_output=True,
        check=True,
    )
    bruto = r.stdout.decode("utf-8", errors="replace")
    paginas = bruto.split("\f")
    if paginas and not paginas[-1].strip():
        paginas.pop()
    return [limpar_pagina(p) for p in paginas]


def detectar_secao(texto_antes: str, texto: str) -> str:
    linhas = (texto_antes[-2000:] + "\n" + texto).split("\n")
    achado = ""
    for linha in linhas:
        t = linha.strip()
        if not (4 <= len(t) <= 130):
            continue
        letras = [c for c in t if c.isalpha()]
        if not letras:
            continue
        maiusculas = sum(1 for c in letras if c.isupper()) / len(letras)
        if RE_HEADING.match(t) or RE_NUM_HEADING.match(t) or (maiusculas > 0.82 and not t.endswith(".")):
            achado = t
        elif RE_PERGUNTA.match(t):
            achado = t
    return achado


def cortar_longo(texto: str, limite: int) -> list[str]:
    """Último recurso para frases/linhas maiores que o limite: corta por palavras."""
    pedacos = []
    while len(texto) > limite:
        corte = texto.rfind(" ", 0, limite)
        if corte < limite // 2:
            corte = limite
        pedacos.append(texto[:corte].strip())
        texto = texto[corte:].strip()
    if texto:
        pedacos.append(texto)
    return pedacos


def quebrar(texto: str, limite: int = 1050) -> list[str]:
    """Quebra um bloco em pedaços de até ~1050 caracteres, sem perder o fio."""
    texto = normalizar_espacos(texto)
    if len(texto) <= limite:
        return [texto] if len(texto) >= 80 else []
    paragrafos = [p.strip() for p in re.split(r"\n\s*\n", texto) if p.strip()]
    pedacos: list[str] = []
    atual = ""
    for p in paragrafos:
        if len(p) > limite:
            frases = re.split(r"(?<=[.!?;:])\s+", p)
            for f in frases:
                for pedaco_frase in cortar_longo(f, limite):
                    if not atual:
                        atual = pedaco_frase
                    elif len(atual) + 1 + len(pedaco_frase) <= limite:
                        atual += " " + pedaco_frase
                    else:
                        pedacos.append(atual)
                        atual = pedaco_frase
        elif not atual:
            atual = p
        elif len(atual) + 2 + len(p) <= limite:
            atual += "\n\n" + p
        else:
            pedacos.append(atual)
            atual = p
    if atual:
        pedacos.append(atual)
    return [p for p in pedacos if len(p) >= 80]


def blocos_por_artigo(paginas: list[str]) -> list[dict]:
    """Devolve blocos que começam em um artigo e terminam no próximo.

    Cada parte do bloco guarda a sua própria página. Assim, um artigo que
    atravessa duas páginas gera trechos com a página certa, e não todos com a
    página em que o artigo começou.
    """
    blocos: list[dict] = []
    atual: dict | None = None
    for num_pagina, pagina in enumerate(paginas, start=1):
        marcas = list(RE_ARTIGO.finditer(pagina))
        if not marcas:
            if atual is None:
                atual = {"artigo": "", "secao": "", "partes": []}
            atual["partes"].append({"pagina": num_pagina, "texto": pagina})
            continue
        primeiro = marcas[0].start()
        if primeiro > 0:
            antes = pagina[:primeiro].strip()
            if antes:
                if atual is None:
                    atual = {"artigo": "", "secao": "", "partes": []}
                atual["partes"].append({"pagina": num_pagina, "texto": antes})
        for i, m in enumerate(marcas):
            if atual and atual["partes"]:
                atual["abertura"] = atual["partes"][0]["texto"][:300]
                blocos.append(atual)
            fim = marcas[i + 1].start() if i + 1 < len(marcas) else len(pagina)
            trecho = pagina[m.start() : fim].strip()
            atual = {
                "artigo": f"Art. {m.group(1)}",
                "secao": detectar_secao(pagina[: m.start()], trecho),
                "abertura": trecho[:300],
                "partes": [{"pagina": num_pagina, "texto": trecho}],
            }
    if atual and atual["partes"]:
        atual["abertura"] = atual["partes"][0]["texto"][:300]
        blocos.append(atual)
    return blocos


def blocos_por_pagina(paginas: list[str]) -> list[dict]:
    blocos = []
    for num_pagina, pagina in enumerate(paginas, start=1):
        if len(re.sub(r"\W", "", pagina)) < 80:
            continue
        blocos.append(
            {
                "artigo": "",
                "secao": detectar_secao("", pagina),
                "partes": [{"pagina": num_pagina, "texto": pagina}],
            }
        )
    return blocos


def main() -> None:
    DADOS.mkdir(exist_ok=True)
    docs_saida = []
    trechos = []
    for meta in DOCUMENTOS:
        pdf = DOCS / meta["arquivo"]
        paginas = extrair_paginas(pdf)
        # documentos jurídicos têm "Art. N"; os demais são cortados por página
        tem_artigos = sum(len(RE_ARTIGO.findall(p)) for p in paginas) >= 5
        blocos = blocos_por_artigo(paginas) if tem_artigos else blocos_por_pagina(paginas)
        n = 0
        for bloco in blocos:
            abertura = bloco.get("abertura", "")
            for parte in bloco["partes"]:
                for pedaco in quebrar(parte["texto"]):
                    contexto = " ".join(
                        x for x in (bloco.get("artigo", ""), abertura, bloco.get("secao", "")) if x
                    )
                    trechos.append(
                        {
                            "id": f"{meta['id']}-{n:04d}",
                            "doc": meta["id"],
                            "pagina": parte["pagina"],
                            "pagina_fim": parte["pagina"],
                            "artigo": bloco.get("artigo", ""),
                            "secao": bloco.get("secao", ""),
                            "contexto": contexto,
                            "texto": pedaco,
                        }
                    )
                    n += 1
        m = dict(meta)
        m["paginas"] = len(paginas)
        m["trechos"] = n
        docs_saida.append(m)
        print(f"{meta['id']}: {len(paginas)} páginas, {n} trechos (artigos={tem_artigos})")

    (DADOS / "documentos.json").write_text(
        json.dumps(docs_saida, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (DADOS / "trechos.json").write_text(
        json.dumps(trechos, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    total_paginas = sum(d["paginas"] for d in docs_saida)
    print(f"Total: {len(docs_saida)} documentos, {total_paginas} páginas, {len(trechos)} trechos")


if __name__ == "__main__":
    main()
