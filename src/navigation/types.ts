import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { OperationType } from "../domain/inventory";
export type RootStackParams = {
  Main: undefined;
  ProductDetail: { id: string };
  ProductForm: { id?: string; code?: string } | undefined;
  MovementForm: {
    id: string;
    type?: OperationType;
    orderId?: string;
    quantity?: number;
  };
  Scanner: undefined;
  Settings: undefined;
  Suppliers: undefined;
  SupplierForm: { id?: string } | undefined;
  Count: { id: string; lotId?: string };
  Locations: undefined;
  LocationForm: undefined;
  LocationDetail: { id: string };
  Lots: { id: string };
  Replenishment: undefined;
  Orders: undefined;
  OrderDetail: { id: string };
  Reports: undefined;
  QuickMovement: { type?: OperationType };
};
export type RootNavigation = NativeStackNavigationProp<RootStackParams>;
export type TabParams = {
  Inicio: undefined;
  Inventario: undefined;
  Actividad: undefined;
  Alertas: undefined;
};
