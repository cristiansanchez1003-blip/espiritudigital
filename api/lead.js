'use strict';

// POST /api/lead · formulario de la landing /tiendas-online.
// Contrato: docs/fases/fase-2.md. Planilla y Telegram en paralelo; si falla uno, el
// otro sigue; si fallan ambos, 500 para que la página ofrezca WhatsApp.

const {
  responderJSON,
  rechazarMetodo,
  excedeLargoDeclarado,
  esContenidoJSON,
  leerCuerpo,
  obtenerIP,
  nuevoId,
  registrar,
} = require('./_lib/http');
const { esObjeto, revisarTrampa, validarLead } = require('./_lib/validacion');
const { claveIP, crearLimitador } = require('./_lib/limite');
const { enviarAAppsScript } = require('./_lib/apps-script');
const { enviarTelegram, mensajeLead, mensajeAvisoPlanilla } = require('./_lib/telegram');

// 5 leads válidos por IP cada 10 minutos: holgado para reintentos y para varias
// personas detrás de la misma IP móvil (con 1 a 5 leads al mes, coincidir es casi imposible).
const limitador = crearLimitador({ max: 5, ventanaMs: 10 * 60 * 1000 });

const sinRechazo = (promesa) => promesa.catch(() => ({ ok: false, motivo: 'excepcion' }));
const estado = (r) => (r.ok ? 'ok' : r.motivo || 'error');

module.exports = async function lead(req, res) {
  const id = nuevoId();
  const inicio = Date.now();
  try {
    if (req.method !== 'POST') {
      registrar('lead', { id, rechazado: 'metodo' });
      return rechazarMetodo(res);
    }
    if (excedeLargoDeclarado(req)) {
      registrar('lead', { id, rechazado: 'tamano' });
      return responderJSON(res, 413, { ok: false, error: 'tamano' });
    }
    // Exigir JSON obliga al navegador de otro sitio a pedir permiso (OPTIONS), que se niega.
    if (!esContenidoJSON(req)) {
      registrar('lead', { id, rechazado: 'tipo_contenido' });
      return responderJSON(res, 400, { ok: false, error: 'validacion', campos: ['cuerpo'] });
    }

    const lectura = await leerCuerpo(req);
    if (lectura.estado === 'grande') {
      registrar('lead', { id, rechazado: 'tamano' });
      return responderJSON(res, 413, { ok: false, error: 'tamano' });
    }
    if (lectura.estado !== 'ok' || !esObjeto(lectura.valor)) {
      registrar('lead', { id, rechazado: 'cuerpo' });
      return responderJSON(res, 400, { ok: false, error: 'validacion', campos: ['cuerpo'] });
    }
    const cuerpo = lectura.valor;

    // Antes de validar: al bot siempre se le responde igual que a una persona.
    const trampa = revisarTrampa(cuerpo);
    if (trampa.trampa) {
      registrar('lead', { id, descartado: trampa.motivo, ms: trampa.ms });
      return responderJSON(res, 200, { ok: true });
    }

    const validacion = validarLead(cuerpo);
    if (!validacion.ok) {
      registrar('lead', { id, rechazado: 'validacion', campos: validacion.campos });
      return responderJSON(res, 400, { ok: false, error: 'validacion', campos: validacion.campos });
    }

    if (!limitador.permitir(claveIP(obtenerIP(req)))) {
      registrar('lead', { id, rechazado: 'limite' });
      return responderJSON(res, 429, { ok: false, error: 'limite' });
    }

    const fila = { fecha: new Date().toISOString(), ...validacion.datos };
    const [planilla, telegram] = await Promise.all([
      sinRechazo(enviarAAppsScript('lead', fila, { id })),
      sinRechazo(enviarTelegram(mensajeLead(fila), { id })),
    ]);

    // Si la planilla no confirmó pero Telegram sí, se avisa para anotarlo a mano.
    let aviso;
    if (!planilla.ok && telegram.ok) {
      aviso = await sinRechazo(enviarTelegram(mensajeAvisoPlanilla(fila), { id, timeoutMs: 3000 }));
    }

    const exito = planilla.ok || telegram.ok;
    const avisos = [...validacion.avisos];
    if (trampa.aviso) avisos.push(trampa.aviso);
    registrar(
      'lead',
      {
        id,
        resultado: exito ? 'ok' : 'error',
        planilla: estado(planilla),
        telegram: estado(telegram),
        aviso_planilla: aviso ? estado(aviso) : undefined,
        ms: Date.now() - inicio,
        h: fila.h || undefined,
        plan: fila.plan_interes || undefined,
        origen: fila.utm_source || (fila.gclid || fila.gbraid || fila.wbraid ? 'gclid' : 'directo'),
        avisos: avisos.length ? avisos : undefined,
      },
      exito && planilla.ok && telegram.ok ? 'info' : 'error'
    );

    if (!exito) return responderJSON(res, 500, { ok: false, error: 'envio' });
    return responderJSON(res, 200, { ok: true });
  } catch (e) {
    registrar('lead', { id, resultado: 'excepcion', error: String((e && e.name) || 'error') }, 'error');
    return responderJSON(res, 500, { ok: false, error: 'envio' });
  }
};
