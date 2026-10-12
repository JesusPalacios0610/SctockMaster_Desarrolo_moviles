import React, { useState } from "react";
import { Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { RootNavigation } from "../navigation/types";
import { useTheme, Mode } from "../theme/Preferences";
import {
  Page,
  Heading,
  Card,
  Chips,
  Button,
  ErrorNotice,
  useUI,
} from "../components/UI";
export function SettingsScreen() {
  const { prefs, setPrefs, error } = useTheme();
  const s = useUI();
  const nav = useNavigation<RootNavigation>();
  const [saving, setSaving] = useState(false);
  async function change(x: Parameters<typeof setPrefs>[0]) {
    if (saving) return;
    setSaving(true);
    try {
      await setPrefs(x);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Page>
      <Heading
        eyebrow="STOCKMASTER / LOCAL"
        title="A tu manera"
        subtitle="Personaliza tu espacio de trabajo."
      />
      <Card>
        <Text style={s.h2}>Apariencia</Text>
        <View pointerEvents={saving ? "none" : "auto"}>
          <View style={{ gap: 8 }}>
            {(["Sistema", "Claro", "Oscuro"] as Mode[]).map((mode) => (
              <Button
                key={mode}
                title={mode}
                secondary={prefs.mode !== mode}
                disabled={saving}
                onPress={() => void change({ mode })}
              />
            ))}
          </View>
        </View>
        <Text style={s.sub}>Sistema sigue el tema de tu dispositivo.</Text>
      </Card>
      <Card>
        <Text style={s.h2}>Modo simplificado</Text>
        <Text style={s.sub}>
          Inicio con acciones claras, menos información en las listas y revisión
          guiada de movimientos. Puedes volver al modo completo en cualquier
          momento.
        </Text>
        <Button
          disabled={saving}
          title={
            prefs.simplified
              ? "Usar modo completo"
              : "Activar modo simplificado"
          }
          onPress={() => void change({ simplified: !prefs.simplified })}
        />
      </Card>
      <Card>
        <Text style={s.h2}>Accesibilidad</Text>
        <Text style={s.sub}>
          Los textos admiten el tamaño configurado en tu dispositivo. Los
          controles tienen etiquetas para lectores de pantalla y los estados
          incluyen texto, además del color.
        </Text>
      </Card>
      <ErrorNotice message={error} />
      <Button
        title="Ubicaciones QR"
        secondary
        onPress={() => nav.navigate("Locations")}
      />
      <Button
        title="Reposición sugerida"
        secondary
        onPress={() => nav.navigate("Replenishment")}
      />
      <Button
        title="Órdenes de compra"
        secondary
        onPress={() => nav.navigate("Orders")}
      />
      <Button
        title="Reportes Excel / PDF"
        secondary
        onPress={() => nav.navigate("Reports")}
      />
      <Button
        title="Proveedores"
        secondary
        onPress={() => nav.navigate("Suppliers")}
      />
      <Button
        title="Nuevo producto"
        secondary
        onPress={() => nav.navigate("ProductForm")}
      />
      <Card>
        <Text style={s.h2}>Inventario local</Text>
        <Text style={s.sub}>
          Los datos se guardan únicamente en este dispositivo. No necesitas
          iniciar sesión. Los reportes no son copias restaurables.
        </Text>
      </Card>
    </Page>
  );
}
