# Recetario

Recetario estático personal: recetas en **HTML crudo** + menú semanal y lista de compras en **Markdown**, compilado con [Eleventy](https://www.11ty.dev/) y desplegado en GitHub Pages. Sin frameworks de JS — el resultado es **HTML + CSS puro**.

## Estructura

```
recetario/
├── recipes/                 # recetas en HTML crudo (una por archivo)
│   └── nombre.html          # front matter + contenido HTML
├── _includes/
│   ├── base.njk             # shell de la página (header, nav, footer)
│   └── receta.njk           # layout de receta
├── css/style.css            # tema oscuro (basado en Monospace IDX Dark)
├── menu.md                  # menú semanal (Markdown)
├── compras.md               # lista de compras (Markdown, checkboxes)
├── eleventy.config.js       # config de 11ty (pathPrefix aquí)
├── .github/workflows/pages.yml  # build + deploy a GitHub Pages
└── _site/                   # build generado (no se commitea)
```

## Clonar y usar en tu cuenta

**Requisitos:** Node.js 20+, git y una cuenta de GitHub.

### 1. Obtén el código

Opción A — fork (mantiene vínculo con el repo original):

```bash
# Fork desde la UI de GitHub, luego:
git clone git@github.com:<TU_USUARIO>/recetario.git
cd recetario
```

Opción B — clonar directo:

```bash
git clone git@github.com:ZeroDragon/recetario.git
cd recetario
```

### 2. Instala y prueba local

```bash
npm install
npm run serve     # dev server con auto-reload en http://localhost:8080/recetario/
npm run build     # build de producción → genera _site/
```

### 3. Despliega en tu GitHub Pages

1. Sube el repo a tu cuenta (fork o repo nuevo).
2. En GitHub: **Settings → Pages → Source: *GitHub Actions***.
   > ⚠️ No uses "Deploy from a branch": el sitio se publica desde el workflow, no desde una rama.
   > Si ves el sitio con tema claro (Jekyll), es que Pages sigue en "Deploy from a branch".
3. Ajusta `pathPrefix` en `eleventy.config.js` según la URL final:
   - Repo `TU_USUARIO/recetario` → `pathPrefix: "/recetario/"` (default)
   - Repo con otro nombre → `pathPrefix: "/<nombre-del-repo>/"`
   - User site `TU_USUARIO.github.io` → `pathPrefix: "/"`
4. Actualiza el link del ribbon "Fork me on GitHub" en `_includes/base.njk` con la URL de **tu** repo.
5. Push a `main`: el workflow compila con 11ty y publica automáticamente.

El sitio queda en `https://TU_USUARIO.github.io/<pathPrefix>/`.

## Agregar recetas

Cada receta es un archivo HTML en `recipes/`:

```html
---
layout: receta.njk
title: Nombre de la receta
tags: receta
---
<h1>Nombre de la receta</h1>
<p>Contenido en HTML crudo: h1, p, ul, ol, img, table…</p>
```

- El front matter (entre `---`) es YAML: `title` es obligatorio (se usa en el índice).
- El contenido es HTML puro — no se procesa Markdown.
- El build agrega la receta al índice automáticamente.

## Editar el menú y la lista de compras

**`menu.md`** — tablas por día:

```markdown
## Lunes

| Comida | Receta |
| --- | --- |
| Desayuno | [Avena]({{ '/recipes/avena-con-yogurt/' | url }}) |
| Comida | [Tinga de pollo]({{ '/recipes/tinga-de-pollo/' | url }}) |
```

**`compras.md`** — checkboxes agrupados por categoría:

```markdown
## Proteínas

- [ ] Pechuga de pollo (1 kg)
- [x] Huevos (1 docena)   <!-- marcado = tachado en el sitio -->
```

## Notas

- Los links internos usan el filtro `| url` de Nunjucks para respetar el `pathPrefix` — úsalo siempre en `menu.md`/`compras.md`.
- El tema oscuro está basado en [Monospace IDX Dark](https://github.com/amnweb/monospace-idx-theme); la paleta vive en las variables `:root` de `css/style.css`.
