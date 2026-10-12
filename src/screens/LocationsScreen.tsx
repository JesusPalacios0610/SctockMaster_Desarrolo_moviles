import React, { useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParams } from "../navigation/types";
import {
  Page,
  Heading,
  IconButton,
  Icon,
  useUI,
  Field,
  Button,
  ErrorNotice,
} from "../components/UI";
import { useInventory } from "../hooks/useInventory";
export function LocationsScreen({
  navigation,
}: NativeStackScreenProps<RootStackParams, "Locations">) {
  const s = useUI();
  const { data } = useInventory();
  const [q, setQ] = useState("");
  return (
    <Page scroll={false}>
      <Heading
        eyebrow="MAPA DEL ALMACÉN"
        title="Ubicaciones"
        subtitle="Escanea un estante y encuentra sus existencias."
        action={
          <IconButton
            icon="add"
            label="Nueva ubicación"
            onPress={() => navigation.navigate("LocationForm")}
          />
        }
      />
      <TextInput
        accessibilityLabel="Buscar ubicación"
        style={s.input}
        placeholder="Código, nombre o almacén"
        value={q}
        onChangeText={setQ}
      />
      <FlatList
        data={data.locations.filter((l) =>
          `${l.id} ${l.label} ${l.warehouse}`
            .toLowerCase()
            .includes(q.toLowerCase()),
        )}
        keyExtractor={(l) => l.id}
        renderItem={({ item: l }) => (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Abrir ubicación ${l.id}`}
            style={s.product}
            onPress={() => navigation.navigate("LocationDetail", { id: l.id })}
          >
            <View style={s.productIcon}>
              <Icon name="location-outline" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.h2}>
                {l.id} · {l.label}
              </Text>
              <Text style={s.small}>{l.warehouse}</Text>
              <Text style={s.small}>
                {data.lots
                  .filter((x) => x.locationId === l.id)
                  .reduce((n, l) => n + l.quantity, 0)}{" "}
                unidades físicas
              </Text>
            </View>
            <Icon name="qr-code-outline" />
          </TouchableOpacity>
        )}
      />
    </Page>
  );
}
export function LocationFormScreen({
  navigation,
}: NativeStackScreenProps<RootStackParams, "LocationForm">) {
  const { addLocation, busy } = useInventory();
  const [id, setId] = useState("");
  const [label, setLabel] = useState("");
  const [warehouse, setWarehouse] = useState("Almacén principal");
  const [aisle, setAisle] = useState("");
  const [shelf, setShelf] = useState("");
  const [error, setError] = useState<string | null>(null);
  async function save() {
    try {
      const code = id.trim().toUpperCase();
      await addLocation({
        id: code,
        label: label.trim(),
        warehouse: warehouse.trim(),
        aisle: aisle.trim(),
        shelf: shelf.trim(),
      });
      navigation.replace("LocationDetail", { id: code });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Page>
      <Heading
        title="Nueva ubicación"
        subtitle="El código identificará esta ubicación en su etiqueta QR."
      />
      <Field
        label="Código de ubicación"
        placeholder="Ej. B-02"
        value={id}
        onChangeText={setId}
        maxLength={60}
      />
      <Field
        label="Nombre de ubicación"
        placeholder="Ej. Estante de bebidas"
        value={label}
        onChangeText={setLabel}
        maxLength={80}
      />
      <Field
        label="Almacén"
        value={warehouse}
        onChangeText={setWarehouse}
        maxLength={80}
      />
      <Field
        label="Pasillo"
        value={aisle}
        onChangeText={setAisle}
        maxLength={40}
      />
      <Field
        label="Estante"
        value={shelf}
        onChangeText={setShelf}
        maxLength={40}
      />
      <ErrorNotice message={error} />
      <Button
        title="Guardar ubicación"
        disabled={busy}
        onPress={() => void save()}
      />
    </Page>
  );
}
