// Pruebas del sitio principal con Playwright, sobre el servidor local que emula vercel.json.
//
// Uso:  node scripts/probar-sitio.mjs
// Sale con código 1 si alguna prueba falla.

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearServidor } from './servidor-local.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOMINIO = 'https://espiritudigital.cl';
const WHATSAPP_ARTICULO = 'Hola Cristian, leí su artículo de precios y quiero cotizar.';

const resultados = [];
function revisar(nombre, ok, detalle = '') {
  resultados.push({ nombre, ok: Boolean(ok), detalle });
}

// Abre una página y junta errores de consola, errores de JavaScript y recursos propios que fallan.
async function abrir(browser, base, ruta, opciones = {}) {
  const page = await browser.newPage(opciones);
  const errores = [];
  const fallidos = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text());
  });
  page.on('pageerror', (e) => errores.push('Error de JavaScript: ' + e.message));
  page.on('response', (r) => {
    if (r.url().startsWith(base) && r.status() >= 400) fallidos.push(`${r.status()} ${r.url()}`);
  });
  const respuesta = await page.goto(base + ruta, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1500);
  return { page, respuesta, errores, fallidos };
}

async function redireccion(base, ruta) {
  const r = await fetch(base + ruta, { redirect: 'manual' });
  return { status: r.status, location: r.headers.get('location') };
}

const servidor = crearServidor({ raiz: RAIZ });
await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
const BASE = `http://127.0.0.1:${servidor.address().port}`;
const browser = await chromium.launch();

try {
  // 1. Portada sin errores de consola
  {
    const { page, respuesta, errores, fallidos } = await abrir(browser, BASE, '/');
    revisar('Portada responde 200', respuesta && respuesta.status() === 200, respuesta && String(respuesta.status()));
    revisar('Portada sin errores de consola', errores.length === 0, errores.join(' | '));
    revisar('Portada sin recursos propios rotos', fallidos.length === 0, fallidos.join(' | '));

    // 2. Carrusel de casos
    const casos = await page.$$eval('.case-carousel .case-card', (tarjetas) =>
      tarjetas.map((t) => ({
        clase: t.className,
        texto: t.innerText,
        href: t.getAttribute('href') || '',
        target: t.getAttribute('target') || '',
        rel: t.getAttribute('rel') || '',
      })),
    );
    const textoCarrusel = casos.map((c) => c.texto + ' ' + c.clase + ' ' + c.href).join(' ');
    revisar('Carrusel sin Vigila', !/vigila/i.test(textoCarrusel));
    revisar('Carrusel sin Sabores del Sur', !/sabores/i.test(textoCarrusel) && !/onrender\.com/.test(textoCarrusel));
    const imprenta = casos.find((c) => /Imprenta Express/.test(c.texto));
    revisar('Carrusel con Imprenta Express', Boolean(imprenta));
    revisar(
      'Imprenta Express enlaza a su tienda en pestaña nueva con rel="noopener"',
      imprenta &&
        imprenta.href.replace(/\/$/, '') === 'https://imprentaexpresslaflorida.cl' &&
        imprenta.target === '_blank' &&
        imprenta.rel.split(/\s+/).includes('noopener'),
      imprenta ? `${imprenta.href} ${imprenta.target} ${imprenta.rel}` : 'sin tarjeta',
    );
    revisar('Carrusel con 4 tarjetas', casos.length === 4, String(casos.length));
    const imagenImprenta = await page.$eval('.case-imprenta img', async (img) => {
      img.scrollIntoView();
      img.loading = 'eager';
      if (!img.complete) await new Promise((ok) => img.addEventListener('load', ok, { once: true }));
      return { ancho: img.naturalWidth, src: img.getAttribute('src') };
    });
    revisar('La imagen de Imprenta Express carga', imagenImprenta.ancho > 0, imagenImprenta.src);
    revisar('La imagen de Imprenta Express existe en el repo', fs.existsSync(path.join(RAIZ, imagenImprenta.src)));

    // 3. Enlace a /tiendas-online
    const enlacesTiendas = await page.$$eval('a[href="/tiendas-online"]', (as) => as.map((a) => a.innerText.trim()));
    revisar('Portada enlaza a /tiendas-online', enlacesTiendas.length > 0, enlacesTiendas.join(' | '));
    await page.close();
  }

  // 4. Redirecciones
  {
    const r = await redireccion(BASE, '/privacidad');
    revisar('/privacidad redirige (308) a /politica-privacidad', r.status === 308 && r.location === '/politica-privacidad', `${r.status} ${r.location}`);
    const { page, respuesta } = await abrir(browser, BASE, '/privacidad');
    revisar(
      'En el navegador, /privacidad termina en /politica-privacidad con 200',
      new URL(page.url()).pathname === '/politica-privacidad' && respuesta.status() === 200,
      page.url(),
    );
    await page.close();

    const antiguas = [
      ['/politica-privacidad.html', '/politica-privacidad'],
      ['/terminos.html', '/terminos'],
      ['/index.html', '/'],
      ['/demo.html', '/demo'],
      ['/alma/', '/alma'],
      ['/alma/index.html', '/alma'],
    ];
    for (const [desde, hacia] of antiguas) {
      const rr = await redireccion(BASE, desde);
      revisar(`${desde} redirige (308) a ${hacia}`, rr.status === 308 && rr.location === hacia, `${rr.status} ${rr.location}`);
    }
    const conConsulta = await redireccion(BASE, '/terminos.html?utm_source=prueba&gclid=prueba');
    revisar('La redirección conserva los parámetros', conConsulta.location === '/terminos?utm_source=prueba&gclid=prueba', conConsulta.location);

    for (const ruta of ['/politica-privacidad', '/terminos', '/alma', '/cuanto-cuesta-una-tienda-online']) {
      const rr = await fetch(BASE + ruta, { redirect: 'manual' });
      revisar(`${ruta} responde 200 sin redirección`, rr.status === 200, String(rr.status));
    }
  }

  // Las demás páginas existentes siguen funcionando
  {
    const terminos = await abrir(browser, BASE, '/terminos.html');
    revisar('/terminos.html termina en /terminos con 200 y sin errores de consola',
      new URL(terminos.page.url()).pathname === '/terminos' && terminos.respuesta.status() === 200 && terminos.errores.length === 0,
      terminos.page.url() + ' ' + terminos.errores.join(' | '));
    await terminos.page.close();
    const demo = await abrir(browser, BASE, '/demo.html');
    revisar('/demo.html sigue llevando a Alma', new URL(demo.page.url()).pathname === '/alma', demo.page.url());
    await demo.page.close();
    const code = await fetch(BASE + '/code', { redirect: 'manual' });
    revisar('/code sigue respondiendo 200', code.status === 200, String(code.status));
  }

  // 5. Alma sigue funcionando sin barra final (rutas absolutas)
  {
    const { page, fallidos } = await abrir(browser, BASE, '/alma');
    revisar('Alma en /alma carga todos sus archivos propios', fallidos.length === 0, fallidos.join(' | '));
    const montado = await page.$eval('#dc-root', (el) => el.innerText.length).catch(() => 0);
    revisar('Alma monta su aplicación', montado > 200, String(montado));
    await page.close();
  }

  // 6. Política de privacidad
  {
    const { page, errores } = await abrir(browser, BASE, '/politica-privacidad', { viewport: { width: 360, height: 800 } });
    const texto = await page.evaluate(() => document.body.innerText);
    const obligatorios = [
      'ESPIRITU DIGITAL SPA', '78.484.436-6', 'El Algarrobo 10932', 'espiritudigital.chile@gmail.com', '+56 9 2811 7627',
      'consentimiento', 'Google Analytics', 'Tag Manager', 'Google Sheets', 'Google Ads', 'Vercel', 'Telegram',
      'Microsoft Clarity', 'enmascarad', 'Transferencias internacionales', '24 meses', 'Acceso', 'Rectificación',
      'Supresión', 'Oposición', 'Portabilidad', 'Agencia de Protección de Datos Personales', 'Actualizada el',
    ];
    const faltan = obligatorios.filter((t) => !texto.includes(t));
    revisar('La política cubre los puntos obligatorios', faltan.length === 0, faltan.join(', '));
    revisar('La política no tiene marcadores TODO', !/TODO/.test(texto));
    revisar('La política sin errores de consola', errores.length === 0, errores.join(' | '));
    const ancho = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    revisar('La política no se desborda a 360 px', ancho[0] <= ancho[1], ancho.join(' > '));
    await page.close();
  }

  // 7. Artículo a 360 px
  {
    const { page, respuesta, errores, fallidos } = await abrir(browser, BASE, '/cuanto-cuesta-una-tienda-online', {
      viewport: { width: 360, height: 800 },
    });
    revisar('Artículo responde 200', respuesta && respuesta.status() === 200);
    revisar('Artículo sin errores de consola', errores.length === 0, errores.join(' | '));
    revisar('Artículo sin recursos propios rotos', fallidos.length === 0, fallidos.join(' | '));
    const datos = await page.evaluate(() => {
      const desbordados = [...document.querySelectorAll('body *')]
        .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 0.5)
        .map((el) => el.tagName.toLowerCase() + (el.className ? '.' + el.className : ''));
      const art = document.querySelector('article');
      const palabras = art.innerText.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
      return {
        scroll: document.documentElement.scrollWidth,
        ancho: window.innerWidth,
        desbordados: desbordados.slice(0, 5),
        palabras,
        h1: document.querySelector('h1').innerText.trim(),
        texto: document.body.innerText,
        jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent),
        canonical: document.querySelector('link[rel="canonical"]')?.href,
        whatsapp: [...document.querySelectorAll('a[href^="https://wa.me/"]')].map((a) => a.href),
        tiendas: document.querySelectorAll('a[href="/tiendas-online"]').length,
        externosSinNoopener: [...document.querySelectorAll('a[target="_blank"]')]
          .filter((a) => !(a.rel || '').split(/\s+/).includes('noopener'))
          .map((a) => a.href),
      };
    });
    revisar('Artículo sin desborde horizontal a 360 px', datos.scroll <= datos.ancho && datos.desbordados.length === 0, `${datos.scroll}px ${datos.desbordados.join(', ')}`);
    revisar('Artículo entre 1.000 y 1.400 palabras', datos.palabras >= 1000 && datos.palabras <= 1400, String(datos.palabras));

    let articulo = null;
    try {
      articulo = JSON.parse(datos.jsonld[0]);
    } catch (e) {
      revisar('JSON-LD del artículo es JSON válido', false, e.message);
    }
    if (articulo) {
      revisar('JSON-LD del artículo es JSON válido', true);
      const requeridos = ['headline', 'datePublished', 'dateModified', 'image', 'author', 'publisher', 'mainEntityOfPage'];
      const faltan = requeridos.filter((k) => !articulo[k]);
      revisar('JSON-LD de tipo Article con sus campos', articulo['@context'] === 'https://schema.org' && articulo['@type'] === 'Article' && faltan.length === 0, faltan.join(', '));
      revisar('JSON-LD: el titular coincide con el H1', articulo.headline === datos.h1, articulo.headline);
      revisar('JSON-LD: fechas ISO', /^\d{4}-\d{2}-\d{2}$/.test(articulo.datePublished) && /^\d{4}-\d{2}-\d{2}$/.test(articulo.dateModified));
      revisar('JSON-LD: autor y editor con nombre', Boolean(articulo.author?.name && articulo.publisher?.name && articulo.publisher?.logo?.url));
      revisar('JSON-LD: la página principal es la canónica', articulo.mainEntityOfPage?.['@id'] === datos.canonical, datos.canonical);
    }

    const precios = ['$350.000 + IVA', '$416.500 con IVA', '$480.000 + IVA', '$571.200 con IVA', '$150.000 + IVA', '$178.500 con IVA', '$19.990 + IVA', '$14.990 + IVA'];
    const faltanPrecios = precios.filter((p) => !datos.texto.includes(p));
    revisar('Artículo con los precios propios, + IVA y con IVA', faltanPrecios.length === 0, faltanPrecios.join(', '));
    const mensajes = datos.whatsapp.map((h) => new URL(h).searchParams.get('text'));
    revisar('Botón de WhatsApp con el mensaje del artículo', datos.whatsapp.some((h) => h.startsWith('https://wa.me/56928117627?')) && mensajes.includes(WHATSAPP_ARTICULO), mensajes.join(' | '));
    revisar('Artículo enlaza a /tiendas-online', datos.tiendas > 0);
    revisar('Enlaces externos con rel="noopener"', datos.externosSinNoopener.length === 0, datos.externosSinNoopener.join(', '));
    revisar('Artículo sin marcadores TODO', !/TODO/.test(datos.texto));

    const imagen = await page.$eval('figure img', async (img) => {
      img.scrollIntoView();
      if (!img.complete || !img.naturalWidth) await new Promise((ok) => { img.addEventListener('load', ok, { once: true }); setTimeout(ok, 8000); });
      return img.naturalWidth;
    });
    revisar('La imagen del artículo carga', imagen > 0, String(imagen));
    await page.close();
  }

  // 8. Sitemap
  {
    const r = await fetch(BASE + '/sitemap.xml');
    const xml = await r.text();
    const page = await browser.newPage();
    const analisis = await page.evaluate((texto) => {
      const doc = new DOMParser().parseFromString(texto, 'application/xml');
      const error = doc.getElementsByTagName('parsererror')[0];
      const raiz = doc.documentElement;
      const urls = [...doc.getElementsByTagNameNS('http://www.sitemaps.org/schemas/sitemap/0.9', 'url')].map((u) => ({
        loc: u.getElementsByTagNameNS('http://www.sitemaps.org/schemas/sitemap/0.9', 'loc')[0]?.textContent.trim(),
        lastmod: u.getElementsByTagNameNS('http://www.sitemaps.org/schemas/sitemap/0.9', 'lastmod')[0]?.textContent.trim(),
      }));
      return { error: error ? error.textContent : null, raiz: raiz.localName, ns: raiz.namespaceURI, urls };
    }, xml);
    await page.close();
    revisar('Sitemap es XML válido', r.status === 200 && !analisis.error && analisis.raiz === 'urlset' && analisis.ns === 'http://www.sitemaps.org/schemas/sitemap/0.9', analisis.error || '');
    const locs = analisis.urls.map((u) => u.loc);
    const esperadas = ['/', '/tiendas-online', '/tiendas-online/casos', '/tiendas-online/planes', '/cuanto-cuesta-una-tienda-online', '/politica-privacidad', '/terminos'].map((p) => DOMINIO + p);
    const faltan = esperadas.filter((u) => !locs.includes(u));
    revisar('Sitemap con las URLs nuevas', faltan.length === 0, faltan.join(', '));
    revisar('Sitemap sin .html ni barra final ni página de gracias', locs.every((u) => !/\.html$/.test(u) && !/gracias/.test(u) && (u === DOMINIO + '/' || !u.endsWith('/'))), locs.join(', '));
    revisar('Sitemap: cada lastmod es una fecha', analisis.urls.every((u) => /^\d{4}-\d{2}-\d{2}$/.test(u.lastmod || '')));
    // Las URLs del sitemap que viven en este repositorio responden 200 sin redirección.
    for (const loc of locs) {
      const ruta = loc.slice(DOMINIO.length) || '/';
      if (ruta.startsWith('/tiendas-online')) continue; // las construye otra rama
      const rr = await fetch(BASE + ruta, { redirect: 'manual' });
      revisar(`Sitemap: ${ruta} responde 200`, rr.status === 200, String(rr.status));
    }
  }

  // 9. Enlaces internos y canónicas sin .html
  {
    const paginas = ['index.html', 'politica-privacidad.html', 'terminos.html', 'cuanto-cuesta-una-tienda-online.html', 'demo.html', 'alma/index.html'];
    const malos = [];
    for (const archivo of paginas) {
      const html = fs.readFileSync(path.join(RAIZ, archivo), 'utf8');
      for (const m of html.matchAll(/(?:href|content|url)=["']?([^"'\s>]+)/g)) {
        const url = m[1];
        const interno = url.startsWith('/') || url.startsWith(DOMINIO) || !/^[a-z]+:/i.test(url);
        if (interno && /\.html(?:[?#]|$)/.test(url)) malos.push(`${archivo}: ${url}`);
        if (interno && /^(?:https:\/\/espiritudigital\.cl)?\/alma\/(?:[?#]|$)/.test(url)) malos.push(`${archivo}: ${url}`);
      }
    }
    revisar('Enlaces internos y canónicas sin .html ni /alma/', malos.length === 0, malos.join(' | '));
  }

  // 10. Ninguna página publicable contiene TODO-CRISTIAN (regla 4 del plan)
  {
    const conPendientes = [];
    const recorrer = (dir) => {
      for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entrada.name.startsWith('.') || ['node_modules', 'docs', 'scripts'].includes(entrada.name)) continue;
        const ruta = path.join(dir, entrada.name);
        if (entrada.isDirectory()) recorrer(ruta);
        else if (entrada.name.endsWith('.html') && fs.readFileSync(ruta, 'utf8').includes('TODO-CRISTIAN')) {
          conPendientes.push(path.relative(RAIZ, ruta));
        }
      }
    };
    recorrer(RAIZ);
    revisar('Ninguna página publicable contiene TODO-CRISTIAN', conPendientes.length === 0, conPendientes.join(', '));
  }
} finally {
  await browser.close();
  servidor.close();
}

const fallas = resultados.filter((r) => !r.ok);
for (const r of resultados) {
  console.log(`${r.ok ? 'OK   ' : 'FALLA'} ${r.nombre}${r.detalle && !r.ok ? ' -> ' + r.detalle : ''}`);
}
console.log(`\n${resultados.length - fallas.length} de ${resultados.length} pruebas pasan.`);
process.exit(fallas.length ? 1 : 0);
