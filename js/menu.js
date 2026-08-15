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
  return RECETAS.filter((r) => r.tipo === tipo);
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

    tbody.appendChild(tr);
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
    html += "</ul></div>";
  });

  html += "</div>";
  contenido.innerHTML = html;
}

// ---- Eventos ----
$("#btn-nuevo").addEventListener("click", () => {
  editando = { id: null, nombre: "", dias: {} };
  renderEditor();
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

  if (editando.id) {
    const idx = menus.findIndex((m) => m.id === editando.id);
    if (idx >= 0) menus[idx] = { ...menus[idx], nombre, dias };
  } else {
    const nuevo = { id: "menu-" + Date.now(), nombre, dias };
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
