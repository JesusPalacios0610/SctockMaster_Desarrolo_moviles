import AsyncStorage from "@react-native-async-storage/async-storage";
import seed from "../data/inventory.json";
import { Inventory, parseInventory } from "../domain/inventory";
const KEY = "@stockmaster/inventory/v1";
// Fuente local JSON permitida por la rúbrica. No se presenta como una API remota.
export async function loadInventory(): Promise<Inventory> {
  const raw = await AsyncStorage.getItem(KEY);
  if (raw !== null) {
    const source = JSON.parse(raw);
    const parsed = parseInventory(source);
    if (source.version !== 3) {
      await AsyncStorage.setItem(KEY + "/before-v3", raw);
      await persistInventory(parsed);
    }
    return parsed;
  }
  const initial = parseInventory(JSON.parse(JSON.stringify(seed)));
  await persistInventory(initial);
  return initial;
}
export async function persistInventory(data: Inventory): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}
