import {
  Location,
  Lot,
  LotDelta,
  PurchaseOrder,
  MovementOptions,
  validDate,
  expired,
  fefo,
  dateKey,
} from "./warehouse";
export const categories = [
  "Abarrotes",
  "Bebidas",
  "Limpieza",
  "Cuidado personal",
] as const;
export type Category = (typeof categories)[number];
export type OperationType = "entrada" | "salida" | "merma";
export type MovementType = OperationType | "ajuste" | "traslado";
export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  notes: string;
}
export type SupplierDraft = Omit<Supplier, "id">;
export interface Product {
  id: string;
  name: string;
  code: string;
  category: Category;
  stock: number;
  minStock: number;
  cost: number;
  unit: string;
  location: string;
  photoUri?: string;
  supplierId?: string;
}
export interface Movement {
  actorId?: string;
  actorName?: string;
  approvedBy?: string;
  id: string;
  productId: string;
  productName: string;
  type: MovementType;
  quantity: number;
  before: number;
  after: number;
  note: string;
  createdAt: string;
  supplierId?: string;
  supplierName?: string;
  allocations?: LotDelta[];
  orderId?: string;
}
export interface Inventory {
  version: 3;
  locations: Location[];
  lots: Lot[];
  orders: PurchaseOrder[];
  trackingSince: string;
  suppliers: Supplier[];
  products: Product[];
  movements: Movement[];
}
export type ProductDraft = Omit<Product, "id" | "stock">;
export const money = (n: number) =>
  `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const isLow = (p: Product) => p.stock <= p.minStock;
export const usableStock = (s: Inventory, id: string) =>
  s.lots
    .filter((l) => l.productId === id && !expired(l))
    .reduce((n, l) => n + l.quantity, 0);
export function validateDraft(d: ProductDraft) {
  if (!d.name.trim() || !d.code.trim() || !d.location.trim() || !d.unit.trim())
    throw new Error("Completa nombre, código, unidad y ubicación.");
  if (d.name.trim().length > 80 || d.code.trim().length > 80)
    throw new Error("Nombre y código deben tener máximo 80 caracteres.");
  if (!categories.includes(d.category))
    throw new Error("Selecciona una categoría válida.");
  if (!Number.isSafeInteger(d.minStock) || d.minStock < 0)
    throw new Error("El stock mínimo debe ser un entero mayor o igual a 0.");
  if (!Number.isFinite(d.cost) || d.cost < 0 || d.cost > 1e9)
    throw new Error("Ingresa un costo válido entre 0 y 1 000 000 000.");
}
export function saveProduct(
  s: Inventory,
  draft: ProductDraft,
  id: string,
): Inventory {
  validateDraft(draft);
  if (!s.locations.some((l) => l.id === draft.location))
    throw new Error("Selecciona una ubicación registrada.");
  if (draft.supplierId && !s.suppliers.some((x) => x.id === draft.supplierId))
    throw new Error("El proveedor no existe.");
  const clean = {
    ...draft,
    name: draft.name.trim(),
    code: draft.code.trim(),
    unit: draft.unit.trim(),
    location: draft.location.trim(),
  };
  if (
    s.products.some(
      (p) => p.id !== id && p.code.toLowerCase() === clean.code.toLowerCase(),
    )
  )
    throw new Error("Ya existe un producto con ese código.");
  const current = s.products.find((p) => p.id === id);
  const product = { ...clean, id, stock: current?.stock ?? 0 };
  return {
    ...s,
    products: current
      ? s.products.map((p) => (p.id === id ? product : p))
      : [...s.products, product],
  };
}
export function recordMovement(
  s: Inventory,
  productId: string,
  type: OperationType,
  quantity: number,
  note: string,
  id: string,
  now: string,
  supplierId?: string,
  options: MovementOptions = {},
): Inventory {
  const p = s.products.find((x) => x.id === productId);
  if (!p) throw new Error("El producto no existe.");
  if (!["entrada", "salida", "merma"].includes(type))
    throw new Error("Tipo de movimiento no válido.");
  if (!Number.isSafeInteger(quantity) || quantity <= 0)
    throw new Error("La cantidad debe ser un número entero mayor a 0.");
  if (!note.trim())
    throw new Error(
      "Agrega una referencia o motivo para conservar la trazabilidad.",
    );
  const after = p.stock + (type === "entrada" ? quantity : -quantity);
  if (after < 0)
    throw new Error(
      `Stock insuficiente. Solo hay ${p.stock} unidades disponibles.`,
    );
  if (!Number.isSafeInteger(after))
    throw new Error("La cantidad excede el límite permitido.");
  const supplier = supplierId
    ? s.suppliers.find((x) => x.id === supplierId)
    : undefined;
  if (supplierId && (type !== "entrada" || !supplier))
    throw new Error("Proveedor inválido para esta operación.");
  let lots = s.lots.map((l) => ({ ...l }));
  const allocations: LotDelta[] = [];
  let orders = s.orders;
  const today = dateKey(new Date(now));
  if (type === "entrada") {
    const locationId = options.locationId ?? p.location;
    if (!s.locations.some((l) => l.id === locationId))
      throw new Error("Selecciona una ubicación registrada.");
    if (
      options.expiresOn &&
      (!validDate(options.expiresOn) || options.expiresOn < today)
    )
      throw new Error(
        "El vencimiento debe ser una fecha válida, hoy o posterior.",
      );
    const code = (options.lotCode ?? `SIN-LOTE-${id}`).trim();
    if (!code || code.length > 80)
      throw new Error("Ingresa un código de lote de hasta 80 caracteres.");
    const lot: Lot = {
      id: `lot-${id}`,
      productId,
      code,
      locationId,
      quantity,
      receivedAt: now,
      ...(options.expiresOn ? { expiresOn: options.expiresOn } : {}),
    };
    lots.push(lot);
    allocations.push({ ...lot, lotId: lot.id, delta: quantity });
    if (options.orderId) {
      const order = s.orders.find((o) => o.id === options.orderId);
      const line = order?.lines.find((l) => l.productId === productId);
      if (
        !order ||
        order.status !== "confirmada" ||
        order.supplierId !== supplierId ||
        !line ||
        quantity > line.quantity - line.received
      )
        throw new Error(
          "La recepción supera lo pendiente o la orden no está confirmada.",
        );
      orders = s.orders.map((o) => {
        if (o.id !== order.id) return o;
        const lines = o.lines.map((l) =>
          l.productId === productId
            ? { ...l, received: l.received + quantity }
            : l,
        );
        return {
          ...o,
          lines,
          status: lines.every((l) => l.received === l.quantity)
            ? ("cerrada" as const)
            : ("confirmada" as const),
        };
      });
    }
  } else {
    if (options.orderId)
      throw new Error("Solo las entradas pueden recibir una orden.");
    const available = fefo(
      lots.filter(
        (l) =>
          l.productId === productId &&
          l.quantity > 0 &&
          (type === "merma" || !expired(l, today)) &&
          (!options.lotId || l.id === options.lotId),
      ),
    );
    if (type === "salida" && options.lotId)
      throw new Error("Las salidas se asignan automáticamente por FEFO.");
    if (available.reduce((n, l) => n + l.quantity, 0) < quantity)
      throw new Error(
        type === "salida"
          ? "No hay suficientes unidades utilizables. Revisa los lotes vencidos."
          : "La cantidad supera el stock del lote seleccionado.",
      );
    let remaining = quantity;
    for (const lot of available) {
      if (!remaining) break;
      const used = Math.min(lot.quantity, remaining);
      lot.quantity -= used;
      remaining -= used;
      allocations.push({
        lotId: lot.id,
        code: lot.code,
        locationId: lot.locationId,
        delta: -used,
        ...(lot.expiresOn ? { expiresOn: lot.expiresOn } : {}),
      });
    }
  }
  const movement: Movement = {
    id,
    productId,
    productName: p.name,
    type,
    quantity,
    before: p.stock,
    after,
    note: note.trim(),
    createdAt: now,
    allocations,
    ...(supplier
      ? { supplierId: supplier.id, supplierName: supplier.name }
      : {}),
    ...(options.orderId ? { orderId: options.orderId } : {}),
  };
  return {
    ...s,
    lots,
    orders,
    products: s.products.map((x) =>
      x.id === productId ? { ...x, stock: after } : x,
    ),
    movements: [movement, ...s.movements],
  };
}
// Valida también los datos guardados: un archivo dañado nunca se reemplaza silenciosamente.
export function parseInventory(value: unknown): Inventory {
  const raw = value as any;
  if (
    !raw ||
    ![1, 2, 3].includes(raw.version) ||
    !Array.isArray(raw.products) ||
    !Array.isArray(raw.movements)
  )
    throw new Error("Los datos no tienen un formato compatible.");
  let s: Inventory;
  if (raw.version === 3) s = raw;
  else {
    const locations: Location[] = [
      ...new Set<string>(raw.products.map((p: Product) => p.location)),
    ].map((id) => ({
      id,
      label: id,
      warehouse: "Almacén principal",
      aisle: "",
      shelf: id,
    }));
    const now = new Date().toISOString();
    s = {
      ...raw,
      version: 3,
      suppliers: raw.version === 1 ? [] : raw.suppliers,
      locations,
      orders: [],
      trackingSince: now,
      lots: raw.products
        .filter((p: Product) => p.stock > 0)
        .map((p: Product) => ({
          id: `legacy-${p.id}`,
          productId: p.id,
          code: "SALDO ANTERIOR",
          locationId: p.location,
          quantity: p.stock,
          receivedAt: now,
        })),
    };
  }
  if (
    !Array.isArray(s.suppliers) ||
    !Array.isArray(s.locations) ||
    !Array.isArray(s.lots) ||
    !Array.isArray(s.orders) ||
    !Number.isFinite(Date.parse(s.trackingSince))
  )
    throw new Error("Formato de inventario inválido.");
  const supplierIds = new Set<string>();
  for (const supplier of s.suppliers) {
    if (
      !supplier ||
      typeof supplier.id !== "string" ||
      !supplier.id ||
      supplierIds.has(supplier.id)
    )
      throw new Error("Proveedor inválido.");
    validateSupplier(supplier);
    supplierIds.add(supplier.id);
  }
  const ids = new Set<string>(),
    codes = new Set<string>();
  for (const p of s.products) {
    if (
      !p ||
      typeof p.id !== "string" ||
      !p.id ||
      !["name", "code", "unit", "location"].every(
        (k) => typeof (p as any)[k] === "string",
      )
    )
      throw new Error("Producto inválido.");
    validateDraft(p);
    if (p.supplierId && !supplierIds.has(p.supplierId))
      throw new Error("Referencia de proveedor inválida.");
    if (
      p.photoUri !== undefined &&
      (typeof p.photoUri !== "string" ||
        !/^(file:\/\/|data:image\/jpeg;base64,)/.test(p.photoUri))
    )
      throw new Error("Foto inválida.");
    if (
      !Number.isSafeInteger(p.stock) ||
      p.stock < 0 ||
      ids.has(p.id) ||
      codes.has(p.code.toLowerCase())
    )
      throw new Error("Stock o código inválido.");
    ids.add(p.id);
    codes.add(p.code.toLowerCase());
  }
  const moves = new Set<string>();
  for (const m of s.movements) {
    if (
      !m ||
      typeof m.id !== "string" ||
      moves.has(m.id) ||
      !ids.has(m.productId) ||
      typeof m.productName !== "string" ||
      typeof m.note !== "string" ||
      !m.note.trim() ||
      !["entrada", "salida", "merma", "ajuste", "traslado"].includes(m.type) ||
      !Number.isSafeInteger(m.quantity) ||
      (m.type === "ajuste" ? m.quantity < 0 : m.quantity <= 0) ||
      !Number.isSafeInteger(m.before) ||
      m.before < 0 ||
      !Number.isSafeInteger(m.after) ||
      m.after < 0 ||
      (m.type === "ajuste"
        ? m.quantity !== Math.abs(m.after - m.before)
        : m.type === "traslado"
          ? m.after !== m.before
          : m.after !==
            m.before + (m.type === "entrada" ? m.quantity : -m.quantity)) ||
      (m.supplierId !== undefined &&
        (m.type !== "entrada" ||
          !supplierIds.has(m.supplierId) ||
          typeof m.supplierName !== "string")) ||
      !Number.isFinite(Date.parse(m.createdAt))
    )
      throw new Error("Movimiento inválido.");
    moves.add(m.id);
  }
  validateWarehouse(s);
  return s;
}

export function validateSupplier(d: SupplierDraft) {
  if (
    !d ||
    ![d.name, d.contact, d.phone, d.email, d.notes].every(
      (x) => typeof x === "string",
    )
  )
    throw new Error("Datos del proveedor inválidos.");
  if (!d.name.trim() || d.name.trim().length > 80)
    throw new Error("Ingresa un nombre de proveedor de hasta 80 caracteres.");
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))
    throw new Error("El correo no es válido.");
  if (d.phone && !/^[+()\d\s-]{7,24}$/.test(d.phone))
    throw new Error("Ingresa un teléfono válido.");
  if (d.contact.length > 80 || d.notes.length > 240)
    throw new Error("Contacto o notas demasiado extensos.");
}
export function saveSupplier(
  s: Inventory,
  draft: SupplierDraft,
  id: string,
): Inventory {
  const d = Object.fromEntries(
    Object.entries(draft).map(([k, v]) => [k, v.trim()]),
  ) as SupplierDraft;
  validateSupplier(d);
  if (
    s.suppliers.some(
      (x) => x.id !== id && x.name.toLowerCase() === d.name.toLowerCase(),
    )
  )
    throw new Error("Ya existe un proveedor con ese nombre.");
  return {
    ...s,
    suppliers: s.suppliers.some((x) => x.id === id)
      ? s.suppliers.map((x) => (x.id === id ? { ...d, id } : x))
      : [...s.suppliers, { ...d, id }],
  };
}
export function recordCount(
  s: Inventory,
  productId: string,
  counted: number,
  expected: number,
  note: string,
  id: string,
  now: string,
  lotId?: string,
): Inventory {
  const p = s.products.find((x) => x.id === productId);
  if (!p) throw new Error("El producto no existe.");
  if (!Number.isSafeInteger(counted) || counted < 0)
    throw new Error("El conteo debe ser un entero mayor o igual a 0.");
  if (!note.trim())
    throw new Error("Indica el motivo o referencia del conteo.");
  const productLots = s.lots.filter(
    (l) => l.productId === productId && l.quantity > 0,
  );
  const lot = lotId
    ? s.lots.find((l) => l.id === lotId && l.productId === productId)
    : productLots.length === 1
      ? productLots[0]
      : undefined;
  if (lotId && !lot) throw new Error("El lote no existe.");
  if (!lotId && productLots.length > 1)
    throw new Error("Selecciona un lote para contar sus existencias.");
  const beforeLot = lot?.quantity ?? 0;
  if ((lotId ? beforeLot : p.stock) !== expected)
    throw new Error(
      "El stock cambió durante el conteo. Vuelve al producto e inicia un nuevo conteo.",
    );
  const delta = counted - beforeLot,
    after = p.stock + delta;
  if (!Number.isSafeInteger(after) || after < 0)
    throw new Error("Cantidad fuera de rango.");
  const adjusted: Lot = lot
    ? { ...lot, quantity: counted }
    : {
        id: `count-${id}`,
        productId,
        code: "AJUSTE SIN FECHA",
        locationId: p.location,
        quantity: counted,
        receivedAt: now,
      };
  const lots = lot
    ? s.lots.map((l) => (l.id === lot.id ? adjusted : l))
    : [...s.lots, adjusted];
  const movement: Movement = {
    id,
    productId,
    productName: p.name,
    type: "ajuste",
    quantity: Math.abs(delta),
    before: p.stock,
    after,
    note: note.trim(),
    createdAt: now,
    allocations: [
      {
        lotId: adjusted.id,
        code: adjusted.code,
        locationId: adjusted.locationId,
        delta,
        ...(adjusted.expiresOn ? { expiresOn: adjusted.expiresOn } : {}),
      },
    ],
  };
  return {
    ...s,
    lots,
    products: s.products.map((x) =>
      x.id === p.id ? { ...x, stock: after } : x,
    ),
    movements: [movement, ...s.movements],
  };
}
export function saveLocation(s: Inventory, d: Location): Inventory {
  if (
    !d.id.trim() ||
    d.id.length > 60 ||
    !d.label.trim() ||
    !d.warehouse.trim()
  )
    throw new Error("Completa código, nombre y almacén.");
  if (s.locations.some((l) => l.id.toLowerCase() === d.id.toLowerCase()))
    throw new Error("Ya existe una ubicación con ese código.");
  return { ...s, locations: [...s.locations, d] };
}
export function transferLot(
  s: Inventory,
  lotId: string,
  to: string,
  note: string,
  id: string,
  now: string,
): Inventory {
  const lot = s.lots.find((l) => l.id === lotId);
  if (!lot || !lot.quantity) throw new Error("El lote no tiene existencias.");
  if (to === lot.locationId || !s.locations.some((l) => l.id === to))
    throw new Error("Selecciona otra ubicación.");
  if (!note.trim()) throw new Error("Indica el motivo del traslado.");
  const p = s.products.find((p) => p.id === lot.productId)!;
  const movement: Movement = {
    id,
    productId: p.id,
    productName: p.name,
    type: "traslado",
    quantity: lot.quantity,
    before: p.stock,
    after: p.stock,
    note,
    createdAt: now,
    allocations: [
      {
        lotId,
        code: lot.code,
        locationId: lot.locationId,
        delta: -lot.quantity,
        ...(lot.expiresOn ? { expiresOn: lot.expiresOn } : {}),
      },
      {
        lotId,
        code: lot.code,
        locationId: to,
        delta: lot.quantity,
        ...(lot.expiresOn ? { expiresOn: lot.expiresOn } : {}),
      },
    ],
  };
  return {
    ...s,
    lots: s.lots.map((l) => (l.id === lotId ? { ...l, locationId: to } : l)),
    movements: [movement, ...s.movements],
  };
}
function validateWarehouse(s: Inventory) {
  const locationIds = new Set<string>();
  for (const l of s.locations) {
    if (
      !l ||
      ![l.id, l.label, l.warehouse, l.aisle, l.shelf].every(
        (x) => typeof x === "string",
      ) ||
      !l.id ||
      locationIds.has(l.id)
    )
      throw new Error("Ubicación inválida.");
    locationIds.add(l.id);
  }
  const ids = new Set<string>();
  for (const l of s.lots) {
    if (
      !l ||
      !l.id ||
      ids.has(l.id) ||
      !s.products.some((p) => p.id === l.productId) ||
      !locationIds.has(l.locationId) ||
      typeof l.code !== "string" ||
      !Number.isSafeInteger(l.quantity) ||
      l.quantity < 0 ||
      (l.expiresOn && !validDate(l.expiresOn)) ||
      !Number.isFinite(Date.parse(l.receivedAt))
    )
      throw new Error("Lote inválido.");
    ids.add(l.id);
  }
  for (const p of s.products)
    if (
      !locationIds.has(p.location) ||
      s.lots
        .filter((l) => l.productId === p.id)
        .reduce((n, l) => n + l.quantity, 0) !== p.stock
    )
      throw new Error("El stock no coincide con los lotes.");
  for (const m of s.movements) {
    if (m.allocations !== undefined) {
      if (!Array.isArray(m.allocations) || !m.allocations.length)
        throw new Error("Detalle de lotes inválido.");
      for (const a of m.allocations)
        if (
          !a ||
          !ids.has(a.lotId) ||
          s.lots.find((l) => l.id === a.lotId)?.productId !== m.productId ||
          !locationIds.has(a.locationId) ||
          typeof a.code !== "string" ||
          !Number.isSafeInteger(a.delta) ||
          (a.expiresOn !== undefined && !validDate(a.expiresOn))
        )
          throw new Error("Detalle de lotes inválido.");
      if (m.allocations.reduce((n, a) => n + a.delta, 0) !== m.after - m.before)
        throw new Error("El movimiento no coincide con sus lotes.");
    }
    if (
      m.orderId !== undefined &&
      !s.orders.some((o) => o.id === m.orderId && o.supplierId === m.supplierId)
    )
      throw new Error("Referencia de compra inválida.");
  }
  const orderIds = new Set<string>();
  for (const o of s.orders) {
    if (
      !o ||
      !o.id ||
      orderIds.has(o.id) ||
      !s.suppliers.some((v) => v.id === o.supplierId) ||
      typeof o.supplierName !== "string" ||
      !Number.isFinite(Date.parse(o.createdAt)) ||
      !["borrador", "confirmada", "cerrada", "cancelada"].includes(o.status) ||
      !Array.isArray(o.lines) ||
      !o.lines.length
    )
      throw new Error("Orden inválida.");
    orderIds.add(o.id);
    const products = new Set<string>();
    for (const l of o.lines) {
      if (
        products.has(l.productId) ||
        !s.products.some((p) => p.id === l.productId) ||
        typeof l.productName !== "string" ||
        !Number.isSafeInteger(l.quantity) ||
        l.quantity <= 0 ||
        !Number.isSafeInteger(l.received) ||
        l.received < 0 ||
        l.received > l.quantity ||
        !Number.isFinite(l.unitCost) ||
        l.unitCost < 0
      )
        throw new Error("Línea de compra inválida.");
      products.add(l.productId);
    }
    if (
      o.status === "cerrada" &&
      !o.lines.every((l) => l.received === l.quantity)
    )
      throw new Error("Orden cerrada incompleta.");
  }
}
