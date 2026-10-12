import React, { useState } from "react";
import { Text, Platform } from "react-native";
import {
  Page,
  Heading,
  Card,
  Field,
  Button,
  ErrorNotice,
  useUI,
} from "../components/UI";
import { useInventory } from "../hooks/useInventory";
import { dateKey } from "../domain/warehouse";
import { reportSheets, reportHTML, workbook } from "../domain/reports";
import { shareHtml, shareWorkbook } from "../services/reportService";
export function ReportsScreen() {
  const s = useUI();
  const { data } = useInventory();
  const [from, setFrom] = useState(
      dateKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    ),
    [to, setTo] = useState(dateKey(new Date()));
  const [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState("");
  async function run(kind: "pdf" | "xlsx") {
    setBusy(true);
    setError(null);
    setDone("");
    try {
      const sheets = reportSheets(data, from, to);
      const name = "StockMaster-" + dateKey(new Date());
      if (kind === "pdf") await shareHtml(reportHTML(sheets), name);
      else await shareWorkbook(workbook(sheets), name);
      setDone(
        Platform.OS === "web"
          ? kind === "pdf"
            ? "Reporte abierto: elige Guardar como PDF en el diálogo de impresión."
            : "Se inició la descarga de Excel."
          : "Archivo preparado. Elige dónde guardarlo o compartirlo.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page>
      <Heading
        eyebrow="INFORMACIÓN PARA DECIDIR"
        title="Reportes claros"
        subtitle="Inventario, lotes, movimientos y compras."
      />
      <Card>
        <Text style={s.h2}>Estado actual del almacén</Text>
        <Text style={s.sub}>
          {data.products.length} productos · {data.lots.length} lotes ·{" "}
          {data.orders.length} órdenes
        </Text>
        <Text style={s.small}>
          El intervalo se aplica únicamente a movimientos. Inventario, lotes y
          compras muestran su estado actual. Moneda PEN; valores a costo.
        </Text>
      </Card>
      <Field
        label="Movimientos desde (AAAA-MM-DD)"
        value={from}
        onChangeText={setFrom}
        maxLength={10}
      />
      <Field
        label="Movimientos hasta (AAAA-MM-DD)"
        value={to}
        onChangeText={setTo}
        maxLength={10}
      />
      <Button
        title="Exportar Excel (.xlsx)"
        icon="grid-outline"
        disabled={busy}
        onPress={() => void run("xlsx")}
      />
      <Button
        title="Exportar PDF"
        icon="document-text-outline"
        secondary
        disabled={busy}
        onPress={() => void run("pdf")}
      />
      <ErrorNotice message={error} />
      {!!done && (
        <Text accessibilityLiveRegion="polite" style={s.sub}>
          {done}
        </Text>
      )}
      <Text style={s.small}>
        Excel incluye cinco hojas, encabezados y filtros. PDF usa tablas para
        impresión. Estos reportes no sustituyen una copia de seguridad
        restaurable.
      </Text>
    </Page>
  );
}
