// Test jsdom de los botones Cocinar/Remover en el render del menú:
// carga _site/menu/index.html, evalúa menu.js y verifica que suma/resta
// porciones en recetario.cocinar (el mismo storage que usa la sección Cocinar).
import { JSDOM } from "jsdom";
import fs from "fs";

const html = fs.readFileSync("_site/menu/index.html", "utf8");
const dom = new JSDOM(html, {
  runScripts: "outside-only",
  url: "http://localhost:8080/recetario/menu/",
  pretendToBeVisual: true,
});

const { window } = dom;
const doc = window.document;

// Scripts inline de la página + menu.js
const scripts = [...doc.querySelectorAll("script")];
for (const s of scripts) {
  if (s.src) continue;
  window.eval(s.textContent);
}
const menuJs = fs.readFileSync("js/menu.js", "utf8");
window.eval(menuJs);

const assert = (cond, msg) => {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok:", msg);
  }
};

const leerPlan = () => JSON.parse(window.localStorage.getItem("recetario.cocinar")) || [];

// 1. El menú inicial se siembra y se renderiza (render-contenido poblado)
assert(doc.querySelectorAll(".menu-dia").length > 0, "menú semanal renderizado");
const primerBtn = doc.querySelector(".btn-cocinar");
assert(primerBtn !== null, "botones Cocinar presentes en cada platillo");
assert(doc.querySelectorAll(".btn-cocinar").length >= 20, `botones en todos los platillos (${doc.querySelectorAll(".btn-cocinar").length})`);

// 2. Plan vacío → Remover deshabilitado, badge oculto
assert(doc.querySelector(".btn-cocinar-remover").disabled === true, "Remover deshabilitado sin nada en plan");
assert(doc.querySelector(".cocinar-cantidad").hidden === true, "badge oculto sin nada en plan");

// 3. Click en Cocinar (lunes desayuno: huevos-a-la-mexicana, porciones 2)
const btnLunDesayuno = doc.querySelector(".btn-cocinar");
const slugLunDesayuno = btnLunDesayuno.dataset.slug;
assert(slugLunDesayuno === "huevos-a-la-mexicana", `slug esperado en lunes desayuno (got ${slugLunDesayuno})`);
btnLunDesayuno.click();
let plan = leerPlan();
assert(plan.length === 1 && plan[0].slug === slugLunDesayuno && plan[0].raciones === 2,
  `click agrega {slug, 2} (got ${JSON.stringify(plan)})`);

// 4. Badge y Remover se actualizan sin re-render
assert(doc.querySelector(`.cocinar-cantidad[data-slug="${slugLunDesayuno}"]`).textContent === "2 en plan",
  "badge '2 en plan'");
assert(doc.querySelector(`.btn-cocinar-remover[data-slug="${slugLunDesayuno}"]`).disabled === false,
  "Remover habilitado tras agregar");

// 5. Segundo click suma porciones (huevos aparece lun/mie/vie/dom: 2+2=4)
btnLunDesayuno.click();
plan = leerPlan();
assert(plan[0].raciones === 4, `segundo click suma a 4 (got ${plan[0].raciones})`);

// 6. Click en otra receta (miercoles desayuno también es huevos; usar jueves desayuno: avena-con-yogurt)
const btnJueDesayuno = [...doc.querySelectorAll(".btn-cocinar")].find(
  (b) => b.dataset.slug === "avena-con-yogurt"
);
btnJueDesayuno.click();
plan = leerPlan();
assert(plan.length === 2, `2 recetas en plan (got ${plan.length})`);

// 7. Remover resta porciones; al llegar a 0 elimina la receta
const btnRemoverJue = doc.querySelector(`.btn-cocinar-remover[data-slug="avena-con-yogurt"]`);
btnRemoverJue.click();
plan = leerPlan();
assert(plan.length === 1 && !plan.some((i) => i.slug === "avena-con-yogurt"),
  "remover elimina la receta al llegar a 0");
assert(doc.querySelector(`.cocinar-cantidad[data-slug="avena-con-yogurt"]`).hidden === true,
  "badge vuelve a ocultarse");

// 8. Remover con 4 raciones → 2 (no elimina aún)
const btnRemoverHuevos = doc.querySelector(`.btn-cocinar-remover[data-slug="${slugLunDesayuno}"]`);
btnRemoverHuevos.click();
plan = leerPlan();
assert(plan[0].raciones === 2, `remover resta a 2 (got ${plan[0].raciones})`);

// 9. Persistencia: la sección Cocinar leería el mismo storage
//    (verificar que el formato coincide con el que usa js/cocinar.js)
const cocinarHtml = fs.readFileSync("_site/cocinar/index.html", "utf8");
const domCocinar = new JSDOM(cocinarHtml, {
  runScripts: "outside-only",
  url: "http://localhost:8080/recetario/cocinar/",
  pretendToBeVisual: true,
});
// Compartir el mismo localStorage no es trivial entre JSDOMs; en su lugar
// verificamos que el storage key es idéntico en ambos scripts.
const keyEnMenu = menuJs.includes('"recetario.cocinar"');
const cocinarJs = fs.readFileSync("js/cocinar.js", "utf8");
const keyEnCocinar = cocinarJs.includes('"recetario.cocinar"');
assert(keyEnMenu && keyEnCocinar, "ambos JS usan la misma key recetario.cocinar");

// 10. Vaciar desde el plan limpio (test de higiene)
window.localStorage.setItem("recetario.cocinar", "[]");
assert(leerPlan().length === 0, "plan vaciado");

// 11. Platillo repetido en varios días: huevos-a-la-mexicana aparece
//     en lun/mie/vie/dom. Click en la aparición de miércoles debe:
//     - badge total "N en plan" en TODAS las apariciones
//     - indicador por día "✓ +2 hoy" SOLO en miércoles
//     - Remover habilitado SOLO en miércoles (el día que aportó)
const todasHuevos = [...doc.querySelectorAll(".btn-cocinar")].filter(
  (b) => b.dataset.slug === "huevos-a-la-mexicana"
);
assert(todasHuevos.length === 4, `huevos-a-la-mexicana aparece 4 veces (got ${todasHuevos.length})`);
const btnMie = todasHuevos[1]; // segunda aparición = miércoles
btnMie.click();
plan = leerPlan();
assert(plan.length === 1 && plan[0].raciones === 2 && plan[0].aportes.mie === 2,
  `click en miércoles anota aporte (got ${JSON.stringify(plan)})`);

const badgesHuevos = [...doc.querySelectorAll(`.cocinar-cantidad[data-slug="huevos-a-la-mexicana"]`)];
assert(badgesHuevos.length === 4, `4 badges para el platillo repetido (got ${badgesHuevos.length})`);
assert(badgesHuevos.every((b) => !b.hidden && b.textContent === "2 en plan"),
  "TODAS las apariciones muestran '2 en plan'");

const indicadoresHuevos = [...doc.querySelectorAll(`.cocinar-dia[data-slug="huevos-a-la-mexicana"]`)];
assert(indicadoresHuevos.length === 4, `4 indicadores por día (got ${indicadoresHuevos.length})`);
const visibles = indicadoresHuevos.filter((i) => !i.hidden);
assert(visibles.length === 1 && visibles[0].dataset.dia === "mie" && visibles[0].textContent === "✓ +2 hoy",
  `indicador visible solo en miércoles (got ${visibles.map((v) => v.dataset.dia + ":" + v.textContent)})`);

const removersHuevos = [...doc.querySelectorAll(`.btn-cocinar-remover[data-slug="huevos-a-la-mexicana"]`)];
assert(removersHuevos.filter((r) => !r.disabled).length === 1 &&
       !removersHuevos[1].disabled && removersHuevos[0].disabled,
  "Remover habilitado SOLO en el día que aportó (miércoles)");

// 12. Remover desde el día que NO aportó (domingo) no hace nada; remover
//     desde miércoles (el que aportó) elimina del plan y actualiza todo.
const btnRemoverDom = removersHuevos[3];
assert(btnRemoverDom.disabled === true, "Remover de domingo deshabilitado (no aportó)");
btnRemoverDom.click(); // no debería tener efecto
plan = leerPlan();
assert(plan.length === 1, "click en Remover de día sin aporte no cambia el plan");

const btnRemoverMie = removersHuevos[1];
btnRemoverMie.click();
plan = leerPlan();
assert(plan.length === 0, "remover desde miércoles elimina la receta del plan");
assert(badgesHuevos.every((b) => b.hidden), "badges ocultos en todas las apariciones tras remover");
assert(indicadoresHuevos.every((i) => i.hidden), "indicadores ocultos en todas las apariciones tras remover");
assert(removersHuevos.every((r) => r.disabled), "Remover deshabilitado en todas las apariciones tras remover");

// 13. Sumar desde dos días distintos y restar desde uno de ellos:
//     lunes +2, viernes +2 → total 4; indicadores en lun y vie.
todasHuevos[0].click(); // lunes: +2
todasHuevos[2].click(); // viernes: +2 → total 4
plan = leerPlan();
assert(plan[0].raciones === 4 && plan[0].aportes.lun === 2 && plan[0].aportes.vie === 2,
  `sumar desde dos días distintos → 4 con aportes por día (got ${JSON.stringify(plan[0])})`);
assert(indicadoresHuevos.filter((i) => !i.hidden).length === 2,
  "indicadores visibles en lunes y viernes");
assert(indicadoresHuevos[0].textContent === "✓ +2 hoy" && indicadoresHuevos[2].textContent === "✓ +2 hoy",
  "ambos indicadores muestran +2");
removersHuevos[2].click(); // viernes: -2 → total 2
plan = leerPlan();
assert(plan[0].raciones === 2 && plan[0].aportes.vie === undefined && plan[0].aportes.lun === 2,
  `restar desde viernes deja solo el aporte de lunes (got ${JSON.stringify(plan[0])})`);
assert(indicadoresHuevos[2].hidden === true && indicadoresHuevos[0].hidden === false,
  "indicador de viernes se oculta, el de lunes permanece");

// 14. Migración: items viejos sin `aportes` se cargan con {} (sin romper).
window.localStorage.setItem("recetario.cocinar", JSON.stringify([{ slug: "tinga-de-pollo", raciones: 2 }]));
const tinga = doc.querySelector(`.btn-cocinar[data-slug="tinga-de-pollo"]`);
assert(tinga !== null, "tinga-de-pollo en el menú");
tinga.click();
plan = leerPlan();
assert(plan[0].raciones === 4 && plan[0].aportes && Object.keys(plan[0].aportes).length === 1,
  `item migrado conserva total y anota aporte nuevo (got ${JSON.stringify(plan[0])})`);

console.log("\nDONE");
