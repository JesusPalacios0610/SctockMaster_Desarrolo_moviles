import { zipSync, strToU8 } from "fflate";
import { Inventory } from "./inventory";
import { dateKey, validDate, expired } from "./warehouse";
export const escapeHTML = (v: unknown) =>
  String(v ?? "")
    .replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&apos;",
        })[c]!,
    )
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
type Cell = string | number;
export interface Sheet {
  name: string;
  rows: Cell[][];
}
export function reportSheets(
  s: Inventory,
  from: string,
  to: string,
  now = new Date(),
): Sheet[] {
  if (!validDate(from) || !validDate(to) || from > to)
    throw new Error(
      "Indica un intervalo válido: AAAA-MM-DD; inicio no posterior al fin.",
    );
  const within = (value: string) => {
    const key = dateKey(new Date(value));
    return key >= from && key <= to;
  };
  const metadata: Sheet = {
    name: "Información",
    rows: [
      ["StockMaster", "Reporte de almacén"],
      ["Generado", now.toLocaleString("es-PE")],
      ["Movimientos desde", from],
      ["Movimientos hasta", to],
      [
        "Alcance",
        "Inventario, lotes y compras: estado actual. Solo movimientos se filtra por fecha.",
      ],
      ["Moneda", "PEN; valores a costo, sin impuestos ni flete."],
      ["Nota", "No es una copia de seguridad restaurable."],
    ],
  };
  return [
    metadata,
    {
      name: "Inventario",
      rows: [
        [
          "Producto",
          "Código",
          "Categoría",
          "Stock físico",
          "Disponible salida",
          "Mínimo",
          "Costo PEN",
          "Valor físico PEN",
          "Recepción habitual",
          "Proveedor",
        ],
        ...s.products.map((p) => [
          p.name,
          p.code,
          p.category,
          p.stock,
          s.lots
            .filter((l) => l.productId === p.id && !expired(l, dateKey(now)))
            .reduce((n, l) => n + l.quantity, 0),
          p.minStock,
          p.cost,
          p.stock * p.cost,
          p.location,
          s.suppliers.find((v) => v.id === p.supplierId)?.name ?? "",
        ]),
      ],
    },
    {
      name: "Lotes",
      rows: [
        [
          "Producto",
          "Lote",
          "Ubicación",
          "Cantidad",
          "Vencimiento",
          "Estado",
          "Recibido",
        ],
        ...s.lots.map((l) => [
          s.products.find((p) => p.id === l.productId)?.name ?? l.productId,
          l.code,
          l.locationId,
          l.quantity,
          l.expiresOn ?? "Sin fecha",
          expired(l, dateKey(now))
            ? "Vencido"
            : l.expiresOn
              ? "Vigente"
              : "Sin fecha",
          new Date(l.receivedAt).toLocaleString("es-PE"),
        ]),
      ],
    },
    {
      name: "Movimientos",
      rows: [
        [
          "Fecha",
          "Producto",
          "Tipo",
          "Cantidad",
          "Antes",
          "Después",
          "Motivo",
          "Proveedor",
          "Lotes y ubicaciones",
          "Orden",
        ],
        ...s.movements
          .filter((m) => within(m.createdAt))
          .map((m) => [
            new Date(m.createdAt).toLocaleString("es-PE"),
            m.productName,
            m.type,
            m.quantity,
            m.before,
            m.after,
            m.note,
            m.supplierName ?? "",
            m.allocations
              ?.map(
                (a) =>
                  `${a.code} / ${a.locationId}: ${a.delta > 0 ? "+" : ""}${a.delta}`,
              )
              .join("; ") ?? "Sin detalle anterior",
            m.orderId ?? "",
          ]),
      ],
    },
    {
      name: "Compras",
      rows: [
        [
          "Orden",
          "Proveedor",
          "Estado",
          "Fecha",
          "Producto",
          "Cantidad",
          "Recibido",
          "Pendiente",
          "Costo PEN",
          "Total PEN",
        ],
        ...s.orders.flatMap((o) =>
          o.lines.map((l) => [
            o.id,
            o.supplierName,
            o.status,
            new Date(o.createdAt).toLocaleString("es-PE"),
            l.productName,
            l.quantity,
            l.received,
            o.status === "cancelada" ? 0 : l.quantity - l.received,
            l.unitCost,
            l.quantity * l.unitCost,
          ]),
        ),
      ],
    },
  ];
}
function col(n: number): string {
  let name = "";
  for (n++; n; n = Math.floor((n - 1) / 26))
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
}
export function workbook(sheets: Sheet[]): Uint8Array {
  const xml = (s: string) =>
    strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + s);
  const ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  const rel =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const files: Record<string, Uint8Array> = {};
  files["[Content_Types].xml"] = xml(
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`,
  );
  files["_rels/.rels"] = xml(
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
  );
  files["xl/workbook.xml"] = xml(
    `<workbook xmlns="${ns}" xmlns:r="${rel}"><sheets>${sheets.map((s, i) => `<sheet name="${escapeHTML(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`,
  );
  files["xl/_rels/workbook.xml.rels"] = xml(
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${rel}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="styles" Type="${rel}/styles" Target="styles.xml"/></Relationships>`,
  );
  files["xl/styles.xml"] = xml(
    `<styleSheet xmlns="${ns}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF174F3C"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"><alignment wrapText="1"/></xf><xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
  );
  sheets.forEach((sheet, i) => {
    const count = Math.max(...sheet.rows.map((r) => r.length), 1);
    files[`xl/worksheets/sheet${i + 1}.xml`] = xml(
      `<worksheet xmlns="${ns}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${Array.from({ length: count }, (_, j) => `<col min="${j + 1}" max="${j + 1}" width="${j === 0 ? 32 : 24}" customWidth="1"/>`).join("")}</cols><sheetData>${sheet.rows
        .map(
          (row, r) =>
            `<row r="${r + 1}"${r === 0 ? ' ht="30" customHeight="1"' : ""}>${row
              .map((v, c) => {
                const ref = col(c) + (r + 1);
                return typeof v === "number"
                  ? `<c r="${ref}" s="${Number.isInteger(v) ? 0 : 2}"><v>${v}</v></c>`
                  : `<c r="${ref}" s="${r === 0 ? 1 : 0}" t="inlineStr"><is><t xml:space="preserve">${escapeHTML(v)}</t></is></c>`;
              })
              .join("")}</row>`,
        )
        .join(
          "",
        )}</sheetData>${i > 0 ? `<autoFilter ref="A1:${col(count - 1)}${sheet.rows.length}"/>` : ""}</worksheet>`,
    );
  });
  return zipSync(files, { level: 6 });
}
export function reportHTML(sheets: Sheet[]): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"/><title>StockMaster · Reporte</title><style>@page{size:A4 landscape;margin:14mm}body{font-family:Arial,sans-serif;color:#173c2e;font-size:10px}h1{font-size:26px}h2{font-size:18px;margin-top:25px}table{border-collapse:collapse;width:100%;table-layout:fixed}th{background:#174f3c;color:white;text-align:left}td,th{padding:7px;border:1px solid #d6e2dc;overflow-wrap:anywhere}tr:nth-child(even){background:#f2f7f4}thead{display:table-header-group}tr{break-inside:avoid}.section{break-before:page}.section:first-of-type{break-before:auto}p{line-height:1.6}</style></head><body><h1>StockMaster · Reporte de almacén</h1>${sheets
    .map((sheet, i) =>
      i === 0
        ? sheet.rows
            .slice(1)
            .map(
              (r) => `<p><b>${escapeHTML(r[0])}:</b> ${escapeHTML(r[1])}</p>`,
            )
            .join("")
        : `<section class="section"><h2>${escapeHTML(sheet.name)}</h2><table><thead><tr>${sheet.rows[0].map((v) => `<th>${escapeHTML(v)}</th>`).join("")}</tr></thead><tbody>${
            sheet.rows
              .slice(1)
              .map(
                (row) =>
                  `<tr>${row.map((v) => `<td>${escapeHTML(typeof v === "number" && !Number.isInteger(v) ? v.toFixed(2) : v)}</td>`).join("")}</tr>`,
              )
              .join("") ||
            `<tr><td colspan="${sheet.rows[0].length}">Sin registros</td></tr>`
          }</tbody></table></section>`,
    )
    .join("")}</body></html>`;
}
