import { Platform } from "react-native";
import * as Picker from "expo-image-picker";
import * as Manipulator from "expo-image-manipulator";
import * as FS from "expo-file-system/legacy";
// Móvil: archivo permanente. Web: JPEG pequeño en datos locales, sin URL temporal.
export async function chooseProductPhoto(
  camera = false,
): Promise<string | null> {
  if (camera) {
    const permission = await Picker.requestCameraPermissionsAsync();
    if (!permission.granted)
      throw new Error(
        "Permite la cámara en los ajustes del dispositivo o elige una foto de la galería.",
      );
  }
  const options: Picker.ImagePickerOptions = {
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  };
  const result = camera
    ? await Picker.launchCameraAsync(options)
    : await Picker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  const photo = await Manipulator.manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: 480 } }],
    {
      compress: 0.65,
      format: Manipulator.SaveFormat.JPEG,
      base64: Platform.OS === "web",
    },
  );
  if (Platform.OS === "web") {
    if (!photo.base64) throw new Error("No se pudo procesar la foto.");
    if (photo.base64.length > 350000)
      throw new Error("Elige una imagen más pequeña.");
    return `data:image/jpeg;base64,${photo.base64}`;
  }
  if (!FS.documentDirectory)
    throw new Error("No se pudo acceder al almacenamiento de fotos.");
  const dir = `${FS.documentDirectory}stockmaster-photos/`;
  await FS.makeDirectoryAsync(dir, { intermediates: true });
  const uri = `${dir}${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  await FS.copyAsync({ from: photo.uri, to: uri });
  return uri;
}

export async function discardProductPhoto(uri?: string): Promise<void> {
  if (Platform.OS === "web" || !uri || !FS.documentDirectory) return;
  if (!uri.startsWith(`${FS.documentDirectory}stockmaster-photos/`)) return;
  try {
    await FS.deleteAsync(uri, { idempotent: true });
  } catch {
    /* La limpieza no invalida un guardado exitoso. */
  }
}
