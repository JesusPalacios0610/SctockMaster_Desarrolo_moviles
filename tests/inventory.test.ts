import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseInventory,
  recordMovement,
  saveProduct,
  isLow,
} from "../src/domain/inventory";
import seed from "../src/data/inventory.json";
const initial = () => parseInventory(structuredClone(seed));
const now = "2026-10-12T00:00:00Z";
test("entrada conserva el estado anterior y registra trazabilidad", () => {
  const s = initial();
  const next = recordMovement(
    s,
    "p2",
    "entrada",
    10,
    "Factura F001",
    "m1",
    now,
  );
  assert.equal(s.products[1].stock, 6);
  assert.equal(next.products[1].stock, 16);
  assert.deepEqual(
    [next.movements[0].before, next.movements[0].after],
    [6, 16],
  );
  assert.equal(isLow(next.products[1]), false);
});
test("salida no permite stock negativo y no altera historial", () => {
  const s = initial();
  assert.throws(
    () => recordMovement(s, "p2", "salida", 7, "Pedido", "m1", now),
    /insuficiente/,
  );
  assert.equal(s.movements.length, 0);
  assert.equal(s.products[1].stock, 6);
});
test("merma descuenta y salida exacta puede agotar stock", () => {
  const s = recordMovement(initial(), "p2", "merma", 2, "Rotura", "m1", now);
  const end = recordMovement(s, "p2", "salida", 4, "Pedido", "m2", now);
  assert.equal(end.products[1].stock, 0);
  assert.equal(end.movements.length, 2);
  assert.equal(isLow(end.products[1]), true);
});
test("rechaza cantidades inválidas y motivos vacíos", () => {
  for (const n of [0, -1, 1.2, NaN, Infinity])
    assert.throws(() =>
      recordMovement(initial(), "p1", "entrada", n, "F001", "m", now),
    );
  assert.throws(() =>
    recordMovement(initial(), "p1", "entrada", 1, "  ", "m", now),
  );
});
test("no permite códigos duplicados y editar conserva stock", () => {
  const s = initial();
  assert.throws(() => saveProduct(s, s.products[0], "nuevo"), /código/);
  const next = saveProduct(
    s,
    { ...s.products[0], name: "Arroz editado" },
    "p1",
  );
  assert.equal(next.products[0].stock, 48);
  assert.equal(next.products[0].name, "Arroz editado");
});
test("nuevos productos empiezan en cero", () => {
  const next = saveProduct(
    initial(),
    {
      name: "Nuevo",
      code: "N-001",
      category: "Bebidas",
      minStock: 5,
      cost: 3,
      unit: "Botella",
      location: "B-01",
    },
    "new",
  );
  assert.equal(next.products.at(-1)?.stock, 0);
});
test("persistencia serializable y detección de datos corruptos", () => {
  const s = recordMovement(initial(), "p1", "salida", 4, "Pedido", "m", now);
  assert.deepEqual(parseInventory(JSON.parse(JSON.stringify(s))), s);
  assert.throws(() => parseInventory({ version: 2 }));
  const bad = initial();
  bad.products[0].stock = -1;
  assert.throws(() => parseInventory(bad));
});
test("rechaza movimientos corruptos al cargar", () => {
  const s = recordMovement(initial(), "p1", "entrada", 2, "F001", "m", now);
  s.movements[0].after = 1000;
  assert.throws(() => parseInventory(s), /Movimiento/);
});

test("migra versión 1 sin perder productos ni movimientos", () => {
  const old = structuredClone(seed);
  const result = parseInventory(old);
  assert.equal(result.version, 3);
  assert.deepEqual(result.products, old.products);
  assert.deepEqual(result.movements, old.movements);
  assert.deepEqual(result.suppliers, []);
  assert.equal(old.version, 1);
});
