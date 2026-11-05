'use strict';

// Límite de envíos por IP, en memoria y de mejor esfuerzo: cada instancia de Vercel
// tiene su propia memoria y se recicla sola. Frena ráfagas, no ataques distribuidos.

// IPv6: cada conexión recibe un /64 completo, así que la clave es el /64.
// IPv4 (incluida la mapeada ::ffff:a.b.c.d): la IP tal cual.
function claveIP(ip) {
  let valor = String(ip || '').trim().toLowerCase();
  if (!valor) return 'desconocida';
  const mapeada = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(valor);
  if (mapeada) return mapeada[1];
  if (!valor.includes(':')) return valor;

  valor = valor.split('%')[0];
  const partes = valor.split('::');
  if (partes.length > 2) return valor;
  const cabeza = partes[0] ? partes[0].split(':') : [];
  const cola = partes.length === 2 && partes[1] ? partes[1].split(':') : [];
  const relleno = partes.length === 2 ? Array(Math.max(0, 8 - cabeza.length - cola.length)).fill('0') : [];
  const grupos = [...cabeza, ...relleno, ...cola];
  const prefijo = grupos
    .slice(0, 4)
    .map((g) => (parseInt(g, 16) || 0).toString(16))
    .join(':');
  return `${prefijo}::/64`;
}

function crearLimitador({ max, ventanaMs }) {
  const registros = new Map();

  function limpiar(ahora) {
    const desde = ahora - ventanaMs;
    for (const [clave, marcas] of registros) {
      const vivas = marcas.filter((t) => t > desde);
      if (vivas.length) registros.set(clave, vivas);
      else registros.delete(clave);
    }
  }

  // Cuenta el intento y dice si cabe en la ventana.
  function permitir(clave, ahora = Date.now()) {
    const desde = ahora - ventanaMs;
    const marcas = (registros.get(clave) || []).filter((t) => t > desde);
    if (marcas.length >= max) {
      registros.set(clave, marcas);
      return false;
    }
    marcas.push(ahora);
    registros.set(clave, marcas);
    if (registros.size > 5000) limpiar(ahora);
    return true;
  }

  return { permitir };
}

module.exports = { claveIP, crearLimitador };
