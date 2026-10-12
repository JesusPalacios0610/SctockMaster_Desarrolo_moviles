import { expired } from "../domain/warehouse";
import { useTheme } from "../theme/Preferences";
import React from "react";
import { Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParams } from "../navigation/types";
import {
  ProductPhoto,
  Page,
  Heading,
  Card,
  Button,
  Section,
  MovementRow,
  Icon,
  categoryIcon,
  useUI,
  Empty,
} from "../components/UI";
import { useInventory } from "../hooks/useInventory";
import { usableStock, isLow, money } from "../domain/inventory";

export function ProductDetailScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParams, "ProductDetail">) {
  const { colors: c } = useTheme();
  const s = useUI();

  const { data } = useInventory();
  const p = data.products.find((x) => x.id === route.params.id);
  if (!p)
    return (
      <Page>
        <Empty
          title="Producto no disponible"
          detail="Vuelve al inventario para seleccionar otro producto."
        />
      </Page>
    );
  const usable = usableStock(data, p.id);
  const history = data.movements.filter((m) => m.productId === p.id);
  return (
    <Page>
      <Heading
        eyebrow={p.category.toUpperCase()}
        title={p.name}
        subtitle={p.code}
      />
      <Card>
        <View style={s.row}>
          <ProductPhoto product={p} size={70} />
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 38, fontWeight: "800", color: c.ink }}>
              {p.stock}
            </Text>
            <Text style={s.small}>unidades físicas</Text>
          </View>
        </View>
        <Text
          style={{
            color: usable <= p.minStock ? c.warning : c.primary,
            fontWeight: "700",
          }}
        >
          {usable === 0
            ? "Agotado · requiere reposición"
            : usable <= p.minStock
              ? "Stock bajo · requiere reposición"
              : "Stock saludable"}
        </Text>
        <View style={s.row}>
          <Text style={s.sub}>Costo unitario</Text>
          <Text style={s.label}>{money(p.cost)}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.sub}>Valor físico a costo</Text>
          <Text style={s.label}>{money(p.stock * p.cost)}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.sub}>Stock mínimo</Text>
          <Text style={s.label}>{p.minStock} unid.</Text>
        </View>
        <View style={s.row}>
          <Text style={s.sub}>Recepción habitual / unidad</Text>
          <Text style={s.label}>
            {p.location} / {p.unit}
          </Text>
        </View>
      </Card>
      <Text style={s.sub}>
        Disponibles para salida:{" "}
        {data.lots
          .filter((l) => l.productId === p.id && !expired(l))
          .reduce((n, l) => n + l.quantity, 0)}{" "}
        unidades. Los lotes vencidos quedan bloqueados para despacho.
      </Text>
      <Button
        title="Ver lotes y ubicaciones"
        secondary
        icon="layers-outline"
        onPress={() => navigation.navigate("Lots", { id: p.id })}
      />
      <Button
        title="Registrar entrada"
        icon="arrow-down-outline"
        onPress={() =>
          navigation.navigate("MovementForm", { id: p.id, type: "entrada" })
        }
      />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button
            title="Salida"
            secondary
            icon="arrow-up-outline"
            onPress={() =>
              navigation.navigate("MovementForm", { id: p.id, type: "salida" })
            }
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title="Merma"
            secondary
            icon="remove-circle-outline"
            onPress={() =>
              navigation.navigate("MovementForm", { id: p.id, type: "merma" })
            }
          />
        </View>
      </View>
      <Button
        title="Editar producto"
        secondary
        icon="create-outline"
        onPress={() => navigation.navigate("ProductForm", { id: p.id })}
      />
      <Button
        title="Realizar conteo físico"
        secondary
        icon="clipboard-outline"
        onPress={() => navigation.navigate("Count", { id: p.id })}
      />
      {p.supplierId && (
        <Card>
          <Text style={s.label}>Proveedor habitual</Text>
          <Text style={s.sub}>
            {data.suppliers.find((x) => x.id === p.supplierId)?.name ??
              "Sin proveedor"}
          </Text>
          <Button
            title="Ver proveedor"
            secondary
            onPress={() =>
              navigation.navigate("SupplierForm", { id: p.supplierId })
            }
          />
        </Card>
      )}
      <Section title="Historial del producto" />
      {history.length ? (
        history.map((m) => <MovementRow key={m.id} movement={m} />)
      ) : (
        <Text style={s.sub}>
          Sin movimientos registrados. El stock inicial de los productos de
          demostración proviene del archivo JSON.
        </Text>
      )}
    </Page>
  );
}
