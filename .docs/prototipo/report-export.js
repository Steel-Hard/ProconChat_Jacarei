// Exportação agregada dos Relatórios (PDF via impressão, XLSX e ZIP de CSVs). Sem dependências.
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
const enc = s => new TextEncoder().encode(s);

export function zip(files) {
  const parts = [], central = []; let off = 0;
  const d = new Date(); const dt = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF; const dd = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
  for (const f of files) {
    const name = enc(f.name); const data = typeof f.data === 'string' ? enc(f.data) : f.data; const crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true); lh.setUint16(10, dt, true); lh.setUint16(12, dd, true);
    lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    parts.push(new Uint8Array(lh.buffer), name, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, dt, true); ch.setUint16(14, dd, true);
    ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true); ch.setUint32(42, off, true);
    central.push(new Uint8Array(ch.buffer), name);
    off += 30 + name.length + data.length;
  }
  const cSize = central.reduce((a, b) => a + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cSize, true); end.setUint32(16, off, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}

const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const csvCell = v => { const s = typeof v === 'number' ? String(v).replace('.', ',') : String(v ?? ''); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

export function csvZip(sheets) {
  return zip(sheets.map((s, i) => ({ name: String(i + 1).padStart(2, '0') + '-' + slug(s.name) + '.csv', data: '﻿' + s.rows.map(r => r.map(csvCell).join(';')).join('\r\n') })));
}

const xesc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const colName = i => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };

export function xlsx(sheets) {
  const files = [];
  files.push({ name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + sheets.map((_, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('') + '</Types>' });
  files.push({ name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' });
  files.push({ name: 'xl/workbook.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + sheets.map((s, i) => '<sheet name="' + xesc(s.name.slice(0, 31)) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') + '</sheets></workbook>' });
  files.push({ name: 'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sheets.map((_, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('') + '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' });
  files.push({ name: 'xl/styles.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="0.0"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>' });
  sheets.forEach((s, si) => {
    const widths = []; s.rows.forEach(r => r.forEach((v, c) => { widths[c] = Math.max(widths[c] || 8, Math.min(70, String(v ?? '').length + 2)); }));
    const cols = '<cols>' + widths.map((w, c) => '<col min="' + (c + 1) + '" max="' + (c + 1) + '" width="' + w + '" customWidth="1"/>').join('') + '</cols>';
    const rows = s.rows.map((r, ri) => '<row r="' + (ri + 1) + '">' + r.map((v, c) => {
      const ref = colName(c) + (ri + 1);
      if (typeof v === 'number') return '<c r="' + ref + '"' + (Number.isInteger(v) ? '' : ' s="2"') + '><v>' + v + '</v></c>';
      return '<c r="' + ref + '" t="inlineStr"' + (ri === 0 ? ' s="1"' : '') + '><is><t xml:space="preserve">' + xesc(v ?? '') + '</t></is></c>';
    }).join('') + '</row>').join('');
    files.push({ name: 'xl/worksheets/sheet' + (si + 1) + '.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' + cols + '<sheetData>' + rows + '</sheetData></worksheet>' });
  });
  const z = zip(files);
  return new Blob([z], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

const hesc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = v => typeof v === 'number' ? v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : hesc(v);

export function printPdf(meta, sheets, charts) {
  const bar = (rows, color) => '<div class="chart">' + rows.map(r => '<div class="br"><span class="bl">' + hesc(r.l) + '</span><span class="bt"><i style="width:' + r.w + '%;background:' + (r.c || color) + '"></i></span><span class="bv">' + fmt(r.v) + '</span></div>').join('') + '</div>';
  const table = s => '<table><thead><tr>' + s.rows[0].map(h => '<th>' + hesc(h) + '</th>').join('') + '</tr></thead><tbody>' + s.rows.slice(1).map(r => '<tr>' + r.map(v => '<td class="' + (typeof v === 'number' ? 'n' : '') + '">' + fmt(v) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
  const body = sheets.map((s, i) => '<section><h2>' + (i + 1) + '. ' + hesc(s.name) + '</h2>' + (s.note ? '<p class="note">' + hesc(s.note) + '</p>' : '') + (charts[s.name] ? bar(charts[s.name].rows, charts[s.name].color) : '') + table(s) + '</section>').join('');
  const html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>' + hesc(meta.file) + '</title><style>' +
    '@page{size:A4;margin:18mm 14mm 20mm;@bottom-left{content:"Dados agregados, sem informações pessoais";font:9pt Helvetica,Arial,sans-serif;color:#6B6780}@bottom-right{content:"Página " counter(page) " de " counter(pages);font:9pt Helvetica,Arial,sans-serif;color:#6B6780}}' +
    '*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{margin:0;font:10pt/1.45 Helvetica,Arial,sans-serif;color:#1F1B33}' +
    'header{border-bottom:2px solid #483D8B;padding-bottom:10px;margin-bottom:16px}header h1{margin:0;font-size:16pt;color:#2E2757}header p{margin:4px 0 0;color:#4A4660}' +
    'section{break-inside:avoid;margin-bottom:18px}h2{font-size:12pt;margin:0 0 6px;color:#2E2757}.note{margin:0 0 8px;color:#6B6780;font-size:9pt}' +
    'table{width:100%;border-collapse:collapse;font-size:9pt}th{text-align:left;background:#EEEBFA;padding:5px 7px;border-bottom:1px solid #C9C2E6}td{padding:4px 7px;border-bottom:1px solid #EEEDF3}td.n{text-align:right;font-variant-numeric:tabular-nums}' +
    '.chart{margin:4px 0 10px}.br{display:grid;grid-template-columns:170px 1fr 60px;gap:8px;align-items:center;font-size:8.5pt;margin:2px 0}.bl{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bt{height:9px;background:#F1EFF7;border-radius:3px;overflow:hidden}.bt i{display:block;height:100%}.bv{text-align:right}' +
    '</style></head><body><header><h1>PROCON Jacareí · Relatório do ProconChat</h1><p>Período: ' + hesc(meta.periodo) + ' · Gerado em ' + hesc(meta.geradoEm) + ' por ' + hesc(meta.autor) + '</p></header>' + body + '</body></html>';
  const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'; document.body.appendChild(f);
  const d = f.contentDocument; d.open(); d.write(html); d.close();
  setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } finally { setTimeout(() => f.remove(), 60000); } }, 300);
}

export function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
