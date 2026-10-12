import { Select } from "../components/Select";
import { useTheme } from "../theme/Preferences";
import React, { useState, useEffect, useRef } from "react";
import { Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParams } from "../navigation/types";
import {
  ProductPhoto,
  Page,
  Heading,
  Field,
  Chips,
  Button,
  ErrorNotice,
  useUI,
} from "../components/UI";
import { useInventory } from "../hooks/useInventory";
import { categories, Category } from "../domain/inventory";
import {
  chooseProductPhoto,
  discardProductPhoto,
} from "../services/photoService";
import { SupplierSelect } from "../components/SupplierSelect";
export function ProductFormScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParams, "ProductForm">) {
  const { colors: c } = useTheme();
  const s = useUI();

  const { data, save, busy } = useInventory();
  const existing = data.products.find((p) => p.id === route.params?.id);
  const savingPhoto = useRef(false);
  const pendingPhotos = useRef<string[]>([]);
  const keptPhoto = useRef(existing?.photoUri);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (savingPhoto.current) return;
      pendingPhotos.current.forEach((uri) => {
        if (uri !== keptPhoto.current) void discardProductPhoto(uri);
      });
    };
  }, []);
  const [photoUri, setPhotoUri] = useState(existing?.photoUri);
  const [supplierId, setSupplierId] = useState(existing?.supplierId ?? "");
  const [photoBusy, setPhotoBusy] = useState(false);
  async function pick(camera = false) {
    setError(null);
    setPhotoBusy(true);
    try {
      const uri = await chooseProductPhoto(camera);
      if (uri) {
        if (!mounted.current) {
          void discardProductPhoto(uri);
          return;
        }
        pendingPhotos.current.push(uri);
        setPhotoUri(uri);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar la foto.");
    } finally {
      setPhotoBusy(false);
    }
  }
  const [name, setName] = useState(existing?.name ?? "");
  const [code, setCode] = useState(existing?.code ?? route.params?.code ?? "");
  const [category, setCategory] = useState<Category>(
    existing?.category ?? "Abarrotes",
  );
  const [cost, setCost] = useState(existing?.cost.toString() ?? "");
  const [minStock, setMinStock] = useState(
    existing?.minStock.toString() ?? "5",
  );
  const [unit, setUnit] = useState(existing?.unit ?? "Unidad");
  const [location, setLocation] = useState(
    existing?.location ?? data.locations[0]?.id ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    setError(null);
    try {
      if (!cost.trim() || !minStock.trim())
        throw new Error("Completa el costo y stock mínimo.");
      savingPhoto.current = true;
      const id = await save(
        {
          name,
          code,
          category,
          cost: Number(cost.replace(",", ".")),
          minStock: Number(minStock),
          unit,
          location,
          photoUri,
          supplierId: supplierId || undefined,
        },
        existing?.id,
      );
      keptPhoto.current = photoUri;
      if (existing?.photoUri !== photoUri)
        void discardProductPhoto(existing?.photoUri);
      if (existing) navigation.goBack();
      else navigation.replace("ProductDetail", { id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      savingPhoto.current = false;
      if (!mounted.current)
        pendingPhotos.current.forEach((uri) => {
          if (uri !== keptPhoto.current) void discardProductPhoto(uri);
        });
    }
  }
  return (
    <Page>
      <Heading
        eyebrow="CATÁLOGO"
        title={existing ? "Editar producto" : "Nuevo producto"}
        subtitle="Información clara para un almacén ordenado."
      />
      <View style={{ alignItems: "center", gap: 12 }}>
        <ProductPhoto
          product={{ name: name || "Producto", category, photoUri }}
          size={120}
        />
      </View>
      <Button
        title={photoBusy ? "Procesando foto…" : "Elegir foto"}
        secondary
        icon="image-outline"
        disabled={photoBusy || busy}
        onPress={() => void pick()}
      />
      <Button
        title="Tomar foto"
        secondary
        icon="camera-outline"
        disabled={photoBusy || busy}
        onPress={() => void pick(true)}
      />
      {photoUri && (
        <Button
          title="Quitar foto"
          secondary
          disabled={photoBusy || busy}
          onPress={() => setPhotoUri(undefined)}
        />
      )}
      <Field
        label="Nombre del producto"
        placeholder="Ej. Arroz extra 1 kg"
        value={name}
        onChangeText={setName}
        maxLength={80}
      />
      <Field
        label="Código de barras / SKU / QR"
        placeholder="Código único del producto"
        value={code}
        onChangeText={setCode}
        autoCapitalize="none"
        maxLength={80}
      />
      <Text style={s.label}>Categoría</Text>
      <Chips options={categories} value={category} onChange={setCategory} />
      <Field
        label="Costo unitario (S/)"
        placeholder="0.00"
        value={cost}
        onChangeText={setCost}
        keyboardType="decimal-pad"
      />
      <Field
        label="Stock mínimo (unidades)"
        value={minStock}
        onChangeText={setMinStock}
        keyboardType="number-pad"
      />
      <Field
        label="Unidad de presentación"
        placeholder="Bolsa, botella, caja…"
        value={unit}
        onChangeText={setUnit}
        maxLength={30}
      />
      <Select
        label="Ubicación habitual de recepción"
        value={location}
        onChange={setLocation}
        options={data.locations.map((l) => ({
          id: l.id,
          label: l.id + " · " + l.label,
        }))}
      />
      <Button
        title="Crear ubicación"
        secondary
        onPress={() => navigation.navigate("LocationForm")}
      />
      <SupplierSelect
        suppliers={data.suppliers}
        value={supplierId}
        onChange={setSupplierId}
      />
      <Text style={s.sub}>
        {existing
          ? "El stock cambia únicamente mediante movimientos para conservar su historial."
          : "El producto comenzará con stock 0. Luego registra una entrada con su referencia."}
      </Text>
      <ErrorNotice message={error} />
      <Button
        title={busy ? "Guardando…" : "Guardar producto"}
        icon="checkmark-outline"
        disabled={busy || photoBusy}
        onPress={() => void submit()}
      />
    </Page>
  );
}
