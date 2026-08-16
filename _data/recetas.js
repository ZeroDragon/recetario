// Global data: expone las recetas (slug, título, tipo, ingredientes, macros) como
// JSON para que el JS del menú/lista las use sin fetch.
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default () => {
  const recipesDir = path.join(__dirname, "..", "recipes");
  const recipes = [];

  if (fs.existsSync(recipesDir)) {
    for (const fname of fs.readdirSync(recipesDir)) {
      if (!fname.endsWith(".html")) continue;
      const raw = fs.readFileSync(path.join(recipesDir, fname), "utf8");
      const { data } = matter(raw);
      const slug = fname.replace(/\.html$/, "");
      // tipo puede ser string ("comida") o array (["comida", "cena"]): normalizar a array
      let tipo = data.tipo;
      if (!tipo) tipo = [];
      else if (typeof tipo === "string") tipo = tipo.split(",").map((s) => s.trim()).filter(Boolean);
      recipes.push({
        slug,
        title: data.title || slug,
        tipo,
        ingredientes: data.ingredientes || [],
        porciones_receta: data.porciones_receta || 1,
        macros_por_porcion: data.macros_por_porcion || null,
      });
    }
  }

  // Ordenar por título
  recipes.sort((a, b) => a.title.localeCompare(b.title, "es"));

  return { recetas: recipes };
};
