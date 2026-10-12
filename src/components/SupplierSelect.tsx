import { useTheme } from "../theme/Preferences";
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Supplier } from "../domain/inventory";
import { useUI, Icon } from "./UI";

export function SupplierSelect({
  suppliers,
  value,
  onChange,
}: {
  suppliers: Supplier[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { colors: c } = useTheme();
  const s = useUI();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = suppliers.find((x) => x.id === value);
  function select(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>Proveedor (opcional)</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Seleccionar proveedor"
        onPress={() => setOpen(!open)}
        style={[s.input, s.row]}
      >
        <Text style={{ color: c.ink, flex: 1 }}>
          {selected?.name ?? "Sin proveedor"}
        </Text>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={18} />
      </TouchableOpacity>
      {open && (
        <View style={[s.card, { padding: 12 }]}>
          <TextInput
            accessibilityLabel="Buscar proveedor"
            placeholder="Buscar proveedor"
            style={s.input}
            value={query}
            onChangeText={setQuery}
          />
          <ScrollView
            style={{ maxHeight: 220 }}
            keyboardShouldPersistTaps="handled"
          >
            {[
              { id: "", name: "Sin proveedor" },
              ...suppliers.filter((x) =>
                x.name.toLowerCase().includes(query.toLowerCase()),
              ),
            ].map((x) => (
              <TouchableOpacity
                key={x.id}
                accessibilityRole="button"
                accessibilityLabel={`Elegir ${x.name}`}
                onPress={() => select(x.id)}
                style={{
                  padding: 14,
                  backgroundColor: value === x.id ? c.mint : c.paper,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: c.ink }}>{x.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      {!suppliers.length && (
        <Text style={s.small}>
          Agrega proveedores desde Inicio → Proveedores.
        </Text>
      )}
    </View>
  );
}
