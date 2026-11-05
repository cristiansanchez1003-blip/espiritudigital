#!/usr/bin/env node
// Simulación mínima de Apps Script para probar docs/apps-script.gs en Node, sin red.
// Imita lo que importa de Sheets: 26 columnas y 1000 filas por pestaña nueva (fuera de
// rango falla igual que en Google), texto que empieza con "=" se vuelve fórmula y el
// apóstrofo inicial lo deja como texto. No reemplaza probarAnotacion() en el editor real.
// Uso: node scripts/probar-apps-script.mjs [ruta/al/apps-script.gs]
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const codigo = fs.readFileSync(process.argv[2] || path.join(raiz, 'docs/apps-script.gs'), 'utf8');

function crearHoja(nombre) {
  const h = {
    nombre, filas: 1000, cols: 26, celdas: new Map(), formatos: new Map(), validaciones: new Map(), congeladas: 0,
    clave: (r, c) => `${r},${c}`,
    getName() { return this.nombre; },
    getMaxRows() { return this.filas; },
    getMaxColumns() { return this.cols; },
    insertColumnsAfter(despues, n) { this.cols += n; },
    insertRowsAfter(despues, n) { this.filas += n; },
    getLastRow() { let m = 0; for (const [k, v] of this.celdas) if (v !== '' && v !== null && v !== undefined) m = Math.max(m, +k.split(',')[0]); return m; },
    getLastColumn() { let m = 0; for (const [k, v] of this.celdas) if (v !== '' && v !== null && v !== undefined) m = Math.max(m, +k.split(',')[1]); return m; },
    setFrozenRows(n) { this.congeladas = n; }, setFrozenColumns() {}, setColumnWidth() {}, setColumnWidths() {}, setRowHeight() {},
    getRange(a, b, c, d) {
      let r, col, nr = 1, nc = 1;
      if (typeof a === 'string') {
        const m = a.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/);
        const n = (s) => s.split('').reduce((t, ch) => t * 26 + ch.charCodeAt(0) - 64, 0);
        r = +m[2]; col = n(m[1]);
        if (m[3]) { nr = +m[4] - r + 1; nc = n(m[3]) - col + 1; }
      } else { r = a; col = b; nr = c ?? 1; nc = d ?? 1; }
      if (r < 1 || col < 1 || r + nr - 1 > this.filas || col + nc - 1 > this.cols) {
        throw new Error(`Rango fuera de límites en ${this.nombre}: fila ${r}+${nr}, col ${col}+${nc} (máx ${this.filas}x${this.cols})`);
      }
      return crearRango(this, r, col, nr, nc);
    },
  };
  return h;
}

// Imita el análisis de Sheets: "=..." es fórmula, "'" es texto, números y "+56..." se convierten.
function analizar(v) {
  if (typeof v !== 'string') return { valor: v };
  if (v.startsWith("'")) return { valor: v.slice(1), texto: true };
  if (v.startsWith('=')) return { formula: v };
  if (/^[+-]?\d+(\.\d+)?$/.test(v)) return { valor: Number(v), convertido: true };
  return { valor: v };
}

function crearRango(h, r, c, nr, nc) {
  const celdas = [];
  for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) celdas.push([r + i, c + j, i, j]);
  const rango = {
    getValues() { const out = Array.from({ length: nr }, () => Array(nc).fill('')); for (const [fr, fc, i, j] of celdas) { const v = h.celdas.get(h.clave(fr, fc)); out[i][j] = v === undefined ? '' : (v && v.formula ? '' : v); } return out; },
    setValues(m) { assert.equal(m.length, nr); for (const [fr, fc, i, j] of celdas) { assert.equal(m[i].length, nc, 'ancho de setValues'); const a = analizar(m[i][j]); h.celdas.set(h.clave(fr, fc), a.formula ? { formula: a.formula } : a.valor); if (a.formula) h.formulas = (h.formulas || 0) + 1; if (a.convertido) h.convertidos = (h.convertidos || []).concat(m[i][j]); } return rango; },
    setFormulas(m) { for (const [fr, fc, i, j] of celdas) { assert.ok(String(m[i][j]).startsWith('='), 'fórmula sin ='); h.celdas.set(h.clave(fr, fc), { formula: m[i][j] }); } return rango; },
    setValue(v) { for (const [fr, fc] of celdas.slice(0, 1)) h.celdas.set(h.clave(fr, fc), analizar(v).valor); return rango; },
    setNumberFormat(f) { for (const [fr, fc] of celdas) h.formatos.set(h.clave(fr, fc), f); return rango; },
    setDataValidation(v) { for (const [fr, fc] of celdas) h.validaciones.set(h.clave(fr, fc), v); return rango; },
    setFontWeight() { return rango; }, setFontSize() { return rango; }, merge() { return rango; }, setWrap() { return rango; }, setBackground() { return rango; },
    getFormula() { const v = h.celdas.get(h.clave(r, c)); return v && v.formula ? v.formula : ''; },
  };
  return rango;
}

function crearPlanilla() {
  const hojas = [crearHoja('Hoja 1')];
  return {
    hojas, zona: null, locale: null,
    getId: () => 'ID-PLANILLA',
    getSheetByName(n) { return hojas.find((x) => x.nombre === n) || null; },
    insertSheet(n, pos) { const x = crearHoja(n); if (pos === 0) hojas.unshift(x); else hojas.push(x); return x; },
    deleteSheet(x) { hojas.splice(hojas.indexOf(x), 1); },
    getSheets() { return hojas.slice(); },
    setSpreadsheetTimeZone(z) { this.zona = z; }, setSpreadsheetLocale(l) { this.locale = l; },
  };
}

const ss = crearPlanilla();
const props = new Map();
let candadoTomado = false;
const contexto = {
  console: { log: () => {}, warn: () => {}, error: (m) => { contexto.errores.push(m); } },
  errores: [],
  SpreadsheetApp: {
    getActiveSpreadsheet: () => ss,
    openById: () => ss,
    flush: () => {},
    newDataValidation: () => {
      const regla = { tipo: null };
      const b = { requireValueInList(l) { regla.tipo = 'lista'; regla.lista = l; return b; }, requireCheckbox() { regla.tipo = 'casilla'; return b; }, requireDate() { regla.tipo = 'fecha'; return b; }, setAllowInvalid() { return b; }, build() { return regla; } };
      return b;
    },
  },
  PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props.get(k) ?? null, setProperty: (k, v) => props.set(k, v) }) },
  LockService: { getScriptLock: () => ({ tryLock: () => { assert.ok(!candadoTomado); candadoTomado = true; return true; }, releaseLock: () => { candadoTomado = false; } }) },
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ setMimeType() { return this; }, getContent: () => t }) },
  Utilities: {
    getUuid: () => crypto.randomUUID(),
    DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
    computeDigest: (alg, s) => Array.from(crypto.createHash('sha256').update(s, 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b)),
    formatDate: (d, zona, f) => new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d),
  },
};
vm.createContext(contexto);
vm.runInContext(codigo, contexto);
const G = (n) => vm.runInContext(n, contexto);
const post = (obj) => JSON.parse(G('doPost')({ postData: { contents: JSON.stringify(obj) } }).getContent());

let pruebas = 0;
const ok = (nombre, fn) => { fn(); pruebas++; console.log(`  ok     ${nombre}`); };

ok('doPost sin secreto configurado → 403 lógico', () => {
  assert.deepEqual(post({ secreto: 'x', tipo: 'lead', datos: {} }), { ok: false, error: 'secreto', codigo: 403 });
});

ok('lead antes de configurar: crea Leads con 27 columnas (amplía de 26) y escribe la fila', () => {
  props.set('APPS_SCRIPT_SECRET', 'a'.repeat(40));
  const r = post({ secreto: 'a'.repeat(40), tipo: 'lead', datos: { fecha: '2026-11-17T12:00:00.000Z', nombre: 'Ana', whatsapp: '+56912345678', que_vende: '=HYPERLINK("x")', consentimiento: true, ref: '' } });
  assert.deepEqual(r, { ok: true });
  const h = ss.getSheetByName('Leads');
  assert.equal(h.getMaxColumns(), 27);
  assert.equal(h.getRange(1, 27).getValues()[0][0], 'notas');
  const fila = h.getRange(2, 1, 1, 27).getValues()[0];
  assert.equal(Object.prototype.toString.call(fila[0]), '[object Date]');
  assert.equal(fila[2], '+56912345678', 'el teléfono conserva el +');
  assert.equal(fila[3], '=HYPERLINK("x")', 'la fórmula queda como texto');
  assert.equal(h.formulas || 0, 0, 'ninguna fórmula en Leads');
  assert.equal(fila[8], true);
  assert.equal(fila[20], 'nuevo');
  assert.equal(fila[21], false);
  assert.equal(h.validaciones.get('2,21').tipo, 'lista');
  assert.equal(h.validaciones.get('2,22').tipo, 'casilla');
  assert.equal(h.formatos.get('2,1'), 'dd/mm/yyyy hh:mm');
});

ok('secreto incorrecto → 403 lógico y no escribe', () => {
  const antes = ss.getSheetByName('Leads').getLastRow();
  assert.equal(post({ secreto: 'b'.repeat(40), tipo: 'lead', datos: { nombre: 'X' } }).codigo, 403);
  assert.equal(ss.getSheetByName('Leads').getLastRow(), antes);
});

ok('tipo desconocido, JSON malo y cuerpo enorme → errores lógicos', () => {
  assert.equal(post({ secreto: 'a'.repeat(40), tipo: 'otro', datos: {} }).codigo, 400);
  assert.equal(JSON.parse(G('doPost')({ postData: { contents: '{mal' } }).getContent()).codigo, 400);
  assert.equal(JSON.parse(G('doPost')({ postData: { contents: 'x'.repeat(20001) } }).getContent()).codigo, 413);
});

ok('configurar: pestañas, Resumen primero, secreto existente intacto, Hoja 1 vacía borrada', () => {
  G('configurar')();
  assert.equal(ss.zona, 'America/Santiago');
  assert.deepEqual(ss.hojas.map((x) => x.nombre), ['Resumen', 'Leads', 'Clics WhatsApp', 'Referidos']);
  assert.equal(props.get('APPS_SCRIPT_SECRET'), 'a'.repeat(40));
  assert.equal(props.get('PLANILLA_ID'), 'ID-PLANILLA');
  const leads = ss.getSheetByName('Leads');
  assert.equal(leads.validaciones.get('500,21').tipo, 'lista');
  assert.equal(JSON.stringify(leads.validaciones.get('500,21').lista), JSON.stringify(['nuevo', 'contactado', 'llamada', 'vista_previa', 'propuesta', 'ganado', 'perdido', 'mas_adelante']));
  G('configurar')(); // segunda vez: no duplica ni falla
  assert.equal(ss.hojas.length, 4);
});

ok('Resumen: fórmulas con las columnas correctas y semanas desde un lunes', () => {
  const r = ss.getSheetByName('Resumen');
  assert.match(r.getRange(5, 1).getFormula(), /^=DATE\(\d{4},\d{1,2},\d{1,2}\)$/);
  const [, a, m, d] = r.getRange(5, 1).getFormula().match(/DATE\((\d+),(\d+),(\d+)\)/);
  assert.equal(new Date(Date.UTC(+a, +m - 1, +d)).getUTCDay(), 1, 'debe ser lunes');
  assert.equal(r.getRange(6, 1).getFormula(), '=A5+7');
  assert.equal(r.getRange(5, 2).getFormula(), `=COUNTIFS('Leads'!$A$2:$A,">="&$A5,'Leads'!$A$2:$A,"<"&($A5+7))`);
  assert.equal(r.getRange(5, 3).getFormula(), `=COUNTIFS('Clics WhatsApp'!$A$2:$A,">="&$A5,'Clics WhatsApp'!$A$2:$A,"<"&($A5+7))`);
  assert.ok(r.getRange(5, 4).getFormula().endsWith(`'Leads'!$V$2:$V,TRUE)`), 'calificado = V');
  assert.ok(r.getRange(5, 6).getFormula().includes(`'Leads'!$U$2:$U,"ganado"`), 'etapa = U');
  assert.ok(r.getRange(5, 7).getFormula().startsWith(`=SUMIFS('Leads'!$X$2:$X`), 'monto = X');
  assert.ok(r.getRange(5, 8).getFormula().includes(`AVERAGEIFS('Leads'!$W$2:$W`), 'minutos = W');
  assert.equal(r.getRange(34, 10).getFormula(), '=IF(AND(ISNUMBER($I34),$B34>0),$I34/$B34,"")');
  assert.equal(r.getRange(3, 11).getFormula(), '=IF(AND(I3>0,D3>0),I3/D3,"")');
});

ok('wa_click escribe en Clics WhatsApp por nombre de columna', () => {
  assert.deepEqual(post({ secreto: 'a'.repeat(40), tipo: 'wa_click', datos: { fecha: new Date().toISOString(), cta_location: 'portada', plan: 'pro', gclid: '-1+1', utm_term: '@x' } }), { ok: true });
  const h = ss.getSheetByName('Clics WhatsApp');
  const fila = h.getRange(2, 1, 1, 10).getValues()[0];
  assert.equal(fila[1], 'portada');
  assert.equal(fila[4], '-1+1', 'no se convierte en número ni fórmula');
  assert.equal(fila[7], '@x');
  assert.ok(!(h.convertidos || []).length, 'ningún texto convertido a número');
});

ok('lead con ref: fila en Leads y en Referidos con el referidor buscado por slug', () => {
  const ref = ss.getSheetByName('Referidos');
  ref.getRange(2, 1, 1, 8).setValues([[new Date(), "'María Pérez", "'maria-perez", "'https://espiritudigital.cl/tiendas-online?ref=maria-perez", '', 'enlace', false, '']]);
  assert.deepEqual(post({ secreto: 'a'.repeat(40), tipo: 'lead', datos: { fecha: new Date().toISOString(), nombre: 'Luis', whatsapp: '+56987654321', consentimiento: true, ref: 'Maria-Perez' } }), { ok: true });
  const fila = ref.getRange(3, 1, 1, 8).getValues()[0];
  assert.equal(fila[1], 'María Pérez');
  assert.equal(fila[2], 'Maria-Perez');
  assert.equal(fila[4], 'Luis');
  assert.equal(fila[5], 'lead');
  assert.equal(ref.validaciones.get('3,7').tipo, 'casilla');
});

ok('si Cristian agrega o mueve columnas, la fila nueva sigue cuadrando por encabezado', () => {
  const h = ss.getSheetByName('Leads');
  // Cristian agrega una columna propia al final
  h.insertColumnsAfter(27, 1);
  h.getRange(1, 28).setValues([['mi_columna']]);
  assert.deepEqual(post({ secreto: 'a'.repeat(40), tipo: 'lead', datos: { fecha: new Date().toISOString(), nombre: 'Eva', whatsapp: '+56911111111', consentimiento: true } }), { ok: true });
  const ultima = h.getLastRow();
  const fila = h.getRange(ultima, 1, 1, 28).getValues()[0];
  assert.equal(fila[1], 'Eva');
  assert.equal(fila[27], '');
});

ok('cuando se acaban las filas, agrega más en vez de fallar', () => {
  const h = ss.getSheetByName('Clics WhatsApp');
  h.celdas.set('1000,1', new Date());
  assert.deepEqual(post({ secreto: 'a'.repeat(40), tipo: 'wa_click', datos: { cta_location: 'flotante' } }), { ok: true });
  assert.ok(h.getMaxRows() > 1000);
  assert.equal(h.getRange(1001, 2).getValues()[0][0], 'flotante');
});

ok('tipo referido directo exige slug', () => {
  assert.equal(post({ secreto: 'a'.repeat(40), tipo: 'referido', datos: {} }).codigo, 400);
  assert.deepEqual(post({ secreto: 'a'.repeat(40), tipo: 'referido', datos: { slug: 'juan', referidor: 'Juan' } }), { ok: true });
});

ok('probarAnotacion funciona tras configurar y doGet responde ok', () => {
  G('probarAnotacion')();
  assert.equal(JSON.parse(G('doGet')().getContent()).ok, true);
  assert.equal(contexto.errores.length, 0, contexto.errores.join('\n'));
});

console.log(`\n${pruebas} pruebas del Apps Script pasan`);
