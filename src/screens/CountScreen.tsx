import { Select } from "../components/Select";
import { useTheme } from "../theme/Preferences";
import React, { useState } from "react";
import { Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParams } from "../navigation/types";
import {
  Page,
  Heading,
  Card,
  Field,
  Button,
  ErrorNotice,
  Empty,
  useUI,
} from "../components/UI";
import { useInventory } from "../hooks/useInventory";

export function CountScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParams, "Count">) {
  const { colors: c } = useTheme();
  const s = useUI();

  const { data, count, busy } = useInventory();
  const p = data.products.find((x) => x.id === route.params.id);
  const lots = data.lots.filter((l) => l.productId === route.params.id);
  const [lotId, setLotId] = useState(
    route.params.lotId ??
      lots.find((l) => l.quantity > 0)?.id ??
      lots[0]?.id ??
      "",
  );
  const [expected, setExpected] = useState(
    lots.find(
      (l) =>
        l.id ===
        (route.params.lotId ??
          lots.find((l) => l.quantity > 0)?.id ??
          lots[0]?.id),
    )?.quantity ?? 0,
  );
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [review, setReview] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qty = Number(value),
    valid = value.trim() !== "" && Number.isSafeInteger(qty) && qty >= 0,
    delta = qty - expected;
  if (!p)
    return (
      <Page>
        <Empty title="Producto no disponible" detail="Regresa al inventario." />
      </Page>
    );
  function preview() {
    setError(null);
    if (!valid) {
      setError("Ingresa una cantidad entera mayor o igual a 0.");
      return;
    }
    if (!note.trim()) {
      setError("Indica el motivo o referencia del conteo.");
      return;
    }
    setReview(true);
  }
  async function submit() {
    if (!p) return;
    try {
      await count(p.id, qty, expected, note, lotId || undefined);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    }
  }
  if (done)
    return (
      <Page>
        <Empty
          icon="checkmark-circle-outline"
          title="Conteo guardado"
          detail={
            delta === 0
              ? "El inventario coincide. La revisión quedó registrada en Actividad."
              : "Se actualizó el stock y se registró el ajuste en Actividad."
          }
        />
        <Button
          title="Volver al producto"
          onPress={() => navigation.goBack()}
        />
      </Page>
    );
  return (
    <Page>
      <Heading
        eyebrow="AUDITORÍA DE INVENTARIO"
        title={review ? "Confirma tu conteo" : "Conteo físico"}
        subtitle={p.name}
      />
      {!review && lots.length > 0 && (
        <Select
          label="Lote que estás contando"
          value={lotId}
          onChange={(id) => {
            setLotId(id);
            setExpected(lots.find((l) => l.id === id)?.quantity ?? 0);
            setValue("");
          }}
          options={lots.map((l) => ({
            id: l.id,
            label:
              l.code + " · " + l.locationId + " · " + l.quantity + " unid.",
          }))}
        />
      )}
      <Text style={s.sub}>
        Cuenta únicamente este lote en su ubicación. El resto de los lotes
        conserva su cantidad.
      </Text>
      <Card>
        <View style={s.row}>
          <Text style={s.sub}>Cantidad registrada en el lote</Text>
          <Text style={s.stock}>{expected}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.sub}>Cantidad encontrada</Text>
          <Text style={s.stock}>{valid ? qty : "—"}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.sub}>Diferencia</Text>
          <Text style={[s.stock, { color: delta < 0 ? c.warning : c.primary }]}>
            {valid ? `${delta > 0 ? "+" : ""}${delta}` : "—"}
          </Text>
        </View>
      </Card>
      {review ? (
        <Card>
          <Text style={s.h2}>
            {delta === 0
              ? "Inventario verificado"
              : `El lote quedará en ${qty} unidades`}
          </Text>
          <Text style={s.sub}>{note}</Text>
          <Text style={s.small}>
            La revisión se conservará en el historial y no se podrá editar. Si
            cometiste un error, realiza un nuevo conteo con su motivo.
          </Text>
        </Card>
      ) : (
        <>
          <Field
            label="Cantidad encontrada"
            value={value}
            onChangeText={setValue}
            keyboardType="number-pad"
            placeholder="Cuenta las unidades físicas"
          />
          <Field
            label="Motivo o referencia del conteo"
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={240}
            placeholder="Ej. Revisión de estante A-01 / diferencia por registro"
          />
          <Text style={s.sub}>
            Puedes registrar cero si no hay existencias. Si la cantidad
            coincide, se guardará una revisión sin variar el stock.
          </Text>
        </>
      )}
      <ErrorNotice message={error} />
      <Button
        title={
          busy ? "Guardando…" : review ? "Confirmar conteo" : "Revisar conteo"
        }
        icon="checkmark-outline"
        disabled={busy}
        onPress={() => (review ? void submit() : preview())}
      />
      {review && (
        <Button
          title="Corregir conteo"
          secondary
          disabled={busy}
          onPress={() => {
            setReview(false);
            setError(null);
          }}
        />
      )}
    </Page>
  );
}
