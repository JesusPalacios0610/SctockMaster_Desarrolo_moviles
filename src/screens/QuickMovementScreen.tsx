import React, { useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParams } from "../navigation/types";
import { Page, Heading, Field, ProductRow, Empty } from "../components/UI";
import { useInventory } from "../hooks/useInventory";
export function QuickMovementScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParams, "QuickMovement">) {
  const { data } = useInventory();
  const [q, setQ] = useState("");
  const list = data.products.filter((p) =>
    (p.name + " " + p.code).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <Page>
      <Heading
        eyebrow={route.params.type ? "PASO 1 · PRODUCTO" : "CATÁLOGO"}
        title="Elige el producto"
      />
      <Field label="Buscar por nombre o código" value={q} onChangeText={setQ} />
      {list.map((p) => (
        <ProductRow
          key={p.id}
          product={p}
          onPress={() =>
            route.params.type
              ? navigation.navigate("MovementForm", {
                  id: p.id,
                  type: route.params.type,
                })
              : navigation.navigate("ProductDetail", { id: p.id })
          }
        />
      ))}
      {!list.length && (
        <Empty title="Sin resultados" detail="Prueba otro nombre o código." />
      )}
    </Page>
  );
}
