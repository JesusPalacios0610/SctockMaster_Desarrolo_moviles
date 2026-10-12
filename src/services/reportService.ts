import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FS from "expo-file-system/legacy";
export { escapeHTML } from "../domain/reports";
export async function shareHtml(html: string, name: string) {
  if (Platform.OS === "web") {
    const w = window.open("", "_blank");
    if (!w)
      throw new Error("Permite las ventanas emergentes para abrir el reporte.");
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.document.title = name;
    w.focus();
    setTimeout(() => w.print(), 350);
    return;
  }
  if (!(await Sharing.isAvailableAsync()))
    throw new Error(
      "Compartir archivos no está disponible en este dispositivo.",
    );
  const { uri } = await Print.printToFileAsync({ html });
  const target = FS.cacheDirectory + name + ".pdf";
  await FS.copyAsync({ from: uri, to: target });
  await Sharing.shareAsync(target, {
    mimeType: "application/pdf",
    UTI: ".pdf",
    dialogTitle: name,
  });
}
export async function shareWorkbook(bytes: Uint8Array, name: string) {
  const mime =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(
      new Blob([new Uint8Array(bytes).buffer], { type: mime }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name + ".xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (!(await Sharing.isAvailableAsync()))
    throw new Error(
      "Compartir archivos no está disponible en este dispositivo.",
    );
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  const uri = FS.cacheDirectory + name + ".xlsx";
  await FS.writeAsStringAsync(uri, btoa(binary), {
    encoding: FS.EncodingType.Base64,
  });
  await Sharing.shareAsync(uri, {
    mimeType: mime,
    UTI: "org.openxmlformats.spreadsheetml.sheet",
    dialogTitle: name,
  });
}
