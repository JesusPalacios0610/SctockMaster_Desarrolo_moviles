// Tipos compartidos sin dependencias de UI ni almacenamiento.
export interface Location {
  id: string;
  label: string;
  warehouse: string;
  aisle: string;
  shelf: string;
}
export interface Lot {
  id: string;
  productId: string;
  code: string;
  locationId: string;
  quantity: number;
  expiresOn?: string;
  receivedAt: string;
}
export interface LotDelta {
  lotId: string;
  code: string;
  locationId: string;
  delta: number;
  expiresOn?: string;
}
export interface PurchaseLine {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  received: number;
}
export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  createdAt: string;
  status: "borrador" | "confirmada" | "cerrada" | "cancelada";
  lines: PurchaseLine[];
}
export interface MovementOptions {
  lotCode?: string;
  expiresOn?: string;
  locationId?: string;
  lotId?: string;
  orderId?: string;
}
export function dateKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function validDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
export const expired = (lot: Lot, today = dateKey()) =>
  !!lot.expiresOn && lot.expiresOn < today;
export function fefo(lots: Lot[]): Lot[] {
  return [...lots].sort(
    (a, b) =>
      (a.expiresOn ?? "9999-12-31").localeCompare(
        b.expiresOn ?? "9999-12-31",
      ) ||
      a.receivedAt.localeCompare(b.receivedAt) ||
      a.id.localeCompare(b.id),
  );
}
export function locationQR(id: string) {
  return `stockmaster:location:${encodeURIComponent(id)}`;
}
export function readLocationQR(value: string): string | null {
  if (!value.startsWith("stockmaster:location:")) return null;
  try {
    return decodeURIComponent(value.slice("stockmaster:location:".length));
  } catch {
    throw new Error("El QR de ubicación no es válido.");
  }
}
