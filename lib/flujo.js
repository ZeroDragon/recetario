/**
 * Renderer del shortcode `flujo`: convierte la mini-sintaxis de receta en la
 * tabla de flujo de 4 columnas estilo "Cooking for Engineers".
 *
 * Diseño (ver AGENTS.md): las acciones (etapas) se definen UNA vez con un ID y
 * cada ingrediente declara por cuáles etapas pasa en orden temporal, separadas
 * por `→`. Se arma la cuadrícula, se fusionan celdas con rowspan/colspan y se
 * validan errores en build time (etapa no definida, línea inválida, ...).
 *
 * Sintaxis (dentro de {% flujo %} ... {% endflujo %}):
 *
 *   # Definición de etapa (puede ir antes o después de los ingredientes)
 *   [licuar] licuar
 *   [incorporar] incorporar el pollo a la salsa · cocinar 5–10 min más
 *
 *   # Ingrediente: cantidad | nombre | etapas (una o más, en orden temporal)
 *   400 g | jitomate | [licuar] → [incorporar]
 *   1–2   | chiles chipotles adobados | [licuar] → [incorporar]
 *   al-gusto | orégano + pimienta | [sazonar]
 *
 *   # También se acepta acción literal (sin ID):
 *   10 g | aceite de oliva | sofreír con cebolla · cocinar 10–15 min
 *
 *   # Encabezado de fase (colspan=4):
 *   -- PARA SERVIR --
 *
 *   # Comentarios con # y líneas en blanco como separadores visuales.
 *
 * El `·` separa verbos/pasos DENTRO de una etapa y se renderiza como <br />.
 * Las etapas que comparten columna y texto en filas consecutivas se fusionan
 * automáticamente con rowspan; los huecos se absorben con colspan.
 *
 * Sin JS en el cliente: la salida es el mismo HTML `<table>` de siempre.
 *
 * Modo escalable (`opts.escalable`): las cantidades numéricas se emiten con
 * data-* (`data-cant`, `data-cant-max`, `data-unidad`, `data-aprox`) para que
 * la sección Cocinar las escale en el cliente según las raciones. Las
 * cantidades no parseables (al-gusto, "1 scoop (30–32 g)", ...) no llevan
 * data-cant y el cliente las deja intactas.
 */
import { parseCantidadEscalable } from "./cantidades.js";

export function renderFlujo(raw, opts = {}) {
  const defs = new Map(); // id -> texto de la etapa
  const phases = []; // [{ header, filas: [{cant, nombre, acciones: [{texto, col}]}] }]
  let current = null;

  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;

    // Encabezado de fase: -- TEXTO --
    const ph = t.match(/^--\s*(.+?)\s*--$/);
    if (ph) {
      current = { header: ph[1].trim(), filas: [] };
      phases.push(current);
      continue;
    }

    // Definición de etapa: [id] texto
    const def = t.match(/^\[([A-Za-z0-9_]+)\]\s*(.+)$/);
    if (def) {
      const id = def[1];
      const texto = def[2].trim();
      if (!texto) throw new Error(`flujo: la etapa [${id}] no tiene texto`);
      if (defs.has(id) && defs.get(id) !== texto) {
        throw new Error(
          `flujo: la etapa [${id}] está definida dos veces con texto distinto: ` +
            `"${defs.get(id)}" vs "${texto}"`
        );
      }
      defs.set(id, texto);
      continue;
    }

    // Fila de ingrediente: `cantidad | nombre | etapas` o `nombre | etapas`
    const parts = t.split("|").map((s) => s.trim());
    let cant = null;
    let nombre;
    let etapasStr;
    if (parts.length === 3) {
      [cant, nombre, etapasStr] = parts;
    } else if (parts.length === 2) {
      [nombre, etapasStr] = parts;
    } else {
      throw new Error(
        `flujo: línea inválida: "${t}" (se espera "cantidad | nombre | etapas")`
      );
    }
    if (!nombre) throw new Error(`flujo: falta el nombre del ingrediente en: "${t}"`);
    if (!etapasStr) throw new Error(`flujo: "${nombre}" no tiene etapas`);

    const acciones = etapasStr.split("→").map((s) => s.trim()).filter(Boolean).map((ref) => {
      const m = ref.match(/^\[([A-Za-z0-9_]+)\]$/);
      if (m) {
        const id = m[1];
        if (!defs.has(id)) {
          throw new Error(`flujo: la etapa [${id}] no está definida (usada en "${nombre}")`);
        }
        return { texto: defs.get(id) };
      }
      return { texto: ref }; // acción literal
    });
    if (!acciones.length) {
      throw new Error(`flujo: "${nombre}" no tiene etapas válidas`);
    }

    if (!current) {
      current = { header: null, filas: [] };
      phases.push(current);
    }
    current.filas.push({ cant, nombre, acciones });
  }

  return phases.map((ph) => renderPhase(ph, opts)).join("\n");
}

// ---------------------------------------------------------------------------
// Layout: columnas por proceso (alineación vertical) + fusión rowspan/colspan
// ---------------------------------------------------------------------------

function renderPhase(ph, opts) {
  const filas = ph.filas;
  if (!filas.length) {
    // Fase de solo instrucción (p. ej. "DÍA 2 — Precalentar horno a 220 °C")
    return headerRow(ph.header);
  }

  // 1) Cada proceso (texto de etapa) se alinea a UNA columna fija en toda la
  //    fase. La primera vez que aparece se le asigna la siguiente columna
  //    libre; las filas posteriores que lo usen lo colocan en esa misma
  //    columna, de modo que los procesos coincidan verticalmente aunque un
  //    ingrediente entre en una etapa posterior (su celda de ingrediente se
  //    extiende con colspan para compensar).
  const colOf = new Map(); // texto de etapa -> columna
  for (const f of filas) {
    let prev = 1; // columna del ingrediente
    for (const acc of f.acciones) {
      let c = colOf.get(acc.texto);
      if (c === undefined) {
        c = Math.max(2, prev + 1);
        colOf.set(acc.texto, c);
      } else if (c <= prev) {
        // el proceso ya tenía columna pero queda a la izquierda de la etapa
        // anterior de esta fila -> desplazarlo una columna a la derecha
        c = prev + 1;
        colOf.set(acc.texto, c);
      }
      acc.col = c;
      prev = c;
    }
  }
  const maxCol = Math.max(2, ...filas.flatMap((f) => f.acciones.map((a) => a.col)));
  if (maxCol > 4) {
    throw new Error(
      `flujo: la fase "${ph.header || "(sin encabezado)"}" requiere ${maxCol} columnas (máximo 4)`
    );
  }

  // 2) Rejilla: fila -> columna -> texto
  const grid = filas.map((f) => {
    const m = new Map();
    for (const a of f.acciones) m.set(a.col, a.texto);
    return m;
  });

  // 3) Fusionar por columna: filas consecutivas con el mismo texto en la misma
  //    columna -> rowspan en la primera celda del run.
  const rowspan = filas.map(() => ({}));
  for (let col = 2; col <= maxCol; col++) {
    let i = 0;
    while (i < filas.length) {
      const texto = grid[i].get(col);
      if (texto === undefined) {
        i++;
        continue;
      }
      let j = i + 1;
      while (j < filas.length && grid[j].get(col) === texto) j++;
      if (j - i > 1) rowspan[i][col] = j - i;
      i = j;
    }
  }

  // 4) Render
  const out = [];
  if (ph.header) out.push(headerRow(ph.header));

  for (let i = 0; i < filas.length; i++) {
    const f = filas[i];

    // Rowspans activos de filas anteriores que cubren la fila actual.
    const covered = new Set();
    for (let r = 0; r < i; r++) {
      for (const [col, span] of Object.entries(rowspan[r])) {
        const c = Number(col);
        if (r + span - 1 >= i) {
          // El rowspan cubre desde su columna hasta el final (4).
          for (let cc = c; cc <= 4; cc++) covered.add(cc);
        }
      }
    }

    // Acciones visibles (no cubiertas por un rowspan anterior).
    const accionesVisibles = [];
    for (const acc of f.acciones) {
      if (covered.has(acc.col)) continue;
      accionesVisibles.push({
        col: acc.col,
        texto: acc.texto,
        rspan: rowspan[i][acc.col] || 1,
      });
    }
    const visCols = new Set(accionesVisibles.map((a) => a.col));

    // ---- Celda del ingrediente ----
    // Se extiende hasta la primera columna ocupada (por un rowspan anterior o
    // por una acción visible de esta fila), para que los procesos coincidan.
    let ingColspan = 1;
    for (let c = 2; c <= 4; c++) {
      if (covered.has(c) || visCols.has(c)) break;
      ingColspan++;
    }
    let cells = "";
    cells += ingColspan > 1 ? `<td colspan="${ingColspan}">` : "<td>";
    cells += celdaIngrediente(f, opts);
    cells += "</td>";

    // ---- Celdas de acción ----
    // Cada celda se extiende hasta la siguiente columna ocupada (otra acción
    // visible de esta fila o un rowspan anterior), o hasta la 4 si es la última.
    for (let k = 0; k < accionesVisibles.length; k++) {
      const acc = accionesVisibles[k];
      const nextVisible = accionesVisibles[k + 1]?.col;
      let nextCovered = null;
      for (let c = acc.col + 1; c <= 4; c++) {
        if (covered.has(c)) { nextCovered = c; break; }
      }
      const next = nextVisible ?? nextCovered ?? 5;
      const colspan = next - acc.col;
      const attrs =
        (acc.rspan > 1 ? ` rowspan="${acc.rspan}"` : "") +
        (colspan > 1 ? ` colspan="${colspan}"` : "");
      cells += `<td${attrs}>${esc(acc.texto).replace(/·/g, "<br />")}</td>`;
    }

    out.push(`    <tr>${cells}</tr>`);
  }

  return `<table>\n  <tbody>\n${out.join("\n")}\n  </tbody>\n</table>`;
}

// Celda de ingrediente (cantidad + nombre). En modo escalable, la cantidad
// numérica lleva data-* para que el cliente la escale según las raciones.
function celdaIngrediente(f, opts) {
  if (!f.cant) return esc(f.nombre);

  let cantidad = `<strong>${esc(f.cant)}</strong>`;
  if (opts.escalable) {
    const info = parseCantidadEscalable(f.cant);
    if (info) {
      let attrs = ` class="flujo-cant" data-cant="${info.min}"`;
      if (info.max !== null) attrs += ` data-cant-max="${info.max}"`;
      if (info.unidad) attrs += ` data-unidad="${esc(info.unidad)}"`;
      if (info.aprox) attrs += ` data-aprox="1"`;
      cantidad = `<strong${attrs}>${esc(f.cant)}</strong>`;
    }
  }
  return `${cantidad}<br />${esc(f.nombre)}`;
}

function headerRow(texto) {
  return `    <tr><td colspan="4" align="center"><strong>${esc(texto)}</strong></td></tr>`;
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
