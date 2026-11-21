import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const MARKED_VERSION = "18.2.1";
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
  console.error(`${basename(origem)}: falta "titulo" no front matter`);
  process.exit(1);
}

const convertido = spawnSync(
  "npx",
  ["--yes", `marked@${MARKED_VERSION}`, "--gfm"],
  { input: corpo, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
);
if (convertido.status !== 0) {
  console.error(convertido.stderr);
  process.exit(1);
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
try {
  const arquivoHtml = join(temporaria, "guia.html");
  writeFileSync(arquivoHtml, html);
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
  if (resultado.status !== 0) {
    console.error(resultado.stderr);
    process.exit(1);
  }
} finally {
  rmSync(temporaria, { recursive: true, force: true });
}
