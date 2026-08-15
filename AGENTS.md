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

## Cuerpo HTML

El cuerpo es HTML puro y representa ingredientes y acciones como un diagrama de flujo dentro de una tabla, no como párrafos, listas o una receta narrativa.

```html
<table>
  <tbody>

    <tr>
      <td><strong>400 g</strong><br />ingrediente principal</td>
      <td rowspan="3">mezclar<br />marinar 15&ndash;20 min</td>
      <td rowspan="3" colspan="2">cocinar<br />reposar<br />rebanar</td>
    </tr>
    <tr>
      <td><strong>20 mL</strong><br />jugo de lim&oacute;n</td>
    </tr>
    <tr>
      <td><strong>especias</strong><br />al gusto</td>
    </tr>

    <tr>
      <td colspan="4" align="center"><strong>PARA SERVIR</strong></td>
    </tr>
    <tr>
      <td><strong>4</strong><br />tortillas de ma&iacute;z</td>
      <td colspan="3">calentar<br />repartir entre las porciones<br />servir</td>
    </tr>

  </tbody>
</table>
```

- Diseña una cuadrícula lógica de cuatro columnas. La primera columna suele contener cantidad y nombre; las siguientes muestran acciones en orden de izquierda a derecha.
- Agrupa varios ingredientes que reciben la misma acción haciendo que la celda de acción use el `rowspan` correspondiente. Usa `colspan` para que una etapa ocupe las columnas restantes.
- Comprueba cada bloque: la suma de celdas, `rowspan` y `colspan` debe cubrir exactamente cuatro columnas por fila. No copies valores de otra receta sin recalcularlos.
- En cada ingrediente visible, coloca la cantidad o descriptor en `<strong>` y el nombre después de `<br />`.
- Escribe instrucciones breves, en minúsculas y con verbos en infinitivo: `mezclar`, `cocinar`, `reposar`, `servir`. Separa acciones con `<br />`; no uses oraciones largas ni numeración.
- Usa encabezados centrados que ocupen las cuatro columnas para cambios claros de fase: `ACOMPAÑAR`, `GUARNICIONES`, `PARA SERVIR`, precalentado o preparación por días.
- Indica temperaturas, tiempos, reposo, refrigeración y conservación cuando afecten el resultado o la seguridad.
- El cuerpo puede mostrar una cantidad como intervalo o aproximación si ayuda al cocinar (`350&ndash;400 g`, `&asymp;80 g`), aunque el front matter debe conservar una cantidad única que la lista de compras pueda sumar.
- Conserva el estilo de los archivos existentes: Unicode en el YAML y entidades HTML para acentos y símbolos dentro del cuerpo (`&aacute;`, `&ntilde;`, `&deg;`, `&ndash;`, `&asymp;`). Usa `<br />` de forma consistente en contenido nuevo.
- No añadas clases, estilos inline, scripts, imágenes ni estructura exterior a la tabla salvo que el usuario lo pida y el diseño global se actualice también.

## Coherencia y validación

- Verifica que todos los ingredientes necesarios aparezcan tanto en `ingredientes` como en la tabla. Un ingrediente que sólo aparece en la tabla no llegará a la lista de compras.
- Permite diferencias deliberadas de redacción entre ambos lugares: el front matter debe ser normalizable (`2 u diente ajo`), mientras la tabla debe ser fácil de leer (`<strong>2 dientes</strong><br />ajo picado`).
- Revisa que cantidades, porciones, tipo y macros no se contradigan entre sí.
- Respeta la ortografía española. Corrige errores evidentes en contenido nuevo; no reproduzcas erratas o diferencias accidentales de archivos antiguos.
- Ejecuta `npm run build` después de crear o modificar recetas. El trabajo no está terminado si Eleventy reporta errores.
- Revisa el diff final para confirmar que no se editó `_site/` ni archivos ajenos a la solicitud.

## Criterio de terminado

Una receta nueva está lista cuando tiene slug correcto, front matter completo, ingredientes compatibles con la lista de compras, tabla de cuatro columnas estructuralmente válida, instrucciones culinarias suficientes, macros por porción coherentes y un build exitoso.
