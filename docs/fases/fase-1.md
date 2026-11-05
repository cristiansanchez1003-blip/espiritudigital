# Fase 1 · Landing /tiendas-online

Rama `wip/landing-front`. Estado: **lista para revisión, no publicable todavía** (faltan permisos e IDs; ver "Qué falta"). Nada se subió a `main` ni se desplegó.

## Qué se hizo

| Pieza | Archivo |
| --- | --- |
| Landing de 10 bloques (02, sección 4) con los textos literales de 03 | `tiendas-online.html` (Vercel la sirve en `/tiendas-online` con `cleanUrls`) |
| Páginas de los enlaces de sitio y de gracias | `tiendas-online/casos.html`, `tiendas-online/planes.html`, `tiendas-online/gracias.html` |
| Generador sin dependencias (Node 22) | `scripts/build-landing.mjs` + `scripts/plantillas/paginas.mjs` y `estilos.css` |
| Datos | `data/config.json`, `casos.json`, `logos.json`, `resenas.json`, `testimonios.json` |
| JavaScript propio (4,2 KB comprimido) | `assets/tiendas-online/js/landing.js` |
| Poppins 400 y 600 autoalojada (woff2 + licencia OFL) | `assets/tiendas-online/fuentes/` |
| Capturas reales, portada y Open Graph | `assets/tiendas-online/img/` (las prepara `scripts/preparar-imagenes.py` desde la carpeta compartida de capturas) |
| Servidor local con `cleanUrls` y API simulada | `scripts/servidor-local.mjs` |
| Pruebas con Playwright y Lighthouse | `scripts/probar-landing.mjs` |

**Cómo funciona lo principal**

- **Variantes `?h=`.** Las 5 portadas vienen en el HTML. Un script de una línea en el `<head>` pone `data-h` en `<html>` antes del primer pintado y el CSS oculta las demás. Con `h=web` cambian el ítem de la franja, el texto del botón secundario, la línea de precio, el mensaje del botón principal, y aparece la tarjeta de página web antes de los planes (la línea web de abajo se oculta). Sin parámetro o con uno desconocido: `tienda`. Hay un solo `<h1>`, con las 5 variantes como `<span>`.
- **WhatsApp.** Cada botón trae en el HTML su mensaje de 03, sección 13 (funciona sin JavaScript). `landing.js` agrega "Vengo de Google. " si hay `gclid`, `gbraid`, `wbraid` o `utm_source=google` en la URL o en `sessionStorage`, y " Vengo de parte de X." si hay `ref`, con `encodeURIComponent`. En cada clic: evento `whatsapp_click` y `navigator.sendBeacon` a `/api/wa-click` sin detener el enlace.
- **Medición.** `view_variant`, `scroll_50`, `case_click`, `whatsapp_click`, `generate_lead` (una sola vez, al recibir 200 y antes de redirigir; la página de gracias no lo empuja) y `tel_click`, sin datos personales. La etiqueta de GTM solo se inserta si `gtm_id` tiene un valor.
- **Formulario.** Contrato exacto con `/api/lead` (claves, valores de las listas, `hp`, `t0` al mostrarse el formulario). 200 → el nombre va a `sessionStorage` y se redirige a `/tiendas-online/gracias`; 400 → mensajes junto a cada campo; 429, 500 o red caída → mensaje con botón de WhatsApp. Casilla sin marcar y enlace a `/politica-privacidad`.
- **Datos condicionales.** Logos, reseñas (3 o más; estrellas con 5 o más), testimonios y la pregunta de boleta (`boleta_activa`) solo aparecen con datos. Hoy no aparecen. La tarjeta web sale de `web_incluye`.
- **SEO.** Título, descripción, canónica sin parámetros y Open Graph de 03; JSON-LD `Organization`, `Service` con `Offer` Esencial y Pro (CLP, `valueAddedTaxIncluded: false`) y `FAQPage` igual a las preguntas visibles. `/casos` y `/planes` indexables con su canónica; gracias con `noindex`.

## Cómo se prueba

```bash
# 1. Generar la vista previa (no necesita IDs; muestra todos los casos)
node scripts/build-landing.mjs

# 2. Servidor local que emula Vercel (cleanUrls, trailingSlash false) y la API del formulario
node scripts/servidor-local.mjs --api-simulada --puerto 4317
#    abrir http://127.0.0.1:4317/tiendas-online?h=precio&gclid=prueba&ref=juan
#    con api/ ya integrada: node scripts/servidor-local.mjs --api-real

# 3. Pruebas completas (Playwright, chromium sin opciones; opcional Lighthouse)
node scripts/probar-landing.mjs
node scripts/probar-landing.mjs --lighthouse

# 4. Comprobar que la build de producción bloquea la publicación
node scripts/build-landing.mjs --produccion
```

La API simulada tiene puntos de control solo locales: `/__simulada/registro`, `/__simulada/reiniciar` y `/__simulada/siguiente?estado=400|429|500`.

## Resultados medidos (5 nov 2026)

**Pruebas automáticas:** 213 de 213 pasan (`node scripts/probar-landing.mjs --lighthouse`). Cubren, en 360 × 740 y 1440 × 900 y para las 5 variantes: H1 correcto y los demás ocultos, CLS por variante = 0,0000, los 12 enlaces de WhatsApp con su mensaje exacto (y con `gclid`, `gbraid`, `wbraid`, `utm_source=google` y `ref`, también heredados en `/casos`, `/planes` y gracias), botón flotante visible, sin desborde horizontal, eventos de `dataLayer`, beacon con el contrato exacto en cada clic, cada error del formulario, 400/429/500/red caída, envío correcto hasta gracias con el nombre, `generate_lead` una sola vez (recargar no lo repite), `?plan=pro`, URLs de anuncios y enlaces de sitio con 200 sin redirección, textos literales de 03, lista "No hacemos", contraste y build de producción.

**Lighthouse móvil 13.6** (simulación de Moto G Power con 4G lenta), servidor local con gzip:

| URL | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | CLS |
| --- | --- | --- | --- | --- | --- | --- |
| `/tiendas-online?h=tienda` | 100 | 100 | 100 | 100 | 1,35 s | 0,000 |
| `/tiendas-online?h=carrito` | 100 | 100 | 100 | 100 | 1,58 s | 0,000 |
| `/tiendas-online?h=precio` | 100 | 100 | 100 | 100 | 1,58 s | 0,000 |
| `/tiendas-online?h=web` | 100 | 100 | 100 | 100 | 1,58 s | 0,000 |
| `/tiendas-online?h=alternativa` | 100 | 100 | 100 | 100 | 1,58 s | 0,000 |
| `/tiendas-online/casos` | 99 | 100 | 100 | 100 | 1,95 s | 0,000 |
| `/tiendas-online/planes` | 100 | 100 | 100 | 100 | 0,78 s | 0,000 |

En `/casos` la primera captura está sobre el pliegue y carga diferida (`loading="lazy"`): por eso 99 y LCP de 1,95 s. Si se quiere 100, esa captura puede cargar sin diferir.

**Celular con CPU 4x más lenta y 4G simulada por CDP** (1,6 Mbps, 150 ms; 360 × 740, DPR 2):

| URL | LCP | CLS |
| --- | --- | --- |
| `?h=tienda` | 0,44 s | 0,000 |
| `?h=carrito` | 0,47 s | 0,000 |
| `?h=precio` | 0,48 s | 0,000 |
| `?h=web` | 0,45 s | 0,000 |
| `?h=alternativa` | 0,47 s | 0,000 |
| `/casos` | 0,39 s | 0,000 |
| `/planes` | 0,47 s | 0,000 |

Medido contra el servidor local: en Vercel se suma la latencia real. El margen hasta 2,5 s es amplio.

**Pesos:** JavaScript propio 4,2 KB comprimido (límite 15 KB). HTML de la landing 57 KB sin comprimir y unos 14 KB comprimido (CSS en línea). Fuentes 2 × 8 KB, las 2 precargadas. Portada 36 KB (720 px) o 72 KB (1200 px) según la pantalla.

**Contraste AA (calculado):** blanco sobre magenta #E6007E = 4,50:1 (justo en el mínimo: el botón no admite transparencias ni degradados); magenta sobre negro = 4,67:1, pero sobre tarjetas baja a 4,09:1, por eso el magenta solo va en fondos de botón, montos de 30 px (texto grande, mínimo 3:1) e íconos; texto secundario 11,9:1; terciario 8,0:1; errores 8,9:1; bordes de campos 4,6:1.

**Build de producción hoy** (`node scripts/build-landing.mjs --produccion`, código de salida 1, no escribe archivos):

```text
La build de producción falló. No se escribió ningún archivo.
  ✗ TODO-CRISTIAN: falta gtm_id en data/config.json (lo crea Cristian en Tag Manager)
  ✗ Se muestra el caso "Imprenta Express" con permiso distinto de true en data/casos.json
  ✗ Se muestra el caso "Mielu" con permiso distinto de true en data/casos.json
  ✗ Se muestra el caso "Vet Integrativa" con permiso distinto de true en data/casos.json
  ✗ Se muestra el caso "AO Construcciones" con permiso distinto de true en data/casos.json
  ✗ Se muestra el caso "Mister Gas" con permiso distinto de true en data/casos.json
  ✗ TODO-CRISTIAN: falta la foto real de Cristian, con luz natural (data/config.json → fundador.foto)
Avisos:
  - Vitrales del Cajón: oculto en producción hasta confirmar el arreglo (requiere_arreglo: true)
  - Sin video de Cristian (opcional): el bloque 7 sale sin video
```

Una prueba con datos temporales (permisos, `gtm_id` de prueba, foto, reseñas, logo y testimonio) confirma que `--produccion` pasa cuando no falta nada y que las secciones condicionales se generan.

## Qué falta (bloquea la publicación)

1. **Permisos por escrito** de Imprenta Express, Mielu (con el pago en línea activo), Vet Integrativa, AO Construcciones y Mister Gas → `data/casos.json`, `permiso: true`. Si alguno no da permiso: `mostrar: false`.
2. **Vitrales del Cajón:** confirmar el arreglo → `requiere_arreglo: false`. Mientras tanto, producción lo oculta solo.
3. **ID de Tag Manager** → `data/config.json`, `gtm_id` (GA4 y Clarity se configuran dentro de GTM en la fase 2).
4. **Foto real de Cristian**, con luz natural → `fundador.foto` (ruta en `assets/tiendas-online/img/`).
5. **Opcionales:** video de 40 s (`fundador.video` y `video_portada`; carga al tocarlo), dato de AO con permiso (`dato_ao_con_permiso`), certificación de Google Ads, reseñas de Google en `data/resenas.json` (copiadas tal cual, con `ficha_url`, `n` y `promedio`), logos con permiso y testimonio en video.
6. **Boleta:** cuando el SII esté activo, `boleta_activa: true` agrega la pregunta 8.
7. **Tramo 2:** en febrero, `cierre_tramo: 2` cambia el título del cierre.

Antes de pasar a `main`: `node scripts/build-landing.mjs --produccion` debe terminar sin errores y su salida es la que se commitea (los HTML de esta rama son la vista previa, con casos sin permiso).

## Decisiones que necesitan tu OK

1. **Textos que 03 no define** (mínimos, marcados para aprobación):
   - Errores de campos sin mensaje en 03: "Completa este campo." (nombre, qué vendes) y "Elige una opción." (preguntas de opción).
   - Falla del envío: "No se pudo enviar el formulario. Escríbeme por WhatsApp y te respondo igual." + botón "Cotiza por WhatsApp".
   - Títulos de los bloques 7 y 8: usé el nombre del bloque en 03 ("Quién está detrás", "Preguntas frecuentes").
   - Solo para lectores de pantalla (no se ven): "(se abre en otra pestaña)" en los enlaces externos y la etiqueta "Sitio web" del campo trampa.
   - Una comprobación inversa (cada fragmento visible de las 4 páginas buscado en 03) no encuentra otros textos fuera de 03.
   - Meta descripción de `/casos`: "Tiendas reales, funcionando hoy. No son maquetas. Entra, navega y agrega algo al carro." y de `/planes`: "Esencial desde $350.000 + IVA y Pro desde $480.000 + IVA. Precios a la vista. Pagas 50% al partir y 50% al recibir tu tienda." (frases de 03 y de los anuncios). Título de gracias: "¡Listo! | Espíritu Digital".
2. **Mensajes de WhatsApp de botones que 03 no lista:** cierre de `/casos` = mensaje de "Tiendas reales"; cierre de `/planes` = "Qué recibes"; botón de gracias y respaldo del formulario = "Cierre".
3. **Privacidad:** 03 dice `/privacidad`; el sitio tiene `politica-privacidad.html`, así que el enlace va a `/politica-privacidad`.
4. **Planes:** "Esencial · Desde $350.000 + IVA" se muestra con el nombre arriba y el precio abajo (mismas palabras, sin el punto medio).
5. **Páginas web de clientes:** las tarjetas chicas de Vet Integrativa, AO y Mister Gas enlazan a sus sitios (pestaña nueva), como prueba verificable. 03 solo da nombre y rubro.
6. **Una pantalla entre botones:** se cumple con el botón flotante, que la prueba verifica a la vista en cada posición de la página a 360 × 740. Entre botones del flujo (sin el flotante) la mayor distancia es 2.483 px = 3,4 pantallas, en el bloque 3 (tres tarjetas con captura). Si quieres botones del flujo en cada pantalla, la opción es un "Cotiza por WhatsApp" bajo cada tienda; no lo agregué porque 03 no lo trae.
7. **Imágenes:** la portada lleva `fetchpriority="high"` y todas las demás `loading="lazy"`, salvo el logo de 36 px de la cabecera, que está sobre el pliegue y se carga normal.
8. **Precarga de fuentes:** el pedido decía precargar el peso principal; precargo los 2 (400 y 600, 8 KB cada uno). Con uno solo, el otro llegaba después del primer pintado y el texto se reacomodaba: CLS de 0,011 a 0,015 medido en Lighthouse y en carga en frío. Con los 2, 40 cargas en frío (5 variantes × 2 anchos × 4) dan CLS 0. Además, el respaldo usa Arial/Liberation Sans con anchos medidos por peso (`size-adjust` 111,23 % y 105,93 %).

## Notas para integrar con las otras ramas

- `vercel.json` necesita `"cleanUrls": true, "trailingSlash": false` (lo agrega la rama del sitio principal).
- `sitemap.xml`: agregar `/tiendas-online`, `/tiendas-online/casos` y `/tiendas-online/planes` (gracias no va).
- `scripts/servidor-local.mjs` también existe en `wip/sitio-principal` con otro contenido: al unir, conviene uno solo. El de esta rama agrega la API simulada y el adaptador de `api/` real; el otro emula los `redirects` de `vercel.json`.
- El JSON-LD del sitio principal usa el mismo `@id` de organización con otro teléfono y correo: deberían coincidir con los de esta landing (+56 9 2811 7627 y espiritudigital.chile@gmail.com).
- `/api/lead` y `/api/wa-click` deben aceptar exactamente el contrato que envía `landing.js` (lo verifica `probar-landing.mjs` contra la API simulada). Probé `--api-real` con una copia de los handlers de `wip/api-medicion`: lead válido → 500 `envio` (sin variables de entorno locales; la página ofrece WhatsApp), WhatsApp inválido → 400 `campos: ["whatsapp"]`, beacon → 204. Calza con el contrato.
