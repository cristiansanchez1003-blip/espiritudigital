'use strict';

// POST /api/wa-click · clic en un botón de WhatsApp, enviado con navigator.sendBeacon.
// Puede llegar como text/plain o application/json. Responde 204 a todo cuerpo válido:
// el enlace nunca espera esta respuesta.

const {
  responderJSON,
  responderVacio,
  rechazarMetodo,
  excedeLargoDeclarado,
  leerCuerpo,
  obtenerIP,
  esMismoOrigen,
  nuevoId,
  registrar,
} = require('./_lib/http');
const { sanearClic } = require('./_lib/validacion');
const { claveIP, crearLimitador } = require('./_lib/limite');
const { enviarAAppsScript } = require('./_lib/apps-script');

// Sobre 30 clics por IP en 10 minutos, se responde 204 igual pero no se anota.
const limitador = crearLimitador({ max: 30, ventanaMs: 10 * 60 * 1000 });

module.exports = async function waClick(req, res) {
  const id = nuevoId();
  try {
    if (req.method !== 'POST') return rechazarMetodo(res);
    if (excedeLargoDeclarado(req)) return responderJSON(res, 413, { ok: false, error: 'tamano' });

    const lectura = await leerCuerpo(req);
    if (lectura.estado === 'grande') return responderJSON(res, 413, { ok: false, error: 'tamano' });
    if (lectura.estado !== 'ok') return responderJSON(res, 400, { ok: false, error: 'validacion' });

    const clic = sanearClic(lectura.valor);
    if (!clic.ok) return responderJSON(res, 400, { ok: false, error: 'validacion' });

    // text/plain no exige permiso CORS: otro sitio podría mandar clics falsos.
    if (!esMismoOrigen(req)) {
      registrar('wa-click', { id, descartado: 'origen' });
      return responderVacio(res, 204);
    }
    if (!limitador.permitir(claveIP(obtenerIP(req)))) {
      registrar('wa-click', { id, descartado: 'limite' });
      return responderVacio(res, 204);
    }

    // Se espera el envío antes de responder: Vercel congela la función al responder.
    const envio = await enviarAAppsScript('wa_click', { fecha: new Date().toISOString(), ...clic.datos }, { id });
    registrar(
      'wa-click',
      { id, planilla: envio.ok ? 'ok' : envio.motivo, cta: clic.datos.cta_location },
      envio.ok ? 'info' : 'error'
    );
    return responderVacio(res, 204);
  } catch (e) {
    registrar('wa-click', { id, resultado: 'excepcion', error: String((e && e.name) || 'error') }, 'error');
    return responderJSON(res, 500, { ok: false, error: 'interno' });
  }
};
