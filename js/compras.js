// Lista de compras: se genera automáticamente desde el menú activo (localStorage).
// El marcado se persiste SOLO para el menú activo (por si cierras la app a media
// compra). Al cambiar de menú o modificar el listado se descarta: no se acumula
// estado de menús anteriores en memoria.

// Recetas inyectadas desde 11ty (slug, title, tipo, ingredientes)
// El dump genera { recetas: [...] }
const RECETAS = (window.RECETAS && window.RECETAS.recetas) || [];

const STORAGE_MENUS = "recetario.menus";
const STORAGE_ACTIVO = "recetario.menuActivo";
const STORAGE_MARCADO = "recetario.comprasMarcado"; // { menuId, items: [...] } — solo el menú activo

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

// ---- Persistencia del marcado (solo menú activo, atado al listado) ----
// Guarda { menuId, items, lista } donde `lista` es la firma del listado de
// compras (array ordenado). Si el menú cambia o el listado se modifica, la
// firma no coincide y el marcado se descarta (sin garbage acumulado).
function firmaLista(formateados) {
  return formateados.slice().sort((a, b) => a.localeCompare(b, "es"));
}

function cargarMarcado(menuId, formateados) {
  if (!menuId) return new Set();
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_MARCADO)) || {};
    // Descartar si no es el menú activo o si el listado cambió
    const listaActual = firmaLista(formateados);
    const listaGuardada = Array.isArray(all.lista) ? all.lista : null;
    if (all.menuId !== menuId || !listaGuardada || listaGuardada.join("\u0000") !== listaActual.join("\u0000")) {
      limpiarMarcado();
      return new Set();
    }
    return new Set(Array.isArray(all.items) ? all.items : []);
  } catch {
    limpiarMarcado();
    return new Set();
  }
}

function guardarMarcado(menuId, marcados, formateados) {
  if (!menuId) return;
  localStorage.setItem(
    STORAGE_MARCADO,
    JSON.stringify({ menuId, items: Array.from(marcados), lista: firmaLista(formateados) })
  );
}

function limpiarMarcado() {
  localStorage.removeItem(STORAGE_MARCADO);
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

  // Formatear: "cantidad unidad nombre", "nombre al gusto" o "nombre"
  const formateados = [...agregados.values()].map((a) => {
    if (a.esAlGusto) return a.nombre + " al gusto";
    if (a.cantidad !== null) {
      // Limpiar decimales innecesarios (400.0 -> 400)
      const cant = Number.isInteger(a.cantidad) ? a.cantidad : parseFloat(a.cantidad.toFixed(1));
      return `${cant} ${a.unidad} ${a.nombre}`;
    }
    return a.nombre;
  });

  info.textContent = `Menú: ${menu.nombre} — ${formateados.length} ingredientes`;
  resetBtn.hidden = false;

  // Render como lista con checkboxes; restaurar el marcado persistido SOLO si
  // el menú activo y el listado son idénticos a cuando se guardó. Cualquier
  // cambio (menú distinto, recetas editadas, cantidades modificadas) descarta
  // el estado viejo para no dejar garbage.
  const formateadosOrdenados = firmaLista(formateados);
  const marcados = cargarMarcado(menu.id, formateadosOrdenados);

  let html = '<ul class="contains-task-list">';
  formateadosOrdenados.forEach((ing) => {
    const checked = marcados.has(ing) ? " checked" : "";
    html += `<li class="task-list-item"><input class="task-list-item-checkbox" type="checkbox"${checked}> ${ing}</li>`;
  });
  html += "</ul>";
  cont.innerHTML = html;

  // Guardar el estado al marcar/desmarcar (checkbox o clic en el renglón)
  const persistirMarcado = () => {
    const marcadosActuales = new Set(
      Array.from(document.querySelectorAll('.contains-task-list input[type="checkbox"]:checked'))
        .map((cb) => cb.closest(".task-list-item").textContent.trim())
    );
    guardarMarcado(menu.id, marcadosActuales, formateadosOrdenados);
  };

  // Reset: desmarcar todo y descartar el marcado guardado
  resetBtn.onclick = () => {
    document.querySelectorAll('.contains-task-list input[type="checkbox"]').forEach((cb) => {
      cb.checked = false;
    });
    limpiarMarcado();
  };

  // Clic en el renglón alterna el checkbox; el cambio dispara el guardado
  document.querySelectorAll(".task-list-item").forEach((li) => {
    const cb = li.querySelector('input[type="checkbox"]');
    if (!cb) return;
    cb.addEventListener("change", persistirMarcado);
    li.addEventListener("click", (e) => {
      if (e.target.matches('input[type="checkbox"]')) return;
      cb.checked = !cb.checked;
      persistirMarcado();
    });
  });
}

const DIAS_FOR = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"];

init();
