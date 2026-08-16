// Global data: pre-renderiza el flujo de cada receta en "modo escalable"
// (cantidades con data-*) para la sección Cocinar. El JS del cliente inserta
// este HTML y escala las cantidades según las raciones elegidas.
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { fileURLToPath } from "url";
import { renderFlujo } from "../lib/flujo.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default () => {
  const recipesDir = path.join(__dirname, "..", "recipes");
  const flujos = {};

  if (fs.existsSync(recipesDir)) {
    for (const fname of fs.readdirSync(recipesDir)) {
      if (!fname.endsWith(".html")) continue;
      const raw = fs.readFileSync(path.join(recipesDir, fname), "utf8");
      const { content } = matter(raw);
      const slug = fname.replace(/\.html$/, "");

      // Extraer el bloque {% flujo %} ... {% endflujo %} del cuerpo.
      const m = content.match(/\{%\s*flujo\s*%}([\s\S]*?)\{%\s*endflujo\s*%}/);
      if (m) {
        try {
          flujos[slug] = renderFlujo(m[1], { escalable: true });
        } catch (e) {
          // El shortcode ya valida en el build de la receta; si algo falla aquí
          // (receta con error), no romper la página Cocinar: se omite el flujo.
          console.warn(`flujos.js: error renderizando "${slug}": ${e.message}`);
        }
      }
    }
  }

  return { flujos };
};
