import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, Palette } from "./theme";
export type Mode = "Sistema" | "Claro" | "Oscuro";
interface Prefs {
  mode: Mode;
  simplified: boolean;
}
const dark: Palette = {
  ...colors,
  bg: "#101B19",
  paper: "#1B2A26",
  ink: "#EFF8F3",
  muted: "#B6C9C0",
  primary: "#9DDFC0",
  mint: "#243F34",
  line: "#42574D",
  warning: "#F2C879",
  warningBg: "#3F3422",
  red: "#FFB3AD",
  redBg: "#442A29",
  blue: "#A9CCF5",
  onPrimary: "#102E2A",
};
const C = createContext<{
  colors: Palette;
  dark: boolean;
  prefs: Prefs;
  ready: boolean;
  error: string | null;
  setPrefs: (x: Partial<Prefs>) => Promise<void>;
} | null>(null);
const KEY = "@stockmaster/preferences/v1";
export function PreferencesProvider({ children }: React.PropsWithChildren) {
  const [prefs, set] = useState<Prefs>({ mode: "Sistema", simplified: false });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const system = useColorScheme();
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!active) return;
        if (raw) {
          const v = JSON.parse(raw);
          if (
            ["Sistema", "Claro", "Oscuro"].includes(v.mode) &&
            typeof v.simplified === "boolean"
          )
            set(v);
          else throw new Error("Preferencias inválidas.");
        }
      })
      .catch(() => {
        if (active)
          setError(
            "No se pudieron leer las preferencias. Puedes volver a elegirlas.",
          );
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  const isDark =
    prefs.mode === "Oscuro" || (prefs.mode === "Sistema" && system === "dark");
  async function setPrefs(x: Partial<Prefs>) {
    const next = { ...prefs, ...x };
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      set(next);
      setError(null);
    } catch {
      setError("No se pudo guardar la preferencia. Inténtalo de nuevo.");
    }
  }
  return (
    <C.Provider
      value={{
        colors: isDark ? dark : colors,
        dark: isDark,
        prefs,
        ready,
        error,
        setPrefs,
      }}
    >
      {children}
    </C.Provider>
  );
}
export function useTheme() {
  const value = useContext(C);
  if (!value) throw new Error("Falta PreferencesProvider.");
  return value;
}
