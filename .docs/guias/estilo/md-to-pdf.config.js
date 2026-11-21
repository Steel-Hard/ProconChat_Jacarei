const path = require("path");
const fs = require("fs");

const pastaEstilo = __dirname;
const pastaGuias = path.resolve(pastaEstilo, "..");

const cabecalho = path.join(pastaEstilo, "cabecalho.html");
const rodape = path.join(pastaEstilo, "rodape.html");

const lerOpcional = (arquivo, padrao) =>
  fs.existsSync(arquivo) ? fs.readFileSync(arquivo, "utf8") : padrao;

const launchOptions = { args: ["--no-sandbox", "--disable-setuid-sandbox"] };
if (process.env.CHROME_PATH) {
  launchOptions.executablePath = process.env.CHROME_PATH;
}

module.exports = {
  basedir: pastaGuias,
  stylesheet: [path.join(pastaEstilo, "guia.css")],
  body_class: ["guia"],
  launch_options: launchOptions,
  pdf_options: {
    format: "A4",
    printBackground: true,
    margin: { top: "22mm", right: "18mm", bottom: "22mm", left: "18mm" },
    displayHeaderFooter: true,
    headerTemplate: lerOpcional(cabecalho, "<span></span>"),
    footerTemplate: lerOpcional(
      rodape,
      '<div style="width:100%;font-size:8px;text-align:center;color:#666"><span class="pageNumber"></span> / <span class="totalPages"></span></div>'
    ),
  },
};
