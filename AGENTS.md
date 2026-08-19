# Guía para crear recetas

Estas instrucciones aplican al crear o modificar archivos en `recipes/`.

## Antes de escribir

- Revisa al menos dos recetas existentes de complejidad similar. Usa como referencias:
  - preparación simple: `recipes/licuado-chocolate-cacahuate.html`;
  - preparación con varias etapas: `recipes/tinga-de-pollo.html`;
  - preparación con encabezados o varios días: `recipes/ensalada-arroz-crispy.html`.
- Crea un archivo por receta. El nombre debe ser un slug en español, en minúsculas, sin acentos y separado con guiones: `nombre-de-receta.html`.
- No agregues `layout` ni `tags` al front matter. `recipes/recipes.11tydata.js` ya aplica `layout: receta.njk` y `tags: receta` a todo el directorio.
- No agregues un `<h1>` al cuerpo: el layout lo genera a partir de `title`.

## Economía

- Las recetas nuevas deben ser baratas y pensadas para un presupuesto cotidiano en México.
- Prioriza ingredientes económicos, rendidores y fáciles de encontrar: huevo, avena, arroz, frijoles, lentejas, tortillas, verduras de temporada, pollo y cortes magros de bajo costo.
- Reutiliza ingredientes entre varias recetas para reducir desperdicio y evitar una lista de compras con demasiados productos distintos.
- Prefiere productos de temporada, presentaciones a granel y alimentos básicos sobre ingredientes importados, especializados o de marca.
- Limita ingredientes costosos como salmón, camarón, nueces, frutos rojos, cortes premium, suplementos y quesos caros. Úsalos sólo si el usuario los solicita o si incluyes una alternativa económica equivalente.
- Cuando dos ingredientes cumplan la misma función nutricional y culinaria, elige el más barato. Por ejemplo, prefiere pollo, huevo, atún, sardina, frijoles o lentejas como fuentes habituales de proteína.
- Diseña las cantidades para aprovechar envases y unidades completas cuando sea razonable, y explica cómo conservar o reutilizar sobrantes si los hubiera.
- No abarates una receta reduciendo de forma importante la porción, la proteína, la fibra o la variedad de verduras. El costo debe optimizarse manteniendo una comida suficiente y nutricionalmente coherente.
- Si el precio depende mucho de la región o la temporada, ofrece en la propia receta una sustitución económica breve y compatible con los macros.

## Front matter obligatorio

Conserva este orden y estos nombres de campos:

```yaml
---
title: Nombre legible de la receta
tipo: comida
ingredientes:
  - '400 g ingrediente medible'
  - '2 u ingrediente contable'
  - '20 mL ingrediente líquido'
  - 'al-gusto condimento'
porciones_receta: 2
macros_por_porcion:
  calorias_kcal: 625
  proteina_g: 45
  carbohidratos_g: 60
  grasas_g: 20
  fibra_g: 10
---
```

- `title`: usa español natural, acentos y mayúscula inicial.
- `tipo`: usa `desayuno`, `postentreno`, `comida` o `cena`. Si corresponde a más de uno, usa un array YAML, por ejemplo `tipo: [comida, cena]`.
- `ingredientes`: incluye todos los ingredientes de la receta completa, no cantidades por porción. Cada entrada debe ir entre comillas simples.
- Las entradas medibles deben seguir exactamente `CANTIDAD UNIDAD NOMBRE`. Las únicas unidades que suma la lista de compras son `g`, `kg`, `mL`, `L` y `u`.
- Usa cantidades numéricas simples en `ingredientes` (`2 u`, no `1-2 u` ni `≈2 u`). Para cantidades variables usa `al-gusto NOMBRE`.
- Mantén idéntico el nombre de un ingrediente entre recetas cuando se trate del mismo producto; la lista de compras agrupa por unidad y nombre exactos.
- `porciones_receta` es el rendimiento total de las cantidades indicadas.
- Los cinco valores de `macros_por_porcion` son números por una sola porción, no por la receta completa. Usa valores enteros coherentes con ingredientes y rendimiento; no inventes precisión ni copies macros de otra receta. Si no hay datos suficientes para estimarlos con fundamento, pide esos datos antes de finalizar la receta.

### Ingredientes opcionales y macros

- Cuando un ingrediente sea opcional, identifícalo tanto en el front matter como en el flujo. En `ingredientes`, agrega `(opcional)` al final del nombre, por ejemplo: `'15 g chispas de chocolate semiamargo (opcional)'`. En el flujo, agrega `(opcional)` a la cantidad: `15 g (opcional)`.
- Calcula `macros_por_porcion` usando únicamente los ingredientes obligatorios. No incluyas ningún ingrediente opcional en esos cinco valores, aunque aparezca en `ingredientes` y en el flujo.
- Muestra junto a cada ingrediente opcional cuánto agrega por sí solo a la receta completa. Este incremento corresponde a toda la cantidad indicada y a todas las porciones de la receta; no lo dividas entre `porciones_receta`.
- Usa esta notación compacta y este orden para el incremento: `+(CALORÍAS kcal · P PROTEÍNA · C CARBOHIDRATOS · G GRASAS · F FIBRA)`. `P`, `C`, `G` y `F` expresan gramos.
- En el nombre del ingrediente dentro del flujo, coloca exactamente ` ¶ ` antes del incremento de macros. El marcador genera un salto de línea para presentar los macros debajo del nombre. Ejemplo completo: `15 g (opcional) | chispas de chocolate semiamargo ¶ +(76 kcal · P 0.6 · C 9.6 · G 4.2 · F 1) | [incorporar]`.
- Calcula el incremento de cada opcional de manera independiente, sin sumar otros opcionales. Si se usan varios, sus incrementos pueden sumarse al total base de la receta.

## Cuerpo con el shortcode `flujo`

El cuerpo usa el shortcode pareado `flujo` / `endflujo` para describir ingredientes y acciones. No escribas la tabla HTML a mano: el shortcode genera y valida el diagrama de flujo de cuatro columnas durante el build.

{% raw %}
```njk
{% flujo %}
[mezclar] mezclar · marinar 15–20 min
[cocinar] cocinar · reposar · rebanar
[servir] calentar · repartir entre las porciones · servir

400 g | ingrediente principal | [mezclar] → [cocinar]
20 mL | jugo de limón | [mezclar] → [cocinar]
al-gusto | especias | [mezclar] → [cocinar]
-- PARA SERVIR --
4 | tortillas de maíz | [servir]
{% endflujo %}
```
{% endraw %}

### Acciones o etapas

- Define cada acción una sola vez con `[id] texto de la acción`, antes de la primera fila que la use.
- El ID sólo puede contener letras ASCII, números y guion bajo. Usa nombres breves y descriptivos, sin espacios, acentos ni guiones: `[licuar]`, `[cocinar2]`, `[para_servir]`.
- Si dos acciones necesitan textos distintos, usa IDs distintos aunque comiencen con el mismo verbo, por ejemplo `[mezclar]` y `[mezclar2]`.
- Dentro del texto de una acción, separa los pasos con ` · `; cada punto medio se renderiza como un salto de línea. No escribas `<br />`.
- Escribe instrucciones breves, en minúsculas y con verbos en infinitivo: `mezclar`, `cocinar`, `reposar`, `servir`. Incluye temperaturas, tiempos, reposo, refrigeración y conservación cuando afecten el resultado o la seguridad.
- Se aceptan acciones literales directamente en una fila, pero prefiere acciones con ID para reutilizar texto y permitir que el shortcode agrupe celdas iguales.

### Filas de ingredientes

- Escribe cada fila como `cantidad | nombre | [accion1] → [accion2]`, con las acciones en orden temporal de izquierda a derecha.
- Cada ingrediente debe tener al menos una acción y puede recorrer como máximo tres, porque la primera columna se reserva para el ingrediente y el flujo tiene tres columnas de procesos.
- La fase completa también debe caber en esas tres columnas de procesos. Varias rutas con acciones distintas pueden requerir más columnas aunque ninguna fila tenga más de tres acciones; si el build reporta este caso, divide el proceso con un encabezado de fase apropiado.
- Los ingredientes que pasan por exactamente las mismas acciones deben repetir la misma secuencia de IDs. El shortcode fusiona automáticamente las acciones idénticas de filas consecutivas.
- La cantidad o descriptor destacado y el nombre ocupan campos separados. Usa, por ejemplo, `400 g | jitomate | [licuar]`, no `400 g jitomate | [licuar]`.
- Para preparaciones intermedias puedes usar un descriptor en el primer campo: `arroz crispy | preparación anterior | [servir]`. Si no necesitas cantidad ni descriptor destacado, también se acepta `nombre | [accion]`.
- El cuerpo puede mostrar cantidades como intervalos o aproximaciones (`350–400 g`, `≈80 g`) cuando ayuden al cocinar, aunque el front matter debe conservar una cantidad única que la lista de compras pueda sumar.

### Encabezados y escritura

- Usa `-- TEXTO --` para crear un encabezado de fase que ocupe las cuatro columnas: `-- ACOMPAÑAR --`, `-- PARA SERVIR --` o `-- DÍA 2 — Precalentar horno a 220 °C --`.
- Un encabezado inicia una fase nueva. Colócalo inmediatamente antes de los ingredientes correspondientes; también puede aparecer solo para comunicar una instrucción de fase.
- Usa líneas en blanco para legibilidad. Las líneas cuyo primer carácter visible es `#` son comentarios y no se renderizan.
- Escribe Unicode normal en todo el cuerpo (`á`, `ñ`, `°`, `–`, `≈`). El shortcode escapa el contenido y genera el HTML; no uses entidades HTML, etiquetas, clases, estilos, scripts ni imágenes dentro de `flujo`.

## Coherencia y validación

- Verifica que todos los ingredientes necesarios aparezcan tanto en `ingredientes` como en las filas de `flujo`. Un ingrediente que sólo aparece en el cuerpo no llegará a la lista de compras.
- Permite diferencias deliberadas de redacción entre ambos lugares: el front matter debe ser normalizable (`2 u diente ajo`), mientras el flujo debe ser fácil de leer (`2 dientes | ajo picado | [licuar]`).
- Revisa que cantidades, porciones, tipo y macros no se contradigan entre sí.
- Respeta la ortografía española. Corrige errores evidentes en contenido nuevo; no reproduzcas erratas o diferencias accidentales de archivos antiguos.
- Ejecuta `npm run build` después de crear o modificar recetas. El trabajo no está terminado si Eleventy reporta errores.
- Revisa el diff final para confirmar que no se editó `_site/` ni archivos ajenos a la solicitud.

## Criterio de terminado

Una receta nueva está lista cuando tiene slug correcto, front matter completo, ingredientes compatibles con la lista de compras, un bloque `flujo` válido, instrucciones culinarias suficientes, macros por porción coherentes y un build exitoso.
