'use strict';

// POST /api/lead · formulario de la landing /tiendas-online.
// Contrato: docs/fases/fase-2.md. Planilla (que además envía el correo con el detalle)
// y Telegram (aviso sin datos personales) en paralelo. Solo la planilla guarda los datos:
// si no confirma, 500 para que la página ofrezca WhatsApp y Telegram avisa que se revise.
// Si solo falla Telegram, el lead igual quedó en la planilla y en el correo.

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
// Los envíos que parecen de un robot también tienen tope antes de llegar a la planilla:
// una ráfaga no debe ocupar el candado de Apps Script mientras llega un lead real.
// 3 por IP cada 10 minutos y 30 por instancia; sobre eso se responde igual, sin anotar.
const limitadorDescartados = crearLimitador({ max: 3, ventanaMs: 10 * 60 * 1000 });
const topeDescartados = crearLimitador({ max: 30, ventanaMs: 10 * 60 * 1000 });

const sinRechazo = (promesa) => promesa.catch(() => ({ ok: false, motivo: 'excepcion' }));
const estado = (r) => (r.ok ? 'ok' : r.motivo || 'error');

// Lo mínimo para reconocer y recuperar a mano un lead real descartado por error.
const corto = (v) => (typeof v === 'string' || typeof v === 'number' ? String(v).slice(0, 200) : '');
function datosDescartado(cuerpo, trampa) {
  return {
    fecha: new Date().toISOString(),
    motivo: trampa.motivo,
    ms: typeof trampa.ms === 'number' ? trampa.ms : '',
    nombre: corto(cuerpo.nombre),
    whatsapp: corto(cuerpo.whatsapp),
    que_vende: corto(cuerpo.que_vende),
    h: corto(cuerpo.h),
    landing_path: corto(cuerpo.landing_path),
    utm_source: corto(cuerpo.utm_source),
    gclid: corto(cuerpo.gclid),
  };
}

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

    // Antes de validar: al bot siempre se le responde igual que a una persona. El envío
    // queda en la pestaña "Descartados" (sin correo ni Telegram) por si era una persona.
    const trampa = revisarTrampa(cuerpo);
    if (trampa.trampa) {
      const cabe = limitadorDescartados.permitir(claveIP(obtenerIP(req))) && topeDescartados.permitir('todas');
      const anotado = cabe
        ? await sinRechazo(enviarAAppsScript('descartado', datosDescartado(cuerpo, trampa), { id, timeoutMs: 3000 }))
        : { ok: false, motivo: 'omitido_limite' };
      registrar('lead', { id, descartado: trampa.motivo, ms: trampa.ms, planilla: estado(anotado) });
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

    // Si la planilla no confirmó, tampoco salió el correo: Telegram ya anunció un lead
    // que nadie podrá identificar, así que se aclara (sin datos personales) qué pasó.
    let aviso;
    if (!planilla.ok && telegram.ok) {
      aviso = await sinRechazo(enviarTelegram(mensajeAvisoPlanilla(), { id, timeoutMs: 2000 }));
    }

    const exito = planilla.ok;
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
      planilla.ok && telegram.ok ? 'info' : 'error'
    );

    if (!exito) return responderJSON(res, 500, { ok: false, error: 'envio' });
    return responderJSON(res, 200, { ok: true });
  } catch (e) {
    registrar('lead', { id, resultado: 'excepcion', error: String((e && e.name) || 'error') }, 'error');
    return responderJSON(res, 500, { ok: false, error: 'envio' });
  }
};
