// Servidor local que emula cómo Vercel sirve este sitio estático según vercel.json.
// Sin dependencias: solo módulos de Node.
//
// Uso:  node scripts/servidor-vercel.mjs [puerto]      (por defecto 4173)
//
// Emula, en el mismo orden que el enrutador de Vercel:
//   1. cleanUrls: /pagina.html y /carpeta/index.html redirigen (308) a /pagina y /carpeta.
//   2. trailingSlash: false: /ruta/ redirige (308) a /ruta.
//   3. redirects: cada { source, destination, permanent } de vercel.json
//      (308 si permanent es true o falta, 307 si es false, o statusCode).
//   4. Archivos: el archivo exacto; si no existe, ruta + ".html"; si no, ruta/index.html.
// Las redirecciones conservan la cadena de consulta (?gclid=..., ?utm_...).
// No emula funciones /api ni encabezados: este sitio no los usa todavía.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ_POR_DEFECTO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
};

export function leerConfig(raiz = RAIZ_POR_DEFECTO) {
  const archivo = path.join(raiz, 'vercel.json');
  if (!fs.existsSync(archivo)) return {};
  return JSON.parse(fs.readFileSync(archivo, 'utf8'));
}

// Convierte un "source" de Vercel a expresión regular. Cubre rutas exactas,
// parámetros (:nombre) y comodines (:nombre* o (.*)), que es lo que usa este sitio.
function patronARegex(source) {
  const nombres = [];
  const cuerpo = source
    .split('/')
    .map((parte) => {
      if (parte === '(.*)') return '(.*)';
      const m = parte.match(/^:([A-Za-z0-9_]+)(\*)?$/);
      if (m) {
        nombres.push(m[1]);
        return m[2] ? '(.*)' : '([^/]+)';
      }
      return parte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return { regex: new RegExp('^' + cuerpo + '$'), nombres };
}

function aplicarDestino(destino, nombres, grupos) {
  let salida = destino;
  nombres.forEach((nombre, i) => {
    salida = salida.replace(new RegExp(':' + nombre + '\\*?', 'g'), grupos[i] ?? '');
  });
  return salida;
}

// Devuelve { status, location } si la ruta debe redirigir, o null.
export function resolverRedireccion(pathname, config) {
  const conBarra = config.trailingSlash === true;
  if (config.cleanUrls) {
    let m = pathname.match(/^\/(?:(.+)\/)?index(?:\.html)?\/?$/);
    if (m) return { status: 308, location: m[1] ? '/' + m[1] + (conBarra ? '/' : '') : '/' };
    m = pathname.match(/^\/(.*)\.html\/?$/);
    if (m) return { status: 308, location: '/' + m[1] + (conBarra ? '/' : '') };
  }
  if (config.trailingSlash === false) {
    const m = pathname.match(/^\/((?:[^/]+\/)*[^/]+)\/$/);
    if (m) return { status: 308, location: '/' + m[1] };
  }
  if (config.trailingSlash === true && pathname !== '/' && !pathname.endsWith('/') && !path.posix.extname(pathname)) {
    return { status: 308, location: pathname + '/' };
  }
  for (const r of config.redirects || []) {
    const { regex, nombres } = patronARegex(r.source);
    const m = pathname.match(regex);
    if (m) {
      const status = r.statusCode || (r.permanent === false ? 307 : 308);
      return { status, location: aplicarDestino(r.destination, nombres, m.slice(1)) };
    }
  }
  return null;
}

function dentroDeRaiz(raiz, relativo) {
  const absoluto = path.resolve(raiz, '.' + relativo);
  return absoluto === raiz || absoluto.startsWith(raiz + path.sep) ? absoluto : null;
}

function esArchivo(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

// Busca el archivo que Vercel serviría para una ruta ya sin redirecciones pendientes.
export function resolverArchivo(raiz, pathname, config) {
  // Vercel no publica archivos ni carpetas que empiezan con punto (.git, .gitignore...).
  if (pathname.split('/').some((seg) => seg.startsWith('.'))) return null;
  const base = dentroDeRaiz(raiz, pathname);
  if (!base) return null;
  if (pathname !== '/' && esArchivo(base)) return base;
  const sinBarra = pathname.replace(/\/+$/, '');
  if (config.cleanUrls && sinBarra) {
    const html = dentroDeRaiz(raiz, sinBarra + '.html');
    if (html && esArchivo(html)) return html;
  }
  const indice = dentroDeRaiz(raiz, (sinBarra || '') + '/index.html');
  if (indice && esArchivo(indice)) return indice;
  return null;
}

export function crearServidor({ raiz = RAIZ_POR_DEFECTO, config = leerConfig(raiz) } = {}) {
  const raizAbs = path.resolve(raiz);
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      res.writeHead(400).end('Ruta inválida');
      return;
    }

    const redireccion = resolverRedireccion(pathname, config);
    if (redireccion) {
      const destino = redireccion.location.includes('?') ? redireccion.location : redireccion.location + url.search;
      res.writeHead(redireccion.status, { Location: destino, 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Redirige a ${destino}`);
      return;
    }

    const archivo = resolverArchivo(raizAbs, pathname, config);
    if (!archivo) {
      const pagina404 = path.join(raizAbs, '404.html');
      const cuerpo = esArchivo(pagina404) ? fs.readFileSync(pagina404) : 'No encontrado';
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(req.method === 'HEAD' ? undefined : cuerpo);
      return;
    }

    const tipo = TIPOS[path.extname(archivo).toLowerCase()] || 'application/octet-stream';
    const { size } = fs.statSync(archivo);
    const rango = req.headers.range && req.headers.range.match(/^bytes=(\d*)-(\d*)$/);
    if (rango && (rango[1] || rango[2])) {
      let inicio = rango[1] ? Number(rango[1]) : size - Number(rango[2]);
      let fin = rango[1] && rango[2] ? Number(rango[2]) : size - 1;
      inicio = Math.max(0, inicio);
      fin = Math.min(fin, size - 1);
      if (inicio > fin) {
        res.writeHead(416, { 'Content-Range': `bytes */${size}` }).end();
        return;
      }
      res.writeHead(206, {
        'Content-Type': tipo,
        'Content-Length': fin - inicio + 1,
        'Content-Range': `bytes ${inicio}-${fin}/${size}`,
        'Accept-Ranges': 'bytes',
      });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(archivo, { start: inicio, end: fin }).pipe(res);
      return;
    }
    res.writeHead(200, { 'Content-Type': tipo, 'Content-Length': size, 'Accept-Ranges': 'bytes' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(archivo).pipe(res);
  });
}

// Ejecución directa: node scripts/servidor-vercel.mjs [puerto]
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const puerto = Number(process.argv[2] || process.env.PORT || 4173);
  crearServidor().listen(puerto, '127.0.0.1', () => {
    console.log(`Sitio en http://127.0.0.1:${puerto} (emulando vercel.json)`);
  });
}
