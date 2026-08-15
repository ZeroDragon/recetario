// Lista de compras: se genera automáticamente desde el menú activo (localStorage).
// Sin persistencia de marcado: al recargar todo vuelve a estar sin marcar.

// Recetas inyectadas desde 11ty (slug, title, tipo, ingredientes)
// El dump genera { recetas: [...] }
const RECETAS = (window.RECETAS && window.RECETAS.recetas) || [];

const STORAGE_MENUS = "recetario.menus";
const STORAGE_ACTIVO = "recetario.menuActivo";

function cargarMenus() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_MENUS)) || [];
  } catch {
    return [];
  }
}

function cargarActivo() {
  return localStorage.getItem(STORAGE_ACTIVO) || null;
}

function recetaPorSlug(slug) {
  return RECETAS.find((r) => r.slug === slug) || null;
}

function init() {
  const cont = document.getElementById("compras-contenido");
  const info = document.getElementById("compras-info");
  const resetBtn = document.getElementById("reset-lista");

  const menus = cargarMenus();
  const activo = cargarActivo();
  const menu = menus.find((m) => m.id === activo);

  if (!menu) {
    info.textContent = "No hay un menú seleccionado. Ve a la sección Menú y elige o crea uno.";
    cont.innerHTML = "";
    resetBtn.hidden = true;
    return;
  }

  // Recolectar ingredientes únicos de todas las recetas del menú
  const ingredientes = new Set();
  DIAS_FOR.forEach((dia) => {
    const slots = menu.dias?.[dia];
    if (!slots) return;
    Object.values(slots).forEach((slug) => {
      const receta = recetaPorSlug(slug);
      if (receta) {
        (receta.ingredientes || []).forEach((ing) => ingredientes.add(ing));
      }
    });
  });

  info.textContent = `Menú: ${menu.nombre} — ${ingredientes.size} ingredientes`;
  resetBtn.hidden = false;

  // Render como lista con checkboxes
  let html = '<ul class="contains-task-list">';
  [...ingredientes].sort((a, b) => a.localeCompare(b, "es")).forEach((ing) => {
    html += `<li class="task-list-item"><input class="task-list-item-checkbox" type="checkbox"> ${ing}</li>`;
  });
  html += "</ul>";
  cont.innerHTML = html;

  // Reset: desmarcar todo
  resetBtn.onclick = () => {
    document.querySelectorAll('.contains-task-list input[type="checkbox"]').forEach((cb) => {
      cb.checked = false;
    });
  };

  // Clic en el renglón alterna el checkbox
  document.querySelectorAll(".task-list-item").forEach((li) => {
    li.addEventListener("click", (e) => {
      if (e.target.matches('input[type="checkbox"]')) return;
      const cb = li.querySelector('input[type="checkbox"]');
      if (cb) cb.checked = !cb.checked;
    });
  });
}

const DIAS_FOR = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"];

init();
