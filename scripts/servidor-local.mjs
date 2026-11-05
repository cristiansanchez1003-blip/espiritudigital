#!/usr/bin/env node
// Servidor estático local que emula Vercel con "cleanUrls": true y "trailingSlash": false.
//
//   node scripts/servidor-local.mjs [--puerto 4173] [--api-simulada | --api-real]
//
// --api-simulada  responde /api/lead y /api/wa-click según el contrato del formulario
//                 (docs/fases/fase-1.md) y guarda lo recibido en memoria.
// --api-real      carga los handlers de api/*.js (firma de Vercel: (req, res) o
//                 export POST(request)). Sin bandera, usa api/ si existe.
//
// Endpoints de control de la API simulada (solo locales, para las pruebas):
//   GET  /__simulada/registro            lo recibido por /api/lead y /api/wa-click
//   POST /__simulada/reiniciar           borra el registro
//   POST /__simulada/siguiente?estado=N  la próxima respuesta de /api/lead tendrá ese estado
//                                        (400, 429 o 500; con 400 se puede pasar &campos=a,b)

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};
const COMPRIMIBLE = /^(text\/|application\/(json|xml)|image\/svg)/;

const ENUMS = {
  vende_online: ['no', 'instagram_whatsapp', 'tienda'],
  plazo: ['este_mes', 'proximo_mes', 'cotizando'],
  presupuesto: ['menos_350', '350_500', 'mas_500'],
  plan_interes: ['esencial', 'pro', 'empresa', 'web', ''],
};
export const CLAVES_LEAD = [
  'nombre', 'whatsapp', 'que_vende', 'vende_online', 'plazo', 'presupuesto', 'plan_interes', 'consentimiento',
  'ref', 'gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'h', 'landing_path', 'hp', 't0',
];
export const CLAVES_WA = ['cta_location', 'plan', 'ref', 'gclid', 'utm_source', 'utm_campaign', 'utm_term', 'h', 'landing_path'];

function enviar(res, estado, cuerpo, tipo = 'application/json; charset=utf-8', extra = {}) {
  const datos = typeof cuerpo === 'string' || Buffer.isBuffer(cuerpo) ? cuerpo : JSON.stringify(cuerpo);
  res.writeHead(estado, { 'Content-Type': tipo, 'Cache-Control': 'no-store', ...extra });
  res.end(datos);
}

async function leerCuerpo(req) {
  const partes = [];
  for await (const parte of req) partes.push(parte);
  return Buffer.concat(partes).toString('utf8');
}

// Validación del lado del servidor, igual a la que debe hacer api/lead.js.
export function validarLead(d) {
  const campos = [];
  if (!d || typeof d !== 'object') return ['cuerpo'];
  if (typeof d.nombre !== 'string' || !d.nombre.trim() || d.nombre.length > 80) campos.push('nombre');
  const digitos = String(d.whatsapp || '').replace(/\D/g, '').replace(/^56(?=9\d{8}$)/, '');
  if (!/^9\d{8}$/.test(digitos)) campos.push('whatsapp');
  if (typeof d.que_vende !== 'string' || !d.que_vende.trim() || d.que_vende.length > 200) campos.push('que_vende');
  for (const [clave, valores] of Object.entries(ENUMS)) if (!valores.includes(d[clave] ?? '')) campos.push(clave);
  if (d.consentimiento !== true) campos.push('consentimiento');
  return campos;
}

function crearApiSimulada() {
  const registro = { lead: [], wa: [] };
  let siguiente = null;

  return async function api(req, res, ruta, url) {
    if (ruta === '/__simulada/registro') return enviar(res, 200, registro);
    if (ruta === '/__simulada/reiniciar' && req.method === 'POST') {
      registro.lead.length = 0;
      registro.wa.length = 0;
      siguiente = null;
      return enviar(res, 200, { ok: true });
    }
    if (ruta === '/__simulada/siguiente' && req.method === 'POST') {
      siguiente = { estado: Number(url.searchParams.get('estado')), campos: (url.searchParams.get('campos') || '').split(',').filter(Boolean) };
      return enviar(res, 200, { ok: true, siguiente });
    }
    if (ruta === '/api/wa-click') {
      if (req.method !== 'POST') return enviar(res, 405, { ok: false });
      const texto = await leerCuerpo(req);
      let datos = null;
      try {
        datos = JSON.parse(texto);
      } catch {}
      registro.wa.push({ recibido: Date.now(), tipo: req.headers['content-type'] || '', datos });
      return enviar(res, 204, '');
    }
    if (ruta === '/api/lead') {
      if (req.method !== 'POST') return enviar(res, 405, { ok: false, error: 'metodo' });
      const texto = await leerCuerpo(req);
      let datos = null;
      try {
        datos = JSON.parse(texto);
      } catch {
        return enviar(res, 400, { ok: false, error: 'validacion', campos: ['cuerpo'] });
      }
      const forzado = siguiente;
      siguiente = null;
      const entrada = { recibido: Date.now(), datos, respuesta: 200 };
      registro.lead.push(entrada);
      if (forzado && forzado.estado === 400) {
        entrada.respuesta = 400;
        return enviar(res, 400, { ok: false, error: 'validacion', campos: forzado.campos.length ? forzado.campos : ['whatsapp'] });
      }
      if (forzado && forzado.estado >= 400) {
        entrada.respuesta = forzado.estado;
        return enviar(res, forzado.estado, { ok: false, error: forzado.estado === 429 ? 'limite' : 'servidor' });
      }
      const campos = validarLead(datos);
      if (campos.length) {
        entrada.respuesta = 400;
        return enviar(res, 400, { ok: false, error: 'validacion', campos });
      }
      // Campo trampa o menos de 3 segundos: se descarta en silencio, como haría la API real.
      const t0 = Number(datos.t0);
      entrada.descartado = Boolean(datos.hp) || !Number.isFinite(t0) || Date.now() - t0 < 3000;
      return enviar(res, 200, { ok: true });
    }
    return enviar(res, 404, { ok: false, error: 'no_existe' });
  };
}

// Adaptador para los handlers reales de api/ (firma Node de Vercel o Web estándar).
function crearApiReal(raizApi = RAIZ) {
  const cache = new Map();
  return async function api(req, res, ruta, url) {
    const nombre = ruta.slice('/api/'.length).replace(/\/+$/, '');
    if (!/^[a-z0-9_-]+$/i.test(nombre)) return enviar(res, 404, { ok: false });
    const archivo = ['.js', '.mjs', '.cjs'].map((e) => join(raizApi, 'api', nombre + e)).find((a) => existsSync(a));
    if (!archivo) return enviar(res, 404, { ok: false, error: 'no_existe' });
    if (!cache.has(archivo)) cache.set(archivo, await import(pathToFileURL(archivo).href));
    const modulo = cache.get(archivo);
    const texto = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await leerCuerpo(req) : '';
    const tipo = String(req.headers['content-type'] || '');
    const metodoWeb = modulo[req.method];
    if (typeof metodoWeb === 'function') {
      const peticion = new Request(url.href, { method: req.method, headers: req.headers, body: texto || undefined });
      const r = await metodoWeb(peticion);
      const cuerpo = Buffer.from(await r.arrayBuffer());
      res.writeHead(r.status, Object.fromEntries(r.headers));
      return res.end(cuerpo);
    }
    const handler = modulo.default?.default || modulo.default || modulo.handler;
    if (typeof handler !== 'function') return enviar(res, 500, { ok: false, error: 'handler' });
    let body = texto;
    if (tipo.includes('application/json')) {
      try {
        body = texto ? JSON.parse(texto) : {};
      } catch {
        return enviar(res, 400, { ok: false, error: 'json' });
      }
    } else if (tipo.includes('application/x-www-form-urlencoded')) {
      body = Object.fromEntries(new URLSearchParams(texto));
    }
    req.body = body;
    req.query = Object.fromEntries(url.searchParams);
    req.cookies = {};
    res.status = (codigo) => {
      res.statusCode = codigo;
      return res;
    };
    res.json = (obj) => {
      if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(obj));
      return res;
    };
    res.send = (cuerpo) => {
      if (typeof cuerpo === 'object' && !Buffer.isBuffer(cuerpo)) return res.json(cuerpo);
      res.end(cuerpo);
      return res;
    };
    await handler(req, res);
  };
}

async function archivo(ruta) {
  try {
    const s = await stat(ruta);
    return s.isFile() ? ruta : null;
  } catch {
    return null;
  }
}

// Resuelve una ruta como Vercel con cleanUrls: /x → x.html o x/index.html.
async function resolver(ruta) {
  const segura = normalize(decodeURIComponent(ruta)).replace(/^(\.\.[/\\])+/, '');
  const base = join(RAIZ, segura);
  if (!base.startsWith(RAIZ)) return null;
  if (segura === '/' || segura === '') return archivo(join(RAIZ, 'index.html'));
  return (await archivo(base + '.html')) || (await archivo(base)) || (await archivo(join(base, 'index.html')));
}

// apiRaiz: carpeta que contiene api/ (por defecto la raíz del repositorio).
export function iniciarServidor({ puerto = 4173, api = 'auto', silencioso = false, apiRaiz = RAIZ } = {}) {
  const modo = api === 'auto' ? (existsSync(join(apiRaiz, 'api')) ? 'real' : 'ninguna') : api;
  const manejarApi = modo === 'simulada' ? crearApiSimulada() : modo === 'real' ? crearApiReal(apiRaiz) : null;

  const servidor = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const ruta = url.pathname;
    try {
      if (ruta.startsWith('/api/') || ruta.startsWith('/__simulada/')) {
        if (!manejarApi || (ruta.startsWith('/__simulada/') && modo !== 'simulada')) return enviar(res, 404, { ok: false, error: 'sin_api' });
        return await manejarApi(req, res, ruta, url);
      }
      // trailingSlash: false → /x/ redirige a /x conservando los parámetros.
      if (ruta.length > 1 && ruta.endsWith('/')) {
        return enviar(res, 308, '', 'text/plain', { Location: ruta.replace(/\/+$/, '') + url.search });
      }
      // cleanUrls: /x.html y /x/index redirigen a la ruta limpia.
      if (ruta.endsWith('.html')) {
        const limpia = ruta.replace(/(\/index)?\.html$/, '') || '/';
        return enviar(res, 308, '', 'text/plain', { Location: limpia + url.search });
      }
      const encontrado = await resolver(ruta);
      if (!encontrado) {
        const pagina404 = await archivo(join(RAIZ, '404.html'));
        return enviar(res, 404, pagina404 ? await readFile(pagina404) : 'No encontrado', 'text/html; charset=utf-8');
      }
      const tipo = TIPOS[extname(encontrado).toLowerCase()] || 'application/octet-stream';
      let cuerpo = await readFile(encontrado);
      const cabeceras = { 'Content-Type': tipo, 'Cache-Control': 'public, max-age=0, must-revalidate' };
      if (COMPRIMIBLE.test(tipo) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
        cuerpo = gzipSync(cuerpo);
        cabeceras['Content-Encoding'] = 'gzip';
        cabeceras.Vary = 'Accept-Encoding';
      }
      res.writeHead(200, cabeceras);
      res.end(req.method === 'HEAD' ? undefined : cuerpo);
    } catch (e) {
      if (!silencioso) console.error(e);
      if (!res.headersSent) enviar(res, 500, { ok: false, error: 'servidor' });
    }
  });

  return new Promise((ok) => {
    servidor.listen(puerto, '127.0.0.1', () => {
      const real = servidor.address().port;
      if (!silencioso) console.log(`Servidor en http://127.0.0.1:${real}/tiendas-online  (API: ${modo})`);
      ok({ servidor, puerto: real, url: `http://127.0.0.1:${real}`, modo });
    });
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--puerto');
  const puerto = i >= 0 ? Number(argv[i + 1]) : 4173;
  const api = argv.includes('--api-simulada') ? 'simulada' : argv.includes('--api-real') ? 'real' : 'auto';
  iniciarServidor({ puerto, api });
}
