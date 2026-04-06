# Lecciones Aprendidas

> Cada error corregido, cada gotcha descubierto, cada "la próxima vez hacé X en vez de Y" se registra acá. Claude consulta este archivo antes de tomar decisiones para no repetir errores.

## Formato
```
### LEC-[NNN]: [título corto]
- **Fecha:** YYYY-MM-DD
- **Qué pasó:** descripción del error o descubrimiento
- **Solución:** qué se hizo para resolverlo
- **Regla:** qué hacer diferente la próxima vez
```

---

### LEC-002: fetch() bloqueado en file:// — usar script tag con variable global
- **Fecha:** 2026-04-01
- **Qué pasó:** esbelteces.html usaba `fetch('../assets/data/perfiles.json')` para cargar los datos. La ruta era correcta, pero Chrome bloquea fetch() cuando la página se abre desde el filesystem (`file://`) por política CORS. El módulo no cargaba datos al abrir directo desde carpeta.
- **Solución:** Generar `perfiles.js` con los datos como `const PERFILES_DB = {...}` usando un one-liner de Node.js. Cargarlo con `<script src="...">` en el `<head>`. Reemplazar la función async de fetch por una sync que chequea `typeof PERFILES_DB !== 'undefined'`.
- **Regla:** En proyectos HTML puro que se abren con `file://`, nunca usar `fetch()` para cargar datos locales. Siempre usar `<script>` con variable global. Si hay un servidor garantizado (Live Server, GitHub Pages), fetch funciona — pero es mejor ser consistente y usar la solución que funciona en ambos.

---

### LEC-003: CSS refactoring con contextos que colisionan — separar por contexto, no por componente
- **Fecha:** 2026-04-01
- **Qué pasó:** Al extraer CSS compartido a archivos, `--accent` tenía valores distintos en el sitio público (azul-gris) y el portal (cálido). También `html/body` necesitaba `min-height:100vh` + scroll en el sitio pero `height:100%; overflow:hidden` en el portal.
- **Solución:** Separar en dos archivos de contexto: `site.css` y `portal.css`. El archivo de portal sobreescribe los valores conflictivos a nivel `:root` y `html, body`. No intentar unificar lo que es genuinamente diferente.
- **Regla:** Cuando dos contextos de una misma app tienen necesidades CSS estructuralmente opuestas (especialmente `overflow` y `height`), crear archivos separados por contexto en vez de resolver los conflictos con especificidad creciente o media queries. El orden de carga y la sobreescritura explícita es más predecible.

---

### LEC-004: CSS multi-background evita z-index con pseudo-elementos
- **Fecha:** 2026-04-01
- **Qué pasó:** Al agregar una imagen de fondo al hero de index.html, había un `::after` pseudo-elemento existente (el watermark "ESTRUCTURAS"). Usar un `::before` para el overlay de tinte habría requerido manejar z-index entre los dos pseudo-elementos y el contenido.
- **Solución:** CSS multi-background: `background-image: linear-gradient(...), url(...)`. El background siempre renderiza detrás de todo el contenido y pseudo-elementos — sin z-index necesario.
- **Regla:** Cuando necesitás una imagen de fondo + overlay de color en un elemento que ya tiene pseudo-elementos, usá CSS multi-background (stacking de `linear-gradient` + `url()`) en vez de crear otro pseudo-elemento para el overlay.

---

### LEC-001: Template como fuente de verdad
- **Fecha:** [fecha de inicio]
- **Qué pasó:** En proyectos anteriores, el contexto se perdía entre sesiones de chat
- **Solución:** Crear estructura de documentación viva en carpeta del proyecto
- **Regla:** Siempre actualizar docs/ al final de cada sesión. El chat es efímero, los archivos persisten.

---
