import React, {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Inventory,
  ProductDraft,
  OperationType,
  SupplierDraft,
  saveSupplier,
  recordCount,
  saveProduct,
  saveLocation,
  transferLot,
  recordMovement,
} from "../domain/inventory";
import { loadInventory, persistInventory } from "../services/inventoryService";
import { Location, MovementOptions, PurchaseOrder } from "../domain/warehouse";
import { createDrafts, updateOrder } from "../domain/purchasing";
interface Snapshot {
  data: Inventory;
  revision: number;
}
interface Store {
  data: Inventory;
  loading: boolean;
  error: string | null;
  busy: boolean;
  reload: () => Promise<void>;
  save: (draft: ProductDraft, id?: string) => Promise<string>;
  saveVendor: (draft: SupplierDraft, id?: string) => Promise<string>;
  move: (
    id: string,
    type: OperationType,
    qty: number,
    note: string,
    supplierId?: string,
    options?: MovementOptions,
  ) => Promise<void>;
  count: (
    id: string,
    quantity: number,
    expected: number,
    note: string,
    lotId?: string,
  ) => Promise<void>;
  addLocation: (location: Location) => Promise<void>;
  transfer: (lotId: string, to: string, note: string) => Promise<void>;
  draftOrders: (coverage: number, lead: number) => Promise<void>;
  changeOrder: (
    id: string,
    status: PurchaseOrder["status"],
    quantities?: Record<string, number>,
  ) => Promise<void>;
}
export const InventoryContext = createContext<Store | null>(null);
const empty: Inventory = {
  version: 3,
  locations: [],
  lots: [],
  orders: [],
  trackingSince: new Date().toISOString(),
  products: [],
  movements: [],
  suppliers: [],
};
export function InventoryProvider({ children }: React.PropsWithChildren) {
  const [data, setData] = useState(empty),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const ref = useRef(data),
    locked = useRef(false);
  const mounted = useRef(true);
  const publish = useCallback((v: Snapshot) => {
    if (!mounted.current) return;
    ref.current = v.data;
    setData(v.data);
  }, []);
  const refresh = useCallback(
    async (initial = false) => {
      if (locked.current) return;
      locked.current = true;
      if (initial) {
        setLoading(true);
        setError(null);
      }
      try {
        {
          const next = await loadInventory();
          publish({ data: next, revision: 0 });
        }
      } catch (e) {
        if (mounted.current) setError((e as Error).message);
      } finally {
        locked.current = false;
        if (mounted.current) setLoading(false);
      }
    },
    [publish],
  );
  useEffect(() => {
    mounted.current = true;
    void refresh(true);
    return () => {
      mounted.current = false;
    };
  }, [refresh]);
  const commit = async (update: (s: Inventory) => Inventory) => {
    if (locked.current)
      throw Error("Espera a que finalice la operación actual.");
    locked.current = true;
    setBusy(true);
    try {
      const next = update(ref.current);
      await persistInventory(next);
      publish({ data: next, revision: 0 });
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const uid = () =>
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.floor(Math.random() * 16);
      return (c === "x" ? r : (r & 3) | 8).toString(16);
    });
  const value: Store = {
    data,
    loading,
    error,
    busy,
    reload: () => refresh(!!error),
    save: async (draft, id) => {
      const created = id ?? uid();
      const clean = draft;
      await commit((s) => saveProduct(s, clean, created));
      return created;
    },
    saveVendor: async (draft, id) => {
      const created = id ?? uid();
      await commit((s) => saveSupplier(s, draft, created));
      return created;
    },
    move: async (id, type, qty, note, supplierId, options) => {
      await commit((s) =>
        recordMovement(
          s,
          id,
          type,
          qty,
          note,
          uid(),
          new Date().toISOString(),
          supplierId,
          options,
        ),
      );
    },
    count: async (id, quantity, expected, note, lotId) => {
      await commit((s) =>
        recordCount(
          s,
          id,
          quantity,
          expected,
          note,
          uid(),
          new Date().toISOString(),
          lotId,
        ),
      );
    },
    addLocation: async (location) => {
      await commit((s) => saveLocation(s, location));
    },
    transfer: async (lotId, to, note) => {
      await commit((s) =>
        transferLot(s, lotId, to, note, uid(), new Date().toISOString()),
      );
    },
    draftOrders: async (coverage, lead) => {
      await commit((s) =>
        createDrafts(s, coverage, lead, uid(), new Date().toISOString()),
      );
    },
    changeOrder: async (id, status, quantities) => {
      await commit((s) => updateOrder(s, id, status, quantities));
    },
  };
  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}
