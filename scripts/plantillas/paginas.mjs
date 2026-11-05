// Plantillas de /tiendas-online y sus páginas.
// Los textos son los de docs/plan/03-COPY-LANDING.md, literales. Los valores
// variables (precios, horario, fecha de revisión, alcance de la web) salen de
// data/config.json y se formatean en build-landing.mjs.
// Si un texto no calza, se pregunta a Cristian: no se reescribe aquí.

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

// 03, sección 13: mensajes prellenados de WhatsApp.
export const MENSAJES = {
  portada: 'Hola Cristian, vengo de su página de tiendas online y quiero cotizar.',
  portada_web: 'Hola Cristian, quiero cotizar una página web.',
  tiendas: 'Hola Cristian, vi sus tiendas y quiero una para mi negocio.',
  que_recibes: 'Hola Cristian, quiero cotizar mi tienda online.',
  plan: (nombre) => `Hola Cristian, quiero el plan ${nombre}.`,
  pagina_web: 'Hola Cristian, quiero cotizar una página web.',
  proceso: 'Hola Cristian, quiero agendar los 15 minutos para mi tienda.',
  cierre: 'Hola Cristian, quiero partir con mi tienda online.',
  flotante: 'Hola Cristian, tengo una consulta sobre tiendas online.',
};

// Mensajes de error del formulario. Los dos primeros son de 03, sección 9.
// Los otros dos no están en 03: quedan marcados para aprobación en docs/fases/fase-1.md.
export const ERRORES = {
  whatsapp: 'Revisa tu WhatsApp: debe tener 9 dígitos y empezar con 9.',
  consentimiento: 'Marca la casilla para poder responderte.',
  texto: 'Completa este campo.',
  opcion: 'Elige una opción.',
  falla: 'No se pudo enviar el formulario. Escríbeme por WhatsApp y te respondo igual.',
};

const ICONOS = {
  wa: '<symbol id="i-wa" viewBox="0 0 24 24"><path fill="currentColor" d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.59-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.42-.08-.12-.27-.2-.57-.34M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88a9.83 9.83 0 0 1 9.88 9.89c0 5.45-4.43 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89a11.82 11.82 0 0 0-3.48-8.41Z"/></symbol>',
  pago: '<symbol id="i-pago" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 10h18M7 15h3M14 15h3"/></g></symbol>',
  llave: '<symbol id="i-llave" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="m10.9 12.1 9.1-9.1M16 7l3 3M13.5 9.5l2 2"/></g></symbol>',
  charla: '<symbol id="i-charla" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="M20.5 12a8.5 8.5 0 0 1-12.4 7.55L3.5 20.5l1-4.4A8.5 8.5 0 1 1 20.5 12Z"/></symbol>',
  empresa: '<symbol id="i-empresa" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V8l8-5 8 5v13M3 21h18M9 21v-6h6v6M9 10h.01M15 10h.01"/></g></symbol>',
  rondas: '<symbol id="i-rondas" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 0 0-14.6-4.5M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5M20 20v-4h-4"/></g></symbol>',
  check: '<symbol id="i-check" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="m5 12.5 4.2 4.2L19 7"/></symbol>',
  externo: '<symbol id="i-externo" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M7 17 17 7M9 7h8v8"/></symbol>',
  play: '<symbol id="i-play" viewBox="0 0 24 24"><path fill="currentColor" d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/></symbol>',
};

const icono = (id, clase = '') => `<svg class="ic${clase ? ' ' + clase : ''}" aria-hidden="true" focusable="false"><use href="#i-${id}"/></svg>`;

function sprite(ids) {
  return `<svg class="sprite" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${ids.map((id) => ICONOS[id]).join('')}</svg>`;
}

// Enlace de WhatsApp. El href base funciona sin JavaScript; landing.js le
// agrega "Vengo de Google. " y " Vengo de parte de X." cuando corresponde.
function wa(c, { cta, msg, msgWeb = '', plan = '', clase = 'btn btn-wa', texto, iconoWa = true, etiqueta = '' }) {
  const href = `https://wa.me/${c.cfg.whatsapp}?text=${encodeURIComponent(msg)}`;
  return (
    `<a class="${clase}" href="${esc(href)}" target="_blank" rel="noopener" data-wa="${esc(cta)}" data-msg="${esc(msg)}"` +
    (msgWeb ? ` data-msg-web="${esc(msgWeb)}"` : '') +
    (plan ? ` data-plan="${esc(plan)}"` : '') +
    (etiqueta ? ` aria-label="${esc(etiqueta)}"` : '') +
    `>${iconoWa ? icono('wa') : ''}${texto}</a>`
  );
}

function imagen(img, { clase = '', prioridad = false, sizes = '' } = {}) {
  if (!img) return '';
  const attrs = [
    `src="${esc(img.src)}"`,
    img.srcset ? `srcset="${esc(img.srcset)}"` : '',
    img.srcset && sizes ? `sizes="${esc(sizes)}"` : '',
    `width="${img.ancho}"`,
    `height="${img.alto}"`,
    `alt="${esc(img.alt)}"`,
    prioridad ? 'fetchpriority="high"' : 'loading="lazy"',
    'decoding="async"',
    clase ? `class="${clase}"` : '',
  ].filter(Boolean);
  return `<img ${attrs.join(' ')}>`;
}

// ---------------------------------------------------------------- textos ---

function variantes(c) {
  const p = c.p;
  return {
    tienda: {
      h1: 'Tu tienda online a medida, sin comisión de plataforma',
      bajada: `Con tu marca, panel propio y pago con Flow o Mercado Pago. Desde ${p.esencial} + IVA, en 2 pagos.`,
    },
    carrito: {
      h1: 'Tu página web con carrito de compras, lista para vender',
      bajada: `Con tu marca, panel propio para tus productos y pago con Flow o Mercado Pago. Desde ${p.esencial} + IVA, en 2 pagos.`,
    },
    precio: {
      h1: `¿Cuánto cuesta una tienda online? Desde ${p.esencial} + IVA`,
      bajada: 'Precio a la vista: tienda con tu marca, panel propio y pago con Flow o Mercado Pago, en 2 pagos.',
    },
    web: {
      h1: `¿Cuánto cuesta una página web? Desde ${p.web} + IVA`,
      bajada: `Página web profesional con tu marca. Y si vendes productos, tu tienda online desde ${p.esencial} + IVA.`,
    },
    alternativa: {
      h1: 'Tu tienda propia, sin pagar comisión extra por cada venta',
      bajada:
        'En Chile, Shopify Basic cobra 2% extra por venta si usas Flow o Mercado Pago.* Con tu tienda propia pagas solo la comisión de tu pasarela.',
    },
  };
}
export const NOMBRES_VARIANTES = ['tienda', 'carrito', 'precio', 'web', 'alternativa'];
export const textosVariantes = variantes;

export function preguntas(c) {
  const p = c.p;
  return [
    ['¿Qué necesito para partir?', 'Tu logo, fotos de tus productos, precios y cómo despachas. Si no tienes fotos o textos, te recomiendo cómo hacerlos o los cotizamos aparte.'],
    ['¿Cuánto demora?', 'Te muestro el primer avance a las 2 semanas de recibir tu material completo. La fecha de entrega final te la doy por escrito en la propuesta, antes de que pagues.'],
    [
      '¿Qué costos quedan después?',
      `Dos fijos: el dominio .cl, que se renueva una vez al año en NIC Chile, y la comisión de Flow o Mercado Pago en cada venta. La mantención es opcional: el primer mes va incluido y después sigue solo si tú la pides, por ${p.mant} + IVA al mes (${p.mantIva} con IVA), con alojamiento, respaldos, seguridad, soporte por WhatsApp y 1 hora de cambios al mes. Antes de que termine el mes incluido te aviso. Si no la quieres, te dejo la tienda funcionando en cuentas a tu nombre y el alojamiento lo pagas directo al proveedor que elijas. No cobramos comisión por tus ventas.`,
    ],
    ['¿La tienda es mía?', 'Sí. Al terminar de pagar, el código, el dominio y la base de datos quedan a tu nombre.'],
    ['¿Puedo cargar mis productos yo?', 'Sí. Desde tu panel subes productos y cambias precios y stock cuando quieras. En el Esencial te dejo cargados hasta 20.'],
    ['¿Flow o Mercado Pago?', 'Las dos funcionan bien en Chile. Te ayudo a elegir según cómo te pagan tus clientes y la comisión que te ofrezcan. En el Pro puedes tener las dos.'],
    [
      '¿Por qué no Shopify u otra plataforma?',
      'Son buenas opciones si recién partes y vendes poco. Pero en Chile, Shopify cobra 2% extra por cada venta en su plan Basic si usas Flow o Mercado Pago, porque su pasarela propia no opera aquí, y la mensualidad se paga en dólares.* Con tu tienda propia no pagas comisión por venta, el diseño es tuyo y todo queda a tu nombre.',
    ],
    c.cfg.boleta_activa ? ['¿Emiten boleta o factura?', 'Sí, Espíritu Digital SpA emite boleta o factura electrónica por cada pago.'] : null,
    ['¿Y si después quiero más funciones?', 'Se programan a tu medida y se cotizan aparte. No dependes de apps con cobro mensual.'],
    ['¿Qué pasa si no me gusta el diseño?', 'Antes de pagar ves tu portada con tu logo. Después tienes dos rondas de correcciones, y el 50% final se paga cuando tu tienda está lista.'],
    ['¿Trabajas con negocios de regiones?', 'Sí, con todo Chile, por videollamada y WhatsApp.'],
    ['¿También hacen la publicidad?', 'Sí. Gestiono Google Ads desde $150.000 + IVA al mes, para que tu tienda reciba visitas desde el primer día.'],
    [
      `¿Cómo funciona la página web de ${p.web} + IVA?`,
      `Trae el dominio .cl a tu nombre el primer año, los textos y las fotos. Pagas 50% al partir y 50% al recibirla. A las 2 semanas de recibir tu material te muestro el primer avance, y tienes dos rondas de correcciones completas. El primer mes de mantención va incluido; después sigue solo si la pides, por ${p.mantWeb} + IVA al mes (${p.mantWebIva} con IVA). Sin mantención, tu página sigue publicada, solo sin soporte. El código lo administramos nosotros y el dominio queda a tu nombre.`,
    ],
  ].filter(Boolean);
}

const notaShopify = (c) => `* Según shopify.com/cl/precios y help.shopify.com, revisados el ${esc(c.cfg.fecha_revision)}.`;

// ------------------------------------------------------------- comunes ---

function cabeza(c, { titulo, descripcion, canonica, indexar = true, jsonld = null, scriptCabeza = '', ogImagen = true }) {
  const og = c.img.og;
  const gtm = c.gtmId
    ? `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${esc(c.gtmId)}');</script>`
    : '';
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
${scriptCabeza}<meta name="description" content="${esc(descripcion)}">
${indexar ? `<meta name="robots" content="index, follow, max-image-preview:large">\n<link rel="canonical" href="${esc(canonica)}">` : '<meta name="robots" content="noindex">'}
<meta name="theme-color" content="#000000">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_CL">
<meta property="og:site_name" content="${esc(c.cfg.marca)}">
${indexar ? `<meta property="og:url" content="${esc(canonica)}">\n` : ''}<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descripcion)}">
${og && ogImagen ? `<meta property="og:image" content="${esc(og.url)}">\n<meta property="og:image:width" content="${og.ancho}">\n<meta property="og:image:height" content="${og.alto}">\n<meta name="twitter:card" content="summary_large_image">\n` : ''}<link rel="icon" href="/assets/tiendas-online/img/logo-64.webp" type="image/webp">
<link rel="preload" href="/assets/tiendas-online/fuentes/poppins-600.woff2" as="font" type="font/woff2" crossorigin>
<style>${c.css}</style>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>\n` : ''}${gtm}<script src="${esc(c.js)}" defer></script>`;
}

function inicioCuerpo(c) {
  return c.gtmId
    ? `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${esc(c.gtmId)}" height="0" width="0" style="display:none;visibility:hidden" title="Google Tag Manager"></iframe></noscript>\n`
    : '';
}

function cabecera(c, { enlace }) {
  return `<header class="cab"><div class="contenedor"><a class="logo" href="${esc(enlace)}"><img src="/assets/tiendas-online/img/logo-96.webp" width="36" height="36" alt=""><span>${esc(c.cfg.marca)}</span></a></div></header>`;
}

function pie(c) {
  const f = c.cfg;
  return `<footer class="pie"><div class="contenedor"><p>${esc(f.razon_social)} · RUT ${esc(f.rut)} · <a href="tel:+${esc(f.whatsapp)}">${esc(f.telefono_visible)}</a> · <a href="mailto:${esc(f.correo)}">${esc(f.correo)}</a> · <a href="${esc(f.ruta_privacidad)}">Política de privacidad</a> · <a href="${esc(f.ruta_terminos)}">Términos</a></p></div></footer>`;
}

function flotante(c) {
  return wa(c, { cta: 'flotante', msg: MENSAJES.flotante, clase: 'flotante', texto: '', etiqueta: 'Escríbeme por WhatsApp' });
}

function documento(c, { cabezaHtml, cuerpo, pagina, atributos = '' }) {
  return `<!doctype html>
<html lang="es-CL" data-pagina="${pagina}" data-wa="${esc(c.cfg.whatsapp)}"${atributos}>
<head>
${cabezaHtml}
</head>
<body>
${inicioCuerpo(c)}${sprite(['wa', 'pago', 'llave', 'charla', 'empresa', 'rondas', 'check', 'externo', 'play'])}
${cuerpo}
${flotante(c)}
</body>
</html>
`;
}

// ------------------------------------------------------------- bloques ---

function bloquePortada(c) {
  const v = variantes(c);
  const p = c.p;
  const h1 = NOMBRES_VARIANTES.map((k) => `<span class="v-${k}">${esc(v[k].h1)}</span>`).join('');
  const bajada = NOMBRES_VARIANTES.map((k) => `<span class="v-${k}">${esc(v[k].bajada)}</span>`).join('');
  return `<section class="portada" aria-labelledby="titulo-portada"><div class="contenedor">
<div class="portada-texto">
<h1 id="titulo-portada">${h1}</h1>
<p class="bajada">${bajada}</p>
<p class="precio v-noweb"><strong>Desde ${p.esencial} + IVA</strong> <span>(${p.esencialIva} con IVA) · 50% al partir y 50% al recibirla.</span></p>
<p class="precio v-web"><strong>Página web desde ${p.web} + IVA</strong> <span>(${p.webIva} con IVA).</span></p>
<div class="acciones">
${wa(c, { cta: 'portada', msg: MENSAJES.portada, msgWeb: MENSAJES.portada_web, texto: 'Cotiza por WhatsApp', clase: 'btn btn-wa cta' })}
<a class="btn btn-sec cta" href="#tiendas"><span class="v-noweb">Ver tiendas reales</span><span class="v-web">Ver proyectos reales</span></a>
</div>
<p class="respuesta">Te respondo yo, Cristian, en menos de 15 minutos · ${esc(c.cfg.horario_corto)}.</p>
</div>
${c.img.portada ? `<figure class="portada-img">${imagen(c.img.portada, { prioridad: true, sizes: '(min-width: 900px) 520px, calc(100vw - 32px)' })}</figure>` : ''}
<p class="nota-pie v-alternativa">${notaShopify(c)}</p>
</div></section>`;
}

function bloqueFranja(c) {
  const r = c.resenas;
  const estrellas =
    r && r.n >= 5 && r.promedio
      ? `<li class="franja-item franja-resenas"><a href="${esc(r.ficha_url)}" target="_blank" rel="noopener">★ ${esc(String(r.promedio).replace('.', ','))} en Google · ${esc(r.n)} reseñas</a></li>`
      : '';
  const logos = c.logos.length
    ? `<ul class="logos" aria-label="Clientes">${c.logos
        .map((l) => `<li>${imagen(l.img, { clase: 'logo-cliente' })}</li>`)
        .join('')}</ul>`
    : '';
  return `<section class="franja"><div class="contenedor">
<ul class="franja-fila" tabindex="0" aria-label="Franja de confianza">${estrellas}
<li class="franja-item">${icono('pago')}<span>Pago en 2 partes</span></li>
<li class="franja-item v-noweb">${icono('llave')}<span>El código y el dominio quedan a tu nombre</span></li>
<li class="franja-item v-web">${icono('rondas')}<span>2 rondas de correcciones completas</span></li>
<li class="franja-item">${icono('charla')}<span>Hablas directo con quien programa</span></li>
<li class="franja-item">${icono('empresa')}<span>${esc(c.cfg.nombre_spa)} · RUT ${esc(c.cfg.rut)}</span></li>
</ul>
${logos}
</div></section>`;
}

function tarjetaTienda(t, { nivel = 3, sizes = '' } = {}) {
  return `<article class="tarjeta caso${t.destacado ? ' caso--destacado' : ''}">
${t.img ? `<div class="caso-img">${imagen(t.img, { sizes })}</div>` : ''}<div class="caso-texto">
<h${nivel} class="caso-titulo">${esc(t.nombre)} · ${esc(t.subtitulo)}</h${nivel}>
<p>${esc(t.descripcion)}</p>
<a class="btn btn-sec" href="${esc(t.url)}" target="_blank" rel="noopener" data-caso="${esc(t.slug)}">Ver tienda<span class="sr"> ${esc(t.nombre)} (se abre en otra pestaña)</span>${icono('externo')}</a>
</div>
</article>`;
}

function listaWebs(c, { nivel = 3 } = {}) {
  if (!c.casos.webs.length) return '';
  return `<h${nivel} class="webs-titulo">También hacemos páginas web</h${nivel}>
<ul class="webs">${c.casos.webs
    .map(
      (w) =>
        `<li><a class="web" href="${esc(w.url)}" target="_blank" rel="noopener" data-caso="${esc(w.slug)}"><strong>${esc(w.nombre)}</strong> <span>· ${esc(w.rubro)}</span><span class="sr"> (se abre en otra pestaña)</span>${icono('externo')}</a></li>`
    )
    .join('')}</ul>`;
}

function bloqueTiendas(c) {
  return `<section id="tiendas" class="tiendas" aria-labelledby="titulo-tiendas"><div class="contenedor">
<h2 id="titulo-tiendas">Tiendas reales, funcionando hoy</h2>
<p class="bajada-seccion">No son maquetas. Entra, navega y agrega algo al carro.</p>
<div class="casos">
${c.casos.tiendas.map((t) => tarjetaTienda(t, { sizes: t.destacado ? '(min-width: 900px) 560px, calc(100vw - 72px)' : '(min-width: 900px) 520px, calc(100vw - 72px)' })).join('\n')}
</div>
${listaWebs(c)}
<div class="cta-bloque">${wa(c, { cta: 'tiendas', msg: MENSAJES.tiendas, texto: 'Quiero una tienda así', clase: 'btn btn-wa cta' })}</div>
</div></section>`;
}

const RECIBES = [
  ['Con tu marca:', 'logo, colores y fotos tuyas. Nada de una plantilla que tienen miles.'],
  ['Tu propio panel:', 'subes productos, cambias precios y stock y ves tus pedidos.'],
  ['Cobra en línea:', 'con Flow o Mercado Pago, la que prefieras.'],
  ['Despacho a tu manera:', 'tarifa por zona y retiro en tienda.'],
  ['Te avisa de cada pedido:', 'por correo, y tus clientes te escriben por WhatsApp con un botón.'],
  ['Lista para Google:', 'títulos, descripciones, sitemap, Analytics y Search Console.'],
  ['Páginas legales:', 'términos, cambios y devoluciones, y política de privacidad.'],
  ['Te enseño a usarla:', '1 hora por videollamada.'],
];

function bloqueRecibes(c) {
  return `<section class="recibes" aria-labelledby="titulo-recibes"><div class="contenedor">
<h2 id="titulo-recibes">Todo lo que necesitas para vender online</h2>
<ul class="lista-recibes">${RECIBES.map(([a, b]) => `<li>${icono('check')}<span><strong>${esc(a)}</strong> ${esc(b)}</span></li>`).join('')}</ul>
<div class="tarjeta es-tuya">
<h3>Y es tuya</h3>
<ul class="lista-check">
<li>${icono('check')}<span>Sin comisión por venta: solo pagas la de tu pasarela.</span></li>
<li>${icono('check')}<span>Al terminar de pagar, el código, el dominio y la base de datos quedan a tu nombre.</span></li>
<li>${icono('check')}<span>Mantención opcional, con el primer mes incluido.</span></li>
</ul>
</div>
<div class="cta-bloque">${wa(c, { cta: 'que_recibes', msg: MENSAJES.que_recibes, texto: 'Cotiza tu tienda por WhatsApp', clase: 'btn btn-wa cta' })}</div>
</div></section>`;
}

const ESENCIAL = [
  'Diseño con tu marca',
  'Hasta 20 productos con variantes, cargados por mí',
  'Panel propio',
  'Flow o Mercado Pago',
  'Despacho por zona y retiro en tienda',
  'Aviso de pedidos y botón de WhatsApp',
  'SEO técnico, Analytics y Search Console',
  'Páginas legales',
  '2 rondas de correcciones',
  'Capacitación de 1 hora',
];
const PRO = ['Hasta 100 productos', 'Flow y Mercado Pago juntos', 'Cupones de descuento', 'Precios mayoristas', 'Tag Manager y Clarity', 'Datos estructurados para Google', 'Capacitación grabada'];
const NO_INCLUYE = [
  'fotografía y textos de producto',
  'más de 20 productos en el Esencial',
  'integraciones con courier o ERP en el Esencial y el Pro',
  'boleta automática',
  'publicidad',
];

const listaCheck = (items, clase = 'lista-check') => `<ul class="${clase}">${items.map((t) => `<li>${icono('check')}<span class="cap">${esc(t)}</span></li>`).join('')}</ul>`;

function tarjetaWeb(c, { encabezado = 'h2' } = {}) {
  if (!c.cfg.web_incluye || !c.cfg.web_incluye.length) return '';
  const p = c.p;
  const meses = c.cfg.mantencion_meses_incluidos;
  return `<article class="tarjeta plan plan--web web-tarjeta v-web" aria-labelledby="titulo-plan-web">
<${encabezado} class="plan-nombre" id="titulo-plan-web">Página web</${encabezado}>
<p class="plan-precio">Desde <span class="monto">${p.web}</span> + IVA</p>
<p class="plan-chica">${p.webIva} con IVA</p>
${listaCheck(c.cfg.web_incluye)}
<p class="plan-condiciones">50% al partir y 50% al recibirla · primer avance a las 2 semanas de recibir tu material · 2 rondas de correcciones completas · ${esc(meses)} mes de mantención incluido; después ${p.mantWeb} + IVA al mes, solo si la pides</p>
${wa(c, { cta: 'pagina_web', msg: MENSAJES.pagina_web, plan: 'web', texto: 'Quiero mi página web', clase: 'btn btn-wa cta' })}
</article>`;
}

function lineaWeb(c) {
  const p = c.p;
  return `<div class="linea-web v-noweb">
<p>¿Todavía no necesitas tienda? Página web profesional desde ${p.web} + IVA (${p.webIva} con IVA).</p>
${wa(c, { cta: 'pagina_web', msg: MENSAJES.pagina_web, plan: 'web', texto: 'Cotizar página web', clase: 'btn btn-sec cta' })}
</div>`;
}

function tarjetasPlanes(c, { nivel = 3 } = {}) {
  const p = c.p;
  const h = `h${nivel}`;
  return `<div class="planes">
<article class="tarjeta plan plan--esencial" aria-labelledby="titulo-plan-esencial">
<${h} class="plan-nombre" id="titulo-plan-esencial">Esencial</${h}>
<p class="plan-precio">Desde <span class="monto">${p.esencial}</span> + IVA</p>
<p class="plan-chica">${p.esencialIva} con IVA · o 2 pagos de ${p.cuota} + IVA</p>
<p class="plan-para"><strong>Para quién:</strong> quien vende por Instagram o WhatsApp y quiere su tienda.</p>
<p class="plan-sub">Incluye:</p>
${listaCheck(ESENCIAL)}
${wa(c, { cta: 'plan', msg: MENSAJES.plan('Esencial'), plan: 'esencial', texto: 'Quiero el Esencial', clase: 'btn btn-wa cta' })}
</article>
<article class="tarjeta plan plan--pro" aria-labelledby="titulo-plan-pro">
<p class="etiqueta">Para crecer</p>
<${h} class="plan-nombre" id="titulo-plan-pro">Pro</${h}>
<p class="plan-precio">Desde <span class="monto">${p.pro}</span> + IVA</p>
<p class="plan-chica">${p.proIva} con IVA</p>
<p class="plan-para"><strong>Para quién:</strong> marcas con más catálogo o que venden a empresas.</p>
<p class="plan-sub">Todo lo del Esencial, más:</p>
${listaCheck(PRO)}
${wa(c, { cta: 'plan', msg: MENSAJES.plan('Pro'), plan: 'pro', texto: 'Quiero el Pro', clase: 'btn btn-wa cta' })}
</article>
<article class="tarjeta plan plan--empresa" aria-labelledby="titulo-plan-empresa">
<${h} class="plan-nombre" id="titulo-plan-empresa">Empresa</${h}>
<p class="plan-precio"><span class="monto">Cotización</span></p>
<p class="plan-para">Integración con tu ERP, courier o boleta automática. Alcance a tu medida.</p>
${wa(c, { cta: 'plan', msg: MENSAJES.plan('Empresa'), plan: 'empresa', texto: 'Cotizar plan Empresa', clase: 'btn btn-wa cta' })}
</article>
</div>
<p class="incluido"><strong>Incluido en todos los planes:</strong> optimización de tu ficha de Google y ${esc(c.cfg.mantencion_meses_incluidos)} mes de mantención.</p>`;
}

function noIncluye({ abierto = false } = {}) {
  return `<details class="desplegable no-incluye"${abierto ? ' open' : ''}><summary>Qué no incluye</summary>${listaCheck(NO_INCLUYE, 'lista-no')}</details>`;
}

function bloquePlanes(c) {
  return `<section id="planes" class="planes-seccion" aria-labelledby="titulo-planes"><div class="contenedor">
${tarjetaWeb(c)}
<h2 id="titulo-planes">Elige tu plan</h2>
<p class="bajada-seccion">Pagas 50% al partir y 50% al recibir tu tienda.</p>
${tarjetasPlanes(c)}
${noIncluye()}
${lineaWeb(c)}
</div></section>`;
}

const PASOS = [
  ['Conversamos 15 minutos.', 'Me cuentas qué vendes y te digo qué plan te sirve. Sin compromiso.'],
  ['Ves tu portada antes de pagar.', 'En 48 horas te muestro tu tienda con tu logo y tres de tus productos.'],
  ['Pagas el 50% y me envías tu material:', 'logo, fotos, productos y precios.'],
  ['Construyo tu tienda y la revisas.', 'A las 2 semanas de recibir tu material completo te muestro el primer avance. Dos rondas de correcciones incluidas.'],
  ['Pagas el 50% restante y publicamos.', 'Te enseño a usarla en una videollamada.'],
];

function bloqueProceso(c) {
  return `<section id="proceso" class="proceso" aria-labelledby="titulo-proceso"><div class="contenedor">
<h2 id="titulo-proceso">Así de simple</h2>
<ol class="pasos" role="list">${PASOS.map(([a, b], i) => `<li class="paso"><span class="paso-num" aria-hidden="true">${i + 1}</span><p><strong>${esc(a)}</strong> ${esc(b)}</p></li>`).join('')}</ol>
<p class="nota-proceso">El plazo te lo doy por escrito en la propuesta, según tu material, antes de que pagues.</p>
<div class="cta-bloque">${wa(c, { cta: 'proceso', msg: MENSAJES.proceso, texto: 'Partamos por los 15 minutos', clase: 'btn btn-wa cta' })}</div>
</div></section>`;
}

function videoBoton(video, portada, etiqueta) {
  return `<button class="video-boton" type="button" data-video="${esc(video.src)}" aria-label="${esc(etiqueta)}">${imagen(portada)}<span class="video-play">${icono('play')}</span></button>`;
}

function bloqueQuien(c) {
  const f = c.cfg.fundador;
  const datos = [];
  if (c.datoAo) datos.push('<p class="quien-dato">También gestiono Google Ads para negocios como AO Construcciones.</p>');
  if (f.certificado_google_ads) datos.push('<p class="quien-dato">Certificado en Google Ads Búsqueda.</p>');
  const video = c.img.fundadorVideo
    ? `<div class="quien-video">${videoBoton(c.img.fundadorVideo, c.img.fundadorVideoPortada, 'Reproducir video de Cristian (40 segundos)')}</div>`
    : '';
  const r = c.resenas;
  const resenas =
    r && r.resenas.length >= 3
      ? `<div class="resenas"><h3>Lo que dicen nuestros clientes</h3><ul class="resenas-lista">${r.resenas
          .map((x) => `<li class="tarjeta resena"><blockquote><p>${esc(x.texto)}</p></blockquote><p class="resena-autor">${esc(x.nombre)} · <time datetime="${esc(x.fecha)}">${esc(x.fecha_visible || x.fecha)}</time></p></li>`)
          .join('')}</ul>${r.ficha_url ? `<a class="enlace" href="${esc(r.ficha_url)}" target="_blank" rel="noopener">Ver todas en Google</a>` : ''}</div>`
      : '';
  const testimonios = c.testimonios.length
    ? `<div class="testimonios">${c.testimonios
        .map(
          (t) =>
            `<figure class="testimonio">${videoBoton(t.videoInfo, t.portadaInfo, `Reproducir testimonio de ${t.nombre}`)}<figcaption><p class="testimonio-transcripcion">${esc(t.transcripcion)}</p><p class="resena-autor">${esc(t.nombre)}${t.negocio ? ' · ' + esc(t.negocio) : ''}</p></figcaption></figure>`
        )
        .join('')}</div>`
    : '';
  return `<section class="quien" aria-labelledby="titulo-quien"><div class="contenedor">
<div class="quien-grid${c.img.fundador ? '' : ' quien-grid--sin-foto'}">
${c.img.fundador ? `<div class="quien-foto">${imagen(c.img.fundador, { sizes: '(min-width: 900px) 320px, calc(100vw - 32px)' })}</div>` : ''}<div class="quien-texto">
<h2 id="titulo-quien">Quién está detrás</h2>
<p>Soy Cristian Sánchez, fundador de Espíritu Digital. Programo cada tienda y hablas directo conmigo, del primer mensaje a la entrega. Desde el Cajón del Maipo, para todo Chile.</p>
${datos.join('\n')}
${video}
</div>
</div>
${resenas}
${testimonios}
</div></section>`;
}

function bloquePreguntas(c) {
  return `<section id="preguntas" class="preguntas" aria-labelledby="titulo-preguntas"><div class="contenedor">
<h2 id="titulo-preguntas">Preguntas frecuentes</h2>
<div class="faq">${preguntas(c)
    .map(([q, a]) => `<details class="desplegable"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`)
    .join('')}</div>
<p class="nota-pie">${notaShopify(c)}</p>
</div></section>`;
}

const TITULOS_CIERRE = {
  1: 'Construir una tienda toma semanas. Si la quieres lista para marzo, conversemos esta semana.',
  2: 'Cada semana sin tienda es otra semana respondiendo lo mismo por WhatsApp.',
};
export const titulosCierre = TITULOS_CIERRE;

function radios(nombre, leyenda, opciones) {
  return `<fieldset class="campo opciones">
<legend>${esc(leyenda)}</legend>
${opciones
  .map(
    ([valor, texto], i) =>
      `<label class="opcion"><input type="radio" name="${nombre}" value="${valor}" id="f-${nombre}-${i}" aria-describedby="e-${nombre}"><span>${esc(texto)}</span></label>`
  )
  .join('\n')}
<p class="error" id="e-${nombre}" hidden></p>
</fieldset>`;
}

function formulario(c) {
  const ocultos = ['ref', 'gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'h', 'landing_path', 't0']
    .map((n) => `<input type="hidden" name="${n}" value="">`)
    .join('');
  return `<form id="form-cotizar" class="tarjeta form" action="/api/lead" method="post" novalidate data-gracias="${esc(c.cfg.ruta_landing)}/gracias" data-e-texto="${esc(ERRORES.texto)}" data-e-opcion="${esc(ERRORES.opcion)}" data-e-whatsapp="${esc(ERRORES.whatsapp)}" data-e-consentimiento="${esc(ERRORES.consentimiento)}" aria-labelledby="titulo-form">
<h3 id="titulo-form">¿Prefieres que te escriba yo?</h3>
<div class="campo"><label for="f-nombre">Tu nombre</label><input id="f-nombre" name="nombre" type="text" autocomplete="name" maxlength="80" required aria-describedby="e-nombre"><p class="error" id="e-nombre" hidden></p></div>
<div class="campo"><label for="f-whatsapp">Tu WhatsApp (+56 9 ...)</label><input id="f-whatsapp" name="whatsapp" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" required aria-describedby="e-whatsapp"><p class="error" id="e-whatsapp" hidden></p></div>
<div class="campo"><label for="f-que_vende">¿Qué vendes?</label><input id="f-que_vende" name="que_vende" type="text" maxlength="200" required aria-describedby="e-que_vende"><p class="error" id="e-que_vende" hidden></p></div>
${radios('vende_online', '¿Ya vendes online?', [
  ['no', 'No'],
  ['instagram_whatsapp', 'Sí, por Instagram o WhatsApp'],
  ['tienda', 'Sí, tengo tienda'],
])}
${radios('plazo', '¿Cuándo quieres partir?', [
  ['este_mes', 'Este mes'],
  ['proximo_mes', 'El próximo mes'],
  ['cotizando', 'Solo estoy cotizando'],
])}
${radios('presupuesto', 'Presupuesto, sin IVA', [
  ['menos_350', 'Menos de $350.000'],
  ['350_500', '$350.000 a $500.000'],
  ['mas_500', 'Más de $500.000'],
])}
<div class="campo"><label class="check" for="f-consentimiento"><input id="f-consentimiento" name="consentimiento" type="checkbox" value="si" aria-describedby="e-consentimiento"><span>Acepto que Espíritu Digital SpA use estos datos para responder mi consulta, según la <a href="${esc(c.cfg.ruta_privacidad)}">política de privacidad</a>.</span></label><p class="error" id="e-consentimiento" hidden></p></div>
<div class="hp" aria-hidden="true"><label for="f-sitio">Sitio web</label><input id="f-sitio" name="sitio_web" type="text" tabindex="-1" autocomplete="off"></div>
${ocultos}
<button class="btn btn-wa btn-grande cta" type="submit">Enviar y recibir mi cotización</button>
<p class="form-nota">Te escribo por WhatsApp en menos de 15 minutos, ${esc(c.cfg.horario_respuesta)}. No comparto tus datos.</p>
<div class="form-falla" id="form-falla" role="alert" hidden><p>${esc(ERRORES.falla)}</p>${wa(c, { cta: 'formulario_error', msg: MENSAJES.cierre, texto: 'Cotiza por WhatsApp', clase: 'btn btn-wa cta' })}</div>
</form>`;
}

function bloqueCierre(c) {
  const titulo = TITULOS_CIERRE[c.cfg.cierre_tramo] || TITULOS_CIERRE[1];
  return `<section id="cotizar" class="cierre" aria-labelledby="titulo-cierre"><div class="contenedor cierre-grid">
<div class="cierre-texto">
<h2 id="titulo-cierre">${esc(titulo)}</h2>
<div class="cta-bloque">${wa(c, { cta: 'cierre', msg: MENSAJES.cierre, texto: 'Cotiza por WhatsApp', clase: 'btn btn-wa btn-grande cta' })}</div>
</div>
${formulario(c)}
</div></section>`;
}

// ------------------------------------------------------------- JSON-LD ---

function organizacion(c) {
  const f = c.cfg;
  return {
    '@type': 'Organization',
    '@id': `${f.sitio}/#organization`,
    name: f.marca,
    legalName: f.razon_social,
    taxID: f.rut,
    url: `${f.sitio}/`,
    logo: `${f.sitio}/logotipo.webp`,
    email: f.correo,
    telephone: `+${f.whatsapp}`,
    address: { '@type': 'PostalAddress', addressLocality: f.localidad, addressRegion: f.region, addressCountry: 'CL' },
    areaServed: { '@type': 'Country', name: 'Chile' },
  };
}

function servicio(c) {
  const f = c.cfg;
  const oferta = (nombre, precio, url) => ({
    '@type': 'Offer',
    name: nombre,
    url,
    price: precio,
    priceCurrency: 'CLP',
    priceSpecification: { '@type': 'PriceSpecification', price: precio, minPrice: precio, priceCurrency: 'CLP', valueAddedTaxIncluded: false },
  });
  return {
    '@type': 'Service',
    '@id': `${f.sitio}${f.ruta_landing}#servicio`,
    name: 'Tienda online a medida',
    serviceType: 'Desarrollo de tiendas online',
    url: `${f.sitio}${f.ruta_landing}`,
    provider: { '@id': `${f.sitio}/#organization` },
    areaServed: { '@type': 'Country', name: 'Chile' },
    offers: [
      oferta('Plan Esencial', f.precio_esencial, `${f.sitio}${f.ruta_landing}/planes`),
      oferta('Plan Pro', f.precio_pro, `${f.sitio}${f.ruta_landing}/planes?plan=pro`),
    ],
  };
}

function faqLd(c, lista) {
  return {
    '@type': 'FAQPage',
    '@id': `${c.cfg.sitio}${c.cfg.ruta_landing}#preguntas`,
    mainEntity: lista.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  };
}

// --------------------------------------------------------------- páginas ---

const SCRIPT_VARIANTE =
  '<script>!function(e){var h;try{h=new URLSearchParams(location.search).get("h")}catch(t){}e.setAttribute("data-h",/^(tienda|carrito|precio|web|alternativa)$/.test(h)?h:"tienda")}(document.documentElement)</script>\n';
const SCRIPT_PLAN =
  '<script>!function(e){var p;try{p=new URLSearchParams(location.search).get("plan")}catch(t){}/^(esencial|pro|empresa)$/.test(p)&&e.setAttribute("data-plan",p)}(document.documentElement)</script>\n';

export function paginaLanding(c) {
  const f = c.cfg;
  const canonica = `${f.sitio}${f.ruta_landing}`;
  const titulo = `Tienda online a medida desde ${c.p.esencial} + IVA | Espíritu Digital`;
  const descripcion =
    'Tienda online con tu marca, panel propio y pago con Flow o Mercado Pago. Sin comisión de plataforma. Código y dominio a tu nombre. Cotiza por WhatsApp.';
  const jsonld = { '@context': 'https://schema.org', '@graph': [organizacion(c), servicio(c), faqLd(c, preguntas(c))] };
  const cuerpo = `${cabecera(c, { enlace: '#titulo-portada' })}
<main id="contenido">
${bloquePortada(c)}
${bloqueFranja(c)}
${bloqueTiendas(c)}
${bloqueRecibes(c)}
${bloquePlanes(c)}
${bloqueProceso(c)}
${bloqueQuien(c)}
${bloquePreguntas(c)}
${bloqueCierre(c)}
</main>
${pie(c)}`;
  return documento(c, {
    pagina: 'landing',
    atributos: ' data-h="tienda"',
    cabezaHtml: cabeza(c, { titulo, descripcion, canonica, jsonld, scriptCabeza: SCRIPT_VARIANTE }),
    cuerpo,
  });
}

export function paginaCasos(c) {
  const f = c.cfg;
  const canonica = `${f.sitio}${f.ruta_landing}/casos`;
  const titulo = 'Tiendas y páginas web que hicimos | Espíritu Digital';
  // Meta descripción: frases literales de 03 (bloque 3). Pendiente de OK de Cristian.
  const descripcion = 'Tiendas reales, funcionando hoy. No son maquetas. Entra, navega y agrega algo al carro.';
  const jsonld = { '@context': 'https://schema.org', '@graph': [organizacion(c)] };
  const cuerpo = `${cabecera(c, { enlace: f.ruta_landing })}
<main id="contenido">
<section class="tiendas pagina-casos" aria-labelledby="titulo-casos"><div class="contenedor">
<h1 id="titulo-casos">Tiendas reales, funcionando hoy</h1>
<p class="bajada-seccion">No son maquetas. Entra, navega y agrega algo al carro.</p>
<div class="casos casos--grandes">
${c.casos.tiendas.map((t) => tarjetaTienda(t, { nivel: 2, sizes: '(min-width: 900px) 1088px, calc(100vw - 72px)' })).join('\n')}
</div>
${listaWebs(c, { nivel: 2 })}
</div></section>
<section class="cierre cierre--corto" aria-labelledby="titulo-cierre-casos"><div class="contenedor">
<h2 id="titulo-cierre-casos">¿Quieres la tuya?</h2>
<div class="cta-bloque">${wa(c, { cta: 'casos_cierre', msg: MENSAJES.tiendas, texto: 'Cotiza por WhatsApp', clase: 'btn btn-wa btn-grande cta' })}</div>
</div></section>
</main>
${pie(c)}`;
  return documento(c, { pagina: 'casos', cabezaHtml: cabeza(c, { titulo, descripcion, canonica, jsonld }), cuerpo });
}

export function paginaPlanes(c) {
  const f = c.cfg;
  const canonica = `${f.sitio}${f.ruta_landing}/planes`;
  const titulo = 'Planes y precios de tiendas online | Espíritu Digital';
  // Meta descripción: frases literales de 03 (bloque 5) y de los anuncios. Pendiente de OK de Cristian.
  const descripcion = `Esencial desde ${c.p.esencial} + IVA y Pro desde ${c.p.pro} + IVA. Precios a la vista. Pagas 50% al partir y 50% al recibir tu tienda.`;
  const [q3, a3] = preguntas(c)[2];
  const jsonld = { '@context': 'https://schema.org', '@graph': [organizacion(c), servicio(c)] };
  const cuerpo = `${cabecera(c, { enlace: f.ruta_landing })}
<main id="contenido">
<section class="planes-seccion pagina-planes" aria-labelledby="titulo-planes"><div class="contenedor">
<h1 id="titulo-planes">Planes y precios</h1>
<p class="bajada-seccion">Pagas 50% al partir y 50% al recibir tu tienda.</p>
${tarjetasPlanes(c, { nivel: 2 })}
${noIncluye({ abierto: true })}
<div class="tarjeta costos"><h2 class="costos-titulo">${esc(q3)}</h2><p>${esc(a3)}</p></div>
${lineaWeb(c)}
</div></section>
<section class="cierre cierre--corto" aria-label="Cotiza por WhatsApp"><div class="contenedor">
<div class="cta-bloque">${wa(c, { cta: 'planes_cierre', msg: MENSAJES.que_recibes, texto: 'Cotiza por WhatsApp', clase: 'btn btn-wa btn-grande cta' })}</div>
</div></section>
</main>
${pie(c)}`;
  return documento(c, { pagina: 'planes', cabezaHtml: cabeza(c, { titulo, descripcion, canonica, jsonld, scriptCabeza: SCRIPT_PLAN }), cuerpo });
}

export function paginaGracias(c) {
  const f = c.cfg;
  const imprenta = c.casos.tiendas.find((t) => t.slug === 'imprenta-express');
  const titulo = '¡Listo! | Espíritu Digital';
  const descripcion = 'Para cotizarte más rápido, ten a mano tu logo, cuántos productos tienes y cómo despachas.';
  const cuerpo = `${cabecera(c, { enlace: f.ruta_landing })}
<main id="contenido">
<section class="gracias" aria-labelledby="titulo-gracias"><div class="contenedor">
<h1 id="titulo-gracias">¡Listo<span id="nombre-gracias"></span>! Te escribo en menos de 15 minutos, ${esc(f.horario_respuesta)}.</h1>
<script>try{var n=sessionStorage.getItem("ed_nombre");n&&(n=n.replace(/\\s+/g," ").trim().slice(0,80))&&(document.getElementById("nombre-gracias").textContent=", "+n)}catch(e){}</script>
<p class="bajada-seccion">Para cotizarte más rápido, ten a mano tu logo, cuántos productos tienes y cómo despachas.</p>
<div class="cta-bloque">${wa(c, { cta: 'gracias', msg: MENSAJES.cierre, texto: '¿Apurado? Escríbeme ahora por WhatsApp', clase: 'btn btn-wa btn-grande cta' })}</div>
${imprenta ? `<p class="gracias-enlace">Mientras tanto, <a href="${esc(imprenta.url)}" target="_blank" rel="noopener" data-caso="${esc(imprenta.slug)}">mira la tienda de Imprenta Express<span class="sr"> (se abre en otra pestaña)</span></a>.</p>` : ''}
</div></section>
</main>
${pie(c)}`;
  return documento(c, { pagina: 'gracias', cabezaHtml: cabeza(c, { titulo, descripcion, canonica: '', indexar: false, ogImagen: false }), cuerpo });
}
