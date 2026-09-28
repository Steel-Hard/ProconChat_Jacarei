# Protótipo navegável do painel

Cópia do protótipo **"ProconChat Painel navegável"**, criado e aprovado no Claude Design durante a revisão das telas (26 e 27/09/2026). É a referência **visual** do painel: layout, cores, espaçamentos, textos e comportamento das telas.

As **regras** de cada tela estão em [`../regras/`](../regras/). Se o protótipo e as regras divergirem, **valem as regras**.

## Como abrir

O protótipo precisa ser servido por um servidor local; abrir o arquivo direto no navegador (`file://`) bloqueia os scripts. Com internet (o runtime carrega React e Babel de uma CDN):

```bash
cd .docs/prototipo
python3 -m http.server 8080
```

E abrir `http://localhost:8080/ProconChat%20Painel.dc.html`.

## Controles do protótipo

As faixas tracejadas **"Controles do protótipo"** existem só aqui, para demonstração:

- **Ver como:** Admin, funcionário limitado ou gestor de usuários (para ver as regras de permissão);
- **Dados vazios:** mostra os estados vazios das telas;
- **Simular:** token expirado, webhook sem eventos, qualidade baixa, perto do limite de envios, modelo rejeitado, agenda lotada, espera longa, falhas de entrega.

Os dados (agendamentos, sessões, usuários, números dos relatórios) são **de exemplo**. A data "de hoje" do protótipo é fixa em 28/09/2026, às 10:15.

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `ProconChat Painel.dc.html` | Telas (marcação e estilos) |
| `logica.js` | Comportamento das telas |
| `dados.js` | Constantes e dados de exemplo. Tem textos úteis para o sistema real, como os títulos curtos sugeridos das categorias e perguntas (`CAT_CURTO`, `Q_CURTO`) e as frases dos motivos de cancelamento (`MOTIVOS`) |
| `report-export.js` | Exportação dos relatórios (PDF, Excel, CSV) no navegador, só para demonstração. No sistema real a exportação é feita no backend |
| `support.js` | Runtime do Claude Design. Não editar |

## Atualização

Este é um retrato do protótipo em 27/09/2026. Se o protótipo mudar no Claude Design, copie os arquivos de novo para esta pasta no mesmo PR que atualizar as regras.
