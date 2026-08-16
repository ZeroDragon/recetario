// Menú semanal: CRUD de menús con localStorage (sin DB).
// Estructura en localStorage:
//   recetario.menus    -> [{ id, nombre, dias: { lun: {desayuno, postentreno, comida, cena}, ... } }]
//   recetario.menuActivo -> id del menú seleccionado

// Recetas inyectadas desde 11ty (slug, title, tipo, ingredientes)
// El dump genera { recetas: [...] }
const RECETAS = (window.RECETAS && window.RECETAS.recetas) || [];
window.RECETAS_LIST = RECETAS;

const DIAS = [
  { key: "lun", label: "Lunes" },
  { key: "mar", label: "Martes" },
  { key: "mie", label: "Miércoles" },
  { key: "jue", label: "Jueves" },
  { key: "vie", label: "Viernes" },
  { key: "sab", label: "Sábado" },
  { key: "dom", label: "Domingo" },
];

const COMIDAS = [
  { key: "desayuno", label: "Desayuno" },
  { key: "postentreno", label: "Post-entreno" },
  { key: "comida", label: "Comida" },
  { key: "cena", label: "Cena" },
];

const STORAGE_MENUS = "recetario.menus";
const STORAGE_ACTIVO = "recetario.menuActivo";

function cargarMenus() {
  try {
    const m = JSON.parse(localStorage.getItem(STORAGE_MENUS));
    if (Array.isArray(m)) return m;
  } catch {
    // ignore
  }
  return [];
}

// Menú inicial sembrado (plan semanal de Carlos, del antiguo menu.md).
// Solo se crea si no hay menús guardados.
const MENU_INICIAL = {
  id: "menu-inicial",
  nombre: "Menú semanal",
  dias: {
    lun: { desayuno: "huevos-a-la-mexicana", postentreno: "batido-de-proteina", comida: "pollo-limon-ajo", cena: "fajitas-de-res" },
    mar: { desayuno: "avena-con-yogurt", postentreno: "batido-de-proteina", comida: "ensalada-arroz-crispy", cena: "tinga-de-pollo" },
    mie: { desayuno: "huevos-a-la-mexicana", postentreno: "batido-de-proteina", comida: "tinga-de-pollo", cena: "pollo-limon-ajo" },
    jue: { desayuno: "avena-con-yogurt", postentreno: "batido-de-proteina", comida: "pollo-limon-ajo", cena: "fajitas-de-res" },
    vie: { desayuno: "huevos-a-la-mexicana", postentreno: "batido-de-proteina", comida: "ensalada-arroz-crispy", cena: "tinga-de-pollo" },
    sab: { desayuno: "avena-con-yogurt", comida: "tinga-de-pollo", cena: "pollo-limon-ajo" },
    dom: { desayuno: "huevos-a-la-mexicana", comida: "pollo-limon-ajo", cena: "fajitas-de-res" },
  },
};

function sembrarMenuInicial() {
  if (cargarMenus().length === 0) {
    guardarMenus([MENU_INICIAL]);
    if (!localStorage.getItem(STORAGE_ACTIVO)) {
      guardarActivo(MENU_INICIAL.id);
    }
    return true; // se sembró (y hay que recargar activo)
  }
  return false;
}

function guardarMenus(menus) {
  localStorage.setItem(STORAGE_MENUS, JSON.stringify(menus));
}

function cargarActivo() {
  const v = localStorage.getItem(STORAGE_ACTIVO);
  return v && v !== "null" ? v : null;
}

function guardarActivo(id) {
  if (id) {
    localStorage.setItem(STORAGE_ACTIVO, id);
  } else {
    localStorage.removeItem(STORAGE_ACTIVO);
  }
}

// ---- Helpers de recetas ----
function recetaPorSlug(slug) {
  return RECETAS.find((r) => r.slug === slug) || null;
}

function recetasPorTipo(tipo) {
  // tipo en el front matter puede ser array (["comida","cena"]) o string ("comida")
  return RECETAS.filter((r) => Array.isArray(r.tipo) ? r.tipo.includes(tipo) : r.tipo === tipo);
}

const REGIMENES = {
  mantenimiento: { p: 30, g: 30, c: 40 }, // Equilibrio general (Mantenimiento)
  definicion: { p: 35, g: 25, c: 40 },    // Definición / Pérdida de grasa
  volumen: { p: 25, g: 25, c: 50 },       // Aumento muscular (Volumen)
};

// ---- Helpers de restricciones (alimentos a evitar) ----
function normRestr(s) {
  return String(s || "").toLowerCase().trim().replace(/\s+/g, " ");
}

// Restricción r contra el nombre de un ingrediente (match de subcadena normalizada)
function coincideRestriccion(r, ing) {
  const a = normRestr(r);
  const b = normRestr(ing);
  return !!a && !!b && (a.includes(b) || b.includes(a));
}

function ingredientesDeReceta(slug) {
  const r = recetaPorSlug(slug);
  return r && Array.isArray(r.ingredientes) ? r.ingredientes : [];
}

// Restricciones que coinciden con algún ingrediente del slug (array de strings)
function restriccionesDeSlug(slug, restricciones) {
  const lista = Array.isArray(restricciones) ? restricciones : [];
  if (!lista.length) return [];
  return lista.filter((r) => ingredientesDeReceta(slug).some((ing) => coincideRestriccion(r, ing)));
}

// Receta permitida (sin ingrediente restringido)
function recetaPermitida(receta, restricciones) {
  return !restriccionesDeSlug(receta.slug, restricciones).length;
}

// ---- Helpers de macros ----
function macrosDeReceta(slug) {
  const r = recetaPorSlug(slug);
  return r && r.macros_por_porcion ? r.macros_por_porcion : null;
}

function totalesDeSlugs(slugs) {
  let kcal = 0, P = 0, C = 0, G = 0, n = 0;
  for (const s of slugs) {
    const m = macrosDeReceta(s);
    if (!m) continue;
    kcal += m.calorias_kcal || 0;
    P += m.proteina_g || 0;
    C += m.carbohidratos_g || 0;
    G += m.grasas_g || 0;
    n++;
  }
  return n ? { kcal, P, C, G } : null;
}

function fmt(n) {
  return Math.round(n).toLocaleString("es-MX");
}

// % de kcal que aporta cada macro (P/C/G en gramos)
function pctMacros(gP, gC, gG, kcal) {
  const k = kcal || 1;
  return { p: ((gP || 0) * 4) / k * 100, c: ((gC || 0) * 4) / k * 100, g: ((gG || 0) * 9) / k * 100 };
}

// Menor puntaje = mejor: cerca del centro del rango de kcal, cerca de la
// distribución del régimen, y sin repetir recetas usadas recientemente.
function puntuarCombo(combo, historial, centro, regimen) {
  let kcal = 0, pg = 0, cg = 0, gg = 0;
  for (const { receta } of combo) {
    const m = receta.macros_por_porcion;
    kcal += m.calorias_kcal || 0;
    pg += m.proteina_g || 0;
    cg += m.carbohidratos_g || 0;
    gg += m.grasas_g || 0;
  }
  let score = (Math.abs(kcal - centro) / centro) * 500;
  const pct = pctMacros(pg, cg, gg, kcal);
  score += Math.abs(pct.p - regimen.p) + Math.abs(pct.c - regimen.c) + Math.abs(pct.g - regimen.g);
  // Penalizar recetas usadas recientemente: ayer = 1000, anteayer = 500, etc.
  for (const { comida, receta } of combo) {
    const usos = historial[comida] || [];
    const idx = usos.indexOf(receta.slug);
    if (idx !== -1) score += 1000 / (idx + 1);
  }
  return score;
}

function comidasDeDia(diaKey) {
  // Post-entreno solo entre semana, como el menú inicial
  return COMIDAS.filter((c) => c.key !== "postentreno" || (diaKey !== "sab" && diaKey !== "dom"));
}

// Genera un menú semanal: por día elige la combinación de recetas (una por
// comida) que caiga en [kcalMin, kcalMax] y mejor se aproxime a los macros
// del régimen, rotando recetas entre días para variar.
// restricciones: alimentos a evitar; los platillos que los contengan quedan
// fuera del pool. Si ningún combo válido cumple el rango, se usa el más
// cercano (queda marcado como conflicto en la UI).
function generarMenu(kcalMin, kcalMax, regimenKey, restricciones) {
  const regimen = REGIMENES[regimenKey] || REGIMENES.mantenimiento;
  const centro = (kcalMin + kcalMax) / 2;
  const historial = {}; // comida -> [slug más reciente, ...]
  const dias = {};

  DIAS.forEach((dia) => {
    const comidas = comidasDeDia(dia.key);
    let combos = [[]];
    comidas.forEach((c) => {
      const pool = recetasPorTipo(c.key).filter(
        (r) => r.macros_por_porcion && recetaPermitida(r, restricciones)
      );
      const next = [];
      combos.forEach((pre) => pool.forEach((r) => next.push([...pre, { comida: c.key, receta: r }])));
      combos = next;
    });

    const conKcal = combos.map((combo) => ({
      combo,
      kcal: combo.reduce((s, x) => s + (x.receta.macros_por_porcion.calorias_kcal || 0), 0),
    }));
    const validos = conKcal.filter((x) => x.kcal >= kcalMin && x.kcal <= kcalMax);
    const candidatos = validos.length ? validos : conKcal; // si nada cae en rango, el más cercano
    candidatos.sort((a, b) => puntuarCombo(a.combo, historial, centro, regimen) - puntuarCombo(b.combo, historial, centro, regimen));

    const elegido = candidatos[0].combo;
    dias[dia.key] = {};
    elegido.forEach(({ comida, receta }) => {
      dias[dia.key][comida] = receta.slug;
      if (!historial[comida]) historial[comida] = [];
      historial[comida].unshift(receta.slug);
    });
  });

  return dias;
}

// ---- Estado de la UI ----
let menus = cargarMenus();
if (sembrarMenuInicial()) {
  menus = cargarMenus(); // recargar tras el seed
}
let activo = cargarActivo();
let editando = null; // null = no editando, objeto = menú en edición

const $ = (sel) => document.querySelector(sel);

function init() {
  renderSelect();
  renderEditor();
  renderMenu();
}

function renderSelect() {
  const sel = $("#menu-select");
  sel.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "— Seleccionar menú —";
  sel.appendChild(placeholder);

  menus.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.nombre;
    sel.appendChild(opt);
  });

  sel.value = activo || "";
  const tieneActivo = !!activo;
  ["#btn-eliminar", "#btn-editar", "#btn-clonar"].forEach((selBtn) => {
    $(selBtn).disabled = !tieneActivo;
  });
}

function renderRestricciones() {
  const lista = $("#restricciones-lista");
  if (!lista) return;
  lista.innerHTML = "";
  const restricciones = Array.isArray(editando.restricciones) ? editando.restricciones : [];

  if (!restricciones.length) {
    const vacio = document.createElement("span");
    vacio.className = "restriccion-chip empty";
    vacio.textContent = "Sin restricciones";
    lista.appendChild(vacio);
    return;
  }

  restricciones.forEach((r, i) => {
    const chip = document.createElement("span");
    chip.className = "restriccion-chip";
    chip.textContent = r;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "✕";
    btn.title = `Quitar "${r}"`;
    btn.addEventListener("click", () => {
      editando.restricciones.splice(i, 1);
      renderRestricciones();
      marcarConflictosEditor();
    });
    chip.appendChild(btn);
    lista.appendChild(chip);
  });
}

function renderEditor() {
  const editor = $("#menu-editor");
  const render = $("#menu-render");

  if (!editando) {
    editor.hidden = true;
    render.hidden = false;
    return;
  }

  editor.hidden = false;
  render.hidden = true;
  $("#editor-titulo").textContent = editando.id ? "Editar menú" : "Nuevo menú";
  $("#menu-nombre").value = editando.nombre || "";

  // Objetivos guardados con el menú (si los hay)
  const obj = editando.objetivo || {};
  $("#kcal-min").value = obj.kcalMin ?? "";
  $("#kcal-max").value = obj.kcalMax ?? "";
  $("#regimen-select").value = obj.regimen || "";

  // Restricciones guardadas con el menú (si las hay)
  if (!Array.isArray(editando.restricciones)) editando.restricciones = [];
  renderRestricciones();

  const tbody = $("#menu-tabla tbody");
  tbody.innerHTML = "";

  DIAS.forEach((dia) => {
    const tr = document.createElement("tr");
    const tdDia = document.createElement("td");
    tdDia.className = "dia-label";
    tdDia.textContent = dia.label;
    tr.appendChild(tdDia);

    COMIDAS.forEach((comida) => {
      const td = document.createElement("td");
      const select = document.createElement("select");
      select.dataset.dia = dia.key;
      select.dataset.comida = comida.key;
      select.className = "receta-select";

      const vacio = document.createElement("option");
      vacio.value = "";
      vacio.textContent = "—";
      select.appendChild(vacio);

      recetasPorTipo(comida.key).forEach((r) => {
        const opt = document.createElement("option");
        opt.value = r.slug;
        opt.textContent = r.title;
        select.appendChild(opt);
      });

      const actual = (editando.dias?.[dia.key]?.[comida.key]) || "";
      select.value = actual;
      td.appendChild(select);
      tr.appendChild(td);
    });

    // Columna de totales del día: se actualiza al cambiar cualquier select
    const tdTot = document.createElement("td");
    tdTot.className = "totales-dia";
    tdTot.textContent = "—";
    tr.appendChild(tdTot);

    tbody.appendChild(tr);
  });

  // Recalcular totales de cada día al cambiar cualquier select
  tbody.querySelectorAll("select").forEach((sel) => {
    sel.addEventListener("change", () => actualizarTotalesEditor());
  });
  actualizarTotalesEditor();
}

// Marca los selects cuyo platillo tiene algún ingrediente restringido y pone
// un aviso en la columna de totales del día. No bloquea el guardado.
function marcarConflictosEditor() {
  const restricciones = Array.isArray(editando.restricciones) ? editando.restricciones : [];
  document.querySelectorAll("#menu-tabla tbody tr").forEach((tr) => {
    const avisos = [];
    let conConflicto = false;
    tr.querySelectorAll("select").forEach((sel) => {
      const slug = sel.value;
      const hits = slug ? restriccionesDeSlug(slug, restricciones) : [];
      sel.classList.toggle("conflicto", hits.length > 0);
      if (hits.length) {
        conConflicto = true;
        avisos.push(`${sel.dataset.comida}: ${hits.join(", ")}`);
        sel.title = `Contiene: ${hits.join(", ")}`;
      } else {
        sel.title = "";
      }
    });
    const td = tr.querySelector(".totales-dia");
    if (td) td.classList.toggle("con-conflicto", conConflicto);
    if (conConflicto) {
      td.title = `Conflicto con restricciones: ${avisos.join(" · ")}`;
    } else if (td && !td.title.includes("Fuera del rango")) {
      td.title = "";
    }
  });
}

function actualizarTotalesEditor() {
  document.querySelectorAll("#menu-tabla tbody tr").forEach((tr) => {
    const slugs = Array.from(tr.querySelectorAll("select"))
      .map((s) => s.value)
      .filter(Boolean);
    const td = tr.querySelector(".totales-dia");
    const tot = totalesDeSlugs(slugs);
    if (!tot) {
      td.textContent = "—";
      td.title = "";
      return;
    }
    td.textContent = `${fmt(tot.kcal)} kcal · P ${fmt(tot.P)} · C ${fmt(tot.C)} · G ${fmt(tot.G)}`;
    td.title = "";
    // Marcar visualmente si la fila está dentro del rango objetivo
    const kcalMin = Number($("#kcal-min").value);
    const kcalMax = Number($("#kcal-max").value);
    if (kcalMin && kcalMax) {
      const ok = tot.kcal >= kcalMin && tot.kcal <= kcalMax;
      td.classList.toggle("dentro-rango", ok);
      td.classList.toggle("fuera-rango", !ok);
      td.title = ok ? "Dentro del rango objetivo" : `Fuera del rango (${fmt(kcalMin)}–${fmt(kcalMax)})`;
    } else {
      td.classList.remove("dentro-rango", "fuera-rango");
    }
  });
  marcarConflictosEditor(); // los avisos de restricción viven en el title del select
}

function renderMenu() {
  const render = $("#menu-render");
  if (editando) return;

  render.hidden = false;
  const titulo = $("#render-titulo");
  const contenido = $("#render-contenido");

  const menu = menus.find((m) => m.id === activo);
  if (!menu) {
    titulo.textContent = "";
    contenido.innerHTML = '<p class="muted">Selecciona o crea un menú para ver el plan semanal.</p>';
    return;
  }

  titulo.textContent = menu.nombre;
  const restricciones = Array.isArray(menu.restricciones) ? menu.restricciones : [];
  const planCocinar = cargarCocinar();
  let html = '<div class="menu-grid">';

  DIAS.forEach((dia) => {
    const slots = COMIDAS.filter((c) => menu.dias?.[dia.key]?.[c.key]);
    if (slots.length === 0) return; // día sin comidas no se renderiza

    html += `<div class="menu-dia"><h3>${dia.label}</h3><ul>`;
    slots.forEach((c) => {
      const slug = menu.dias[dia.key][c.key];
      const receta = recetaPorSlug(slug);
      const nombre = receta ? receta.title : slug;
      const hits = restriccionesDeSlug(slug, restricciones);
      const aviso = hits.length
        ? ` <span class="aviso-conflicto" title="Contiene: ${hits.join(", ")}">⚠ ${hits.join(", ")}</span>`
        : "";
      const enPlan = planCocinar.find((i) => i.slug === slug);
      const porciones = (receta && receta.porciones_receta) || 1;
      const aporteDia = (enPlan && enPlan.aportes && enPlan.aportes[dia.key]) || 0;
      html += `<li><span class="comida-label">${c.label}:</span>`;
      html += ` <a class="comida-nombre" href="/recetario/recipes/${slug}/">${nombre}</a>${aviso}`;
      html += ` <span class="menu-cocinar-acciones">`;
      html += `  <button type="button" class="btn-cocinar" data-slug="${slug}" data-dia="${dia.key}" data-porciones="${porciones}" aria-label="Agregar ${nombre} al plan de cocinar">Cocinar</button>`;
      html += `  <button type="button" class="btn-cocinar-remover" data-slug="${slug}" data-dia="${dia.key}" data-porciones="${porciones}" aria-label="Quitar ${nombre} del plan de cocinar"${aporteDia > 0 ? "" : " disabled"}>Remover</button>`;
      html += `  <span class="cocinar-dia" data-slug="${slug}" data-dia="${dia.key}"${aporteDia > 0 ? "" : " hidden"}>${aporteDia > 0 ? `✓ +${aporteDia} hoy` : ""}</span>`;
      html += `  <span class="cocinar-cantidad" data-slug="${slug}"${enPlan ? "" : " hidden"}>${enPlan ? enPlan.raciones : ""} en plan</span>`;
      html += ` </span></li>`;
    });

    // Totales del día (kcal + macros) + verificación contra el objetivo
    const slugs = slots.map((c) => menu.dias[dia.key][c.key]);
    const tot = totalesDeSlugs(slugs);
    if (tot) {
      const obj = menu.objetivo || {};
      let verif = "";
      if (obj.kcalMin && obj.kcalMax) {
        const ok = tot.kcal >= obj.kcalMin && tot.kcal <= obj.kcalMax;
        verif = ok
          ? `<span class="objetivo-ok">✓ ${fmt(obj.kcalMin)}–${fmt(obj.kcalMax)} kcal</span>`
          : `<span class="objetivo-no">✗ ${fmt(tot.kcal)} kcal (objetivo ${fmt(obj.kcalMin)}–${fmt(obj.kcalMax)})</span>`;
      }
      html += `<li class="totales-dia-render"><span class="comida-label">Totales:</span> <span>${fmt(tot.kcal)} kcal · P ${fmt(tot.P)} · C ${fmt(tot.C)} · G ${fmt(tot.G)}</span>${verif}</li>`;
    }

    html += "</ul></div>";
  });

  html += "</div>";
  contenido.innerHTML = html;
}

// ---- Calculadora GMB/GET (Harris-Benedict) ----
// Ecuación original de Harris-Benedict (1919)
function calcularGMB(sexo, peso, altura, edad) {
  if (sexo === "m") return 66.5 + 13.75 * peso + 5.003 * altura - 6.75 * edad;
  return 655.1 + 9.563 * peso + 1.85 * altura - 4.676 * edad;
}

function calcularGET(gmb, factorActividad) {
  return gmb * factorActividad;
}

// Rango de kCal según el régimen, tomando el GET como base
function rangoParaRegimen(get, regimen) {
  switch (regimen) {
    case "definicion":
      return { min: Math.round(get - 450), max: Math.round(get - 150) };
    case "volumen":
      return { min: Math.round(get + 150), max: Math.round(get + 450) };
    case "mantenimiento":
    default:
      return { min: Math.round(get - 200), max: Math.round(get + 200) };
  }
}

function leerDatosCalculadora() {
  const sexo = $("#calc-sexo").value;
  const peso = Number($("#calc-peso").value);
  const altura = Number($("#calc-altura").value);
  const edad = Number($("#calc-edad").value);
  const actividad = Number($("#calc-actividad").value);
  return { sexo, peso, altura, edad, actividad };
}

function datosCalculadoraValidos(d) {
  return d.sexo && d.peso > 0 && d.altura > 0 && d.edad > 0 && d.actividad > 0;
}

$("#btn-calcular").addEventListener("click", () => {
  const d = leerDatosCalculadora();
  if (!datosCalculadoraValidos(d)) {
    alert("Llena peso, altura y edad para calcular tu GMB/GET.");
    return;
  }
  const gmb = calcularGMB(d.sexo, d.peso, d.altura, d.edad);
  const get = calcularGET(gmb, d.actividad);
  $(".calc-gmb").textContent = `GMB ${fmt(gmb)} kcal`;
  $(".calc-get").textContent = `GET ${fmt(get)} kcal`;
  $(".calc-get").dataset.get = get; // guardar GET para "Usar GET como base"
  $("#calc-resultado").hidden = false;
  $("#btn-usar-get").disabled = false;
});

$("#btn-usar-get").addEventListener("click", () => {
  const get = Number($(".calc-get").dataset.get);
  if (!get) return;
  const regimen = $("#regimen-select").value;
  if (!regimen) {
    alert("Elige primero un régimen para calcular el rango.");
    return;
  }
  const rango = rangoParaRegimen(get, regimen);
  $("#kcal-min").value = rango.min;
  $("#kcal-max").value = rango.max;
  actualizarTotalesEditor();
});

// ---- Typeahead de restricciones ----
// Sugiere ingredientes reales de todas las recetas (front matter), deduplicados.
// Normaliza quitando la cantidad y unidad iniciales para agrupar por nombre.
function ingredientesUnicos() {
  const set = new Set();
  RECETAS.forEach((r) => {
    (r.ingredientes || []).forEach((ing) => {
      const limpio = normRestr(ing).replace(limpiaCantidad, "");
      if (limpio) set.add(limpio);
    });
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
}

// Quita cantidad + unidad al inicio: "500 mL leche", "200–250 ml leche",
// "≈300 g queso", "1/2 taza avena", "3 cucharadas aceite", "al-gusto sal", …
const limpiaCantidad = /^(?:al-gusto|\d+(?:[.,]\d+)?(?:\s*[–\-~]\s*\d+(?:[.,]\d+)?)?(?:\s*\/\s*\d+)?|≈\s*\d+(?:[.,]\d+)?)\s*(?:g|kg|ml|mL|l|L|u|tazas?|cucharadas?|cucharaditas?|piezas?|latas?|rebanadas?|dientes?|sobres?|scoops?|bolsas?|cajas?|puñados?|pizcas?|ramas?|hojas?|pzas?)\s+/;

const INGREDIENTES_UNICOS = ingredientesUnicos();
let typeaheadActivo = -1; // índice del item resaltado en el dropdown

function mostrarSugerencias() {
  const input = $("#restriccion-input");
  const menu = $("#restriccion-sugerencias");
  if (!input || !menu || !editando) return;
  const q = normRestr(input.value);
  if (q.length < 2) {
    ocultarSugerencias();
    return;
  }
  const yaAgregados = new Set((editando.restricciones || []).map(normRestr));
  const candidatos = INGREDIENTES_UNICOS.filter(
    (i) => i.includes(q) && !yaAgregados.has(i)
  ).slice(0, 12);

  if (!candidatos.length) {
    menu.innerHTML = '<span class="typeahead-vacio">Sin coincidencias</span>';
    menu.hidden = false;
    input.setAttribute("aria-expanded", "true");
    typeaheadActivo = -1;
    return;
  }

  menu.innerHTML = "";
  candidatos.forEach((cand, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "typeahead-item";
    btn.textContent = cand;
    btn.setAttribute("role", "option");
    btn.addEventListener("mousedown", (e) => {
      e.preventDefault(); // evita el blur antes del click
      seleccionarSugerencia(cand);
    });
    menu.appendChild(btn);
  });
  menu.hidden = false;
  input.setAttribute("aria-expanded", "true");
  typeaheadActivo = -1;
}

function ocultarSugerencias() {
  const menu = $("#restriccion-sugerencias");
  if (!menu) return;
  menu.hidden = true;
  const input = $("#restriccion-input");
  if (input) input.setAttribute("aria-expanded", "false");
  typeaheadActivo = -1;
}

function seleccionarSugerencia(texto) {
  const input = $("#restriccion-input");
  input.value = texto;
  ocultarSugerencias();
  agregarRestriccion();
}

function moverActivo(delta) {
  const menu = $("#restriccion-sugerencias");
  if (!menu || menu.hidden) return false;
  const items = Array.from(menu.querySelectorAll(".typeahead-item"));
  if (!items.length) return false;
  if (typeaheadActivo >= 0) items[typeaheadActivo].classList.remove("activo");
  typeaheadActivo = (typeaheadActivo + delta + items.length) % items.length;
  items[typeaheadActivo].classList.add("activo");
  items[typeaheadActivo].scrollIntoView({ block: "nearest" });
  return true;
}

function agregarRestriccion() {
  if (!editando) return;
  const input = $("#restriccion-input");
  const valor = normRestr(input.value);
  if (!valor) {
    alert("Escribe un alimento a restringir.");
    return;
  }
  if (!Array.isArray(editando.restricciones)) editando.restricciones = [];
  if (editando.restricciones.some((r) => normRestr(r) === valor)) {
    alert("Ese alimento ya está en la lista.");
    return;
  }
  editando.restricciones.push(valor);
  input.value = "";
  renderRestricciones();
  marcarConflictosEditor();
}

// ---- Eventos ----
$("#btn-nuevo").addEventListener("click", () => {
  editando = { id: null, nombre: "", dias: {}, objetivo: {}, restricciones: [] };
  renderEditor();
});

$("#btn-agregar-restriccion").addEventListener("click", agregarRestriccion);
$("#restriccion-input").addEventListener("input", mostrarSugerencias);
$("#restriccion-input").addEventListener("focus", mostrarSugerencias);
$("#restriccion-input").addEventListener("blur", () => {
  // Pequeño delay para que un click en el dropdown (mousedown) alcance a
  // seleccionar antes de ocultar.
  setTimeout(ocultarSugerencias, 120);
});
$("#restriccion-input").addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (!moverActivo(1)) mostrarSugerencias();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    moverActivo(-1);
  } else if (e.key === "Enter") {
    const menu = $("#restriccion-sugerencias");
    const items = menu && !menu.hidden ? Array.from(menu.querySelectorAll(".typeahead-item")) : [];
    if (typeaheadActivo >= 0 && items[typeaheadActivo]) {
      e.preventDefault();
      seleccionarSugerencia(items[typeaheadActivo].textContent);
    } else {
      e.preventDefault();
      agregarRestriccion();
    }
  } else if (e.key === "Escape") {
    ocultarSugerencias();
  }
});
document.addEventListener("click", (e) => {
  const caja = $("#typeahead-restriccion");
  if (caja && !caja.contains(e.target)) ocultarSugerencias();
});

$("#btn-auto").addEventListener("click", () => {
  if (!editando) return;
  const kcalMin = Number($("#kcal-min").value);
  const kcalMax = Number($("#kcal-max").value);
  const regimen = $("#regimen-select").value;

  if (!kcalMin || !kcalMax || kcalMin >= kcalMax) {
    alert("Pon un rango de kCal válido (mín < máx).");
    return;
  }
  if (!regimen) {
    alert("Elige un régimen (Equilibrio, Definición o Volumen).");
    return;
  }

  editando.objetivo = { kcalMin, kcalMax, regimen };
  editando.dias = generarMenu(kcalMin, kcalMax, regimen, editando.restricciones);
  renderEditor();

  // Avisar si algún día queda fuera del rango (no hay combo que cumpla)
  let fuera = 0;
  DIAS.forEach((dia) => {
    const slugs = comidasDeDia(dia.key).map((c) => editando.dias[dia.key]?.[c.key]).filter(Boolean);
    const tot = totalesDeSlugs(slugs);
    if (tot && (tot.kcal < kcalMin || tot.kcal > kcalMax)) fuera++;
  });
  if (fuera > 0) {
    alert(
      `Aviso: ${fuera} día(s) quedaron fuera del rango de ${fmt(kcalMin)}–${fmt(kcalMax)} kcal. ` +
        "Las recetas actuales no alcanzan ese objetivo; ajústalos en la tabla o amplía el rango."
    );
  }
});

$("#btn-cancelar").addEventListener("click", () => {
  editando = null;
  renderEditor();
  renderMenu();
});

$("#btn-editar").addEventListener("click", () => {
  if (!activo) return;
  const menu = menus.find((m) => m.id === activo);
  if (!menu) return;
  editando = {
    id: menu.id,
    nombre: menu.nombre,
    dias: JSON.parse(JSON.stringify(menu.dias)), // copia profunda
    objetivo: JSON.parse(JSON.stringify(menu.objetivo || {})),
    restricciones: JSON.parse(JSON.stringify(menu.restricciones || [])),
  };
  renderEditor();
});

$("#btn-clonar").addEventListener("click", () => {
  if (!activo) return;
  const menu = menus.find((m) => m.id === activo);
  if (!menu) return;
  const clon = {
    id: "menu-" + Date.now(),
    nombre: menu.nombre + " (copia)",
    dias: JSON.parse(JSON.stringify(menu.dias)),
    objetivo: JSON.parse(JSON.stringify(menu.objetivo || {})),
    restricciones: JSON.parse(JSON.stringify(menu.restricciones || [])),
  };
  menus.push(clon);
  guardarMenus(menus);
  activo = clon.id;
  guardarActivo(activo);
  renderSelect();
  renderMenu();
});

$("#btn-eliminar").addEventListener("click", () => {
  if (!activo) return;
  const menu = menus.find((m) => m.id === activo);
  const nombre = menu ? menu.nombre : "este menú";
  if (!confirm(`¿Eliminar el menú "${nombre}"?`)) return;
  menus = menus.filter((m) => m.id !== activo);
  guardarMenus(menus);
  activo = null;
  guardarActivo(null);
  renderSelect();
  renderMenu();
});

$("#btn-guardar").addEventListener("click", () => {
  const nombre = $("#menu-nombre").value.trim();
  if (!nombre) {
    alert("Ponle un nombre al menú.");
    return;
  }

  const dias = {};
  document.querySelectorAll(".receta-select").forEach((sel) => {
    if (!sel.value) return;
    const dia = sel.dataset.dia;
    const comida = sel.dataset.comida;
    if (!dias[dia]) dias[dia] = {};
    dias[dia][comida] = sel.value;
  });

  // Capturar objetivos (pueden cambiarse en el editor)
  const kcalMin = Number($("#kcal-min").value);
  const kcalMax = Number($("#kcal-max").value);
  const regimen = $("#regimen-select").value;
  const objetivo = kcalMin && kcalMax && regimen ? { kcalMin, kcalMax, regimen } : {};

  // Restricciones del editor (persistidas tal cual)
  const restricciones = Array.isArray(editando.restricciones) ? editando.restricciones : [];

  // Avisar (sin bloquear) los platillos con ingredientes restringidos
  const conflictos = [];
  Object.entries(dias).forEach(([dia, comidas]) => {
    Object.entries(comidas).forEach(([comida, slug]) => {
      const hits = restriccionesDeSlug(slug, restricciones);
      if (hits.length) conflictos.push(`${comida} ${dia}: ${hits.join(", ")}`);
    });
  });

  if (editando.id) {
    const idx = menus.findIndex((m) => m.id === editando.id);
    if (idx >= 0) menus[idx] = { ...menus[idx], nombre, dias, objetivo, restricciones };
  } else {
    const nuevo = { id: "menu-" + Date.now(), nombre, dias, objetivo, restricciones };
    menus.push(nuevo);
    activo = nuevo.id;
    guardarActivo(activo);
  }

  guardarMenus(menus);
  editando = null;
  renderSelect();
  renderEditor();
  renderMenu();

  if (conflictos.length) {
    alert(
      "Menú guardado con avisos de restricción:\n\n" +
        conflictos.join("\n") +
        "\n\nLos platillos marcados contienen alimentos restringidos; puedes cambiarlos desde Editar."
    );
  }
});

$("#menu-select").addEventListener("change", (e) => {
  activo = e.target.value || null;
  guardarActivo(activo);
  const tieneActivo = !!activo;
  ["#btn-eliminar", "#btn-editar", "#btn-clonar"].forEach((selBtn) => {
    $(selBtn).disabled = !tieneActivo;
  });
  renderMenu();
});

// ---- Plan de cocinar (comparte localStorage con la sección Cocinar) ----
// recetario.cocinar -> [{ slug, raciones, aportes: { lun: 2, vie: 2 } }]
//   raciones = total de raciones en el plan (lo que consume la sección Cocinar)
//   aportes  = cuántas raciones aportó CADA día del menú (para el indicador
//              por día). Items viejos sin aportes se migran a {}.

function cargarCocinar() {
  try {
    const p = JSON.parse(localStorage.getItem("recetario.cocinar"));
    if (Array.isArray(p)) {
      return p.map((i) => ({ ...i, aportes: i.aportes || {} }));
    }
  } catch {
    // ignore
  }
  return [];
}

function guardarCocinar(items) {
  localStorage.setItem("recetario.cocinar", JSON.stringify(items));
}

// Actualiza badge total ("N en plan") e indicador por día tras un cambio.
// Un mismo platillo puede aparecer en varios días: se actualizan TODAS sus
// apariciones (querySelectorAll), no solo la primera.
function refrescarBadgeCocinar(slug) {
  const items = cargarCocinar();
  const item = items.find((i) => i.slug === slug);
  const total = item ? item.raciones : 0;

  document.querySelectorAll(`.btn-cocinar-remover[data-slug="${slug}"]`).forEach((remover) => {
    const li = remover.closest("li");
    if (!li) return;
    const dia = remover.dataset.dia;
    const aporte = (item && item.aportes && item.aportes[dia]) || 0;

    const cantidad = li.querySelector(".cocinar-cantidad");
    if (cantidad) {
      cantidad.hidden = !item;
      cantidad.textContent = item ? `${total} en plan` : "";
    }
    const indicador = li.querySelector(".cocinar-dia");
    if (indicador) {
      indicador.hidden = !(aporte > 0);
      indicador.textContent = aporte > 0 ? `✓ +${aporte} hoy` : "";
    }
    // Remover solo tiene sentido en el día que aportó raciones.
    remover.disabled = !(aporte > 0);
  });
}

// Delegación: botones Cocinar / Remover dentro del render del menú.
$("#render-contenido").addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-cocinar, .btn-cocinar-remover");
  if (!btn) return;
  const slug = btn.dataset.slug;
  const dia = btn.dataset.dia;
  const porciones = parseInt(btn.dataset.porciones, 10) || 1;
  const items = cargarCocinar();
  const idx = items.findIndex((i) => i.slug === slug);

  if (btn.classList.contains("btn-cocinar")) {
    // Sumar las porciones de la receta (default) al plan, anotando el día.
    if (idx >= 0) {
      const item = items[idx];
      item.aportes = item.aportes || {};
      item.aportes[dia] = (item.aportes[dia] || 0) + porciones;
      item.raciones += porciones;
    } else {
      items.push({ slug, raciones: porciones, aportes: { [dia]: porciones } });
    }
  } else {
    // Restar del día específico; si el día llega a 0 se limpia, y si el total
    // llega a 0 o menos, la receta se elimina del plan.
    if (idx < 0) return;
    const item = items[idx];
    item.aportes = item.aportes || {};
    const aporteDia = item.aportes[dia] || 0;
    if (aporteDia <= 0) return; // este día no aportó: nada que quitar
    item.aportes[dia] = aporteDia - porciones;
    if (item.aportes[dia] <= 0) delete item.aportes[dia];
    item.raciones -= porciones;
    if (item.raciones <= 0) items.splice(idx, 1);
  }

  guardarCocinar(items);
  refrescarBadgeCocinar(slug);
});

init();
