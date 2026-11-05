# Guía de medición: Tag Manager, GA4, Google Ads y Clarity

Al terminar tendrás:

- **GA4** con 6 eventos propios y sus parámetros.
- **Google Ads** con solo 3 conversiones: Lead formulario y Clic WhatsApp como principales, Clic teléfono como secundaria.
- **Microsoft Clarity** grabando la landing, `/casos` y `/planes`, con los campos enmascarados.

Tiempo: unos 45 minutos, más las pruebas en celular.

**Antes de empezar** ten a mano el ID del contenedor de Tag Manager (`GTM-…`), el ID de medición de GA4 (`G-…`) y el ID del proyecto de Clarity. Los IDs y etiquetas de conversión de Google Ads salen en el paso 5. Nunca uses un ID inventado: si falta uno, ese paso espera.

> El fragmento de Tag Manager lo instala la rama de la landing en cada página cuando entregues el `GTM-…`. Esta guía es lo que configuras tú dentro de Tag Manager, GA4, Google Ads y Clarity.

## 0. Qué envía la landing

La landing empuja estos eventos a `dataLayer`, sin datos personales (ni nombre, ni teléfono, ni texto del formulario):

| Evento | Parámetros | Cuándo |
| --- | --- | --- |
| `view_variant` | `h` (tienda, carrito, precio, web o alternativa) | Al cargar la landing |
| `scroll_50` | — | Al pasar la mitad de la página |
| `case_click` | `caso` | Al abrir una tienda o web de ejemplo |
| `whatsapp_click` | `cta_location`, `plan` | Al tocar un botón de WhatsApp |
| `generate_lead` | `plan_interes`, `presupuesto`, `plazo` | Una sola vez, cuando `/api/lead` responde 200 y antes de ir a la página de gracias |
| `tel_click` | — | Al tocar un enlace `tel:` |

Además, cada clic de WhatsApp manda un aviso a `/api/wa-click` (con `sendBeacon`) que queda en la pestaña "Clics WhatsApp" de la planilla. El enlace no espera ese aviso.

## 1. GA4

En [analytics.google.com](https://analytics.google.com), en la propiedad de espiritudigital.cl:

1. **Administrar → Flujos de datos → Web**: copia el **ID de medición** (`G-…`).
2. En ese mismo flujo, **Medición mejorada → engranaje**: desactiva **Interacciones con formularios** (el formulario ya se mide con `generate_lead`). Deja el resto como está.
3. **Administrar → Definiciones personalizadas → Crear dimensión personalizada**, con alcance **Evento**, una por parámetro: `h`, `caso`, `cta_location`, `plan`, `plan_interes`, `presupuesto` y `plazo`. Nombre y parámetro iguales. Sin esto, los parámetros no aparecen en los informes.
4. **Administrar → Configuración de datos → Retención de datos**: 14 meses.
5. **Administrar → Eventos clave**: marca `generate_lead` y `whatsapp_click`. Sirve para los informes de GA4; en Google Ads **no** se importan como principales (paso 8).
6. **Administrar → Vínculos de productos → Google Ads**: vincula la cuenta.

## 2. Tag Manager: variables

1. **Variables → Variables integradas → Configurar**: activa **Click URL**, **Click Element**, **Page Path** y **Page URL**.
2. **Variables definidas por el usuario → Nueva**:
   - Tipo **Constante**, nombre `ID GA4`, valor: tu `G-…`.
   - Tipo **Variable de capa de datos**, versión 2, una por parámetro. Nombre en Tag Manager → nombre en la capa de datos:

| Nombre | Nombre de la variable de capa de datos |
| --- | --- |
| `DLV - h` | `h` |
| `DLV - caso` | `caso` |
| `DLV - cta_location` | `cta_location` |
| `DLV - plan` | `plan` |
| `DLV - plan_interes` | `plan_interes` |
| `DLV - presupuesto` | `presupuesto` |
| `DLV - plazo` | `plazo` |

## 3. Tag Manager: activadores

**Activadores → Nuevo**:

| Nombre | Tipo | Configuración |
| --- | --- | --- |
| `Ventana cargada` | Ventana cargada | Todas las ventanas cargadas |
| `Ventana cargada - landing` | Ventana cargada | Algunas: **Page Path** coincide con la expresión regular `^/tiendas-online(/casos\|/planes)?/?$` |
| `CE - view_variant` | Evento personalizado | Nombre del evento: `view_variant` |
| `CE - scroll_50` | Evento personalizado | `scroll_50` |
| `CE - case_click` | Evento personalizado | `case_click` |
| `CE - whatsapp_click` | Evento personalizado | `whatsapp_click` |
| `CE - generate_lead` | Evento personalizado | `generate_lead` |
| `CE - tel_click` | Evento personalizado | `tel_click` |
| `Grupo - view_variant tras carga` | Grupo de activadores | `CE - view_variant` + `Ventana cargada`. Se activa una vez, cuando ocurrieron los dos |
| `Clic WhatsApp (enlace)` | Clic - Solo enlaces | Ver abajo |
| `Clic teléfono (enlace)` | Clic - Solo enlaces | Ver abajo |

En la expresión regular de `Ventana cargada - landing` escribe la barra vertical sin la barra invertida: `^/tiendas-online(/casos|/planes)?/?$`.

**`Clic WhatsApp (enlace)`**

- Marca **Esperar etiquetas** con **tiempo de espera máximo: 300** ms. Le da tiempo a la conversión de salir antes de que el celular abra WhatsApp.
- **Comprobar validación**: desmarcado.
- **Habilitar este activador cuando**: Page URL coincide con la expresión regular `.*`
- **Este activador se activa en**: Algunos clics en enlaces → **Click URL** coincide con la expresión regular `^https://(wa\.me|api\.whatsapp\.com)/`

**`Clic teléfono (enlace)`**: igual, pero **Click URL** empieza por `tel:`.

## 4. Tag Manager: etiquetas de GA4

**Etiquetas → Nueva**. Todos los eventos usan el tipo **Google Analytics: evento de GA4**, con ID de medición `{{ID GA4}}`.

| Etiqueta | Tipo | Nombre del evento | Parámetros (nombre → valor) | Activador |
| --- | --- | --- | --- | --- |
| `GA4 - Etiqueta de Google` | Etiqueta de Google, ID `{{ID GA4}}` | — | — | `Ventana cargada` |
| `GA4 - view_variant` | Evento de GA4 | `view_variant` | `h` → `{{DLV - h}}` | `Grupo - view_variant tras carga` |
| `GA4 - scroll_50` | Evento de GA4 | `scroll_50` | — | `CE - scroll_50` |
| `GA4 - case_click` | Evento de GA4 | `case_click` | `caso` → `{{DLV - caso}}` | `CE - case_click` |
| `GA4 - whatsapp_click` | Evento de GA4 | `whatsapp_click` | `cta_location` → `{{DLV - cta_location}}`, `plan` → `{{DLV - plan}}` | `CE - whatsapp_click` |
| `GA4 - generate_lead` | Evento de GA4 | `generate_lead` | `plan_interes`, `presupuesto` y `plazo` → sus variables `DLV` | `CE - generate_lead` |
| `GA4 - tel_click` | Evento de GA4 | `tel_click` | — | `CE - tel_click` |

La etiqueta de Google y `view_variant` esperan a la **Ventana cargada** para no restarle velocidad a la página. Los demás eventos ocurren cuando la persona hace algo, así que no afectan la carga.

## 5. Google Ads: las 3 conversiones

En Google Ads: **Objetivos → Conversiones → Resumen → Crear acción de conversión → Sitio web**. Escribe `espiritudigital.cl`, presiona **Analizar** y elige **Agregar una acción de conversión manualmente** (no la creación automática desde la URL). Los nombres de los botones pueden variar un poco; busca el equivalente.

| Nombre | Categoría | Valor | Recuento | Ventana de clics | Uso |
| --- | --- | --- | --- | --- | --- |
| Lead formulario | Enviar formulario de clientes potenciales | $35.000, el mismo en cada conversión | Una | 30 días | Principal |
| Clic WhatsApp | Contacto | $10.000, el mismo en cada conversión | Una | 30 días | Principal |
| Clic teléfono | Contacto (o "Llamada telefónica", si aparece) | Sin valor | Una | 30 días | Secundaria |

- Moneda: CLP. Modelo de atribución: el que venga por defecto (basado en datos).
- **Recuento "Una"**: si alguien toca WhatsApp tres veces después de un clic en el anuncio, cuenta una.
- Para marcar la secundaria: en la acción, **Configuración → Optimización de la acción → Acción secundaria**.
- Al guardar cada una, elige **Usar Google Tag Manager** y anota el **ID de conversión** (el mismo para las 3) y la **Etiqueta de conversión** (distinta en cada una).

## 6. Tag Manager: etiquetas de Google Ads

| Etiqueta | Tipo | Configuración | Activador |
| --- | --- | --- | --- |
| `Ads - Vinculador de conversiones` | Vinculador de conversiones | Por defecto | `All Pages` (todas las páginas) |
| `Ads - Lead formulario` | Seguimiento de conversiones de Google Ads | ID y etiqueta de "Lead formulario" | `CE - generate_lead` |
| `Ads - Clic WhatsApp` | Seguimiento de conversiones de Google Ads | ID y etiqueta de "Clic WhatsApp" | `Clic WhatsApp (enlace)` |
| `Ads - Clic teléfono` | Seguimiento de conversiones de Google Ads | ID y etiqueta de "Clic teléfono" | `Clic teléfono (enlace)` |

Deja vacíos **Valor de conversión** y **Código de moneda** en las etiquetas: así Google Ads usa los $35.000 y $10.000 de cada acción, y si un día cambias un valor, lo cambias en un solo lugar.

El vinculador va en todas las páginas porque guarda el `gclid` del anuncio para atribuir la conversión, aunque ocurra más tarde en `/casos`, `/planes` o la página de gracias.

## 7. Microsoft Clarity

1. En [clarity.microsoft.com](https://clarity.microsoft.com), en tu proyecto: **Settings → Setup → Install manually** y copia el ID del proyecto (está en el código que muestra).
2. En Tag Manager, etiqueta `Clarity`, tipo **HTML personalizado**, con este código (reemplaza `ID_DE_CLARITY`):

```html
<script>
  (function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
  })(window, document, 'clarity', 'script', 'ID_DE_CLARITY');
</script>
```

   Activador: **`Ventana cargada - landing`**. Así graba solo la landing, `/casos` y `/planes`, y carga después de la página. También sirve la plantilla oficial "Microsoft Clarity" de la galería de plantillas de Tag Manager, con el mismo activador.
3. En Clarity, **Settings → Masking**: elige **Balanced** (equilibrado) o **Strict** (estricto). Después de las primeras visitas, abre una grabación y confirma que el nombre y el WhatsApp del formulario se ven tapados.
4. Clarity tiene que aparecer en la política de privacidad (grabaciones de sesión, Microsoft como encargado y transferencia internacional). Eso está en la revisión legal pendiente de la fase 0.

## 8. Limpieza en Google Ads: que queden solo 3

En **Objetivos → Conversiones → Resumen**:

1. Revisa la lista completa. Google crea acciones solo, por ejemplo "Envío de formulario", "Clics en enlaces salientes" o "Vista de página": **elimínalas** o pásalas a **Acción secundaria**.
2. Si aparecen conversiones importadas de GA4 (como `generate_lead` o `whatsapp_click` de GA4), quedan como secundarias o se eliminan. Nunca principales: duplicarían cada conversión.
3. Las únicas principales son **Lead formulario** y **Clic WhatsApp**.
4. **Conversiones mejoradas**: desactivadas. **Etiquetado automático** (Administrador → Configuración de la cuenta): activado.

## 9. Publicar y probar

**En el computador, con Vista previa:**

1. En Tag Manager: **Vista previa**. Escribe la URL de la landing (vista previa de Vercel o producción) con parámetros, por ejemplo `…/tiendas-online?h=precio&gclid=prueba&utm_source=google&utm_term=prueba`. Se abre Tag Assistant conectado.
2. Revisa cada acción:

| Acción | Debe activarse |
| --- | --- |
| Cargar la página | `GA4 - Etiqueta de Google`, `Ads - Vinculador de conversiones`, `GA4 - view_variant` con `h = precio`, `Clarity` |
| Bajar a la mitad | `GA4 - scroll_50` |
| Abrir una tienda de ejemplo | `GA4 - case_click` con `caso` |
| Tocar un botón de WhatsApp | `GA4 - whatsapp_click` con `cta_location` y `plan`, y `Ads - Clic WhatsApp` |
| Enviar el formulario de prueba | `GA4 - generate_lead` y `Ads - Lead formulario`, una vez. Llega la fila a la planilla y el aviso a Telegram |
| Recargar la página de gracias | Nada nuevo: `generate_lead` no se repite |
| Tocar el teléfono (si la página tiene enlace `tel:`) | `GA4 - tel_click` y `Ads - Clic teléfono` |
| Abrir `/tiendas-online/gracias` | `Clarity` **no** se activa |

3. Si todo está bien: **Enviar → Publicar**, con una descripción como "Medición landing tiendas v1".

**En un Android y un iPhone reales** (sin vista previa, con el contenedor ya publicado):

1. Abre la landing con `?gclid=prueba&utm_source=google` en el navegador normal de cada teléfono.
2. En el computador, abre GA4 → **Informes → Tiempo real**. Toca un botón de WhatsApp en el teléfono: en menos de un minuto debe aparecer `whatsapp_click`. Envía un formulario de prueba: debe aparecer `generate_lead`.
3. **iPhone:** al tocar WhatsApp debe abrirse la app directo. Si en cambio se abre una página web de WhatsApp con un botón "Abrir", prueba con los enlaces de la landing en pestaña nueva (`target="_blank"`) o quita "Esperar etiquetas" del activador: el clic igual queda medido en GA4 y en la planilla.
4. En la planilla deben aparecer las filas de "Clics WhatsApp" y "Leads"; en Telegram, el aviso. Borra las filas de prueba.
5. En Google Ads, unas horas después, las 3 acciones deberían salir como **"Sin conversiones recientes"**: significa que la etiqueta ya se vio. **"Registrando conversiones"** aparece recién con la primera conversión que viene de un clic real en un anuncio, o sea, después del lanzamiento.

## 10. Si algo no cuadra

| Síntoma | Causa probable |
| --- | --- |
| `Ads - Clic WhatsApp` no se activa en Vista previa | Falta activar la variable **Click URL**, o el botón no es un enlace `<a href="https://wa.me/...">` |
| Los parámetros salen "(not set)" en GA4 | Falta la dimensión personalizada (paso 1.3) o el nombre no coincide exactamente |
| `generate_lead` aparece 2 veces | Hay dos activadores para el mismo evento, o la landing lo empujó dos veces |
| La conversión de lead no sale antes de pasar a la página de gracias | La landing debe redirigir en el `eventCallback` del `dataLayer.push` de `generate_lead` (con `eventTimeout` de unos 2000 ms) |
| Clarity graba la página de gracias | El activador de Clarity no es `Ventana cargada - landing` |

**Consentimiento:** hoy no hay aviso de cookies ni modo de consentimiento. Si la revisión legal de la Ley 21.719 concluye que la analítica o Clarity necesitan consentimiento previo, hay que agregar ambos antes de lanzar.
