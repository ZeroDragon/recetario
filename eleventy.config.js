import markdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";
import { renderFlujo } from "./lib/flujo.js";

/**
 * Shortcode pareado `flujo`: convierte la mini-sintaxis de receta en la tabla
 * de flujo de 4 columnas estilo "Cooking for Engineers" que el sitio ya usa.
 *
 * Diseño (ver AGENTS.md): las acciones (etapas) se definen UNA vez con un ID y
 * cada ingrediente declara por cuáles etapas pasa en orden temporal, separadas
 * por `→`. El shortcode arma la cuadrícula, fusiona celdas con rowspan/colspan
 * y valida errores en build time (etapa no definida, línea inválida, ...).
 *
 * La implementación vive en lib/flujo.js (compartida con _data/flujos.js, que
 * pre-renderiza los flujos en modo escalable para la sección Cocinar).
 */
export default function (eleventyConfig) {
  // Shortcode pareado `flujo`: convierte la mini-sintaxis de receta en la tabla
  // de flujo de 4 columnas estilo "Cooking for Engineers".
  eleventyConfig.addPairedShortcode("flujo", (content) => {
    return renderFlujo(content);
  });

  // Markdown: activar task lists ([ ] / [x]) para la lista de compras
  eleventyConfig.setLibrary(
    "md",
    markdownIt({ html: true, linkify: true, typographer: true }).use(taskLists, { enabled: true })
  );

  // CSS/JS estáticos se copian tal cual al output
  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("js");

  // Archivos de proyecto que no deben convertirse en páginas
  ["README.md", "package.json", "package-lock.json", ".gitignore",
   "eleventy.config.js", ".github", "lib"].forEach((p) => eleventyConfig.ignores.add(p));

  return {
    dir: {
      input: ".",
      includes: "_includes",
      output: "_site"
    },
    // GitHub Pages sirve el repo bajo /recetario/
    pathPrefix: "/recetario/"
  };
}
