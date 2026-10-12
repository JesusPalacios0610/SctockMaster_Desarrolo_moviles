import React from "react";
import { Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Page, Heading, Card, Button, Empty, useUI } from "../components/UI";
import { useInventory } from "../hooks/useInventory";
import { RootNavigation } from "../navigation/types";
import { expired, dateKey } from "../domain/warehouse";
export function AlertsScreen() {
  const s = useUI();
  const { data } = useInventory();
  const nav = useNavigation<RootNavigation>();
  const limit = new Date();
  limit.setDate(limit.getDate() + 30);
  const date = dateKey(limit);
  const lots = data.lots.filter(
    (l) => l.quantity > 0 && l.expiresOn && l.expiresOn <= date,
  );
  const low = data.products
    .map((p) => ({
      ...p,
      usable: data.lots
        .filter((l) => l.productId === p.id && !expired(l))
        .reduce((n, l) => n + l.quantity, 0),
    }))
    .filter((p) => p.usable <= p.minStock);
  return (
    <Page>
      <Heading
        eyebrow="REPOSICIÓN Y VENCIMIENTOS"
        title="Anticípate al faltante."
        subtitle={`${low.length} productos con disponibilidad baja · ${lots.length} lotes por revisar`}
      />
      <Button
        title="Planificar reposición"
        onPress={() => nav.navigate("Replenishment")}
      />
      {lots.map((l) => (
        <Card key={l.id}>
          <Text style={s.h2}>
            {expired(l) ? "VENCIDO" : "VENCE EN 30 DÍAS O MENOS"} · {l.code}
          </Text>
          <Text style={s.sub}>
            {data.products.find((p) => p.id === l.productId)?.name} ·{" "}
            {l.quantity} unid. · {l.locationId} · {l.expiresOn}
          </Text>
          <Button
            title={"Revisar lote " + l.code}
            secondary
            onPress={() => nav.navigate("Lots", { id: l.productId })}
          />
        </Card>
      ))}
      {low.map((p) => (
        <Card key={p.id}>
          <Text style={s.h2}>{p.name}</Text>
          <Text style={s.sub}>
            Disponibles para salida: {p.usable} · Mínimo: {p.minStock} · Stock
            físico: {p.stock}
          </Text>
          <Button
            title={"Reponer " + p.name}
            secondary
            onPress={() => nav.navigate("ProductDetail", { id: p.id })}
          />
        </Card>
      ))}
      {!low.length && !lots.length && (
        <Empty
          title="Todo al día"
          detail="Sin stock crítico ni vencimientos próximos registrados."
        />
      )}
      <Text style={s.small}>
        Los lotes sin fecha requieren revisión manual. Las alertas se calculan
        al consultar esta pantalla.
      </Text>
    </Page>
  );
}
