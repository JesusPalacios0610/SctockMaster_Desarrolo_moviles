import { useTheme } from "../theme/Preferences";
import React, { useState } from "react";
import {
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParams } from "../navigation/types";
import {
  Page,
  Heading,
  IconButton,
  Icon,
  Empty,
  useUI,
} from "../components/UI";
import { useInventory } from "../hooks/useInventory";
export function SuppliersScreen({
  navigation,
}: NativeStackScreenProps<RootStackParams, "Suppliers">) {
  const { colors: c } = useTheme();
  const s = useUI();

  const { data } = useInventory();
  const [query, setQuery] = useState("");
  const list = data.suppliers.filter((x) =>
    `${x.name} ${x.contact} ${x.phone}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <Page scroll={false}>
      <Heading
        eyebrow="ABASTECIMIENTO"
        title="Proveedores"
        subtitle="Tus contactos para mantener el almacén al día."
        action={
          <IconButton
            icon="add"
            label="Nuevo proveedor"
            onPress={() => navigation.navigate("SupplierForm")}
          />
        }
      />
      <TextInput
        accessibilityLabel="Buscar proveedores"
        style={s.input}
        placeholder="Nombre, contacto o teléfono"
        value={query}
        onChangeText={setQuery}
      />
      <FlatList
        data={list}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Abrir proveedor ${item.name}`}
            style={s.product}
            onPress={() => navigation.navigate("SupplierForm", { id: item.id })}
          >
            <View style={s.productIcon}>
              <Icon name="business-outline" />
            </View>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={s.productName}>{item.name}</Text>
              <Text style={s.small}>
                {item.contact || "Sin contacto"}
                {item.phone ? ` · ${item.phone}` : ""}
              </Text>
              <Text style={s.small}>
                {data.products.filter((p) => p.supplierId === item.id).length}{" "}
                productos asociados
              </Text>
            </View>
            <Icon name="chevron-forward" size={16} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Empty
            icon="business-outline"
            title={query ? "Sin coincidencias" : "Tu red de proveedores"}
            detail="Registra un proveedor y asígnalo a productos o entradas de stock."
          />
        }
      />
    </Page>
  );
}
