export default function (eleventyConfig) {
  // CSS estático se copia tal cual al output
  eleventyConfig.addPassthroughCopy("css");

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
