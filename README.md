# StockMaster 1.3.1 · Expo SDK 57

Aplicación móvil de inventario para MYPES. Proyecto de Desarrollo de Aplicaciones Móviles basado en la propuesta de Jesús Juan Alfredo Palacios Quispe.

## Entrega local del avance 02

La aplicación abre directamente el inventario del dispositivo. No requiere conexión a una base de datos remota, cuentas ni servidor de datos. Se conservan todas las herramientas de almacén, apariencia y reportes.

## Ejecutar en Windows

Desde la carpeta que contiene `package.json`, con Node.js 22.13 o superior:

```bat
npm ci
npx expo start --clear
```

Abre Expo Go compatible con SDK 57 y escanea el QR de Metro. PC y teléfono deben estar en la misma red. Para web, pulsa `w` o ejecuta `npm run web`. Si PowerShell bloquea npm.ps1, usa una terminal CMD o `npm.cmd ci` y `npx.cmd expo start --clear`.

## Actualizar el proyecto que ya subiste a GitHub

1. Detén Metro con Ctrl+C y guarda una copia de tu carpeta actual.
2. Si vienes de la entrega con trabajo en equipo, retira de tu carpeta de trabajo `server`, `.env.example`, `docs/BACKEND.md`, `src/context/AuthContext.tsx`, `src/services/teamApi.ts`, `src/domain/team.ts`, `src/components/Permission.tsx`, `src/screens/TeamScreens.tsx` y `src/screens/LoginScreen.tsx`. Guarda antes una copia si configuraste datos en el servidor: esos datos no se convierten automáticamente en inventario local. Extrae el ZIP. Copia **el contenido de StockMaster** sobre tu carpeta de proyecto existente, donde está package.json. Conserva `.git`. Si tienes cambios propios, compara los archivos antes de reemplazarlos.
3. Ejecuta `npm ci` y `npx expo start --clear`. No reinstales Expo Go ni borres sus datos para actualizar el código.
4. Prueba la app y sube los cambios desde tu repositorio existente:

```bat
git status
git add .
git commit -m "refactor: entrega local del avance 02"
git push
```

No repitas `git init` ni `git remote add origin`. El ZIP no modifica tu repositorio remoto por sí solo. Conserva `.gitignore`; no subas dependencias, exportaciones ni secretos. Si ya tienes una web publicada, actualizarla requiere el flujo de despliegue de tu proveedor; un APK instalado tampoco cambia por subir un commit.

## Novedades de esta versión

- **Apariencia y accesibilidad:** tema claro, oscuro o del sistema; preferencias persistentes; etiquetas para lectores de pantalla, controles amplios, texto escalable y estados descritos con texto. No constituye una certificación de accesibilidad; comprobar TalkBack/VoiceOver y tamaños grandes en el dispositivo.
- **Modo simplificado:** inicio con Buscar producto, Agregar stock y Retirar stock; listas con menos información y revisión antes de confirmar movimientos. Más opciones conserva acceso al resto de herramientas.
- **Ubicaciones QR:** almacén, pasillo y estante; etiquetas QR exportables a PDF, consulta del stock por ubicación, escaneo o ingreso manual. Los códigos identifican ubicaciones locales; no son enlaces públicos.
- **Lotes y FEFO:** cada recepción registra lote, ubicación y fecha opcional. Las salidas consumen primero los vencimientos próximos, excluyen vencidos y dejan sin fecha al final. Cada recepción es un registro separado aunque repita código de lote. Conteo por lote; merma por lote; traslado completo a otra ubicación con historial.
- **Reportes:** Excel real `.xlsx` con Información, Inventario, Lotes, Movimientos y Compras; PDF imprimible. Intervalo inclusivo por fecha local aplicado solo a movimientos. Catálogo, lotes y compras representan el estado actual. Valores a costo en PEN.
- **Reposición sugerida:** mínimo cuando falta historial. Con al menos 7 días registrados y 3 salidas, promedio diario de hasta 30 días × (cobertura + entrega), redondeado hacia arriba, con el mínimo como piso. Resta stock no vencido y compras confirmadas pendientes. Las salidas deben representar demanda para que la estimación sea útil. No incorpora estacionalidad, festivos ni Machine Learning.
- **Compras:** borradores agrupados por proveedor habitual, edición de cantidades, confirmación local, recepción parcial con lote y cierre al completar la entrega. Cancelar elimina el pendiente, sin revertir recepciones. No envía pedidos ni mensajes al proveedor. El total es referencial, sin impuestos ni flete; no cambia el costo del catálogo.

Se conservan fotos desde cámara/galería, proveedores, catálogo y búsqueda, entradas/salidas/mermas, historial, conteo físico, escáner de productos, alertas y persistencia local.

## Datos y migración

El esquema pasa a versión 3 y conserva la clave de almacenamiento. Al leer datos v1/v2 válidos se conservan productos, fotos, proveedores e historial; el stock actual se convierte en lotes **SALDO ANTERIOR**, sin inventar vencimientos. Las ubicaciones previas se convierten en ubicaciones registradas. La copia anterior se conserva localmente bajo la clave `@stockmaster/inventory/v1/before-v3` antes de guardar la migración. No es un respaldo externo ni dispone de restauración desde la interfaz.

Si falla la lectura o validación, la app muestra un error y no sustituye el inventario por datos de ejemplo. Si falla una escritura, el estado anterior se mantiene. El stock agregado debe coincidir con la suma de lotes; movimientos, lotes y recepciones se guardan juntos. No se deben abrir datos v3 con versiones anteriores de la app.

El JSON inicial contiene datos ficticios y solo se usa en una instalación sin datos. Cambiarlo no reemplaza un inventario existente. Las fechas se interpretan por el día local del dispositivo: un lote que vence hoy se admite durante ese día; queda vencido al siguiente. Revisa los saldos anteriores sin fecha. No hay edición de vencimiento de lotes; corrige un registro equivocado mediante operaciones justificadas y trazables.

Esta entrega utiliza únicamente almacenamiento local. No hay respaldo automático en la nube, IA ni notificaciones externas. Desinstalar o borrar datos puede eliminar el inventario. Los reportes no pueden importarse como respaldo. Expo Go necesita acceder a Metro para cargar la app durante desarrollo. Para uso independiente hace falta generar e instalar una compilación.

## Recorrido de demostración

1. Configuración → Oscuro → activar modo simplificado; cerrar y reabrir para comprobar preferencias.
2. Más opciones → Ubicaciones QR → nueva ubicación → exportar etiqueta. Escanear esa etiqueta abre su contenido.
3. Producto → Registrar entrada: lote L-01, vencimiento futuro, ubicación y cantidad. Registrar otro lote con vencimiento posterior. Hacer una salida y revisar en Actividad qué lote descontó FEFO.
4. Producto → Ver lotes y ubicaciones: contar un lote o trasladarlo completo. El traslado no cambia el stock global.
5. Crear proveedor y asignarlo como habitual a un producto por debajo de su mínimo. Reposición y compras → generar borradores → revisar → confirmar compra prevista → recibir una parte → comprobar pendiente.
6. Reportes → elegir fechas → Excel/PDF. En web Excel se descarga y PDF abre el diálogo de impresión: elige Guardar como PDF. En móvil se genera un archivo y se abre la hoja de compartir.

## Arquitectura y verificación

`src/domain/inventory.ts` controla invariantes y migración; `warehouse.ts` define lotes/ubicaciones; `purchasing.ts` calcula reposición y órdenes; `reports.ts` construye XLSX/HTML. El contexto serializa escrituras y publica el estado después de persistir. `Preferences.tsx` administra tema y modo simple. `reportService.ts` adapta descarga web y compartir nativo. React Navigation usa rutas tipadas.

```bash
npm run typecheck
npm test
npx expo-doctor
npx expo export --platform web --platform android
```

25 pruebas de dominio. Consultar `docs/VERIFICACION.md` para evidencia y pendientes. `expo export` verifica el empaquetado JavaScript/Hermes: no genera un APK.

## Referencias

- https://docs.expo.dev/versions/latest/sdk/print/
- https://docs.expo.dev/versions/latest/sdk/sharing/
- https://docs.expo.dev/versions/latest/sdk/system-ui/
- https://reactnavigation.org/docs/getting-started/
- https://react-native-async-storage.github.io/async-storage/docs/usage/

La matriz académica original está en `docs/AVANCE_02.md`; las novedades actuales en `docs/NOVEDADES_1_2.md`.
