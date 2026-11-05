'use strict';

// Envío a la planilla de Google mediante la aplicación web de Apps Script
// (docs/apps-script.gs). Apps Script siempre responde HTTP 200: el éxito se lee
// del JSON ({ ok: true }). Si el secreto no coincide, responde { ok: false, codigo: 403 }.

const { TIMEOUT_MS, entorno, modoPrueba, escribirPrueba, senalConLimite, describirError } = require('./envio');

/**
 * @param {'lead'|'wa_click'|'referido'} tipo
 * @param {object} datos
 * @returns {Promise<{ok: boolean, motivo?: string}>} nunca rechaza
 */
async function enviarAAppsScript(tipo, datos, { id = '', timeoutMs = TIMEOUT_MS } = {}) {
  if (modoPrueba()) return escribirPrueba({ id, destino: 'apps_script', tipo, datos });

  const url = entorno('APPS_SCRIPT_URL');
  const secreto = entorno('APPS_SCRIPT_SECRET');
  if (!url || !secreto) return { ok: false, motivo: 'sin_configurar' };
  if (!url.startsWith('https://')) return { ok: false, motivo: 'url_invalida' };

  const limite = senalConLimite(timeoutMs);
  try {
    // Apps Script responde con una redirección 302 a googleusercontent.com;
    // fetch la sigue con GET, que es lo que espera. El tiempo límite cubre ambas.
    const respuesta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secreto, tipo, datos }),
      redirect: 'follow',
      signal: limite.signal,
    });
    const texto = await respuesta.text();
    if (!respuesta.ok) return { ok: false, motivo: `http_${respuesta.status}` };
    let json = null;
    try {
      json = JSON.parse(texto);
    } catch {
      // Página HTML de Google: casi siempre, acceso distinto de "Cualquier usuario".
      return { ok: false, motivo: 'respuesta_no_json' };
    }
    if (!json || json.ok !== true) {
      const error = json && json.error ? String(json.error).replace(/[^a-z_]/gi, '').slice(0, 30) : 'error';
      return { ok: false, motivo: `script_${error}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, motivo: describirError(e) };
  } finally {
    limite.limpiar();
  }
}

module.exports = { enviarAAppsScript };
