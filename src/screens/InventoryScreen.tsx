import { useTheme } from "../theme/Preferences";
import React, { useMemo, useState } from "react";
import { FlatList, TextInput, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  Page,
  Heading,
  IconButton,
  ProductRow,
  Chips,
  Empty,
  useUI,
} from "../components/UI";
import { useInventory } from "../hooks/useInventory";
import { categories } from "../domain/inventory";
import { RootNavigation } from "../navigation/types";
export function InventoryScreen() {
  const { colors: c } = useTheme();
  const s = useUI();

  const { data } = useInventory();
  const nav = useNavigation<RootNavigation>();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const products = useMemo(
    () =>
      data.products.filter(
        (p) =>
          (category === "Todos" || p.category === category) &&
          `${p.name} ${p.code} ${p.location}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      ),
    [data.products, query, category],
  );
  return (
    <Page scroll={false}>
      <Heading
        eyebrow="CATÁLOGO"
        title="Inventario"
        subtitle="Cada producto, en su lugar."
        action={
          <IconButton
            icon="add"
            label="Crear producto"
            onPress={() => nav.navigate("ProductForm")}
          />
        }
      />
      <TextInput
        accessibilityLabel="Buscar productos"
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar nombre, código o ubicación"
        style={s.input}
      />
      <Chips
        options={["Todos", ...categories]}
        value={category}
        onChange={setCategory}
      />
      <Text style={s.small}>{products.length} productos encontrados</Text>
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <ProductRow
            product={item}
            onPress={() => nav.navigate("ProductDetail", { id: item.id })}
          />
        )}
        ListEmptyComponent={
          <Empty
            title="Sin resultados"
            detail="Prueba otro nombre o cambia la categoría."
          />
        }
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      />
    </Page>
  );
}
