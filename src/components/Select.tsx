import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useUI, Icon } from "./UI";
import { useTheme } from "../theme/Preferences";
export function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
}) {
  const s = useUI(),
    { colors: c } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={[s.input, s.row]}
      >
        <Text style={{ color: c.ink, flex: 1 }}>
          {options.find((x) => x.id === value)?.label ?? "Seleccionar"}
        </Text>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={18} />
      </TouchableOpacity>
      {open && (
        <ScrollView
          style={{
            maxHeight: 240,
            borderWidth: 1,
            borderColor: c.line,
            borderRadius: 12,
          }}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          {options.map((x) => (
            <TouchableOpacity
              key={x.id}
              accessibilityRole="button"
              accessibilityLabel={`Elegir ${x.label}`}
              onPress={() => {
                onChange(x.id);
                setOpen(false);
              }}
              style={{
                padding: 16,
                backgroundColor: x.id === value ? c.mint : c.paper,
              }}
            >
              <Text style={{ color: c.ink }}>{x.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
