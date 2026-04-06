# Registro de Decisiones

> Cada decisión técnica importante se documenta acá. Si en el futuro nos preguntamos "¿por qué hicimos X?", la respuesta está aquí.

## Formato

```
### DEC-[NNN]: [título corto]
- **Fecha:** YYYY-MM-DD
- **Contexto:** por qué surgió la necesidad
- **Decisión:** qué se eligió
- **Alternativas descartadas:** qué otras opciones había
- **Razón:** por qué se eligió esta
- **Consecuencias:** qué implica esta decisión
```

---

### DEC-002: perfiles.js en lugar de fetch() + perfiles.json
- **Fecha:** 2026-04-01
- **Contexto:** esbelteces.html cargaba los datos de perfiles con `fetch()`. Chrome bloquea fetch() en protocolo `file://` por política CORS, haciendo que el módulo no funcionara al abrirlo directamente sin servidor.
- **Decisión:** Generar `src/assets/data/perfiles.js` con los mismos datos como variable global `const PERFILES_DB = {...}` y cargarlo con `<script src="...">`.
- **Alternativas descartadas:** Corregir la ruta del fetch (la ruta era correcta — el problema era el protocolo, no la ruta). Usar un servidor local siempre.
- **Razón:** El proyecto se abre con Live Server durante desarrollo pero también directo desde archivo. La solución con `<script>` funciona en ambos contextos sin configuración extra.
- **Consecuencias:** Hay dos fuentes de verdad para los datos de perfiles (perfiles.json y perfiles.js). Si se actualiza el JSON, hay que regenerar el JS con el one-liner de Node.js.

---

### DEC-003: Portal hub antes que servicios.html y contacto.html
- **Fecha:** 2026-04-01
- **Contexto:** Había que crear varias páginas pendientes. Se decidió el orden de prioridad.
- **Decisión:** Crear `portal/index.html` (hub de módulos) antes que `servicios.html` y `contacto.html`.
- **Alternativas descartadas:** Completar el sitio público primero (servicios → contacto) antes de continuar el portal.
- **Razón:** El portal es el core técnico del proyecto. Tener el hub conectado al módulo de esbelteces muestra el valor real de la plataforma.
- **Consecuencias:** servicios.html y contacto.html quedan pendientes. El sitio público está incompleto pero el portal es navegable.

---

### DEC-004: Arquitectura CSS de tres archivos (variables / site / portal)
- **Fecha:** 2026-04-01
- **Contexto:** Los 4 HTML tenían CSS completamente inline y duplicado. Refactoring necesario para mantenibilidad.
- **Decisión:** Tres archivos en `assets/css/`: `variables.css` (base universal), `site.css` (sitio público), `portal.css` (portal). Cada HTML conserva solo estilos page-specific inline.
- **Alternativas descartadas:** Un solo `main.css` para todo (el portal tiene necesidades de layout radicalmente distintas — `height:100%`, `overflow:hidden` — que colisionarían con el sitio público). Separar también botones en su propio archivo (exceso de granularidad para este proyecto).
- **Razón:** El conflicto de `--accent` (azul-gris en el sitio, cálido en el portal) y el conflicto de `html/body` (scroll en el sitio, overflow:hidden en el portal) hacían necesario un archivo separado para cada contexto. portal.css sobreescribe las declaraciones base de variables.css donde es necesario.
- **Consecuencias:** El orden de carga importa: siempre `variables.css` primero, luego `site.css` o `portal.css`. Overrides puntuales (ej: `margin-bottom` en about.html) quedan comentados inline.

---

### DEC-005: Formspree para el formulario de contacto
- **Fecha:** 2026-04-01
- **Contexto:** contacto.html necesita enviar mensajes a un email sin backend propio. El sitio es 100% estático.
- **Decisión:** Usar Formspree (tier gratuito) con `fetch()` + `Accept: application/json`. Endpoint `xvzvqvak` hardcodeado en el HTML.
- **Alternativas descartadas:** `action="mailto:..."` (abre el cliente de mail del usuario — experiencia inconsistente). Netlify Forms (requiere hostear en Netlify). Google Apps Script como endpoint (viable pero más complejo para un caso tan simple).
- **Razón:** Solución más directa para formulario estático. Tier gratuito (50 envíos/mes) suficiente para este volumen. fetch() + JSON evita redirect a página de Formspree y permite feedback inline en la página.
- **Consecuencias:** Límite de 50 envíos/mes en plan gratuito. El form no funciona en file:// (comportamiento esperado). Si se supera el límite, considerar plan pago o migrar a Apps Script.

---

### DEC-006: Hero background — CSS multi-background + killswitch block
- **Fecha:** 2026-04-01
- **Contexto:** El hero de index.html ya tenía un `::after` con el watermark "ESTRUCTURAS". Se quería agregar `bangkok.jpg` como fondo con tinte overlay y posibilidad de desactivarlo fácilmente.
- **Decisión:** CSS multi-background (`linear-gradient` de tinte + `url()` de imagen) en el mismo `background-image`. Opacity controlada por `--hero-overlay-opacity` (variable CSS). Código en bloque `<style id="hero-bg">` separado con comentarios de killswitch.
- **Alternativas descartadas:** Pseudo-elemento `::before` para el overlay (habría requerido z-index entre `::before`, `::after` y el contenido real). Imagen directamente en `<img>` con `position: absolute` (más complejo de mantener).
- **Razón:** Multi-background es la solución más limpia: el background siempre queda detrás de todo, sin z-index. El bloque separado con killswitch permite activar/desactivar con un solo comentario HTML.
- **Consecuencias:** `bangkok.jpg` vive en `src/assets/css/` (junto al resto de assets estáticos). Si se cambia la imagen, actualizar la ruta en `index.html`. La opacidad 0.70 es el default — ajustable sin tocar otra cosa.

---

### DEC-001: Template de proyecto con documentación viva
- **Fecha:** [fecha de inicio]
- **Contexto:** Necesidad de mantener contexto del proyecto sincronizado entre Claude Code (local) y Claude.ai (online)
- **Decisión:** Estructura de carpetas con docs/ auto-actualizado, almacenado en Google Drive
- **Alternativas descartadas:** Depender solo del historial de chat
- **Razón:** El chat se pierde, los archivos persisten. Drive sincroniza entre dispositivos.
- **Consecuencias:** Requiere disciplina de actualización (automatizada via skills/hooks)

---
