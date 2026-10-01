# Prototipo: Ganadería Familiar

Primera versión funcional de un tablero para administrar animales, pesajes y gastos de una finca familiar.

## Abrirlo

Abre `index.html` con Safari, Chrome, Edge o Firefox. No requiere instalación ni conexión a internet.

Para una experiencia de desarrollo equivalente a un sitio publicado, también puedes ejecutar `node serve.mjs` desde esta carpeta y abrir `http://127.0.0.1:4173`.

Para preparar los archivos que se publican, ejecuta `node build.mjs`. El resultado se genera en `dist/`.

## Qué valida esta versión

- Registro de animales con arete/ID, categoría, sexo, propósito y fechas.
- Edición de los datos de cada animal desde la tabla de inventario.
- Eliminación confirmada: antes de borrar, muestra los pesajes y gastos asociados que también se retirarían.
- Historial de pesajes: cada medición se conserva como un registro independiente.
- Registro de gastos asociados a un animal o como gasto general.
- Filtros de categoría, propósito, edad y estado.
- Indicadores y gráficos que cambian con los filtros.
- Exportación a Excel con hojas separadas para animales, pesajes y gastos.

Incluye datos ficticios para poder probar el tablero. Se almacenan solamente en el navegador mediante `localStorage`; por tanto, esta versión no debe usarse aún como respaldo único de los datos de la finca.

## Siguiente etapa técnica

1. Reemplazar `localStorage` por PostgreSQL (por ejemplo, Supabase).
2. Configurar usuarios y permisos.
3. Conectar el frontend a una API de Node.js o a una API controlada de Supabase.
4. Añadir copias de seguridad automáticas además de la exportación a Excel.
5. Publicar el frontend en Netlify.

La pantalla y el modelo de datos ya anticipan esa migración: `Animal → Pesajes` y `Gasto → Animal` se manejan como relaciones separadas.

## Exportación a Excel

El botón **Exportar Excel** descarga un archivo `.xlsx` con las hojas **Animales**, **Pesajes** y **Gastos**. Cada hoja conserva el ID interno y el arete para relacionar la información; los gastos sin animal se marcan como **Gasto general**.

