// Lista de compras: botón para desmarcar todos los checkboxes.
// Sin persistencia: al recargar la página todo vuelve a estar sin marcar.
(function () {
  const resetBtn = document.getElementById("reset-lista");
  if (!resetBtn) return;

  resetBtn.addEventListener("click", function () {
    document
      .querySelectorAll('.contains-task-list input[type="checkbox"]')
      .forEach(function (cb) {
        cb.checked = false;
      });
  });
})();
