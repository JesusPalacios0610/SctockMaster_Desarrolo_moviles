import React, { useState } from "react";
import { Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParams } from "../navigation/types";
import {
  Page,
  Heading,
  Card,
  Button,
  Field,
  ErrorNotice,
  Empty,
  useUI,
} from "../components/UI";
import { Select } from "../components/Select";
import { useTheme } from "../theme/Preferences";
import { useInventory } from "../hooks/useInventory";
import { fefo, expired } from "../domain/warehouse";
export function LotsScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParams, "Lots">) {
  const s = useUI(),
    { colors: c } = useTheme(),
    { data, transfer, busy } = useInventory();
  const [selected, setSelected] = useState("");
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const p = data.products.find((p) => p.id === route.params.id);
  const lots = fefo(
    data.lots.filter((l) => l.productId === route.params.id && l.quantity > 0),
  );
  async function move() {
    try {
      await transfer(selected, to, note);
      setSelected("");
      setNote("");
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Page>
      <Heading title="Lotes y ubicaciones" subtitle={p?.name} />
      <Text style={s.sub}>
        FEFO: primero vence, primero sale. Los vencidos no se despachan; los
        lotes sin fecha se usan al final y requieren revisión.
      </Text>
      {lots.map((l) => (
        <Card key={l.id}>
          <View style={s.row}>
            <Text style={[s.h2, { flex: 1 }]}>{l.code}</Text>
            <Text style={s.stock}>{l.quantity}</Text>
          </View>
          <Text style={s.sub}>Ubicación: {l.locationId}</Text>
          <Text style={{ color: expired(l) ? c.red : c.muted }}>
            {expired(l) ? "VENCIDO · " : ""}
            {l.expiresOn
              ? `Vence: ${l.expiresOn}`
              : "Sin fecha de vencimiento registrada"}
          </Text>
          <Button
            secondary
            title={`Contar lote ${l.code}`}
            onPress={() =>
              navigation.navigate("Count", { id: l.productId, lotId: l.id })
            }
          />
          <Button
            secondary
            title={`Trasladar lote ${l.code}`}
            onPress={() => {
              setSelected(l.id);
              setTo("");
              setNote("");
              setError(null);
            }}
          />
        </Card>
      ))}
      {!lots.length && (
        <Empty
          title="Sin lotes disponibles"
          detail="Registra una entrada para crear un lote."
        />
      )}
      {selected && (
        <Card>
          <Text style={s.h2}>Trasladar todas las unidades del lote</Text>
          <Text style={s.sub}>
            {data.lots.find((l) => l.id === selected)?.code} ·{" "}
            {data.lots.find((l) => l.id === selected)?.quantity} unidades
          </Text>
          <Select
            label="Ubicación de destino"
            value={to}
            onChange={setTo}
            options={data.locations
              .filter(
                (l) =>
                  l.id !== data.lots.find((b) => b.id === selected)?.locationId,
              )
              .map((l) => ({ id: l.id, label: `${l.id} · ${l.label}` }))}
          />
          <Field
            label="Motivo del traslado"
            value={note}
            onChangeText={setNote}
          />
          <ErrorNotice message={error} />
          <Button
            title="Confirmar traslado"
            disabled={busy}
            onPress={() => void move()}
          />
          <Button
            title="Cancelar traslado"
            secondary
            onPress={() => setSelected("")}
          />
        </Card>
      )}
    </Page>
  );
}
