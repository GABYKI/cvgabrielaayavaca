// Cápsulas de la portada que siguen al mouse
const hero = document.querySelector('.hero');
hero.addEventListener('mousemove', (e) => {
  const r = hero.getBoundingClientRect();
  hero.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
  hero.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
});

// Aparición de secciones al hacer scroll
const observador = new IntersectionObserver((entradas) => {
  entradas.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('visible'); observador.unobserve(e.target); }
  });
}, { threshold: 0.05 });
document.querySelectorAll('.seccion .contenedor').forEach((el) => {
  el.classList.add('oculto');
  observador.observe(el);
});

// Contador de la cifra de la OMS (con puntos de miles: 1.280)
const contador = document.querySelector('.contador');
const miles = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const obsContador = new IntersectionObserver(([e]) => {
  if (!e.isIntersecting) return;
  const meta = Number(contador.dataset.meta);
  const inicio = performance.now();
  const paso = (ahora) => {
    const t = Math.min((ahora - inicio) / 1800, 1);
    contador.textContent = miles(Math.round(meta * (1 - Math.pow(1 - t, 3))));
    if (t < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
  obsContador.disconnect();
}, { threshold: 0.6 });
obsContador.observe(contador);

/* ========== Datos guardados en el navegador de la persona ========== */
const KEY = 'pulso-datos';
let datos = { meds: [], semana: '', dias: [false, false, false, false, false, false, false], lecturas: [] };
try {
  const g = JSON.parse(localStorage.getItem(KEY));
  if (g) datos = { ...datos, ...g };
} catch (e) { /* sin almacenamiento: funciona igual, pero no se guarda */ }
function guardar() {
  try { localStorage.setItem(KEY, JSON.stringify(datos)); } catch (e) {}
}

const dias = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const hoyIdx = (new Date().getDay() + 6) % 7;
function lunesDeEstaSemana() {
  const d = new Date();
  d.setDate(d.getDate() - hoyIdx);
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}
if (datos.semana !== lunesDeEstaSemana()) {
  datos.semana = lunesDeEstaSemana();
  datos.dias = [false, false, false, false, false, false, false];
  guardar();
}

/* ========== Medicinas ========== */
const medForm = document.getElementById('med-form');
const medNombre = document.getElementById('med-nombre');
const medHora = document.getElementById('med-hora');
const msgMed = document.getElementById('msg-med');
const listaMeds = document.getElementById('meds');
const proxima = document.getElementById('proxima');

function pintarMeds() {
  listaMeds.innerHTML = '';
  if (!datos.meds.length) {
    const li = document.createElement('li');
    li.className = 'vacio';
    li.textContent = 'Todavía no anotaste ninguna medicina. Agrega la primera arriba.';
    listaMeds.appendChild(li);
  }
  datos.meds.forEach((m, i) => {
    const li = document.createElement('li');
    const txt = document.createElement('span');
    const h = document.createElement('span');
    h.className = 'hora';
    h.textContent = m.hora;
    txt.append(h, ' · ' + m.nombre);
    const q = document.createElement('button');
    q.type = 'button';
    q.className = 'quitar';
    q.textContent = 'Quitar';
    q.setAttribute('aria-label', 'Quitar ' + m.nombre);
    q.addEventListener('click', () => { datos.meds.splice(i, 1); guardar(); pintarMeds(); });
    li.append(txt, q);
    listaMeds.appendChild(li);
  });
  pintarProxima();
}

function pintarProxima() {
  if (!datos.meds.length) { proxima.textContent = ''; return; }
  const ahora = new Date();
  const hhmm = String(ahora.getHours()).padStart(2, '0') + ':' + String(ahora.getMinutes()).padStart(2, '0');
  const sig = datos.meds.find((m) => m.hora >= hhmm);
  proxima.textContent = sig
    ? 'Próxima dosis de hoy: ' + sig.nombre + ' a las ' + sig.hora + '.'
    : 'Ya pasaron todas las dosis de hoy. La próxima es mañana: ' + datos.meds[0].nombre + ' a las ' + datos.meds[0].hora + '.';
}
setInterval(pintarProxima, 60000);

medForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  [medNombre, medHora].forEach((c) => c.classList.remove('error'));
  if (medNombre.value.trim().length < 2) {
    medNombre.classList.add('error'); msgMed.textContent = 'Escribe el nombre de la medicina y su dosis.'; medNombre.focus(); return;
  }
  if (!medHora.value) {
    medHora.classList.add('error'); msgMed.textContent = 'Elige la hora a la que la tomas.'; medHora.focus(); return;
  }
  if (datos.meds.length >= 12) { msgMed.textContent = 'Ya agregaste 12 medicinas. Quita alguna para añadir otra.'; return; }
  datos.meds.push({ nombre: medNombre.value.trim(), hora: medHora.value });
  datos.meds.sort((a, b) => a.hora.localeCompare(b.hora));
  guardar();
  msgMed.textContent = 'Listo, agregaste ' + medNombre.value.trim() + '.';
  medForm.reset();
  pintarMeds();
});

/* ========== Pastillero semanal ========== */
const comps = [...document.querySelectorAll('.comp')];
const racha = document.getElementById('racha');
const aviso = document.getElementById('aviso');

function mostrar(texto, tipo) {
  aviso.textContent = texto;
  aviso.className = 'aviso' + (tipo ? ' ' + tipo : '');
}
function listaDias(arr) {
  const n = arr.map((i) => dias[i]);
  return n.length > 1 ? n.slice(0, -1).join(', ') + ' y ' + n[n.length - 1] : n[0];
}
function olvidados() {
  return dias.map((_, i) => i).filter((i) => i < hoyIdx && !datos.dias[i]);
}
function pintarPastillero() {
  comps.forEach((c, i) => {
    c.classList.toggle('abierto', datos.dias[i]);
    c.classList.toggle('olvido', !datos.dias[i] && i < hoyIdx);
  });
  racha.textContent = datos.dias.filter(Boolean).length + ' de 7 dosis tomadas';
}
function estado() {
  const o = olvidados();
  if (datos.dias.every(Boolean)) return mostrar('Semana completa. No te saltaste ninguna dosis.', 'ok');
  if (o.length) return mostrar('Se pasó la dosis del ' + listaDias(o) + '. Cuéntaselo a tu familia con el resumen de abajo.', 'alerta');
  if (datos.dias[hoyIdx]) return mostrar('Hoy ya tomaste tu dosis. Bien hecho.', 'ok');
  mostrar('Hoy es ' + dias[hoyIdx] + '. Abre su compartimento cuando tomes tu medicina.');
}

comps.forEach((comp, i) => {
  comp.querySelector('.tapa').addEventListener('click', () => {
    if (i > hoyIdx) { mostrar('Ese día todavía no llega. Abre el de hoy (' + dias[hoyIdx] + ').'); return; }
    datos.dias[i] = true;
    guardar();
    pintarPastillero();
    estado();
  });
});

document.getElementById('vaciar').addEventListener('click', () => {
  datos.dias = [false, false, false, false, false, false, false];
  guardar();
  pintarPastillero();
  mostrar('Semana nueva. Todos los compartimentos están cerrados.');
});

/* ========== Registro de presión y glucosa ========== */
const regForm = document.getElementById('reg-form');
const tipo = document.getElementById('tipo');
const sis = document.getElementById('sis');
const dia = document.getElementById('dia');
const glu = document.getElementById('glu');
const msgReg = document.getElementById('msg-reg');
const listaLect = document.getElementById('lecturas');

tipo.addEventListener('change', () => {
  const p = tipo.value === 'presion';
  document.getElementById('campo-sis').hidden = !p;
  document.getElementById('campo-dia').hidden = !p;
  document.getElementById('campo-glu').hidden = p;
});

function clasificarPresion(s, d) {
  if (s >= 180 || d >= 120) return { txt: 'Muy alta: busca atención médica hoy', n: 'alto' };
  if (s >= 140 || d >= 90) return { txt: 'Alta', n: 'alto' };
  if (s < 90 || d < 60) return { txt: 'Baja', n: 'medio' };
  if (s >= 130 || d >= 80) return { txt: 'Algo elevada', n: 'medio' };
  if (s >= 120) return { txt: 'Ligeramente elevada', n: 'medio' };
  return { txt: 'Normal', n: 'ok' };
}
function clasificarGlucosa(g) {
  if (g >= 250) return { txt: 'Muy alta: consulta hoy', n: 'alto' };
  if (g >= 126) return { txt: 'Alta', n: 'alto' };
  if (g >= 100) return { txt: 'Elevada', n: 'medio' };
  if (g >= 70) return { txt: 'Normal', n: 'ok' };
  return { txt: 'Baja: come algo y consulta', n: 'alto' };
}
function fechaCorta(iso) {
  const d = new Date(iso);
  return d.getDate() + '/' + (d.getMonth() + 1) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
function valorTexto(l) {
  return l.tipo === 'presion' ? 'Presión ' + l.a + '/' + l.b : 'Glucosa ' + l.a + ' mg/dL';
}
function pintarLecturas() {
  listaLect.innerHTML = '';
  if (!datos.lecturas.length) {
    const li = document.createElement('li');
    li.className = 'vacio';
    li.textContent = 'Todavía no hay lecturas. Guarda la primera arriba.';
    listaLect.appendChild(li);
    return;
  }
  datos.lecturas.slice(0, 8).forEach((l) => {
    const li = document.createElement('li');
    const txt = document.createElement('span');
    const f = document.createElement('span');
    f.className = 'hora';
    f.textContent = fechaCorta(l.fecha);
    txt.append(f, ' · ' + valorTexto(l));
    const et = document.createElement('span');
    et.className = 'etiqueta ' + l.n;
    et.textContent = l.estado;
    li.append(txt, et);
    listaLect.appendChild(li);
  });
}

regForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  [sis, dia, glu].forEach((c) => c.classList.remove('error'));
  let lectura;
  if (tipo.value === 'presion') {
    const s = Number(sis.value), d = Number(dia.value);
    if (!s || s < 60 || s > 260) { sis.classList.add('error'); msgReg.textContent = 'Escribe la presión alta (entre 60 y 260).'; sis.focus(); return; }
    if (!d || d < 30 || d > 160 || d >= s) { dia.classList.add('error'); msgReg.textContent = 'Revisa la presión baja: debe ser menor que la alta.'; dia.focus(); return; }
    const c = clasificarPresion(s, d);
    lectura = { tipo: 'presion', a: s, b: d, estado: c.txt, n: c.n };
  } else {
    const g = Number(glu.value);
    if (!g || g < 20 || g > 600) { glu.classList.add('error'); msgReg.textContent = 'Escribe la glucosa en mg/dL (entre 20 y 600).'; glu.focus(); return; }
    const c = clasificarGlucosa(g);
    lectura = { tipo: 'glucosa', a: g, estado: c.txt, n: c.n };
  }
  lectura.fecha = new Date().toISOString();
  datos.lecturas.unshift(lectura);
  datos.lecturas = datos.lecturas.slice(0, 30);
  guardar();
  msgReg.textContent = valorTexto(lectura) + ': ' + lectura.estado + '.';
  regForm.reset();
  tipo.dispatchEvent(new Event('change'));
  pintarLecturas();
});

document.getElementById('borrar-lect').addEventListener('click', () => {
  datos.lecturas = [];
  guardar();
  msgReg.textContent = 'Borraste los registros.';
  pintarLecturas();
});

/* ========== Cuídate: toca un hábito para leerlo ========== */
const chips = [...document.querySelectorAll('#chips button')];
const desc = document.getElementById('chips-desc');
function elegir(chip) {
  chips.forEach((c) => c.setAttribute('aria-pressed', c === chip));
  desc.textContent = chip.dataset.desc;
}
chips.forEach((c) => c.addEventListener('click', () => elegir(c)));
elegir(chips[0]);

/* ========== Compartir resumen con la familia ========== */
const form = document.getElementById('form');
const msg = document.getElementById('msg-form');
const nombre = document.getElementById('nombre');
const telefono = document.getElementById('telefono');

function armarResumen(persona) {
  const tomadas = datos.dias.filter(Boolean).length;
  const o = olvidados();
  let t = 'Resumen de Pulso de ' + persona + '\n\n';
  t += 'Dosis de la semana: ' + tomadas + ' de 7 tomadas.\n';
  t += o.length ? 'Dosis que se pasaron: ' + listaDias(o) + '.\n' : 'No se pasó ninguna dosis.\n';
  t += '\nMedicinas:\n';
  t += datos.meds.length ? datos.meds.map((m) => '- ' + m.nombre + ' a las ' + m.hora).join('\n') : '- (aún no anotadas)';
  t += '\n\nÚltimas lecturas:\n';
  t += datos.lecturas.length
    ? datos.lecturas.slice(0, 5).map((l) => '- ' + fechaCorta(l.fecha) + ': ' + valorTexto(l) + ' (' + l.estado + ')').join('\n')
    : '- (aún sin lecturas)';
  return t;
}

function validarNombre() {
  nombre.classList.remove('error');
  if (nombre.value.trim().length < 2) {
    nombre.classList.add('error'); msg.textContent = 'Escribe el nombre de la persona para armar el resumen.'; nombre.focus(); return false;
  }
  return true;
}

function numeroEcuador(valor) {
  const d = valor.replace(/\D/g, '');
  if (!d) return '';
  if (d.length === 10 && d[0] === '0') return '593' + d.slice(1);
  if (d.length === 9 && d[0] === '9') return '593' + d;
  if (d.length >= 11) return d;
  return null;
}

form.addEventListener('submit', (ev) => {
  ev.preventDefault();
  telefono.classList.remove('error');
  if (!validarNombre()) return;
  const num = numeroEcuador(telefono.value);
  if (num === null) {
    telefono.classList.add('error'); msg.textContent = 'Revisa el número: escríbelo con 10 dígitos, por ejemplo 0991234567.'; telefono.focus(); return;
  }
  const texto = encodeURIComponent(armarResumen(nombre.value.trim()));
  window.open('https://wa.me/' + num + '?text=' + texto, '_blank', 'noopener');
  msg.textContent = 'Se abrió WhatsApp con el resumen listo para enviar.';
});

document.getElementById('copiar').addEventListener('click', async () => {
  if (!validarNombre()) return;
  const texto = armarResumen(nombre.value.trim());
  try {
    await navigator.clipboard.writeText(texto);
    msg.textContent = 'Resumen copiado. Pégalo donde quieras.';
  } catch (e) {
    msg.textContent = 'No se pudo copiar. Usa el botón de WhatsApp.';
  }
});

// Pintar todo al cargar
pintarMeds();
pintarPastillero();
estado();
pintarLecturas();
