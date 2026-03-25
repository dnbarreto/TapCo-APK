# TapCo — SoftPOS MVP
## Cómo generar el APK sin instalar nada local

### ESTRUCTURA DEL PROYECTO
```
tapco/
├── App.js                          ← entrada principal + navegación
├── screens/
│   ├── CobrarScreen.js             ← keypad + NFC + procesamiento
│   └── WalletCardHistScreen.js     ← billetera + tarjeta + historial
├── package.json
├── app.json                        ← config Expo + permisos NFC
├── eas.json                        ← config build APK
└── babel.config.js
```

---

## PASO 1 — Subir a GitHub

1. Crea repositorio nuevo en github.com → "tapco-rn"
2. Sube todos los archivos manteniendo la estructura de carpetas
3. La carpeta `screens/` debe contener los 2 archivos de pantallas

---

## PASO 2 — Conectar con Expo

1. Ve a https://expo.dev → inicia sesión
2. Dashboard → "Create a project" → nombre: tapco
3. Copia el **Project ID** que te da Expo
4. Pégalo en `app.json` donde dice `"REEMPLAZA-CON-TU-PROJECT-ID"`
5. Haz commit del cambio en GitHub

---

## PASO 3 — Generar el APK con EAS Build

1. Ve a https://expo.dev/accounts/[tu-usuario]/projects/tapco/builds
2. Click en **"New Build"**
3. Selecciona:
   - Platform: **Android**
   - Profile: **preview** (esto genera .apk, no .aab)
4. Conecta tu repositorio de GitHub cuando te lo pida
5. Click **"Build"**
6. Espera ~15 minutos

---

## PASO 4 — Instalar en tu Android

1. Cuando termine, EAS te da un link de descarga del .apk
2. Ábrelo desde tu Android
3. Android va a preguntar "Instalar de fuentes desconocidas" → Permitir
4. Instala → abre TapCo

---

## QUÉ HACE EL NFC EN ESTA VERSIÓN

Cuando abres la pantalla de cobro y presionas "Cobrar con tarjeta NFC":
- Si tu celular tiene NFC: **detecta físicamente la tarjeta** (lee el UID)
  → vibra al detectarla → muestra en el recibo "NFC Real · UID:XXXXXXXX"
- La **autorización del cobro** sigue siendo mock (requiere adquirente real)
- Botones de simulación siempre disponibles como fallback

## PARA CONECTAR EL ADQUIRENTE REAL (Fase 2)

En `CobrarScreen.js` reemplaza la función `handleTap()`:
```javascript
// MOCK (actual):
function handleTap(approv, tagInfo) {
  // simula autorización
}

// PRODUCCIÓN (reemplazar por):
async function handleTap(nfcToken) {
  const response = await kushkiSDK.authorize({
    token: nfcToken,
    amount: amount,
    currency: 'COP'
  });
  finishProc(response.approved, nfcToken);
}
```

---

## NOTA SOBRE NFC Y PAGO REAL

El NFC de un navegador web NO puede leer tarjetas de pago.
Este APK nativo SÍ puede detectar el tag NFC de la tarjeta.
Para cobrar de verdad necesitas:
1. Contrato con adquirente (Redeban / Kushki)
2. SDK certificado PCI MPoC (Phos / Akua.la)
3. Reemplazar la función mock de autorización
