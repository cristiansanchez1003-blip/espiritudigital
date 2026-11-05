/* Espíritu Digital · /tiendas-online · JavaScript propio, sin dependencias.
   - Guarda gclid, gbraid, wbraid, utm_*, ref y h en sessionStorage.
   - Arma los enlaces de WhatsApp con "Vengo de Google. " y " Vengo de parte de X.".
   - Eventos de dataLayer sin datos personales y beacon a /api/wa-click.
   - Formulario: validación, envío a /api/lead y respaldo por WhatsApp. */
(function () {
  'use strict';
  var w = window;
  var d = document;
  var raiz = d.documentElement;
  var dl = (w.dataLayer = w.dataLayer || []);
  var CLAVES = ['gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'h'];
  var VARIANTE = /^(tienda|carrito|precio|web|alternativa)$/;
  var PLAN = /^(esencial|pro|empresa|web)$/;
  var almacen = null;

  try {
    almacen = w.sessionStorage;
    almacen.setItem('ed_prueba', '1');
    almacen.removeItem('ed_prueba');
  } catch (e) {
    almacen = null;
  }

  function leer(clave) {
    try {
      return (almacen && almacen.getItem('ed_' + clave)) || '';
    } catch (e) {
      return '';
    }
  }

  function guardar(clave, valor) {
    try {
      if (almacen) almacen.setItem('ed_' + clave, valor);
    } catch (e) {}
  }

  function limpiar(valor) {
    return String(valor || '')
      .replace(/[\u0000-\u001f\u007f<>]/g, '')
      .trim()
      .slice(0, 150);
  }

  // Parámetros: los de la URL mandan; si no vienen, se usan los guardados en la sesión.
  var url;
  try {
    url = new URLSearchParams(w.location.search);
  } catch (e) {
    url = { get: function () { return null; } };
  }
  var ctx = {};
  CLAVES.forEach(function (clave) {
    var valor = limpiar(url.get(clave));
    if (clave === 'h' && !VARIANTE.test(valor)) valor = '';
    if (valor) guardar(clave, valor);
    ctx[clave] = valor || leer(clave);
  });
  var planUrl = limpiar(url.get('plan'));
  if (PLAN.test(planUrl)) guardar('plan', planUrl);

  var pagina = raiz.getAttribute('data-pagina') || '';
  // En gracias no hay portada: vale la variante con que llegó a la landing (sesión).
  var hVista = raiz.getAttribute('data-h') || (pagina === 'gracias' ? ctx.h : '');
  var numero = raiz.getAttribute('data-wa') || '56928117627';

  function evento(datos) {
    dl.push(datos);
  }

  function vieneDeGoogle() {
    return !!(ctx.gclid || ctx.gbraid || ctx.wbraid || /^google$/i.test(ctx.utm_source));
  }

  function mensaje(enlace) {
    var base = (hVista === 'web' && enlace.getAttribute('data-msg-web')) || enlace.getAttribute('data-msg') || '';
    if (vieneDeGoogle()) base = 'Vengo de Google. ' + base;
    if (ctx.ref) base += ' Vengo de parte de ' + ctx.ref + '.';
    return base;
  }

  function armarEnlace(enlace) {
    enlace.href = 'https://wa.me/' + numero + '?text=' + encodeURIComponent(mensaje(enlace));
  }

  function armarEnlaces() {
    var enlaces = d.querySelectorAll('a[data-wa]');
    for (var i = 0; i < enlaces.length; i++) armarEnlace(enlaces[i]);
  }

  function hAtribuida() {
    return ctx.h || hVista;
  }

  function beacon(datos) {
    var cuerpo = JSON.stringify(datos);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon('/api/wa-click', new Blob([cuerpo], { type: 'application/json' }))) return;
    } catch (e) {}
    try {
      fetch('/api/wa-click', { method: 'POST', body: cuerpo, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(function () {});
    } catch (e) {}
  }

  function cargarVideo(boton) {
    var video = d.createElement('video');
    video.src = boton.getAttribute('data-video');
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    var img = boton.querySelector('img');
    if (img) {
      video.width = img.width;
      video.height = img.height;
      video.poster = img.currentSrc || img.src;
    }
    boton.parentNode.replaceChild(video, boton);
    try {
      var promesa = video.play();
      if (promesa && promesa.catch) promesa.catch(function () {});
    } catch (e) {}
    video.focus();
  }

  // Clics: WhatsApp, casos, teléfono y videos. El enlace nunca espera al beacon.
  d.addEventListener('click', function (e) {
    var objetivo = e.target && e.target.closest ? e.target : null;
    if (!objetivo) return;
    var boton = objetivo.closest('button[data-video]');
    if (boton) {
      cargarVideo(boton);
      return;
    }
    var a = objetivo.closest('a');
    if (!a) return;
    if (a.hasAttribute('data-wa')) {
      armarEnlace(a);
      var cta = a.getAttribute('data-wa');
      var plan = a.getAttribute('data-plan') || '';
      if (plan) guardar('plan', plan);
      evento({ event: 'whatsapp_click', cta_location: cta, plan: plan });
      beacon({
        cta_location: cta,
        plan: plan,
        ref: ctx.ref,
        gclid: ctx.gclid,
        utm_source: ctx.utm_source,
        utm_campaign: ctx.utm_campaign,
        utm_term: ctx.utm_term,
        h: hAtribuida(),
        landing_path: w.location.pathname
      });
    } else if (a.hasAttribute('data-caso')) {
      evento({ event: 'case_click', caso: a.getAttribute('data-caso') });
    } else if (a.protocol === 'tel:') {
      evento({ event: 'tel_click' });
    }
  });

  // scroll_50: una vez por visita a la página, al pasar la mitad.
  var mitad = false;
  var pendiente = false;
  function revisarScroll() {
    pendiente = false;
    if (mitad) return;
    var alto = raiz.scrollHeight;
    if (alto > 0 && (w.scrollY + w.innerHeight) / alto >= 0.5) {
      mitad = true;
      evento({ event: 'scroll_50' });
      w.removeEventListener('scroll', alHacerScroll);
    }
  }
  function alHacerScroll() {
    if (!pendiente) {
      pendiente = true;
      (w.requestAnimationFrame || setTimeout)(revisarScroll);
    }
  }
  w.addEventListener('scroll', alHacerScroll, { passive: true });

  // ------------------------------------------------------------ formulario
  function iniciarFormulario(form) {
    var E = {
      texto: form.getAttribute('data-e-texto'),
      opcion: form.getAttribute('data-e-opcion'),
      whatsapp: form.getAttribute('data-e-whatsapp'),
      consentimiento: form.getAttribute('data-e-consentimiento')
    };
    var CAMPOS = ['nombre', 'whatsapp', 'que_vende', 'vende_online', 'plazo', 'presupuesto', 'consentimiento'];
    var RADIOS = { vende_online: 1, plazo: 1, presupuesto: 1 };
    var boton = form.querySelector('button[type="submit"]');
    var falla = d.getElementById('form-falla');
    var t0 = 0;
    var enviando = false;
    var redirigido = false;

    function marcarT0() {
      if (!t0) t0 = Date.now();
    }
    if ('IntersectionObserver' in w) {
      var observador = new IntersectionObserver(function (entradas) {
        for (var i = 0; i < entradas.length; i++) {
          if (entradas[i].isIntersecting) {
            marcarT0();
            observador.disconnect();
          }
        }
      });
      observador.observe(form);
    } else {
      marcarT0();
    }
    form.addEventListener('focusin', marcarT0);

    function campo(nombre) {
      return form.elements.namedItem(nombre);
    }

    function valor(nombre) {
      var c = campo(nombre);
      return c ? String(c.value || '').trim() : '';
    }

    function normalizarWhatsapp(texto) {
      var digitos = String(texto || '').replace(/\D/g, '');
      if (digitos.length === 11 && digitos.indexOf('56') === 0) digitos = digitos.slice(2);
      return /^9\d{8}$/.test(digitos) ? '+56' + digitos : '';
    }

    function mensajeError(nombre) {
      if (nombre === 'whatsapp') return E.whatsapp;
      if (nombre === 'consentimiento') return E.consentimiento;
      return RADIOS[nombre] ? E.opcion : E.texto;
    }

    function controles(nombre) {
      return form.querySelectorAll('[name="' + nombre + '"]');
    }

    function marcar(nombre, texto) {
      var error = d.getElementById('e-' + nombre);
      var lista = controles(nombre);
      for (var i = 0; i < lista.length; i++) {
        if (texto) lista[i].setAttribute('aria-invalid', 'true');
        else lista[i].removeAttribute('aria-invalid');
      }
      if (error) {
        error.textContent = texto || '';
        error.hidden = !texto;
      }
    }

    function validarCampo(nombre) {
      if (nombre === 'whatsapp') return normalizarWhatsapp(valor('whatsapp')) ? '' : E.whatsapp;
      if (nombre === 'consentimiento') return campo('consentimiento').checked ? '' : E.consentimiento;
      return valor(nombre) ? '' : mensajeError(nombre);
    }

    function mostrarErrores(errores) {
      var primero = null;
      CAMPOS.forEach(function (nombre) {
        marcar(nombre, errores[nombre] || '');
        if (errores[nombre] && !primero) primero = controles(nombre)[0];
      });
      if (primero) primero.focus();
    }

    // Al corregir un campo con error, el mensaje se actualiza.
    function alCambiar(e) {
      var nombre = e.target && e.target.name;
      if (!nombre || CAMPOS.indexOf(nombre) < 0) return;
      var error = d.getElementById('e-' + nombre);
      if (error && !error.hidden) marcar(nombre, validarCampo(nombre));
    }
    form.addEventListener('input', alCambiar);
    form.addEventListener('change', alCambiar);

    function planInteres() {
      var plan = leer('plan');
      if (PLAN.test(plan)) return plan;
      return hAtribuida() === 'web' ? 'web' : '';
    }

    function mostrarFalla() {
      if (falla) {
        falla.hidden = false;
        var enlace = falla.querySelector('a[data-wa]');
        if (enlace) armarEnlace(enlace);
      }
    }

    function terminar() {
      enviando = false;
      boton.disabled = false;
      boton.removeAttribute('aria-busy');
    }

    function exito(datos) {
      guardar('nombre', datos.nombre);
      var destino = form.getAttribute('data-gracias');
      function ir() {
        if (redirigido) return;
        redirigido = true;
        w.location.assign(destino);
      }
      var conGtm = !!w.google_tag_manager;
      var lead = { event: 'generate_lead', plan_interes: datos.plan_interes, presupuesto: datos.presupuesto, plazo: datos.plazo };
      if (conGtm) {
        lead.eventCallback = ir;
        lead.eventTimeout = 2000;
      }
      evento(lead);
      setTimeout(ir, conGtm ? 2200 : 0);
    }

    function datosOcultos() {
      var ocultos = {};
      CLAVES.forEach(function (clave) {
        ocultos[clave] = clave === 'h' ? hAtribuida() : ctx[clave] || '';
      });
      ocultos.landing_path = w.location.pathname;
      ocultos.t0 = t0 || Date.now();
      for (var clave in ocultos) {
        var c = campo(clave);
        if (c && c.type === 'hidden') c.value = ocultos[clave];
      }
      return ocultos;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (enviando || redirigido) return;
      if (falla) falla.hidden = true;
      var errores = {};
      var hay = false;
      CAMPOS.forEach(function (nombre) {
        var texto = validarCampo(nombre);
        if (texto) {
          errores[nombre] = texto;
          hay = true;
        }
      });
      mostrarErrores(errores);
      if (hay) return;

      var ocultos = datosOcultos();
      var datos = {
        nombre: valor('nombre').replace(/\s+/g, ' ').slice(0, 80),
        whatsapp: normalizarWhatsapp(valor('whatsapp')),
        que_vende: valor('que_vende').slice(0, 200),
        vende_online: valor('vende_online'),
        plazo: valor('plazo'),
        presupuesto: valor('presupuesto'),
        plan_interes: planInteres(),
        consentimiento: true,
        ref: ocultos.ref,
        gclid: ocultos.gclid,
        gbraid: ocultos.gbraid,
        wbraid: ocultos.wbraid,
        utm_source: ocultos.utm_source,
        utm_medium: ocultos.utm_medium,
        utm_campaign: ocultos.utm_campaign,
        utm_term: ocultos.utm_term,
        utm_content: ocultos.utm_content,
        h: ocultos.h,
        landing_path: ocultos.landing_path,
        hp: valor('sitio_web'),
        t0: ocultos.t0
      };

      enviando = true;
      boton.disabled = true;
      boton.setAttribute('aria-busy', 'true');
      var control = 'AbortController' in w ? new AbortController() : null;
      var reloj = setTimeout(function () {
        if (control) control.abort();
      }, 15000);

      fetch(form.getAttribute('action') || '/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
        credentials: 'same-origin',
        signal: control ? control.signal : undefined
      })
        .then(function (respuesta) {
          clearTimeout(reloj);
          return respuesta
            .json()
            .catch(function () {
              return {};
            })
            .then(function (cuerpo) {
              if (respuesta.status === 200 && cuerpo && cuerpo.ok === true) {
                exito(datos);
                return;
              }
              terminar();
              if (respuesta.status === 400 && cuerpo && cuerpo.campos && cuerpo.campos.length) {
                var errores = {};
                var corregibles = 0;
                for (var i = 0; i < cuerpo.campos.length; i++) {
                  var nombre = cuerpo.campos[i];
                  if (CAMPOS.indexOf(nombre) >= 0) {
                    errores[nombre] = mensajeError(nombre);
                    corregibles++;
                  }
                }
                if (corregibles) {
                  mostrarErrores(errores);
                  return;
                }
              }
              mostrarFalla();
            });
        })
        .catch(function () {
          clearTimeout(reloj);
          terminar();
          mostrarFalla();
        });
    });
  }

  // ---------------------------------------------------------------- inicio
  armarEnlaces();
  if (pagina === 'landing') evento({ event: 'view_variant', h: hVista });
  var form = d.getElementById('form-cotizar');
  if (form) iniciarFormulario(form);
})();
