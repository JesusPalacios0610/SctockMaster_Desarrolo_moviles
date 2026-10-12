import React, { useState, useEffect, useMemo } from "react";
import {
  Image,
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  TextInputProps,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/Preferences";
import { Palette } from "../theme/theme";
import { Product, Movement, money, isLow } from "../domain/inventory";
export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export const Icon = ({
  name,
  color,
  size = 22,
}: {
  name: IconName;
  color?: string;
  size?: number;
}) => {
  const { colors: c } = useTheme();
  return (
    <Ionicons
      accessible={false}
      name={name}
      color={color ?? c.primary}
      size={size}
    />
  );
};
export function Page({
  children,
  scroll = true,
}: React.PropsWithChildren<{ scroll?: boolean }>) {
  const { colors: c } = useTheme();
  const s = useUI();

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.content}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[s.content, { flex: 1, paddingBottom: 0 }]}>
            {children}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Heading({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const { colors: c } = useTheme();
  const s = useUI();

  return (
    <View style={s.heading}>
      <View style={{ flex: 1 }}>
        {eyebrow && <Text style={s.eyebrow}>{eyebrow}</Text>}
        <Text accessibilityRole="header" style={s.h1}>
          {title}
        </Text>
        {subtitle && <Text style={s.sub}>{subtitle}</Text>}
      </View>
      {action}
    </View>
  );
}
export function Card({
  children,
  dark = false,
}: React.PropsWithChildren<{ dark?: boolean }>) {
  const { colors: c } = useTheme();
  const s = useUI();

  return (
    <View
      style={[s.card, dark && { backgroundColor: c.dark, borderColor: c.dark }]}
    >
      {children}
    </View>
  );
}
export function Button({
  title,
  onPress,
  icon,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  secondary?: boolean;
  disabled?: boolean;
}) {
  const { colors: c } = useTheme();
  const s = useUI();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      activeOpacity={0.75}
      disabled={disabled}
      onPress={onPress}
      style={[s.button, secondary && s.secondary, disabled && { opacity: 0.5 }]}
    >
      {icon && (
        <Icon
          name={icon}
          color={secondary ? c.primary : c.onPrimary}
          size={20}
        />
      )}
      <Text style={[s.buttonText, secondary && { color: c.primary }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}
export function IconButton({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const { colors: c } = useTheme();
  const s = useUI();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={s.iconButton}
    >
      <Icon name={icon} />
    </TouchableOpacity>
  );
}
export function Section({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  const { colors: c } = useTheme();
  const s = useUI();

  return (
    <View style={[s.row, { marginTop: 8 }]}>
      <Text style={s.h2}>{title}</Text>
      {action && (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onPress}
          style={{ paddingVertical: 12 }}
        >
          <Text style={s.link}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { colors: c } = useTheme();
  const s = useUI();

  return (
    <View style={{ gap: 7 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        style={[
          s.input,
          props.multiline && { minHeight: 92, textAlignVertical: "top" },
        ]}
        {...props}
      />
    </View>
  );
}
export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { colors: c } = useTheme();
  const s = useUI();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
      style={{ flexGrow: 0 }}
    >
      {options.map((v) => (
        <TouchableOpacity
          key={v}
          accessibilityRole="button"
          accessibilityState={{ selected: value === v }}
          onPress={() => onChange(v)}
          style={[
            s.chip,
            value === v && { backgroundColor: c.dark, borderColor: c.dark },
          ]}
        >
          <Text
            style={{ fontWeight: "600", color: value === v ? "#fff" : c.muted }}
          >
            {v}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
export function ErrorNotice({ message }: { message: string | null }) {
  const { colors: c } = useTheme();
  const s = useUI();

  return message ? (
    <View accessibilityRole="alert" style={s.error}>
      <Icon name="alert-circle-outline" color={c.red} />
      <Text style={{ flex: 1, color: c.red, lineHeight: 21 }}>{message}</Text>
    </View>
  ) : null;
}
export function Empty({
  title,
  detail,
  icon = "cube-outline",
}: {
  title: string;
  detail: string;
  icon?: IconName;
}) {
  const { colors: c } = useTheme();
  const s = useUI();

  return (
    <View style={s.empty}>
      <Icon name={icon} size={36} />
      <Text style={s.h2}>{title}</Text>
      <Text style={[s.sub, { textAlign: "center" }]}>{detail}</Text>
    </View>
  );
}
export function Loading() {
  const { colors: c } = useTheme();
  const s = useUI();

  return (
    <View style={s.empty}>
      <ActivityIndicator size="large" color={c.primary} />
      <Text style={s.sub}>Cargando tu inventario…</Text>
    </View>
  );
}
export const categoryIcon = (category: string): IconName =>
  (
    ({
      Abarrotes: "basket-outline",
      Bebidas: "water-outline",
      Limpieza: "sparkles-outline",
      "Cuidado personal": "leaf-outline",
    }) as Record<string, IconName>
  )[category] ?? "cube-outline";
export function ProductPhoto({
  product: p,
  size = 46,
}: {
  product: Pick<Product, "name" | "category" | "photoUri">;
  size?: number;
}) {
  const { colors: c } = useTheme();
  const s = useUI();

  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [p.photoUri]);
  return p.photoUri && !failed ? (
    <Image
      accessibilityLabel={`Foto de ${p.name}`}
      source={{ uri: p.photoUri }}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, borderRadius: 14 }}
      resizeMode="cover"
    />
  ) : (
    <View style={[s.productIcon, { width: size, height: size }]}>
      <Icon name={categoryIcon(p.category)} size={size > 60 ? 36 : 25} />
    </View>
  );
}
export function ProductRow({
  product: p,
  onPress,
}: {
  product: Product;
  onPress: () => void;
}) {
  const { colors: c } = useTheme();
  const s = useUI();

  const { prefs } = useTheme();
  const low = isLow(p);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      activeOpacity={0.7}
      style={s.product}
    >
      <ProductPhoto product={p} />
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={s.productName}>{p.name}</Text>
        {!prefs.simplified && (
          <>
            <Text style={s.small}>
              {p.category} · {p.location}
            </Text>
            <Text style={s.small}>
              {money(p.cost)} / {p.unit.toLowerCase()}
            </Text>
          </>
        )}
      </View>
      <View style={{ alignItems: "flex-end", gap: 5 }}>
        <Text
          style={[s.stock, low && { color: p.stock === 0 ? c.red : c.warning }]}
        >
          {p.stock}
        </Text>
        <Text style={s.small}>unid.</Text>
        {low && (
          <Text
            style={{
              fontSize: 10,
              color: p.stock === 0 ? c.red : c.warning,
              fontWeight: "700",
            }}
          >
            {p.stock === 0 ? "AGOTADO" : "STOCK BAJO"}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
export function MovementRow({ movement: m }: { movement: Movement }) {
  const { colors: c } = useTheme();
  const s = useUI();

  const incoming = m.after > m.before;
  return (
    <View style={s.product}>
      <View
        style={[
          s.productIcon,
          { backgroundColor: incoming ? c.mint : c.warningBg },
        ]}
      >
        <Icon
          name={incoming ? "arrow-down-outline" : "arrow-up-outline"}
          color={incoming ? c.primary : c.warning}
        />
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={s.productName}>{m.productName}</Text>
        <Text style={s.small}>
          {m.type === "ajuste" ? "CONTEO FÍSICO" : m.type.toUpperCase()} ·{" "}
          {new Date(m.createdAt).toLocaleDateString("es-PE")}{" "}
          {new Date(m.createdAt).toLocaleTimeString("es-PE", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
        <Text style={s.small}>{m.note}</Text>
        {m.allocations?.map((a, i) => (
          <Text key={i} style={s.small}>
            Lote {a.code} · {a.locationId}: {a.delta > 0 ? "+" : ""}
            {a.delta}
            {a.expiresOn ? " · vence " + a.expiresOn : ""}
          </Text>
        ))}
        {m.supplierName && (
          <Text style={s.small}>Proveedor: {m.supplierName}</Text>
        )}
        <Text style={s.small}>
          Stock: {m.before} → {m.after}
        </Text>
      </View>
      <Text style={[s.stock, { color: incoming ? c.primary : c.warning }]}>
        {m.type === "traslado"
          ? "↔ "
          : m.quantity === 0
            ? ""
            : incoming
              ? "+"
              : "−"}
        {m.quantity}
      </Text>
    </View>
  );
}
const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: {
      padding: 22,
      paddingBottom: 32,
      gap: 18,
      width: "100%",
      maxWidth: 760,
      alignSelf: "center",
    },
    heading: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginTop: 5,
      marginBottom: 3,
    },
    eyebrow: {
      color: c.primary,
      letterSpacing: 2,
      fontSize: 10,
      fontWeight: "800",
      marginBottom: 8,
    },
    h1: { fontSize: 30, letterSpacing: -1, color: c.ink, fontWeight: "800" },
    h2: { fontSize: 18, color: c.ink, fontWeight: "700", letterSpacing: -0.3 },
    sub: { color: c.muted, fontSize: 14, lineHeight: 22, marginTop: 5 },
    small: { color: c.muted, fontSize: 12, lineHeight: 17 },
    label: { color: c.ink, fontWeight: "600", fontSize: 13 },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
    },
    card: {
      backgroundColor: c.paper,
      padding: 20,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.line,
      gap: 14,
    },
    button: {
      backgroundColor: c.primary,
      minHeight: 50,
      paddingVertical: 13,
      paddingHorizontal: 18,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 9,
    },
    secondary: { backgroundColor: c.mint },
    buttonText: {
      flexShrink: 1,
      textAlign: "center",
      color: c.onPrimary,
      fontWeight: "700",
      fontSize: 14,
    },
    iconButton: {
      minWidth: 46,
      minHeight: 46,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
      backgroundColor: c.paper,
      borderWidth: 1,
      borderColor: c.line,
    },
    link: { color: c.primary, fontWeight: "700", fontSize: 13 },
    input: {
      backgroundColor: c.paper,
      color: c.ink,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: 13,
      minHeight: 50,
      padding: 14,
      fontSize: 15,
    },
    chip: {
      paddingHorizontal: 16,
      minHeight: 44,
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.paper,
      borderRadius: 24,
    },
    error: {
      padding: 14,
      flexDirection: "row",
      gap: 8,
      backgroundColor: c.redBg,
      borderRadius: 12,
    },
    empty: {
      paddingVertical: 36,
      paddingHorizontal: 12,
      gap: 12,
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
    },
    product: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      gap: 13,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: 18,
      backgroundColor: c.paper,
      marginBottom: 10,
    },
    productIcon: {
      width: 46,
      height: 50,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.mint,
    },
    productName: { fontSize: 14, color: c.ink, fontWeight: "700" },
    stock: { fontSize: 21, fontWeight: "700", color: c.ink },
  });

export function useUI() {
  const { colors: c } = useTheme();
  return useMemo(() => makeStyles(c), [c]);
}
