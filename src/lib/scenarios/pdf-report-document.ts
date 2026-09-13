export function wrapPdfText(value: string, maxCharacters: number) {
  const words = normalizePdfText(value).split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines: string[] = [];
  let lineValue = "";
  for (const word of words) {
    const chunks = word.length > maxCharacters
      ? word.match(new RegExp(`.{1,${maxCharacters}}`, "g")) ?? [word]
      : [word];
    for (const chunk of chunks) {
      const candidate = lineValue ? `${lineValue} ${chunk}` : chunk;
      if (candidate.length > maxCharacters && lineValue) {
        lines.push(lineValue);
        lineValue = chunk;
      } else lineValue = candidate;
    }
  }
  if (lineValue) lines.push(lineValue);
  return lines;
}

export const normalizePdfText = (value: string) => value
  .replace(/[–—−]/g, "-")
  .replace(/²/g, "2")
  .replace(/[^\u0020-\u007eÇĞİÖŞÜçğıöşü]/g, "-");

const escaped = (value: string) => normalizePdfText(value)
  .replace(/\\/g, "\\\\")
  .replace(/\(/g, "\\(")
  .replace(/\)/g, "\\)")
  .replace(/[ĞğİıŞşÇçÖöÜü]/g, (character) => TURKISH_PDF_OCTAL[character] ?? character);

export const pdfText = (x: number, y: number, size: number, value: string, font: "F1" | "F2", color: string) =>
  `BT ${color} rg /${font} ${size} Tf ${x} ${y} Td (${escaped(value)}) Tj ET`;
export const pdfRect = (x: number, y: number, width: number, height: number, fill: string) =>
  `q ${fill} rg ${x} ${y} ${width} ${height} re f Q`;
export const pdfRectStroke = (x: number, y: number, width: number, height: number, fill: string, stroke: string) =>
  `q ${fill} rg ${stroke} RG 0.5 w ${x} ${y} ${width} ${height} re B Q`;
export const pdfLine = (x1: number, y1: number, x2: number, y2: number, stroke: string) =>
  `q ${stroke} RG 0.5 w ${x1} ${y1} m ${x2} ${y2} l S Q`;

export function buildPdfDocument(pageCommands: readonly (readonly string[])[]) {
  const objects: string[] = [];
  const add = (value: string) => { objects.push(value); return objects.length; };
  const encoding = "/Encoding << /Type /Encoding /BaseEncoding /WinAnsiEncoding /Differences [128 /Gbreve /gbreve /Idotaccent /dotlessi /Scedilla /scedilla] >>";
  const regularFont = add(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica ${encoding} >>`);
  const boldFont = add(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold ${encoding} >>`);
  const pagesId = 3 + pageCommands.length * 2;
  const pageIds: number[] = [];
  pageCommands.forEach((commands) => {
    const stream = commands.join("\n");
    const contentId = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${regularFont} 0 R /F2 ${boldFont} 0 R >> >> /Contents ${contentId} 0 R >>`));
  });
  add(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
  const catalog = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  let output = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(output.length);
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = output.length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer << /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(output);
}

const TURKISH_PDF_OCTAL: Record<string, string> = {
  "Ğ": "\\200", "ğ": "\\201", "İ": "\\202", "ı": "\\203", "Ş": "\\204", "ş": "\\205",
  "Ç": "\\307", "ç": "\\347", "Ö": "\\326", "ö": "\\366", "Ü": "\\334", "ü": "\\374",
};
