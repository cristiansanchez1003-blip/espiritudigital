#!/usr/bin/env node
// Banco de pruebas local de /api/lead y /api/wa-click. Sin red y sin dependencias.
// Importa los handlers, simula req/res y prueba dos caminos:
//   1. LEADS_MODO_PRUEBA=1: los envíos se escriben en os.tmpdir()/leads-prueba.jsonl.
//   2. Camino real con fetch simulado: Apps Script y Telegram responden lo que se pida.
// Uso: node scripts/probar-api.mjs   (sale con código 1 si algo falla)
// Todos los datos son ficticios.

import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lead = require(path.join(raiz, 'api/lead.js'));
const waClick = require(path.join(raiz, 'api/wa-click.js'));
const validacion = require(path.join(raiz, 'api/_lib/validacion.js'));
const { claveIP } = require(path.join(raiz, 'api/_lib/limite.js'));
const telegram = require(path.join(raiz, 'api/_lib/telegram.js'));

// ---------- valores ficticios ----------
const SECRETO = 'secreto-de-prueba-0123456789abcdef';
const TOKEN = '000000:TOKEN-DE-PRUEBA';
const URL_SCRIPT = 'https://script.google.com/macros/s/ID-DE-PRUEBA/exec';
const NOMBRE = 'Persona Prueba';
const TELEFONO_NORMAL = '+56912345678';
const DIRECCION_INVERTIDA = String.fromCharCode(0x202e);
const NULO = String.fromCharCode(0);
const ENTORNO_REAL = {
  LEADS_MODO_PRUEBA: undefined,
  VERCEL_ENV: undefined,
  APPS_SCRIPT_URL: URL_SCRIPT,
  APPS_SCRIPT_SECRET: SECRETO,
  TELEGRAM_BOT_TOKEN: TOKEN,
  TELEGRAM_CHAT_ID: '123456',
};

// ---------- utilidades ----------
let ipSiguiente = 1;
const nuevaIP = () => `203.0.113.${ipSiguiente++ % 250}`;

function leadValido(extra = {}) {
  return {
    nombre: NOMBRE,
    whatsapp: '+56 9 1234 5678',
    que_vende: 'Velas y jabones artesanales',
    vende_online: 'instagram_whatsapp',
    plazo: 'este_mes',
    presupuesto: '350_500',
    plan_interes: 'pro',
    consentimiento: true,
    ref: '',
    gclid: 'gclid-de-prueba',
    gbraid: '',
    wbraid: '',
    utm_source: 'google',
    utm_medium: 'cpc',
    utm_campaign: 'tiendas-online',
    utm_term: 'tienda online a medida',
    utm_content: '123456789',
    h: 'precio',
    landing_path: '/tiendas-online',
    hp: '',
    t0: Date.now() - 45000,
    ...extra,
  };
}

function crearReq({ method = 'POST', headers = {}, body, raw, vercelBody, ip } = {}) {
  const texto = raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : '';
  const buffer = Buffer.from(texto, 'utf8');
  const req = Readable.from(buffer.length ? [buffer] : [], { objectMode: false });
  req.method = method;
  const base = {
    'content-type': 'application/json',
    'content-length': String(buffer.length),
    'x-forwarded-for': ip || nuevaIP(),
    host: 'espiritudigital.cl',
  };
  req.headers = {};
  for (const [k, v] of Object.entries({ ...base, ...headers })) {
    if (v !== undefined) req.headers[k.toLowerCase()] = v;
  }
  req.socket = { remoteAddress: '127.0.0.1' };
  if (vercelBody !== undefined) {
    Object.defineProperty(req, 'body', {
      configurable: true,
      get: () => (typeof vercelBody === 'function' ? vercelBody() : vercelBody),
    });
  }
  return req;
}

function crearRes() {
  return {
    statusCode: 200,
    headersSent: false,
    cabeceras: {},
    cuerpo: '',
    setHeader(k, v) {
      this.cabeceras[k.toLowerCase()] = v;
    },
    getHeader(k) {
      return this.cabeceras[k.toLowerCase()];
    },
    end(contenido) {
      this.cuerpo = contenido === undefined ? '' : String(contenido);
      this.headersSent = true;
    },
  };
}

async function llamar(handler, opciones) {
  const req = crearReq(opciones);
  const res = crearRes();
  await handler(req, res);
  let json = null;
  try {
    json = res.cuerpo ? JSON.parse(res.cuerpo) : null;
  } catch {
    json = null;
  }
  return { status: res.statusCode, json, res };
}

// Entorno: se aplica y se restaura en cada prueba.
async function conEntorno(variables, fn) {
  const previo = {};
  for (const [k, v] of Object.entries(variables)) {
    previo[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries(previo)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

// Carpeta temporal propia para el archivo del modo de prueba.
const carpetaTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ed-probar-api-'));
const archivoPrueba = path.join(carpetaTmp, 'leads-prueba.jsonl');
const ENTORNO_PRUEBA = {
  LEADS_MODO_PRUEBA: '1',
  VERCEL_ENV: undefined,
  TMPDIR: carpetaTmp,
  APPS_SCRIPT_URL: undefined,
  APPS_SCRIPT_SECRET: undefined,
  TELEGRAM_BOT_TOKEN: undefined,
  TELEGRAM_CHAT_ID: undefined,
};
function lineasPrueba() {
  if (!fs.existsSync(archivoPrueba)) return [];
  return fs
    .readFileSync(archivoPrueba, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

// fetch simulado: cada destino responde según el escenario.
const llamadas = [];
let escenario = { apps_script: 'ok', telegram: 'ok' };
const jsonResp = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
globalThis.fetch = async (url, opciones = {}) => {
  const destino = String(url).startsWith('https://api.telegram.org/') ? 'telegram' : 'apps_script';
  let cuerpo = null;
  try {
    cuerpo = opciones.body ? JSON.parse(opciones.body) : null;
  } catch {
    cuerpo = opciones.body;
  }
  llamadas.push({ destino, url: String(url), cuerpo, opciones });
  const modo = escenario[destino];
  switch (modo) {
    case 'colgado':
      return new Promise((_, rechazar) => {
        opciones.signal.addEventListener('abort', () => rechazar(opciones.signal.reason));
      });
    case 'red':
      throw new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } });
    case 'http500':
      return new Response('error', { status: 500 });
    case 'secreto':
      return jsonResp({ ok: false, error: 'secreto', codigo: 403 });
    case 'html':
      return new Response('<html>Iniciar sesión</html>', { status: 200, headers: { 'content-type': 'text/html' } });
    case 'telegram400':
      return jsonResp({ ok: false, error_code: 400, description: 'Bad Request' }, 400);
    default:
      return jsonResp(destino === 'telegram' ? { ok: true, result: { message_id: 1 } } : { ok: true });
  }
};
function prepararFetch(nuevo) {
  escenario = { apps_script: 'ok', telegram: 'ok', ...nuevo };
  llamadas.length = 0;
}
const llamadasA = (destino) => llamadas.filter((l) => l.destino === destino);

// Registros de los handlers: se capturan para revisarlos y no ensuciar la salida.
const registros = [];
const consolaOriginal = { log: console.log, error: console.error, warn: console.warn };
function capturarConsola() {
  console.log = (...a) => registros.push(a.join(' '));
  console.error = (...a) => registros.push(a.join(' '));
  console.warn = (...a) => registros.push(a.join(' '));
}
function restaurarConsola() {
  Object.assign(console, consolaOriginal);
}

// Mini corredor de pruebas.
const pruebas = [];
const prueba = (nombre, fn) => pruebas.push({ nombre, fn });
const escribir = (t) => process.stdout.write(`${t}\n`);

// ======================================================================
// Unidades
// ======================================================================

prueba('normaliza los formatos chilenos de WhatsApp a +569XXXXXXXX', () => {
  for (const entrada of [
    '+56 9 1234 5678',
    '+56912345678',
    '56 9 1234 5678',
    '56912345678',
    '912345678',
    '9 1234 5678',
    '+56-9-1234-5678',
    ' 9-1234-5678 ',
    '(+56) 9 1234 5678',
  ]) {
    assert.equal(validacion.normalizarWhatsapp(entrada), TELEFONO_NORMAL, entrada);
  }
});

prueba('rechaza números que no son móviles chilenos', () => {
  for (const entrada of ['22345678', '+56 2 2345 6789', '812345678', '9123456', '91234567890', '+54 9 1234 5678', 'nueve', '', null, 912345678.5]) {
    assert.equal(validacion.normalizarWhatsapp(entrada), null, String(entrada));
  }
});

prueba('limpia caracteres de control y de dirección de texto', () => {
  const sucio = `  Ana${NULO}\n  María${DIRECCION_INVERTIDA}\t `;
  assert.equal(validacion.limpiarTexto(sucio), 'Ana María');
  assert.equal(validacion.limpiarTexto({ a: 1 }), '');
  assert.equal(validacion.limpiarTexto(['x']), '');
});

prueba('claveIP agrupa IPv6 por /64 y deja IPv4 tal cual', () => {
  assert.equal(claveIP('2800:150:1:2:aaaa:bbbb:cccc:dddd'), claveIP('2800:150:1:2::1'));
  assert.notEqual(claveIP('2800:150:1:2::1'), claveIP('2800:150:1:3::1'));
  assert.equal(claveIP('::ffff:200.1.2.3'), '200.1.2.3');
  assert.equal(claveIP('200.1.2.3'), '200.1.2.3');
  assert.equal(claveIP(''), 'desconocida');
});

prueba('mensaje de Telegram con el formato de 2.3 y etiquetas legibles', () => {
  const texto = telegram.mensajeLead({ fecha: 'x', ...validacion.validarLead(leadValido({ ref: 'maria-perez' })).datos });
  assert.match(texto, /^🛒 <b>Lead tiendas<\/b>/);
  for (const parte of [
    '<b>Nombre:</b> Persona Prueba',
    '<b>Qué vende:</b> Velas y jabones artesanales',
    '<b>Vende online:</b> Sí, por Instagram o WhatsApp',
    '<b>Plazo:</b> Este mes',
    '<b>Presupuesto (sin IVA):</b> $350.000 a $500.000',
    '<b>Plan:</b> Pro',
    '<b>Origen:</b> google / cpc / tiendas-online · término: tienda online a medida',
    '<b>h:</b> precio',
    '<b>Ref:</b> maria-perez',
    '<b>WhatsApp:</b> https://wa.me/56912345678',
  ]) {
    assert.ok(texto.includes(parte), `falta: ${parte}`);
  }
});

prueba('origen: "directo" sin UTM ni gclid, "Google Ads (sin UTM)" con solo gclid', () => {
  assert.equal(telegram.origen({}), 'directo');
  assert.equal(telegram.origen({ gclid: 'x' }), 'Google Ads (sin UTM)');
  assert.equal(telegram.origen({ wbraid: 'x' }), 'Google Ads (sin UTM)');
});

// ======================================================================
// /api/lead · modo de prueba (LEADS_MODO_PRUEBA=1)
// ======================================================================

prueba('lead válido → 200, teléfono normalizado y 2 eventos en el archivo de prueba', () =>
  conEntorno(ENTORNO_PRUEBA, async () => {
    prepararFetch();
    const antes = lineasPrueba().length;
    const r = await llamar(lead, { body: leadValido() });
    assert.equal(r.status, 200);
    assert.deepEqual(r.json, { ok: true });
    const nuevas = lineasPrueba().slice(antes);
    assert.equal(nuevas.length, 2);
    const planilla = nuevas.find((l) => l.destino === 'apps_script');
    const aviso = nuevas.find((l) => l.destino === 'telegram');
    assert.equal(planilla.tipo, 'lead');
    assert.equal(planilla.datos.whatsapp, TELEFONO_NORMAL);
    assert.equal(planilla.datos.gclid, 'gclid-de-prueba');
    assert.equal(planilla.datos.utm_term, 'tienda online a medida');
    assert.ok(!Number.isNaN(Date.parse(planilla.datos.fecha)));
    assert.equal(planilla.datos.consentimiento, true);
    assert.ok(!('hp' in planilla.datos) && !('t0' in planilla.datos));
    assert.ok(aviso.texto.includes('https://wa.me/56912345678'));
    assert.equal(llamadas.length, 0, 'el modo de prueba no debe usar la red');
    assert.ok(!fs.readFileSync(archivoPrueba, 'utf8').includes(SECRETO));
  })
);

prueba('las columnas de la planilla llegan en el orden del contrato', () =>
  conEntorno(ENTORNO_PRUEBA, async () => {
    const antes = lineasPrueba().length;
    await llamar(lead, { body: leadValido() });
    const planilla = lineasPrueba().slice(antes).find((l) => l.destino === 'apps_script');
    assert.deepEqual(Object.keys(planilla.datos), [
      'fecha', 'nombre', 'whatsapp', 'que_vende', 'vende_online', 'plazo', 'presupuesto', 'plan_interes',
      'consentimiento', 'ref', 'gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign',
      'utm_term', 'utm_content', 'h', 'landing_path',
    ]);
  })
);

const invalidos = [
  ['nombre', { nombre: 'A' }],
  ['nombre', { nombre: 'x'.repeat(81) }],
  ['nombre', { nombre: `${NULO} ` }],
  ['whatsapp', { whatsapp: '22345678' }],
  ['whatsapp', { whatsapp: '+56 2 2345 6789' }],
  ['whatsapp', { whatsapp: '9123' }],
  ['que_vende', { que_vende: 'x' }],
  ['que_vende', { que_vende: 'x'.repeat(201) }],
  ['vende_online', { vende_online: 'si' }],
  ['vende_online', { vende_online: '' }],
  ['plazo', { plazo: 'ya' }],
  ['presupuesto', { presupuesto: '1000000' }],
  ['consentimiento', { consentimiento: false }],
  ['consentimiento', { consentimiento: 'true' }],
  ['consentimiento', { consentimiento: undefined }],
];
for (const [campo, cambio] of invalidos) {
  prueba(`campo inválido ${campo} = ${JSON.stringify(Object.values(cambio)[0])?.slice(0, 20)} → 400 con "${campo}"`, () =>
    conEntorno(ENTORNO_PRUEBA, async () => {
      const antes = lineasPrueba().length;
      const r = await llamar(lead, { body: leadValido(cambio) });
      assert.equal(r.status, 400);
      assert.equal(r.json.ok, false);
      assert.equal(r.json.error, 'validacion');
      assert.deepEqual(r.json.campos, [campo]);
      assert.equal(lineasPrueba().length, antes, 'un lead inválido no se envía');
    })
  );
}

prueba('cuerpo vacío → 400 con todos los campos obligatorios, en el orden del formulario', () =>
  conEntorno(ENTORNO_PRUEBA, async () => {
    const r = await llamar(lead, { body: {} });
    assert.equal(r.status, 400);
    assert.deepEqual(r.json.campos, ['nombre', 'whatsapp', 'que_vende', 'vende_online', 'plazo', 'presupuesto', 'consentimiento']);
  })
);

prueba('sin consentimiento → 400 ["consentimiento"]', () =>
  conEntorno(ENTORNO_PRUEBA, async () => {
    const r = await llamar(lead, { body: leadValido({ consentimiento: false }) });
    assert.equal(r.status, 400);
    assert.deepEqual(r.json, { ok: false, error: 'validacion', campos: ['consentimiento'] });
  })
);

prueba('campo trampa con contenido → 200 {ok:true} sin enviar nada', () =>
  conEntorno(ENTORNO_PRUEBA, async () => {
    prepararFetch();
    const antes = lineasPrueba().length;
    const r = await llamar(lead, { body: leadValido({ hp: 'https://spam.example' }) });
    assert.equal(r.status, 200);
    assert.deepEqual(r.json, { ok: true });
    assert.equal(lineasPrueba().length, antes);
    assert.equal(llamadas.length, 0);
  })
);

prueba('trampa con el resto inválido → igual 200 (no enseña al bot)', () =>
  conEntorno(ENTORNO_PRUEBA, async () => {
    const r = await llamar(lead, { body: { hp: 'x', nombre: '' } });
    assert.equal(r.status, 200);
    assert.deepEqual(r.json, { ok: true });
  })
);

prueba('llenado en menos de 3 s desde t0 → 200 {ok:true} sin enviar nada', () =>
  conEntorno(ENTORNO_PRUEBA, async () => {
    const antes = lineasPrueba().length;
    const r = await llamar(lead, { body: leadValido({ t0: Date.now() - 1200 }) });
    assert.equal(r.status, 200);
    assert.deepEqual(r.json, { ok: true });
    assert.equal(lineasPrueba().length, antes);
  })
);

prueba('t0 como texto numérico también cuenta para el tiempo mínimo', () =>
  conEntorno(ENTORNO_PRUEBA, async () => {
    const antes = lineasPrueba().length;
    await llamar(lead, { body: leadValido({ t0: String(Date.now() - 500) }) });
    assert.equal(lineasPrueba().length, antes);
  })
);

prueba('t0 en el futuro (reloj adelantado) → se acepta y se envía', () =>
  conEntorno(ENTORNO_PRUEBA, async () => {
    const antes = lineasPrueba().length;
    const r = await llamar(lead, { body: leadValido({ t0: Date.now() + 5 * 60 * 1000 }) });
    assert.equal(r.status, 200);
    assert.equal(lineasPrueba().length, antes + 2);
  })
);

prueba('sin t0 → se acepta y se envía (un error de la landing no pierde leads)', () =>
  conEntorno(ENTORNO_PRUEBA, async () => {
    const antes = lineasPrueba().length;
    const r = await llamar(lead, { body: leadValido({ t0: undefined }) });
    assert.equal(r.status, 200);
    assert.equal(lineasPrueba().length, antes + 2);
  })
);

prueba('campos ocultos se sanean: h y plan desconocidos quedan vacíos, mayúsculas se normalizan, UTM largas se cortan a 200', () =>
  conEntorno(ENTORNO_PRUEBA, async () => {
    const antes = lineasPrueba().length;
    const r = await llamar(lead, {
      body: leadValido({ h: 'inventada', plan_interes: 'PRO', gclid: 'g'.repeat(250), utm_campaign: 'c'.repeat(300) }),
    });
    assert.equal(r.status, 200);
    const planilla = lineasPrueba().slice(antes).find((l) => l.destino === 'apps_script');
    assert.equal(planilla.datos.h, '');
    assert.equal(planilla.datos.plan_interes, 'pro');
    assert.equal(planilla.datos.gclid.length, 200);
    assert.equal(planilla.datos.utm_campaign.length, 200);
  })
);

prueba('los textos llegan recortados y sin caracteres de control', () =>
  conEntorno(ENTORNO_PRUEBA, async () => {
    const antes = lineasPrueba().length;
    await llamar(lead, {
      body: leadValido({ nombre: `  Ana${NULO}\nMaría${DIRECCION_INVERTIDA} `, que_vende: ' Ropa\r\nde   bebé\t' }),
    });
    const planilla = lineasPrueba().slice(antes).find((l) => l.destino === 'apps_script');
    assert.equal(planilla.datos.nombre, 'Ana María');
    assert.equal(planilla.datos.que_vende, 'Ropa de bebé');
  })
);

prueba('GET y OPTIONS → 405 con Allow: POST y sin encabezados CORS', () =>
  conEntorno(ENTORNO_PRUEBA, async () => {
    for (const method of ['GET', 'OPTIONS', 'PUT']) {
      const r = await llamar(lead, { method, raw: '' });
      assert.equal(r.status, 405, method);
      assert.equal(r.res.getHeader('allow'), 'POST');
      assert.equal(r.res.getHeader('access-control-allow-origin'), undefined);
    }
  })
);

prueba('cuerpo de más de 10 KB → 413 (por Content-Length, por stream sin largo y por cuerpo ya leído)', () =>
  conEntorno(ENTORNO_PRUEBA, async () => {
    const grande = leadValido({ notas: 'x'.repeat(11 * 1024) });
    const r1 = await llamar(lead, { body: grande });
    assert.equal(r1.status, 413);
    const r2 = await llamar(lead, { body: grande, headers: { 'content-length': undefined } });
    assert.equal(r2.status, 413);
    const r3 = await llamar(lead, { raw: '', headers: { 'content-length': undefined }, vercelBody: grande });
    assert.equal(r3.status, 413);
  })
);

prueba('exactamente 10 KB se acepta; un byte más es 413', () =>
  conEntorno(ENTORNO_PRUEBA, async () => {
    const base = JSON.stringify(leadValido({ relleno: '' }));
    const relleno = 'x'.repeat(10 * 1024 - Buffer.byteLength(base));
    const justo = JSON.stringify(leadValido({ relleno }));
    assert.equal(Buffer.byteLength(justo), 10 * 1024);
    assert.equal((await llamar(lead, { raw: justo })).status, 200);
    assert.equal((await llamar(lead, { raw: `${justo} ` })).status, 413);
  })
);

prueba('Content-Type distinto de JSON, JSON malo o arreglo → 400 ["cuerpo"]', () =>
  conEntorno(ENTORNO_PRUEBA, async () => {
    const r1 = await llamar(lead, { body: leadValido(), headers: { 'content-type': 'text/plain;charset=UTF-8' } });
    assert.equal(r1.status, 400);
    assert.deepEqual(r1.json.campos, ['cuerpo']);
    const r2 = await llamar(lead, { raw: '{"nombre": ' });
    assert.equal(r2.status, 400);
    const r3 = await llamar(lead, { raw: '[1,2]' });
    assert.equal(r3.status, 400);
    const r4 = await llamar(lead, { body: leadValido(), headers: { 'content-type': 'application/json; charset=utf-8' } });
    assert.equal(r4.status, 200, 'application/json con charset es válido');
  })
);

prueba('con los ayudantes de Vercel: req.body ya parseado funciona y un JSON malo da 400', () =>
  conEntorno(ENTORNO_PRUEBA, async () => {
    const r1 = await llamar(lead, { raw: '', vercelBody: leadValido() });
    assert.equal(r1.status, 200);
    const r2 = await llamar(lead, {
      raw: '',
      vercelBody: () => {
        throw new Error('Invalid JSON');
      },
    });
    assert.equal(r2.status, 400);
  })
);

prueba('límite por IP: el 6.º lead en 10 minutos → 429; otra IP sigue pasando', () =>
  conEntorno(ENTORNO_PRUEBA, async () => {
    const ip = '198.51.100.77';
    for (let i = 0; i < 5; i++) {
      const r = await llamar(lead, { body: leadValido(), ip });
      assert.equal(r.status, 200, `envío ${i + 1}`);
    }
    const bloqueado = await llamar(lead, { body: leadValido(), ip });
    assert.equal(bloqueado.status, 429);
    assert.deepEqual(bloqueado.json, { ok: false, error: 'limite' });
    assert.equal((await llamar(lead, { body: leadValido(), ip: '198.51.100.78' })).status, 200);
  })
);

prueba('límite por IP: errores de validación y trampas no gastan cupo', () =>
  conEntorno(ENTORNO_PRUEBA, async () => {
    const ip = '198.51.100.90';
    for (let i = 0; i < 8; i++) await llamar(lead, { body: leadValido({ whatsapp: '123' }), ip });
    for (let i = 0; i < 8; i++) await llamar(lead, { body: leadValido({ hp: 'x' }), ip });
    assert.equal((await llamar(lead, { body: leadValido(), ip })).status, 200);
  })
);

prueba('límite por IP: IPv6 del mismo /64 comparte cupo', () =>
  conEntorno(ENTORNO_PRUEBA, async () => {
    for (let i = 1; i <= 5; i++) {
      assert.equal((await llamar(lead, { body: leadValido(), ip: `2800:150:9:9::${i}` })).status, 200);
    }
    assert.equal((await llamar(lead, { body: leadValido(), ip: '2800:150:9:9:ffff::1' })).status, 429);
  })
);

prueba('LEADS_MODO_PRUEBA se ignora en producción de Vercel (no se pierden leads en /tmp)', () =>
  conEntorno({ ...ENTORNO_PRUEBA, VERCEL_ENV: 'production' }, async () => {
    prepararFetch();
    const antes = lineasPrueba().length;
    const r = await llamar(lead, { body: leadValido() });
    // Sin variables reales configuradas, ambos envíos fallan y se avisa con 500.
    assert.equal(r.status, 500);
    assert.deepEqual(r.json, { ok: false, error: 'envio' });
    assert.equal(lineasPrueba().length, antes);
  })
);

// ======================================================================
// /api/lead · camino real con fetch simulado
// ======================================================================

prueba('camino real: ambos responden → 200; la planilla recibe secreto, tipo y gclid/UTM', () =>
  conEntorno(ENTORNO_REAL, async () => {
    prepararFetch();
    const r = await llamar(lead, { body: leadValido({ ref: 'maria-perez' }) });
    assert.equal(r.status, 200);
    const [planilla] = llamadasA('apps_script');
    assert.equal(planilla.url, URL_SCRIPT);
    assert.equal(planilla.opciones.method, 'POST');
    assert.equal(planilla.opciones.headers['Content-Type'], 'application/json');
    assert.equal(planilla.cuerpo.secreto, SECRETO);
    assert.equal(planilla.cuerpo.tipo, 'lead');
    assert.equal(planilla.cuerpo.datos.gclid, 'gclid-de-prueba');
    assert.equal(planilla.cuerpo.datos.utm_source, 'google');
    assert.equal(planilla.cuerpo.datos.ref, 'maria-perez');
    const avisos = llamadasA('telegram');
    assert.equal(avisos.length, 1, 'sin aviso extra cuando la planilla confirma');
    assert.equal(avisos[0].url, `https://api.telegram.org/bot${TOKEN}/sendMessage`);
    assert.equal(avisos[0].cuerpo.parse_mode, 'HTML');
    assert.equal(avisos[0].cuerpo.chat_id, '123456');
    assert.ok(avisos[0].opciones.signal, 'con tiempo límite');
  })
);

prueba('camino real: la planilla falla y Telegram responde → 200 y aviso "la planilla no confirmó"', () =>
  conEntorno(ENTORNO_REAL, async () => {
    prepararFetch({ apps_script: 'http500' });
    const r = await llamar(lead, { body: leadValido() });
    assert.equal(r.status, 200);
    assert.deepEqual(r.json, { ok: true });
    const avisos = llamadasA('telegram');
    assert.equal(avisos.length, 2);
    assert.match(avisos[1].cuerpo.text, /La planilla no confirmó/);
  })
);

prueba('camino real: secreto incorrecto (403 lógico) o respuesta HTML cuentan como falla de la planilla', () =>
  conEntorno(ENTORNO_REAL, async () => {
    for (const modo of ['secreto', 'html']) {
      prepararFetch({ apps_script: modo });
      const r = await llamar(lead, { body: leadValido() });
      assert.equal(r.status, 200, modo);
      assert.equal(llamadasA('telegram').length, 2, `${modo}: debe avisar que la planilla no confirmó`);
    }
  })
);

prueba('camino real: Telegram falla y la planilla responde → 200', () =>
  conEntorno(ENTORNO_REAL, async () => {
    prepararFetch({ telegram: 'telegram400' });
    const r = await llamar(lead, { body: leadValido() });
    assert.equal(r.status, 200);
    assert.equal(llamadasA('apps_script').length, 1);
  })
);

prueba('camino real: ambos fallan → 500 {ok:false,error:"envio"}', () =>
  conEntorno(ENTORNO_REAL, async () => {
    prepararFetch({ apps_script: 'red', telegram: 'http500' });
    const r = await llamar(lead, { body: leadValido() });
    assert.equal(r.status, 500);
    assert.deepEqual(r.json, { ok: false, error: 'envio' });
  })
);

prueba('camino real: ambos se cuelgan → corte a los 4 s en paralelo y 500', () =>
  conEntorno(ENTORNO_REAL, async () => {
    prepararFetch({ apps_script: 'colgado', telegram: 'colgado' });
    const inicio = Date.now();
    const r = await llamar(lead, { body: leadValido() });
    const ms = Date.now() - inicio;
    assert.equal(r.status, 500);
    assert.ok(ms >= 3900 && ms < 6000, `tardó ${ms} ms`);
  })
);

prueba('camino real: sin variables de entorno → 500 (nunca un éxito falso)', () =>
  conEntorno({ ...ENTORNO_REAL, APPS_SCRIPT_URL: undefined, TELEGRAM_BOT_TOKEN: undefined }, async () => {
    prepararFetch();
    const r = await llamar(lead, { body: leadValido() });
    assert.equal(r.status, 500);
    assert.equal(llamadas.length, 0);
  })
);

prueba('camino real: APPS_SCRIPT_URL sin https → no se envía el secreto', () =>
  conEntorno({ ...ENTORNO_REAL, APPS_SCRIPT_URL: 'http://script.google.com/macros/s/X/exec' }, async () => {
    prepararFetch();
    const r = await llamar(lead, { body: leadValido() });
    assert.equal(r.status, 200, 'Telegram sigue funcionando');
    assert.equal(llamadasA('apps_script').length, 0);
  })
);

prueba('camino real: variables con espacios o salto de línea al final se recortan', () =>
  conEntorno({ ...ENTORNO_REAL, TELEGRAM_BOT_TOKEN: `${TOKEN}\n`, APPS_SCRIPT_SECRET: ` ${SECRETO} ` }, async () => {
    prepararFetch();
    await llamar(lead, { body: leadValido() });
    assert.equal(llamadasA('telegram')[0].url, `https://api.telegram.org/bot${TOKEN}/sendMessage`);
    assert.equal(llamadasA('apps_script')[0].cuerpo.secreto, SECRETO);
  })
);

prueba('escape HTML en Telegram: el contenido del formulario nunca llega como etiqueta', () =>
  conEntorno(ENTORNO_REAL, async () => {
    prepararFetch();
    await llamar(lead, {
      body: leadValido({
        nombre: '<b>Ana</b> & "Co"',
        que_vende: '<a href="https://phishing.example">clic</a> <script>alert(1)</script>',
        ref: '</b><i>x',
        utm_term: '<u>tienda</u>',
      }),
    });
    const texto = llamadasA('telegram')[0].cuerpo.text;
    assert.ok(texto.includes('<b>Nombre:</b> &lt;b&gt;Ana&lt;/b&gt; &amp; "Co"'));
    assert.ok(texto.includes('&lt;a href="https://phishing.example"&gt;clic&lt;/a&gt;'));
    assert.ok(texto.includes('&lt;script&gt;'));
    // Las únicas etiquetas reales son las <b> del propio mensaje.
    const etiquetas = texto.match(/<\/?[a-z][^>]*>/gi) || [];
    assert.ok(etiquetas.every((t) => t === '<b>' || t === '</b>'), `etiquetas: ${etiquetas.join(' ')}`);
    assert.equal(etiquetas.filter((t) => t === '<b>').length, etiquetas.filter((t) => t === '</b>').length);
  })
);

prueba('escape HTML también en el aviso de planilla', () =>
  conEntorno(ENTORNO_REAL, async () => {
    prepararFetch({ apps_script: 'http500' });
    await llamar(lead, { body: leadValido({ nombre: '<i>Eva</i>' }) });
    const aviso = llamadasA('telegram')[1].cuerpo.text;
    assert.ok(aviso.includes('&lt;i&gt;Eva&lt;/i&gt;'));
  })
);

// ======================================================================
// /api/wa-click
// ======================================================================

const clicValido = (extra = {}) => ({
  cta_location: 'portada',
  plan: '',
  ref: '',
  gclid: 'gclid-de-prueba',
  utm_source: 'google',
  utm_campaign: 'tiendas-online',
  utm_term: 'precio tienda online',
  h: 'precio',
  landing_path: '/tiendas-online',
  ...extra,
});

prueba('wa-click con text/plain (sendBeacon) → 204 y fila en "Clics WhatsApp"', () =>
  conEntorno(ENTORNO_REAL, async () => {
    prepararFetch();
    const r = await llamar(waClick, {
      body: clicValido({ cta_location: 'plan', plan: 'Esencial' }),
      headers: { 'content-type': 'text/plain;charset=UTF-8', origin: 'https://espiritudigital.cl' },
    });
    assert.equal(r.status, 204);
    assert.equal(r.res.cuerpo, '');
    const [envio] = llamadasA('apps_script');
    assert.equal(envio.cuerpo.tipo, 'wa_click');
    assert.equal(envio.cuerpo.secreto, SECRETO);
    assert.deepEqual(Object.keys(envio.cuerpo.datos), [
      'fecha', 'cta_location', 'plan', 'ref', 'gclid', 'utm_source', 'utm_campaign', 'utm_term', 'h', 'landing_path',
    ]);
    assert.equal(envio.cuerpo.datos.plan, 'esencial');
    assert.equal(envio.cuerpo.datos.cta_location, 'plan');
    assert.equal(llamadasA('telegram').length, 0, 'los clics no avisan por Telegram');
  })
);

prueba('wa-click con application/json → 204', () =>
  conEntorno(ENTORNO_REAL, async () => {
    prepararFetch();
    const r = await llamar(waClick, { body: clicValido() });
    assert.equal(r.status, 204);
    assert.equal(llamadasA('apps_script').length, 1);
  })
);

prueba('wa-click con los ayudantes de Vercel (texto y objeto) → 204', () =>
  conEntorno(ENTORNO_REAL, async () => {
    prepararFetch();
    const texto = await llamar(waClick, {
      raw: '',
      vercelBody: JSON.stringify(clicValido()),
      headers: { 'content-type': 'text/plain' },
    });
    const objeto = await llamar(waClick, { raw: '', vercelBody: clicValido() });
    assert.equal(texto.status, 204);
    assert.equal(objeto.status, 204);
    assert.equal(llamadasA('apps_script').length, 2);
  })
);

prueba('wa-click en modo de prueba → 204 y línea en el archivo', () =>
  conEntorno(ENTORNO_PRUEBA, async () => {
    const antes = lineasPrueba().length;
    const r = await llamar(waClick, { body: clicValido(), headers: { 'content-type': 'text/plain' } });
    assert.equal(r.status, 204);
    const nuevas = lineasPrueba().slice(antes);
    assert.equal(nuevas.length, 1);
    assert.equal(nuevas[0].tipo, 'wa_click');
  })
);

prueba('wa-click: la planilla falla → igual 204 (no bloquea nada)', () =>
  conEntorno(ENTORNO_REAL, async () => {
    prepararFetch({ apps_script: 'red' });
    assert.equal((await llamar(waClick, { body: clicValido() })).status, 204);
  })
);

prueba('wa-click: cuerpo inválido o sin cta_location → 400; GET → 405; más de 10 KB → 413', () =>
  conEntorno(ENTORNO_REAL, async () => {
    prepararFetch();
    assert.equal((await llamar(waClick, { raw: 'no es json', headers: { 'content-type': 'text/plain' } })).status, 400);
    assert.equal((await llamar(waClick, { body: clicValido({ cta_location: '' }) })).status, 400);
    assert.equal((await llamar(waClick, { raw: '"texto"' })).status, 400);
    assert.equal((await llamar(waClick, { method: 'GET', raw: '' })).status, 405);
    assert.equal((await llamar(waClick, { body: clicValido({ ref: 'x'.repeat(11 * 1024) }) })).status, 413);
    assert.equal(llamadas.length, 0);
  })
);

prueba('wa-click desde otro sitio → 204 sin anotar; Origin "null" o con www sí se anota', () =>
  conEntorno(ENTORNO_REAL, async () => {
    prepararFetch();
    const ajeno = await llamar(waClick, { body: clicValido(), headers: { origin: 'https://otro-sitio.example' } });
    assert.equal(ajeno.status, 204);
    assert.equal(llamadas.length, 0);
    await llamar(waClick, { body: clicValido(), headers: { origin: 'null' } });
    await llamar(waClick, { body: clicValido(), headers: { origin: 'https://www.espiritudigital.cl' } });
    assert.equal(llamadasA('apps_script').length, 2);
  })
);

prueba('wa-click: sobre 30 clics por IP en 10 minutos → 204 sin anotar', () =>
  conEntorno(ENTORNO_REAL, async () => {
    prepararFetch();
    const ip = '198.51.100.200';
    for (let i = 0; i < 31; i++) {
      assert.equal((await llamar(waClick, { body: clicValido(), ip })).status, 204);
    }
    assert.equal(llamadasA('apps_script').length, 30);
  })
);

// ======================================================================
// Registros: nunca datos personales completos ni secretos
// ======================================================================

prueba('los registros no contienen secreto, token, nombre ni teléfono', () => {
  const todo = registros.join('\n');
  assert.ok(registros.length > 20, 'debería haber registros capturados');
  for (const prohibido of [SECRETO, TOKEN, NOMBRE, TELEFONO_NORMAL, '912345678', 'Velas y jabones']) {
    assert.ok(!todo.includes(prohibido), `aparece en los registros: ${prohibido}`);
  }
});

// ======================================================================

escribir('Banco de pruebas de /api/lead y /api/wa-click\n');
let fallas = 0;
for (const p of pruebas) {
  capturarConsola();
  try {
    await p.fn();
    restaurarConsola();
    escribir(`  ok     ${p.nombre}`);
  } catch (e) {
    restaurarConsola();
    fallas++;
    escribir(`  FALLA  ${p.nombre}\n         ${String(e && e.message).split('\n').join('\n         ')}`);
  }
}
fs.rmSync(carpetaTmp, { recursive: true, force: true });
escribir(`\n${pruebas.length - fallas} de ${pruebas.length} pruebas pasan`);
process.exit(fallas ? 1 : 0);
