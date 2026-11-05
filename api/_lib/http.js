'use strict';

// Utilidades HTTP sin dependencias. Funcionan con los ayudantes de Vercel
// (req.body ya leído) y también con un stream crudo de Node (pruebas locales).

const crypto = require('crypto');

const LIMITE_CUERPO = 10 * 1024; // 10 KB

function responderJSON(res, status, objeto) {
  if (res.headersSent) return;
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(objeto));
}

function responderVacio(res, status) {
  if (res.headersSent) return;
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  res.end();
}

// Sin encabezados CORS a propósito: solo el mismo origen puede leer la respuesta,
// y la verificación previa (OPTIONS) de otro origen recibe 405 y falla.
function rechazarMetodo(res) {
  if (res.headersSent) return;
  res.setHeader('Allow', 'POST');
  responderJSON(res, 405, { ok: false, error: 'metodo' });
}

function excedeLargoDeclarado(req, limite = LIMITE_CUERPO) {
  const declarado = Number(req.headers['content-length']);
  return Number.isFinite(declarado) && declarado > limite;
}

function esContenidoJSON(req) {
  const tipo = String(req.headers['content-type'] || '').toLowerCase();
  return tipo.split(';')[0].trim() === 'application/json';
}

function parsearJSON(texto) {
  try {
    return { estado: 'ok', valor: JSON.parse(texto) };
  } catch {
    return { estado: 'invalido' };
  }
}

function leerStream(req, limite) {
  return new Promise((resolve, reject) => {
    const partes = [];
    let total = 0;
    let listo = false;
    req.on('data', (trozo) => {
      if (listo) return; // se sigue drenando para poder responder 413
      total += trozo.length;
      if (total > limite) {
        listo = true;
        resolve(null);
        return;
      }
      partes.push(Buffer.isBuffer(trozo) ? trozo : Buffer.from(trozo));
    });
    req.on('end', () => {
      if (listo) return;
      listo = true;
      resolve(Buffer.concat(partes).toString('utf8'));
    });
    req.on('error', (e) => {
      if (listo) return;
      listo = true;
      reject(e);
    });
  });
}

/**
 * Lee y parsea el cuerpo JSON con tope de tamaño.
 * Devuelve { estado: 'ok', valor } | { estado: 'grande' } | { estado: 'invalido' }.
 */
async function leerCuerpo(req, limite = LIMITE_CUERPO) {
  if (excedeLargoDeclarado(req, limite)) return { estado: 'grande' };

  let previo;
  try {
    previo = req.body; // Vercel lo calcula al leerlo; lanza error si el JSON viene malo
  } catch {
    return { estado: 'invalido' };
  }

  if (previo !== undefined && previo !== null) {
    if (Buffer.isBuffer(previo)) previo = previo.toString('utf8');
    if (typeof previo === 'string') {
      if (Buffer.byteLength(previo, 'utf8') > limite) return { estado: 'grande' };
      return parsearJSON(previo);
    }
    if (typeof previo === 'object') {
      let serial;
      try {
        serial = JSON.stringify(previo);
      } catch {
        return { estado: 'invalido' };
      }
      if (Buffer.byteLength(serial, 'utf8') > limite) return { estado: 'grande' };
      return { estado: 'ok', valor: previo };
    }
    return { estado: 'invalido' };
  }

  // Sin ayudantes de Vercel: se lee el stream, cortando al pasar el tope.
  if (req.readableEnded || typeof req.on !== 'function') return { estado: 'invalido' };
  const texto = await leerStream(req, limite);
  if (texto === null) return { estado: 'grande' };
  return parsearJSON(texto);
}

function obtenerIP(req) {
  const h = req.headers || {};
  const reenviada = h['x-forwarded-for'] ? String(h['x-forwarded-for']).split(',')[0] : '';
  const ip = h['x-real-ip'] || reenviada || (req.socket && req.socket.remoteAddress) || '';
  return String(ip).trim();
}

// Mismo sitio = el host del Origin coincide con el host pedido (con o sin www).
// Sin Origin, o con Origin "null" (política no-referrer), no se puede saber: se acepta.
function esMismoOrigen(req) {
  const origen = req.headers.origin;
  if (!origen || origen === 'null') return true;
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  if (!host) return true;
  let hostOrigen;
  try {
    hostOrigen = new URL(origen).host.toLowerCase();
  } catch {
    return false;
  }
  const sinWww = (s) => s.replace(/^www\./, '');
  return sinWww(hostOrigen) === sinWww(host);
}

function nuevoId() {
  return crypto.randomBytes(4).toString('hex');
}

// Registro de una línea en JSON. Nunca recibe nombre, teléfono ni secretos.
function registrar(api, campos, nivel = 'info') {
  const linea = JSON.stringify({ api, ...campos });
  if (nivel === 'error') console.error(linea);
  else console.log(linea);
}

module.exports = {
  LIMITE_CUERPO,
  responderJSON,
  responderVacio,
  rechazarMetodo,
  excedeLargoDeclarado,
  esContenidoJSON,
  leerCuerpo,
  obtenerIP,
  esMismoOrigen,
  nuevoId,
  registrar,
};
