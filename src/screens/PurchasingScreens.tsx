import React, { useState } from "react";
import { Text } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParams } from "../navigation/types";
import {
  Page,
  Heading,
  Card,
  Field,
  Button,
  ErrorNotice,
  Empty,
  useUI,
  Chips,
} from "../components/UI";
import { useInventory } from "../hooks/useInventory";
import { replenish } from "../domain/purchasing";
import { money } from "../domain/inventory";
import { PurchaseOrder } from "../domain/warehouse";
export function ReplenishmentScreen({
  navigation,
}: NativeStackScreenProps<RootStackParams, "Replenishment">) {
  const s = useUI();
  const { data, draftOrders, busy } = useInventory();
  const [coverage, setCoverage] = useState("14"),
    [lead, setLead] = useState("3");
  const [applied, setApplied] = useState([14, 3]);
  const [error, setError] = useState<string | null>(null);
  const list = replenish(data, applied[0], applied[1]);
  function apply() {
    try {
      if (!coverage.trim() || !lead.trim())
        throw new Error("Completa ambos plazos.");
      replenish(data, Number(coverage), Number(lead));
      setApplied([Number(coverage), Number(lead)]);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function drafts() {
    try {
      await draftOrders(applied[0], applied[1]);
      navigation.navigate("Orders");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Page>
      <Heading
        eyebrow="PLANIFICACIÓN"
        title="Compra con criterio"
        subtitle="Sugerencias explicables con tus datos reales."
      />
      <Card>
        <Field
          label="Días de cobertura"
          value={coverage}
          onChangeText={setCoverage}
          keyboardType="number-pad"
        />
        <Field
          label="Días de entrega estimados"
          value={lead}
          onChangeText={setLead}
          keyboardType="number-pad"
        />
        <Button title="Calcular sugerencias" secondary onPress={apply} />
        <Text style={s.small}>
          Cálculo actual: {applied[0]} días de cobertura + {applied[1]} de
          entrega. Requiere 7 días registrados y 3 salidas para usar el
          promedio; mientras tanto usa el mínimo.
        </Text>
      </Card>
      <Button
        title="Ver órdenes de compra"
        secondary
        onPress={() => navigation.navigate("Orders")}
      />
      {list.map((x) => {
        const p = data.products.find((p) => p.id === x.productId)!;
        return (
          <Card key={p.id}>
            <Text style={s.h2}>{p.name}</Text>
            <Text style={s.stock}>Sugerido: {x.suggested} unid.</Text>
            <Text style={s.sub}>
              Disponible: {x.available} · Por recibir: {x.pending} · Objetivo:{" "}
              {x.target}
            </Text>
            <Text style={s.sub}>
              {x.evidence}
              {x.daily !== null
                ? " Salidas/día: " + x.daily.toFixed(2) + "."
                : ""}
              {x.daysLeft !== null
                ? " Cobertura estimada: " + x.daysLeft.toFixed(1) + " días."
                : ""}
            </Text>
            <Text style={s.small}>
              {data.suppliers.find((v) => v.id === p.supplierId)?.name ??
                "Asigna un proveedor habitual para generar su borrador."}
              {data.orders.some(
                (o) =>
                  o.status === "borrador" &&
                  o.lines.some((l) => l.productId === p.id),
              )
                ? " Ya tiene un borrador: revísalo en Órdenes."
                : ""}
            </Text>
            <Button
              title={"Editar proveedor de " + p.name}
              secondary
              onPress={() => navigation.navigate("ProductForm", { id: p.id })}
            />
          </Card>
        );
      })}
      <ErrorNotice message={error} />
      <Button
        title="Generar borradores por proveedor"
        disabled={busy}
        onPress={() => void drafts()}
      />
      <Text style={s.small}>
        Solo se agrupan sugerencias positivas con proveedor y sin otro borrador
        abierto. Ninguna orden se envía al proveedor automáticamente.
      </Text>
    </Page>
  );
}
export function OrdersScreen({
  navigation,
}: NativeStackScreenProps<RootStackParams, "Orders">) {
  const { data } = useInventory();
  const s = useUI();
  const [filter, setFilter] = useState("Todas");
  const list = data.orders.filter(
    (o) => filter === "Todas" || o.status === filter,
  );
  return (
    <Page>
      <Heading
        eyebrow="ABASTECIMIENTO"
        title="Órdenes de compra"
        subtitle="Borradores y recepciones, en un solo lugar."
      />
      <Button
        title="Nueva compra desde sugerencias"
        onPress={() => navigation.navigate("Replenishment")}
      />
      <Chips
        options={["Todas", "borrador", "confirmada", "cerrada", "cancelada"]}
        value={filter}
        onChange={setFilter}
      />
      {list.map((o) => (
        <Card key={o.id}>
          <Text style={s.h2}>{o.supplierName}</Text>
          <Text style={s.sub}>
            {o.status.toUpperCase()} ·{" "}
            {new Date(o.createdAt).toLocaleDateString("es-PE")}
          </Text>
          <Text style={s.stock}>
            {money(o.lines.reduce((n, l) => n + l.quantity * l.unitCost, 0))}
          </Text>
          <Text style={s.small}>
            Estimado a costo; no incluye impuestos ni flete.
          </Text>
          <Button
            title="Ver orden"
            secondary
            onPress={() => navigation.navigate("OrderDetail", { id: o.id })}
          />
        </Card>
      ))}
      {!list.length && (
        <Empty
          title="Sin órdenes"
          detail="Genera borradores desde las sugerencias de reposición."
        />
      )}
    </Page>
  );
}
export function OrderDetailScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParams, "OrderDetail">) {
  const { data, changeOrder, busy } = useInventory();
  const s = useUI();
  const o = data.orders.find((o) => o.id === route.params.id);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      o?.lines.map((l) => [l.productId, String(l.quantity)]) ?? [],
    ),
  );
  const [error, setError] = useState<string | null>(null),
    [cancel, setCancel] = useState(false),
    [message, setMessage] = useState("");
  if (!o)
    return (
      <Page>
        <Empty title="Orden no disponible" detail="Regresa a Órdenes." />
      </Page>
    );
  async function update(status: PurchaseOrder["status"]) {
    if (!o) return;
    try {
      await changeOrder(
        o.id,
        status,
        status === "cancelada"
          ? undefined
          : Object.fromEntries(
              Object.entries(values).map(([id, v]) => [id, Number(v)]),
            ),
      );
      setCancel(false);
      setMessage(
        status === "borrador"
          ? "Borrador guardado."
          : status === "confirmada"
            ? "Compra confirmada localmente. Registra cada recepción cuando llegue."
            : "Orden cancelada. Las recepciones anteriores se conservan.",
      );
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Page>
      <Heading
        eyebrow={o.status.toUpperCase()}
        title={o.supplierName}
        subtitle={o.id}
      />
      <Text style={s.sub}>
        Confirmar registra una compra prevista en este dispositivo; no envía
        mensajes ni pedidos al proveedor.
      </Text>
      {o.lines.map((l) => (
        <Card key={l.productId}>
          <Text style={s.h2}>{l.productName}</Text>
          <Text style={s.sub}>
            Costo de referencia: {money(l.unitCost)} · Recibido: {l.received} /{" "}
            {l.quantity}
          </Text>
          {o.status === "borrador" ? (
            <Field
              label={"Cantidad de " + l.productName}
              value={values[l.productId]}
              onChangeText={(v) => setValues({ ...values, [l.productId]: v })}
              keyboardType="number-pad"
            />
          ) : (
            <Text style={s.sub}>Pendiente: {l.quantity - l.received}</Text>
          )}
          {o.status === "confirmada" && l.received < l.quantity && (
            <Button
              title={"Recibir " + l.productName}
              secondary
              onPress={() =>
                navigation.navigate("MovementForm", {
                  id: l.productId,
                  type: "entrada",
                  orderId: o.id,
                  quantity: l.quantity - l.received,
                })
              }
            />
          )}
        </Card>
      ))}
      <Text style={s.h2}>
        Total estimado:{" "}
        {money(
          o.lines.reduce(
            (n, l) =>
              n +
              (o.status === "borrador"
                ? Number(values[l.productId]) || 0
                : l.quantity) *
                l.unitCost,
            0,
          ),
        )}
      </Text>
      <Text style={s.small}>
        Costos capturados al crear el borrador. Sin impuestos ni flete.
      </Text>
      <ErrorNotice message={error} />
      {!!message && (
        <Text accessibilityLiveRegion="polite" style={s.sub}>
          {message}
        </Text>
      )}
      {o.status === "borrador" && (
        <>
          <Button
            title="Guardar borrador"
            secondary
            disabled={busy}
            onPress={() => void update("borrador")}
          />
          <Button
            title="Confirmar compra prevista"
            disabled={busy}
            onPress={() => void update("confirmada")}
          />
        </>
      )}
      {["borrador", "confirmada"].includes(o.status) &&
        (cancel ? (
          <Card>
            <Text style={s.sub}>
              ¿Cancelar el saldo pendiente? Las entradas ya recibidas seguirán
              en el inventario.
            </Text>
            <Button
              title="Confirmar cancelación"
              disabled={busy}
              onPress={() => void update("cancelada")}
            />
            <Button
              title="Conservar orden"
              secondary
              onPress={() => setCancel(false)}
            />
          </Card>
        ) : (
          <Button
            title="Cancelar orden"
            secondary
            disabled={busy}
            onPress={() => setCancel(true)}
          />
        ))}
    </Page>
  );
}
