'use strict';

// Validación y normalización del formulario (/api/lead) y de los clics (/api/wa-click).
// Regla: lo que la persona ve y puede corregir se rechaza con 400; lo oculto que llega
// desde la URL (h, plan, UTM, gclid, ref) se sanea, porque rechazarlo perdería un lead
// por algo que la persona no puede ver ni arreglar.

const VENDE_ONLINE = ['no', 'instagram_whatsapp', 'tienda'];
const PLAZOS = ['este_mes', 'proximo_mes', 'cotizando'];
const PRESUPUESTOS = ['menos_350', '350_500', 'mas_500'];
const PLANES = ['esencial', 'pro', 'empresa', 'web'];
const VARIANTES = ['tienda', 'carrito', 'precio', 'web', 'alternativa'];

const CAMPOS_SEGUIMIENTO = [
  'ref',
  'gclid',
  'gbraid',
  'wbraid',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
];
const MAX_SEGUIMIENTO = 200;
const TIEMPO_MINIMO_MS = 3000;

function esObjeto(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

// Recorta, deja una sola línea y quita caracteres de control y de formato invisibles
// (incluidos los de dirección de texto, que sirven para disfrazar contenido).
function limpiarTexto(valor) {
  if (typeof valor !== 'string' && typeof valor !== 'number') return '';
  return String(valor)
    .normalize('NFC')
    .replace(/[\p{Cc}\u2028\u2029]/gu, ' ')
    .replace(/(?!\u200D)\p{Cf}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function largo(texto) {
  return Array.from(texto).length;
}

function cortar(texto, maximo) {
  return largo(texto) > maximo ? Array.from(texto).slice(0, maximo).join('') : texto;
}

function enumerado(valor) {
  return limpiarTexto(valor).toLowerCase();
}

// Acepta +56 9, 56 9 o 9, con espacios, guiones, puntos o paréntesis.
// Devuelve +569XXXXXXXX o null.
function normalizarWhatsapp(valor) {
  const digitos = limpiarTexto(valor).replace(/[\s\-.()\u2010-\u2015]/g, '');
  const m = /^(?:\+?56)?(9\d{8})$/.exec(digitos);
  return m ? `+56${m[1]}` : null;
}

/**
 * Campo trampa y tiempo mínimo. Un t0 en el futuro indica un reloj adelantado en el
 * equipo de la persona, no un bot: se acepta para no perder el lead.
 */
function revisarTrampa(cuerpo, ahora = Date.now()) {
  const hp = cuerpo.hp;
  if (hp !== undefined && hp !== null && String(hp).trim() !== '') {
    return { trampa: true, motivo: 'trampa' };
  }
  const t0 = typeof cuerpo.t0 === 'string' && cuerpo.t0.trim() !== '' ? Number(cuerpo.t0) : cuerpo.t0;
  if (typeof t0 !== 'number' || !Number.isFinite(t0)) return { trampa: false, aviso: 't0_ausente' };
  const transcurrido = ahora - t0;
  if (transcurrido < 0) return { trampa: false, aviso: 't0_futuro' };
  if (transcurrido < TIEMPO_MINIMO_MS) return { trampa: true, motivo: 'rapido', ms: transcurrido };
  return { trampa: false };
}

function validarLead(cuerpo) {
  const campos = [];
  const avisos = [];

  const nombre = limpiarTexto(cuerpo.nombre);
  if (largo(nombre) < 2 || largo(nombre) > 80) campos.push('nombre');

  const whatsapp = normalizarWhatsapp(cuerpo.whatsapp);
  if (!whatsapp) campos.push('whatsapp');

  const queVende = limpiarTexto(cuerpo.que_vende);
  if (largo(queVende) < 2 || largo(queVende) > 200) campos.push('que_vende');

  const vendeOnline = enumerado(cuerpo.vende_online);
  if (!VENDE_ONLINE.includes(vendeOnline)) campos.push('vende_online');

  const plazo = enumerado(cuerpo.plazo);
  if (!PLAZOS.includes(plazo)) campos.push('plazo');

  const presupuesto = enumerado(cuerpo.presupuesto);
  if (!PRESUPUESTOS.includes(presupuesto)) campos.push('presupuesto');

  if (cuerpo.consentimiento !== true) campos.push('consentimiento');

  if (campos.length) return { ok: false, campos };

  let planInteres = enumerado(cuerpo.plan_interes);
  if (planInteres && !PLANES.includes(planInteres)) {
    avisos.push('plan_interes');
    planInteres = '';
  }

  let h = enumerado(cuerpo.h);
  if (h && !VARIANTES.includes(h)) {
    avisos.push('h');
    h = '';
  }

  const seguimiento = {};
  for (const campo of [...CAMPOS_SEGUIMIENTO, 'landing_path']) {
    const valor = limpiarTexto(cuerpo[campo]);
    if (largo(valor) > MAX_SEGUIMIENTO) avisos.push(campo);
    seguimiento[campo] = cortar(valor, MAX_SEGUIMIENTO);
  }

  // Mismo orden que las columnas de la pestaña "Leads".
  const datos = {
    nombre,
    whatsapp,
    que_vende: queVende,
    vende_online: vendeOnline,
    plazo,
    presupuesto,
    plan_interes: planInteres,
    consentimiento: true,
    ref: seguimiento.ref,
    gclid: seguimiento.gclid,
    gbraid: seguimiento.gbraid,
    wbraid: seguimiento.wbraid,
    utm_source: seguimiento.utm_source,
    utm_medium: seguimiento.utm_medium,
    utm_campaign: seguimiento.utm_campaign,
    utm_term: seguimiento.utm_term,
    utm_content: seguimiento.utm_content,
    h,
    landing_path: seguimiento.landing_path,
  };
  return { ok: true, datos, avisos };
}

function sanearClic(cuerpo) {
  if (!esObjeto(cuerpo)) return { ok: false };
  const ctaLocation = cortar(limpiarTexto(cuerpo.cta_location), 80);
  if (!ctaLocation) return { ok: false };

  let plan = enumerado(cuerpo.plan);
  if (plan && !PLANES.includes(plan)) plan = '';
  let h = enumerado(cuerpo.h);
  if (h && !VARIANTES.includes(h)) h = '';
  const texto = (campo) => cortar(limpiarTexto(cuerpo[campo]), MAX_SEGUIMIENTO);

  // Mismo orden que las columnas de la pestaña "Clics WhatsApp".
  return {
    ok: true,
    datos: {
      cta_location: ctaLocation,
      plan,
      ref: texto('ref'),
      gclid: texto('gclid'),
      utm_source: texto('utm_source'),
      utm_campaign: texto('utm_campaign'),
      utm_term: texto('utm_term'),
      h,
      landing_path: texto('landing_path'),
    },
  };
}

module.exports = {
  VENDE_ONLINE,
  PLAZOS,
  PRESUPUESTOS,
  PLANES,
  VARIANTES,
  TIEMPO_MINIMO_MS,
  esObjeto,
  limpiarTexto,
  normalizarWhatsapp,
  revisarTrampa,
  validarLead,
  sanearClic,
};
