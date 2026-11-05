/**
 * Planilla de leads · Espíritu Digital
 *
 * Recibe lo que envían las funciones de Vercel /api/lead y /api/wa-click y lo anota
 * en las pestañas "Leads", "Clics WhatsApp", "Referidos" y "Descartados". Por cada
 * lead nuevo envía un correo con el detalle a EMAIL_AVISO. La función configurar()
 * prepara todo, incluida la pestaña "Resumen" con fórmulas; instalarLimpiezaMensual()
 * activa el borrado de datos con más de 24 meses.
 *
 * Seguridad:
 * - El secreto vive en Propiedades del script (APPS_SCRIPT_SECRET), nunca en este archivo.
 * - Todo texto que llega se escribe como texto: ninguna celda se interpreta como
 *   fórmula (=, +, -, @), número ni fecha.
 *
 * Guía paso a paso: docs/apps-script-guia.md
 */

const HOJA_LEADS = 'Leads';
const HOJA_CLICS = 'Clics WhatsApp';
const HOJA_REFERIDOS = 'Referidos';
const HOJA_RESUMEN = 'Resumen';
const HOJA_DESCARTADOS = 'Descartados';
const ZONA_HORARIA = 'America/Santiago';
const PROP_SECRETO = 'APPS_SCRIPT_SECRET';
const PROP_PLANILLA = 'PLANILLA_ID';
const PROP_EMAIL = 'EMAIL_AVISO';
const EMAIL_POR_DEFECTO = 'espiritudigital.chile@gmail.com';
const RETENCION_MESES = 24; // lo que promete la política de privacidad
const VENTANA_DUPLICADO_MIN = 10; // mismo WhatsApp dentro de este plazo = mismo lead
const ENLACE_REFERIDOS = 'https://espiritudigital.cl/tiendas-online?ref=';
const SEMANAS_RESUMEN = 30;
const MAX_CUERPO = 20000;

const FORMATO_FECHA_HORA = 'dd/mm/yyyy hh:mm';
const FORMATO_FECHA = 'dd/mm/yyyy';
const FORMATO_PESOS = '"$"#,##0';

const COLUMNAS = {};
COLUMNAS[HOJA_LEADS] = [
  'fecha', 'nombre', 'whatsapp', 'que_vende', 'vende_online', 'plazo', 'presupuesto', 'plan_interes',
  'consentimiento', 'ref', 'gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign',
  'utm_term', 'utm_content', 'h', 'landing_path', 'etapa', 'calificado', 'minutos_primera_respuesta',
  'monto_cierre', 'motivo_perdida', 'fecha_recontacto', 'notas',
];
COLUMNAS[HOJA_CLICS] = [
  'fecha', 'cta_location', 'plan', 'ref', 'gclid', 'utm_source', 'utm_campaign', 'utm_term', 'h', 'landing_path',
];
COLUMNAS[HOJA_REFERIDOS] = [
  'fecha', 'referidor', 'slug', 'enlace', 'referido', 'estado', 'recompensa_entregada', 'notas',
];
// Envíos que la API descartó como posible bot (campo trampa o llenado en menos de 3 s).
// Quedan aquí para recuperar a mano un lead real descartado por error. No avisan.
COLUMNAS[HOJA_DESCARTADOS] = [
  'fecha', 'motivo', 'ms', 'nombre', 'whatsapp', 'que_vende', 'h', 'landing_path', 'utm_source', 'gclid',
];

// Lo que llega desde Vercel y se copia tal cual (como texto). El resto de las
// columnas de Leads (etapa en adelante) las llena Cristian.
const CAMPOS_LEAD = [
  'nombre', 'whatsapp', 'que_vende', 'vende_online', 'plazo', 'presupuesto', 'plan_interes', 'ref', 'gclid',
  'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'h', 'landing_path',
];
const CAMPOS_CLIC = ['cta_location', 'plan', 'ref', 'gclid', 'utm_source', 'utm_campaign', 'utm_term', 'h', 'landing_path'];

const ETAPAS = ['nuevo', 'contactado', 'llamada', 'vista_previa', 'propuesta', 'ganado', 'perdido', 'mas_adelante'];
const ESTADOS_REFERIDO = ['enlace', 'lead', 'calificado', 'ganado', 'perdido'];

// ---------------------------------------------------------------------------
// Aplicación web
// ---------------------------------------------------------------------------

/** Recibe { secreto, tipo: 'lead' | 'wa_click' | 'referido' | 'descartado', datos }. */
function doPost(e) {
  try {
    const contenido = e && e.postData ? e.postData.contents : '';
    if (!contenido) return responder_({ ok: false, error: 'vacio', codigo: 400 });
    if (contenido.length > MAX_CUERPO) return responder_({ ok: false, error: 'tamano', codigo: 413 });

    let cuerpo;
    try {
      cuerpo = JSON.parse(contenido);
    } catch (err) {
      return responder_({ ok: false, error: 'json', codigo: 400 });
    }
    if (!cuerpo || typeof cuerpo !== 'object') return responder_({ ok: false, error: 'json', codigo: 400 });

    // Apps Script no permite elegir el código HTTP: el 403 va dentro del JSON.
    if (!secretoValido_(cuerpo.secreto)) return responder_({ ok: false, error: 'secreto', codigo: 403 });

    const tipo = cuerpo.tipo;
    const datos = cuerpo.datos && typeof cuerpo.datos === 'object' ? cuerpo.datos : {};
    if (['lead', 'wa_click', 'referido', 'descartado'].indexOf(tipo) === -1) {
      return responder_({ ok: false, error: 'tipo', codigo: 400 });
    }
    if (tipo === 'referido' && !limpiar_(datos.slug, 200)) {
      return responder_({ ok: false, error: 'datos', codigo: 400 });
    }

    // Un envío a la vez: dos leads simultáneos nunca pisan la misma fila.
    let leadNuevo = false;
    const candado = LockService.getScriptLock();
    if (!candado.tryLock(10000)) return responder_({ ok: false, error: 'ocupado', codigo: 503 });
    try {
      const ss = planilla_();
      if (tipo === 'lead') leadNuevo = anotarLead_(ss, datos);
      else if (tipo === 'wa_click') anotarClic_(ss, datos);
      else if (tipo === 'descartado') anotarDescartado_(ss, datos);
      else anotarReferido_(ss, datos);
      SpreadsheetApp.flush();
    } finally {
      candado.releaseLock();
    }
    // El correo con el detalle va fuera del candado. Si falla, la fila ya quedó anotada
    // y Telegram ya avisó (sin datos personales) que llegó un lead.
    if (leadNuevo) {
      try {
        enviarAvisoCorreo_(datos);
      } catch (err) {
        console.error('Correo de aviso: ' + (err && err.message ? err.message : err));
      }
    }
    return responder_({ ok: true });
  } catch (err) {
    console.error('doPost: ' + (err && err.message ? err.message : err));
    return responder_({ ok: false, error: 'interno', codigo: 500 });
  }
}

/** Abrir la URL /exec en el navegador debe mostrar {"ok":true}. Sirve para revisar el acceso. */
function doGet() {
  return responder_({ ok: true });
}

// ---------------------------------------------------------------------------
// Funciones para ejecutar desde el editor
// ---------------------------------------------------------------------------

/**
 * Prepara la planilla. Se puede ejecutar varias veces: no borra datos, no duplica
 * pestañas y no cambia un secreto que ya existe.
 */
function configurar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Abre este editor desde la planilla: Extensiones > Apps Script.');

  ss.setSpreadsheetTimeZone(ZONA_HORARIA);
  try {
    ss.setSpreadsheetLocale('es_CL');
  } catch (err) {
    console.warn('No se pudo fijar la configuración regional es_CL: ' + err.message);
  }

  const props = PropertiesService.getScriptProperties();
  props.setProperty(PROP_PLANILLA, ss.getId());

  const leads = asegurarHoja_(ss, HOJA_LEADS);
  prepararLeads_(leads);
  const clics = asegurarHoja_(ss, HOJA_CLICS);
  prepararClics_(clics);
  const referidos = asegurarHoja_(ss, HOJA_REFERIDOS);
  prepararReferidos_(referidos);
  asegurarHoja_(ss, HOJA_DESCARTADOS);

  if (!props.getProperty(PROP_EMAIL)) {
    props.setProperty(PROP_EMAIL, EMAIL_POR_DEFECTO);
    console.log('Los avisos de leads llegarán a ' + EMAIL_POR_DEFECTO + '. Para cambiarlo, edita la propiedad ' + PROP_EMAIL + '.');
  }

  if (ss.getSheetByName(HOJA_RESUMEN)) {
    console.log('La pestaña Resumen ya existe y no se tocó. Para recrearla, bórrala y vuelve a ejecutar configurar.');
  } else {
    crearResumen_(ss, leads, clics);
  }

  borrarHojaInicialVacia_(ss);

  if (!props.getProperty(PROP_SECRETO)) {
    props.setProperty(PROP_SECRETO, nuevoSecreto_());
    console.log('Se creó el secreto. Cópialo desde Configuración del proyecto > Propiedades del script > ' + PROP_SECRETO + '.');
  } else {
    console.log('El secreto ya existía y no se cambió.');
  }
  console.log('Listo: pestañas, encabezados, listas desplegables y Resumen preparados.');
}

/** Anota un lead de prueba como si llegara desde Vercel. Bórralo después. */
function probarAnotacion() {
  const secreto = PropertiesService.getScriptProperties().getProperty(PROP_SECRETO);
  if (!secreto) throw new Error('Primero ejecuta configurar().');
  const evento = {
    postData: {
      contents: JSON.stringify({
        secreto: secreto,
        tipo: 'lead',
        datos: {
          fecha: new Date().toISOString(),
          nombre: 'PRUEBA (borrar)',
          whatsapp: '+56900000000',
          que_vende: '=SUMA(1;1) esto debe verse como texto, no como fórmula',
          vende_online: 'no',
          plazo: 'cotizando',
          presupuesto: 'menos_350',
          plan_interes: '',
          consentimiento: true,
          ref: '',
          gclid: 'prueba',
          gbraid: '',
          wbraid: '',
          utm_source: 'prueba',
          utm_medium: '',
          utm_campaign: '',
          utm_term: '',
          utm_content: '',
          h: 'tienda',
          landing_path: '/tiendas-online',
        },
      }),
    },
  };
  console.log('Respuesta: ' + doPost(evento).getContent());
}

/**
 * Borra las filas con más de RETENCION_MESES meses en Leads, Clics WhatsApp, Descartados
 * y Referidos, como promete la política de privacidad. Respeta a los clientes (etapa o
 * estado "ganado") y los enlaces de cada referidor (estado "enlace"), y en Leads cuenta
 * desde el último contacto (fecha_recontacto, si es posterior).
 */
function limpiarAntiguos() {
  const ss = planilla_();
  const corte = new Date();
  corte.setMonth(corte.getMonth() - RETENCION_MESES);
  let borradas = 0;
  [HOJA_LEADS, HOJA_CLICS, HOJA_DESCARTADOS, HOJA_REFERIDOS].forEach(function (nombre) {
    const hoja = ss.getSheetByName(nombre);
    if (!hoja || hoja.getLastRow() < 2) return;
    const encabezados = leerEncabezados_(hoja);
    const cFecha = encabezados.indexOf('fecha');
    const cRecontacto = encabezados.indexOf('fecha_recontacto');
    const cEtapa = encabezados.indexOf('etapa');
    const cEstado = encabezados.indexOf('estado');
    if (cFecha < 0) return;
    const valores = hoja.getRange(2, 1, hoja.getLastRow() - 1, encabezados.length).getValues();
    // De abajo hacia arriba, para que borrar no corra las filas pendientes.
    for (let i = valores.length - 1; i >= 0; i--) {
      if (cEtapa >= 0 && String(valores[i][cEtapa]).trim() === 'ganado') continue;
      if (cEstado >= 0 && ['ganado', 'enlace'].indexOf(String(valores[i][cEstado]).trim()) >= 0) continue;
      let referencia = new Date(valores[i][cFecha]);
      if (cRecontacto >= 0) {
        const recontacto = new Date(valores[i][cRecontacto]);
        if (!isNaN(recontacto.getTime()) && recontacto > referencia) referencia = recontacto;
      }
      if (!isNaN(referencia.getTime()) && referencia < corte) {
        hoja.deleteRow(i + 2);
        borradas++;
      }
    }
  });
  console.log('limpiarAntiguos: ' + borradas + ' filas borradas (anteriores a ' + corte.toISOString().slice(0, 10) + ').');
  return borradas;
}

/** Ejecutar una sola vez: crea el disparador mensual de limpiarAntiguos (día 1, 4:00). */
function instalarLimpiezaMensual() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'limpiarAntiguos') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('limpiarAntiguos').timeBased().onMonthDay(1).atHour(4).create();
  console.log('Listo: limpiarAntiguos correrá el día 1 de cada mes.');
}

// ---------------------------------------------------------------------------
// Anotar filas
// ---------------------------------------------------------------------------

/** @returns {boolean} true si anotó una fila nueva; false si era un reenvío del mismo lead. */
function anotarLead_(ss, d) {
  const info = asegurarHoja_(ss, HOJA_LEADS);
  const valores = {
    fecha: fecha_(d.fecha),
    consentimiento: d.consentimiento === true,
    etapa: 'nuevo',
    calificado: false,
  };
  CAMPOS_LEAD.forEach(function (campo) {
    valores[campo] = texto_(d[campo], 500, campo === 'whatsapp');
  });
  // Si la API reintenta o la persona reenvía, no se duplica la fila ni el correo.
  if (esDuplicado_(info, limpiar_(d.whatsapp, 30), valores.fecha)) return false;
  const fila = agregarFila_(info, valores);
  formatearFila_(info, fila, {
    fecha: FORMATO_FECHA_HORA,
    etapa: reglaLista_(ETAPAS),
    calificado: reglaCasilla_(),
    fecha_recontacto: reglaFecha_(),
  });

  // Si llegó con enlace de referido, también queda en la pestaña Referidos.
  const ref = limpiar_(d.ref, 200);
  if (ref) {
    try {
      anotarReferidoDeLead_(ss, ref, d, valores.fecha);
    } catch (err) {
      console.error('Referidos: ' + err.message);
    }
  }
  return true;
}

// Mismo WhatsApp en las últimas filas, dentro de VENTANA_DUPLICADO_MIN minutos.
function esDuplicado_(info, whatsapp, fecha) {
  const digitos = String(whatsapp || '').replace(/\D/g, '');
  const cFecha = info.encabezados.indexOf('fecha');
  const cWhatsapp = info.encabezados.indexOf('whatsapp');
  const filas = info.hoja.getLastRow() - 1;
  if (!digitos || cFecha < 0 || cWhatsapp < 0 || filas < 1) return false;
  const revisar = Math.min(filas, 50);
  const valores = info.hoja.getRange(info.hoja.getLastRow() - revisar + 1, 1, revisar, info.encabezados.length).getValues();
  const limite = VENTANA_DUPLICADO_MIN * 60 * 1000;
  for (let i = 0; i < valores.length; i++) {
    const otro = String(valores[i][cWhatsapp]).replace(/\D/g, '');
    const cuando = new Date(valores[i][cFecha]);
    if (otro === digitos && !isNaN(cuando.getTime()) && Math.abs(fecha.getTime() - cuando.getTime()) < limite) return true;
  }
  return false;
}

function anotarDescartado_(ss, d) {
  const info = asegurarHoja_(ss, HOJA_DESCARTADOS);
  const ms = Number(d.ms);
  const valores = {
    fecha: fecha_(d.fecha),
    motivo: texto_(d.motivo, 30),
    ms: Number.isFinite(ms) ? ms : '',
  };
  ['nombre', 'whatsapp', 'que_vende', 'h', 'landing_path', 'utm_source', 'gclid'].forEach(function (campo) {
    valores[campo] = texto_(d[campo], 300);
  });
  const fila = agregarFila_(info, valores);
  formatearFila_(info, fila, { fecha: FORMATO_FECHA_HORA });
}

// Aviso con el detalle del lead al correo de Cristian (Gmail, el mismo proveedor de la
// planilla). Texto plano: nada de lo que escribió la persona se interpreta como HTML.
function enviarAvisoCorreo_(d) {
  const destino = PropertiesService.getScriptProperties().getProperty(PROP_EMAIL) || EMAIL_POR_DEFECTO;
  const numero = String(d.whatsapp || '').replace(/\D/g, '');
  const origen = [d.utm_source, d.utm_medium, d.utm_campaign].filter(Boolean).join(' / ') ||
    (d.gclid || d.gbraid || d.wbraid ? 'Google Ads (sin UTM)' : 'directo');
  const lineas = [
    'Nuevo lead de tiendas online',
    '',
    'Nombre: ' + limpiar_(d.nombre, 80),
    'Qué vende: ' + limpiar_(d.que_vende, 200),
    'Vende online: ' + limpiar_(d.vende_online, 40),
    'Plazo: ' + limpiar_(d.plazo, 40),
    'Presupuesto (sin IVA): ' + limpiar_(d.presupuesto, 40),
    'Plan: ' + (limpiar_(d.plan_interes, 40) || 'sin plan'),
    'Origen: ' + limpiar_(origen, 200) + (d.utm_term ? ' · término: ' + limpiar_(d.utm_term, 200) : ''),
    'Variante: ' + (limpiar_(d.h, 20) || '-') + ' · Ref: ' + (limpiar_(d.ref, 200) || '-'),
    '',
    'Escríbele ahora: https://wa.me/' + numero,
    '',
    'Recuerda anotar la etapa y los minutos de primera respuesta en la planilla.',
  ];
  MailApp.sendEmail({
    to: destino,
    subject: 'Nuevo lead de tiendas: ' + limpiar_(d.nombre, 60),
    body: lineas.join('\n'),
  });
}

function anotarClic_(ss, d) {
  const info = asegurarHoja_(ss, HOJA_CLICS);
  const valores = { fecha: fecha_(d.fecha) };
  CAMPOS_CLIC.forEach(function (campo) {
    valores[campo] = texto_(d[campo], 300);
  });
  const fila = agregarFila_(info, valores);
  formatearFila_(info, fila, { fecha: FORMATO_FECHA_HORA });
}

// tipo 'referido': alta directa de un enlace (por ejemplo, desde otra herramienta).
function anotarReferido_(ss, d) {
  const slug = limpiar_(d.slug, 200);
  const estado = limpiar_(d.estado, 30);
  anotarFilaReferido_(ss, {
    fecha: fecha_(d.fecha),
    referidor: texto_(d.referidor, 200),
    slug: texto_(slug, 200),
    enlace: texto_(d.enlace || ENLACE_REFERIDOS + encodeURIComponent(slug), 300),
    referido: texto_(d.referido, 200),
    estado: ESTADOS_REFERIDO.indexOf(estado) >= 0 ? estado : 'enlace',
    recompensa_entregada: false,
    notas: texto_(d.notas, 500),
  });
}

function anotarReferidoDeLead_(ss, ref, d, fecha) {
  const info = asegurarHoja_(ss, HOJA_REFERIDOS);
  anotarFilaReferido_(ss, {
    fecha: fecha,
    referidor: texto_(buscarReferidor_(info, ref), 200),
    slug: texto_(ref, 200),
    enlace: texto_(ENLACE_REFERIDOS + encodeURIComponent(ref), 300),
    referido: texto_(d.nombre, 200),
    estado: 'lead',
    recompensa_entregada: false,
    notas: '',
  });
}

function anotarFilaReferido_(ss, valores) {
  const info = asegurarHoja_(ss, HOJA_REFERIDOS);
  const fila = agregarFila_(info, valores);
  formatearFila_(info, fila, {
    fecha: FORMATO_FECHA,
    estado: reglaLista_(ESTADOS_REFERIDO),
    recompensa_entregada: reglaCasilla_(),
  });
}

// Nombre del referidor según las filas de enlaces que ya están en la pestaña.
function buscarReferidor_(info, slug) {
  const cSlug = info.encabezados.indexOf('slug');
  const cReferidor = info.encabezados.indexOf('referidor');
  const filas = info.hoja.getLastRow() - 1;
  if (cSlug < 0 || cReferidor < 0 || filas < 1) return '';
  const valores = info.hoja.getRange(2, 1, filas, info.encabezados.length).getValues();
  const buscado = String(slug).toLowerCase();
  for (let i = 0; i < valores.length; i++) {
    const nombre = String(valores[i][cReferidor]).trim();
    if (nombre && String(valores[i][cSlug]).trim().toLowerCase() === buscado) return nombre;
  }
  return '';
}

// ---------------------------------------------------------------------------
// Pestañas y encabezados
// ---------------------------------------------------------------------------

/**
 * Crea la pestaña si falta y agrega al final los encabezados que falten, sin mover
 * los que ya existen. Las filas se escriben por nombre de encabezado: si Cristian
 * agrega o mueve columnas, nada se descuadra.
 */
function asegurarHoja_(ss, nombre) {
  const columnas = COLUMNAS[nombre];
  let hoja = ss.getSheetByName(nombre);
  if (!hoja) hoja = ss.insertSheet(nombre);

  let encabezados = leerEncabezados_(hoja);
  const faltantes = columnas.filter(function (c) {
    return encabezados.indexOf(c) === -1;
  });
  if (faltantes.length) {
    let ultimo = -1;
    encabezados.forEach(function (v, i) {
      if (v) ultimo = i;
    });
    const total = ultimo + 1 + faltantes.length;
    asegurarColumnas_(hoja, total);
    hoja.getRange(1, ultimo + 2, 1, faltantes.length).setValues([faltantes]);
    hoja.getRange(1, 1, 1, total).setFontWeight('bold');
    hoja.setFrozenRows(1);
    encabezados = leerEncabezados_(hoja);
  }
  return { hoja: hoja, encabezados: encabezados };
}

function leerEncabezados_(hoja) {
  const ancho = Math.max(hoja.getLastColumn(), 1);
  return hoja
    .getRange(1, 1, 1, ancho)
    .getValues()[0]
    .map(function (v) {
      return String(v).trim();
    });
}

// Una pestaña nueva trae 26 columnas (A a Z) y Leads necesita 27.
function asegurarColumnas_(hoja, cantidad) {
  const actuales = hoja.getMaxColumns();
  if (actuales < cantidad) hoja.insertColumnsAfter(actuales, cantidad - actuales);
}

function agregarFila_(info, valores) {
  const hoja = info.hoja;
  const fila = Math.max(hoja.getLastRow() + 1, 2);
  if (fila > hoja.getMaxRows()) hoja.insertRowsAfter(hoja.getMaxRows(), fila - hoja.getMaxRows() + 100);
  const arreglo = info.encabezados.map(function (h) {
    return Object.prototype.hasOwnProperty.call(valores, h) ? valores[h] : '';
  });
  hoja.getRange(fila, 1, 1, arreglo.length).setValues([arreglo]);
  return fila;
}

// formatos: { columna: 'formato de número' | regla de validación }
function formatearFila_(info, fila, formatos) {
  Object.keys(formatos).forEach(function (nombre) {
    const col = info.encabezados.indexOf(nombre) + 1;
    if (!col) return;
    const celda = info.hoja.getRange(fila, col);
    const valor = formatos[nombre];
    if (typeof valor === 'string') celda.setNumberFormat(valor);
    else celda.setDataValidation(valor);
  });
}

function prepararLeads_(info) {
  const hoja = info.hoja;
  const filas = hoja.getMaxRows() - 1;
  const rango = function (nombre) {
    const col = info.encabezados.indexOf(nombre) + 1;
    return col ? hoja.getRange(2, col, filas, 1) : null;
  };
  aplicar_(rango('fecha'), function (r) { r.setNumberFormat(FORMATO_FECHA_HORA); });
  aplicar_(rango('etapa'), function (r) { r.setDataValidation(reglaLista_(ETAPAS)); });
  aplicar_(rango('calificado'), function (r) { r.setDataValidation(reglaCasilla_()); });
  aplicar_(rango('fecha_recontacto'), function (r) { r.setDataValidation(reglaFecha_()).setNumberFormat(FORMATO_FECHA); });
  aplicar_(rango('monto_cierre'), function (r) { r.setNumberFormat(FORMATO_PESOS); });
  aplicar_(rango('minutos_primera_respuesta'), function (r) { r.setNumberFormat('0'); });
  hoja.setFrozenRows(1);
  hoja.setFrozenColumns(2);
  ['nombre', 'que_vende', 'notas'].forEach(function (nombre) {
    const col = info.encabezados.indexOf(nombre) + 1;
    if (col) hoja.setColumnWidth(col, nombre === 'nombre' ? 160 : 260);
  });
}

function prepararClics_(info) {
  const col = info.encabezados.indexOf('fecha') + 1;
  if (col) info.hoja.getRange(2, col, info.hoja.getMaxRows() - 1, 1).setNumberFormat(FORMATO_FECHA_HORA);
  info.hoja.setFrozenRows(1);
}

function prepararReferidos_(info) {
  const hoja = info.hoja;
  const filas = hoja.getMaxRows() - 1;
  const rango = function (nombre) {
    const col = info.encabezados.indexOf(nombre) + 1;
    return col ? hoja.getRange(2, col, filas, 1) : null;
  };
  aplicar_(rango('fecha'), function (r) { r.setNumberFormat(FORMATO_FECHA); });
  aplicar_(rango('estado'), function (r) { r.setDataValidation(reglaLista_(ESTADOS_REFERIDO)); });
  aplicar_(rango('recompensa_entregada'), function (r) { r.setDataValidation(reglaCasilla_()); });
  hoja.setFrozenRows(1);
}

function aplicar_(rango, fn) {
  if (rango) fn(rango);
}

function borrarHojaInicialVacia_(ss) {
  ['Hoja 1', 'Hoja1', 'Sheet1'].forEach(function (nombre) {
    const hoja = ss.getSheetByName(nombre);
    if (hoja && hoja.getLastRow() === 0 && hoja.getLastColumn() === 0 && ss.getSheets().length > 1) {
      ss.deleteSheet(hoja);
    }
  });
}

// ---------------------------------------------------------------------------
// Resumen
// ---------------------------------------------------------------------------

function crearResumen_(ss, leads, clics) {
  const hoja = ss.insertSheet(HOJA_RESUMEN, 0);
  const L = function (nombre) {
    return rangoColumna_(HOJA_LEADS, leads.encabezados, nombre);
  };
  const fechaLead = L('fecha');
  const calificado = L('calificado');
  const etapa = L('etapa');
  const monto = L('monto_cierre');
  const minutos = L('minutos_primera_respuesta');
  const fechaClic = rangoColumna_(HOJA_CLICS, clics.encabezados, 'fecha');

  hoja.getRange('A1').setValue('Resumen semanal').setFontWeight('bold').setFontSize(14);
  hoja
    .getRange('A2:K2')
    .merge()
    .setWrap(true)
    .setValue(
      'Cada fila es una semana, de lunes a domingo. Los leads se cuentan en la semana en que llegaron. ' +
        'Anota el gasto de Google Ads de cada semana en la columna amarilla; lo demás se calcula solo. ' +
        'Propuestas = leads que hoy están en "propuesta" o "ganado".'
    );
  hoja.setRowHeight(2, 48);

  const titulos = [
    'Semana (lunes)', 'Leads', 'Clics WhatsApp', 'Calificados', 'Propuestas', 'Ventas', 'Monto cerrado',
    'Min. primera respuesta (promedio)', 'Gasto semana', 'Costo por lead', 'Costo por calificado',
  ];
  hoja.getRange(4, 1, 1, titulos.length).setValues([titulos]).setFontWeight('bold').setWrap(true);

  const primera = 5;
  const lunes = lunesActual_();
  const semanas = [];
  const conteos = [];
  const costos = [];
  for (let i = 0; i < SEMANAS_RESUMEN; i++) {
    const r = primera + i;
    // DATE() da la medianoche exacta en la zona de la planilla, sin desfases de hora.
    semanas.push([i === 0 ? '=DATE(' + lunes.join(',') + ')' : '=A' + (r - 1) + '+7']);
    const semana = fechaLead + ',">="&$A' + r + ',' + fechaLead + ',"<"&($A' + r + '+7)';
    conteos.push([
      '=COUNTIFS(' + semana + ')',
      '=COUNTIFS(' + fechaClic + ',">="&$A' + r + ',' + fechaClic + ',"<"&($A' + r + '+7))',
      '=COUNTIFS(' + semana + ',' + calificado + ',TRUE)',
      '=COUNTIFS(' + semana + ',' + etapa + ',"propuesta")+COUNTIFS(' + semana + ',' + etapa + ',"ganado")',
      '=COUNTIFS(' + semana + ',' + etapa + ',"ganado")',
      '=SUMIFS(' + monto + ',' + semana + ',' + etapa + ',"ganado")',
      '=IFERROR(AVERAGEIFS(' + minutos + ',' + semana + ',' + minutos + ',"<>"),"")',
    ]);
    costos.push([
      '=IF(AND(ISNUMBER($I' + r + '),$B' + r + '>0),$I' + r + '/$B' + r + ',"")',
      '=IF(AND(ISNUMBER($I' + r + '),$D' + r + '>0),$I' + r + '/$D' + r + ',"")',
    ]);
  }
  const ultima = primera + SEMANAS_RESUMEN - 1;
  hoja.getRange(primera, 1, SEMANAS_RESUMEN, 1).setFormulas(semanas).setNumberFormat(FORMATO_FECHA);
  hoja.getRange(primera, 2, SEMANAS_RESUMEN, 7).setFormulas(conteos);
  hoja.getRange(primera, 10, SEMANAS_RESUMEN, 2).setFormulas(costos);
  hoja.getRange(primera, 9, SEMANAS_RESUMEN, 1).setBackground('#FFF2CC');

  hoja
    .getRange(3, 1, 1, 11)
    .setValues([[
      'Total',
      '=SUM(B5:B)', '=SUM(C5:C)', '=SUM(D5:D)', '=SUM(E5:E)', '=SUM(F5:F)', '=SUM(G5:G)',
      '=IFERROR(AVERAGE(' + minutos + '),"")',
      '=SUM(I5:I)',
      '=IF(AND(I3>0,B3>0),I3/B3,"")',
      '=IF(AND(I3>0,D3>0),I3/D3,"")',
    ]])
    .setFontWeight('bold');

  hoja.getRange(3, 7, ultima - 2, 1).setNumberFormat(FORMATO_PESOS);
  hoja.getRange(3, 8, ultima - 2, 1).setNumberFormat('0.0');
  hoja.getRange(3, 9, ultima - 2, 3).setNumberFormat(FORMATO_PESOS);
  hoja.setFrozenRows(4);
  hoja.setColumnWidth(1, 120);
  hoja.setColumnWidths(2, 10, 110);
}

// 'Leads'!$A$2:$A según la posición actual del encabezado.
function rangoColumna_(hoja, encabezados, nombre) {
  const indice = encabezados.indexOf(nombre);
  if (indice < 0) throw new Error('Falta la columna ' + nombre + ' en ' + hoja);
  const letra = letraColumna_(indice + 1);
  return "'" + hoja + "'!$" + letra + '$2:$' + letra;
}

function letraColumna_(n) {
  let letra = '';
  while (n > 0) {
    const resto = (n - 1) % 26;
    letra = String.fromCharCode(65 + resto) + letra;
    n = Math.floor((n - 1) / 26);
  }
  return letra;
}

// [año, mes, día] del lunes de esta semana en Santiago.
function lunesActual_() {
  const hoy = Utilities.formatDate(new Date(), ZONA_HORARIA, 'yyyy-MM-dd').split('-').map(Number);
  const base = new Date(Date.UTC(hoy[0], hoy[1] - 1, hoy[2]));
  base.setUTCDate(base.getUTCDate() - ((base.getUTCDay() + 6) % 7));
  return [base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate()];
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function planilla_() {
  const activa = SpreadsheetApp.getActiveSpreadsheet();
  if (activa) return activa;
  const id = PropertiesService.getScriptProperties().getProperty(PROP_PLANILLA);
  if (!id) throw new Error('Falta PLANILLA_ID: ejecuta configurar() desde el editor de la planilla.');
  return SpreadsheetApp.openById(id);
}

function responder_(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}

function secretoValido_(recibido) {
  const guardado = PropertiesService.getScriptProperties().getProperty(PROP_SECRETO);
  if (!guardado || guardado.length < 24) return false;
  if (typeof recibido !== 'string' || !recibido) return false;
  // Se comparan resúmenes SHA-256 en tiempo constante.
  const a = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, recibido, Utilities.Charset.UTF_8);
  const b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, guardado, Utilities.Charset.UTF_8);
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a[i] ^ b[i];
  return diferencia === 0;
}

function nuevoSecreto_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}

function fecha_(valor) {
  const d = valor ? new Date(valor) : new Date();
  return isNaN(d.getTime()) ? new Date() : d;
}

// Una sola línea, sin caracteres de control ni de formato invisibles, con tope de largo.
function limpiar_(valor, maximo) {
  if (typeof valor !== 'string' && typeof valor !== 'number') return '';
  const s = String(valor)
    .replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029]/g, ' ')
    .replace(/[\u200B\u200E\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return s.length > maximo ? s.slice(0, maximo) : s;
}

/**
 * Texto seguro para una celda. El apóstrofo inicial obliga a Sheets a guardarlo como
 * texto y no se ve: neutraliza fórmulas (=, +, -, @) y evita que "+569..." pierda el
 * "+" o que "10-12" se convierta en fecha. Pero el apóstrofo se pierde al descargar la
 * planilla como CSV o Excel, así que a los textos que empiezan con = + - @ se les
 * antepone además un espacio. No lo necesitan el teléfono ya validado (+569...) ni un
 * identificador de solo letras, números, _ y - (sin paréntesis no hay fórmula que
 * ejecute): un gclid puede empezar con "-" y debe salir intacto para importar conversiones.
 */
function texto_(valor, maximo, esTelefono) {
  let s = limpiar_(valor, maximo || 500);
  if (!s) return '';
  if (!esTelefono && /^[=+\-@]/.test(s) && !/^[A-Za-z0-9_-]+$/.test(s)) s = ' ' + s;
  return "'" + s;
}

function reglaLista_(lista) {
  return SpreadsheetApp.newDataValidation().requireValueInList(lista, true).setAllowInvalid(false).build();
}

function reglaCasilla_() {
  return SpreadsheetApp.newDataValidation().requireCheckbox().build();
}

function reglaFecha_() {
  return SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(true).build();
}
