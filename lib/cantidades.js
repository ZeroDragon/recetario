/**
 * Parser de cantidades del flujo para la sección Cocinar.
 *
 * Decide si una cantidad (string) es escalable numéricamente y, si lo es,
 * devuelve su estructura: { min, max|null, unidad, aprox }.
 *
 * Ejemplos escalables:
 *   "400 g"        -> { min: 400,  max: null, unidad: "g", aprox: false }
 *   "1–2"          -> { min: 1,    max: 2,    unidad: "",  aprox: false }
 *   "350–400 g"    -> { min: 350,  max: 400,  unidad: "g", aprox: false }
 *   "≈300 g"       -> { min: 300,  max: null, unidad: "g", aprox: true }
 *   "2 dientes"    -> { min: 2,    max: null, unidad: "dientes", aprox: false }
 *   "0.5"          -> { min: 0.5,  max: null, unidad: "", aprox: false }
 *
 * NO escalables (devuelven null, el cliente las deja intactas):
 *   "al-gusto", "al gusto", "1 scoop (30–32 g)" (unidad con dígitos),
 *   "arroz crispy" (sin número al inicio).
 */
export function parseCantidadEscalable(s) {
  const t = String(s || "").trim();
  if (!t) return null;
  if (/^al[\s-]?gusto/i.test(t)) return null;

  let aprox = false;
  let body = t;
  if (body.startsWith("≈")) {
    aprox = true;
    body = body.slice(1).trim();
  }

  // Número [– número] [unidad]
  const m = body.match(/^(\d+(?:\.\d+)?)\s*(?:[–—\-]\s*(\d+(?:\.\d+)?))?\s*(.*)$/);
  if (!m) return null;

  const unidad = m[3].trim();
  // Una unidad con dígitos o paréntesis (p. ej. "scoop (30–32 g)") no se
  // puede escalar de forma segura: dejar la cantidad intacta.
  if (/[\d(]/.test(unidad)) return null;

  return {
    min: parseFloat(m[1]),
    max: m[2] !== undefined ? parseFloat(m[2]) : null,
    unidad,
    aprox,
  };
}
