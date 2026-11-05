#!/usr/bin/env node
// Prueba de punta a punta: navegador real → landing → /api/lead real (handlers de api/).
// Caso A: LEADS_MODO_PRUEBA=1 → 200, página de gracias, una línea apps_script 'lead' y una telegram.
// Caso B: sin variables (como Vercel sin configurar) → 500 y la página ofrece WhatsApp.
// Caso C: clic en WhatsApp → beacon a /api/wa-click real → línea apps_script 'wa_click'.
// Uso: node scripts/probar-punta-a-punta.mjs   (sin red; borra os.tmpdir()/leads-prueba.jsonl)
import { createRequire } from 'node:module';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(repo, 'package.json'));
const { chromium } = require('playwright');
const { iniciarServidor } = await import(join(repo, 'scripts/servidor-local.mjs'));

// Sin red de verdad: aunque el shell tenga credenciales reales cargadas, aquí no se usan.
for (const k of ['APPS_SCRIPT_URL', 'APPS_SCRIPT_SECRET', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'VERCEL_ENV']) delete process.env[k];

const registro = join(tmpdir(), 'leads-prueba.jsonl');
const lineas = () => (existsSync(registro) ? readFileSync(registro, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
rmSync(registro, { force: true });

const { servidor, url } = await iniciarServidor({ puerto: 0, api: 'real', silencioso: true });
const navegador = await chromium.launch();
let fallas = 0;
const paso = async (nombre, fn) => {
  try { await fn(); console.log(`  ok     ${nombre}`); } catch (e) { fallas++; console.log(`  FALLA  ${nombre}\n         ${e.message.split('\n')[0]}`); }
};

async function llenar(pagina) {
  await pagina.fill('#f-nombre', 'Persona Prueba');
  await pagina.fill('#f-whatsapp', '9 1234 5678');
  await pagina.fill('#f-que_vende', 'Velas artesanales');
  await pagina.check('#f-vende_online-1');
  await pagina.check('#f-plazo-0');
  await pagina.check('#f-presupuesto-1');
  await pagina.check('#f-consentimiento');
  await pagina.waitForTimeout(3200); // más que el tiempo mínimo de llenado (3 s)
}

await paso('A · con LEADS_MODO_PRUEBA=1: 200, gracias, planilla y Telegram reciben el lead', async () => {
  process.env.LEADS_MODO_PRUEBA = '1';
  const ctx = await navegador.newContext({ viewport: { width: 360, height: 740 } });
  const pagina = await ctx.newPage();
  await pagina.goto(`${url}/tiendas-online?h=precio&gclid=gclid-e2e&utm_source=google&utm_medium=cpc&utm_campaign=tiendas-online&utm_term=tienda%20online`);
  await llenar(pagina);
  const [respuesta] = await Promise.all([
    pagina.waitForResponse((r) => r.url().endsWith('/api/lead')),
    pagina.click('#form-cotizar button[type="submit"]'),
  ]);
  assert.equal(respuesta.status(), 200);
  await pagina.waitForURL(/\/tiendas-online\/gracias$/, { timeout: 5000 });
  const nuevas = lineas();
  const lead = nuevas.find((l) => l.destino === 'apps_script' && l.tipo === 'lead');
  const aviso = nuevas.find((l) => l.destino === 'telegram');
  assert.ok(lead, 'falta la línea de la planilla');
  assert.equal(lead.datos.whatsapp, '+56912345678');
  assert.equal(lead.datos.gclid, 'gclid-e2e');
  assert.equal(lead.datos.utm_term, 'tienda online');
  assert.equal(lead.datos.h, 'precio');
  assert.equal(lead.datos.landing_path, '/tiendas-online');
  assert.equal(lead.datos.consentimiento, true);
  assert.ok(aviso, 'falta el aviso de Telegram');
  assert.ok(!aviso.texto.includes('56912345678') && !aviso.texto.includes('Persona Prueba'), 'Telegram con datos personales');
  const dl = await pagina.evaluate(() => (window.dataLayer || []).filter((e) => e.event === 'generate_lead').length);
  assert.equal(dl, 0, 'gracias no repite generate_lead');
  await ctx.close();
});

await paso('B · sin variables (Vercel sin configurar): 500 y la página ofrece WhatsApp', async () => {
  delete process.env.LEADS_MODO_PRUEBA;
  const ctx = await navegador.newContext({ viewport: { width: 360, height: 740 } });
  const pagina = await ctx.newPage();
  await pagina.goto(`${url}/tiendas-online?h=tienda`);
  await llenar(pagina);
  const [respuesta] = await Promise.all([
    pagina.waitForResponse((r) => r.url().endsWith('/api/lead')),
    pagina.click('#form-cotizar button[type="submit"]'),
  ]);
  assert.equal(respuesta.status(), 500);
  await pagina.waitForTimeout(400);
  assert.ok(!/gracias/.test(pagina.url()), 'no debe ir a gracias');
  const enlace = await pagina.locator('#form-cotizar a[href^="https://wa.me/"]:visible').count();
  assert.ok(enlace >= 1, 'no aparece el botón de WhatsApp tras el error');
  const texto = await pagina.locator('#form-cotizar').innerText();
  assert.match(texto, /No se pudo enviar el formulario/);
  await ctx.close();
});

await paso('C · clic en WhatsApp: beacon a /api/wa-click real y línea wa_click en la planilla', async () => {
  process.env.LEADS_MODO_PRUEBA = '1';
  const antes = lineas().length;
  const ctx = await navegador.newContext({ viewport: { width: 360, height: 740 } });
  const pagina = await ctx.newPage();
  await pagina.route('https://wa.me/**', (r) => r.fulfill({ status: 200, body: 'wa' }));
  await pagina.route('https://api.whatsapp.com/**', (r) => r.fulfill({ status: 200, body: 'wa' }));
  await pagina.goto(`${url}/tiendas-online?h=carrito&gclid=g2`);
  const espera = pagina.waitForRequest((r) => r.url().endsWith('/api/wa-click'));
  await pagina.locator('a[href^="https://wa.me/"]:visible').first().click({ modifiers: [] });
  await espera;
  await pagina.waitForTimeout(800);
  const clic = lineas().slice(antes).find((l) => l.destino === 'apps_script' && l.tipo === 'wa_click');
  assert.ok(clic, 'falta la línea wa_click');
  assert.equal(clic.datos.h, 'carrito');
  assert.equal(clic.datos.gclid, 'g2');
  assert.ok(clic.datos.cta_location, 'sin cta_location');
  await ctx.close();
});

await paso('D · lead de página web (h=web): en gracias, WhatsApp pide cotizar una página web', async () => {
  process.env.LEADS_MODO_PRUEBA = '1';
  const ctx = await navegador.newContext({ viewport: { width: 360, height: 740 } });
  const pagina = await ctx.newPage();
  await pagina.goto(`${url}/tiendas-online?h=web`);
  await llenar(pagina);
  await Promise.all([
    pagina.waitForURL(/\/tiendas-online\/gracias$/, { timeout: 8000 }),
    pagina.click('#form-cotizar button[type="submit"]'),
  ]);
  const href = await pagina.locator('a[data-wa="gracias"]').getAttribute('href');
  assert.match(decodeURIComponent(href), /quiero cotizar una página web/);
  await ctx.close();
});

await navegador.close();
servidor.close();
console.log(fallas ? `\n${fallas} pasos fallan` : '\nPunta a punta: todo pasa');
process.exit(fallas ? 1 : 0);
