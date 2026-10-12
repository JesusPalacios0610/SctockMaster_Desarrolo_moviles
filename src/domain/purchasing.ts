import { Inventory } from "./inventory";
import { dateKey, expired, PurchaseOrder } from "./warehouse";
export interface Suggestion {
  productId: string;
  available: number;
  pending: number;
  daily: number | null;
  days: number;
  daysLeft: number | null;
  suggested: number;
  target: number;
  evidence: string;
}
export function replenish(
  s: Inventory,
  coverage = 14,
  lead = 3,
  now = new Date(),
): Suggestion[] {
  if (
    !Number.isSafeInteger(coverage) ||
    coverage < 1 ||
    coverage > 365 ||
    !Number.isSafeInteger(lead) ||
    lead < 0 ||
    lead > 365
  )
    throw new Error("Cobertura: 1–365 días. Entrega: 0–365 días.");
  const elapsed = Math.max(
    0,
    Math.min(
      30,
      Math.floor((now.getTime() - Date.parse(s.trackingSince)) / 86400000),
    ),
  );
  const from = now.getTime() - elapsed * 86400000;
  return s.products.map((p) => {
    const moves = s.movements.filter(
      (m) =>
        m.productId === p.id &&
        m.type === "salida" &&
        Date.parse(m.createdAt) >= from &&
        Date.parse(m.createdAt) <= now.getTime(),
    );
    const daily =
      elapsed >= 7 && moves.length >= 3
        ? moves.reduce((n, m) => n + m.quantity, 0) / elapsed
        : null;
    const available = s.lots
      .filter((l) => l.productId === p.id && !expired(l, dateKey(now)))
      .reduce((n, l) => n + l.quantity, 0);
    const pending = s.orders
      .filter((o) => o.status === "confirmada")
      .flatMap((o) => o.lines)
      .filter((l) => l.productId === p.id)
      .reduce((n, l) => n + l.quantity - l.received, 0);
    const target = Math.max(
      p.minStock,
      daily === null ? 0 : Math.ceil(daily * (coverage + lead)),
    );
    return {
      productId: p.id,
      available,
      pending,
      daily,
      days: elapsed,
      daysLeft: daily && daily > 0 ? available / daily : null,
      target,
      suggested: Math.max(0, target - available - pending),
      evidence:
        daily === null
          ? "Historial insuficiente: se usa el stock mínimo."
          : `Promedio de salidas en ${elapsed} días; no es una predicción de ML.`,
    };
  });
}
export function createDrafts(
  s: Inventory,
  coverage: number,
  lead: number,
  id: string,
  now: string,
): Inventory {
  const suggestions = replenish(s, coverage, lead, new Date(now));
  const groups = new Map<string, PurchaseOrder>();
  for (const suggestion of suggestions) {
    if (!suggestion.suggested) continue;
    const p = s.products.find((p) => p.id === suggestion.productId)!;
    const supplier = s.suppliers.find((v) => v.id === p.supplierId);
    if (!supplier) continue;
    if (
      s.orders.some(
        (o) =>
          o.status === "borrador" && o.lines.some((l) => l.productId === p.id),
      )
    )
      continue;
    let group = groups.get(supplier.id);
    if (!group) {
      group = {
        id: `${id}-${groups.size}`,
        supplierId: supplier.id,
        supplierName: supplier.name,
        createdAt: now,
        status: "borrador",
        lines: [],
      };
      groups.set(supplier.id, group);
    }
    group.lines.push({
      productId: p.id,
      productName: p.name,
      quantity: suggestion.suggested,
      unitCost: p.cost,
      received: 0,
    });
  }
  if (!groups.size)
    throw new Error(
      "No hay nuevas compras: revisa sugerencias, proveedor habitual y borradores existentes.",
    );
  return { ...s, orders: [...groups.values(), ...s.orders] };
}
export function updateOrder(
  s: Inventory,
  id: string,
  status: PurchaseOrder["status"],
  quantities?: Record<string, number>,
): Inventory {
  const o = s.orders.find((o) => o.id === id);
  if (!o) throw new Error("La orden no existe.");
  if (status === "borrador" || status === "confirmada") {
    if (o.status !== "borrador")
      throw new Error("Solo puedes editar o confirmar borradores.");
  } else if (status === "cancelada") {
    if (!["borrador", "confirmada"].includes(o.status))
      throw new Error("La orden ya terminó.");
  } else throw new Error("La orden se cierra al recibir todas sus unidades.");
  const lines = o.lines.map((l) => {
    const quantity = quantities?.[l.productId] ?? l.quantity;
    if (
      !Number.isSafeInteger(quantity) ||
      quantity <= 0 ||
      quantity > 1000000000
    )
      throw new Error("Ingresa cantidades enteras entre 1 y 1 000 000 000.");
    return { ...l, quantity };
  });
  return {
    ...s,
    orders: s.orders.map((x) => (x.id === id ? { ...o, lines, status } : x)),
  };
}
