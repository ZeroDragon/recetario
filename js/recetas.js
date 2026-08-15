// Filtros del índice de recetas: pills por tipo de comida.
// Sin estado persistente: el filtro vive en aria-pressed de cada pill.
(function () {
  const pills = Array.from(document.querySelectorAll(".filter-pill"));
  const items = Array.from(document.querySelectorAll(".recipe-item"));
  const countEl = document.getElementById("recipe-count");

  function actualizarFiltro() {
    const activa = pills.find((p) => p.getAttribute("aria-pressed") === "true");
    const filtro = activa ? activa.dataset.filtro : "todos";
    let visibles = 0;

    items.forEach((item) => {
      const tipos = (item.dataset.tipo || "").split(" ").filter(Boolean);
      const ok = filtro === "todos" || tipos.includes(filtro);
      item.hidden = !ok;
      if (ok) visibles++;
    });

    if (countEl) {
      const total = items.length;
      const palabra = total === 1 ? "receta" : "recetas";
      countEl.textContent =
        filtro === "todos"
          ? `${total} ${palabra}`
          : `${visibles} de ${total} ${palabra}`;
    }
  }

  pills.forEach((pill) => {
    pill.addEventListener("click", () => {
      pills.forEach((p) => p.setAttribute("aria-pressed", "false"));
      pill.setAttribute("aria-pressed", "true");
      actualizarFiltro();
    });
  });

  actualizarFiltro();
})();
