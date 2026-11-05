#!/usr/bin/env node
// Generador de /tiendas-online sin dependencias (Node 22).
//
//   node scripts/build-landing.mjs               vista previa: muestra todos los casos y
//                                                omite la medición si no hay IDs
//   node scripts/build-landing.mjs --produccion  falla si queda algo pendiente
//   node scripts/build-landing.mjs --comprobar   no escribe; falla si los HTML del
//                                                repositorio no coinciden con la salida
//
// Lee data/*.json y scripts/plantillas/, y escribe tiendas-online.html y
// tiendas-online/{casos,planes,gracias}.html (Vercel los sirve con cleanUrls).
// En --produccion no escribe nada si encuentra un error.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { paginaLanding, paginaCasos, paginaPlanes, paginaGracias } from './plantillas/paginas.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const PRODUCCION = args.has('--produccion');
const COMPROBAR = args.has('--comprobar');
const MARCA_PENDIENTE = 'TODO-CRISTIAN';

const errores = [];
const pendientes = [];
const avisos = [];

// En producción lo pendiente es un error; en vista previa, un aviso.
function pendiente(texto) {
  (PRODUCCION ? errores : pendientes).push(`${MARCA_PENDIENTE}: ${texto}`);
}

function leerJson(ruta) {
  try {
    return JSON.parse(readFileSync(join(RAIZ, ruta), 'utf8'));
  } catch (e) {
    errores.push(`No se pudo leer ${ruta}: ${e.message}`);
    return null;
  }
}

const clp = (n) => '$' + Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// Ancho y alto de WebP, PNG, JPEG y AVIF leyendo la cabecera del archivo.
function dimensiones(buf) {
  const ascii = (a, b) => buf.toString('latin1', a, b);
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') {
    const tipo = ascii(12, 16);
    if (tipo === 'VP8X') return { ancho: 1 + buf.readUIntLE(24, 3), alto: 1 + buf.readUIntLE(27, 3) };
    if (tipo === 'VP8L') {
      const b = buf.readUInt32LE(21);
      return { ancho: (b & 0x3fff) + 1, alto: ((b >> 14) & 0x3fff) + 1 };
    }
    if (tipo === 'VP8 ') return { ancho: buf.readUInt16LE(26) & 0x3fff, alto: buf.readUInt16LE(28) & 0x3fff };
  }
  if (buf.readUInt32BE(0) === 0x89504e47) return { ancho: buf.readUInt32BE(16), alto: buf.readUInt32BE(20) };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) return null;
      const marcador = buf[i + 1];
      const largo = buf.readUInt16BE(i + 2);
      if (marcador >= 0xc0 && marcador <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marcador)) {
        return { alto: buf.readUInt16BE(i + 5), ancho: buf.readUInt16BE(i + 7) };
      }
      i += 2 + largo;
    }
  }
  const ispe = buf.indexOf('ispe');
  if (ascii(4, 8) === 'ftyp' && ispe > 0) return { ancho: buf.readUInt32BE(ispe + 8), alto: buf.readUInt32BE(ispe + 12) };
  return null;
}

// Imagen local: { src, srcset?, ancho, alto, alt } o null si falta.
function cargarImagen(def, que, { requerida = true } = {}) {
  if (!def || !def.archivo) {
    if (requerida) pendiente(`falta ${que}`);
    return null;
  }
  const ruta = join(RAIZ, def.archivo);
  if (!existsSync(ruta)) {
    errores.push(`No existe ${def.archivo} (${que})`);
    return null;
  }
  const dim = dimensiones(readFileSync(ruta));
  if (!dim) {
    errores.push(`No se pudo leer el tamaño de ${def.archivo}`);
    return null;
  }
  const img = { src: '/' + def.archivo.replace(/^\/+/, ''), ancho: dim.ancho, alto: dim.alto, alt: def.alt || '' };
  if (Array.isArray(def.variantes) && def.variantes.length) {
    const partes = [];
    for (const v of def.variantes) {
      const rv = join(RAIZ, v);
      if (!existsSync(rv)) {
        errores.push(`No existe ${v} (${que})`);
        continue;
      }
      const dv = dimensiones(readFileSync(rv));
      if (dv) partes.push(`/${v.replace(/^\/+/, '')} ${dv.ancho}w`);
    }
    if (partes.length) img.srcset = partes.join(', ');
  }
  return img;
}

function hash(texto) {
  return createHash('sha256').update(texto).digest('hex').slice(0, 10);
}

function minificarCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

// ----------------------------------------------------------------- datos ---

const cfg = leerJson('data/config.json');
const casos = leerJson('data/casos.json');
const logos = leerJson('data/logos.json');
const resenas = leerJson('data/resenas.json');
const testimonios = leerJson('data/testimonios.json');
if (errores.length) terminarConError();

for (const clave of ['precio_esencial', 'precio_esencial_cuota', 'precio_pro', 'precio_web', 'mantencion_mes', 'mantencion_web_mes', 'mantencion_meses_incluidos', 'iva']) {
  if (typeof cfg[clave] !== 'number' || !(cfg[clave] > 0)) errores.push(`data/config.json: ${clave} debe ser un número mayor que 0`);
}
for (const clave of ['whatsapp', 'horario_respuesta', 'horario_corto', 'fecha_revision', 'sitio', 'ruta_landing', 'rut', 'razon_social', 'correo', 'telefono_visible']) {
  if (!cfg[clave] || typeof cfg[clave] !== 'string') pendiente(`data/config.json: falta ${clave}`);
}
if (cfg.whatsapp && !/^569\d{8}$/.test(cfg.whatsapp)) errores.push('data/config.json: whatsapp debe tener el formato 569XXXXXXXX');
if (Math.abs(cfg.precio_esencial_cuota * 2 - cfg.precio_esencial) > 0) errores.push('data/config.json: la cuota del Esencial debe ser el 50% del precio');
if (![1, 2].includes(cfg.cierre_tramo)) errores.push('data/config.json: cierre_tramo debe ser 1 o 2');

const conIva = (n) => Math.round(n * (1 + cfg.iva));
const p = {
  esencial: clp(cfg.precio_esencial),
  esencialIva: clp(conIva(cfg.precio_esencial)),
  cuota: clp(cfg.precio_esencial_cuota),
  pro: clp(cfg.precio_pro),
  proIva: clp(conIva(cfg.precio_pro)),
  web: clp(cfg.precio_web),
  webIva: clp(conIva(cfg.precio_web)),
  mant: clp(cfg.mantencion_mes),
  mantIva: clp(conIva(cfg.mantencion_mes)),
  mantWeb: clp(cfg.mantencion_web_mes),
  mantWebIva: clp(conIva(cfg.mantencion_web_mes)),
};

// GTM: en vista previa se omite si no hay ID; en producción es obligatorio. Nunca se inventa.
const gtmId = (cfg.gtm_id || '').trim();
if (gtmId && !/^GTM-[A-Z0-9]{4,10}$/.test(gtmId)) errores.push(`data/config.json: gtm_id "${gtmId}" no tiene el formato GTM-XXXXXXX`);
if (!gtmId) pendiente('falta gtm_id en data/config.json (lo crea Cristian en Tag Manager)');

if (!Array.isArray(cfg.web_incluye) || !cfg.web_incluye.length) avisos.push('web_incluye está vacío: la tarjeta de página web no se genera');

// Casos: en vista previa se muestran todos los marcados con mostrar; en producción
// se ocultan los que requieren arreglo y la build falla si alguno visible no tiene permiso.
function filtrarCasos(lista, tipo) {
  const visibles = [];
  for (const caso of lista || []) {
    if (caso.mostrar === false) continue;
    if (!caso.slug || !caso.nombre || !caso.url) {
      errores.push(`data/casos.json (${tipo}): cada caso necesita slug, nombre y url`);
      continue;
    }
    if (PRODUCCION && caso.requiere_arreglo === true) {
      avisos.push(`${caso.nombre}: oculto en producción hasta confirmar el arreglo (requiere_arreglo: true)`);
      continue;
    }
    if (caso.permiso !== true) {
      if (PRODUCCION) errores.push(`Se muestra el caso "${caso.nombre}" con permiso distinto de true en data/casos.json`);
      else pendientes.push(`${MARCA_PENDIENTE}: permiso por escrito de ${caso.nombre} (data/casos.json → permiso: true)`);
    }
    if (!PRODUCCION && caso.requiere_arreglo === true) pendientes.push(`${MARCA_PENDIENTE}: confirmar el arreglo de ${caso.nombre} (en producción queda oculto)`);
    if (caso.condicion) pendientes.push(`${MARCA_PENDIENTE}: ${caso.nombre}, condición: ${caso.condicion}`);
    const copia = { ...caso };
    copia.img = caso.imagen ? cargarImagen(caso.imagen, `imagen de ${caso.nombre}`) : null;
    copia.imgCel = caso.imagen_celular ? cargarImagen(caso.imagen_celular, `captura en celular de ${caso.nombre}`) : null;
    if (tipo === 'tiendas' && !caso.imagen) avisos.push(`${caso.nombre}: sin captura (data/casos.json → imagen)`);
    visibles.push(copia);
  }
  return visibles;
}
const tiendas = filtrarCasos(casos.tiendas, 'tiendas');
const webs = filtrarCasos(casos.webs, 'webs');
if (!tiendas.length) errores.push('No queda ninguna tienda para mostrar en el bloque "Tiendas reales"');
const visible = (slug) => tiendas.concat(webs).some((c) => c.slug === slug);

// Logos (solo con permiso), reseñas y testimonios: aparecen solo si hay datos.
const logosVisibles = [];
for (const logo of Array.isArray(logos) ? logos : []) {
  if (logo.permiso !== true) {
    if (PRODUCCION) errores.push(`Se muestra el logo de "${logo.nombre}" sin permiso`);
    else pendientes.push(`${MARCA_PENDIENTE}: permiso del logo de ${logo.nombre}`);
  }
  const img = cargarImagen({ archivo: logo.archivo, alt: logo.nombre }, `logo de ${logo.nombre}`);
  if (img) logosVisibles.push({ ...logo, img });
}
const resenasOk = resenas && Array.isArray(resenas.resenas) ? resenas : { resenas: [], n: 0, promedio: null, ficha_url: '' };
for (const r of resenasOk.resenas) {
  if (!r.texto || !r.nombre || !r.fecha) errores.push('data/resenas.json: cada reseña necesita texto, nombre y fecha, copiados tal cual de Google');
}
if (resenasOk.resenas.length >= 3 && !resenasOk.ficha_url) pendiente('data/resenas.json: falta ficha_url para "Ver todas en Google"');
if (resenasOk.n >= 5 && (!resenasOk.promedio || !resenasOk.ficha_url)) errores.push('data/resenas.json: con n >= 5 se necesitan promedio y ficha_url');
const testimoniosVisibles = [];
for (const t of Array.isArray(testimonios) ? testimonios : []) {
  if (t.permiso !== true) {
    if (PRODUCCION) errores.push(`Se muestra el testimonio de "${t.nombre}" sin permiso`);
    else pendientes.push(`${MARCA_PENDIENTE}: permiso del testimonio de ${t.nombre}`);
  }
  const portadaInfo = cargarImagen({ archivo: t.portada, alt: `Testimonio de ${t.nombre}` }, `portada del testimonio de ${t.nombre}`);
  const existe = t.video && existsSync(join(RAIZ, t.video));
  if (!existe) errores.push(`data/testimonios.json: no existe el video de ${t.nombre}`);
  if (portadaInfo && existe && t.transcripcion) testimoniosVisibles.push({ ...t, portadaInfo, videoInfo: { src: '/' + t.video } });
  else if (!t.transcripcion) errores.push(`data/testimonios.json: falta la transcripción de ${t.nombre}`);
}

// Imágenes de la portada, Open Graph y fundador.
const img = {};
const portadaDef = cfg.imagenes?.portada;
img.portada = cargarImagen(portadaDef, 'la imagen de portada (captura real de Imprenta Express en celular y computador)');
if (img.portada && portadaDef.caso && !visible(portadaDef.caso)) {
  errores.push(`La imagen de portada es de "${portadaDef.caso}", que no se muestra: cámbiala o muestra el caso`);
}
const ogDef = cfg.imagenes?.og;
const og = cargarImagen(ogDef, 'la imagen Open Graph de 1200 × 630');
if (og) {
  img.og = { url: cfg.sitio + og.src, ancho: og.ancho, alto: og.alto };
  if (og.ancho !== 1200 || og.alto !== 630) avisos.push(`La imagen Open Graph mide ${og.ancho} × ${og.alto}; 03 pide 1200 × 630`);
  if (ogDef.caso && !visible(ogDef.caso)) errores.push(`La imagen Open Graph es de "${ogDef.caso}", que no se muestra`);
}
const f = cfg.fundador || {};
img.fundador = cargarImagen({ archivo: f.foto, alt: f.foto_alt }, 'la foto real de Cristian, con luz natural (data/config.json → fundador.foto)');
if (f.video) {
  if (!existsSync(join(RAIZ, f.video))) errores.push(`No existe ${f.video} (video de Cristian)`);
  else {
    img.fundadorVideo = { src: '/' + f.video };
    img.fundadorVideoPortada = cargarImagen({ archivo: f.video_portada, alt: 'Cristian Sánchez' }, 'la portada del video de Cristian');
    if (!img.fundadorVideoPortada) img.fundadorVideo = null;
  }
} else {
  avisos.push('Sin video de Cristian (opcional): el bloque 7 sale sin video');
}
const datoAo = f.dato_ao_con_permiso === true && webs.some((w) => w.slug === 'ao-construcciones');

if (errores.length && PRODUCCION) terminarConError();

// --------------------------------------------------------------- generar ---

const css = minificarCss(readFileSync(join(RAIZ, 'scripts/plantillas/estilos.css'), 'utf8'));
const rutaJs = 'assets/tiendas-online/js/landing.js';
const js = readFileSync(join(RAIZ, rutaJs), 'utf8');
const contexto = {
  cfg,
  p,
  css,
  js: `/${rutaJs}?v=${hash(js)}`,
  gtmId,
  img,
  datoAo,
  casos: { tiendas, webs },
  logos: logosVisibles,
  resenas: resenasOk,
  testimonios: testimoniosVisibles,
};

const paginas = [
  ['tiendas-online.html', paginaLanding(contexto)],
  ['tiendas-online/casos.html', paginaCasos(contexto)],
  ['tiendas-online/planes.html', paginaPlanes(contexto)],
  ['tiendas-online/gracias.html', paginaGracias(contexto)],
];

for (const [ruta, html] of paginas) {
  if (html.includes(MARCA_PENDIENTE)) errores.push(`${ruta} contiene "${MARCA_PENDIENTE}"`);
  if ((html.match(/<h1[\s>]/g) || []).length !== 1) errores.push(`${ruta} debe tener exactamente un <h1>`);
  if (/\{\{|undefined|NaN|\[object Object\]/.test(html)) errores.push(`${ruta} contiene un valor sin completar`);
}

if (errores.length) terminarConError();

if (COMPROBAR) {
  const distintos = paginas.filter(([ruta, html]) => !existsSync(join(RAIZ, ruta)) || readFileSync(join(RAIZ, ruta), 'utf8') !== html);
  if (distintos.length) {
    console.error(`Desactualizados: ${distintos.map(([r]) => r).join(', ')}. Corre node scripts/build-landing.mjs`);
    process.exit(1);
  }
  console.log('Los HTML generados están al día.');
  process.exit(0);
}

for (const [ruta, html] of paginas) {
  mkdirSync(dirname(join(RAIZ, ruta)), { recursive: true });
  writeFileSync(join(RAIZ, ruta), html);
}

console.log(`Modo: ${PRODUCCION ? 'producción' : 'vista previa'}`);
for (const [ruta, html] of paginas) console.log(`  ${ruta.padEnd(30)} ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);
console.log(`  Medición: ${gtmId ? 'GTM ' + gtmId : 'sin etiquetas (falta gtm_id)'}`);
console.log(`  Casos: ${tiendas.map((t) => t.nombre).join(', ')} | webs: ${webs.map((w) => w.nombre).join(', ')}`);
if (avisos.length) console.log('Avisos:\n' + avisos.map((a) => '  - ' + a).join('\n'));
if (pendientes.length) console.log('Pendiente antes de publicar (la vista previa no lo muestra):\n' + [...new Set(pendientes)].map((a) => '  - ' + a).join('\n'));

function terminarConError() {
  console.error(`La build ${PRODUCCION ? 'de producción ' : ''}falló. No se escribió ningún archivo.`);
  for (const e of [...new Set(errores)]) console.error('  ✗ ' + e);
  if (avisos.length) console.error('Avisos:\n' + avisos.map((a) => '  - ' + a).join('\n'));
  process.exit(1);
}
