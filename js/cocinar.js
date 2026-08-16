// Cocinar: plan de cocina con recetas y raciones ajustables (sin DB).
// Estructura en localStorage:
//   recetario.cocinar -> [{ slug, raciones }]  (orden de adición)

// Recetas y flujos inyectados desde 11ty.
// El dump de recetas genera { recetas: [...] }; el de flujos, { flujos: {...} }.
const RECETAS = (window.RECETAS && window.RECETAS.recetas) || [];
const FLUJOS = (window.FLUJOS && window.FLUJOS.flujos) || {};

const STORAGE = "recetario.cocinar";

const input = document.getElementById("receta-input");
const menu = document.getElementById("receta-sugerencias");
const btnAgregar = document.getElementById("btn-agregar");
const btnVaciar = document.getElementById("btn-vaciar");
const plan = document.getElementById("plan");
const planVacio = document.getElementById("plan-vacio");
const resumen = document.getElementById("plan-resumen");

let typeaheadActivo = -1; // índice del item resaltado en el dropdown

function recetaPorSlug(slug) {
  return RECETAS.find((r) => r.slug === slug) || null;
}

function cargarPlan() {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE));
    if (Array.isArray(p)) return p;
  } catch {
    // ignore
  }
  return [];
}

function guardarPlan(items) {
  localStorage.setItem(STORAGE, JSON.stringify(items));
}

// Re-escala los aportes por día del menú cuando el usuario ajusta el total de
// raciones en la sección Cocinar, para que el indicador por día del menú siga
// siendo coherente con el total (el último día con aporte absorbe el redondeo).
function reescalarAportes(item, nuevoTotal) {
  const aportes = item.aportes;
  if (!aportes || typeof aportes !== "object") return;
  const dias = Object.keys(aportes);
  if (!dias.length) return;
  const viejoTotal = item.raciones > 0 ? item.raciones : 1;
  const factor = nuevoTotal / viejoTotal;
  let suma = 0;
  dias.forEach((dia, i) => {
    let v = Math.max(0, Math.round(aportes[dia] * factor));
    if (i === dias.length - 1) v = Math.max(0, nuevoTotal - suma); // el último absorbe el redondeo
    aportes[dia] = v;
    suma += v;
  });
}

// ---- Typeahead de recetas ----

// Normaliza para búsqueda: minúsculas, sin acentos, espacios simples.
function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function recetasCandidatas(q) {
  const yaAgregadas = new Set(cargarPlan().map((i) => i.slug));
  return RECETAS.filter(
    (r) => !yaAgregadas.has(r.slug) && norm(r.title).includes(q)
  );
}

function mostrarSugerencias() {
  if (!input || !menu) return;
  const q = norm(input.value);
  if (q.length < 2) {
    ocultarSugerencias();
    return;
  }

  const candidatas = recetasCandidatas(q).slice(0, 12);

  if (!candidatas.length) {
    menu.innerHTML = '<span class="typeahead-vacio">Sin coincidencias</span>';
    menu.hidden = false;
    input.setAttribute("aria-expanded", "true");
    typeaheadActivo = -1;
    return;
  }

  menu.innerHTML = "";
  candidatas.forEach((r, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "typeahead-item";
    btn.textContent = r.porciones_receta
      ? `${r.title} (${r.porciones_receta} ${r.porciones_receta === 1 ? "porción" : "porciones"})`
      : r.title;
    btn.setAttribute("role", "option");
    btn.addEventListener("mousedown", (e) => {
      e.preventDefault(); // evita el blur antes del click
      seleccionarSugerencia(r.slug);
    });
    menu.appendChild(btn);
  });
  menu.hidden = false;
  input.setAttribute("aria-expanded", "true");
  typeaheadActivo = -1;
}

function ocultarSugerencias() {
  if (!menu) return;
  menu.hidden = true;
  if (input) input.setAttribute("aria-expanded", "false");
  typeaheadActivo = -1;
}

function seleccionarSugerencia(slug) {
  input.value = "";
  ocultarSugerencias();
  agregarReceta(slug);
}

function moverActivo(delta) {
  if (!menu || menu.hidden) return false;
  const items = Array.from(menu.querySelectorAll(".typeahead-item"));
  if (!items.length) return false;
  if (typeaheadActivo >= 0) items[typeaheadActivo].classList.remove("activo");
  typeaheadActivo = (typeaheadActivo + delta + items.length) % items.length;
  items[typeaheadActivo].classList.add("activo");
  return true;
}

// Agrega la receta que mejor coincida con lo escrito (match exacto o primera
// sugerencia). Devuelve true si se agregó.
function agregarPorTexto() {
  const q = norm(input.value);
  if (!q) return false;
  const candidatas = recetasCandidatas(q);
  if (!candidatas.length) return false;
  const exacta =
    candidatas.find((r) => norm(r.title) === q) || candidatas[0];
  input.value = "";
  ocultarSugerencias();
  agregarReceta(exacta.slug);
  return true;
}

// ---- Escalado de cantidades ----

// Redondea a 2 decimales y recorta ceros sobrantes ("600", "22.5", "1.33").
function fmtCant(v) {
  return String(Math.round(v * 100) / 100);
}

// Escala las cantidades de un contenedor de flujo según el factor
// (raciones / porciones_receta). Las celdas sin data-cant (al-gusto,
// unidades complejas) se dejan intactas.
function escalarFlujo(container, factor) {
  container.querySelectorAll(".flujo-cant").forEach((el) => {
    const min = parseFloat(el.dataset.cant);
    if (!Number.isFinite(min)) return;
    const max = el.dataset.cantMax !== undefined ? parseFloat(el.dataset.cantMax) : null;
    const unidad = el.dataset.unidad || "";
    const aprox = el.dataset.aprox === "1";

    const contable = unidad === "u"; // unidades contables: sin decimales
    const nmin = contable ? String(Math.round(min * factor)) : fmtCant(min * factor);
    const nmax =
      max !== null
        ? contable ? String(Math.round(max * factor)) : fmtCant(max * factor)
        : null;

    let texto = (aprox ? "≈" : "") + nmin;
    if (nmax !== null) texto += "–" + nmax;
    if (unidad) texto += " " + unidad;
    el.textContent = texto;
  });
}

// ---- Render del plan ----

function renderResumen() {
  const items = cargarPlan();
  if (!items.length) {
    resumen.hidden = true;
    return;
  }
  const totalRaciones = items.reduce((acc, i) => acc + i.raciones, 0);
  resumen.textContent =
    `${items.length} ${items.length === 1 ? "receta" : "recetas"} · ` +
    `${totalRaciones} ${totalRaciones === 1 ? "ración" : "raciones"} en total`;
  resumen.hidden = false;
}

function renderPlan() {
  const items = cargarPlan();
  plan.innerHTML = "";

  const vacio = items.length === 0;
  planVacio.hidden = !vacio;
  btnVaciar.disabled = vacio;

  if (vacio) {
    resumen.hidden = true;
    return;
  }

  renderResumen();

  for (const item of items) {
    const receta = recetaPorSlug(item.slug);
    if (!receta) continue;

    const tarjeta = document.createElement("article");
    tarjeta.className = "plan-item";
    tarjeta.dataset.slug = item.slug;

    const head = document.createElement("header");
    head.className = "plan-item-head";

    const link = document.createElement("a");
    link.className = "plan-item-title";
    link.href = `recipes/${item.slug}/`;
    link.textContent = receta.title;
    head.appendChild(link);

    const label = document.createElement("label");
    label.className = "plan-raciones";
    label.append("Raciones ");

    const inputRaciones = document.createElement("input");
    inputRaciones.type = "number";
    inputRaciones.min = "1";
    inputRaciones.step = "1";
    inputRaciones.value = item.raciones;
    inputRaciones.dataset.slug = item.slug;
    inputRaciones.setAttribute("aria-label", `Raciones de ${receta.title}`);
    label.appendChild(inputRaciones);
    head.appendChild(label);

    const quitar = document.createElement("button");
    quitar.type = "button";
    quitar.className = "plan-quitar";
    quitar.dataset.slug = item.slug;
    quitar.setAttribute("aria-label", `Quitar ${receta.title} del plan`);
    quitar.textContent = "✕";
    head.appendChild(quitar);

    tarjeta.appendChild(head);

    const flujo = document.createElement("div");
    flujo.className = "plan-flujo";
    const html = FLUJOS[item.slug];
    if (html) {
      flujo.innerHTML = html;
      const factor = item.raciones / (receta.porciones_receta || 1);
      escalarFlujo(flujo, factor);
    } else {
      flujo.textContent = "Esta receta no tiene preparación disponible.";
    }
    tarjeta.appendChild(flujo);

    plan.appendChild(tarjeta);
  }
}

// ---- Acciones ----

function agregarReceta(slug) {
  if (!slug) return;
  const items = cargarPlan();
  if (items.some((i) => i.slug === slug)) return; // ya está en el plan
  const receta = recetaPorSlug(slug);
  items.push({ slug, raciones: receta ? receta.porciones_receta || 1 : 1, aportes: {} });
  guardarPlan(items);
  renderPlan();
}

btnAgregar.addEventListener("click", () => {
  agregarPorTexto();
});

input.addEventListener("input", mostrarSugerencias);
input.addEventListener("focus", mostrarSugerencias);
input.addEventListener("blur", () => {
  // Pequeño delay para que un click en el dropdown (mousedown) alcance a
  // seleccionar antes de ocultar.
  setTimeout(ocultarSugerencias, 120);
});
input.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (!moverActivo(1)) mostrarSugerencias();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    moverActivo(-1);
  } else if (e.key === "Enter") {
    e.preventDefault();
    const items = menu && !menu.hidden
      ? Array.from(menu.querySelectorAll(".typeahead-item"))
      : [];
    if (typeaheadActivo >= 0 && items[typeaheadActivo]) {
      const slug = recetasCandidatas(norm(input.value))[typeaheadActivo]?.slug;
      if (slug) seleccionarSugerencia(slug);
    } else {
      agregarPorTexto();
    }
  } else if (e.key === "Escape") {
    ocultarSugerencias();
    input.value = "";
  }
});

plan.addEventListener("input", (e) => {
  const inputRaciones = e.target;
  if (!inputRaciones.matches(".plan-raciones input")) return;
  let raciones = parseInt(inputRaciones.value, 10);
  if (!Number.isFinite(raciones) || raciones < 1) {
    raciones = 1;
    inputRaciones.value = 1;
  }
  const items = cargarPlan();
  const item = items.find((i) => i.slug === inputRaciones.dataset.slug);
  if (item) {
    // Reescalar aportes ANTES de cambiar el total: la función usa el total
    // viejo (item.raciones) como base del factor.
    reescalarAportes(item, raciones);
    item.raciones = raciones;
    guardarPlan(items);

    // Re-escalar solo la tarjeta correspondiente (sin perder el foco del input).
    const tarjeta = plan.querySelector(`.plan-item[data-slug="${inputRaciones.dataset.slug}"]`);
    const flujo = tarjeta && tarjeta.querySelector(".plan-flujo");
    const receta = recetaPorSlug(inputRaciones.dataset.slug);
    if (flujo && receta) {
      const factor = raciones / (receta.porciones_receta || 1);
      flujo.innerHTML = FLUJOS[inputRaciones.dataset.slug] || "";
      escalarFlujo(flujo, factor);
    }
    renderResumen();
  }
});

plan.addEventListener("click", (e) => {
  const quitar = e.target.closest(".plan-quitar");
  if (!quitar) return;
  const items = cargarPlan().filter((i) => i.slug !== quitar.dataset.slug);
  guardarPlan(items);
  renderPlan();
});

btnVaciar.addEventListener("click", () => {
  guardarPlan([]);
  renderPlan();
});

renderPlan();
