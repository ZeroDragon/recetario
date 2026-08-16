// Test jsdom de la sección Cocinar: carga _site/cocinar/index.html, evalúa el
// JS y verifica typeahead, agregar/quitar recetas, escalado y persistencia.
import { JSDOM } from "jsdom";
import fs from "fs";

const html = fs.readFileSync("_site/cocinar/index.html", "utf8");
const dom = new JSDOM(html, {
  runScripts: "outside-only",
  url: "http://localhost:8080/recetario/cocinar/",
  pretendToBeVisual: true,
});

const { window } = dom;
const doc = window.document;

// Cargar los scripts inline de la página + cocinar.js
const scripts = [...doc.querySelectorAll("script")];
for (const s of scripts) {
  if (s.src) continue;
  window.eval(s.textContent);
}
const cocinarJs = fs.readFileSync("js/cocinar.js", "utf8");
window.eval(cocinarJs);

const assert = (cond, msg) => {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok:", msg);
  }
};

const input = doc.getElementById("receta-input");
const menu = doc.getElementById("receta-sugerencias");

function escribir(texto) {
  input.value = texto;
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
}

function seleccionarItemPorTexto(fragmento) {
  const items = [...menu.querySelectorAll(".typeahead-item")];
  const item = items.find((b) => b.textContent.includes(fragmento));
  if (!item) throw new Error(`sugerencia "${fragmento}" no encontrada`);
  item.dispatchEvent(new window.MouseEvent("mousedown", { bubbles: true }));
}

// 1. Estado inicial vacío
assert(doc.getElementById("plan-vacio").hidden === false, "plan vacío visible al inicio");
assert(doc.getElementById("btn-vaciar").disabled === true, "botón vaciar deshabilitado con plan vacío");
assert(doc.querySelectorAll(".plan-item").length === 0, "sin tarjetas al inicio");

// 2. Typeahead: escribir "pollo" muestra sugerencias (orden alfabético)
escribir("pollo");
assert(menu.hidden === false, "sugerencias visibles con 'pollo'");
const textos = [...menu.querySelectorAll(".typeahead-item")].map((b) => b.textContent);
assert(textos.length >= 2, `varias sugerencias (${textos.length})`);
assert(textos.some((t) => t.includes("Pollo al curry")), "Pollo al curry entre sugerencias");

// 3. Sin coincidencias
escribir("zzzz");
assert(menu.querySelector(".typeahead-vacio") !== null, "mensaje 'Sin coincidencias'");
assert(menu.hidden === false, "menú visible con vacío");

// 4. Seleccionar sugerencia → agrega la receta con raciones default 2
escribir("pollo");
seleccionarItemPorTexto("Pollo al curry");
assert(doc.querySelectorAll(".plan-item").length === 1, "1 tarjeta tras seleccionar sugerencia");
assert(input.value === "", "input se limpia tras agregar");
assert(menu.hidden === true, "menú se oculta tras agregar");
const inputR = doc.querySelector(".plan-raciones input");
assert(inputR.value === "2", `raciones default = porciones_receta (2), got ${inputR.value}`);
const titulo = doc.querySelector(".plan-item-title").textContent;
assert(titulo.includes("Pollo al curry"), `título correcto (got: ${titulo})`);

// 5. Cantidades base (factor 1): 360 g pechuga, 200 mL leche
const cantsBase = [...doc.querySelectorAll(".plan-flujo .flujo-cant")].map((el) => el.textContent);
assert(cantsBase.includes("360 g"), "cantidad base 360 g presente");
assert(cantsBase.includes("200 mL"), "cantidad base 200 mL presente");
assert(!doc.querySelector(".plan-flujo .flujo-cant[data-cant='al-gusto']"), "al-gusto sin data-cant");
assert(doc.querySelector(".plan-flujo").textContent.includes("al-gusto"), "al-gusto se muestra intacto");

// 6. Cambiar raciones a 4 → factor 2 → 720 g, 400 mL
inputR.value = "4";
inputR.dispatchEvent(new window.Event("input", { bubbles: true }));
const cants4 = [...doc.querySelectorAll(".plan-flujo .flujo-cant")].map((el) => el.textContent);
assert(cants4.includes("720 g"), `4 raciones → 720 g (got ${cants4.find((c) => c.includes("g") && !c.includes("al"))})`);
assert(cants4.includes("400 mL"), "4 raciones → 400 mL");
assert(cants4.includes("30 g"), "4 raciones → 30 g (harina, 15×2)");
assert(doc.querySelector(".plan-flujo").textContent.includes("al-gusto"), "al-gusto intacto tras escalar");

// 7. Persistencia
const saved = JSON.parse(window.localStorage.getItem("recetario.cocinar"));
assert(saved.length === 1 && saved[0].slug === "pollo-curry-arroz" && saved[0].raciones === 4,
  "localStorage guarda {slug, raciones} actualizado");

// 8. La receta ya agregada NO aparece en sugerencias
escribir("pollo");
const slugsSugeridos = [...menu.querySelectorAll(".typeahead-item")].map((b) => b.textContent);
assert(!slugsSugeridos.some((t) => t.includes("Pollo al curry")), "receta ya agregada excluida de sugerencias");

// 9. Agregar por botón con match exacto de texto ("huevos a la mexicana")
escribir("huevos a la mexicana");
doc.getElementById("btn-agregar").click();
assert(doc.querySelectorAll(".plan-item").length === 2, "2 tarjetas tras agregar por botón");
assert(menu.hidden === true, "menú oculto tras agregar por botón");
const resumen = doc.getElementById("plan-resumen");
assert(resumen.textContent.includes("2 recetas") && resumen.textContent.includes("6 raciones"),
  `resumen "2 recetas · 6 raciones" (got: ${resumen.textContent})`);

// 10. Rango 200–240 g con raciones 4 (factor 2) → 400–480 g
const inputs = doc.querySelectorAll(".plan-raciones input");
inputs[1].value = "4";
inputs[1].dispatchEvent(new window.Event("input", { bubbles: true }));
const cants2 = [...doc.querySelectorAll(".plan-item")[1].querySelectorAll(".flujo-cant")].map((el) => el.textContent);
const rango = cants2.find((c) => c.includes("–"));
assert(rango === "400–480 g", `rango escalado 200–240 g → 400–480 g (got ${rango})`);

// 11. (Layout vertical verificado en css/style.css: .plan-lista flex column —
//     jsdom no aplica hojas externas, se omite la aserción de estilo.)

// 12. Quitar receta
doc.querySelector(".plan-quitar").click();
assert(doc.querySelectorAll(".plan-item").length === 1, "quitar elimina la tarjeta");
assert(window.localStorage.getItem("recetario.cocinar").includes("huevos-a-la-mexicana"), "localStorage refleja la quita");

// 13. Vaciar plan
doc.getElementById("btn-vaciar").click();
assert(doc.querySelectorAll(".plan-item").length === 0, "vaciar deja el plan en 0");
assert(doc.getElementById("plan-vacio").hidden === false, "mensaje vacío de nuevo visible");
assert(JSON.parse(window.localStorage.getItem("recetario.cocinar")).length === 0, "localStorage vaciado");

console.log("\nDONE");
