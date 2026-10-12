import React, { useState } from "react";
import { Text, View } from "react-native";
import { SvgXml } from "react-native-svg";
import qrcode from "qrcode-generator";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParams } from "../navigation/types";
import {
  Page,
  Heading,
  Card,
  Button,
  ErrorNotice,
  ProductRow,
  useUI,
  Empty,
} from "../components/UI";
import { useInventory } from "../hooks/useInventory";
import { locationQR } from "../domain/warehouse";
import { shareHtml, escapeHTML } from "../services/reportService";
export function LocationDetailScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParams, "LocationDetail">) {
  const s = useUI(),
    { data } = useInventory(),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const l = data.locations.find((l) => l.id === route.params.id);
  if (!l)
    return (
      <Page>
        <Empty
          title="Ubicación no encontrada"
          detail="Verifica el código del QR."
        />
      </Page>
    );
  const value = locationQR(l.id);
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const svg = qr.createSvgTag(5, 20);
  async function label() {
    if (!l) return;
    setBusy(true);
    setError(null);
    try {
      await shareHtml(
        `<!doctype html><html><head><meta charset="utf-8"/></head><body style="font-family:Arial;text-align:center;padding:35px"><h1>StockMaster · ${escapeHTML(l.id)}</h1><h2>${escapeHTML(l.label)}</h2><p>${escapeHTML(l.warehouse)} / ${escapeHTML(l.aisle)} / ${escapeHTML(l.shelf)}</p>${svg}<p>${escapeHTML(value)}</p></body></html>`,
        "Etiqueta-ubicacion",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const products = data.products
    .map((p) => ({
      ...p,
      location: l.id,
      stock: data.lots
        .filter((b) => b.productId === p.id && b.locationId === l.id)
        .reduce((n, b) => n + b.quantity, 0),
    }))
    .filter((p) => p.stock > 0);
  return (
    <Page>
      <Heading
        eyebrow="ETIQUETA DE UBICACIÓN"
        title={`${l.id} · ${l.label}`}
        subtitle={`${l.warehouse} · ${l.aisle || "Sin pasillo"} · ${l.shelf || "Sin estante"}`}
      />
      <View
        accessible
        accessibilityLabel={`Código QR para ubicación ${l.id}`}
        style={{
          alignSelf: "center",
          padding: 12,
          backgroundColor: "#fff",
          borderRadius: 18,
        }}
      >
        <SvgXml xml={svg} width={230} height={230} />
      </View>
      <Text selectable style={s.small}>
        {value}
      </Text>
      <Button
        title={busy ? "Preparando…" : "Exportar etiqueta PDF"}
        icon="print-outline"
        disabled={busy}
        onPress={() => void label()}
      />
      <ErrorNotice message={error} />
      <Card>
        <Text style={s.sub}>
          Las cantidades siguientes corresponden solo a esta ubicación. Para
          trasladar existencias, abre el producto → Lotes y ubicaciones.
        </Text>
      </Card>
      {products.map((p) => (
        <ProductRow
          key={p.id}
          product={p}
          onPress={() => navigation.navigate("ProductDetail", { id: p.id })}
        />
      ))}
      {!products.length && (
        <Empty
          title="Ubicación sin existencias"
          detail="Registra una entrada o traslada un lote aquí."
        />
      )}
    </Page>
  );
}
