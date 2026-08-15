import markdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";

export default function (eleventyConfig) {
  // Markdown: activar task lists ([ ] / [x]) para la lista de compras
  eleventyConfig.setLibrary(
    "md",
    markdownIt({ html: true, linkify: true, typographer: true }).use(taskLists, { enabled: true })
  );

  // CSS estático se copia tal cual al output
  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("js");

  // Archivos de proyecto que no deben convertirse en páginas
  ["README.md", "package.json", "package-lock.json", ".gitignore",
   "eleventy.config.js", ".github"].forEach((p) => eleventyConfig.ignores.add(p));

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
