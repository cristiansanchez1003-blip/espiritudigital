# Guía: planilla de leads, Apps Script y Telegram

Al terminar, cada formulario de `/tiendas-online` queda como una fila en tu planilla y te llega un aviso por Telegram con un enlace directo a su WhatsApp. Cada clic en un botón de WhatsApp queda en la pestaña "Clics WhatsApp".

Tiempo: unos 25 minutos. Necesitas tu cuenta de Google de Espíritu Digital, Telegram en el celular y acceso al proyecto en Vercel.

> **Regla de oro:** el secreto y el token del bot van solo en Vercel y en las propiedades del script. Nunca en un chat, un correo, una captura ni el repositorio.

## 1. Crear la planilla

1. Entra a [sheets.new](https://sheets.new) con la cuenta de Espíritu Digital.
2. Ponle de nombre **Leads tiendas**.

## 2. Pegar el script

1. En la planilla: **Extensiones → Apps Script**. Se abre el editor en otra pestaña.
2. Borra todo lo que aparece en `Código.gs`.
3. Copia el contenido completo de `docs/apps-script.gs` y pégalo.
4. Arriba, cambia el nombre del proyecto de "Proyecto sin título" a **Leads tiendas**.
5. Guarda con el ícono del disquete (o Ctrl + S).

## 3. Ejecutar `configurar`

1. En la barra de arriba, en el selector de funciones, elige **configurar** y presiona **Ejecutar**.
2. Google pide autorización la primera vez:
   - **Revisar permisos** → elige la cuenta de Espíritu Digital.
   - Aparece "Google no verificó esta app": es normal, porque el script es tuyo. Toca **Configuración avanzada → Ir a Leads tiendas (no seguro)**.
   - **Permitir**. El script pide ver y editar tus hojas de cálculo: solo escribe en esta planilla.
3. Espera el mensaje "Ejecución completada". En la planilla vas a ver las pestañas **Resumen**, **Leads**, **Clics WhatsApp** y **Referidos**.

`configurar` se puede ejecutar de nuevo cuando quieras: no borra datos, no duplica pestañas y no cambia el secreto.

## 4. Copiar el secreto

`configurar` creó una clave larga al azar para que solo tu sitio pueda escribir en la planilla.

1. En el editor, a la izquierda: **Configuración del proyecto** (ícono de engranaje).
2. Baja hasta **Propiedades del script**.
3. Copia el valor de **APPS_SCRIPT_SECRET**. Lo pegas en Vercel en el paso 8.

## 5. Implementar como aplicación web

1. Arriba a la derecha: **Implementar → Nueva implementación**.
2. En "Seleccionar tipo" (ícono de engranaje): **Aplicación web**.
3. Completa:
   - **Descripción:** Leads v1
   - **Ejecutar como:** Yo (tu correo)
   - **Quién tiene acceso:** Cualquier usuario
4. **Implementar** y copia la **URL de la aplicación web**. Termina en `/exec`. Va en Vercel en el paso 8.

¿Por qué "Cualquier usuario"? Porque quien llama es el servidor de Vercel, que no inicia sesión en Google. Es seguro: el script rechaza todo lo que no traiga el secreto, y la URL no aparece en ninguna página.

## 6. Revisar que el acceso quedó bien

Abre la URL `/exec` en una **ventana de incógnito**. Debe mostrar solo esto:

```json
{"ok":true}
```

Si aparece una página para iniciar sesión en Google, el acceso no quedó en "Cualquier usuario": repite el paso 5 y revisa ese campo.

## 7. Crear el bot de Telegram

Usa un bot nuevo, separado del de Alma.

1. En Telegram, abre **@BotFather** y escribe `/newbot`.
2. Nombre: **Leads Espíritu Digital**. Usuario: uno que termine en `bot`, por ejemplo `leads_espiritudigital_bot`.
3. BotFather te entrega el **token**: va en Vercel como `TELEGRAM_BOT_TOKEN`.
4. Abre el chat con tu bot nuevo, toca **Iniciar** y escríbele "hola".
5. Para saber tu **chat ID**, abre en el navegador esta dirección, reemplazando `TOKEN` por el token:
   `https://api.telegram.org/botTOKEN/getUpdates`
   Busca `"chat":{"id":` seguido de un número. Ese número es `TELEGRAM_CHAT_ID`. Si ves `"result":[]`, escríbele otro mensaje al bot y recarga.
6. Cierra esa pestaña: la dirección lleva el token.

## 8. Cargar las variables en Vercel

1. Vercel → proyecto del sitio → **Settings → Environment Variables**.
2. Agrega estas 4, marcando **Production** y **Preview**, y activa **Sensitive** en el secreto y el token:

| Nombre | Valor |
| --- | --- |
| `APPS_SCRIPT_URL` | La URL `/exec` del paso 5 |
| `APPS_SCRIPT_SECRET` | El secreto del paso 4 |
| `TELEGRAM_BOT_TOKEN` | El token del paso 7 |
| `TELEGRAM_CHAT_ID` | El número del paso 7 |

3. Las variables solo se aplican a implementaciones nuevas: en **Deployments**, abre la última → menú **⋯** → **Redeploy**.

No agregues `LEADS_MODO_PRUEBA` en Vercel: es solo para pruebas en un computador, y en Vercel se ignora.

## 9. Probar

**a) Solo la planilla** (sin Vercel). En el editor de Apps Script, elige la función **probarAnotacion** y presiona **Ejecutar**. En la pestaña Leads aparece una fila "PRUEBA (borrar)". En la columna `que_vende` debe verse el texto `=SUMA(1;1)...` tal cual: así se comprueba que nadie puede meter una fórmula en tu planilla.

**b) Todo el camino.** Cuando la landing esté en una vista previa de Vercel, ábrela con:

`<url-de-la-vista-previa>/tiendas-online?h=precio&gclid=prueba&utm_source=google&utm_medium=cpc&utm_campaign=tiendas-online&utm_term=prueba`

Llena el formulario con datos de prueba y un WhatsApp tuyo. Debes ver:

- Una fila nueva en **Leads**, con `gclid` = prueba, `utm_term` = prueba, `h` = precio y `etapa` = nuevo.
- Un mensaje en Telegram que empieza con "🛒 Lead tiendas" y termina con el enlace `https://wa.me/569...`. Tócalo: debe abrir el chat con ese número.
- Al tocar un botón de WhatsApp de la landing, una fila en **Clics WhatsApp**.

**c) Limpieza.** Borra las filas de prueba de Leads, Clics WhatsApp y Referidos (clic derecho en el número de fila → Borrar fila).

## 10. Cómo se usa la planilla

**Leads.** Las primeras 20 columnas las llena el sitio. Las demás son tuyas:

| Columna | Qué anotas |
| --- | --- |
| `etapa` | Lista: nuevo, contactado, llamada, vista_previa, propuesta, ganado, perdido, mas_adelante |
| `calificado` | Casilla. Márcala cuando cumpla tu definición de calificado |
| `minutos_primera_respuesta` | Minutos entre la llegada y tu primer mensaje |
| `monto_cierre` | Monto neto, solo si se ganó |
| `motivo_perdida` | Por qué no siguió |
| `fecha_recontacto` | Cuándo volver a escribirle (doble clic abre un calendario) |
| `notas` | Lo que quieras |

Los leads que llegan directo por WhatsApp también puedes anotarlos aquí a mano, en una fila nueva: así el Resumen los cuenta.

**Resumen.** Cada fila es una semana, de lunes a domingo. Solo anotas el **gasto de Google Ads** de la semana en la columna amarilla; los leads, clics, calificados, propuestas, ventas, el tiempo de respuesta y los costos por lead y por calificado se calculan solos. Trae 30 semanas; para agregar más, copia la última fila hacia abajo.

**Referidos.** El script `scripts/generar_enlaces_referidos.py` crea los enlaces de cada referidor y un CSV. Para cargarlo: en la pestaña Referidos, **Archivo → Importar → Subir**, elige el CSV, "Ubicación de importación": **Anexar a la hoja actual**, y deja **desmarcado** "Convertir texto en números, fechas y fórmulas". Cuando llega un lead con `?ref=`, el script agrega solo una fila con estado "lead" y el nombre del referidor.

## 11. Si cambias el script

Pegar código nuevo no cambia lo que está publicado. Para aplicarlo sin cambiar la URL:

**Implementar → Administrar implementaciones** → lápiz de la implementación activa → **Versión: Nueva versión** → **Implementar**.

Si en cambio creas una "Nueva implementación", la URL cambia y hay que actualizar `APPS_SCRIPT_URL` en Vercel.

## 12. Si algo falla

| Qué pasa | Qué revisar |
| --- | --- |
| Llega Telegram con "⚠️ La planilla no confirmó..." | Que el lead esté en la planilla; si no está, anótalo a mano. Luego revisa en Apps Script → **Ejecuciones** si hay errores, y que `APPS_SCRIPT_SECRET` en Vercel sea igual al de las propiedades del script |
| No llega nada y la página muestra el error con el botón de WhatsApp | Fallaron la planilla y Telegram a la vez. Revisa las 4 variables en Vercel y que hiciste Redeploy |
| La planilla funciona pero Telegram no | Que hayas tocado **Iniciar** en el chat con el bot y que `TELEGRAM_CHAT_ID` sea el número correcto |
| La URL `/exec` muestra una página de Google | El acceso no está en "Cualquier usuario" (paso 5) |
| Cambiaste el script y no se nota | Falta publicar una nueva versión (paso 11) |

Los registros de Vercel (**Deployments → la implementación → Functions / Logs**) muestran por cada lead si respondieron la planilla y Telegram, sin nombres ni teléfonos.

## 13. Si se filtra el secreto o el token

- **Secreto:** en Propiedades del script, cambia el valor de `APPS_SCRIPT_SECRET` por uno nuevo (o bórralo y ejecuta `configurar`, que crea otro). Pega el nuevo en Vercel y haz Redeploy.
- **Token del bot:** en @BotFather, `/revoke` y elige el bot. Pega el token nuevo en Vercel y haz Redeploy.
