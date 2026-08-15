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

// Quita cantidad + unidad al inicio, igual que el typeahead de restricciones:
// "500 mL leche" -> "leche", "200–250 ml leche" -> "leche", "≈300 g queso" -> "queso",
// "1/2 taza avena" -> "avena", "3 cucharadas aceite" -> "aceite", "al-gusto sal" -> "sal".
// NO convierte unidades: solo normaliza el texto para agrupar y sumar cuando
// la unidad y el nombre coinciden (formato CANTIDAD UNIDAD NOMBRE).
const RE_CANTIDAD = /^(?:al-gusto|\d+(?:[.,]\d+)?(?:\s*[–\-~]\s*\d+(?:[.,]\d+)?)?(?:\s*\/\s*\d+)?|≈\s*\d+(?:[.,]\d+)?)\s*(?:g|kg|ml|mL|l|L|u|tazas?|cucharadas?|cucharaditas?|piezas?|latas?|rebanadas?|dientes?|sobres?|scoops?|bolsas?|cajas?|puñados?|pizcas?|ramas?|hojas?|pzas?)\s+/;

// Parsea "CANTIDAD UNIDAD NOMBRE" -> { cantidad, unidad, nombre } | null.
// Acepta cantidades numéricas simples y rangos ("200–250") tomando el primer
// número; las fracciones ("1/2") se tratan como texto (no parseable).
function parseIngrediente(ing) {
  const m = ing.match(/^([\d.,]+)\s+([A-Za-zÁÉÍÓÚáéíóúÑñ]+)\s+(.+)$/);
  if (m) {
    const cant = parseFloat(m[1].replace(",", "."));
    if (!Number.isNaN(cant)) {
      return { cantidad: cant, unidad: m[2], nombre: m[3].trim() };
    }
  }
  return null;
}

// Unidad normalizada para comparar (ml == mL == ML): minúsculas sin acentos.
function normUnidad(u) {
  return String(u || "").toLowerCase().replace(/[áä]/g, "a").replace(/[éë]/g, "e").replace(/[íï]/g, "i").replace(/[óö]/g, "o").replace(/[úü]/g, "u").trim();
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

  // Agregar ingredientes sumando cantidades por ingrediente (unidad + nombre
  // normalizado). No convierte unidades: solo suma cuando hacen match.
  const agregados = new Map(); // key -> { cantidad, unidad, nombre, esAlGusto }
  DIAS_FOR.forEach((dia) => {
    const slots = menu.dias?.[dia];
    if (!slots) return;
    Object.values(slots).forEach((slug) => {
      const receta = recetaPorSlug(slug);
      if (!receta) return;
      (receta.ingredientes || []).forEach((ing) => {
        // al-gusto: dedupe simple
        const mAlGusto = ing.match(/^al-gusto\s+(.+)$/);
        if (mAlGusto) {
          const nombre = mAlGusto[1].trim();
          agregados.set(`al-gusto ${nombre}`, { cantidad: null, unidad: "al-gusto", nombre, esAlGusto: true });
          return;
        }
        // cantidad unidad nombre (numérica simple o rango): sumar por unidad|nombre
        const p = parseIngrediente(ing);
        if (p) {
          const key = `${normUnidad(p.unidad)}|${p.nombre}`;
          const prev = agregados.get(key);
          if (prev) {
            prev.cantidad += p.cantidad;
          } else {
            agregados.set(key, { cantidad: p.cantidad, unidad: p.unidad, nombre: p.nombre, esAlGusto: false });
          }
          return;
        }
        // Formato no numérico simple (fracción "1/2", ≈, etc.): normalizar el
        // nombre (quitar cantidad/unidad) para agrupar con los numéricos.
        const nombreNorm = String(ing).toLowerCase().trim().replace(/\s+/g, " ").replace(RE_CANTIDAD, "");
        const sinCantidad = nombreNorm ? nombreNorm : ing;
        // Buscar si ya existe una entrada numérica con el mismo nombre (cualquier unidad)
        let match = null;
        for (const [, v] of agregados) {
          if (v.esAlGusto) continue;
          if (v.nombre.toLowerCase() === sinCantidad.toLowerCase()) { match = v; break; }
        }
        if (match) {
          // Misma unidad normalizada: sumar la cantidad si se puede parsear;
          // si no (fracción "1/2"), conservar la entrada existente y no duplicar.
          const p2 = parseIngrediente(ing);
          if (p2 && normUnidad(p2.unidad) === normUnidad(match.unidad)) {
            match.cantidad += p2.cantidad;
          } else if (p2) {
            // Unidad distinta: no convertir; línea separada para ajuste manual.
            agregados.set(ing, { cantidad: null, unidad: "", nombre: ing, esAlGusto: false });
          }
          // p2 == null (fracción/raro): ya hay una entrada del mismo nombre, no duplicar.
          return;
        }
        // Sin match numérico: dedupe por texto normalizado
        agregados.set(sinCantidad, { cantidad: null, unidad: "", nombre: sinCantidad, esAlGusto: false });
      });
    });
  });

  // Formatear: "cantidad unidad nombre" o "al-gusto nombre"
  const formateados = [...agregados.values()].map((a) => {
    if (a.esAlGusto) return "al-gusto " + a.nombre;
    if (a.cantidad !== null) {
      // Limpiar decimales innecesarios (400.0 -> 400)
      const cant = Number.isInteger(a.cantidad) ? a.cantidad : parseFloat(a.cantidad.toFixed(1));
      return `${cant} ${a.unidad} ${a.nombre}`;
    }
    return a.nombre;
  });

  info.textContent = `Menú: ${menu.nombre} — ${formateados.length} ingredientes`;
  resetBtn.hidden = false;

  // Render como lista con checkboxes
  let html = '<ul class="contains-task-list">';
  formateados.sort((a, b) => a.localeCompare(b, "es")).forEach((ing) => {
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
