import { test } from "node:test";
import assert from "node:assert/strict";
import seed from "../src/data/inventory.json";
import {
  parseInventory,
  saveSupplier,
  saveProduct,
  recordMovement,
  recordCount,
} from "../src/domain/inventory";
const initial = () => parseInventory(structuredClone(seed));
const draft = {
  name: "Proveedor Lima",
  contact: "Ana",
  phone: "999888777",
  email: "ana@example.com",
  notes: "",
};
const now = "2026-10-12T02:00:00Z";
test("alta y edición de proveedor conservan ID y evitan duplicados", () => {
  let s = saveSupplier(initial(), draft, "s1");
  assert.throws(() => saveSupplier(s, draft, "s2"), /Ya existe/);
  s = saveSupplier(s, { ...draft, name: "Proveedor Centro" }, "s1");
  assert.equal(s.suppliers.length, 1);
  assert.equal(s.suppliers[0].name, "Proveedor Centro");
});
test("valida teléfono, correo y nombre de proveedor", () => {
  for (const change of [{ name: "" }, { email: "mal" }, { phone: "abc" }])
    assert.throws(() => saveSupplier(initial(), { ...draft, ...change }, "s1"));
});
test("asocia productos y entradas con proveedor; historial conserva nombre", () => {
  let s = saveSupplier(initial(), draft, "s1");
  s = saveProduct(s, { ...s.products[0], supplierId: "s1" }, "p1");
  s = recordMovement(s, "p1", "entrada", 2, "F001", "m1", now, "s1");
  s = saveSupplier(s, { ...draft, name: "Nombre nuevo" }, "s1");
  assert.equal(s.movements[0].supplierName, "Proveedor Lima");
  assert.equal(
    parseInventory(JSON.parse(JSON.stringify(s))).products[0].supplierId,
    "s1",
  );
  assert.throws(() =>
    saveProduct(s, { ...s.products[0], supplierId: "bad" }, "p1"),
  );
  assert.throws(() =>
    recordMovement(s, "p1", "salida", 1, "Salida", "m2", now, "s1"),
  );
});
test("conteo faltante, sobrante, cero y coincidencia conservan trazabilidad", () => {
  for (const counted of [0, 18, 48, 60]) {
    const s = initial();
    const next = recordCount(s, "p1", counted, 48, "Conteo A-01", "c1", now);
    assert.equal(s.products[0].stock, 48);
    assert.equal(next.products[0].stock, counted);
    assert.equal(next.movements[0].quantity, Math.abs(counted - 48));
    assert.equal(next.movements[0].type, "ajuste");
    assert.deepEqual(parseInventory(JSON.parse(JSON.stringify(next))), next);
  }
});
test("conteo rechaza valores inválidos, motivo vacío y saldo obsoleto", () => {
  for (const q of [-1, 1.5, NaN, Infinity])
    assert.throws(() =>
      recordCount(initial(), "p1", q, 48, "Conteo", "c", now),
    );
  assert.throws(() => recordCount(initial(), "p1", 1, 48, " ", "c", now));
  assert.throws(
    () => recordCount(initial(), "p1", 1, 47, "Conteo", "c", now),
    /cambió/,
  );
});
test("archivo v2 corrupto y foto temporal se rechazan", () => {
  const s = initial();
  s.products[0].supplierId = "bad";
  assert.throws(() => parseInventory(s));
  const t = initial();
  t.products[0].photoUri = "blob:temporal";
  assert.throws(() => parseInventory(t));
});
