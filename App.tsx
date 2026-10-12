import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { InventoryProvider } from "./src/context/InventoryContext";
import { useInventory } from "./src/hooks/useInventory";
import { AppNavigator } from "./src/navigation/AppNavigator";
import {
  Page,
  Loading,
  Heading,
  ErrorNotice,
  Button,
} from "./src/components/UI";
import { PreferencesProvider, useTheme } from "./src/theme/Preferences";
function Content() {
  const theme = useTheme();
  const { loading, error, reload } = useInventory();
  if (loading || !theme.ready)
    return (
      <Page>
        <Loading />
      </Page>
    );
  if (error)
    return (
      <Page>
        <Heading
          title="No pudimos abrir tus datos"
          subtitle="Tu información guardada no se ha reemplazado. Reintenta la lectura."
        />
        <ErrorNotice message={error} />
        <Button title="Reintentar" onPress={() => void reload()} />
      </Page>
    );
  return (
    <>
      <StatusBar style={theme.dark ? "light" : "dark"} />
      <AppNavigator />
    </>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <PreferencesProvider>
        <InventoryProvider>
          <Content />
        </InventoryProvider>
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}
