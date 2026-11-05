'use strict';

// Aviso por Telegram (sendMessage con parse_mode HTML). Todo lo que viene del
// formulario se escapa: solo las etiquetas <b> del propio mensaje llegan como HTML.
//
// Telegram no ofrece un acuerdo de tratamiento de datos, así que el aviso NO lleva
// datos personales: ni nombre, ni teléfono, ni qué vende, ni ref. El detalle completo
// llega por correo desde la planilla (Apps Script → Gmail) y queda en la planilla.

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
  return [
    '\u{1F6D2} <b>Nuevo lead de tiendas</b>',
    linea('Plazo', ETIQUETAS.plazo[d.plazo] || d.plazo),
    linea('Presupuesto (sin IVA)', ETIQUETAS.presupuesto[d.presupuesto] || d.presupuesto),
    linea('Plan', ETIQUETAS.plan_interes[d.plan_interes] || 'sin plan'),
    linea('Origen', origen(d)),
    linea('Variante', d.h || '—'),
    'Revisa tu correo o la planilla para responder.',
  ].join('\n');
}

// Sin datos personales: si la planilla no confirmó, tampoco salió el correo con el detalle,
// y la página le ofreció a la persona escribir por WhatsApp.
function mensajeAvisoPlanilla() {
  return '⚠️ La planilla no confirmó el lead anterior: no salió el correo con el detalle y a la persona se le ofreció escribirte por WhatsApp. Revisa si la fila quedó igual en la planilla y, si no, Apps Script → Ejecuciones.';
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
