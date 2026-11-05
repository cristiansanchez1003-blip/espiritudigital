'use strict';

// Piezas comunes a los envíos externos: modo de prueba local, lectura de variables
// de entorno y descripción de errores sin datos sensibles.

const fs = require('fs');
const os = require('os');
const path = require('path');

// Telegram responde en menos de 1 s; Apps Script puede tardar varios (redirección 302,
// candado y escritura). Peor caso de /api/lead: 7 s (planilla y Telegram en paralelo)
// + 2 s (aviso de planilla) = 9 s, bajo los 10 s por defecto de una función en Vercel.
const TIMEOUT_MS = 4000;
const TIMEOUT_APPS_SCRIPT_MS = 7000;
let avisoModoPrueba = false;

function entorno(nombre) {
  return String(process.env[nombre] || '').trim();
}

// LEADS_MODO_PRUEBA=1 solo vale fuera de Vercel (o con `vercel dev`). En una
// implementación de producción o de vista previa se ignora: si quedara puesto por
// error, los leads se escribirían en /tmp de una instancia y se perderían.
function modoPrueba() {
  if (entorno('LEADS_MODO_PRUEBA') !== '1') return false;
  const ambiente = entorno('VERCEL_ENV');
  if (ambiente === 'production' || ambiente === 'preview') {
    if (!avisoModoPrueba) {
      avisoModoPrueba = true;
      console.error(JSON.stringify({ api: 'envio', aviso: 'LEADS_MODO_PRUEBA ignorado en Vercel' }));
    }
    return false;
  }
  return true;
}

function rutaPrueba() {
  return path.join(os.tmpdir(), 'leads-prueba.jsonl');
}

async function escribirPrueba(evento) {
  try {
    const linea = JSON.stringify({ ts: new Date().toISOString(), ...evento });
    await fs.promises.appendFile(rutaPrueba(), `${linea}\n`, 'utf8');
    return { ok: true, motivo: 'prueba' };
  } catch {
    return { ok: false, motivo: 'prueba_escritura' };
  }
}

// Tiempo límite con un temporizador propio (AbortSignal.timeout no mantiene vivo
// el proceso). Hay que llamar a limpiar() al terminar, incluida la lectura del cuerpo.
function senalConLimite(ms) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => {
    const error = new Error('tiempo límite');
    error.name = 'TimeoutError';
    controlador.abort(error);
  }, ms);
  return { signal: controlador.signal, limpiar: () => clearTimeout(temporizador) };
}

// Nunca se registra el error completo: puede traer la URL, que en Telegram lleva el token.
function describirError(e) {
  if (!e) return 'error';
  if (e.name === 'TimeoutError' || e.name === 'AbortError') return 'timeout';
  const codigo = e.cause && e.cause.code;
  return codigo ? `red_${String(codigo).slice(0, 30)}` : String(e.name || 'error').slice(0, 30);
}

module.exports = {
  TIMEOUT_MS,
  TIMEOUT_APPS_SCRIPT_MS,
  entorno,
  modoPrueba,
  rutaPrueba,
  escribirPrueba,
  senalConLimite,
  describirError,
};
