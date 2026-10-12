import { useTheme } from "../theme/Preferences";
import React, { useMemo } from "react";
import { Text, View, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  Page,
  Heading,
  Card,
  Section,
  ProductRow,
  MovementRow,
  Button,
  IconButton,
  Icon,
  useUI,
  Empty,
} from "../components/UI";
import { useInventory } from "../hooks/useInventory";
import { usableStock, isLow, money } from "../domain/inventory";

import { RootNavigation } from "../navigation/types";
export function DashboardScreen() {
  const { colors: c, prefs } = useTheme();
  const s = useUI();

  const { data } = useInventory();
  const nav = useNavigation<RootNavigation>();
  const stats = useMemo(
    () => ({
      units: data.products.reduce((n, p) => n + p.stock, 0),
      value: data.products.reduce((n, p) => n + p.stock * p.cost, 0),
      low: data.products.filter((p) => usableStock(data, p.id) <= p.minStock),
    }),
    [data],
  );
  if (prefs.simplified)
    return (
      <Page>
        <Heading
          eyebrow="STOCKMASTER / MODO SIMPLE"
          title="¿Qué necesitas hacer?"
          subtitle="Elige una acción para comenzar."
          action={
            <IconButton
              icon="options-outline"
              label="Configuración"
              onPress={() => nav.navigate("Settings")}
            />
          }
        />
        <Button
          title="Buscar producto"
          icon="search-outline"
          onPress={() => nav.navigate("QuickMovement", {})}
        />
        <Button
          title="Agregar stock"
          icon="add-circle-outline"
          onPress={() => nav.navigate("QuickMovement", { type: "entrada" })}
        />
        <Button
          title="Retirar stock"
          icon="arrow-up-outline"
          onPress={() => nav.navigate("QuickMovement", { type: "salida" })}
        />
        <Button
          title="Escanear código"
          secondary
          icon="scan-outline"
          onPress={() => nav.navigate("Scanner")}
        />
        <Card>
          <Text style={s.h2}>{stats.low.length} productos con stock bajo</Text>
          <Text style={s.sub}>
            Consulta lotes y vencimientos antes de despachar.
          </Text>
        </Card>
        <Button
          title="Más opciones"
          secondary
          onPress={() => nav.navigate("Settings")}
        />
      </Page>
    );
  return (
    <Page>
      <Heading
        eyebrow="STOCKMASTER / TU ALMACÉN"
        title="Todo bajo control."
        subtitle="Un vistazo a lo que mueve tu negocio."
        action={
          <IconButton
            icon="options-outline"
            label="Configuración"
            onPress={() => nav.navigate("Settings")}
          />
        }
      />
      <Card dark>
        <View style={s.row}>
          <Text style={{ color: "#B6D0C6", fontSize: 13 }}>
            Valor del inventario · a costo
          </Text>
          <Icon name="cube-outline" color={c.lime} />
        </View>
        <Text
          style={{
            color: "#fff",
            fontSize: 36,
            fontWeight: "700",
            letterSpacing: -1,
          }}
        >
          {money(stats.value)}
        </Text>
        <View
          style={[
            s.row,
            {
              borderTopWidth: 1,
              borderTopColor: "#35514A",
              paddingTop: 16,
              flexWrap: "wrap",
            },
          ]}
        >
          <View>
            <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700" }}>
              {stats.units}
            </Text>
            <Text style={{ color: "#B6D0C6", fontSize: 12, marginTop: 4 }}>
              Unidades físicas
            </Text>
          </View>
          <View
            style={{
              backgroundColor: c.lime,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
            }}
          >
            <Text style={{ color: c.dark, fontWeight: "700", fontSize: 12 }}>
              ● Guardado local
            </Text>
          </View>
        </View>
      </Card>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Card>
            <Icon name="layers-outline" />
            <Text style={{ fontSize: 27, fontWeight: "800", color: c.ink }}>
              {data.products.length}
            </Text>
            <Text style={s.small}>Productos activos</Text>
          </Card>
        </View>
        <View style={{ flex: 1 }}>
          <Card>
            <Icon name="notifications-outline" color={c.warning} />
            <Text style={{ fontSize: 27, fontWeight: "800", color: c.ink }}>
              {stats.low.length}
            </Text>
            <Text style={s.small}>Por reponer</Text>
          </Card>
        </View>
      </View>
      <Button
        title="Escanear producto"
        icon="scan-outline"
        onPress={() => nav.navigate("Scanner")}
      />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Button
            secondary
            title="Nuevo producto"
            icon="add"
            onPress={() => nav.navigate("ProductForm")}
          />
        </View>
      </View>
      <Button
        title="Proveedores"
        secondary
        icon="business-outline"
        onPress={() => nav.navigate("Suppliers")}
      />
      <Button
        title="Reposición y compras"
        secondary
        icon="cart-outline"
        onPress={() => nav.navigate("Replenishment")}
      />
      <Button
        title="Ubicaciones QR"
        secondary
        icon="qr-code-outline"
        onPress={() => nav.navigate("Locations")}
      />
      <Button
        title="Reportes Excel / PDF"
        secondary
        icon="document-text-outline"
        onPress={() => nav.navigate("Reports")}
      />
      <Section title="Prioridad de reposición" />
      {stats.low.length ? (
        stats.low
          .slice(0, 3)
          .map((p) => (
            <ProductRow
              key={p.id}
              product={p}
              onPress={() => nav.navigate("ProductDetail", { id: p.id })}
            />
          ))
      ) : (
        <Empty
          title="Inventario saludable"
          detail="Todos tus productos superan su stock mínimo."
          icon="checkmark-circle-outline"
        />
      )}
      <Section title="Últimos movimientos" />
      {data.movements.length ? (
        data.movements
          .slice(0, 3)
          .map((m) => <MovementRow key={m.id} movement={m} />)
      ) : (
        <Card>
          <Text style={s.sub}>
            Tu actividad empieza aquí. Abre un producto y registra su primera
            entrada o salida.
          </Text>
        </Card>
      )}
    </Page>
  );
}
