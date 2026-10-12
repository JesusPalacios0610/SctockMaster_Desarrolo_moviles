import React, { useState } from "react";
import { Text } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParams } from "../navigation/types";
import {
  Page,
  Heading,
  Card,
  Field,
  Chips,
  Button,
  ErrorNotice,
  useUI,
  Empty,
} from "../components/UI";
import { Select } from "../components/Select";
import { SupplierSelect } from "../components/SupplierSelect";
import { useInventory } from "../hooks/useInventory";
import { useTheme } from "../theme/Preferences";
import { OperationType, recordMovement } from "../domain/inventory";
import { fefo, expired } from "../domain/warehouse";
export function MovementFormScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParams, "MovementForm">) {
  const s = useUI();
  const { prefs } = useTheme();
  const { data, move, busy } = useInventory();
  const p = data.products.find((p) => p.id === route.params.id);
  const order = data.orders.find((o) => o.id === route.params.orderId);
  const [type, setType] = useState<OperationType>(
    route.params.type ?? "entrada",
  );
  const [supplierId, setSupplierId] = useState(
    order?.supplierId ?? p?.supplierId ?? "",
  );
  const [quantity, setQuantity] = useState(
    route.params.quantity?.toString() ?? "",
  );
  const [note, setNote] = useState(
    order ? "Recepción de orden " + order.id : "",
  );
  const [lotCode, setLotCode] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [locationId, setLocationId] = useState(p?.location ?? "");
  const [lotId, setLotId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState(false);
  const [done, setDone] = useState(false);
  if (!p)
    return (
      <Page>
        <Empty title="Producto no disponible" detail="Vuelve al inventario." />
      </Page>
    );
  const lots = fefo(
    data.lots.filter((l) => l.productId === p.id && l.quantity > 0),
  );
  const available = lots
    .filter((l) => !expired(l))
    .reduce((n, l) => n + l.quantity, 0);
  const options =
    type === "entrada"
      ? {
          lotCode: lotCode.trim(),
          expiresOn: expiresOn.trim() || undefined,
          locationId,
          orderId: order?.id,
        }
      : type === "merma"
        ? { lotId: lotId || undefined }
        : {};
  function preview() {
    if (!p) return;
    setError(null);
    try {
      if (type === "entrada" && !lotCode.trim())
        throw new Error(
          "Indica el lote; si no figura en el envase, escribe SIN LOTE.",
        );
      recordMovement(
        data,
        p.id,
        type,
        Number(quantity),
        note,
        "preview",
        new Date().toISOString(),
        type === "entrada" ? supplierId || undefined : undefined,
        options,
      );
      setReview(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function submit() {
    if (!p) return;
    setError(null);
    try {
      await move(
        p.id,
        type,
        Number(quantity),
        note,
        type === "entrada" ? supplierId || undefined : undefined,
        options,
      );
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (done)
    return (
      <Page>
        <Empty
          icon="checkmark-circle-outline"
          title="Movimiento registrado"
          detail={`Se guardaron el stock y los lotes de ${p.name}.`}
        />
        <Button
          title={order ? "Volver a la orden" : "Volver al producto"}
          onPress={() => navigation.goBack()}
        />
      </Page>
    );
  return (
    <Page>
      <Heading
        eyebrow={
          prefs.simplified
            ? review
              ? "PASO 3 · CONFIRMAR"
              : "PASO 2 · CANTIDAD"
            : "OPERACIÓN DE ALMACÉN"
        }
        title={review ? "Revisa el movimiento" : "Registrar movimiento"}
        subtitle={p.name}
      />
      {!review && !order && (
        <Chips
          options={["entrada", "salida", "merma"] as const}
          value={type}
          onChange={setType}
        />
      )}
      <Card>
        <Text style={s.h2}>{p.stock} unidades físicas</Text>
        <Text style={s.sub}>
          {available} disponibles para salida · {p.stock - available} vencidas
        </Text>
        <Text style={s.sub}>
          Stock después:{" "}
          {quantity
            ? p.stock + (type === "entrada" ? 1 : -1) * Number(quantity)
            : "—"}
        </Text>
      </Card>
      {review ? (
        <Card>
          <Text style={s.h2}>
            {type.toUpperCase()} · {quantity} unidades
          </Text>
          <Text style={s.sub}>{note}</Text>
          {type === "entrada" && (
            <Text style={s.sub}>
              Lote {lotCode} · {locationId} ·{" "}
              {expiresOn || "Sin vencimiento informado"} ·{" "}
              {data.suppliers.find((v) => v.id === supplierId)?.name ||
                "Sin proveedor"}
            </Text>
          )}
          <Text style={s.sub}>
            {type === "salida"
              ? "Se descontarán primero los lotes que vencen antes."
              : type === "merma"
                ? "Se registrará una pérdida de existencias."
                : "Se incorporará un lote al inventario."}
          </Text>
        </Card>
      ) : (
        <>
          {type === "entrada" && (
            <>
              {order ? (
                <Text style={s.sub}>
                  Compra confirmada de {order.supplierName}. Esta entrada
                  actualiza sus unidades recibidas.
                </Text>
              ) : (
                <SupplierSelect
                  suppliers={data.suppliers}
                  value={supplierId}
                  onChange={setSupplierId}
                />
              )}
              <Field
                label="Código del lote"
                value={lotCode}
                onChangeText={setLotCode}
                maxLength={80}
                placeholder="Ej. L-2026-01 / SIN LOTE"
              />
              <Field
                label="Vencimiento (AAAA-MM-DD, opcional)"
                value={expiresOn}
                onChangeText={setExpiresOn}
                placeholder="2027-06-30"
                maxLength={10}
              />
              <Select
                label="Ubicación de recepción"
                value={locationId}
                onChange={setLocationId}
                options={data.locations.map((l) => ({
                  id: l.id,
                  label: l.id + " · " + l.label,
                }))}
              />
            </>
          )}
          {type === "merma" && (
            <Select
              label="Lote afectado"
              value={lotId}
              onChange={setLotId}
              options={[
                { id: "", label: "Automático: primero en vencer" },
                ...lots.map((l) => ({
                  id: l.id,
                  label:
                    l.code +
                    " · " +
                    l.locationId +
                    " · " +
                    l.quantity +
                    " unid.",
                })),
              ]}
            />
          )}
          <Field
            label="Cantidad (unidades enteras)"
            keyboardType="number-pad"
            value={quantity}
            onChangeText={setQuantity}
            placeholder="0"
          />
          <Field
            label={
              type === "merma" ? "Motivo de la merma" : "Referencia / motivo"
            }
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={240}
          />
          {type === "salida" && (
            <Text style={s.sub}>
              FEFO: vencimientos más próximos primero. Los lotes sin fecha se
              usan al final; los vencidos quedan excluidos.
            </Text>
          )}
        </>
      )}
      <ErrorNotice message={error} />
      <Button
        title={
          busy
            ? "Guardando…"
            : review
              ? "Confirmar movimiento"
              : "Revisar movimiento"
        }
        disabled={busy}
        onPress={() => (review ? void submit() : preview())}
      />
      {review && (
        <Button
          title="Corregir datos"
          secondary
          disabled={busy}
          onPress={() => setReview(false)}
        />
      )}
    </Page>
  );
}
