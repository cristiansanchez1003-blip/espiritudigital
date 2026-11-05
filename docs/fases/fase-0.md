# Fase 0 · Reconocimiento y orden del sitio principal

- **Fecha:** 5 de noviembre de 2026
- **Rama:** `wip/sitio-principal` (sin push, sin despliegue, `main` intacto)
- **Estado:** esperando el OK de Cristian (puerta 0). Nada de esto está en producción.

Este repositorio es público: este documento describe solo el sitio y su código. No incluye estrategia comercial ni datos internos.

## 1. Cómo está armado el sitio

### Archivos y rutas

| Archivo | Qué es | Ruta pública |
| --- | --- | --- |
| `index.html` | Portada. Tailwind por CDN, Font Awesome, Google Fonts, estilos y scripts en línea | `/` |
| `alma/index.html` + `alma/support.js` | Alma, asistente de voz. `support.js` es un runtime propio que carga React y Babel desde unpkg y el cliente de ElevenLabs desde esm.sh | `/alma` |
| `politica-privacidad.html` | Política de privacidad | `/politica-privacidad` |
| `terminos.html` | Términos legales | `/terminos` |
| `demo.html` | Redirección antigua (Robot.ia) hacia Alma, con meta refresh y JavaScript | `/demo` |
| `code.html` | Exportación de un diseño anterior. No la enlaza ninguna página | `/code` |
| `cuanto-cuesta-una-tienda-online.html` | Artículo de precios (nuevo, Fase 6) | `/cuanto-cuesta-una-tienda-online` |
| `robots.txt`, `sitemap.xml` | Rastreo | — |

- HTML estático en Vercel. Sin framework, sin `package.json` y sin paso de build.
- Hasta hoy no existía `vercel.json`: Vercel servía cada archivo tal cual (`/politica-privacidad.html`, `/alma/`).
- No hay carpeta `api/`. Un proyecto sin framework en Vercel publica como funciones los archivos de `api/` sin configuración extra; se confirma con la primera vista previa que los incluya (la construye otra rama).
- El historial del repositorio tiene un solo commit anterior a esta rama (`2718400`).

### Medición

No hay Google Tag Manager, GA4, Google Ads, píxel de Meta ni Microsoft Clarity en ninguna página (búsqueda de `googletagmanager`, `gtag(`, `GTM-`, `fbq(`, `clarity.ms` y `dataLayer`: cero resultados).

### Formularios y su destino

- **Portada:** no tiene formulario ni botón de WhatsApp. El único contacto visible es un correo en texto plano.
- **Alma:** formulario de nombre, WhatsApp y mensaje, que se envía a una función de Supabase (`guardar-lead-web`). No tiene casilla de consentimiento ni enlace a la política: el pie dice "Política de privacidad" como texto, sin enlace.
- **Alma, voz:** la conversación se procesa en ElevenLabs.
- **Landing `/tiendas-online`:** su formulario irá a `api/lead.js` (Apps Script y Telegram). Lo construye otra rama.

### Enlaces vacíos o rotos

- `code.html`: 5 enlaces vacíos (`href="#"` en Proyectos, Blog, Privacidad, Términos y Contacto), 4 botones sin acción, fotos de Unsplash, un logo alojado en `lh3.googleusercontent.com` y "© 2024". Es pública e indexable en `/code`.
- La tarjeta de Sabores del Sur enlazaba a `espiritu-digital-demo.onrender.com`, que no respondió el 5 nov. La tarjeta salió del sitio.
- AO Construcciones, Vitrales y Mister Gas se enlazan con `www.` y responden con una redirección 307 a la versión sin `www.`. Funcionan; conviene enlazar directo.
- **Alma sin barra final, hoy en producción:** `https://espiritudigital.cl/alma` responde 200, pero sus rutas relativas apuntan a la raíz y `/support.js` da 404, así que la página no arranca. Quedó corregido en esta rama (sección 2).
- **Correo publicado:** la portada, los términos y la política anterior muestran `hello@espiritudigital.cl`, pero `espiritudigital.cl` no tiene registros MX (DNS público, 5 nov): ese correo no puede recibir mensajes. Ver pendientes.

### Imágenes de banco y maquetas

| Archivo | Qué muestra | ¿Se usa? |
| --- | --- | --- |
| `mockup-ecommerce.webp` (original: `mockup 2.jpeg`) | Celular con la landing de una barbería o asesoría de imagen; no es una tienda | No |
| `mockup-reservas.webp` (original: `mockup barber 1.jpeg`) | Notebook con el sitio de demostración de una barbería; se ve la barra de marcadores de un navegador personal | No |
| `screen.png` | Captura de `code.html` | No |
| `cerebro en neon.jpg`, `robot.ia.jpeg`, `robot.ia.webp` | Ilustraciones | No |

- Ninguna se usa hoy en una página, así que no había reemplazo que aplicar en una sección visible. Igual quedan publicadas: cualquiera puede abrir `/mockup-reservas.webp`.
- **Propuesta:** borrarlas del repositorio o sacarlas del despliegue (requiere OK; ver pendientes). Para mostrar trabajo propio hay capturas reales del 5 nov de Imprenta Express, Vitrales, Mielu, AO Construcciones, Mister Gas y Vet Integrativa.
- `code.html` usa fotos de Unsplash como fondo decorativo; no presentan trabajo propio.

### Otros hallazgos

- `DESIGN.md` y `seo-auditoria-espiritu-digital.md` se publican en el dominio (`/DESIGN.md` responde 200). Lo mismo pasará con `docs/` y `scripts/`.
- A 360 px la portada mide 400 px de ancho por un halo decorativo de 400 px en `#servicios`, sección sin `overflow-hidden`. `body` lo oculta, pero en iPhone puede permitir arrastrar la página hacia el lado. Ya estaba antes; no lo toqué.
- Alma registra 4 errores de consola de SVG (`"{{ f.icon }}"`) antes de que su runtime pinte la plantilla. Ya estaban antes de este cambio.
- La portada, la política y los términos cargan Tailwind desde `cdn.tailwindcss.com`, que el propio Tailwind no recomienda para producción. La landing nueva no debería usarlo.

## 2. Qué cambié

| Commit | Cambio |
| --- | --- |
| `4466a03` | `.gitignore` ignora `docs/plan/`: los documentos internos del plan nunca van a un repositorio público. |
| `72b475a` | `vercel.json` nuevo; enlaces internos, canónicas y `og:url` sin `.html`; Alma con rutas absolutas (`/alma/support.js`, `/alma/uploads/...`) y canónica `/alma`; `demo.html` apunta a `/alma`. |
| `c7f57c3` | Servidor sin dependencias que emula `vercel.json`; hoy se llama `scripts/servidor-vercel.mjs` para no chocar con el `scripts/servidor-local.mjs` de la rama de la landing. |
| `a40ae2d` | Carrusel de casos: salen Vigila y Sabores del Sur (solo del HTML; videos y portadas siguen en el repo). Entra Imprenta Express con una captura real (`caso-imprentaexpress-poster.webp`, 540 × 1169) y enlace en pestaña nueva con `rel="noopener"`. Las reglas `.case-sabores` y `.case-vigila` se reemplazaron por el orden de las 4 tarjetas, y en pantallas de 1280 px o más van en una fila de 4 para no dejar una tarjeta sola. |
| `5b699a4` | La tarjeta "E-commerce y automatización" enlaza "Ver planes de tienda online" a `/tiendas-online`. |
| `624b22a` | Política de privacidad reescrita según el deber de información del art. 14 ter de la Ley 19.628, reformada por la Ley 21.719. |
| `671767c` | `sitemap.xml`: URLs nuevas, formas finales sin `.html` ni barra, `lastmod` al 5 nov. Sin la página de gracias. |
| `1c5bab0` | Artículo de precios (Fase 6) con su imagen (`cuanto-cuesta-imprentaexpress.webp`, captura real). |
| `93538d7` | `scripts/probar-sitio.mjs`: pruebas con Playwright. |
| `74fdc68` | Ajustes del artículo; las pruebas fallan si una página publicable contiene `TODO-CRISTIAN`. |
| `73240c6`, `0e569ee`, `83ddca5` | Pruebas de términos, demo y code; precisión sobre el pago en 2 partes en el artículo; el servidor pasa a llamarse `servidor-vercel.mjs`. |

### Efecto de `vercel.json`

```json
{ "cleanUrls": true, "trailingSlash": false,
  "redirects": [{ "source": "/privacidad", "destination": "/politica-privacidad", "permanent": true }] }
```

| Se pide | Antes | Ahora |
| --- | --- | --- |
| `/politica-privacidad.html` | 200 | 308 → `/politica-privacidad` |
| `/politica-privacidad` | 404 | 200 |
| `/privacidad` | 404 | 308 → `/politica-privacidad` |
| `/terminos.html` | 200 | 308 → `/terminos` |
| `/index.html` | 200 | 308 → `/` |
| `/alma/` | 200 | 308 → `/alma` |
| `/alma` | 200, pero sin `support.js` | 200 y funciona |
| `/demo.html` | 200 | 308 → `/demo`, que lleva a `/alma` |
| `/code.html` | 200 | 308 → `/code` |
| `/tiendas-online?h=precio&gclid=…` | 404 | 200 sin redirección, cuando llegue `tiendas-online.html` de la rama de la landing |

- Las redirecciones son 308, según la documentación de Vercel. En el servidor local conservan los parámetros (`gclid`, `utm_*`); la documentación de Vercel no lo dice para `redirects`, así que se confirma en la vista previa (prueba 1.10 del plan). Las URLs de los anuncios no pasan por ninguna redirección.
- **Riesgo encontrado y corregido:** con `trailingSlash: false`, `/alma/` pasa a `/alma` y las rutas relativas de Alma se resolvían contra la raíz. Por eso ahora son absolutas.
- **Compatibilidad con la rama de la landing:** esa rama arma `tiendas-online.html` y `tiendas-online/casos.html`, `planes.html` y `gracias.html`. Con `cleanUrls` se sirven en `/tiendas-online`, `/tiendas-online/casos`, etc., sin barra. Revisé sus páginas (solo lectura): usan rutas absolutas y enlazan a `/politica-privacidad` y `/terminos`, así que calzan con este `vercel.json`. Esa rama no trae `vercel.json` propio: depende de este.
- Las URLs de los anuncios deben ir sin barra final: `/tiendas-online/` redirige y suma un salto.
- No hay `404.html`: Vercel muestra su página de error por defecto.

### Política de privacidad

Cubre lo que pide el art. 14 ter: versión y fecha; responsable con RUT, representante legal, domicilio, correo y WhatsApp; datos de cada formulario, de WhatsApp, de Alma y de navegación, y su fuente; finalidades; base legal; encargados (Vercel; Google por Analytics, Tag Manager, Sheets, Ads, Gmail y Fonts; Microsoft por Clarity con grabaciones y campos enmascarados; Telegram; Supabase y ElevenLabs por Alma); transferencias internacionales; plazos (24 meses para consultas, 90 días para la voz de Alma, 14 meses en GA4 y los de Clarity); derechos de acceso, rectificación, supresión, oposición, portabilidad y bloqueo, cómo pedirlos y plazo de 30 días corridos; reclamo ante la Agencia; retiro del consentimiento; decisiones automatizadas; cookies y seguridad. No tiene marcadores `TODO`; lo que falta revisar está abajo.

### Artículo de precios

`/cuanto-cuesta-una-tienda-online`: 1.329 palabras, español de Chile y tuteo. Precios con "+ IVA" y total con IVA según 03; costos que quedan (dominio, pasarela y mantención opcional, como la FAQ 3); propiedad (FAQ 4); comparación con Shopify (FAQ 7); página web (FAQ 13); cuándo conviene una plataforma; botones a `/tiendas-online` y a WhatsApp; JSON-LD `Article`. Sin plazos, para no tocar D17.

Fuentes, todas revisadas el 5 nov 2026:

| Dato | Fuente |
| --- | --- |
| Shopify Basic US$25 al mes (US$19 pagando el año), Grow US$65 (49), Advanced US$399 (299); comisión con pasarela externa de 2%, 1% y 0,6%; prueba de 3 días y US$1 al mes por 3 meses | [shopify.com/cl/precios](https://www.shopify.com/cl/precios) |
| Chile no está entre los países de Shopify Payments; sin él hay que usar un proveedor externo | [help.shopify.com](https://help.shopify.com/en/manual/payments/shopify-payments/supported-countries) |
| 47 agencias y estudios: plan de entrada de $119.990 a unos $5.331.000, mediana de $690.000 sin IVA (datos de Bigbuda al 24 sep 2026) | [bigbuda.cl](https://bigbuda.cl/blog/cuanto-cuesta-crear-un-ecommerce-en-chile) |
| Dominio .cl: $9.990 al año, exento de IVA | [nic.cl](https://www.nic.cl/dominios/tarifas.html) |
| Flow: 2,89% + IVA con abono al tercer día hábil; 3,19% + IVA al día hábil siguiente | [web.flow.cl](https://web.flow.cl/es-cl/tarifas/) |

Mercado Pago va sin cifra: su página de comisiones pide iniciar sesión y no se pudo verificar.

## 3. Cómo se prueba

```bash
node scripts/servidor-vercel.mjs     # sirve el sitio en http://127.0.0.1:4173 como lo haría Vercel
node scripts/probar-sitio.mjs        # 61 pruebas; sale con código 1 si alguna falla
```

Requiere Node 18 o más y Playwright con Chromium (`npm install playwright` y `npx playwright install chromium` en una carpeta fuera del repositorio, o global). El repositorio sigue sin `package.json`. El servidor local no emula funciones `/api` ni encabezados.

`probar-sitio.mjs` levanta el servidor local y usa Playwright con Chromium. Revisa:

- La portada carga sin errores de consola ni archivos propios rotos.
- El carrusel no tiene Vigila ni Sabores del Sur y sí Imprenta Express, con su enlace, `target="_blank"`, `rel="noopener"` y su imagen cargada.
- La portada enlaza a `/tiendas-online`.
- `/privacidad` redirige con 308 a `/politica-privacidad`, también en el navegador.
- Las URLs antiguas con `.html` y `/alma/` redirigen, y los parámetros se conservan.
- Los términos cargan sin errores en `/terminos`, `/demo.html` sigue llevando a Alma y `/code` responde.
- Alma carga completa en `/alma`.
- La política cubre los puntos obligatorios, no tiene `TODO` y no se desborda a 360 px.
- El artículo a 360 px no se desborda, tiene entre 1.000 y 1.400 palabras, su JSON-LD es válido y coincide con el H1, trae los precios con y sin IVA, el mensaje de WhatsApp exacto y el enlace a `/tiendas-online`.
- El sitemap es XML válido, trae las URLs nuevas y ninguna con `.html`, barra final o gracias.
- Ningún enlace interno ni canónica usa `.html`, y ninguna página publicable contiene `TODO-CRISTIAN`.

Resultado al cierre: **61 de 61**. Para comprobar que las pruebas detectan fallas, en una copia del sitio se rompieron a propósito Alma, el JSON-LD, el sitemap y el carrusel: fallaron las 5 pruebas afectadas.

**Prueba de integración con la rama de la landing**, sin tocar ninguna rama (`git merge-tree` y una copia exportada): la unión no tiene conflictos; pasan las 61 pruebas de esta rama y las 206 de `scripts/probar-landing.mjs`, y `/tiendas-online`, `/tiendas-online/casos`, `/tiendas-online/planes` y `/tiendas-online/gracias` responden 200 sin redirección, también con `?h=precio&gclid=prueba&utm_source=google`. La unión con la rama de la API tampoco tiene conflictos.

## 4. Puntos de la Fase 0 que siguen abiertos

- **0.2 Medición:** faltan los IDs de GA4, GTM y Clarity. Propuesta: GTM en todas las páginas (portada, Alma, política, términos, artículo y landing); Clarity con enmascarado en la landing, `/casos` y `/planes`, con el activador "Ventana cargada".
- **0.6 Estructura:** la de la sección 6 del prompt; la construyen las otras ramas.
- **0.7 Regla `TODO-CRISTIAN`:** `probar-sitio.mjs` ya falla si una página publicable la contiene. Propuesta: correrlo antes de cada despliegue y, con tu OK, como comando de build en Vercel. Hoy no cambié la configuración del proyecto.

## 5. Pendientes para Cristian

1. **Revisión legal de la política antes de publicarla.** Puntos para el abogado:
   - **Representante legal:** dice "Cristian Sánchez". Confirmar el nombre completo.
   - **Base legal de la medición:** formularios, WhatsApp y Alma van con consentimiento, como pedía el plan. Para Analytics, Ads y Clarity usé interés legítimo con derecho a oposición, porque hoy el sitio no tiene cómo pedir y registrar un consentimiento antes de cargar esas herramientas, y escribir "consentimiento" sin ese mecanismo sería falso. Si el abogado prefiere consentimiento, la Fase 2 debe sumar un aviso con "Aceptar" y "Rechazar" y cargar GTM solo después de aceptar.
   - **24 meses para consultas que no terminan en contrato:** la ley pide suprimir o anonimizar los datos obtenidos para medidas precontractuales (art. 14, letra d). Confirmar si 24 meses calza o si conviene menos.
   - **Transferencias internacionales:** redactadas en general (garantías contractuales de cada proveedor y consentimiento). Confirmar el caso de Telegram, que no ofrece un acuerdo de tratamiento de datos como los demás.
   - **Fecha:** la política no promete la fecha de vigencia de la Ley 21.719, porque hay un proyecto que podría postergarla.
   - **Supabase y ElevenLabs:** los sumé como encargados porque Alma ya los usa. Confirmar.
2. **Lo que la política da por hecho, listo antes de publicarla:** retención de GA4 en 14 meses; Clarity con enmascarado equilibrado o estricto; retención de conversaciones en ElevenLabs de 90 días o menos; borrar a los 24 meses las filas de la planilla, los avisos de Telegram y los chats de WhatsApp; verificación en dos pasos en todas las cuentas; no usar listas de remarketing (si se activan, se actualiza la política).
3. **Alma (fuera del alcance de esta rama):** su formulario necesita casilla de consentimiento sin marcar y enlace a `/politica-privacidad`. Revisar la frase "Nada se graba sin avisarte" contra la configuración real de ElevenLabs.
4. **Datos de contacto del sitio (J5).** `hello@espiritudigital.cl` no recibe correo, y el JSON-LD de la portada tiene otro teléfono (+56-9-4974-5384) y dirección "Santiago". ¿Los reemplazo por espiritudigital.chile@gmail.com, +56 9 2811 7627 y San José de Maipo en la portada, los términos y el JSON-LD? No los cambié sin tu OK, porque el repositorio contradice al plan (regla 10).
5. **Permisos de clientes.** El carrusel y el artículo muestran Imprenta Express: hace falta su permiso antes de publicar. Vitrales sigue en el carrusel, como estaba; el plan condiciona su uso en la landing al arreglo 07: decide si aplica también a la portada.
6. **Orden de despliegue.** La portada, el sitemap y el artículo enlazan a `/tiendas-online`, `/casos` y `/planes`. Publicarlos junto con la landing o después, nunca antes, o darán 404.
7. **Archivos para borrar o sacar del despliegue (requiere OK):**
   - Videos y portadas de Vigila y Sabores del Sur (788 KB).
   - Las 4 maquetas y `screen.png` (4,5 MB).
   - `code.html`, o al menos marcarla `noindex`.
   - Propuesta: un `.vercelignore` que deje fuera del despliegue `docs/`, `scripts/`, los `.md`, las maquetas y `code.html`.
8. **Ronda 5:** el artículo dice "dominio .cl a tu nombre, incluido el primer año" para la página web y no dice quién paga el primer año del dominio de la tienda, igual que la FAQ 3. Si cambias la ronda 5, se actualiza.
9. **Revisar las cifras citadas** (Shopify, Flow, NIC Chile y Bigbuda) el 22 feb, junto con los precios de Shopify de la campaña, y actualizar la fecha de revisión del artículo.
10. **Fechas de publicación:** la política y el artículo dicen 5 nov 2026. Si salen otro día, se cambian.
11. **Detalles opcionales de la portada:** enlazar AO, Vitrales y Mister Gas sin `www.`; sumar `overflow-hidden` a `#servicios` para el desborde de 360 px; no hay botón de WhatsApp en la portada.
