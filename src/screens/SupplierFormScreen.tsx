import { useTheme } from "../theme/Preferences";
import React, { useState } from "react";
import { Text } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParams } from "../navigation/types";
import {
  Page,
  Heading,
  Field,
  Button,
  ErrorNotice,
  Section,
  ProductRow,
  useUI,
} from "../components/UI";
import { useInventory } from "../hooks/useInventory";
export function SupplierFormScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParams, "SupplierForm">) {
  const { colors: c } = useTheme();
  const s = useUI();

  const { data, saveVendor, busy } = useInventory();
  const existing = data.suppliers.find((x) => x.id === route.params?.id);
  const [name, setName] = useState(existing?.name ?? "");
  const [contact, setContact] = useState(existing?.contact ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    setError(null);
    try {
      await saveVendor({ name, contact, phone, email, notes }, existing?.id);
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    }
  }
  return (
    <Page>
      <Heading
        eyebrow="ABASTECIMIENTO"
        title={existing ? "Editar proveedor" : "Nuevo proveedor"}
        subtitle="Organiza los contactos que abastecen tu negocio."
      />
      <Field
        label="Nombre del proveedor"
        value={name}
        onChangeText={setName}
        maxLength={80}
        placeholder="Ej. Distribuidora Lima"
      />
      <Field
        label="Persona de contacto"
        value={contact}
        onChangeText={setContact}
        maxLength={80}
      />
      <Field
        label="Teléfono"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        maxLength={24}
      />
      <Field
        label="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        maxLength={120}
      />
      <Field
        label="Notas"
        value={notes}
        onChangeText={setNotes}
        multiline
        maxLength={240}
      />
      <ErrorNotice message={error} />
      <Button
        title={busy ? "Guardando…" : "Guardar proveedor"}
        onPress={() => void submit()}
        disabled={busy}
        icon="checkmark-outline"
      />
      {existing && (
        <>
          <Section title="Productos asociados" />
          {data.products
            .filter((p) => p.supplierId === existing.id)
            .map((p) => (
              <ProductRow
                key={p.id}
                product={p}
                onPress={() =>
                  navigation.navigate("ProductDetail", { id: p.id })
                }
              />
            ))}
          <Text style={s.small}>
            Asigna productos desde su ficha. Las entradas conservan el nombre
            del proveedor registrado al momento de la operación.
          </Text>
        </>
      )}
    </Page>
  );
}
