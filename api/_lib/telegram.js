'use strict';

// Aviso por Telegram (sendMessage con parse_mode HTML). Todo lo que viene del
// formulario se escapa: solo las etiquetas <b> del propio mensaje llegan como HTML.

const { TIMEOUT_MS, entorno, modoPrueba, escribirPrueba, senalConLimite, describirError } = require('./envio');

const ETIQUETAS = {
  vende_online: {
    no: 'No',
    instagram_whatsapp: 'Sí, por Instagram o WhatsApp',
    tienda: 'Sí, tengo tienda',
  },
  plazo: {
    este_mes: 'Este mes',
    proximo_mes: 'El próximo mes',
    cotizando: 'Solo estoy cotizando',
  },
  presupuesto: {
    menos_350: 'Menos de $350.000',
    '350_500': '$350.000 a $500.000',
    mas_500: 'Más de $500.000',
  },
  plan_interes: {
    esencial: 'Esencial',
    pro: 'Pro',
    empresa: 'Empresa',
    web: 'Página web',
  },
};

function escaparHTML(valor) {
  return String(valor === undefined || valor === null ? '' : valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// "UTM o directo", según 2.3 del prompt. Con gclid sin UTM, igual es Google Ads.
function origen(d) {
  const utm = [d.utm_source, d.utm_medium, d.utm_campaign].filter(Boolean).join(' / ');
  let texto;
  if (utm) texto = utm;
  else if (d.gclid || d.gbraid || d.wbraid) texto = 'Google Ads (sin UTM)';
  else texto = 'directo';
  if (d.utm_term) texto += ` · término: ${d.utm_term}`;
  return texto;
}

function linea(etiqueta, valor) {
  return `<b>${etiqueta}:</b> ${escaparHTML(valor)}`;
}

function mensajeLead(d) {
  const numero = String(d.whatsapp || '').replace(/\D/g, '');
  return [
    '🛒 <b>Lead tiendas</b>',
    linea('Nombre', d.nombre),
    linea('Qué vende', d.que_vende),
    linea('Vende online', ETIQUETAS.vende_online[d.vende_online] || d.vende_online),
    linea('Plazo', ETIQUETAS.plazo[d.plazo] || d.plazo),
    linea('Presupuesto (sin IVA)', ETIQUETAS.presupuesto[d.presupuesto] || d.presupuesto),
    linea('Plan', ETIQUETAS.plan_interes[d.plan_interes] || 'sin plan'),
    linea('Origen', origen(d)),
    linea('h', d.h || '\u2014'),
    linea('Ref', d.ref || '\u2014'),
    `<b>WhatsApp:</b> https://wa.me/${numero}`,
  ].join('\n');
}

function mensajeAvisoPlanilla(d) {
  return `⚠️ La planilla no confirmó el lead de <b>${escaparHTML(d.nombre)}</b>. Revisa si quedó anotado; si no, agrégalo a mano.`;
}

/** @returns {Promise<{ok: boolean, motivo?: string}>} nunca rechaza */
async function enviarTelegram(texto, { id = '', timeoutMs = TIMEOUT_MS } = {}) {
  if (modoPrueba()) return escribirPrueba({ id, destino: 'telegram', texto });

  const token = entorno('TELEGRAM_BOT_TOKEN');
  const chat = entorno('TELEGRAM_CHAT_ID');
  if (!token || !chat) return { ok: false, motivo: 'sin_configurar' };

  const limite = senalConLimite(timeoutMs);
  try {
    const respuesta = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text: texto,
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      }),
      signal: limite.signal,
    });
    let json = null;
    try {
      json = await respuesta.json();
    } catch {
      json = null;
    }
    if (respuesta.ok && json && json.ok === true) return { ok: true };
    return { ok: false, motivo: `http_${respuesta.status}` };
  } catch (e) {
    return { ok: false, motivo: describirError(e) };
  } finally {
    limite.limpiar();
  }
}

module.exports = { ETIQUETAS, escaparHTML, origen, mensajeLead, mensajeAvisoPlanilla, enviarTelegram };
