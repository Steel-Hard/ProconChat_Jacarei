# Estilo dos guias em PDF

Arquivos: `guia.css` (impressão A4), `capa.html` (capa com `{{titulo}}`, `{{subtitulo}}`, `{{versao}}`, `{{data}}`) e `fontes/` (Inter e Manrope, copiadas do frontend, funcionam offline).

## Marcação para os autores

| Elemento | Como escrever no Markdown |
| --- | --- |
| Passos | Lista numerada (`1.`, `2.`); cada passo vira um círculo numerado. Subpassos viram letras (a, b) |
| Atenção | `> **Atenção:** texto` |
| Dica | `> **Dica:** texto` |
| Nota neutra | `> texto` (blockquote sem palavra inicial) |
| Captura de tela | `![texto alternativo](caminho.png)` sozinha em um parágrafo, e na linha seguinte a legenda em itálico: `*Figura 1 – Tela de entrada*` |
| Comando | Bloco de código com três crases |
| Tabela | Tabela Markdown; o cabeçalho se repete em cada página |

## Requisito para o gerador

O CSS não enxerga o texto do blockquote. Depois de converter o Markdown, o gerador deve adicionar a classe `atencao` ao blockquote que começa com `<strong>Atenção:</strong>` e a classe `dica` ao que começa com `<strong>Dica:</strong>`.

Rodapé com número de página usa `@page` margin boxes (funciona no Chrome atual). A capa deve ser o primeiro elemento do `body`, sem margem de página.

## Ajustes só do Manual do painel

O fim de `guia.css` tem regras que valem só para o Manual do painel, todas sob `body:has(#sumario)`: sumário em duas colunas, tamanho de cada figura e capa. Os outros guias não mudam. O sumário é um bloco `<div class="sumario">` escrito no próprio Markdown, com os números de página conferidos no PDF gerado.
