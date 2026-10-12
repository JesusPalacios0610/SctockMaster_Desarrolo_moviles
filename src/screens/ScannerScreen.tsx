import { readLocationQR } from "../domain/warehouse";
import { useTheme } from "../theme/Preferences";
import React, { useRef, useState } from "react";
import { Text, View, Linking, Platform } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useIsFocused } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParams } from "../navigation/types";
import {
  Page,
  Heading,
  Card,
  Field,
  Button,
  ErrorNotice,
  useUI,
  Icon,
} from "../components/UI";
import { useInventory } from "../hooks/useInventory";

export function ScannerScreen({
  navigation,
}: NativeStackScreenProps<RootStackParams, "Scanner">) {
  const { colors: c } = useTheme();
  const s = useUI();

  const { data } = useInventory();
  const [permission, requestPermission] = useCameraPermissions();
  const focused = useIsFocused();
  const [manual, setManual] = useState("");
  const [unknown, setUnknown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);
  const lock = useRef(false);
  function lookup(raw: string) {
    const code = raw.trim();
    if (!code) {
      setError("Ingresa un código.");
      return;
    }
    if (lock.current) return;
    lock.current = true;
    setScanned(true);
    setError(null);
    try {
      const id = readLocationQR(code);
      if (id !== null) {
        if (data.locations.some((l) => l.id === id))
          navigation.replace("LocationDetail", { id });
        else {
          setError("Esta ubicación no existe en este dispositivo.");
          lock.current = false;
          setScanned(false);
        }
        return;
      }
    } catch {
      setError("QR de ubicación inválido.");
      lock.current = false;
      setScanned(false);
      return;
    }
    const p = data.products.find(
      (p) => p.code.toLowerCase() === code.toLowerCase(),
    );
    if (p) navigation.replace("ProductDetail", { id: p.id });
    else setUnknown(code);
  }
  function reset() {
    lock.current = false;
    setScanned(false);
    setUnknown(null);
    setError(null);
  }
  async function allow() {
    try {
      await requestPermission();
    } catch {
      setError(
        "No se pudo acceder a la cámara. Puedes ingresar el código manualmente.",
      );
    }
  }
  return (
    <Page>
      <Heading
        eyebrow="IDENTIFICACIÓN RÁPIDA"
        title="Apunta. Escanea. Listo."
        subtitle="Escanea un producto o una etiqueta de ubicación."
      />
      {Platform.OS !== "web" && permission?.granted && focused && !scanned ? (
        <View
          style={{
            height: 280,
            borderRadius: 24,
            overflow: "hidden",
            backgroundColor: c.dark,
          }}
        >
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{
              barcodeTypes: [
                "qr",
                "ean13",
                "ean8",
                "code128",
                "code39",
                "upc_a",
                "upc_e",
              ],
            }}
            onBarcodeScanned={({ data: code }) => lookup(code)}
            onMountError={() =>
              setError("No se pudo iniciar la cámara. Usa el ingreso manual.")
            }
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: "14%",
              right: "14%",
              top: 65,
              bottom: 65,
              borderWidth: 2,
              borderColor: c.lime,
              borderRadius: 18,
            }}
          />
        </View>
      ) : (
        <Card dark>
          <View style={{ alignItems: "center", paddingVertical: 18, gap: 15 }}>
            <Icon name="scan-outline" color={c.lime} size={70} />
            <Text
              style={{ color: "#fff", textAlign: "center", lineHeight: 22 }}
            >
              {scanned
                ? "Código leído"
                : Platform.OS === "web"
                  ? "Usa la cámara desde Expo Go en tu teléfono. En esta vista puedes ingresar el código."
                  : "Permite el acceso a la cámara para leer QR y códigos de barras."}
            </Text>
          </View>
        </Card>
      )}
      {Platform.OS !== "web" && !permission?.granted && (
        <Button
          title={
            permission?.canAskAgain === false
              ? "Abrir ajustes del dispositivo"
              : "Permitir cámara"
          }
          icon="camera-outline"
          onPress={() =>
            permission?.canAskAgain === false
              ? void Linking.openSettings().catch(() =>
                  setError("Abre los ajustes de la aplicación manualmente."),
                )
              : void allow()
          }
        />
      )}
      {Platform.OS !== "web" && permission?.granted && !scanned && (
        <Button
          title={torch ? "Apagar linterna" : "Encender linterna"}
          secondary
          icon="flashlight-outline"
          onPress={() => setTorch(!torch)}
        />
      )}
      {unknown !== null ? (
        <Card>
          <Text style={s.h2}>Producto no registrado</Text>
          <Text style={s.sub}>Código: {unknown}</Text>
          <Button
            title="Crear producto con este código"
            onPress={() => navigation.replace("ProductForm", { code: unknown })}
          />
          <Button title="Escanear otro" secondary onPress={reset} />
        </Card>
      ) : (
        <>
          <Field
            label="También puedes escribir el código"
            placeholder="Ej. 7750001000011"
            value={manual}
            onChangeText={setManual}
            autoCapitalize="none"
          />
          <Button
            title="Buscar código"
            secondary
            icon="search-outline"
            onPress={() => lookup(manual)}
          />
        </>
      )}
      <ErrorNotice message={error} />
      <Text style={s.small}>
        El QR puede contener un código de producto o una etiqueta de ubicación
        generada aquí. Leer un código identifica el artículo; el stock cambia
        solo al confirmar un movimiento.
      </Text>
    </Page>
  );
}
