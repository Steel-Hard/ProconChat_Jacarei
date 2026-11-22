import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const MARKED_VERSION = "18.2.1";

const falhar = (mensagem) => {
  console.error(mensagem);
  process.exit(1);
};

if (Number(process.versions.node.split(".")[0]) < 20) {
  falhar(`Node.js ${process.versions.node} é antigo demais; use o 20 ou mais novo`);
}

const [origem, destino, chrome] = process.argv.slice(2);

if (!origem || !destino || !chrome) {
  console.error("uso: node gerar-pdf.mjs <arquivo.md> <arquivo.pdf> <caminho-do-chrome>");
  process.exit(2);
}

const pastaGuias = dirname(fileURLToPath(import.meta.url));
const pastaEstilo = join(pastaGuias, "estilo");

const escapar = (texto) =>
  texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const dataPorExtenso = () =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date());

const bruto = readFileSync(origem, "utf8");
const encontrado = bruto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
const meta = {};
if (encontrado) {
  for (const linha of encontrado[1].split(/\r?\n/)) {
    const par = linha.match(/^([a-z]+):\s*(.*)$/);
    if (par) meta[par[1]] = par[2].trim().replace(/^"(.*)"$/, "$1");
  }
}
const corpo = encontrado ? bruto.slice(encontrado[0].length) : bruto;

if (!meta.titulo) {
  falhar(`${basename(origem)}: falta "titulo" no front matter`);
}

const imagensAusentes = [];
for (const par of corpo.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)/g)) {
  const caminho = decodeURIComponent(par[1]);
  if (/^[a-z][a-z0-9+.-]*:/i.test(caminho)) continue;
  if (!existsSync(resolve(pastaGuias, caminho))) imagensAusentes.push(caminho);
}
if (imagensAusentes.length > 0) {
  falhar(`${basename(origem)}: imagem não encontrada em .docs/guias/: ${imagensAusentes.join(", ")}`);
}

const convertido = spawnSync(
  "npx",
  ["--yes", `marked@${MARKED_VERSION}`, "--gfm"],
  { input: corpo, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
);
if (convertido.error) {
  falhar(`não foi possível rodar o npx (${convertido.error.message}); instale o Node.js 20 ou mais novo`);
}
if (convertido.status !== 0) {
  falhar(`falha ao converter o Markdown com o marked:\n${convertido.stderr}`);
}

const conteudo = convertido.stdout
  .replace(/<blockquote>(\s*<p>\s*<strong>Atenção:<\/strong>)/g, '<blockquote class="atencao">$1')
  .replace(/<blockquote>(\s*<p>\s*<strong>Dica:<\/strong>)/g, '<blockquote class="dica">$1');

const capa = readFileSync(join(pastaEstilo, "capa.html"), "utf8")
  .replace("{{titulo}}", escapar(meta.titulo))
  .replace("{{subtitulo}}", escapar(meta.subtitulo ?? ""))
  .replace("{{versao}}", escapar(meta.versao ?? "1.0"))
  .replace("{{data}}", escapar(meta.data ?? dataPorExtenso()));

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${escapar(meta.titulo)}</title>
<base href="${pathToFileURL(pastaGuias).href}/">
<link rel="stylesheet" href="${pathToFileURL(join(pastaEstilo, "guia.css")).href}">
</head>
<body>
${capa}
${conteudo}
</body>
</html>
`;

const temporaria = mkdtempSync(join(tmpdir(), "guia-pdf-"));
let erro = null;
try {
  const arquivoHtml = join(temporaria, "guia.html");
  writeFileSync(arquivoHtml, html);
  rmSync(resolve(destino), { force: true });
  const resultado = spawnSync(
    chrome,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--no-pdf-header-footer",
      `--user-data-dir=${join(temporaria, "perfil")}`,
      "--virtual-time-budget=15000",
      `--print-to-pdf=${resolve(destino)}`,
      pathToFileURL(arquivoHtml).href,
    ],
    { encoding: "utf8" }
  );
  if (resultado.error) {
    erro = `não foi possível rodar o Chrome em ${chrome} (${resultado.error.message})`;
  } else if (resultado.status !== 0) {
    erro = `o Chrome terminou com erro:\n${resultado.stderr}`;
  } else if (!existsSync(resolve(destino)) || statSync(resolve(destino)).size === 0) {
    erro = `o PDF não foi gravado ou ficou vazio: ${destino}`;
  }
} finally {
  rmSync(temporaria, { recursive: true, force: true });
}

if (erro) {
  falhar(erro);
}
