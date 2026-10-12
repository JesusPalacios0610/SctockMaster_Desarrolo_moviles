import { useTheme } from "../theme/Preferences";
import React, { useMemo, useState } from "react";
import { FlatList, TextInput } from "react-native";
import {
  Page,
  Heading,
  Chips,
  MovementRow,
  Empty,
  useUI,
} from "../components/UI";
import { useInventory } from "../hooks/useInventory";
export function ActivityScreen() {
  const { colors: c } = useTheme();
  const s = useUI();

  const { data } = useInventory();
  const [type, setType] = useState("Todos");
  const [query, setQuery] = useState("");
  const list = useMemo(
    () =>
      data.movements.filter(
        (m) =>
          (type === "Todos" || m.type === type.toLowerCase()) &&
          `${m.productName} ${m.note}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [data.movements, type, query],
  );
  return (
    <Page scroll={false}>
      <Heading
        eyebrow="TRAZABILIDAD"
        title="Actividad"
        subtitle="El historial de tu almacén, sin perder detalle."
      />
      <TextInput
        accessibilityLabel="Buscar movimientos"
        style={s.input}
        placeholderTextColor={c.muted}
        placeholder="Buscar producto o referencia"
        value={query}
        onChangeText={setQuery}
      />
      <Chips
        options={["Todos", "Entrada", "Salida", "Merma", "Ajuste", "Traslado"]}
        value={type}
        onChange={setType}
      />
      <FlatList
        data={list}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <MovementRow movement={item} />}
        ListEmptyComponent={
          <Empty
            icon="time-outline"
            title="Sin movimientos"
            detail="Registra una operación desde el detalle de un producto. Si usaste filtros, prueba cambiarlos."
          />
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </Page>
  );
}
