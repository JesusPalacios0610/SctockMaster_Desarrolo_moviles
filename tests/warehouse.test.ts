import { test } from "node:test";
import assert from "node:assert/strict";
import seed from "../src/data/inventory.json";
import {
  parseInventory,
  recordMovement,
  recordCount,
  transferLot,
  saveLocation,
  saveSupplier,
  saveProduct,
} from "../src/domain/inventory";
import { replenish, createDrafts, updateOrder } from "../src/domain/purchasing";
import { locationQR, readLocationQR, validDate } from "../src/domain/warehouse";
import { reportSheets, workbook, reportHTML } from "../src/domain/reports";
import { unzipSync, strFromU8 } from "fflate";
const now = "2026-10-12T12:00:00Z",
  base = () => parseInventory(structuredClone(seed));
function stocked() {
  let s = base();
  s = recordMovement(s, "p1", "entrada", 5, "recepción", "a", now, undefined, {
    lotCode: "PRONTO",
    expiresOn: "2026-10-14",
  });
  s = recordMovement(s, "p1", "entrada", 7, "recepción", "b", now, undefined, {
    lotCode: "DESPUÉS",
    expiresOn: "2026-11-01",
  });
  return s;
}
test("FEFO reparte entre lotes, preserva saldo sin fecha y no muta el origen", () => {
  const s = stocked();
  const n = recordMovement(s, "p1", "salida", 8, "despacho", "out", now);
  assert.deepEqual(
    n.movements[0].allocations?.map((a) => [a.code, a.delta]),
    [
      ["PRONTO", -5],
      ["DESPUÉS", -3],
    ],
  );
  assert.equal(s.lots.find((l) => l.code === "PRONTO")?.quantity, 5);
  assert.equal(n.lots.find((l) => l.id === "legacy-p1")?.quantity, 48);
  assert.equal(
    parseInventory(JSON.parse(JSON.stringify(n))).products[0].stock,
    52,
  );
});
test("vencidos bloqueados para salida; merma permite retirarlos", () => {
  let s = stocked();
  s.lots.find((l) => l.code === "PRONTO")!.expiresOn = "2026-10-11";
  assert.throws(
    () => recordMovement(s, "p1", "salida", 56, "despacho", "x", now),
    /utilizables/,
  );
  s = recordMovement(s, "p1", "merma", 5, "vencido", "m", now, undefined, {
    lotId: "lot-a",
  });
  assert.equal(s.lots.find((l) => l.id === "lot-a")?.quantity, 0);
  parseInventory(s);
});
test("fechas reales y recepción vencida se rechazan", () => {
  assert.equal(validDate("2026-02-29"), false);
  assert.equal(validDate("2028-02-29"), true);
  for (const expiresOn of ["2026-02-30", "2025-10-10"])
    assert.throws(() =>
      recordMovement(base(), "p1", "entrada", 1, "r", "x", now, undefined, {
        expiresOn,
      }),
    );
});
test("conteo por lote y traslado mantienen suma global e historial", () => {
  let s = stocked();
  assert.throws(
    () => recordCount(s, "p1", 20, 60, "conteo", "c", now),
    /Selecciona/,
  );
  s = recordCount(s, "p1", 3, 5, "conteo", "c", now, "lot-a");
  assert.equal(s.products[0].stock, 58);
  s = saveLocation(s, {
    id: "Z-1",
    label: "Despacho",
    warehouse: "Principal",
    aisle: "Z",
    shelf: "1",
  });
  s = transferLot(s, "lot-a", "Z-1", "reubicar", "t", now);
  assert.equal(s.products[0].stock, 58);
  assert.equal(
    s.movements[0].allocations?.reduce((n, a) => n + a.delta, 0),
    0,
  );
  assert.equal(s.lots.find((l) => l.id === "lot-a")?.locationId, "Z-1");
  parseInventory(s);
});
test("migración v2 conserva fotos proveedores e historial sin inventar fechas", () => {
  const old = {
    ...structuredClone(seed),
    version: 2,
    suppliers: [
      {
        id: "v",
        name: "Proveedor",
        contact: "",
        phone: "",
        email: "",
        notes: "",
      },
    ],
  };
  Object.assign(old.products[0], {
    photoUri: "data:image/jpeg;base64,YQ==",
    supplierId: "v",
  });
  const s = parseInventory(old);
  assert.deepEqual(s.products, old.products);
  assert.deepEqual(s.suppliers, old.suppliers);
  assert.equal(
    s.lots.reduce((n, l) => n + l.quantity, 0),
    206,
  );
  assert.ok(s.lots.every((l) => !l.expiresOn));
  assert.throws(() => parseInventory({ ...s, lots: [] }));
});
test("reposición usa mínimo sin historial y promedio solo con evidencia suficiente", () => {
  let s = base();
  s.trackingSince = "2026-10-01T12:00:00Z";
  for (let i = 0; i < 3; i++)
    s = recordMovement(
      s,
      "p1",
      "salida",
      5,
      "venta",
      "s" + i,
      "2026-10-0" + (i + 2) + "T12:00:00Z",
    );
  const x = replenish(s, 14, 3, new Date(now))[0];
  assert.equal(x.daily, 15 / 11);
  assert.equal(
    x.target,
    Math.max(s.products[0].minStock, Math.ceil((15 / 11) * 17)),
  );
  assert.equal(replenish(base(), 14, 3, new Date(now))[0].daily, null);
});
test("compras: agrupar, evitar duplicados, confirmar, recibir parcial y cerrar", () => {
  let s = base();
  s = saveSupplier(
    s,
    { name: "Proveedor", contact: "", phone: "", email: "", notes: "" },
    "v",
  );
  s = saveProduct(s, { ...s.products[1], supplierId: "v", minStock: 12 }, "p2");
  s = createDrafts(s, 14, 3, "order", now);
  const id = s.orders[0].id;
  assert.equal(s.orders[0].lines[0].quantity, 6);
  assert.throws(() => createDrafts(s, 14, 3, "other", now), /No hay/);
  s = updateOrder(s, id, "confirmada");
  assert.equal(replenish(s, 14, 3, new Date(now))[1].suggested, 0);
  assert.throws(() => updateOrder(s, id, "borrador"));
  const before = JSON.stringify(s);
  assert.throws(() =>
    recordMovement(s, "p2", "entrada", 7, "recepción", "bad", now, "v", {
      orderId: id,
    }),
  );
  assert.equal(JSON.stringify(s), before);
  s = recordMovement(s, "p2", "entrada", 2, "recepción", "r1", now, "v", {
    orderId: id,
  });
  assert.equal(s.orders[0].status, "confirmada");
  assert.equal(s.orders[0].lines[0].received, 2);
  s = recordMovement(s, "p2", "entrada", 4, "recepción", "r2", now, "v", {
    orderId: id,
  });
  assert.equal(s.orders[0].status, "cerrada");
  assert.equal(s.products[1].stock, 12);
  parseInventory(s);
});
test("cancelar compra parcial conserva lo recibido y elimina pendiente", () => {
  let s = base();
  s = saveSupplier(
    s,
    { name: "Proveedor", contact: "", phone: "", email: "", notes: "" },
    "v",
  );
  s = saveProduct(s, { ...s.products[1], supplierId: "v", minStock: 12 }, "p2");
  s = createDrafts(s, 14, 3, "o", now);
  const id = s.orders[0].id;
  s = updateOrder(s, id, "confirmada");
  s = recordMovement(s, "p2", "entrada", 2, "r", "r", now, "v", {
    orderId: id,
  });
  s = updateOrder(s, id, "cancelada");
  assert.equal(s.products[1].stock, 8);
  assert.equal(replenish(s, 14, 3, new Date(now))[1].pending, 0);
  assert.throws(() =>
    recordMovement(s, "p2", "entrada", 1, "r", "r2", now, "v", { orderId: id }),
  );
});
test("QR diferencia ubicaciones y códigos de productos", () => {
  assert.equal(readLocationQR(locationQR("Pasillo A/1")), "Pasillo A/1");
  assert.equal(readLocationQR("7750001000011"), null);
  assert.throws(() => readLocationQR("stockmaster:location:%"));
});
test("reportes: rango solo filtra movimientos; texto literal sin fórmulas y HTML escapado", () => {
  const s = recordMovement(
    base(),
    "p1",
    "salida",
    1,
    "<script>bad</script>",
    "x",
    now,
  );
  s.products[0].name = '=HYPERLINK("bad")';
  const sheets = reportSheets(s, "2026-10-12", "2026-10-12", new Date(now));
  assert.equal(sheets[3].rows.length, 2);
  assert.equal(reportSheets(s, "2026-10-13", "2026-10-13")[3].rows.length, 1);
  assert.equal(sheets[1].rows.length, 9);
  const zip = unzipSync(workbook(sheets));
  assert.equal(Object.keys(zip).length, 10);
  const xml = strFromU8(zip["xl/worksheets/sheet2.xml"]);
  assert.ok(xml.includes('t="inlineStr"'));
  assert.ok(!xml.includes("<f>"));
  assert.ok(reportHTML(sheets).includes("&lt;script&gt;"));
  assert.throws(() => reportSheets(s, "2026-10-15", "2026-10-01"));
});
