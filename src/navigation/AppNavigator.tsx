import {
  LocationsScreen,
  LocationFormScreen,
} from "../screens/LocationsScreen";
import { LocationDetailScreen } from "../screens/LocationDetailScreen";
import { LotsScreen } from "../screens/LotsScreen";
import {
  ReplenishmentScreen,
  OrdersScreen,
  OrderDetailScreen,
} from "../screens/PurchasingScreens";
import { ReportsScreen } from "../screens/ReportsScreen";
import { QuickMovementScreen } from "../screens/QuickMovementScreen";
import { useUI } from "../components/UI";
import { useTheme } from "../theme/Preferences";
import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { RootStackParams, TabParams } from "./types";

import { Icon, IconName } from "../components/UI";
import { useInventory } from "../hooks/useInventory";
import { usableStock, isLow } from "../domain/inventory";
import { DashboardScreen } from "../screens/DashboardScreen";
import { InventoryScreen } from "../screens/InventoryScreen";
import { ActivityScreen } from "../screens/ActivityScreen";
import { AlertsScreen } from "../screens/AlertsScreen";
import { ProductDetailScreen } from "../screens/ProductDetailScreen";
import { ProductFormScreen } from "../screens/ProductFormScreen";
import { MovementFormScreen } from "../screens/MovementFormScreen";
import { ScannerScreen } from "../screens/ScannerScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { SuppliersScreen } from "../screens/SuppliersScreen";
import { SupplierFormScreen } from "../screens/SupplierFormScreen";
import { CountScreen } from "../screens/CountScreen";
const Stack = createNativeStackNavigator<RootStackParams>();
const Tab = createBottomTabNavigator<TabParams>();
const icons: Record<keyof TabParams, IconName> = {
  Inicio: "grid-outline",
  Inventario: "cube-outline",
  Actividad: "swap-vertical-outline",
  Alertas: "notifications-outline",
};
function Tabs() {
  const { colors: c } = useTheme();
  const s = useUI();

  const { data } = useInventory();
  const count = data.products.filter(
    (p) => usableStock(data, p.id) <= p.minStock,
  ).length;
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.paper, borderTopColor: c.line },
        tabBarLabelStyle: { fontWeight: "600", fontSize: 11 },
        tabBarIcon: ({ color }) => (
          <Icon name={icons[route.name]} color={color} size={22} />
        ),
      })}
    >
      <Tab.Screen name="Inicio" component={DashboardScreen} />
      <Tab.Screen name="Inventario" component={InventoryScreen} />
      <Tab.Screen name="Actividad" component={ActivityScreen} />
      <Tab.Screen
        name="Alertas"
        component={AlertsScreen}
        options={{
          tabBarBadge: count || undefined,
          tabBarBadgeStyle: { backgroundColor: c.warningBg, color: c.warning },
        }}
      />
    </Tab.Navigator>
  );
}
export function AppNavigator() {
  const { colors: c } = useTheme();
  const s = useUI();

  return (
    <NavigationContainer
      theme={{
        ...DefaultTheme,
        dark: useTheme().dark,
        colors: {
          ...DefaultTheme.colors,
          primary: c.primary,
          background: c.bg,
          card: c.bg,
          text: c.ink,
          border: c.line,
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShadowVisible: false,
          headerTintColor: c.primary,
          headerTitleStyle: { fontSize: 16 },
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Screen
          name="Main"
          component={Tabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ProductDetail"
          component={ProductDetailScreen}
          options={{ title: "Detalle del producto" }}
        />
        <Stack.Screen
          name="ProductForm"
          component={ProductFormScreen}
          options={{ title: "Ficha del producto" }}
        />
        <Stack.Screen
          name="MovementForm"
          component={MovementFormScreen}
          options={{ title: "Movimiento" }}
        />
        <Stack.Screen
          name="Scanner"
          component={ScannerScreen}
          options={{ title: "Escáner" }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: "Configuración" }}
        />
        <Stack.Screen
          name="Suppliers"
          component={SuppliersScreen}
          options={{ title: "Proveedores" }}
        />
        <Stack.Screen
          name="SupplierForm"
          component={SupplierFormScreen}
          options={{ title: "Ficha del proveedor" }}
        />
        <Stack.Screen
          name="Count"
          component={CountScreen}
          options={{ title: "Conteo físico" }}
        />
        <Stack.Screen
          name="Locations"
          component={LocationsScreen}
          options={{ title: "Ubicaciones" }}
        />
        <Stack.Screen
          name="LocationForm"
          component={LocationFormScreen}
          options={{ title: "Nueva ubicación" }}
        />
        <Stack.Screen
          name="LocationDetail"
          component={LocationDetailScreen}
          options={{ title: "Ubicación QR" }}
        />
        <Stack.Screen
          name="Lots"
          component={LotsScreen}
          options={{ title: "Lotes y vencimientos" }}
        />
        <Stack.Screen
          name="Replenishment"
          component={ReplenishmentScreen}
          options={{ title: "Reposición sugerida" }}
        />
        <Stack.Screen
          name="Orders"
          component={OrdersScreen}
          options={{ title: "Órdenes de compra" }}
        />
        <Stack.Screen
          name="OrderDetail"
          component={OrderDetailScreen}
          options={{ title: "Detalle de compra" }}
        />
        <Stack.Screen
          name="Reports"
          component={ReportsScreen}
          options={{ title: "Reportes" }}
        />
        <Stack.Screen
          name="QuickMovement"
          component={QuickMovementScreen}
          options={{ title: "Elegir producto" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
