#!/usr/bin/env node
// Pruebas de /tiendas-online con Playwright (chromium sin opciones) contra el servidor local.
//
//   node scripts/probar-landing.mjs                 build de vista previa + todas las pruebas
//   node scripts/probar-landing.mjs --sin-build     prueba los HTML tal como están
//   node scripts/probar-landing.mjs --lighthouse    además corre Lighthouse móvil (npx lighthouse)
//   node scripts/probar-landing.mjs --json salida.json   guarda las mediciones
//
// LIGHTHOUSE_CLI=/ruta/lighthouse/cli/index.js usa una instalación local de Lighthouse.
// Los textos esperados se copian aquí desde docs/plan/03-COPY-LANDING.md a propósito:
// así la prueba detecta cualquier diferencia entre la página y el documento.

import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { iniciarServidor, CLAVES_LEAD, CLAVES_WA } from './servidor-local.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const SIN_BUILD = argv.includes('--sin-build');
const LIGHTHOUSE = argv.includes('--lighthouse');
const SALIDA_JSON = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : '';

const VARIANTES = ['tienda', 'carrito', 'precio', 'web', 'alternativa'];
const H1 = {
  tienda: 'Tu tienda online a medida, sin comisión de plataforma',
  carrito: 'Tu página web con carrito de compras, lista para vender',
  precio: '¿Cuánto cuesta una tienda online? Desde $350.000 + IVA',
  web: '¿Cuánto cuesta una página web? Desde $150.000 + IVA',
  alternativa: 'Tu tienda propia, sin pagar comisión extra por cada venta',
};
const MSG = {
  portada: 'Hola Cristian, vengo de su página de tiendas online y quiero cotizar.',
  portada_web: 'Hola Cristian, quiero cotizar una página web.',
  tiendas: 'Hola Cristian, vi sus tiendas y quiero una para mi negocio.',
  que_recibes: 'Hola Cristian, quiero cotizar mi tienda online.',
  plan_esencial: 'Hola Cristian, quiero el plan Esencial.',
  plan_pro: 'Hola Cristian, quiero el plan Pro.',
  plan_empresa: 'Hola Cristian, quiero el plan Empresa.',
  pagina_web: 'Hola Cristian, quiero cotizar una página web.',
  proceso: 'Hola Cristian, quiero agendar los 15 minutos para mi tienda.',
  cierre: 'Hola Cristian, quiero partir con mi tienda online.',
  flotante: 'Hola Cristian, tengo una consulta sobre tiendas online.',
};
// Botones que 03 no lista en la sección 13: usan el mensaje del bloque más cercano.
MSG.casos_cierre = MSG.tiendas;
MSG.planes_cierre = MSG.que_recibes;
MSG.gracias = MSG.cierre;
MSG.formulario_error = MSG.cierre;

const ERR = {
  whatsapp: 'Revisa tu WhatsApp: debe tener 9 dígitos y empezar con 9.',
  consentimiento: 'Marca la casilla para poder responderte.',
  texto: 'Completa este campo.',
  opcion: 'Elige una opción.',
};
const HORARIO = 'de lunes a sábado de 8:00 a 20:00 y domingo de 8:00 a 14:00';

// Frases literales de 03 que deben estar en la landing (texto visible o en alguna variante).
const LITERALES = [
  'Desde $350.000 + IVA ($416.500 con IVA) · 50% al partir y 50% al recibirla.',
  'Página web desde $150.000 + IVA ($178.500 con IVA).',
  'Te respondo yo, Cristian, en menos de 15 minutos · Lun a sáb 8:00–20:00 · dom 8:00–14:00.',
  '* Según shopify.com/cl/precios y help.shopify.com, revisados el 5 nov 2026.',
  'Con tu marca, panel propio y pago con Flow o Mercado Pago. Desde $350.000 + IVA, en 2 pagos.',
  'Con tu marca, panel propio para tus productos y pago con Flow o Mercado Pago. Desde $350.000 + IVA, en 2 pagos.',
  'Precio a la vista: tienda con tu marca, panel propio y pago con Flow o Mercado Pago, en 2 pagos.',
  'Página web profesional con tu marca. Y si vendes productos, tu tienda online desde $350.000 + IVA.',
  'En Chile, Shopify Basic cobra 2% extra por venta si usas Flow o Mercado Pago.* Con tu tienda propia pagas solo la comisión de tu pasarela.',
  'Pago en 2 partes', 'El código y el dominio quedan a tu nombre', '2 rondas de correcciones completas', 'Hablas directo con quien programa', 'Espíritu Digital SpA · RUT 78.484.436-6',
  'Tiendas reales, funcionando hoy', 'No son maquetas. Entra, navega y agrega algo al carro.',
  'Imprenta con 10 categorías de productos, de tarjetas y pendones a timbres y talonarios. Carro de compras, pago con Flow y Mercado Pago, cotizador y guía para enviar archivos.',
  'Arte en vidrio hecho a mano. Catálogo por colecciones, carrito, pago con Flow, opción de pedir por WhatsApp y panel para subir obras nuevas.',
  'Miel cruda 100% natural, con tienda propia, carro de compras y pago en línea.',
  'También hacemos páginas web', 'Quiero una tienda así',
  'Todo lo que necesitas para vender online', 'Con tu marca: logo, colores y fotos tuyas. Nada de una plantilla que tienen miles.',
  'Te enseño a usarla: 1 hora por videollamada.', 'Y es tuya', 'Sin comisión por venta: solo pagas la de tu pasarela.',
  'Al terminar de pagar, el código, el dominio y la base de datos quedan a tu nombre.', 'Mantención opcional, con el primer mes incluido.',
  'Cotiza tu tienda por WhatsApp', 'Elige tu plan', 'Pagas 50% al partir y 50% al recibir tu tienda.',
  '$416.500 con IVA · o 2 pagos de $175.000 + IVA ($208.250 con IVA cada uno)', 'Para quién: quien vende por Instagram o WhatsApp y quiere su tienda.',
  'Hasta 20 productos con variantes, cargados por mí', 'Para crecer', '$571.200 con IVA', 'Todo lo del Esencial, más:',
  'Integración con tu ERP, courier o boleta automática. Alcance a tu medida.', 'Cotizar plan Empresa',
  'Incluido en todos los planes: optimización de tu ficha de Google y 1 mes de mantención.', 'Qué no incluye',
  '¿Todavía no necesitas tienda? Página web profesional desde $150.000 + IVA ($178.500 con IVA).', 'Cotizar página web',
  '$178.500 con IVA', '50% al partir y 50% al recibirla · primer avance a las 2 semanas de recibir tu material · 2 rondas de correcciones completas · 1 mes de mantención incluido; después $14.990 + IVA al mes ($17.838 con IVA), solo si la pides',
  'Quiero mi página web', 'Así de simple', 'Conversamos 15 minutos. Me cuentas qué vendes y te digo qué plan te sirve. Sin compromiso.',
  'Ves tu portada antes de pagar. En 48 horas te muestro tu tienda con tu logo y tres de tus productos.',
  'El plazo te lo doy por escrito en la propuesta, según tu material, antes de que pagues.', 'Partamos por los 15 minutos',
  'Soy Cristian Sánchez, fundador de Espíritu Digital. Programo cada tienda y hablas directo conmigo, del primer mensaje a la entrega. Desde el Cajón del Maipo, para todo Chile.',
  'por $19.990 + IVA al mes ($23.788 con IVA)', 'por $14.990 + IVA al mes ($17.838 con IVA)',
  'Construir una tienda toma semanas. Si la quieres lista para marzo, conversemos esta semana.', '¿Prefieres que te escriba yo?',
  'Tu nombre', 'Tu WhatsApp (+56 9 ...)', '¿Qué vendes?', '¿Ya vendes online?', 'Sí, por Instagram o WhatsApp', 'Sí, tengo tienda',
  '¿Cuándo quieres partir?', 'El próximo mes', 'Solo estoy cotizando', 'Presupuesto, sin IVA', 'Menos de $350.000', '$350.000 a $500.000', 'Más de $500.000',
  'Acepto que Espíritu Digital SpA use estos datos para responder mi consulta, según la política de privacidad.',
  'Enviar y recibir mi cotización', `Te escribo por WhatsApp en menos de 15 minutos, ${HORARIO}. No comparto tus datos.`,
  'ESPIRITU DIGITAL SPA · RUT 78.484.436-6 · +56 9 2811 7627 · espiritudigital.chile@gmail.com · Política de privacidad · Términos',
];
const PREGUNTAS = [
  '¿Qué necesito para partir?', '¿Cuánto demora?', '¿Qué costos quedan después?', '¿La tienda es mía?', '¿Puedo cargar mis productos yo?',
  '¿Flow o Mercado Pago?', '¿Por qué no Shopify u otra plataforma?', '¿Y si después quiero más funciones?', '¿Qué pasa si no me gusta el diseño?',
  '¿Trabajas con negocios de regiones?', '¿También hacen la publicidad?', '¿Cómo funciona la página web de $150.000 + IVA?',
];
// Lista "No hacemos" (02, sección 3) y promesas no autorizadas.
const PROHIBIDO = [/m[aá]s vendid/i, /quedan \d+ cupos?/i, /personas viendo/i, /garantizad/i, /los mejores/i, /calidad premium/i, /\+\s?100 clientes/i, /Google Partner/i, /\bdemo\b/i, /calculadora/i, /gratis/i];

const resultados = [];
const mediciones = { lcp: {}, cls: {}, lighthouse: {}, contraste: {}, brechas: {} };
function registrar(nombre, ok, detalle = '') {
  resultados.push({ nombre, ok: Boolean(ok), detalle });
  console.log(`${ok ? '  ✓' : '  ✗'} ${nombre}${detalle ? ' · ' + detalle : ''}`);
}
const decodificar = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const textoPlano = (html) =>
  decodificar(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ');
const leer = (r) => readFileSync(join(RAIZ, r), 'utf8');
const PAGINAS = ['tiendas-online.html', 'tiendas-online/casos.html', 'tiendas-online/planes.html', 'tiendas-online/gracias.html'];

function lum(rgb) {
  const c = rgb.map((v) => v / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contraste(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);

// ------------------------------------------------------------ 1. archivos ---
function pruebasEstaticas() {
  console.log('\n1. Archivos generados');
  const htmls = Object.fromEntries(PAGINAS.map((p) => [p, leer(p)]));
  for (const [ruta, html] of Object.entries(htmls)) {
    registrar(`${ruta}: sin TODO-CRISTIAN`, !html.includes('TODO-CRISTIAN'));
    registrar(`${ruta}: un solo <h1>`, (html.match(/<h1[\s>]/g) || []).length === 1);
    const imgs = html.match(/<img\b[^>]*>/g) || [];
    registrar(`${ruta}: cada <img> con ancho, alto y alt`, imgs.every((i) => /\swidth="\d+"/.test(i) && /\sheight="\d+"/.test(i) && /\salt="/.test(i)), `${imgs.length} imágenes`);
    const prioridad = imgs.filter((i) => i.includes('fetchpriority="high"'));
    const resto = imgs.filter((i) => !i.includes('fetchpriority="high"') && !i.includes('logo-64'));
    registrar(`${ruta}: imágenes bajo el pliegue con loading="lazy"`, resto.every((i) => i.includes('loading="lazy"')), `${prioridad.length} con fetchpriority`);
    registrar(`${ruta}: consentimiento sin marcar y sin ventanas emergentes`, !/type="checkbox"[^>]*\schecked/.test(html) && !/<dialog|window\.open|alert\(/.test(html));
    const texto = textoPlano(html);
    const prohibidos = PROHIBIDO.filter((r) => r.test(texto));
    registrar(`${ruta}: nada de la lista "No hacemos"`, prohibidos.length === 0, prohibidos.join(', '));
    registrar(`${ruta}: sin etiquetas de medición inventadas`, !/\bGTM-|\bG-[A-Z0-9]{6,}\b|clarity\.ms/.test(html));
  }
  const landing = htmls['tiendas-online.html'];
  const texto = textoPlano(landing);
  const faltan = LITERALES.filter((l) => !texto.includes(l));
  registrar('Landing: textos literales de 03 presentes', faltan.length === 0, faltan.length ? 'faltan: ' + faltan.join(' | ') : `${LITERALES.length} frases`);
  const faltanP = PREGUNTAS.filter((q) => !texto.includes(q));
  registrar('Landing: las 12 preguntas frecuentes (sin la de boleta)', faltanP.length === 0 && !texto.includes('¿Emiten boleta o factura?'), faltanP.join(' | '));
  for (const v of VARIANTES) registrar(`Landing: H1 de la variante ${v} en el HTML`, texto.includes(H1[v]));
  const tarjetaWeb = (landing.match(/<article class="tarjeta plan plan--web[\s\S]*?<\/article>/) || [''])[0];
  const textoWeb = textoPlano(tarjetaWeb);
  registrar('Tarjeta web: no promete lo que solo tiene la tienda', tarjetaWeb && !/código|base de datos|portada|vista previa|3 meses/i.test(textoWeb), textoWeb.slice(0, 60) + '…');
  registrar('Portada: sin plazo de entrega', !/2 semanas|48 horas/.test(textoPlano((landing.match(/<section class="portada[\s\S]*?<\/section>/) || [''])[0])));

  const canonicas = {
    'tiendas-online.html': 'https://espiritudigital.cl/tiendas-online',
    'tiendas-online/casos.html': 'https://espiritudigital.cl/tiendas-online/casos',
    'tiendas-online/planes.html': 'https://espiritudigital.cl/tiendas-online/planes',
  };
  for (const [ruta, url] of Object.entries(canonicas)) {
    registrar(`${ruta}: canónica sin parámetros e indexable`, htmls[ruta].includes(`<link rel="canonical" href="${url}">`) && htmls[ruta].includes('content="index, follow'));
  }
  registrar('gracias: noindex y sin canónica', htmls['tiendas-online/gracias.html'].includes('<meta name="robots" content="noindex">') && !htmls['tiendas-online/gracias.html'].includes('rel="canonical"'));
  registrar('Títulos de 03', landing.includes('<title>Tienda online a medida desde $350.000 + IVA | Espíritu Digital</title>') && htmls['tiendas-online/casos.html'].includes('<title>Tiendas y páginas web que hicimos | Espíritu Digital</title>') && htmls['tiendas-online/planes.html'].includes('<title>Planes y precios de tiendas online | Espíritu Digital</title>'));
  registrar('Meta descripción de 03', landing.includes('content="Tienda online con tu marca, panel propio y pago con Flow o Mercado Pago. Sin comisión de plataforma. Código y dominio a tu nombre. Cotiza por WhatsApp."'));
  registrar('Open Graph con imagen de 1200 × 630', /og:image" content="https:\/\/espiritudigital\.cl\/assets\/tiendas-online\/img\/og-tiendas-online\.jpg"/.test(landing) && landing.includes('og:image:width" content="1200"'));

  const ld = JSON.parse(landing.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const tipos = ld['@graph'].map((n) => n['@type']);
  const servicio = ld['@graph'].find((n) => n['@type'] === 'Service');
  const faq = ld['@graph'].find((n) => n['@type'] === 'FAQPage');
  const ofertasOk = servicio && servicio.offers.length === 2 && servicio.offers.every((o) => o.priceCurrency === 'CLP' && o.priceSpecification.valueAddedTaxIncluded === false);
  registrar('JSON-LD: Organization, Service con Offer (CLP, sin IVA) y FAQPage', tipos.includes('Organization') && ofertasOk && faq, `${tipos.join(', ')}; ofertas ${servicio?.offers.map((o) => o.price).join(' y ')}`);
  registrar('JSON-LD: FAQPage = preguntas visibles, sin boleta', faq.mainEntity.length === PREGUNTAS.length && faq.mainEntity.every((q, i) => q.name === PREGUNTAS[i]));

  const js = readFileSync(join(RAIZ, 'assets/tiendas-online/js/landing.js'));
  const kb = gzipSync(js, { level: 9 }).length / 1024;
  mediciones.jsKbGzip = Number(kb.toFixed(2));
  registrar('JavaScript propio ≤ 15 KB comprimido', kb <= 15, `${kb.toFixed(1)} KB gzip (${(js.length / 1024).toFixed(1)} KB sin comprimir)`);
  const fuentes = new Set(landing.match(/poppins-\d+\.woff2/g));
  registrar('Fuentes: Poppins autoalojada, 2 pesos, swap y precarga', fuentes.size === 2 && /font-display:swap/.test(landing) && /rel="preload" href="\/assets\/tiendas-online\/fuentes\/poppins-400\.woff2" as="font"/.test(landing) && /rel="preload" href="\/assets\/tiendas-online\/fuentes\/poppins-600\.woff2" as="font"/.test(landing));
  registrar('Variantes: script en <head> antes del CSS', landing.indexOf('data-h') < landing.indexOf('<style>') && landing.indexOf('setAttribute("data-h"') < landing.indexOf('</head>'));

  // Contraste AA, calculado sobre los colores de la marca.
  const pares = [
    ['Botón: blanco sobre magenta #E6007E', [255, 255, 255], [230, 0, 126], 4.5],
    ['Magenta sobre negro (solo texto grande)', [230, 0, 126], [0, 0, 0], 3],
    ['Monto magenta sobre tarjeta #141414 (texto grande)', [230, 0, 126], [20, 20, 20], 3],
    ['Texto secundario #d0d0d0 sobre tarjeta', [208, 208, 208], [20, 20, 20], 4.5],
    ['Texto terciario #ababab sobre tarjeta', [171, 171, 171], [20, 20, 20], 4.5],
    ['Error #ff95aa sobre tarjeta', [255, 149, 170], [20, 20, 20], 4.5],
    ['Íconos rosados #FF5CB0 sobre negro', [255, 92, 176], [0, 0, 0], 3],
    ['Borde de campos #767676 sobre negro', [118, 118, 118], [0, 0, 0], 3],
  ];
  for (const [nombre, a, b, minimo] of pares) {
    const r = contraste(a, b);
    mediciones.contraste[nombre] = Number(r.toFixed(2));
    registrar(`Contraste: ${nombre}`, r >= minimo, `${r.toFixed(2)}:1 (mínimo ${minimo}:1)`);
  }
}

// ------------------------------------------------------ 2. producción ---
function pruebaProduccion() {
  console.log('\n2. Build de producción');
  const huella = () => PAGINAS.map((p) => createHash('sha1').update(leer(p)).digest('hex')).join();
  const antes = huella();
  const r = spawnSync(process.execPath, [join(RAIZ, 'scripts/build-landing.mjs'), '--produccion'], { encoding: 'utf8' });
  const salida = r.stdout + r.stderr;
  mediciones.produccion = salida.trim();
  registrar('--produccion falla hoy', r.status !== 0, `código ${r.status}`);
  registrar('--produccion explica: falta gtm_id', /gtm_id/.test(salida));
  registrar('--produccion explica: casos sin permiso', /permiso distinto de true/.test(salida));
  registrar('--produccion no escribe archivos al fallar', huella() === antes);
  const comprobar = spawnSync(process.execPath, [join(RAIZ, 'scripts/build-landing.mjs'), '--comprobar'], { encoding: 'utf8' });
  registrar('Los HTML del repositorio coinciden con la vista previa', comprobar.status === 0, (comprobar.stdout + comprobar.stderr).trim());
}

// ------------------------------------- 2b. producción con todo resuelto ---
// Datos de prueba en una carpeta temporal (nunca se escriben en data/ ni se publican):
// comprueba que --produccion pasa cuando no falta nada y que las secciones condicionales
// (reseñas, estrellas, logos, testimonio, boleta, foto, video y GTM) se generan bien.
function pruebaProduccionCompleta() {
  console.log('\n2b. Producción con todo resuelto (datos de prueba temporales)');
  const datos = mkdtempSync(join(tmpdir(), 'landing-datos-'));
  const salida = mkdtempSync(join(tmpdir(), 'landing-salida-'));
  try {
    const dato = (n) => JSON.parse(leer('data/' + n));
    const cfg = dato('config.json');
    cfg.gtm_id = 'GTM-PRUEBA1';
    cfg.boleta_activa = true;
    cfg.fundador = { ...cfg.fundador, foto: 'assets/tiendas-online/img/caso-mielu-celular-390.webp', video: 'caso-mistergas-video.mp4', video_portada: 'caso-mistergas-poster.webp', dato_ao_con_permiso: true };
    const casos = dato('casos.json');
    for (const c of [...casos.tiendas, ...casos.webs]) c.permiso = true;
    const resenas = { ficha_url: 'https://example.com/ficha', n: 5, promedio: 4.9, resenas: [1, 2, 3].map((i) => ({ texto: `Reseña de prueba ${i}`, nombre: `Cliente ${i}`, fecha: `2026-11-0${i}` })) };
    const logos = [{ nombre: 'Logo de prueba', archivo: 'assets/tiendas-online/img/logo-64.webp', permiso: true }];
    const testimonios = [{ nombre: 'Persona de prueba', negocio: 'Negocio de prueba', video: 'caso-mistergas-video.mp4', portada: 'caso-mistergas-poster.webp', transcripcion: 'Transcripción de prueba.', permiso: true }];
    for (const [n, v] of Object.entries({ 'config.json': cfg, 'casos.json': casos, 'resenas.json': resenas, 'logos.json': logos, 'testimonios.json': testimonios })) writeFileSync(join(datos, n), JSON.stringify(v));
    const r = spawnSync(process.execPath, [join(RAIZ, 'scripts/build-landing.mjs'), '--produccion', '--datos', datos, '--salida', salida], { encoding: 'utf8' });
    registrar('--produccion pasa cuando no falta nada', r.status === 0, r.status === 0 ? '' : (r.stdout + r.stderr).slice(0, 400));
    if (r.status !== 0) return;
    const html = readFileSync(join(salida, 'tiendas-online.html'), 'utf8');
    const texto = textoPlano(html);
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    const faq = ld['@graph'].find((n) => n['@type'] === 'FAQPage');
    registrar('Con gtm_id: snippet de GTM y noscript', html.includes("'dataLayer','GTM-PRUEBA1'") && html.includes('ns.html?id=GTM-PRUEBA1'));
    registrar('requiere_arreglo: true oculta el caso en producción', !texto.includes('Vitrales del Cajón · Cajón del Maipo'));
    registrar('3 reseñas o más: bloque "Lo que dicen nuestros clientes"', texto.includes('Lo que dicen nuestros clientes') && texto.includes('Reseña de prueba 3') && texto.includes('Ver todas en Google'));
    registrar('5 reseñas o más: estrellas en la franja', texto.includes('★ 4,9 en Google · 5 reseñas'));
    registrar('boleta_activa: true agrega la pregunta, también en el JSON-LD', texto.includes('¿Emiten boleta o factura?') && faq.mainEntity.length === 13);
    registrar('Logos, testimonio, foto, video y dato de AO aparecen con datos', /<ul class="logos"/.test(html) && texto.includes('Transcripción de prueba.') && html.includes('caso-mielu-celular-390.webp" width') && html.includes('data-video="/caso-mistergas-video.mp4"') && texto.includes('También gestiono Google Ads para negocios como AO Construcciones.'));
    registrar('La salida de producción no tiene TODO-CRISTIAN', ['tiendas-online.html', 'tiendas-online/casos.html', 'tiendas-online/planes.html', 'tiendas-online/gracias.html'].every((p) => !readFileSync(join(salida, p), 'utf8').includes('TODO-CRISTIAN')));
  } finally {
    rmSync(datos, { recursive: true, force: true });
    rmSync(salida, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------- navegador ---
const MOVIL = { viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' };
const ESCRITORIO = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };

async function nuevoContexto(navegador, base, opciones) {
  const contexto = await navegador.newContext({ ...opciones, locale: 'es-CL' });
  const eventos = [];
  await contexto.exposeBinding('__registrarEvento', (_fuente, json) => {
    try {
      const { __pagina, ...datos } = JSON.parse(json);
      eventos.push({ url: __pagina, ...datos });
    } catch {}
  });
  await contexto.addInitScript(() => {
    const dl = (window.dataLayer = window.dataLayer || []);
    const original = dl.push;
    dl.push = function (...items) {
      for (const item of items) {
        try {
          window.__registrarEvento(JSON.stringify(Object.assign({}, item, { __pagina: location.pathname + location.search })));
        } catch {}
      }
      return original.apply(dl, items);
    };
  });
  // Pruebas herméticas: nada sale a internet (wa.me y sitios de clientes responden en local).
  await contexto.route((url) => !url.href.startsWith(base), (ruta) => ruta.fulfill({ status: 200, contentType: 'text/html', body: '<title>externo</title>ok' }));
  return { contexto, eventos };
}

async function enlacesWa(pagina) {
  return pagina.$$eval('a[data-wa]', (as) =>
    as.map((a) => {
      const u = new URL(a.href);
      const r = a.getBoundingClientRect();
      const estilo = getComputedStyle(a);
      return {
        cta: a.dataset.wa,
        plan: a.dataset.plan || '',
        numero: u.pathname.slice(1),
        texto: u.searchParams.get('text'),
        visible: r.width > 0 && r.height > 0 && estilo.visibility !== 'hidden',
      };
    })
  );
}

// Con h=web, la portada y los botones genéricos de cierre piden cotizar una página web.
const CTA_CON_WEB = new Set(['portada', 'cierre', 'formulario_error', 'gracias']);
function esperado(cta, plan, h) {
  if (h === 'web' && CTA_CON_WEB.has(cta)) return MSG.portada_web;
  if (cta === 'portada') return MSG.portada;
  if (cta === 'plan') return MSG['plan_' + plan];
  return MSG[cta];
}

async function medirCls(pagina) {
  return pagina.evaluate(
    () =>
      new Promise((ok) => {
        let cls = 0;
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value;
        }).observe({ type: 'layout-shift', buffered: true });
        setTimeout(() => ok(cls), 600);
      })
  );
}

async function pruebasVariantes(navegador, base) {
  console.log('\n3. Variantes ?h= en 360 px y 1440 px');
  for (const [nombreVista, opciones] of [['360', MOVIL], ['1440', ESCRITORIO]]) {
    const { contexto, eventos } = await nuevoContexto(navegador, base, opciones);
    const pagina = await contexto.newPage();
    for (const h of VARIANTES) {
      await pagina.goto(`${base}/tiendas-online?h=${h}`, { waitUntil: 'load' });
      await pagina.evaluate(() => document.fonts.ready);
      const visibleH1 = (await pagina.locator('h1').innerText()).trim();
      const ocultos = await pagina.$$eval('h1 > span', (spans) => spans.filter((s) => s.getClientRects().length > 0).length);
      const cls = await medirCls(pagina);
      mediciones.cls[`${nombreVista}-${h}`] = Number(cls.toFixed(4));
      registrar(`${nombreVista} px · h=${h}: H1 correcto y los demás ocultos`, visibleH1 === H1[h] && ocultos === 1, visibleH1);
      registrar(`${nombreVista} px · h=${h}: sin salto visual (CLS)`, cls < 0.01, cls.toFixed(4));
      const enlaces = await enlacesWa(pagina);
      const malos = enlaces.filter((e) => e.numero !== '56928117627' || e.texto !== esperado(e.cta, e.plan, h));
      registrar(`${nombreVista} px · h=${h}: ${enlaces.length} enlaces de WhatsApp con su mensaje exacto`, enlaces.length >= 10 && malos.length === 0, malos.map((m) => `${m.cta}: ${m.texto}`).join(' | '));
      const flotante = await pagina.locator('a.flotante').boundingBox();
      const vista = pagina.viewportSize();
      const flotanteOk = flotante && flotante.x >= 0 && flotante.y >= 0 && flotante.x + flotante.width <= vista.width && flotante.y + flotante.height <= vista.height;
      registrar(`${nombreVista} px · h=${h}: botón flotante visible`, flotanteOk && (await pagina.locator('a.flotante').getAttribute('aria-label')) === 'Escríbeme por WhatsApp');
      const vv = eventos.filter((e) => e.event === 'view_variant' && e.url.includes(`h=${h}`));
      registrar(`${nombreVista} px · h=${h}: evento view_variant`, vv.length === 1 && vv[0].h === h);
      const tarjetaWeb = await pagina.locator('.web-tarjeta').isVisible();
      const lineaWeb = await pagina.locator('.linea-web').isVisible();
      const franjaWeb = await pagina.locator('.franja-item.v-web').isVisible();
      const franjaCodigo = await pagina.locator('.franja-item.v-noweb').isVisible();
      const esWeb = h === 'web';
      registrar(
        `${nombreVista} px · h=${h}: tarjeta web, línea web y franja según la variante`,
        tarjetaWeb === esWeb && lineaWeb === !esWeb && franjaWeb === esWeb && franjaCodigo === !esWeb
      );
      if (esWeb) {
        const orden = await pagina.evaluate(() => document.querySelector('.web-tarjeta').compareDocumentPosition(document.querySelector('.planes')) & Node.DOCUMENT_POSITION_FOLLOWING);
        registrar(`${nombreVista} px · h=web: la tarjeta web va antes de los planes`, Boolean(orden));
      }
      const scrollAncho = await pagina.evaluate(() => document.documentElement.scrollWidth);
      registrar(`${nombreVista} px · h=${h}: sin desborde horizontal`, scrollAncho <= vista.width, `${scrollAncho}px`);
    }
    // Nunca más de una pantalla de celular sin un botón de contacto a la vista.
    if (nombreVista === '360') {
      await pagina.goto(`${base}/tiendas-online`, { waitUntil: 'load' });
      const r = await pagina.evaluate(async () => {
        const alto = innerHeight;
        const total = document.documentElement.scrollHeight;
        const fallas = [];
        const contactos = () => [...document.querySelectorAll('a[data-wa], a[href^="tel:"], #form-cotizar button[type="submit"]')];
        for (let y = 0; y <= total - alto; y += Math.round(alto / 3)) {
          window.scrollTo(0, y);
          await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
          const aLaVista = contactos().filter((el) => {
            const b = el.getBoundingClientRect();
            if (!b.width || !b.height || b.bottom <= 0 || b.top >= alto) return false;
            const cx = Math.min(Math.max(b.left + b.width / 2, 0), innerWidth - 1);
            const cy = Math.min(Math.max(b.top + b.height / 2, 0), alto - 1);
            const arriba = document.elementFromPoint(cx, cy);
            return arriba && (arriba === el || el.contains(arriba));
          });
          if (!aLaVista.length) fallas.push(y);
        }
        window.scrollTo(0, 0);
        // Distancia entre botones del flujo (sin contar el flotante), solo informativa.
        const enFlujo = contactos()
          .filter((el) => !el.classList.contains('flotante') && el.getClientRects().length && !el.closest('[hidden]'))
          .map((el) => {
            const b = el.getBoundingClientRect();
            return { top: b.top + scrollY, bottom: b.bottom + scrollY, cta: el.dataset.wa || el.textContent.trim().slice(0, 20) };
          })
          .sort((a, b) => a.top - b.top);
        let mayor = { px: 0 };
        for (let i = 1; i < enFlujo.length; i++) {
          const px = enFlujo[i].top - enFlujo[i - 1].bottom;
          if (px > mayor.px) mayor = { px: Math.round(px), entre: `${enFlujo[i - 1].cta} → ${enFlujo[i].cta}` };
        }
        return { fallas, mayor, alto, total };
      });
      mediciones.brechas = r.mayor;
      registrar('360 px: en toda la página hay un botón de contacto a la vista (máximo una pantalla entre botones)', r.fallas.length === 0, r.fallas.length ? `sin botón en y=${r.fallas.join(', ')}` : `página de ${r.total}px revisada cada ${Math.round(r.alto / 3)}px`);
      console.log(`    (informativo) mayor distancia entre botones del flujo, sin el flotante: ${r.mayor.px}px = ${(r.mayor.px / r.alto).toFixed(2)} pantallas (${r.mayor.entre})`);
    }
    await contexto.close();
  }
}

async function pruebasParametros(navegador, base) {
  console.log('\n4. Origen y referido en los mensajes de WhatsApp');
  const casosUrl = [
    ['?gclid=prueba', true, ''],
    ['?gbraid=abc', true, ''],
    ['?wbraid=abc', true, ''],
    ['?utm_source=google&utm_medium=cpc', true, ''],
    ['?utm_source=facebook', false, ''],
    ['?ref=juan', false, 'juan'],
    ['?h=web&gclid=prueba&ref=maria-jose', true, 'maria-jose'],
  ];
  for (const [consulta, google, ref] of casosUrl) {
    const { contexto } = await nuevoContexto(navegador, base, MOVIL);
    const pagina = await contexto.newPage();
    await pagina.goto(`${base}/tiendas-online${consulta}`, { waitUntil: 'load' });
    const h = new URLSearchParams(consulta).get('h') || 'tienda';
    const enlaces = await enlacesWa(pagina);
    const malos = enlaces.filter((e) => e.texto !== (google ? 'Vengo de Google. ' : '') + esperado(e.cta, e.plan, h) + (ref ? ` Vengo de parte de ${ref}.` : ''));
    registrar(`${consulta}: ${google ? 'con' : 'sin'} "Vengo de Google. "${ref ? ' y con "Vengo de parte de ' + ref + '."' : ''}`, malos.length === 0 && enlaces.length > 0, malos.slice(0, 2).map((m) => m.texto).join(' | '));
    await contexto.close();
  }
  // Persistencia en la sesión: /casos, /planes y gracias heredan el origen y el referido.
  const { contexto } = await nuevoContexto(navegador, base, MOVIL);
  const pagina = await contexto.newPage();
  await pagina.goto(`${base}/tiendas-online?h=precio&gclid=prueba&utm_source=google&ref=juan`, { waitUntil: 'load' });
  const guardado = await pagina.evaluate(() => ({ gclid: sessionStorage.getItem('ed_gclid'), utm_source: sessionStorage.getItem('ed_utm_source'), h: sessionStorage.getItem('ed_h'), ref: sessionStorage.getItem('ed_ref') }));
  registrar('?h=precio&gclid=prueba&utm_source=google llega a la página y a sessionStorage', guardado.gclid === 'prueba' && guardado.utm_source === 'google' && guardado.h === 'precio' && guardado.ref === 'juan' && (await pagina.locator('h1').innerText()).trim() === H1.precio);
  for (const ruta of ['/tiendas-online/casos', '/tiendas-online/planes', '/tiendas-online/gracias']) {
    await pagina.goto(base + ruta, { waitUntil: 'load' });
    const enlaces = await enlacesWa(pagina);
    const ok = enlaces.length > 0 && enlaces.every((e) => e.texto.startsWith('Vengo de Google. ') && e.texto.endsWith(' Vengo de parte de juan.') && e.texto.includes(esperado(e.cta, e.plan, 'tienda')));
    registrar(`${ruta}: hereda "Vengo de Google." y el referido desde sessionStorage`, ok, enlaces.map((e) => e.cta).join(', '));
  }
  // Las URL de los anuncios y de los enlaces de sitio responden 200 sin redirecciones.
  const urls = ['/tiendas-online?h=tienda', '/tiendas-online?h=carrito', '/tiendas-online?h=precio', '/tiendas-online?h=web', '/tiendas-online?h=alternativa', '/tiendas-online/casos', '/tiendas-online/planes', '/tiendas-online/planes?plan=pro'];
  for (const u of urls) {
    const r = await fetch(`${base}${u}${u.includes('?') ? '&' : '?'}gclid=prueba&utm_source=google`, { redirect: 'manual' });
    registrar(`GET ${u} + gclid/utm → 200 sin redirección`, r.status === 200, String(r.status));
  }
  await contexto.close();
}

async function pruebasClics(navegador, base) {
  console.log('\n5. Clics: dataLayer y beacon a /api/wa-click');
  await fetch(`${base}/__simulada/reiniciar`, { method: 'POST' });
  const { contexto, eventos } = await nuevoContexto(navegador, base, MOVIL);
  const pagina = await contexto.newPage();
  const beacons = [];
  pagina.on('request', (r) => {
    if (r.url().endsWith('/api/wa-click')) beacons.push(r);
  });
  await pagina.goto(`${base}/tiendas-online?gclid=prueba&utm_source=google&utm_campaign=tramo1&utm_term=tienda%20online%20a%20medida&ref=juan`, { waitUntil: 'load' });
  const total = await pagina.locator('a[data-wa]').count();
  const clics = [];
  for (let i = 0; i < total; i++) {
    const enlace = pagina.locator('a[data-wa]').nth(i);
    if (!(await enlace.isVisible())) continue;
    const cta = await enlace.getAttribute('data-wa');
    const plan = (await enlace.getAttribute('data-plan')) || '';
    if (cta !== 'flotante') await enlace.evaluate((e) => e.scrollIntoView({ block: 'center' }));
    const [popup] = await Promise.all([pagina.waitForEvent('popup', { timeout: 4000 }).catch(() => null), enlace.click()]);
    if (popup) await popup.close();
    clics.push({ cta, plan });
  }
  await pagina.waitForTimeout(600);
  const registro = await (await fetch(`${base}/__simulada/registro`)).json();
  const wa = eventos.filter((e) => e.event === 'whatsapp_click');
  registrar(`${clics.length} clics de WhatsApp → ${wa.length} eventos whatsapp_click`, wa.length === clics.length && wa.every((e, i) => e.cta_location === clics[i].cta && e.plan === clics[i].plan && Object.keys(e).sort().join() === 'cta_location,event,plan,url'));
  registrar(`${clics.length} clics → ${registro.wa.length} beacons recibidos en /api/wa-click`, registro.wa.length === clics.length && beacons.length === clics.length);
  const malos = registro.wa.filter((b, i) => {
    const d = b.datos || {};
    return Object.keys(d).sort().join() !== [...CLAVES_WA].sort().join() || d.cta_location !== clics[i].cta || d.plan !== clics[i].plan || d.gclid !== 'prueba' || d.utm_source !== 'google' || d.utm_campaign !== 'tramo1' || d.utm_term !== 'tienda online a medida' || d.ref !== 'juan' || d.h !== 'tienda' || d.landing_path !== '/tiendas-online';
  });
  registrar('Beacon con el contrato exacto (cta_location, plan, ref, gclid, utm_*, h, landing_path)', malos.length === 0, malos.length ? JSON.stringify(malos[0].datos) : clics.map((c) => c.cta + (c.plan ? ':' + c.plan : '')).join(', '));

  const [popupCaso] = await Promise.all([pagina.waitForEvent('popup', { timeout: 4000 }).catch(() => null), pagina.locator('a[data-caso="imprenta-express"]').first().click()]);
  if (popupCaso) await popupCaso.close();
  registrar('case_click con el caso', eventos.some((e) => e.event === 'case_click' && e.caso === 'imprenta-express'));
  await pagina.evaluate(() => document.addEventListener('click', (e) => e.target.closest('a[href^="tel:"]') && e.preventDefault()));
  await pagina.locator('a[href^="tel:"]').click();
  registrar('tel_click al tocar el teléfono', eventos.filter((e) => e.event === 'tel_click').length === 1);
  await pagina.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await pagina.waitForTimeout(300);
  await pagina.evaluate(() => window.scrollTo(0, 0));
  await pagina.waitForTimeout(200);
  registrar('scroll_50 una sola vez', eventos.filter((e) => e.event === 'scroll_50').length === 1);
  const personales = eventos.filter((e) => /nombre|whatsapp\b|telefono|correo|email/i.test(Object.keys(e).join()));
  registrar('dataLayer sin datos personales', personales.length === 0);
  await contexto.close();
}

async function pruebasFormulario(navegador, base) {
  console.log('\n6. Formulario');
  await fetch(`${base}/__simulada/reiniciar`, { method: 'POST' });
  const { contexto, eventos } = await nuevoContexto(navegador, base, MOVIL);
  const pagina = await contexto.newPage();
  const url = `${base}/tiendas-online?h=precio&gclid=prueba&utm_source=google&utm_campaign=tramo1&utm_term=precio%20tienda%20online&ref=juan`;
  await pagina.goto(url, { waitUntil: 'load' });
  await pagina.locator('#form-cotizar').scrollIntoViewIfNeeded();
  const errores = () =>
    pagina.$$eval('#form-cotizar .error', (ps) => Object.fromEntries(ps.filter((p) => !p.hidden).map((p) => [p.id.slice(2), p.textContent])));
  const enviar = () => pagina.locator('#form-cotizar button[type="submit"]').click();

  await enviar();
  let e = await errores();
  const esperados = { nombre: ERR.texto, whatsapp: ERR.whatsapp, que_vende: ERR.texto, vende_online: ERR.opcion, plazo: ERR.opcion, presupuesto: ERR.opcion, consentimiento: ERR.consentimiento };
  registrar('Envío vacío: un error junto a cada campo', JSON.stringify(e) === JSON.stringify(esperados), JSON.stringify(e));
  registrar('Envío vacío: el foco va al primer campo con error', (await pagina.evaluate(() => document.activeElement.id)) === 'f-nombre');
  registrar('Campos con aria-invalid y error asociado', (await pagina.locator('#f-whatsapp').getAttribute('aria-invalid')) === 'true' && (await pagina.locator('#f-whatsapp').getAttribute('aria-describedby')) === 'e-whatsapp');

  await pagina.fill('#f-nombre', 'Ana Prueba');
  await pagina.fill('#f-que_vende', 'Velas aromáticas');
  await pagina.check('input[name="vende_online"][value="instagram_whatsapp"]');
  await pagina.check('input[name="plazo"][value="este_mes"]');
  await pagina.check('input[name="presupuesto"][value="350_500"]');
  for (const malo of ['812345678', '9123', '+56 2 2293 5631', '99999999999']) {
    await pagina.fill('#f-whatsapp', malo);
    await enviar();
    e = await errores();
    registrar(`WhatsApp "${malo}" → "${ERR.whatsapp}"`, e.whatsapp === ERR.whatsapp);
  }
  await pagina.fill('#f-whatsapp', '+56 9 1234 5678');
  await enviar();
  e = await errores();
  registrar(`Sin la casilla → "${ERR.consentimiento}" (y el WhatsApp válido ya no marca error)`, JSON.stringify(e) === JSON.stringify({ consentimiento: ERR.consentimiento }), JSON.stringify(e));
  let registro = await (await fetch(`${base}/__simulada/registro`)).json();
  registrar('Con errores no se envía nada a /api/lead', registro.lead.length === 0);
  await pagina.check('#f-consentimiento');

  // 400 del servidor: el mensaje aparece junto al campo.
  await fetch(`${base}/__simulada/siguiente?estado=400&campos=whatsapp`, { method: 'POST' });
  await enviar();
  await pagina.waitForFunction(() => !document.getElementById('e-whatsapp').hidden);
  registrar('400 {campos:["whatsapp"]} → error de 03 junto al campo', (await errores()).whatsapp === ERR.whatsapp && pagina.url().startsWith(url));
  await pagina.fill('#f-whatsapp', '912345678');
  for (const estado of [429, 500, 'red']) {
    if (estado === 'red') await pagina.route('**/api/lead', (r) => r.abort('failed'), { times: 1 });
    else await fetch(`${base}/__simulada/siguiente?estado=${estado}`, { method: 'POST' });
    await enviar();
    await pagina.locator('#form-falla').waitFor({ state: 'visible' });
    const texto = new URL(await pagina.locator('#form-falla a[data-wa]').getAttribute('href')).searchParams.get('text');
    registrar(`${estado === 'red' ? 'Red caída' : estado} → mensaje con botón de WhatsApp`, texto === 'Vengo de Google. ' + MSG.cierre + ' Vengo de parte de juan.' && (await pagina.locator('#form-cotizar button[type="submit"]').isEnabled()));
  }
  registrar('generate_lead no se empuja si el envío falla', !eventos.some((x) => x.event === 'generate_lead'));

  // Envío correcto: respeta el mínimo de 3 segundos desde que se mostró el formulario.
  await pagina.waitForTimeout(3200);
  await fetch(`${base}/__simulada/reiniciar`, { method: 'POST' });
  await Promise.all([pagina.waitForURL(`${base}/tiendas-online/gracias`), enviar()]);
  await pagina.waitForLoadState('load');
  registro = await (await fetch(`${base}/__simulada/registro`)).json();
  const lead = registro.lead[0]?.datos || {};
  const claves = Object.keys(lead).sort().join();
  registrar('POST /api/lead con exactamente las claves del contrato', claves === [...CLAVES_LEAD].sort().join(), claves);
  const valoresOk =
    lead.nombre === 'Ana Prueba' && lead.whatsapp === '+56912345678' && lead.que_vende === 'Velas aromáticas' && lead.vende_online === 'instagram_whatsapp' && lead.plazo === 'este_mes' &&
    lead.presupuesto === '350_500' && lead.plan_interes === '' && lead.consentimiento === true && lead.hp === '' && typeof lead.t0 === 'number' && lead.h === 'precio' && lead.gclid === 'prueba' &&
    lead.utm_source === 'google' && lead.utm_campaign === 'tramo1' && lead.utm_term === 'precio tienda online' && lead.ref === 'juan' && lead.landing_path === '/tiendas-online' && lead.gbraid === '' && lead.wbraid === '';
  registrar('Valores del lead (WhatsApp normalizado, UTM, h, ref, consentimiento, trampa vacía)', valoresOk, JSON.stringify(lead));
  registrar('El lead respeta el mínimo de 3 segundos (no se descarta)', registro.lead[0] && registro.lead[0].descartado === false);
  const h1 = (await pagina.locator('h1').innerText()).trim();
  registrar('Gracias muestra el nombre (desde sessionStorage)', h1 === `¡Listo, Ana Prueba! Te escribo en menos de 15 minutos, ${HORARIO}.`, h1);
  registrar('El nombre nunca va en la URL', !/ana|prueba/i.test(pagina.url()));
  const leads = () => eventos.filter((x) => x.event === 'generate_lead');
  registrar('generate_lead una vez, antes de redirigir, sin datos personales', leads().length === 1 && leads()[0].url === '/tiendas-online?' + url.split('?')[1] && Object.keys(leads()[0]).sort().join() === 'event,plan_interes,plazo,presupuesto,url' && leads()[0].presupuesto === '350_500' && leads()[0].plazo === 'este_mes');
  await pagina.reload({ waitUntil: 'load' });
  registrar('Recargar gracias no repite generate_lead', leads().length === 1);
  await contexto.close();

  // plan_interes: un clic en un plan queda como interés del lead.
  const otro = await nuevoContexto(navegador, base, MOVIL);
  const p2 = await otro.contexto.newPage();
  await p2.goto(`${base}/tiendas-online/planes?plan=pro`, { waitUntil: 'load' });
  await p2.goto(`${base}/tiendas-online`, { waitUntil: 'load' });
  await fetch(`${base}/__simulada/reiniciar`, { method: 'POST' });
  await p2.locator('#form-cotizar').scrollIntoViewIfNeeded();
  await p2.fill('#f-nombre', 'Luis');
  await p2.fill('#f-whatsapp', '987654321');
  await p2.fill('#f-que_vende', 'Ropa');
  await p2.check('input[name="vende_online"][value="tienda"]');
  await p2.check('input[name="plazo"][value="cotizando"]');
  await p2.check('input[name="presupuesto"][value="mas_500"]');
  await p2.check('#f-consentimiento');
  await p2.waitForTimeout(3100);
  await Promise.all([p2.waitForURL(`${base}/tiendas-online/gracias`), p2.locator('#form-cotizar button[type="submit"]').click()]);
  const r2 = await (await fetch(`${base}/__simulada/registro`)).json();
  registrar('plan_interes = "pro" tras llegar con ?plan=pro', r2.lead[0]?.datos.plan_interes === 'pro');
  await otro.contexto.close();
}

async function pruebasPaginas(navegador, base) {
  console.log('\n7. /planes y /casos');
  const { contexto } = await nuevoContexto(navegador, base, MOVIL);
  const pagina = await contexto.newPage();
  const bordePro = () => pagina.locator('.plan--pro').evaluate((el) => getComputedStyle(el).borderTopColor);
  await pagina.goto(`${base}/tiendas-online/planes?plan=pro`, { waitUntil: 'load' });
  const conPlan = await bordePro();
  const cls = await medirCls(pagina);
  await pagina.goto(`${base}/tiendas-online/planes`, { waitUntil: 'load' });
  const sinPlan = await bordePro();
  registrar('?plan=pro destaca la tarjeta Pro (sin salto visual)', conPlan === 'rgb(230, 0, 126)' && sinPlan !== conPlan && cls < 0.01, `${conPlan} vs ${sinPlan}; CLS ${cls.toFixed(4)}`);
  registrar('/planes: H1, "Qué no incluye" abierto, costos después y línea web', (await pagina.locator('h1').innerText()).trim() === 'Planes y precios' && (await pagina.locator('details.no-incluye').getAttribute('open')) !== null && (await pagina.locator('.costos h2').innerText()).trim() === '¿Qué costos quedan después?' && (await pagina.locator('.linea-web').isVisible()));
  let enlaces = await enlacesWa(pagina);
  registrar('/planes: mensajes de WhatsApp exactos', enlaces.every((e) => e.texto === esperado(e.cta, e.plan, 'tienda')), enlaces.map((e) => e.cta + (e.plan ? ':' + e.plan : '')).join(', '));
  await pagina.goto(`${base}/tiendas-online/casos`, { waitUntil: 'load' });
  registrar('/casos: H1 y cierre "¿Quieres la tuya?"', (await pagina.locator('h1').innerText()).trim() === 'Tiendas reales, funcionando hoy' && (await pagina.locator('#titulo-cierre-casos').innerText()).trim() === '¿Quieres la tuya?');
  enlaces = await enlacesWa(pagina);
  registrar('/casos: mensajes de WhatsApp exactos', enlaces.every((e) => e.texto === esperado(e.cta, e.plan, 'tienda')), enlaces.map((e) => e.cta).join(', '));
  const externos = await pagina.$$eval('a[target="_blank"]', (as) => as.every((a) => (a.rel || '').includes('noopener')));
  registrar('Enlaces a pestaña nueva con rel="noopener"', externos);
  await pagina.goto(`${base}/tiendas-online`, { waitUntil: 'load' });
  const a11y = await pagina.evaluate(() => {
    const campos = [...document.querySelectorAll('#form-cotizar input:not([type="hidden"]):not([tabindex="-1"])')];
    const sinEtiqueta = campos.filter((c) => !(c.labels && c.labels.length));
    return { sinEtiqueta: sinEtiqueta.map((c) => c.name), h1: document.querySelectorAll('h1').length, lang: document.documentElement.lang };
  });
  registrar('Cada campo con su etiqueta, un solo H1 y lang="es-CL"', a11y.sinEtiqueta.length === 0 && a11y.h1 === 1 && a11y.lang === 'es-CL', a11y.sinEtiqueta.join(', '));
  await pagina.keyboard.press('Tab');
  await pagina.keyboard.press('Tab');
  const foco = await pagina.evaluate(() => {
    const el = document.activeElement;
    const s = getComputedStyle(el);
    return { tag: el.tagName, outline: s.outlineStyle, ancho: s.outlineWidth };
  });
  registrar('Foco visible con teclado', foco.outline !== 'none' && parseFloat(foco.ancho) >= 2, `${foco.tag} outline ${foco.outline} ${foco.ancho}`);
  await contexto.close();
}

async function pruebasRendimiento(navegador, base) {
  console.log('\n8. LCP y CLS en celular (CPU 4x más lenta, 4G simulada por CDP)');
  const rutas = VARIANTES.map((h) => `/tiendas-online?h=${h}`).concat(['/tiendas-online/casos', '/tiendas-online/planes']);
  for (const ruta of rutas) {
    const contexto = await navegador.newContext(MOVIL);
    const pagina = await contexto.newPage();
    const cdp = await contexto.newCDPSession(pagina);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await pagina.goto(base + ruta, { waitUntil: 'load', timeout: 60000 });
    const m = await pagina.evaluate(
      () =>
        new Promise((ok) => {
          let lcp = 0;
          let elemento = '';
          let cls = 0;
          new PerformanceObserver((l) => {
            for (const e of l.getEntries()) {
              lcp = e.startTime;
              elemento = e.element ? e.element.tagName.toLowerCase() + (e.element.id ? '#' + e.element.id : '') + (e.element.className && typeof e.element.className === 'string' ? '.' + e.element.className.split(' ')[0] : '') : '';
            }
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          new PerformanceObserver((l) => {
            for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value;
          }).observe({ type: 'layout-shift', buffered: true });
          setTimeout(() => ok({ lcp, cls, elemento }), 2500);
        })
    );
    mediciones.lcp[ruta] = Math.round(m.lcp);
    mediciones.cls['4g-' + ruta] = Number(m.cls.toFixed(4));
    registrar(`${ruta}: LCP < 2,5 s y CLS < 0,1`, m.lcp < 2500 && m.cls < 0.1, `LCP ${(m.lcp / 1000).toFixed(2)} s (${m.elemento}) · CLS ${m.cls.toFixed(3)}`);
    await contexto.close();
  }
}

// El servidor corre en este mismo proceso: Lighthouse se lanza con spawn asíncrono
// para no bloquear el bucle de eventos que atiende sus peticiones.
function ejecutar(comando, argumentos, opciones) {
  return new Promise((ok) => {
    const hijo = spawn(comando, argumentos, opciones);
    let salida = '';
    hijo.stdout.on('data', (d) => (salida += d));
    hijo.stderr.on('data', (d) => (salida += d));
    const reloj = setTimeout(() => hijo.kill('SIGKILL'), opciones.timeout || 240000);
    hijo.on('close', (codigo) => {
      clearTimeout(reloj);
      ok({ status: codigo, salida });
    });
  });
}

async function pruebasLighthouse(base) {
  console.log('\n9. Lighthouse móvil');
  const rutas = VARIANTES.map((h) => `/tiendas-online?h=${h}`).concat(['/tiendas-online/casos', '/tiendas-online/planes']);
  const carpeta = mkdtempSync(join(tmpdir(), 'lh-'));
  const cli = process.env.LIGHTHOUSE_CLI;
  const env = { ...process.env, CHROME_PATH: chromium.executablePath() };
  for (const ruta of rutas) {
    const salida = join(carpeta, 'informe.json');
    const banderas = [base + ruta, '--quiet', '--output=json', `--output-path=${salida}`, '--only-categories=performance,accessibility,seo,best-practices', '--chrome-flags=--headless=new --no-sandbox'];
    const r = cli
      ? await ejecutar(process.execPath, [cli, ...banderas], { env, timeout: 240000 })
      : await ejecutar('npx', ['--yes', 'lighthouse@13.6.0', ...banderas], { env, timeout: 400000 });
    if (r.status !== 0) {
      registrar(`Lighthouse ${ruta}`, false, r.salida.slice(-300));
      continue;
    }
    const informe = JSON.parse(readFileSync(salida, 'utf8'));
    const p = (c) => Math.round(informe.categories[c].score * 100);
    const notas = { rendimiento: p('performance'), accesibilidad: p('accessibility'), seo: p('seo'), practicas: p('best-practices'), lcp: informe.audits['largest-contentful-paint'].numericValue, cls: informe.audits['cumulative-layout-shift'].numericValue };
    mediciones.lighthouse[ruta] = notas;
    const fallidas = Object.values(informe.audits)
      .filter((a) => a.score !== null && a.score < 0.9 && ['binary', 'numeric'].includes(a.scoreDisplayMode))
      .map((a) => a.id)
      .slice(0, 8);
    registrar(`Lighthouse ${ruta}: rendimiento ≥ 90, accesibilidad ≥ 95, SEO ≥ 95`, notas.rendimiento >= 90 && notas.accesibilidad >= 95 && notas.seo >= 95, `R ${notas.rendimiento} · A ${notas.accesibilidad} · SEO ${notas.seo} · BP ${notas.practicas} · LCP ${(notas.lcp / 1000).toFixed(2)} s · CLS ${notas.cls.toFixed(3)}${fallidas.length ? ' · revisar: ' + fallidas.join(', ') : ''}`);
  }
  rmSync(carpeta, { recursive: true, force: true });
}

// ------------------------------------------------------------- inicio ---
if (!SIN_BUILD) {
  const r = spawnSync(process.execPath, [join(RAIZ, 'scripts/build-landing.mjs')], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(r.stdout + r.stderr);
    process.exit(1);
  }
  console.log('Build de vista previa generada.');
}
pruebasEstaticas();
pruebaProduccion();
pruebaProduccionCompleta();
const { servidor, url: base } = await iniciarServidor({ puerto: 0, api: 'simulada', silencioso: true });
const navegador = await chromium.launch();
try {
  await pruebasVariantes(navegador, base);
  await pruebasParametros(navegador, base);
  await pruebasClics(navegador, base);
  await pruebasFormulario(navegador, base);
  await pruebasPaginas(navegador, base);
  await pruebasRendimiento(navegador, base);
} catch (e) {
  registrar('Las pruebas de navegador terminaron sin excepciones', false, e.stack);
} finally {
  await navegador.close();
}
if (LIGHTHOUSE) await pruebasLighthouse(base);
servidor.close();

const fallas = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - fallas.length} de ${resultados.length} pruebas pasan.`);
if (SALIDA_JSON) writeFileSync(SALIDA_JSON, JSON.stringify({ fecha: new Date().toISOString(), resultados, mediciones }, null, 2));
if (fallas.length) {
  console.log('Fallan:\n' + fallas.map((f) => '  ✗ ' + f.nombre + (f.detalle ? ' · ' + f.detalle : '')).join('\n'));
  process.exit(1);
}
