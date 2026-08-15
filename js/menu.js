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
function generarMenu(kcalMin, kcalMax, regimenKey) {
  const regimen = REGIMENES[regimenKey] || REGIMENES.mantenimiento;
  const centro = (kcalMin + kcalMax) / 2;
  const historial = {}; // comida -> [slug más reciente, ...]
  const dias = {};

  DIAS.forEach((dia) => {
    const comidas = comidasDeDia(dia.key);
    let combos = [[]];
    comidas.forEach((c) => {
      const pool = recetasPorTipo(c.key).filter((r) => r.macros_por_porcion);
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
  let html = '<div class="menu-grid">';

  DIAS.forEach((dia) => {
    const slots = COMIDAS.filter((c) => menu.dias?.[dia.key]?.[c.key]);
    if (slots.length === 0) return; // día sin comidas no se renderiza

    html += `<div class="menu-dia"><h3>${dia.label}</h3><ul>`;
    slots.forEach((c) => {
      const slug = menu.dias[dia.key][c.key];
      const receta = recetaPorSlug(slug);
      const nombre = receta ? receta.title : slug;
      html += `<li><span class="comida-label">${c.label}:</span> <a href="/recetario/recipes/${slug}/">${nombre}</a></li>`;
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

// ---- Eventos ----
$("#btn-nuevo").addEventListener("click", () => {
  editando = { id: null, nombre: "", dias: {}, objetivo: {} };
  renderEditor();
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
  editando.dias = generarMenu(kcalMin, kcalMax, regimen);
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

  if (editando.id) {
    const idx = menus.findIndex((m) => m.id === editando.id);
    if (idx >= 0) menus[idx] = { ...menus[idx], nombre, dias, objetivo };
  } else {
    const nuevo = { id: "menu-" + Date.now(), nombre, dias, objetivo };
    menus.push(nuevo);
    activo = nuevo.id;
    guardarActivo(activo);
  }

  guardarMenus(menus);
  editando = null;
  renderSelect();
  renderEditor();
  renderMenu();
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

init();
