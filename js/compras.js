// Lista de compras: clic en todo el renglón alterna su checkbox + botón para
// desmarcar todos. Sin persistencia: al recargar la página todo vuelve a estar
// sin marcar.
(function () {
  // Clic en cualquier parte del renglón alterna el checkbox
  document.querySelectorAll(".task-list-item").forEach(function (li) {
    li.addEventListener("click", function (e) {
      // Si el clic fue directo sobre el checkbox, el navegador ya lo alternó
      if (e.target.matches('input[type="checkbox"]')) return;
      var cb = li.querySelector('input[type="checkbox"]');
      if (cb) cb.checked = !cb.checked;
    });
  });

  // Botón "Desmarcar todo"
  var resetBtn = document.getElementById("reset-lista");
  if (!resetBtn) return;
  resetBtn.addEventListener("click", function () {
    document
      .querySelectorAll('.contains-task-list input[type="checkbox"]')
      .forEach(function (cb) {
        cb.checked = false;
      });
  });
})();
