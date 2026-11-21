# Guias em PDF

Os guias são escritos em Markdown e gerados em PDF por um script. Os dois formatos ficam versionados aqui.

| Guia | Texto-fonte | PDF | Imagens |
| --- | --- | --- | --- |
| Configuração do bot | `guia-configuracao-do-bot.md` | `guia-configuracao-do-bot.pdf` | `images/configuracao-do-bot/` |
| Documento do software | `documento-do-software.md` | `documento-do-software.pdf` | `images/documento-do-software/` |
| Manual do painel | `manual-do-painel.md` | `manual-do-painel.pdf` | `images/manual-do-painel/` |

## Gerar os PDFs

```bash
.docs/guias/gerar-pdfs.sh
.docs/guias/gerar-pdfs.sh guia-configuracao-do-bot
```

Sem argumento, gera todos os `.md` desta pasta que têm front matter com `titulo:` (o `README.md` é ignorado). O PDF sai ao lado do `.md`, com o mesmo nome. O gerador para com uma mensagem clara se faltar `npx`, Node.js 20 ou mais novo, ou Chrome/Chromium, se uma imagem referenciada não existir ou se o PDF não for gravado.

Precisa de Node.js 20 ou mais novo e de Chrome ou Chromium. Se o navegador não estiver no `PATH`, aponte com `CHROME_PATH=/caminho/do/chrome`. Nada é instalado globalmente na máquina, mas o `npx` baixa o `marked` (versão fixa) para o cache em `~/.npm`, o que exige internet na primeira execução.

## Contrato do gerador

1. O Markdown começa com um front matter obrigatório: `titulo` (obrigatório), `subtitulo`, `versao` (padrão `1.0`) e `data` (padrão: a data de hoje por extenso). Esses campos preenchem a capa. O `#` do texto não repete o título do documento.
2. O corpo é convertido por `marked` (GFM) em HTML.
3. Blockquote que começa com `**Atenção:**` recebe a classe `atencao`, e o que começa com `**Dica:**` recebe a classe `dica`.
4. O HTML final é `<body>` com a capa (`estilo/capa.html` preenchida) como primeiro elemento, seguida do conteúdo. Cada `#` começa uma página nova.
5. O único CSS é `estilo/guia.css`, carregado por caminho absoluto (as fontes de `estilo/fontes/` resolvem a partir dele). Imagens usam caminho relativo a esta pasta (`images/...`).
6. O PDF é impresso pelo Chrome headless, em A4, com fundos e sem cabeçalho e rodapé do navegador. O rodapé vem do `@page` do CSS.

A marcação para quem escreve está em `estilo/README.md`.
