// Global data: expone las recetas (slug, título, tipo, ingredientes) como
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
      recipes.push({
        slug,
        title: data.title || slug,
        tipo: data.tipo || "",
        ingredientes: data.ingredientes || [],
      });
    }
  }

  // Ordenar por título
  recipes.sort((a, b) => a.title.localeCompare(b.title, "es"));

  return { recetas: recipes };
};
