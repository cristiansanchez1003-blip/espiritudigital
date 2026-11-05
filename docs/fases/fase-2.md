# Fase 2 · Medición y registro de leads

Rama `wip/api-medicion`, 5 nov 2026. Nada se publicó: sin push, sin cambios en Vercel ni en Google Ads. La parte del navegador (formulario, `dataLayer`, `sendBeacon`, fragmento de GTM) la construye la rama de la landing con el contrato de abajo.

## 1. Qué se hizo

| Archivo | Qué es |
| --- | --- |
| `api/lead.js` | `POST /api/lead`: valida, filtra bots (y los anota en "Descartados"), limita por IP y envía a la planilla y a Telegram en paralelo |
| `api/wa-click.js` | `POST /api/wa-click`: registra cada clic de WhatsApp en la pestaña "Clics WhatsApp" |
| `api/_lib/http.js` | Lectura del cuerpo con tope de 10 KB (con y sin los ayudantes de Vercel), respuestas, IP, origen y registros |
| `api/_lib/validacion.js` | Validación y normalización (WhatsApp a `+569XXXXXXXX`), campo trampa y tiempo mínimo |
| `api/_lib/limite.js` | Límite por IP en memoria, de mejor esfuerzo (IPv6 por /64) |
| `api/_lib/apps-script.js` | Envío a Apps Script con tiempo límite de 7 s; el éxito se lee del JSON |
| `api/_lib/telegram.js` | Aviso mínimo sin datos personales, con escape HTML y tiempo límite de 4 s |
| `api/_lib/envio.js` | Modo de prueba local, variables de entorno, temporizador y errores sin datos sensibles |
| `docs/apps-script.gs` | `doPost` con secreto, `LockService`, pestañas, listas desplegables, Resumen, correo con el detalle, duplicados, Descartados y limpieza a 24 meses |
| `docs/apps-script-guia.md` | Paso a paso: planilla, script, aplicación web, bot de Telegram, variables en Vercel y pruebas |
| `docs/medicion.md` | Paso a paso: GA4, Tag Manager, las 3 conversiones de Google Ads, Clarity, limpieza y pruebas en celular |
| `scripts/probar-api.mjs` | Banco de pruebas de la API, sin red: 64 pruebas |
| `scripts/probar-apps-script.mjs` | Simulación del Apps Script en Node: 17 pruebas |
| `scripts/generar_enlaces_referidos.py` | Slugs y enlaces `?ref=` y CSV para la pestaña "Referidos" |

No se entregó `docs/gtm-import.json` (era opcional): sin acceso a un contenedor para validar la importación, un JSON escrito a mano puede fallar con errores poco claros. La guía manual toma unos 45 minutos y deja a Cristian entendiendo cada etiqueta.

Por decisión del encargo, la operación semanal, las reglas de referidos y los mensajes no están en el repositorio.

## 2. Contrato con la landing (implementado)

**`POST /api/lead`**, `Content-Type: application/json`. Campos: `nombre, whatsapp, que_vende, vende_online, plazo, presupuesto, plan_interes, consentimiento, ref, gclid, gbraid, wbraid, utm_source, utm_medium, utm_campaign, utm_term, utm_content, h, landing_path, hp, t0`.

| Respuesta | Cuándo |
| --- | --- |
| `200 {ok:true}` | La planilla confirmó (y con ella el correo). También ante el campo trampa o un llenado en menos de 3 s: solo se anota en "Descartados", sin correo ni Telegram |
| `400 {ok:false,error:"validacion",campos:[...]}` | Campos visibles inválidos, en el orden del formulario. `campos:["cuerpo"]` si no es JSON o el Content-Type no es `application/json` |
| `405 {ok:false,error:"metodo"}` | Todo lo que no sea POST (con `Allow: POST`) |
| `413 {ok:false,error:"tamano"}` | Cuerpo de más de 10 KB |
| `429 {ok:false,error:"limite"}` | Más de 5 leads válidos desde la misma IP en 10 minutos |
| `500 {ok:false,error:"envio"}` | La planilla no confirmó (aunque Telegram haya avisado), o hubo un error inesperado. La página ofrece WhatsApp |

Validación: `nombre` 2 a 80 caracteres; `whatsapp` móvil chileno (`+56 9`, `56 9` o `9`, con espacios, guiones, puntos o paréntesis); `que_vende` 2 a 200; `vende_online`, `plazo` y `presupuesto` dentro de sus valores; `consentimiento === true` (el texto `"true"` no vale). Todo texto se recorta, queda en una línea y pierde los caracteres de control y de dirección de texto.

**`POST /api/wa-click`** (text/plain o JSON): `cta_location` obligatorio; `plan, ref, gclid, utm_source, utm_campaign, utm_term, h, landing_path`. `204` a todo cuerpo válido, aunque la planilla falle; `400` si no es JSON o falta `cta_location`; `405`; `413`.

**Hacia Apps Script:** `{secreto, tipo: "lead"|"wa_click"|"referido"|"descartado", datos}`, con 7 s de tiempo límite (3 s para un descartado). **Telegram:** `sendMessage` con `parse_mode: HTML` y 4 s. Planilla y Telegram van en paralelo; el aviso de "la planilla no confirmó" tiene 2 s. Peor caso: 9 s, bajo los 10 s de una función de Vercel.

## 3. Decisiones y por qué

1. **Lo visible se rechaza; lo oculto se sanea.** Un `h` o `plan_interes` desconocido queda vacío, y `ref`, `gclid`, `gbraid`, `wbraid`, `utm_*` y `landing_path` de más de 200 caracteres se cortan a 200, en vez de dar 400. La persona no ve esos campos ni puede corregirlos: rechazar perdería un lead real por un parámetro raro en la URL. Queda un aviso en el registro.
2. **`t0` en el futuro o ausente se acepta.** Un `t0` en el futuro es un reloj adelantado en el equipo de la persona. Tratarlo como bot descartaría leads reales en silencio. Sin `t0`, un error de la landing no pierde leads; el campo trampa y el límite siguen activos.
3. **Límite por IP.** 5 leads válidos cada 10 minutos. Los errores de validación y las trampas no gastan cupo. IPv6 se agrupa por /64, que es una conexión. Con el volumen esperado, que dos personas detrás de la misma IP móvil (CGNAT) envíen 5 formularios en 10 minutos es casi imposible; y si pasara, la página muestra el error con WhatsApp. Los clics tienen 30 cada 10 minutos y sobre eso se responde 204 igual, sin anotar.
4. **Mismo origen sin CORS.** No hay encabezados CORS y `OPTIONS` recibe 405. `/api/lead` exige `application/json`, lo que obliga a un navegador de otro sitio a pedir permiso, y se lo niega. `/api/wa-click` acepta text/plain (así llega `sendBeacon`), así que revisa el `Origin`: si es de otro sitio responde 204 sin anotar. Un `Origin: null` se acepta porque lo produce la política `no-referrer` en la propia página.
5. **Solo la planilla define el éxito.** Telegram ya no lleva nombre ni teléfono (decisión 9), así que un lead que no quedó en la planilla no se podría identificar. Si la planilla no confirma, la página recibe 500 y ofrece WhatsApp, y Telegram manda un segundo mensaje: "La planilla no confirmó el lead anterior...". Si Apps Script tardó más de 7 s pero igual escribió, la fila existe y un reintento no la duplica (decisión 10).
6. **`LEADS_MODO_PRUEBA` se ignora en Vercel** (`VERCEL_ENV` production o preview). Si quedara puesto por error, los leads se escribirían en `/tmp` de una instancia y se perderían.
7. **Planilla a prueba de fórmulas.** Apps Script guarda todo texto con un apóstrofo inicial: `=`, `+`, `-` y `@` no se ejecutan, `+569...` conserva el `+` y `10-12` no se convierte en fecha. Escribe por nombre de encabezado, así que Cristian puede agregar o mover columnas. Un lead con `ref` también queda en "Referidos", con el nombre del referidor buscado por el slug, en el mismo envío. El tipo `referido` sirve para dar de alta un enlace directo.
8. **Temporizador propio.** `AbortSignal.timeout` no mantiene vivo el proceso de Node; la prueba de "ambos colgados" lo detectó. Se usa un `AbortController` con `setTimeout` que se limpia al terminar.
9. **Telegram sin datos personales; el detalle, por correo.** Telegram no ofrece un acuerdo de tratamiento de datos. El aviso dice plazo, presupuesto, plan, origen y variante, nada más. El detalle (nombre, WhatsApp, qué vende, ref) llega por correo desde la propia planilla (`MailApp`, a la propiedad `EMAIL_AVISO`), en texto plano y con el enlace `wa.me`. Google ya trata esos datos por la planilla, así que no se suma un proveedor.
10. **Duplicados.** El mismo WhatsApp dentro de 10 minutos se toma como el mismo lead: ni fila ni correo nuevos. Cubre reintentos de la persona y el caso de Apps Script lento.
11. **Descartados con rastro.** Un envío con el campo trampa o llenado en menos de 3 s recibe 200 igual, pero queda en la pestaña "Descartados" con lo mínimo para reconocer y recuperar a mano a una persona real descartada por error. Sin correo ni Telegram.
12. **Retención de 24 meses.** `limpiarAntiguos()` corre el día 1 de cada mes (lo instala `instalarLimpiezaMensual()`), borra filas de más de 24 meses en Leads, Clics WhatsApp y Descartados, respeta a los clientes (etapa "ganado") y cuenta desde `fecha_recontacto` si es más reciente. Los correos de aviso se borran a mano con una búsqueda de Gmail (guía, paso 10).
13. **Fórmulas también fuera de Sheets.** El apóstrofo se pierde al descargar como CSV o Excel, así que a un texto que empieza con `=`, `+`, `-` o `@` se le antepone además un espacio. No lo necesitan el teléfono validado ni un identificador de solo letras, números, `_` y `-`: un `gclid` puede empezar con `-` y debe salir intacto para importar conversiones.

## 4. Cómo se prueba

```bash
node scripts/probar-api.mjs            # API: 64 pruebas, sin red
node scripts/probar-apps-script.mjs    # Apps Script simulado: 17 pruebas
python3 scripts/generar_enlaces_referidos.py "María José Pérez" --salida /tmp/referidos.csv
```

Con un servidor local (`vercel dev` y `LEADS_MODO_PRUEBA=1`), cada envío queda como una línea JSON en `os.tmpdir()/leads-prueba.jsonl`, sin el secreto.

En la cuenta real: `probarAnotacion()` en el editor de Apps Script y el formulario en la vista previa con `?gclid=prueba&utm_source=google&utm_term=prueba` (guía, paso 9).

## 5. Resultados

**`scripts/probar-api.mjs`: 64 de 64 pasan.**

| Grupo | Qué comprueba |
| --- | --- |
| Normalización | 9 formatos de WhatsApp dan `+56912345678`; 10 números no móviles se rechazan; limpieza de caracteres de control y de dirección |
| Validación | Cada campo inválido da 400 con ese campo (15 casos, incluido `consentimiento: "true"`); cuerpo vacío lista los 7 obligatorios en orden |
| Bots | Trampa con contenido y llenado en menos de 3 s dan 200 y solo se anotan en "Descartados" (si esa anotación falla, igual 200); `t0` como texto cuenta; `t0` futuro o ausente se envía |
| HTTP | 405 con `Allow` y sin CORS; 413 por Content-Length, por stream y por cuerpo ya leído; 10 KB exactos pasan; 400 con text/plain, JSON malo o arreglo; ayudantes de Vercel |
| Límite | El 6.º lead da 429 y otra IP sigue; validación y trampas no gastan cupo; IPv6 del mismo /64 comparte cupo |
| Envíos reales con fetch simulado | Ambos bien: 200, secreto, tipo, gclid y UTM a la planilla; planilla caída, 403 lógico o HTML: 500 y aviso por Telegram; Telegram caído: 200; ambos caídos: 500; ambos colgados: corte a los 7 s y 500; planilla colgada con Telegram arriba: 500 con aviso, bajo 10 s; sin variables: 500; URL sin https: no se envía el secreto y 500; variables con espacios se recortan |
| Telegram | Sin nombre, teléfono, qué vende ni ref; `utm_term` con etiquetas llega escapado; las únicas etiquetas son las `<b>` del mensaje |
| wa-click | text/plain, JSON y ayudantes de Vercel dan 204; planilla caída: 204; inválidos: 400, 405 y 413; otro sitio: 204 sin anotar; límite de clics |
| Registros | No contienen secreto, token, nombre ni teléfono |

**`scripts/probar-apps-script.mjs`: 17 de 17 pasan.** Secreto ausente o incorrecto da 403 lógico sin escribir; la pestaña Leads se amplía a 27 columnas; `=HYPERLINK(...)`, `-1+1` y `@x` quedan como texto con un espacio delante y un `gclid` que empieza con `-` sale intacto; `+569...` conserva el `+`; Descartados recibe sus columnas sin correo; el mismo WhatsApp en 10 minutos no duplica fila ni correo; el correo va a `EMAIL_AVISO` en texto plano con el enlace `wa.me`, y si falla la fila queda; `limpiarAntiguos` borra lo de más de 24 meses salvo clientes y recontactos recientes; `instalarLimpiezaMensual` deja un solo disparador; `configurar` se puede repetir; las fórmulas del Resumen apuntan a las columnas correctas y parten un lunes; Referidos encuentra al referidor; las filas siguen cuadrando si Cristian agrega una columna; se agregan filas cuando se acaban.

**Referidos:** probado con tildes, ñ, nombres repetidos (`jose-perez-2`), slugs ya existentes, nombres largos (corte en 40 caracteres) y entradas sin letras (se omiten con aviso).

## 6. Controles de `08-GOAL-AUDITORIA.md`

| Control | Estado |
| --- | --- |
| G1 Solo 3 conversiones | C: guía `docs/medicion.md`, pasos 5 y 8 |
| G2 `generate_lead` una vez | Landing: empujarlo solo con 200 y antes de redirigir. GTM: un solo activador. Se prueba recargando la página de gracias (guía, paso 9) |
| G3 `whatsapp_click` aunque se abra la app | API lista (beacon, 204 siempre). GTM: "Esperar etiquetas" 300 ms. C: prueba en Android e iPhone |
| G4 `gclid` y UTM en la planilla | Pasa en pruebas: llegan a la planilla. C: formulario con `?gclid=prueba` |
| G5 Ningún lead se pierde en silencio | Pasa en pruebas: si la planilla no confirma, la persona ve el botón de WhatsApp y Telegram avisa; si falla Telegram, el lead está en la planilla y el correo |
| G6 Clarity con enmascarado, tarde y declarado | Guía, paso 7. Falta la declaración en la política de privacidad (fase 0.5, revisión legal) |
| G7 Conversiones "Registrando" | C, después del lanzamiento: antes solo se puede ver "Sin conversiones recientes", que confirma la etiqueta. "Registrando" aparece con la primera conversión desde un anuncio real |
| G8 Etapa y `utm_term` por lead | Columnas listas en la planilla; se usa desde el 17 nov |
| J2 Consentimiento | El servidor no guarda nada sin `consentimiento === true`. La casilla sin marcar y el aviso son de la landing; la política, de la fase 0 |

## 7. Qué falta (Cristian)

1. **IDs** de Tag Manager (`GTM-…`), GA4 (`G-…`) y Clarity. Sin ellos no se instala el fragmento de GTM ni se configuran las etiquetas.
2. **Planilla, Apps Script y bot de Telegram** según `docs/apps-script-guia.md`.
3. **Variables en Vercel** (Production y Preview): `APPS_SCRIPT_URL`, `APPS_SCRIPT_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`. Después, Redeploy.
4. **Conversiones de Google Ads y etiquetas en GTM** según `docs/medicion.md` (06 lo agenda para el jueves 12 nov).
5. **Puerta 2:** un formulario de prueba llega a la planilla, al correo y a Telegram, cada botón registra su evento y lo validas con Tag Assistant y en celulares reales.
6. **Resuelto en la rama `feat/tiendas-online`:** Vercel publicaba todo el repositorio (hoy `espiritudigital.cl/DESIGN.md` responde 200). `.vercelignore` excluye `docs/`, `scripts/`, `data/` y los `.md`, y `vercel.json` redirige esas rutas a la portada por si algo quedara publicado. Se verifica en la vista previa (ver `11-ESTADO-EJECUCION.md` del plan).

## 8. Coordinación con la rama de la landing

- `fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) })`. Sin ese encabezado, la respuesta es 400.
- `consentimiento` debe ser el booleano `true`; `t0` en milisegundos (número o texto numérico); `hp` siempre presente y vacío, con `autocomplete="off"` y `tabindex="-1"` para que el navegador no lo autocomplete.
- Mapear `campos` a los errores visibles. Con 429, 500 o error de red: mensaje de error y botón de WhatsApp.
- `maxlength` en el navegador igual al servidor: `nombre` 80 y `que_vende` 200.
- No empujar `generate_lead` si la trampa o el tiempo mínimo del propio navegador detectaron un bot (el servidor responde 200 igual, para no enseñarle nada). Redirigir en el `eventCallback` del `dataLayer.push`, con `eventTimeout` de unos 2000 ms.
- Clics: `navigator.sendBeacon('/api/wa-click', JSON.stringify(datos))`, sin esperar. Los botones deben ser enlaces `<a href="https://wa.me/...">` para que el activador de clic de enlace de GTM funcione.
- Opcional: `data-clarity-mask="true"` en el formulario, como refuerzo del enmascarado.

## 9. Riesgos que quedan

- **El límite por IP vive en cada instancia** de Vercel: frena ráfagas, no un ataque distribuido. Para este volumen basta.
- **Reloj adelantado justo en la medida del tiempo de llenado:** si el reloj de alguien está adelantado casi exactamente lo que tardó en llenar el formulario, el servidor lo ve como "menos de 3 s" y lo descarta. Es muy improbable y queda en el registro como `descartado: rapido`.
- **Apps Script lento:** si tarda más de 7 s, la API lo cuenta como falla aunque después escriba: la persona ve el error con WhatsApp y Telegram pide revisar. Si reintenta antes de 10 minutos, no se duplica la fila.
- **Telegram caído con planilla arriba:** el lead queda en la planilla y en el correo; solo falta el aviso instantáneo. El registro de Vercel lo marca como error.
- **Cuota de correo:** Gmail personal permite unos 100 correos al día desde scripts. Con 1 a 5 leads al mes no se acerca.
- **Consentimiento para analítica:** no hay aviso de cookies ni modo de consentimiento. Depende de la revisión legal de la Ley 21.719.
